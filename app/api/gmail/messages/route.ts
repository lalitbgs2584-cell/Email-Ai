import { NextRequest, NextResponse } from "next/server";
import { listMessages } from "@/lib/gmail/fetch";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const maxResults = Math.min(Number(searchParams.get("maxResults") ?? "50"), 100);

  try {
    const messages = await listMessages(user.id, maxResults);
    return NextResponse.json({ messages });
  } catch (err: any) {
    if (err.message === "GMAIL_NOT_CONNECTED") {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}