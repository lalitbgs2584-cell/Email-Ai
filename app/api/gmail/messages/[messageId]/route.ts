import { NextRequest, NextResponse } from "next/server";
import { getMessageDetail } from "@/lib/gmail/fetch";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messageId } = await params;

  if (!messageId) {
    return NextResponse.json({ error: "Message ID required" }, { status: 400 });
  }

  try {
    const message = await getMessageDetail(user.id, messageId);
    return NextResponse.json({ message });
  } catch (err: any) {
    if (err.message === "GMAIL_NOT_CONNECTED") {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }
    console.error("Fetch message detail error:", err);
    return NextResponse.json({ error: "Failed to fetch message" }, { status: 500 });
  }
}