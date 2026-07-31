import { gmail_v1 } from "googleapis";
import { EmailMessage, EmailDetail } from "@/types/gmail";

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] = [], name: string) {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

// List view ke liye lightweight parsing (metadata format se aata hai)
export function parseMessageMetadata(msg: gmail_v1.Schema$Message): EmailMessage {
  const headers = msg.payload?.headers ?? [];
  return {
    id: msg.id!,
    threadId: msg.threadId!,
    subject: getHeader(headers, "Subject"),
    from: getHeader(headers, "From"),
    date: getHeader(headers, "Date"),
    snippet: msg.snippet ?? "",
    isUnread: (msg.labelIds ?? []).includes("UNREAD"),
    labelIds: msg.labelIds ?? [],
  };
}

// Single email detail ke liye — poora body chahiye (format: "full" se aata hai)
export function parseMessageDetail(msg: gmail_v1.Schema$Message): EmailDetail {
  const base = parseMessageMetadata(msg);
  const headers = msg.payload?.headers ?? [];

  const body = extractBody(msg.payload);

  return {
    ...base,
    to: getHeader(headers, "To"),
    body,
  };
}

// Gmail body base64url encoded hota hai aur nested parts mein ho sakta hai (multipart emails)
function extractBody(payload?: gmail_v1.Schema$MessagePart): string {
  if (!payload) return "";

  // Simple text email
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }

  // Multipart email — text/html ya text/plain part dhoondo
  if (payload.parts) {
    const htmlPart = payload.parts.find((p) => p.mimeType === "text/html");
    const textPart = payload.parts.find((p) => p.mimeType === "text/plain");
    const chosen = htmlPart ?? textPart;

    if (chosen?.body?.data) {
      return Buffer.from(chosen.body.data, "base64url").toString("utf-8");
    }

    // Nested multipart (multipart/alternative inside multipart/mixed)
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  return "";
}