import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// GET /api/emails/unprocessed
//
// Returns emails with processed=false for the currently logged-in user.
// Only emails belonging to the user's own GmailAccount are returned.
//
// Query params:
//   limit     — max emails to return (default: 10, max: 100)
//   sortOrder — "asc" | "desc" by receivedAt (default: "desc" = newest first)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    // ── 1. Auth check ─────────────────────────────────────────────────────
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Parse & validate query params ──────────────────────────────────
    const { searchParams } = new URL(req.url);

    const rawLimit = parseInt(searchParams.get("limit") ?? "10", 10);
    // Clamp: minimum 1, maximum 100
    const limit = isNaN(rawLimit) ? 10 : Math.min(Math.max(1, rawLimit), 100);

    const sortOrderParam = searchParams.get("sortOrder")?.toLowerCase();
    const sortOrder: "asc" | "desc" =
      sortOrderParam === "asc" ? "asc" : "desc"; // default: newest first

    // ── 3. Look up user's GmailAccount (security: userId scoped) ──────────
    // This ensures a user can NEVER access another user's emails.
    const gmailAccount = await prisma.gmailAccount.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!gmailAccount) {
      // No Gmail connected — return empty list gracefully (not an error)
      return NextResponse.json({
        emails: [],
        count: 0,
        limit,
        sortOrder,
        message: "No Gmail account connected.",
      });
    }

    // ── 4. Query unprocessed emails for this account ───────────────────────
    const emails = await prisma.email.findMany({
      where: {
        gmailAccountId: gmailAccount.id, // scoped to THIS user's account only
        processed: false,
      },
      orderBy: { receivedAt: sortOrder },
      take: limit,
      select: {
        id: true,
        gmailId: true,
        threadId: true,
        subject: true,
        fromEmail: true,
        receivedAt: true,
      },
    });

    return NextResponse.json({
      emails,
      count: emails.length,
      limit,
      sortOrder,
    });
  } catch (error: any) {
    console.error("[emails/unprocessed] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch unprocessed emails." },
      { status: 500 }
    );
  }
}
