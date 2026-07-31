import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // Verify the request came from your n8n instance
  const secret = req.headers.get("header-key");

  if (secret !== process.env.HEADER_KEY) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId" },
      { status: 400 }
    );
  }

  const gmailAccount = await prisma.gmailAccount.findUnique({
    where: {
      userId,
    },
  });

  if (!gmailAccount) {
    return NextResponse.json(
      { error: "Gmail account not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    accessToken: gmailAccount.accessToken,
    refreshToken: gmailAccount.refreshToken,
    gmailEmail: gmailAccount.gmailEmail,
  });
}