import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_CATEGORIES = [
  "IMPORTANT", "WORK", "PERSONAL", "PROMOTION",
  "NEWSLETTER", "FINANCE", "SOCIAL", "OTHER",
];
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

const clean = (s?: string | null): string | undefined =>
  typeof s === "string" ? s.trim() : undefined;

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("header-key");
    const expectedSecret = process.env.HEADER_KEY;

    if (!expectedSecret) {
      console.error("HEADER_KEY not configured in environment");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized internal call" }, { status: 401 });
    }

    const body = await req.json();
    const {
      gmailAccountId,
      gmailId,
      threadId,
      subject,
      snippet,
      fromEmail,
      fromName,
      receivedAt,
      isRead,
      isStarred,
      category,
      priority,
      summary,
      labels,
      reminder,
      processed,
    } = body;

    // --- Clean everything (removes stray tabs/whitespace regardless of source) ---
    const cleanGmailId = clean(gmailId);
    const cleanGmailAccountId = clean(gmailAccountId);
    const cleanThreadId = clean(threadId) || cleanGmailId;
    const cleanSubject = clean(subject);
    const cleanSnippet = clean(snippet) || "";
    const cleanFromEmail = clean(fromEmail) || "unknown@domain.com";
    const cleanFromName = clean(fromName) || null;
    const cleanSummary = clean(summary) || null;

    const rawCategory = clean(category)?.toUpperCase();
    const rawPriority = clean(priority)?.toUpperCase();

    const safeCategory = VALID_CATEGORIES.includes(rawCategory || "")
      ? rawCategory
      : "OTHER";
    const safePriority = VALID_PRIORITIES.includes(rawPriority || "")
      ? rawPriority
      : "MEDIUM";

    if (!cleanGmailId || !cleanGmailAccountId || !cleanSubject) {
      return NextResponse.json(
        { error: "Missing required fields (gmailId, gmailAccountId, subject)" },
        { status: 400 }
      );
    }

    const email = await prisma.email.upsert({
      where: { gmailId: cleanGmailId },
      create: {
        gmailId: cleanGmailId,
        threadId: cleanThreadId!,
        gmailAccountId: cleanGmailAccountId,
        subject: cleanSubject,
        snippet: cleanSnippet,
        fromEmail: cleanFromEmail,
        fromName: cleanFromName,
        receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
        isRead: isRead ?? false,
        isStarred: isStarred ?? false,
        category: safeCategory as any,
        priority: safePriority as any,
        summary: cleanSummary,
        labels: labels || [],
        reminder: reminder ? new Date(reminder) : null,
        processed: processed ?? true,
      },
      update: {
        subject: cleanSubject,
        snippet: cleanSnippet,
        fromEmail: cleanFromEmail,
        fromName: cleanFromName,
        receivedAt: receivedAt ? new Date(receivedAt) : undefined,
        isRead: isRead ?? undefined,
        isStarred: isStarred ?? undefined,
        category: safeCategory as any,
        priority: safePriority as any,
        summary: cleanSummary,
        labels: labels || undefined,
        reminder: reminder ? new Date(reminder) : undefined,
        processed: processed ?? true,
      },
    });

    await prisma.gmailAccount.update({
      where: { id: cleanGmailAccountId },
      data: {
        lastSyncedAt: new Date(),
        syncedCount: { increment: 1 },
      },
    });
    console.log("Email ",email)
    return NextResponse.json({ success: true, email });
  } catch (error: any) {
    console.error("Internal Email Upsert Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upsert email" },
      { status: 500 }
    );
  }
}