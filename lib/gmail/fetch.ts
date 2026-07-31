import { getGmailClientForUser } from "./server";
import { parseMessageMetadata, parseMessageDetail } from "./parser";
import { EmailMessage, EmailDetail } from "@/types/gmail";

export async function listMessages(userId: string, maxResults = 15): Promise<EmailMessage[]> {
  const gmail = await getGmailClientForUser(userId);

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults,
  });

  const ids = list.data.messages ?? [];

  const messages = await Promise.all(
    ids.map(async (m) => {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      });
      return parseMessageMetadata(full.data);
    })
  );

  return messages;
}

export async function getMessageDetail(userId: string, messageId: string): Promise<EmailDetail> {
  const gmail = await getGmailClientForUser(userId);

  const full = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  return parseMessageDetail(full.data);
}