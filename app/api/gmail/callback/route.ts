import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getOAuthClient } from "@/lib/gmail/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  // User canceled or denied access on Google consent screen
  if (error) {
    return NextResponse.redirect(new URL("/dashboard?gmail_error=access_denied", req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard?gmail_error=no_code", req.url));
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    console.log(tokens);
    if (!tokens.access_token) {
      throw new Error("No access_token returned from Google");
    }

    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });

    const gmailEmail = profile.data.emailAddress;
    if (!gmailEmail) {
      throw new Error("Could not retrieve email address from Gmail profile");
    }

    const tokenExpiry = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    await prisma.gmailAccount.upsert({
      where: { userId: user.id },
      update: {
        gmailEmail,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        accessToken: tokens.access_token,
        tokenExpiry,
      },
      create: {
        userId: user.id,
        gmailEmail,
        refreshToken: tokens.refresh_token || "",
        accessToken: tokens.access_token,
        tokenExpiry,
        connectedAt: new Date(),
      },
    });

    return NextResponse.redirect(new URL("/dashboard?gmail_connected=true", req.url));
  } catch (err) {
    console.error("Gmail OAuth Callback Error:", err);
    return NextResponse.redirect(new URL("/dashboard?gmail_error=callback_failed", req.url));
  }
}