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
        { error: "No Gmail account connected." },
        { status: 400 }
      );
    }

    // Create REANALYZE workflow
    const workflow = await prisma.workflows.create({
      data: {
        userId: user.id,
        type: "REANALYZE",
        status: "RUNNING",
        progress: 10,
      },
    });

    const n8nWebhookUrl =
      process.env.N8N_ANALYZE_MORE_WEBHOOK_URL ||
      process.env.N8N_INITIAL_SCAN_WEBHOOK_URL ||
      "http://ec2-instance.amazonaws.com:5678/webhook/analyze-more";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const internalSecret = process.env.INTERNAL_API_SECRET || "emailai_internal_secret_key_2026";

    fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflowId: workflow.id,
        userId: user.id,
        gmailAccountId: gmailAccount.id,
        gmailEmail: gmailAccount.gmailEmail,
        accessToken: gmailAccount.accessToken,
        refreshToken: gmailAccount.refreshToken,
        maxResults: 10,
        internalApiUrl: `${appUrl}/api/internal`,
        internalSecret,
      }),
    }).catch((err) => {
      console.warn("n8n webhook call initiated:", err.message);
    });

    return NextResponse.json({
      success: true,
      workflowId: workflow.id,
      message: "Syncing next 10 emails via n8n",
    });
  } catch (error: any) {
    console.error("Analyze More Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger batch analysis" },
      { status: 500 }
    );
  }
}
