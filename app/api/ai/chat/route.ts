import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message, context } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Build a smart response based on the message context
    const lowerMsg = message.toLowerCase();

    // Context-aware response generation
    let reply = "";
    const emailCount = context?.emailCount ?? 0;
    const unreadCount = context?.unreadCount ?? 0;
    const recentSenders = context?.recentSenders ?? [];
    const subjects = context?.subjects ?? [];

    if (lowerMsg.includes("unread") || lowerMsg.includes("how many")) {
      reply = `You have **${unreadCount} unread emails** out of ${emailCount} total in your inbox. ${
        unreadCount > 5
          ? "That's quite a few — want me to help prioritize them?"
          : unreadCount === 0
          ? "Your inbox is all caught up! 🎉"
          : "You're almost there!"
      }`;
    } else if (lowerMsg.includes("who") || lowerMsg.includes("sender") || lowerMsg.includes("from")) {
      if (recentSenders.length > 0) {
        reply = `Your most recent senders are:\n${recentSenders
          .slice(0, 5)
          .map((s: string, i: number) => `${i + 1}. ${s}`)
          .join("\n")}\n\nWould you like me to summarize any of these emails?`;
      } else {
        reply = "I don't have your email data loaded yet. Connect your Gmail and I'll be able to tell you who's been emailing you.";
      }
    } else if (lowerMsg.includes("summarize") || lowerMsg.includes("summary")) {
      reply = `I can summarize your emails! Head over to the **Inbox** tab, click on any email, and hit the **Summarize AI** button. Or go to the **AI Summaries** tab to bulk-summarize. You have ${emailCount} emails I can work with.`;
    } else if (lowerMsg.includes("subject") || lowerMsg.includes("about") || lowerMsg.includes("topic")) {
      if (subjects.length > 0) {
        reply = `Here are the recent email subjects in your inbox:\n${subjects
          .slice(0, 6)
          .map((s: string, i: number) => `• ${s}`)
          .join("\n")}`;
      } else {
        reply = "Connect Gmail to let me analyze your email subjects and topics.";
      }
    } else if (lowerMsg.includes("important") || lowerMsg.includes("urgent") || lowerMsg.includes("priority")) {
      const urgentKeywords = ["urgent", "asap", "important", "action required", "deadline", "immediately"];
      const urgentSubjects = subjects.filter((s: string) =>
        urgentKeywords.some((kw) => s.toLowerCase().includes(kw))
      );
      if (urgentSubjects.length > 0) {
        reply = `I found **${urgentSubjects.length} potentially urgent emails**:\n${urgentSubjects
          .map((s: string) => `🔴 ${s}`)
          .join("\n")}\n\nWant me to help draft replies?`;
      } else {
        reply = `Based on your ${emailCount} emails, I don't see any obviously urgent subjects right now. Everything looks manageable! ✅`;
      }
    } else if (lowerMsg.includes("hello") || lowerMsg.includes("hi") || lowerMsg.includes("hey")) {
      reply = `Hi there! I'm your EmailAI assistant. I can help you with:\n\n• **Checking unread counts** — just ask!\n• **Finding senders** — "Who emailed me recently?"\n• **Spotting urgent emails** — "Any urgent emails?"\n• **Understanding topics** — "What are my emails about?"\n• **Navigation help** — "How do I summarize an email?"\n\nWhat would you like to know about your inbox?`;
    } else if (lowerMsg.includes("archive") || lowerMsg.includes("trash") || lowerMsg.includes("delete")) {
      reply = `To archive or trash emails, open the **Inbox** tab and hover over any email. You'll see quick action buttons appear — Archive 📁, Trash 🗑️, Mark Read ✓, and AI Summarize ✨.\n\nOr open an email and use the action buttons in the header panel.`;
    } else if (lowerMsg.includes("connect") || lowerMsg.includes("gmail")) {
      reply = emailCount > 0
        ? `Your Gmail is connected and I can see **${emailCount} emails**. Everything looks good! If you need to reconnect, go to **Settings** tab.`
        : `To connect Gmail, click the **Connect Gmail** button on the Dashboard tab. It uses secure Google OAuth — we never store your password.`;
    } else {
      // General smart fallback
      const responses = [
        `I'm your EmailAI assistant! You have **${emailCount} emails** (${unreadCount} unread) in your inbox. Ask me anything about them — I can check who emailed you, flag urgent messages, or guide you through the app.`,
        `Good question! With ${emailCount} emails loaded, I can help you navigate, prioritize, or summarize your inbox. What specifically would you like to know?`,
        `I see you have **${emailCount} messages** in your inbox. I can help you find important emails, check unread counts, or explain how to use any feature. What do you need?`,
      ];
      reply = responses[Math.floor(Math.random() * responses.length)];
    }

    return NextResponse.json({ reply, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
