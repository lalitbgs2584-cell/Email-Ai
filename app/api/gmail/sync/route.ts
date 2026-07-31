import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// IMPORTANT — OAuth connect flow note (see /app/api/gmail/callback/route.ts):
// When the user connects their Gmail account via OAuth, the callback route ONLY
// saves tokens (accessToken, refreshToken, tokenExpiry) to GmailAccount.
// No emails are fetched at that point. Emails are ONLY synced when the user
// explicitly calls this POST /api/gmail/sync endpoint (e.g. by clicking a
// "Sync Inbox" button in the UI).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fixed batch size per sync click — always 50, never dynamic */
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse "Display Name <email@domain.com>" or plain "email@domain.com" */
function parseFrom(raw: string): { fromEmail: string; fromName: string | null } {
  const match = raw.match(/^(.*?)\s*<(.+?)>\s*$/);
  if (match) {
    return {
      fromName: match[1].trim() || null,
      fromEmail: match[2].trim(),
    };
  }
  return { fromEmail: raw.trim() || "unknown@unknown.com", fromName: null };
}

/** Find a header value (case-insensitive) in a Gmail metadata headers array */
function getHeader(
  headers: Array<{ name?: string | null; value?: string | null }>,
  name: string
): string {
  return (
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
    ""
  );
}

/**
 * Refresh an expired Gmail access token using the stored refresh token.
 * Throws on failure so the caller can return an appropriate HTTP error.
 */
async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; tokenExpiry: Date }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      `Token refresh failed (HTTP ${res.status}): ${JSON.stringify(errBody)}`
    );
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    // expires_in is in seconds; add to now for absolute expiry timestamp
    tokenExpiry: new Date(Date.now() + (data.expires_in as number) * 1000),
  };
}

/**
 * Fetch Gmail message metadata with automatic retry on HTTP 429 (rate limits).
 */
async function fetchMetadataWithRetry(
  id: string,
  accessToken: string,
  retries = 3,
  delayMs = 600
): Promise<any> {
  const msgUrl = new URL(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`
  );
  msgUrl.searchParams.set("format", "metadata");
  msgUrl.searchParams.append("metadataHeaders", "Subject");
  msgUrl.searchParams.append("metadataHeaders", "From");
  msgUrl.searchParams.append("metadataHeaders", "Date");

  for (let attempt = 0; attempt <= retries; attempt++) {
    const msgRes = await fetch(msgUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (msgRes.status === 429) {
      if (attempt < retries) {
        console.warn(`[gmail/sync] Rate limited (429) for ${id}. Retrying in ${delayMs * (attempt + 1)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        continue;
      }
    }

    if (!msgRes.ok) {
      throw new Error(`Message ${id} metadata fetch failed with HTTP ${msgRes.status}`);
    }

    return msgRes.json();
  }
}

