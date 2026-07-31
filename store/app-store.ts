import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { EmailMessage, EmailDetail } from "@/types/gmail";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GmailStatus {
  connected: boolean;
  account?: {
    gmailEmail: string;
    connectedAt: string;
  };
  gmailEmail?: string;
}

export interface AiSummary {
  summary: string;
  bulletPoints: string[];
  actionRequired: string;
  urgency: string;
  sentiment: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number; // unix ms — safe to serialize
}

// ─── Store State Interface ───────────────────────────────────────────────────

interface AppState {
  // ── Gmail Status ──────────────────────────────────────────
  gmailStatus: GmailStatus | null;
  statusLoading: boolean;
  statusLastFetched: number | null; // unix ms

  // ── Gmail Messages ────────────────────────────────────────
  messages: EmailMessage[];
  messagesLoading: boolean;
  messagesLastFetched: number | null;

  // ── Selected Email Detail ─────────────────────────────────
  selectedMessageId: string | null;
  selectedEmailDetail: EmailDetail | null;
  detailCache: Record<string, EmailDetail>; // messageId → detail (in-memory cache)
  loadingDetail: boolean;

  // ── AI Summary ────────────────────────────────────────────
  aiSummary: AiSummary | null;
  generatingSummary: boolean;

  // ── Chat ──────────────────────────────────────────────────
  chatMessages: ChatMessage[];
  chatLoading: boolean;

  // ── UI State ──────────────────────────────────────────────
  activeTab: string;
  isCollapsed: boolean;
  searchQuery: string;
  inboxFilter: "all" | "unread" | "read";
  sortBy: "date-desc" | "date-asc" | "unread" | "sender";

  // ── Actions ───────────────────────────────────────────────

  // Gmail Status
  fetchGmailStatus: (force?: boolean) => Promise<void>;
  setGmailStatus: (status: GmailStatus | null) => void;

  // Gmail Messages
  fetchMessages: (force?: boolean) => Promise<void>;
  setMessages: (messages: EmailMessage[]) => void;
  /** Optimistically mutate a message after an action (archive/trash/read) */
  applyMessageAction: (messageId: string, action: "archive" | "markRead" | "markUnread" | "trash") => void;

  // Email Detail
  openEmail: (messageId: string) => Promise<void>;
  closeEmail: () => void;

  // AI Summary
  generateSummary: (email: EmailMessage | EmailDetail) => Promise<void>;
  clearSummary: () => void;

  // Chat
  sendChatMessage: (content: string, context: { emailCount: number; unreadCount: number; recentSenders: string[]; subjects: string[] }) => Promise<void>;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;

  // UI
  setActiveTab: (tab: string) => void;
  setCollapsed: (val: boolean) => void;
  setSearchQuery: (q: string) => void;
  setInboxFilter: (f: "all" | "unread" | "read") => void;
  setSortBy: (s: "date-desc" | "date-asc" | "unread" | "sender") => void;

  // Disconnect
  disconnectGmail: () => Promise<void>;
}

// ─── Cache TTLs ──────────────────────────────────────────────────────────────

const STATUS_TTL_MS = 60_000;    // 1 minute
const MESSAGES_TTL_MS = 60_000;  // 1 minute

