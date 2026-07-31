import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.gmailAccount.findUnique({
    where: { userId: user.id },
    select: { gmailEmail: true, connectedAt: true },
  });

  if (!account) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    account: {
      gmailEmail: account.gmailEmail,
      connectedAt: account.connectedAt,
    },
  });
}