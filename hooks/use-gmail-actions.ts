import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GmailActionRequest } from "@/types/gmail";
import { toast } from "sonner";

async function performAction(payload: GmailActionRequest) {
  const res = await fetch("/api/gmail/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Action failed");
  return res.json();
}

export function useGmailAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: performAction,
    onSuccess: () => {
      // List ko refetch karo taaki UI turant update ho
      queryClient.invalidateQueries({ queryKey: ["gmail-messages"] });
    },
    onError: () => {
      toast.error("Action failed, try again");
    },
  });
}