import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
const VALID_CATEGORIES = ["IMPORTANT", "WORK", "PERSONAL", "PROMOTION", "NEWSLETTER", "FINANCE", "SOCIAL", "OTHER"];

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const gmailAccount = await prisma.gmailAccount.findUnique({
      where: { userId: user.id },
    });

    if (!gmailAccount) {
      return NextResponse.json({ emails: [], total: 0, page, limit });
    }

    const where: any = {
      gmailAccountId: gmailAccount.id,
    };

    if (category && VALID_CATEGORIES.includes(category.toUpperCase())) {
      where.category = category.toUpperCase();
    }

    const total = await prisma.email.count({ where });

    const emails = await prisma.email.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      emails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("Fetch Emails API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch emails from database" },
      { status: 500 }
    );
  }
}
