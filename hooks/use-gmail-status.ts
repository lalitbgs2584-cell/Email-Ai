import { useQuery } from "@tanstack/react-query";

interface GmailStatus {
  connected: boolean;
  account?: {
    gmailEmail: string;
    connectedAt: string;
  };
  gmailEmail?: string;
  error?: string;
}

async function fetchGmailStatus(): Promise<GmailStatus> {
  const res = await fetch("/api/gmail/status");
  if (!res.ok) throw new Error("Failed to fetch gmail status");
  return res.json();
}

export function useGmailStatus() {
  return useQuery({
    queryKey: ["gmail-status"],
    queryFn: fetchGmailStatus,
    staleTime: 60 * 1000,
  });
}