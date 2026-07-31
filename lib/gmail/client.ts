import { google } from "googleapis";
import { GMAIL_SCOPES } from "./scopes";

export function getOAuthClient() {
  const redirectUri =
    process.env.GOOGLE_GMAIL_REDIRECT_URI ||
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3000/api/gmail/callback";

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

export function getGmailAuthUrl() {
  const oauth2Client = getOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline", 
    prompt: "consent",
    scope: GMAIL_SCOPES,
  });
}