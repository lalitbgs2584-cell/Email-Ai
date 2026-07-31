import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

// POST /api/emails/summarize-and-save
// Body: { emailId: string }  (our DB internal ID, not gmailId)
//
// Behaviour:
//   1. Fetch the email from DB (verify it belongs to the logged-in user)
//   2. If summary already exists → return it immediately (no OpenAI call)
//   3. If not → call OpenAI chat completions with subject + snippet
//   4. Persist the summary back to the Email row
//   5. Return { summary }

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { emailId } = body;

    if (!emailId || typeof emailId !== "string") {
      return NextResponse.json(
        { error: "emailId is required." },
        { status: 400 }
      );
    }

    // Security: fetch the email AND verify it belongs to this user's GmailAccount
    const gmailAccount = await prisma.gmailAccount.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!gmailAccount) {
      return NextResponse.json(
        { error: "No Gmail account connected." },
        { status: 400 }
      );
    }

    const email = await prisma.email.findFirst({
      where: {
        id: emailId,
        gmailAccountId: gmailAccount.id, // cross-user security check
      },
      select: {
        id: true,
        subject: true,
        snippet: true,
        fromName: true,
        fromEmail: true,
        summary: true,
      },
    });

    if (!email) {
      return NextResponse.json(
        { error: "Email not found or access denied." },
        { status: 404 }
      );
    }

    // ── If summary already in DB → return it, skip OpenAI ─────────────────
    if (email.summary && email.summary.trim().length > 0) {
      return NextResponse.json({
        summary: email.summary,
        fromCache: true,
      });
    }

    // ── Generate summary via OpenAI ────────────────────────────────────────
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      // Fallback: simple heuristic summary if no API key configured
      const fallbackSummary = buildFallbackSummary(email.subject, email.snippet);
      await prisma.email.update({
        where: { id: email.id },
        data: { summary: fallbackSummary },
      });
      return NextResponse.json({ summary: fallbackSummary, fromCache: false, provider: "heuristic" });
    }

    const prompt = buildPrompt(email.subject, email.snippet, email.fromName ?? email.fromEmail);

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",  // fast + cheap for summarization
        messages: [
          {
            role: "system",
            content:
              "You are an email assistant. Given an email subject and preview snippet, write a single-sentence summary (max 25 words) that captures the core message or action needed. Be concise and direct. No filler phrases like 'This email...'",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 80,
        temperature: 0.3,
      }),
    });

    if (!openaiRes.ok) {
      const errData = await openaiRes.json().catch(() => ({}));
      console.error("[summarize-and-save] OpenAI error:", errData);

      // Graceful degradation — return heuristic summary instead of failing
      const fallbackSummary = buildFallbackSummary(email.subject, email.snippet);
      await prisma.email.update({
        where: { id: email.id },
        data: { summary: fallbackSummary },
      });
      return NextResponse.json({
        summary: fallbackSummary,
        fromCache: false,
        provider: "heuristic-fallback",
      });
    }

    const openaiData = await openaiRes.json();
    const summary: string =
      openaiData.choices?.[0]?.message?.content?.trim() ?? buildFallbackSummary(email.subject, email.snippet);

    // Persist to DB so next time we skip OpenAI
    await prisma.email.update({
      where: { id: email.id },
      data: { summary },
    });

    return NextResponse.json({ summary, fromCache: false, provider: "openai" });
  } catch (error: any) {
    console.error("[summarize-and-save] Unhandled error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate summary." },
      { status: 500 }
    );
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildPrompt(subject: string, snippet: string, sender: string): string {
  return `From: ${sender}\nSubject: ${subject}\nPreview: ${snippet}`;
}

/** Rule-based summary when OpenAI is unavailable */
function buildFallbackSummary(subject: string, snippet: string): string {
  const text = snippet?.trim() || subject;
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!])\s+/)
    .filter((s) => s.length > 10);
  return sentences.slice(0, 2).join(" ") || text.slice(0, 120);
}
