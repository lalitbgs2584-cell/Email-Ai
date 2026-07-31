import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // apna prisma client import path check kar le

export async function GET(request: Request) {
  try {
    const apiKey = request.headers.get("header-key");
    if (apiKey !== process.env.HEADER_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const gmailEmail = searchParams.get("email");

    if (!userId && !gmailEmail) {
      return NextResponse.json(
        { error: "userId or email query param required" },
        { status: 400 }
      );
    }

    const gmailAccount = await prisma.gmailAccount.findFirst({
      where: userId ? { userId } : { gmailEmail: gmailEmail! },
    });

    if (!gmailAccount) {
      return NextResponse.json({ error: "Gmail account not found" }, { status: 404 });
    }

    const now = Date.now();
    const isExpired = now >= gmailAccount.tokenExpiry.getTime();

    // Token abhi valid hai — seedha wapas bhej de
    if (!isExpired) {
      return NextResponse.json({
        accessToken: gmailAccount.accessToken,
        gmailEmail: gmailAccount.gmailEmail,
        expiresAt: gmailAccount.tokenExpiry,
      });
    }

    // --- Token expired — refresh kar ---
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: gmailAccount.refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    });

    if (!refreshRes.ok) {
      const errData = await refreshRes.json();
      console.error("Refresh failed:", errData);
      return NextResponse.json(
        { error: "Token refresh failed", details: errData },
        { status: 401 }
      );
    }

    const refreshData = await refreshRes.json();
    // refreshData: { access_token, expires_in, scope, token_type }

    const newExpiry = new Date(Date.now() + refreshData.expires_in * 1000);

    const updated = await prisma.gmailAccount.update({
      where: { id: gmailAccount.id },
      data: {
        accessToken: refreshData.access_token,
        tokenExpiry: newExpiry,
      },
    });

    return NextResponse.json({
      accessToken: updated.accessToken,
      gmailEmail: updated.gmailEmail,
      expiresAt: updated.tokenExpiry,
    });
  } catch (err) {
    console.error("Token endpoint error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}