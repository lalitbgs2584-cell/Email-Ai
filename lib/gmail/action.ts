import { getGmailClientForUser } from "./server";
import { GmailActionRequest } from "@/types/gmail";

export async function performGmailAction(userId: string, req: GmailActionRequest) {
  const gmail = await getGmailClientForUser(userId);

  switch (req.action) {
    case "archive":
      return gmail.users.messages.modify({
        userId: "me",
        id: req.messageId,
        requestBody: { removeLabelIds: ["INBOX"] },
      });

    case "markRead":
      return gmail.users.messages.modify({
        userId: "me",
        id: req.messageId,
        requestBody: { removeLabelIds: ["UNREAD"] },
      });

    case "markUnread":
      return gmail.users.messages.modify({
        userId: "me",
        id: req.messageId,
        requestBody: { addLabelIds: ["UNREAD"] },
      });

    case "trash":
      return gmail.users.messages.trash({
        userId: "me",
        id: req.messageId,
      });

    case "addLabel":
      if (!req.labelId) throw new Error("labelId required for addLabel");
      return gmail.users.messages.modify({
        userId: "me",
        id: req.messageId,
        requestBody: { addLabelIds: [req.labelId] },
      });

    case "removeLabel":
      if (!req.labelId) throw new Error("labelId required for removeLabel");
      return gmail.users.messages.modify({
        userId: "me",
        id: req.messageId,
        requestBody: { removeLabelIds: [req.labelId] },
      });

    default:
      throw new Error("Unknown action");
  }
}