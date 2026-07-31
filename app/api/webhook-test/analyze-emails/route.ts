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

    // 1. Create Workflow record in PostgreSQL
    const workflow = await prisma.workflows.create({
      data: {
        userId: user.id,
        type: "INITIAL_SCAN",
        status: "RUNNING",
        progress: 10,
      },
    });

    // 2. Call n8n webhook on EC2
    const n8nWebhookUrl = process.env.N8N_ANALYZE_EMAILS_URL!;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const internalSecret = process.env.INTERNAL_API_SECRET;

    // Trigger n8n asynchronously (fire-and-forget or non-blocking)
    console.log("N8N URL:", n8nWebhookUrl);
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
    maxResults: 10,
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
      message: "Analysis started for recent 10 emails via n8n",
    });
  } catch (error: any) {
    console.error("Analyze Workflow Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger analysis workflow" },
      { status: 500 }
    );
  }
}
