export interface GmailAccount {
  id: string;
  userId: string;
  gmailEmail: string;
  refreshToken: string;
  accessToken: string;
  tokenExpiry: Date;
  connectedAt: Date;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  isUnread: boolean;
  labelIds: string[];
}

export interface EmailDetail extends EmailMessage {
  body: string;
  to: string;
}

export type GmailActionType = "archive" | "markRead" | "markUnread" | "trash" | "addLabel" | "removeLabel";

export interface GmailActionRequest {
  action: GmailActionType;
  messageId: string;
  labelId?: string;
}