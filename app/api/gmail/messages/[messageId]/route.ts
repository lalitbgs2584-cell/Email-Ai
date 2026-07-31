import { NextRequest, NextResponse } from "next/server";
import { getMessageDetail } from "@/lib/gmail/fetch";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const message = await getMessageDetail(user.id, id);
    return NextResponse.json({ message });
  } catch (err: any) {
    if (err.message === "GMAIL_NOT_CONNECTED") {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch message" }, { status: 500 });
  }
}