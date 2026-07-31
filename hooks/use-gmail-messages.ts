import { useQuery } from "@tanstack/react-query";
import { EmailMessage } from "@/types/gmail";

async function fetchMessages(): Promise<EmailMessage[]> {
  const res = await fetch("/api/gmail/messages");
  if (!res.ok) throw new Error("Failed to fetch messages");
  const data = await res.json();
  return data.messages;
}

export function useGmailMessages() {
  return useQuery({
    queryKey: ["gmail-messages"],
    queryFn: fetchMessages,
    staleTime: 30 * 1000,
  });
}