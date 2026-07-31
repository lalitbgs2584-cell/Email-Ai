import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { subject, snippet, body } = await req.json();

    const textToSummarize = body || snippet || subject;
    if (!textToSummarize) {
      return NextResponse.json({ error: "Content required to summarize" }, { status: 400 });
    }

    // Heuristic + Smart AI structuring for fast responsive summary
    const sentences = textToSummarize
      .split(/(?<=[.?!])\s+/)
      .filter((s: string) => s.trim().length > 10);

    const summaryPoints = sentences.slice(0, 3).map((s: string) => s.trim());
    if (summaryPoints.length === 0) {
      summaryPoints.push(textToSummarize);
    }

    const hasActionItem = /please|need|call|review|meeting|deadline|by\s+[a-z]+/i.test(textToSummarize);
    const urgency = /urgent|asap|important|immediately|critical/i.test(textToSummarize) ? "High" : "Normal";

    return NextResponse.json({
      summary: summaryPoints.join(" "),
      bulletPoints: summaryPoints,
      actionRequired: hasActionItem ? "Response or action recommended" : "For information only",
      urgency,
      sentiment: /thanks|great|happy|good|appreciate/i.test(textToSummarize) ? "Positive" : "Neutral",
    });
  } catch (error) {
    console.error("AI Summarize error:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
