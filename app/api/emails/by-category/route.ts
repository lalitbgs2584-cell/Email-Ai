import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

// Valid category values that map to our DB enum
const VALID_CATEGORIES = [
  "IMPORTANT", "WORK", "PERSONAL", "PROMOTION",
  "NEWSLETTER", "FINANCE", "SOCIAL", "OTHER",
];

// GET /api/emails/by-category?category=WORK&page=1&limit=10
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawCategory = searchParams.get("category")?.toUpperCase() ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));

    if (!VALID_CATEGORIES.includes(rawCategory)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    // Security: scope to the logged-in user's GmailAccount only
    const gmailAccount = await prisma.gmailAccount.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!gmailAccount) {
      return NextResponse.json({
        emails: [], total: 0, page, limit, totalPages: 0,
        message: "No Gmail account connected.",
      });
    }

    const where = {
      gmailAccountId: gmailAccount.id,
      category: rawCategory as any,
    };

    const [total, emails] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.findMany({
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
          summary: true,       // ← return summary from DB (may be null)
          labels: true,
          processed: true,
        },
      }),
    ]);

    return NextResponse.json({
      emails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      category: rawCategory,
    });
  } catch (error: any) {
    console.error("[emails/by-category] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch emails by category." },
      { status: 500 }
    );
  }
}