// ─── Store ──────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Initial State ─────────────────────────────────────────────────────
      gmailStatus: null,
      statusLoading: false,
      statusLastFetched: null,

      messages: [],
      messagesLoading: false,
      messagesLastFetched: null,

      selectedMessageId: null,
      selectedEmailDetail: null,
      detailCache: {},
      loadingDetail: false,

      aiSummary: null,
      generatingSummary: false,

      chatMessages: [
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hi! I'm your EmailAI assistant. Ask me anything about your inbox — unread counts, important emails, or how to use any feature.",
          timestamp: Date.now(),
        },
      ],
      chatLoading: false,

      activeTab: "dashboard",
      isCollapsed: false,
      searchQuery: "",
      inboxFilter: "all",
      sortBy: "date-desc",

      // ── Gmail Status ──────────────────────────────────────────────────────

      setGmailStatus: (status) => set({ gmailStatus: status }),

      fetchGmailStatus: async (force = false) => {
        const { statusLastFetched, statusLoading } = get();
        const age = statusLastFetched ? Date.now() - statusLastFetched : Infinity;

        // Skip if still fresh and not forced
        if (!force && age < STATUS_TTL_MS && !statusLoading) return;

        set({ statusLoading: true });
        try {
          const res = await fetch("/api/gmail/status");
          if (!res.ok) throw new Error("Failed to fetch gmail status");
          const data: GmailStatus = await res.json();
          set({ gmailStatus: data, statusLastFetched: Date.now() });
        } catch {
          // Don't clear existing data on error — keep stale
        } finally {
          set({ statusLoading: false });
        }
      },

      // ── Gmail Messages ────────────────────────────────────────────────────

      setMessages: (messages) => set({ messages }),

      fetchMessages: async (force = false) => {
        const { messagesLastFetched, messagesLoading, gmailStatus } = get();
        const age = messagesLastFetched ? Date.now() - messagesLastFetched : Infinity;

        if (!gmailStatus?.connected) return;
        if (!force && age < MESSAGES_TTL_MS && !messagesLoading) return;

        set({ messagesLoading: true });
        try {
          const res = await fetch("/api/gmail/messages?maxResults=50");
          if (!res.ok) throw new Error("Failed to fetch messages");
          const data = await res.json();
          set({ messages: data.messages || [], messagesLastFetched: Date.now() });
        } catch {
          // Keep stale data
        } finally {
          set({ messagesLoading: false });
        }
      },

      applyMessageAction: (messageId, action) => {
        set((state) => {
          const updated = state.messages.map((msg) => {
            if (msg.id !== messageId) return msg;
            if (action === "markRead") return { ...msg, isUnread: false, labelIds: msg.labelIds.filter((l) => l !== "UNREAD") };
            if (action === "markUnread") return { ...msg, isUnread: true, labelIds: [...msg.labelIds, "UNREAD"] };
            // archive / trash → remove from list
            return null;
          }).filter(Boolean) as EmailMessage[];
          return { messages: updated };
        });
      },

      // ── Email Detail ──────────────────────────────────────────────────────

      openEmail: async (messageId) => {
        const { detailCache } = get();

        // Serve from in-memory cache if available
        if (detailCache[messageId]) {
          set({
            selectedMessageId: messageId,
            selectedEmailDetail: detailCache[messageId],
            aiSummary: null,
          });
          return;
        }

        set({ selectedMessageId: messageId, selectedEmailDetail: null, loadingDetail: true, aiSummary: null });
        try {
          const res = await fetch(`/api/gmail/messages/${messageId}`);
          if (!res.ok) throw new Error("Failed to fetch detail");
          const data = await res.json();
          set((state) => ({
            selectedEmailDetail: data.message,
            detailCache: { ...state.detailCache, [messageId]: data.message },
          }));
        } finally {
          set({ loadingDetail: false });
        }
      },

      closeEmail: () => set({ selectedMessageId: null, selectedEmailDetail: null, aiSummary: null }),

      // ── AI Summary ────────────────────────────────────────────────────────

      generateSummary: async (email) => {
        set({ generatingSummary: true });
        try {
          const res = await fetch("/api/ai/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subject: email.subject,
              snippet: email.snippet,
              body: (email as EmailDetail).body || email.snippet,
            }),
          });
          if (!res.ok) throw new Error("Failed to summarize");
          const data = await res.json();
          set({ aiSummary: data });
        } finally {
          set({ generatingSummary: false });
        }
      },

      clearSummary: () => set({ aiSummary: null }),

      // ── Chat ─────────────────────────────────────────────────────────────

      addChatMessage: (msg) =>
        set((state) => ({ chatMessages: [...state.chatMessages, msg] })),

      sendChatMessage: async (content, context) => {
        const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content, timestamp: Date.now() };
        set((state) => ({ chatMessages: [...state.chatMessages, userMsg], chatLoading: true }));

        try {
          const res = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: content, context }),
          });
          const data = await res.json();
          const botMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.reply || "Sorry, I couldn't process that.",
            timestamp: Date.now(),
          };
          set((state) => ({ chatMessages: [...state.chatMessages, botMsg] }));
        } finally {
          set({ chatLoading: false });
        }
      },

      clearChat: () =>
        set({
          chatMessages: [
            {
              id: "welcome",
              role: "assistant",
              content: "Hi! I'm your EmailAI assistant. Ask me anything about your inbox.",
              timestamp: Date.now(),
            },
          ],
        }),

      // ── UI ────────────────────────────────────────────────────────────────

      setActiveTab: (tab) => set({ activeTab: tab }),
      setCollapsed: (val) => set({ isCollapsed: val }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setInboxFilter: (f) => set({ inboxFilter: f }),
      setSortBy: (s) => set({ sortBy: s }),

      // ── Disconnect Gmail ──────────────────────────────────────────────────

      disconnectGmail: async () => {
        const res = await fetch("/api/gmail/disconnect", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          set({
            gmailStatus: { connected: false },
            messages: [],
            messagesLastFetched: null,
            detailCache: {},
            selectedMessageId: null,
            selectedEmailDetail: null,
            aiSummary: null,
          });
        } else {
          throw new Error(data.error || "Disconnect failed");
        }
      },
    }),

    {
      name: "emailai-app-store",
      storage: createJSONStorage(() => sessionStorage), // persists for the tab session only
      partialize: (state) => ({
        // Only persist UI preferences and cached data — not loading flags or detail cache
        activeTab: state.activeTab,
        isCollapsed: state.isCollapsed,
        inboxFilter: state.inboxFilter,
        sortBy: state.sortBy,
        gmailStatus: state.gmailStatus,
        statusLastFetched: state.statusLastFetched,
        messages: state.messages,
        messagesLastFetched: state.messagesLastFetched,
        chatMessages: state.chatMessages,
      }),
    }
  )
);
