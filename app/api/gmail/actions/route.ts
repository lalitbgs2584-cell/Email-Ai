import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { GmailActionRequest } from "@/types/gmail";
import { performGmailAction } from "@/lib/gmail/action";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: GmailActionRequest = await req.json();

  if (!body.action || !body.messageId) {
    return NextResponse.json({ error: "action and messageId required" }, { status: 400 });
  }

  try {
    await performGmailAction(user.id, body);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "GMAIL_NOT_CONNECTED") {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}