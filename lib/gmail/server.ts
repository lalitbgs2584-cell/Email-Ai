import { google, gmail_v1 } from "googleapis";
import { getOAuthClient } from "./client";
import { prisma } from "@/lib/prisma";

export async function getGmailClientForUser(userId: string): Promise<gmail_v1.Gmail> {
  const account = await prisma.gmailAccount.findUnique({
    where: { userId },
  });

  if (!account) {
    throw new Error("GMAIL_NOT_CONNECTED");
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: account.refreshToken,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}