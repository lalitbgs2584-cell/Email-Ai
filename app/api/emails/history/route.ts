import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

// GET /api/emails/history
// Returns processed/analyzed emails grouped by date (or formatted by date) for the logged-in user.
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gmailAccount = await prisma.gmailAccount.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!gmailAccount) {
      return NextResponse.json({ history: [], total: 0 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const filter = searchParams.get("filter"); // "analyzed" | "all" | "summary"

    const where: any = {
      gmailAccountId: gmailAccount.id,
    };

    if (filter === "analyzed") {
      where.processed = true;
    } else if (filter === "summary") {
      where.summary = { not: null };
    }

    const total = await prisma.email.count({ where });

    const emails = await prisma.email.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        gmailId: true,
        threadId: true,
        subject: true,
        snippet: true,
        fromEmail: true,
        fromName: true,
        receivedAt: true,
        isRead: true,
        isStarred: true,
        category: true,
        priority: true,
        summary: true,
        labels: true,
        processed: true,
        updatedAt: true,
      },
    });

    // Also fetch workflow execution logs for history context
    const workflows = await prisma.workflows.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      emails,
      workflows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("[emails/history] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch history." },
      { status: 500 }
    );
  }
}