// ---------------------------------------------------------------------------
// POST /api/gmail/sync
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth check ─────────────────────────────────────────────────────
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Fetch user's GmailAccount (scoped to THIS user — no cross-user leak)
    const gmailAccount = await prisma.gmailAccount.findUnique({
      where: { userId: user.id },
    });

    if (!gmailAccount) {
      return NextResponse.json(
        {
          error:
            "Gmail account not connected. Please connect your Gmail account first.",
        },
        { status: 400 }
      );
    }

    // ── 3. Token refresh if expired (60-second safety buffer) ─────────────
    let accessToken = gmailAccount.accessToken;

    const isExpired =
      Date.now() >= gmailAccount.tokenExpiry.getTime() - 60_000;

    if (isExpired) {
      console.log("[gmail/sync] Access token expired — refreshing…");
      try {
        const refreshed = await refreshAccessToken(gmailAccount.refreshToken);
        accessToken = refreshed.accessToken;

        // Persist the new token immediately so concurrent requests also benefit
        await prisma.gmailAccount.update({
          where: { id: gmailAccount.id },
          data: {
            accessToken: refreshed.accessToken,
            tokenExpiry: refreshed.tokenExpiry,
          },
        });

        console.log("[gmail/sync] Token refreshed and persisted.");
      } catch (tokenErr: any) {
        console.error("[gmail/sync] Token refresh error:", tokenErr.message);
        return NextResponse.json(
          {
            error:
              "Gmail access token is expired and could not be refreshed. Please reconnect your Gmail account.",
          },
          { status: 401 }
        );
      }
    }

    // ── 4. Call Gmail messages.list in a loop to find unsynced emails ─────
    let currentNextPageToken: string | null = gmailAccount.nextPageToken;
    let totalSaved = 0;
    let totalSkipped = 0;
    let totalFetched = 0;
    let hasMore = true;
    const MAX_PAGES_TO_SCAN = 5;
    let pagesScanned = 0;

    while (totalSaved < 10 && hasMore && pagesScanned < MAX_PAGES_TO_SCAN) {
      pagesScanned++;
      const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
      listUrl.searchParams.set("maxResults", String(BATCH_SIZE));

      if (currentNextPageToken) {
        listUrl.searchParams.set("pageToken", currentNextPageToken);
        console.log(`[gmail/sync] Scanning page ${pagesScanned} with pageToken: ${currentNextPageToken}`);
      } else {
        console.log(`[gmail/sync] Scanning page ${pagesScanned} from beginning.`);
      }

      const listRes = await fetch(listUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!listRes.ok) {
        const errBody = await listRes.json().catch(() => ({}));
        console.error("[gmail/sync] Gmail list API error:", errBody);
        if (listRes.status === 401) {
          return NextResponse.json(
            { error: "Gmail API rejected the token. Please reconnect your account." },
            { status: 401 }
          );
        }
        break;
      }

      const listData = await listRes.json();
      const messageStubs: Array<{ id: string; threadId: string }> = listData.messages ?? [];
      currentNextPageToken = listData.nextPageToken ?? null;
      hasMore = currentNextPageToken !== null;
      totalFetched += messageStubs.length;

      if (messageStubs.length === 0) {
        break;
      }

      // Pre-filter: Exclude emails already stored in DB
      const existingInDb = await prisma.email.findMany({
        where: {
          gmailAccountId: gmailAccount.id,
          gmailId: { in: messageStubs.map((m) => m.id) },
        },
        select: { gmailId: true },
      });

      const existingSet = new Set(existingInDb.map((e) => e.gmailId));
      const unsyncedStubs = messageStubs.filter((m) => !existingSet.has(m.id));
      totalSkipped += existingSet.size;

      if (unsyncedStubs.length === 0) {
        console.log(`[gmail/sync] Page ${pagesScanned} had 0 unsynced emails. Advancing to next page...`);
        continue;
      }

      // Fetch metadata in chunks of 5 with retry handling to respect Gmail API rate limits
      const metadataResults: PromiseSettledResult<any>[] = [];
      const CHUNK_SIZE = 5;
      for (let i = 0; i < unsyncedStubs.length; i += CHUNK_SIZE) {
        const chunk = unsyncedStubs.slice(i, i + CHUNK_SIZE);
        const chunkResults = await Promise.allSettled(
          chunk.map(({ id }) => fetchMetadataWithRetry(id, accessToken))
        );
        metadataResults.push(...chunkResults);
      }

      // Persist each new message to DB
      for (const result of metadataResults) {
        if (result.status === "rejected") {
          console.warn("[gmail/sync] Metadata fetch failed:", result.reason);
          continue;
        }

        const msg = result.value;
        const gmailId: string = msg.id;
        const threadId: string = msg.threadId ?? gmailId;
        const headers: Array<{ name: string; value: string }> = msg.payload?.headers ?? [];

        const subject = getHeader(headers, "Subject") || "(No Subject)";
        const fromRaw = getHeader(headers, "From");
        const dateRaw = getHeader(headers, "Date");
        const snippet: string = msg.snippet ?? "";

        const isRead: boolean = !(msg.labelIds ?? []).includes("UNREAD");
        const isStarred: boolean = (msg.labelIds ?? []).includes("STARRED");

        const { fromEmail, fromName } = parseFrom(fromRaw);

        let receivedAt: Date;
        try {
          receivedAt = dateRaw ? new Date(dateRaw) : new Date();
          if (isNaN(receivedAt.getTime())) receivedAt = new Date();
        } catch {
          receivedAt = new Date();
        }

        try {
          await prisma.email.create({
            data: {
              gmailId,
              threadId,
              gmailAccountId: gmailAccount.id,
              subject,
              snippet,
              fromEmail,
              fromName,
              receivedAt,
              isRead,
              isStarred,
              processed: false,
            },
          });
          totalSaved++;
        } catch (dbErr: any) {
          if (dbErr.code === "P2002") {
            totalSkipped++;
          } else {
            console.error("[gmail/sync] DB insert error for", gmailId, dbErr.message);
          }
        }
      }
    }

    // ── 5. Update GmailAccount pagination cursor + sync metadata ──────────
    await prisma.gmailAccount.update({
      where: { id: gmailAccount.id },
      data: {
        nextPageToken: currentNextPageToken,
        lastSyncedAt: new Date(),
        syncedCount: { increment: totalSaved },
      },
    });

    console.log(
      `[gmail/sync] Complete — fetched: ${totalFetched}, saved: ${totalSaved}, skipped: ${totalSkipped}, hasMore: ${hasMore}`
    );

    return NextResponse.json({
      success: true,
      fetched: totalFetched,
      saved: totalSaved,
      skipped: totalSkipped,
      hasMore,
      message: hasMore
        ? `Synced ${totalSaved} new email(s) (${totalSkipped} skipped).`
        : `Inbox fully scanned! Synced ${totalSaved} new email(s).`,
    });
  } catch (error: any) {
    console.error("[gmail/sync] Unhandled error:", error);
    return NextResponse.json(
      {
        error: error.message || "An unexpected error occurred during Gmail sync.",
      },
      { status: 500 }
    );
  }
}
