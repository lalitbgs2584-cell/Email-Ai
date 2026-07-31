import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.gmailAccount.findUnique({ where: { userId: user.id } });

  if (account?.refreshToken) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${account.refreshToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    } catch (e) {
      console.error("Token revoke failed, proceeding with local delete anyway", e);
    }
  }

  await prisma.gmailAccount.delete({ where: { userId: user.id } });

  return NextResponse.json({ success: true });
}