import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

// GET /api/emails/stats
// Returns DB-based email statistics for the logged-in user's Gmail account.
// Used by the sidebar "Analyzed Emails" widget.

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Scope everything to the user's own GmailAccount
    const gmailAccount = await prisma.gmailAccount.findUnique({
      where: { userId: user.id },
      select: { id: true, syncedCount: true, lastSyncedAt: true },
    });

    if (!gmailAccount) {
      return NextResponse.json({
        total: 0,
        analyzed: 0,
        withSummary: 0,
        unprocessed: 0,
        syncedCount: 0,
        lastSyncedAt: null,
      });
    }

    // Run all counts in parallel for speed
    const [total, analyzed, withSummary, unprocessed] = await Promise.all([
      // All emails synced to DB for this account
      prisma.email.count({
        where: { gmailAccountId: gmailAccount.id },
      }),
      // Analyzed = processed by n8n AI workflow (processed: true)
      prisma.email.count({
        where: { gmailAccountId: gmailAccount.id, processed: true },
      }),
      // Has an AI-generated summary (either from n8n or on-the-fly)
      prisma.email.count({
        where: {
          gmailAccountId: gmailAccount.id,
          summary: { not: null },
        },
      }),
      // Pending analysis
      prisma.email.count({
        where: { gmailAccountId: gmailAccount.id, processed: false },
      }),
    ]);

    return NextResponse.json({
      total,
      analyzed,
      withSummary,
      unprocessed,
      syncedCount: gmailAccount.syncedCount,
      lastSyncedAt: gmailAccount.lastSyncedAt?.toISOString() ?? null,
    });
  } catch (error: any) {
    console.error("[emails/stats] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch email stats." },
      { status: 500 }
    );
  }
}
