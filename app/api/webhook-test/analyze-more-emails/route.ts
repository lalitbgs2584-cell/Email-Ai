import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gmailAccount = await prisma.gmailAccount.findUnique({
      where: { userId: user.id },
    });

    if (!gmailAccount) {
      return NextResponse.json(
        { error: "No Gmail account connected. Please connect Gmail first." },
        { status: 400 }
      );
    }

    // --- Fetch next batch of unprocessed emails, oldest/newest first (sorted by date) ---
    let unprocessedEmails = await prisma.email.findMany({
      where: {
        gmailAccountId: gmailAccount.id,
        processed: false,
      },
      orderBy: { receivedAt: "desc" },
      take: 10,
      select: {
        id: true,
        gmailId: true,
        threadId: true,
        subject: true,
        fromEmail: true,
        receivedAt: true,
      },
    });

    // If 0 unprocessed emails in DB, automatically trigger Gmail sync to pull unsynced emails into DB
    if (unprocessedEmails.length === 0) {
      console.log("[analyze-more-emails] No unprocessed emails in DB. Triggering Gmail sync...");
      try {
        const syncRes = await fetch(`${req.nextUrl.origin}/api/gmail/sync`, {
          method: "POST",
          headers: {
            cookie: req.headers.get("cookie") || "",
          },
        });
        if (syncRes.ok) {
          // Re-fetch unprocessed emails after sync
          unprocessedEmails = await prisma.email.findMany({
            where: {
              gmailAccountId: gmailAccount.id,
              processed: false,
            },
            orderBy: { receivedAt: "desc" },
            take: 10,
            select: {
              id: true,
              gmailId: true,
              threadId: true,
              subject: true,
              fromEmail: true,
              receivedAt: true,
            },
          });
        }
      } catch (syncErr) {
        console.warn("[analyze-more-emails] Auto-sync failed:", syncErr);
      }
    }

    if (unprocessedEmails.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No unprocessed emails left in Gmail. All caught up!",
        count: 0,
      });
    }

    // 1. Create Workflow record
    const workflow = await prisma.workflows.create({
      data: {
        userId: user.id,
        type: "NEW_EMAIL_SYNC",
        status: "RUNNING",
        progress: 10,
      },
    });

    // Mark queued batch emails as processed immediately so subsequent calls won't pick the same emails
    await prisma.email.updateMany({
      where: {
        id: { in: unprocessedEmails.map((e) => e.id) },
      },
      data: {
        processed: true,
      },
    });

    // 2. Call n8n webhook, sending the specific emails to process
    const n8nWebhookUrl = process.env.N8N_ANALYZE_MORE_EMAILS_URL!;

    try {
      const response = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "header-key": process.env.N8N_SECRET!,
        },
        body: JSON.stringify({
          workflowId: workflow.id,
          userId: user.id,
          gmailAccountId: gmailAccount.id,
          emails: unprocessedEmails, // n8n ab yehi list use karega, Gmail se dobara list nahi maangega
        }),
      });

      console.log("Status:", response.status);
      console.log("Response:", await response.text());
    } catch (e) {
      console.warn("Failed to fire n8n webhook:", e);
    }

    return NextResponse.json({
      success: true,
      workflowId: workflow.id,
      count: unprocessedEmails.length,
      message: `Analysis started for ${unprocessedEmails.length} unprocessed emails`,
    });
  } catch (error: any) {
    console.error("Analyze Workflow Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger analysis workflow" },
      { status: 500 }
    );
  }
}