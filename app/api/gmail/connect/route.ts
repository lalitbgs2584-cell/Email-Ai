import { NextRequest, NextResponse } from "next/server";
import { getGmailAuthUrl } from "@/lib/gmail/client";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const url = getGmailAuthUrl();
  return NextResponse.redirect(url);
}