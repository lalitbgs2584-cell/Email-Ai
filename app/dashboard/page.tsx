"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles, LayoutDashboard, Inbox, FileText, Zap, History,
  Settings, CreditCard, HelpCircle, Search, Bell, ChevronDown,
  Mail, CheckCircle2, RefreshCw, Unlink, Tag, Calendar,
  BarChart3, Newspaper, Reply, Receipt, Archive,
  Loader2, Trash2, ArrowRight, Check,
  Bot, X, PanelLeft, Plus, MoreVertical,
  SlidersHorizontal, MessageSquare, ArrowUpDown, Send,
  Clock, DollarSign, Briefcase, GraduationCap, ShoppingBag,
  Plane, Shield, Star, ChevronLeft, ChevronRight, User, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth-client";
import { EmailMessage, EmailDetail } from "@/types/gmail";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";

// ─── DB Email type (from /api/emails/by-category) ────────────────────────────
type DbEmail = {
  id: string;
  gmailId: string;
  threadId: string;
  subject: string;
  snippet: string;
  fromEmail: string;
  fromName: string | null;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  category: string;
  priority: string;
  summary: string | null;
  labels: string[];
  processed: boolean;
};


// ─── Nav config ──────────────────────────────────────────────────────────────

type TabType = "dashboard" | "inbox" | "summary" | "chat" | "automations" | "history" | "settings" | "billing" | "help";

const workspaceNavItems: { icon: any; label: string; tab: TabType; badge?: string }[] = [
  { icon: LayoutDashboard, label: "Dashboard", tab: "dashboard" },
  { icon: Inbox, label: "Inbox", tab: "inbox" },
  { icon: Sparkles, label: "AI Summaries", tab: "summary" },
  { icon: MessageSquare, label: "AI Chat", tab: "chat", badge: "NEW" },
  { icon: Zap, label: "Automations", tab: "automations" },
];

const secondaryNavItems: { icon: any; label: string; tab: TabType }[] = [
  { icon: History, label: "History", tab: "history" },
  { icon: Settings, label: "Settings", tab: "settings" },
  { icon: CreditCard, label: "Billing & Plans", tab: "billing" },
  { icon: HelpCircle, label: "Help & Docs", tab: "help" },
];

const comingSoonFeatures = [
  { icon: FileText, title: "Daily AI Summary", description: "Get a morning briefing of everything that matters in your inbox." },
  { icon: Tag, title: "Smart Categories", description: "Automatically sort emails into Work, Personal, Receipts, and more." },
  { icon: Search, title: "AI Search", description: "Search your inbox using natural language, powered by AI." },
  { icon: Archive, title: "Auto Archive", description: "Automatically archive old and low-priority emails." },
  { icon: Bell, title: "Reminder Detection", description: "AI extracts deadlines and action items and reminds you." },
  { icon: Calendar, title: "Meeting Extraction", description: "Detect meeting invites and add them to your calendar." },
  { icon: Reply, title: "Reply Suggestions", description: "Get AI-generated reply drafts for common emails." },
  { icon: Receipt, title: "Invoice Tracker", description: "Track invoices and payment confirmations automatically." },
  { icon: BarChart3, title: "Email Analytics", description: "Visualize your email habits and communication patterns." },
  { icon: Newspaper, title: "Newsletter Cleanup", description: "Identify and unsubscribe from unwanted newsletters." },
];

// ─── Label config ────────────────────────────────────────────────────────────

type LabelType = "Important" | "Work" | "Personal" | "Promotion" | "Newsletter" | "Finance" | "Social" | "Other";

const labelItems: { icon: any; label: LabelType; category: string; color: string; bgColor: string; dotColor: string; count: number }[] = [
  { icon: Star,          label: "Important",  category: "IMPORTANT",  color: "text-amber-400",   bgColor: "bg-amber-500/10",   dotColor: "bg-amber-400",   count: 8 },
  { icon: Briefcase,     label: "Work",       category: "WORK",       color: "text-blue-400",    bgColor: "bg-blue-500/10",    dotColor: "bg-blue-400",    count: 24 },
  { icon: User,          label: "Personal",   category: "PERSONAL",   color: "text-violet-400",  bgColor: "bg-violet-500/10",  dotColor: "bg-violet-400",  count: 12 },
  { icon: Tag,           label: "Promotion",  category: "PROMOTION",  color: "text-emerald-400", bgColor: "bg-emerald-500/10", dotColor: "bg-emerald-400", count: 18 },
  { icon: Newspaper,     label: "Newsletter", category: "NEWSLETTER", color: "text-pink-400",    bgColor: "bg-pink-500/10",    dotColor: "bg-pink-400",    count: 15 },
  { icon: DollarSign,    label: "Finance",    category: "FINANCE",    color: "text-cyan-400",    bgColor: "bg-cyan-500/10",    dotColor: "bg-cyan-400",    count: 6 },
  { icon: MessageSquare, label: "Social",     category: "SOCIAL",     color: "text-rose-400",    bgColor: "bg-rose-500/10",    dotColor: "bg-rose-400",    count: 9 },
  { icon: Inbox,         label: "Other",      category: "OTHER",      color: "text-zinc-400",    bgColor: "bg-zinc-500/10",    dotColor: "bg-zinc-400",    count: 5 },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Sender helpers ───────────────────────────────────────────────────────────

const avatarColors = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
];

function getSenderInitials(from: string) {
  const name = from.replace(/<.*>/, "").trim();
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function getSenderColor(from: string) {
  let hash = 0;
  for (let i = 0; i < from.length; i++) hash = from.charCodeAt(i) + hash * 31;
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getSenderName(from: string) {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : from.replace(/<.*>/, "").trim() || from;
}

function renderMarkdown(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Store selectors (flat, no object creation on each render) ─────────────
  const activeTab      = useAppStore((s) => s.activeTab);
  const isCollapsed    = useAppStore((s) => s.isCollapsed);
  const searchQuery    = useAppStore((s) => s.searchQuery);
  const inboxFilter    = useAppStore((s) => s.inboxFilter);
  const sortBy         = useAppStore((s) => s.sortBy);

  const gmailStatus    = useAppStore((s) => s.gmailStatus);
  const statusLoading  = useAppStore((s) => s.statusLoading);
  const messages       = useAppStore((s) => s.messages);
  const messagesLoading = useAppStore((s) => s.messagesLoading);

  const selectedMessageId    = useAppStore((s) => s.selectedMessageId);
  const selectedEmailDetail  = useAppStore((s) => s.selectedEmailDetail);
  const loadingDetail        = useAppStore((s) => s.loadingDetail);

  const aiSummary         = useAppStore((s) => s.aiSummary);
  const generatingSummary = useAppStore((s) => s.generatingSummary);

  const chatMessages  = useAppStore((s) => s.chatMessages);
  const chatLoading   = useAppStore((s) => s.chatLoading);

  // ── Store actions ─────────────────────────────────────────────────────────
  const {
    fetchGmailStatus, fetchMessages,
    openEmail, closeEmail,
    applyMessageAction, disconnectGmail,
    generateSummary, clearSummary,
    sendChatMessage,
    setActiveTab, setCollapsed, setSearchQuery, setInboxFilter, setSortBy,
  } = useAppStore.getState();

  const isConnected = !!gmailStatus?.connected;

  // ── Bootstrap: fetch status + messages once on mount ─────────────────────
  useEffect(() => {
    fetchGmailStatus();
  }, []);

  useEffect(() => {
    if (isConnected) fetchMessages();
  }, [isConnected]);

  // ── Auto-scroll chat ──────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Derived: filtered + sorted messages ───────────────────────────────────
  const filteredMessages = useMemo(() => {
    let result = messages.filter((msg) => {
      const matchesSearch =
        !searchQuery ||
        msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.snippet.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        inboxFilter === "all" ||
        (inboxFilter === "unread" && msg.isUnread) ||
        (inboxFilter === "read" && !msg.isUnread);
      return matchesSearch && matchesFilter;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "date-asc")  return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === "unread")    return (b.isUnread ? 1 : 0) - (a.isUnread ? 1 : 0);
      if (sortBy === "sender")    return a.from.localeCompare(b.from);
      return 0;
    });
  }, [messages, searchQuery, inboxFilter, sortBy]);

  const unreadCount = useMemo(() => messages.filter((m) => m.isUnread).length, [messages]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleConnectGmail = () => { window.location.href = "/api/gmail/connect"; };

  const handleDisconnectGmail = async () => {
    try {
      await disconnectGmail();
      toast.success("Gmail disconnected");
    } catch (e: any) {
      toast.error(e.message || "Failed to disconnect Gmail");
    }
  };

  const handleAction = async (action: "archive" | "markRead" | "markUnread" | "trash", messageId: string) => {
    // Optimistic update immediately
    applyMessageAction(messageId, action);

    try {
      const res = await fetch("/api/gmail/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, messageId }),
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(`Done: ${action}`);
      if (selectedMessageId === messageId && (action === "archive" || action === "trash")) {
        closeEmail();
      }
    } catch {
      toast.error("Action failed — please try again");
      // Re-fetch to restore correct state
      fetchMessages(true);
    }
  };

  const handleGenerateSummary = async (email?: EmailMessage | EmailDetail) => {
    const target = email ?? selectedEmailDetail;
    if (!target) return;
    try {
      await generateSummary(target);
      toast.success("AI Summary generated!");
    } catch {
      toast.error("Failed to generate AI summary");
    }
  };

  const [chatInput, setChatInputLocal] = useState("");
  const [activeLabel, setActiveLabel] = useState<LabelType | null>(null);

  // ── Label view state (DB emails by category) ─────────────────────────────
  const [labelEmails, setLabelEmails] = useState<DbEmail[]>([]);
  const [labelLoading, setLabelLoading] = useState(false);
  const [labelTotal, setLabelTotal] = useState(0);
  const [labelPage, setLabelPage] = useState(1);
  const LABEL_PAGE_SIZE = 10;

  // Tracks which email IDs are currently being summarized on-the-fly
  const [summaryLoadingIds, setSummaryLoadingIds] = useState<Set<string>>(new Set());
  // Local override summaries (keyed by DB email id) — for freshly generated ones
  const [emailSummaries, setEmailSummaries] = useState<Record<string, string>>({});

  // ── Analyzed emails stats (from DB) ─────────────────────────────────────
  const [emailStats, setEmailStats] = useState<{
    total: number;
    analyzed: number;
    withSummary: number;
    unprocessed: number;
    syncedCount: number;
    lastSyncedAt: string | null;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // ── Analysis state ────────────────────────────────────────────────────────
  const [analyzing, setAnalyzing] = useState(false);
  const [workflowProgress, setWorkflowProgress] = useState(0);

  // ── History state ──────────────────────────────────────────────────────────
  const [historyEmails, setHistoryEmails] = useState<DbEmail[]>([]);
  const [historyWorkflows, setHistoryWorkflows] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"analyzed" | "all" | "summary">("analyzed");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const fetchHistoryEmails = async (page = 1, filter = historyFilter) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/emails/history?page=${page}&limit=20&filter=${filter}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistoryEmails(data.emails ?? []);
      setHistoryWorkflows(data.workflows ?? []);
      setHistoryTotal(data.total ?? 0);
      setHistoryPage(page);
    } catch (e: any) {
      toast.error(e.message || "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistoryEmails(1, historyFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, historyFilter]);

  const handleAnalyzeMore = async () => {
    if (!isConnected) {
      toast.error("Please connect Gmail first");
      return;
    }
    setAnalyzing(true);
    setWorkflowProgress(10);
    toast.info("Triggering n8n AI workflow for next 10 emails...");
    try {
      const res = await fetch("/api/webhook-test/analyze-more-emails", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger batch sync");

      if (data.count === 0) {
        toast.info(data.message || "No unprocessed emails left. All caught up!");
        setAnalyzing(false);
        return;
      }

      toast.success(`n8n AI Analysis started for ${data.count} emails!`);
      // Update sidebar stats immediately when new batch is synced
      fetchEmailStats();

      if (data.workflowId) {
        const interval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/workflow/status?workflowId=${data.workflowId}`);
            const statusData = await statusRes.json();
            if (statusData.workflow) {
              setWorkflowProgress(statusData.workflow.progress || 50);
              // Live update sidebar stats while workflow is running
              fetchEmailStats();
              if (statusData.workflow.status === "COMPLETED") {
                clearInterval(interval);
                setAnalyzing(false);
                setWorkflowProgress(100);
                toast.success("AI Analysis Completed!");
                fetchMessages(true);
                fetchEmailStats();
                if (activeTab === "history") fetchHistoryEmails(historyPage, historyFilter);
                if (activeLabel) {
                  const lbl = labelItems.find((l) => l.label === activeLabel);
                  if (lbl) fetchLabelEmails(lbl.category, labelPage);
                }
              } else if (statusData.workflow.status === "FAILED") {
                clearInterval(interval);
                setAnalyzing(false);
                fetchEmailStats();
                toast.error(`Workflow Failed: ${statusData.workflow.error || "Unknown error"}`);
              }
            }
          } catch {
            // ignore
          }
        }, 3000);

        setTimeout(() => {
          clearInterval(interval);
          setAnalyzing(false);
        }, 30000);
      } else {
        setTimeout(() => {
          setAnalyzing(false);
          fetchMessages(true);
          fetchEmailStats();
          if (activeTab === "history") fetchHistoryEmails(historyPage, historyFilter);
        }, 4000);
      }
    } catch (err: any) {
      setAnalyzing(false);
      toast.error(err.message || "Failed to trigger batch sync");
    }
  };

  // Reset pagination whenever filters or label changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, inboxFilter, sortBy, activeLabel]);

  // ── Fetch DB emails when a label is selected ──────────────────────────────
  const fetchLabelEmails = async (category: string, page = 1) => {
    setLabelLoading(true);
    try {
      const res = await fetch(
        `/api/emails/by-category?category=${category}&page=${page}&limit=${LABEL_PAGE_SIZE}`
      );
      if (!res.ok) throw new Error("Failed to fetch category emails");
      const data = await res.json();
      setLabelEmails(data.emails ?? []);
      setLabelTotal(data.total ?? 0);
      setLabelPage(page);
    } catch (e: any) {
      toast.error(e.message || "Failed to load category emails");
    } finally {
      setLabelLoading(false);
    }
  };

  useEffect(() => {
    if (activeLabel) {
      const lbl = labelItems.find((l) => l.label === activeLabel);
      if (lbl) fetchLabelEmails(lbl.category, 1);
    } else {
      setLabelEmails([]);
      setLabelTotal(0);
      setLabelPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLabel]);

  // ── On-the-fly summarize handler ──────────────────────────────────────────
  const handleSummarizeEmail = async (email: DbEmail) => {
    // Use cached summary from DB or local override
    if (email.summary || emailSummaries[email.id]) return;

    setSummaryLoadingIds((prev) => new Set(prev).add(email.id));
    try {
      const res = await fetch("/api/emails/summarize-and-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: email.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to summarize");
      // Cache locally so the UI updates immediately without a refetch
      setEmailSummaries((prev) => ({ ...prev, [email.id]: data.summary }));
      toast.success("Summary generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate summary");
    } finally {
      setSummaryLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(email.id);
        return next;
      });
    }
  };

  // ── Fetch email stats from DB ────────────────────────────────────────────
  const fetchEmailStats = async () => {
    if (!isConnected) return;
    setStatsLoading(true);
    try {
      const res = await fetch("/api/emails/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      setEmailStats(await res.json());
    } catch {
      // silently fail — sidebar stats are non-critical
    } finally {
      setStatsLoading(false);
    }
  };

  // Auto-fetch stats on mount and when Gmail connection changes
  useEffect(() => {
    if (isConnected) fetchEmailStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const handleChatSend = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInputLocal("");
    try {
      await sendChatMessage(msg, {
        emailCount: messages.length,
        unreadCount,
        recentSenders: messages.slice(0, 10).map((m) => getSenderName(m.from)),
        subjects: messages.slice(0, 20).map((m) => m.subject),
      });
    } catch {
      toast.error("Chat error. Please try again.");
    }
  };

  const userDisplayName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "user@emailai.com";
  const gmailEmail = gmailStatus?.account?.gmailEmail || (gmailStatus as any)?.gmailEmail || "Not connected";
  const userInitials = userDisplayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <div className="flex h-screen overflow-hidden bg-[#121214] text-foreground font-sans">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`sticky top-0 h-screen shrink-0 flex-col border-r border-border/30 bg-[#161619] transition-all duration-300 ease-in-out hidden lg:flex ${isCollapsed ? "w-[68px]" : "w-64"}`}>
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-border/20">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold tracking-tight">EmailAI</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary font-mono">PRO</Badge>
            </div>
          ) : (
            <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          )}
          {!isCollapsed && (
            <button onClick={() => setCollapsed(true)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground">
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* New Summary Button */}
        <div className="px-3 pt-3 pb-1">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setActiveTab("summary")} className="flex h-9 w-full items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
                  <Plus className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>New Summary</TooltipContent>
            </Tooltip>
          ) : (
            <button onClick={() => setActiveTab("summary")} className="flex w-full items-center justify-between rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-[0.98] transition-all">
              <div className="flex items-center gap-2"><Plus className="h-4 w-4" /><span>New Summary</span></div>
              <kbd className="hidden sm:inline-block rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-mono text-primary-foreground">⌘N</kbd>
            </button>
          )}
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
          {/* Workspace nav */}
          <div>
            {!isCollapsed && <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">Workspace</p>}
            <nav className="space-y-0.5">
              {workspaceNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.tab;
                const btn = (
                  <button
                    key={item.label}
                    onClick={() => setActiveTab(item.tab)}
                    className={`relative flex w-full items-center rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 ${
                      isActive ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20 shadow-sm" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    } ${isCollapsed ? "justify-center px-0" : "justify-between"}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isCollapsed && (
                      <div className="flex items-center gap-1">
                        {item.tab === "inbox" && isConnected && unreadCount > 0 && (
                          <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{unreadCount}</span>
                        )}
                        {item.badge && (
                          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">{item.badge}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
                if (isCollapsed) return (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10}>
                      {item.label}{item.tab === "inbox" && unreadCount > 0 ? ` (${unreadCount})` : ""}
                    </TooltipContent>
                  </Tooltip>
                );
                return btn;
              })}
            </nav>
          </div>

          {/* Labels */}
          {!isCollapsed && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                <span>Labels</span>
                <Tag className="h-3 w-3 opacity-60" />
              </div>
              <div className="space-y-0.5">
                {labelItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeLabel === item.label;
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        setActiveLabel(isActive ? null : item.label);
                        setActiveTab("inbox");
                        setCurrentPage(1);
                      }}
                      className={`group flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm"
                          : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`flex h-4 w-4 items-center justify-center rounded-md ${item.bgColor}`}>
                          <Icon className={`h-2.5 w-2.5 ${item.color}`} />
                        </div>
                        <span>{item.label}</span>
                      </div>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                        isActive ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground"
                      }`}>
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Analyzed Emails Stats ───────────────────────────────── */}
          {!isCollapsed && isConnected && (
            <div className="px-2 pt-1">
              <div className="rounded-xl border border-border/30 bg-[#1a1a1e] p-3 space-y-2.5">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-4 w-4 items-center justify-center rounded-md bg-emerald-500/15">
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                    </div>
                    <span className="text-[11px] font-semibold text-foreground">Analyzed Emails</span>
                  </div>
                  <button
                    onClick={fetchEmailStats}
                    disabled={statsLoading}
                    className="rounded-md p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    title="Refresh stats"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${statsLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {statsLoading && !emailStats ? (
                  <div className="space-y-1.5">
                    {[1,2,3].map((i) => <div key={i} className="h-3 rounded bg-muted/30 animate-pulse" />)}
                  </div>
                ) : emailStats ? (
                  <>
                    {/* Progress bar: analyzed / total */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Processed by AI</span>
                        <span className="text-[10px] font-semibold text-emerald-400 tabular-nums">
                          {emailStats.analyzed}/{emailStats.total}
                        </span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{
                            width: emailStats.total > 0
                              ? `${Math.min(100, (emailStats.analyzed / emailStats.total) * 100)}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </div>

                    {/* Stat rows */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Total synced</span>
                        <span className="text-[10px] font-semibold text-foreground tabular-nums">{emailStats.total}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">With summary</span>
                        <span className="text-[10px] font-semibold text-primary tabular-nums">{emailStats.withSummary}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Pending</span>
                        <span className="text-[10px] font-semibold text-amber-400 tabular-nums">{emailStats.unprocessed}</span>
                      </div>
                    </div>

                    {/* Last synced */}
                    {emailStats.lastSyncedAt && (
                      <p className="text-[10px] text-muted-foreground/50 truncate">
                        Last sync: {new Date(emailStats.lastSyncedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground/60">No emails synced yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Preferences nav */}
          <div>
            {!isCollapsed && <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">Preferences</p>}
            <nav className="space-y-0.5">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.tab;
                const btn = (
                  <button
                    key={item.label}
                    onClick={() => setActiveTab(item.tab)}
                    className={`flex w-full items-center rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 ${
                      isActive ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    } ${isCollapsed ? "justify-center px-0" : ""}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                  </button>
                );
                if (isCollapsed) return (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10}>{item.label}</TooltipContent>
                  </Tooltip>
                );
                return btn;
              })}
            </nav>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/30 p-2.5">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => setCollapsed(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground">
                <PanelLeft className="h-4 w-4" />
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center cursor-pointer">
                    <Avatar className="h-8 w-8 ring-1 ring-border">
                      <AvatarImage src={session?.user?.image || undefined} />
                      <AvatarFallback className="bg-muted text-xs font-semibold">{userInitials}</AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  <p className="font-semibold text-xs">{userDisplayName}</p>
                  <p className="text-[10px] text-muted-foreground">{gmailEmail !== "Not connected" ? gmailEmail : userEmail}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-card/30 border border-border/30 p-2 hover:bg-muted/30 cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="h-8 w-8 ring-1 ring-border/50">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{userInitials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{userDisplayName}</p>
                  <p className="truncate text-[10px] text-muted-foreground font-mono">Free Plan</p>
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/30 bg-[#161619]/80 backdrop-blur px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setCollapsed(!isCollapsed)} className="lg:flex hidden rounded-lg p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground">
              <PanelLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold tracking-tight">EmailAI</span>
            </div>
          </div>

          <div className="hidden flex-1 max-w-md lg:flex mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-border/40 bg-muted/20 pl-9 pr-4 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected && (
              <>
                {analyzing && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/30 text-xs text-primary font-medium">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Analyzing ({workflowProgress}%)</span>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => fetchMessages(true)} className="gap-1.5 text-xs h-8">
                  <RefreshCw className={`h-3 w-3 ${messagesLoading ? "animate-spin" : ""}`} />
                  Sync
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />}
            </Button>
            <Avatar className="h-7 w-7">
              <AvatarImage src={session?.user?.image || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{userInitials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Scrollable body */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-5xl space-y-8">

            {/* ── DASHBOARD ─────────────────────────────────────────────── */}
            {activeTab === "dashboard" && (
              <>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {userDisplayName.split(" ")[0]}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Here's your AI email assistant overview.</p>
                </div>

                {statusLoading ? (
                  <Card><CardContent className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Checking Gmail status...</span>
                  </CardContent></Card>
                ) : isConnected ? (
                  <Card>
                    <CardHeader className="border-b border-border/40">
                      <CardTitle className="text-base font-semibold">Connected Gmail Account</CardTitle>
                      <CardDescription>Real-time sync active</CardDescription>
                      <CardAction>
                        <Badge variant="secondary" className="gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-green-500" /> Connected
                        </Badge>
                      </CardAction>
                    </CardHeader>
                    <CardContent className="py-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="grid grid-cols-3 gap-6">
                          <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Account</p>
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400">G</div>
                              <p className="text-sm font-medium truncate">{gmailEmail}</p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fetched</p>
                            <p className="text-sm font-medium">{messages.length} messages</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Unread</p>
                            <p className="text-sm font-medium text-primary">{unreadCount} unread</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={handleConnectGmail} className="gap-1.5">
                            <RefreshCw className="h-3.5 w-3.5" /> Reconnect
                          </Button>
                          <Button variant="destructive" size="sm" onClick={handleDisconnectGmail} className="gap-1.5">
                            <Unlink className="h-3.5 w-3.5" /> Disconnect
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center py-12 text-center">
                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                        <Mail className="h-8 w-8 text-primary" />
                      </div>
                      <h2 className="text-lg font-semibold">Connect your Gmail to get started</h2>
                      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Secure Google OAuth. We never store your credentials.</p>
                      <Button size="lg" className="mt-6 gap-2 px-6 shadow-lg shadow-primary/20" onClick={handleConnectGmail}>
                        <Mail className="h-4 w-4" /> Connect Gmail
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {isConnected && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold">Recent Inbox</h2>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("inbox")} className="gap-1 text-xs text-primary">
                        View All <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {messagesLoading ? (
                      <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}</div>
                    ) : (
                      <div className="space-y-2">
                        {messages.slice(0, 5).map((msg) => (
                          <div key={msg.id} onClick={() => { setActiveTab("inbox"); openEmail(msg.id); }}
                            className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border/40 bg-card p-3 transition-all hover:border-primary/40 hover:bg-muted/30">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getSenderColor(msg.from)}`}>
                              {getSenderInitials(msg.from)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-semibold text-foreground">{getSenderName(msg.from)}</span>
                                <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeDate(msg.date)}</span>
                              </div>
                              <p className="truncate text-sm font-medium text-foreground/90">{msg.subject || "(No Subject)"}</p>
                              <p className="truncate text-xs text-muted-foreground">{msg.snippet}</p>
                            </div>
                            {msg.isUnread && <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <h2 className="text-base font-semibold">AI Features</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {comingSoonFeatures.map((f) => {
                      const Icon = f.icon;
                      return (
                        <Card key={f.title} className="opacity-70 hover:opacity-100 transition-opacity">
                          <CardHeader className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted"><Icon className="h-4 w-4 text-muted-foreground" /></div>
                              <Badge variant="outline" className="text-[10px] rounded-full">Coming Soon</Badge>
                            </div>
                            <CardTitle className="mt-3 text-sm font-medium">{f.title}</CardTitle>
                            <CardDescription className="text-xs leading-relaxed">{f.description}</CardDescription>
                          </CardHeader>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── LABEL VIEW ────────────────────────────────────────────── */}
            {activeTab === "inbox" && activeLabel && (() => {
              const lbl = labelItems.find((l) => l.label === activeLabel)!;
              const LblIcon = lbl.icon;
              const totalPages = Math.ceil(labelTotal / LABEL_PAGE_SIZE);
              return (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${lbl.bgColor}`}>
                      <LblIcon className={`h-4 w-4 ${lbl.color}`} />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold tracking-tight">{lbl.label}</h1>
                      <p className="text-xs text-muted-foreground">{labelTotal} emails in this category</p>
                    </div>
                    <div className="flex-1" />
                    <button
                      onClick={() => { setActiveLabel(null); setCurrentPage(1); }}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" /> Clear filter
                    </button>
                  </div>

                  {/* Email list */}
                  {labelLoading ? (
                    <div className="rounded-xl border border-border/30 overflow-hidden" style={{ background: "#161619" }}>
                      {[1,2,3,4,5].map((i) => (
                        <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-border/10 animate-pulse">
                          <div className="h-9 w-9 rounded-full bg-muted/40 shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-32 bg-muted/40 rounded" />
                            <div className="h-3 w-3/4 bg-muted/30 rounded" />
                            <div className="h-3 w-1/2 bg-muted/20 rounded" />
                          </div>
                          <div className="h-3 w-12 bg-muted/20 rounded shrink-0" />
                        </div>
                      ))}
                    </div>
                  ) : labelEmails.length === 0 ? (
                    <div className="rounded-xl border border-border/30 flex flex-col items-center py-20 gap-3" style={{ background: "#161619" }}>
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${lbl.bgColor}`}>
                        <LblIcon className={`h-7 w-7 ${lbl.color}`} />
                      </div>
                      <p className="text-sm font-medium text-foreground">No {lbl.label} emails found</p>
                      <p className="text-xs text-muted-foreground max-w-xs text-center">
                        Emails classified as {lbl.label} by the AI workflow will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/30 overflow-hidden" style={{ background: "#161619" }}>
                      {labelEmails.map((email) => {
                        const summaryText = emailSummaries[email.id] ?? email.summary;
                        const isLoadingSummary = summaryLoadingIds.has(email.id);
                        const senderDisplay = email.fromName || email.fromEmail;
                        const fromForColor = email.fromName ?? email.fromEmail;
                        return (
                          <div
                            key={email.id}
                            className={`group flex items-start gap-3 px-4 py-3.5 border-b border-border/10 transition-all duration-100 ${
                              !email.isRead ? "bg-[#1e1e23] hover:bg-[#222228]" : "hover:bg-[#1c1c20]"
                            }`}
                          >
                            {/* Avatar */}
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white mt-0.5 ${getSenderColor(fromForColor)}`}>
                              {getSenderInitials(senderDisplay)}
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-xs truncate ${!email.isRead ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}>
                                  {senderDisplay}
                                </span>
                                <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                                  {formatRelativeDate(email.receivedAt)}
                                </span>
                              </div>

                              <p className={`text-sm truncate ${!email.isRead ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                                {email.subject || "(No Subject)"}
                              </p>

                              {/* Summary row */}
                              {summaryText ? (
                                <div className="flex items-start gap-1.5 pt-0.5">
                                  <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                    {summaryText}
                                  </p>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 pt-0.5">
                                  <p className="text-xs text-muted-foreground/60 truncate flex-1">
                                    {email.snippet}
                                  </p>
                                  <button
                                    onClick={() => handleSummarizeEmail(email)}
                                    disabled={isLoadingSummary}
                                    className="shrink-0 flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/15 transition-colors disabled:opacity-50"
                                  >
                                    {isLoadingSummary ? (
                                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                    ) : (
                                      <Sparkles className="h-2.5 w-2.5" />
                                    )}
                                    {isLoadingSummary ? "Summarizing…" : "Summarize"}
                                  </button>
                                </div>
                              )}

                              {/* Priority + category badges */}
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] h-4 px-1.5 border-current ${
                                    email.priority === "HIGH" ? "text-rose-400" :
                                    email.priority === "MEDIUM" ? "text-amber-400" : "text-zinc-400"
                                  }`}
                                >
                                  {email.priority}
                                </Badge>
                                {!email.processed && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-violet-400 border-violet-400/30">
                                    Unprocessed
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1.5 px-4 py-3 border-t border-border/20" style={{ background: "#1c1c20" }}>
                          <button
                            onClick={() => { fetchLabelEmails(lbl.category, labelPage - 1); }}
                            disabled={labelPage === 1}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground disabled:opacity-30 transition-colors"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" /> Prev
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                              <button
                                key={p}
                                onClick={() => fetchLabelEmails(lbl.category, p)}
                                className={`h-7 min-w-[28px] rounded-lg px-2 text-xs font-medium transition-all ${
                                  labelPage === p
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => fetchLabelEmails(lbl.category, labelPage + 1)}
                            disabled={labelPage >= totalPages}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground disabled:opacity-30 transition-colors"
                          >
                            Next <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── INBOX ─────────────────────────────────────────────────── */}
            {activeTab === "inbox" && !activeLabel && (
              <div className="space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold tracking-tight">
                      {activeLabel ?? "Inbox"}
                    </h1>
                    {activeLabel && (() => {
                      const lbl = labelItems.find(l => l.label === activeLabel);
                      return (
                        <>
                          <button
                            onClick={() => { setActiveLabel(null); setCurrentPage(1); }}
                            className="rounded-full p-0.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          {lbl && (
                            <Badge variant="outline" className={`text-[10px] border-current ${lbl.color}`}>
                              {lbl.count} emails
                            </Badge>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground">{messages.length} messages · {unreadCount} unread</p>
                </div>

                {/* Filter + Sort toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
                    {(["all", "unread", "read"] as const).map((f) => (
                      <button key={f} onClick={() => { setInboxFilter(f); setCurrentPage(1); }}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-all capitalize ${inboxFilter === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                        {f === "all" ? `All (${messages.length})` : f === "unread" ? `Unread (${unreadCount})` : `Read (${messages.length - unreadCount})`}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
                    <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                    {([
                      { val: "date-desc", label: "Newest" },
                      { val: "date-asc",  label: "Oldest" },
                      { val: "unread",    label: "Unread first" },
                      { val: "sender",    label: "Sender" },
                    ] as const).map((s) => (
                      <button key={s.val} onClick={() => { setSortBy(s.val); setCurrentPage(1); }}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${sortBy === s.val ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAnalyzeMore}
                    disabled={analyzing || !isConnected}
                    className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Plus className="h-3.5 w-3.5" /> Analyze 10 More
                  </Button>
                  <p className="text-xs text-muted-foreground ml-2">{filteredMessages.length} shown</p>
                </div>

                {!isConnected ? (
                  <Card className="py-12 text-center"><CardContent className="space-y-4">
                    <Mail className="mx-auto h-10 w-10 text-muted-foreground" />
                    <h3 className="text-base font-semibold">Gmail not connected</h3>
                    <Button onClick={handleConnectGmail} className="gap-2"><Mail className="h-4 w-4" /> Connect Gmail</Button>
                  </CardContent></Card>
                ) : messagesLoading ? (
                  <div className="rounded-xl border border-border/30 overflow-hidden" style={{ background: "#161619" }}>
                    {[1,2,3,4,5,6,7,8].map((i) => (
                      <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/10 animate-pulse">
                        <div className="h-3.5 w-3.5 rounded bg-muted/30 shrink-0" />
                        <div className="h-3.5 w-3.5 rounded bg-muted/20 shrink-0" />
                        <div className="h-8 w-8 rounded-full bg-muted/40 shrink-0" />
                        <div className="flex-1 flex items-center gap-4">
                          <div className="h-3 w-24 bg-muted/40 rounded" />
                          <div className="h-3 flex-1 bg-muted/30 rounded" />
                        </div>
                        <div className="h-3 w-12 bg-muted/20 rounded shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="rounded-xl border border-border/30 flex flex-col items-center py-20 gap-3" style={{ background: "#161619" }}>
                    <Mail className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No emails match your filter.</p>
                    {activeLabel && (
                      <Button variant="ghost" size="sm" onClick={() => { setActiveLabel(null); setCurrentPage(1); }}>
                        Clear label filter
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className={`grid grid-cols-1 gap-4 ${selectedMessageId ? "lg:grid-cols-12" : ""}`}>

                    {/* ── Email list column ─────────────────────────────── */}
                    <div className={selectedMessageId ? "lg:col-span-5" : "col-span-1"}>
                      <div className="rounded-xl border border-border/30 overflow-hidden" style={{ background: "#161619" }}>

                        {/* List toolbar */}
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20" style={{ background: "#1c1c20" }}>
                          <input type="checkbox" className="h-3.5 w-3.5 rounded border-border/50 accent-primary cursor-pointer" />
                          <button
                            onClick={() => fetchMessages(true)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${messagesLoading ? "animate-spin" : ""}`} />
                          </button>
                          <div className="flex-1" />
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredMessages.length)} of {filteredMessages.length}
                          </span>
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted/30 hover:text-foreground disabled:opacity-30 transition-colors"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredMessages.length / PAGE_SIZE), p + 1))}
                            disabled={currentPage >= Math.ceil(filteredMessages.length / PAGE_SIZE)}
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted/30 hover:text-foreground disabled:opacity-30 transition-colors"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Email rows */}
                        {filteredMessages
                          .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                          .map((msg) => {
                            const isSelected = selectedMessageId === msg.id;
                            return (
                              <div
                                key={msg.id}
                                onClick={() => openEmail(msg.id)}
                                className={`group relative flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all duration-100 border-b border-border/10 ${
                                  isSelected
                                    ? "border-l-2 border-l-primary bg-primary/5"
                                    : msg.isUnread
                                    ? "hover:bg-[#222228]" 
                                    : "hover:bg-[#1c1c20]"
                                }`}
                                style={msg.isUnread && !isSelected ? { background: "#1e1e23" } : undefined}
                              >
                                {/* Checkbox — visible on hover */}
                                <input
                                  type="checkbox"
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-3.5 w-3.5 shrink-0 rounded border-border/50 accent-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                />
                                {/* Star */}
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="shrink-0 text-muted-foreground/20 hover:text-amber-400 transition-colors"
                                >
                                  <Star className="h-3.5 w-3.5" />
                                </button>
                                {/* Avatar */}
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${getSenderColor(msg.from)}`}>
                                  {getSenderInitials(msg.from)}
                                </div>
                                {/* Content row */}
                                <div className="min-w-0 flex-1 flex items-baseline gap-2">
                                  <span className={`shrink-0 text-xs truncate ${
                                    selectedMessageId ? "w-20" : "w-28"
                                  } ${msg.isUnread ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}` }>
                                    {getSenderName(msg.from)}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate text-xs">
                                    <span className={msg.isUnread ? "font-semibold text-foreground" : "text-foreground/80"}>
                                      {msg.subject || "(No Subject)"}
                                    </span>
                                    <span className="text-muted-foreground/60"> — {msg.snippet}</span>
                                  </span>
                                </div>
                                {/* Right: quick actions + date */}
                                <div className="shrink-0 flex items-center gap-1.5 ml-2">
                                  <div className="hidden group-hover:flex items-center gap-0.5">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleAction("archive", msg.id); }}
                                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                                        >
                                          <Archive className="h-3.5 w-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>Archive</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleAction(msg.isUnread ? "markRead" : "markUnread", msg.id); }}
                                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                                        >
                                          <Mail className="h-3.5 w-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>{msg.isUnread ? "Mark read" : "Mark unread"}</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleAction("trash", msg.id); }}
                                          className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>Trash</TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-[11px] text-muted-foreground whitespace-nowrap group-hover:hidden tabular-nums">
                                        {formatRelativeDate(msg.date)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{formatFullDate(msg.date)}</TooltipContent>
                                  </Tooltip>
                                  {msg.isUnread && !isSelected && (
                                    <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                                  )}
                                </div>
                              </div>
                            );
                          })}

                        {/* Pagination footer */}
                        {Math.ceil(filteredMessages.length / PAGE_SIZE) > 1 && (
                          <div className="flex items-center justify-center gap-1.5 px-4 py-3 border-t border-border/20" style={{ background: "#1c1c20" }}>
                            <button
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground disabled:opacity-30 transition-colors"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" /> Prev
                            </button>
                            <div className="flex items-center gap-1">
                              {(() => {
                                const total = Math.ceil(filteredMessages.length / PAGE_SIZE);
                                const pages: (number | "...")[] = [];
                                if (total <= 7) {
                                  for (let i = 1; i <= total; i++) pages.push(i);
                                } else if (currentPage <= 4) {
                                  pages.push(1, 2, 3, 4, 5, "...", total);
                                } else if (currentPage >= total - 3) {
                                  pages.push(1, "...", total - 4, total - 3, total - 2, total - 1, total);
                                } else {
                                  pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", total);
                                }
                                return pages.map((p, i) =>
                                  p === "..." ? (
                                    <span key={`e-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                                  ) : (
                                    <button
                                      key={p}
                                      onClick={() => setCurrentPage(p as number)}
                                      className={`h-7 min-w-[28px] rounded-lg px-2 text-xs font-medium transition-all ${
                                        currentPage === p
                                          ? "bg-primary text-primary-foreground shadow-sm"
                                          : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                                      }`}
                                    >
                                      {p}
                                    </button>
                                  )
                                );
                              })()}
                            </div>
                            <button
                              onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredMessages.length / PAGE_SIZE), p + 1))}
                              disabled={currentPage >= Math.ceil(filteredMessages.length / PAGE_SIZE)}
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground disabled:opacity-30 transition-colors"
                            >
                              Next <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Detail pane ───────────────────────────────────── */}
                    {selectedMessageId && (
                      <div className="lg:col-span-7 space-y-4">
                        <Card className="border-border/50">
                          <CardHeader className="border-b border-border/40 pb-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <CardTitle className="text-base font-semibold leading-snug">
                                  {selectedEmailDetail?.subject || "Email Details"}
                                </CardTitle>
                                {selectedEmailDetail && (
                                  <div className="space-y-0.5 text-xs text-muted-foreground">
                                    <p>
                                      <span className="opacity-60">From: </span>
                                      <strong className="text-foreground">{getSenderName(selectedEmailDetail.from)}</strong>
                                      {" "}<span className="opacity-50">&lt;{selectedEmailDetail.from.match(/<(.+)>/)?.[1] || selectedEmailDetail.from}&gt;</span>
                                    </p>
                                    {selectedEmailDetail.to && <p><span className="opacity-60">To: </span>{selectedEmailDetail.to}</p>}
                                    <p className="flex items-center gap-1"><Clock className="h-3 w-3 opacity-60" />{formatFullDate(selectedEmailDetail.date)}</p>
                                  </div>
                                )}
                              </div>
                              <button onClick={closeEmail} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Button size="sm" className="gap-1.5 text-xs" disabled={generatingSummary} onClick={() => handleGenerateSummary()}>
                                {generatingSummary ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                Summarize
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => handleAction("archive", selectedMessageId)}>
                                <Archive className="h-3.5 w-3.5" /> Archive
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                                onClick={() => handleAction(filteredMessages.find(m => m.id === selectedMessageId)?.isUnread ? "markRead" : "markUnread", selectedMessageId)}>
                                <Check className="h-3.5 w-3.5" /> Mark Read
                              </Button>
                              <Button size="sm" variant="destructive" className="gap-1.5 text-xs" onClick={() => handleAction("trash", selectedMessageId)}>
                                <Trash2 className="h-3.5 w-3.5" /> Trash
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="py-4 max-h-[520px] overflow-y-auto space-y-4">
                            {aiSummary && (
                              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-primary" />
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">AI Summary</h4>
                                  <Badge variant="outline" className="ml-auto text-[10px]">Urgency: {aiSummary.urgency}</Badge>
                                </div>
                                <p className="text-sm leading-relaxed">{aiSummary.summary}</p>
                                <div className="flex gap-2 flex-wrap">
                                  <Badge variant="secondary" className="text-[10px]">{aiSummary.actionRequired}</Badge>
                                  <Badge variant="outline" className="text-[10px]">{aiSummary.sentiment}</Badge>
                                </div>
                              </div>
                            )}
                            {loadingDetail ? (
                              <div className="flex items-center justify-center py-10">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                <span className="ml-2 text-sm text-muted-foreground">Loading email body...</span>
                              </div>
                            ) : selectedEmailDetail?.body && /<[a-z][\s\S]*>/i.test(selectedEmailDetail.body) ? (
                              <iframe
                                srcDoc={selectedEmailDetail.body}
                                sandbox="allow-same-origin allow-popups"
                                className="w-full rounded-lg border-0"
                                style={{ minHeight: "400px", colorScheme: "light" }}
                                onLoad={(e) => {
                                  const iframe = e.currentTarget;
                                  const doc = iframe.contentDocument;
                                  if (doc) iframe.style.height = doc.documentElement.scrollHeight + "px";
                                }}
                                title="Email Content"
                              />
                            ) : (
                              <pre className="whitespace-pre-wrap text-foreground/90 font-sans text-sm leading-relaxed">
                                {selectedEmailDetail?.body || selectedEmailDetail?.snippet || "No body content."}
                              </pre>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── AI SUMMARY ────────────────────────────────────────────── */}
            {activeTab === "summary" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">AI Email Summarizer</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Extract key takeaways and action items instantly.</p>
                </div>
                <Card className="p-6 space-y-4">
                  <h3 className="text-base font-semibold">Select an email to summarize</h3>
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Connect Gmail to use AI Summarizer.</p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {messages.map((msg) => (
                        <div key={msg.id} onClick={() => handleGenerateSummary(msg)}
                          className="flex items-center gap-3 rounded-xl border border-border/40 p-3 hover:bg-muted/40 cursor-pointer transition-colors">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getSenderColor(msg.from)}`}>
                            {getSenderInitials(msg.from)}
                          </div>
                          <div className="min-w-0 flex-1 pr-3">
                            <p className="text-xs font-semibold text-foreground">{getSenderName(msg.from)}</p>
                            <p className="text-sm truncate text-muted-foreground">{msg.subject}</p>
                          </div>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeDate(msg.date)}</span>
                          <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0">
                            <Sparkles className="h-3 w-3 text-primary" /> Run
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {generatingSummary && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" /> Generating summary...
                    </div>
                  )}
                  {aiSummary && (
                    <Card className="border-primary/40 bg-primary/10 p-5 space-y-3 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                          <Bot className="h-4 w-4" /> AI Summary Output
                        </span>
                        <Badge variant="secondary">{aiSummary.sentiment}</Badge>
                      </div>
                      <p className="text-sm leading-relaxed">{aiSummary.summary}</p>
                      <ul className="list-disc pl-4 text-xs space-y-1">
                        {aiSummary.bulletPoints.map((p: string, i: number) => <li key={i}>{p}</li>)}
                      </ul>
                    </Card>
                  )}
                </Card>
              </div>
            )}

            {/* ── AI CHAT ───────────────────────────────────────────────── */}
            {activeTab === "chat" && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-primary" /> AI Email Assistant
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">Ask questions about your inbox — chat history is saved for the session.</p>
                </div>

                <div className="flex flex-col rounded-2xl border border-border/40 bg-card overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: "400px" }}>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${msg.role === "assistant" ? "bg-primary/20 text-primary" : "bg-muted text-foreground"}`}>
                          {msg.role === "assistant" ? <Sparkles className="h-4 w-4" /> : userInitials}
                        </div>
                        <div className={`max-w-[75%] flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted/50 border border-border/40 text-foreground rounded-tl-sm"}`}>
                            {msg.role === "assistant"
                              ? <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                              : msg.content}
                          </div>
                          <span className="text-[10px] text-muted-foreground px-1 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div className="rounded-2xl rounded-tl-sm bg-muted/50 border border-border/40 px-4 py-3">
                          <div className="flex gap-1.5 items-center h-4">
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Suggested prompts — only when just the welcome message */}
                  {chatMessages.length <= 1 && (
                    <div className="px-5 pb-3 flex flex-wrap gap-2">
                      {["How many unread emails do I have?", "Who emailed me recently?", "Any urgent emails?", "What are my emails about?"].map((prompt) => (
                        <button key={prompt} onClick={() => setChatInputLocal(prompt)}
                          className="rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="border-t border-border/40 p-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInputLocal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                        placeholder="Ask about your inbox..."
                        className="flex-1 rounded-xl border border-border/40 bg-muted/20 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                      />
                      <Button size="sm" onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()} className="h-10 w-10 p-0 rounded-xl shadow-md shadow-primary/20">
                        {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="mt-2 text-center text-[10px] text-muted-foreground/60">Chat history is preserved for this session.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── AUTOMATIONS ───────────────────────────────────────────── */}
            {activeTab === "automations" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Inbox Automations</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Configure AI automation rules for your Gmail inbox.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    { icon: Archive, title: "Auto-Archive Newsletters", desc: "Automatically moves promotional emails out of your primary inbox." },
                    { icon: Bell, title: "Follow-Up Reminders", desc: "Detects unanswered emails requiring action and prompts you after 48h." },
                  ].map((a) => (
                    <Card key={a.title} className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5"><a.icon className="h-5 w-5 text-primary" /><h3 className="text-sm font-semibold">{a.title}</h3></div>
                        <Badge className="bg-primary/20 text-primary hover:bg-primary/20">Active</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{a.desc}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* ── HISTORY ───────────────────────────────────────────────── */}
            {activeTab === "history" && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                      <History className="h-6 w-6 text-primary" /> Analyzed Email History
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      View all AI analyzed emails and execution history grouped by date.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchHistoryEmails(historyPage, historyFilter)}
                      disabled={historyLoading}
                      className="gap-1.5 text-xs h-8"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? "animate-spin" : ""}`} />
                      Refresh History
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAnalyzeMore}
                      disabled={analyzing || !isConnected}
                      className="gap-1.5 text-xs h-8 bg-linear-to-r from-primary to-blue-600 text-white shadow-md shadow-primary/20"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Analyze 10 More</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center justify-between border-b border-border/30 pb-3">
                  <div className="flex items-center gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
                    {(
                      [
                        { id: "analyzed", label: "Analyzed Emails" },
                        { id: "summary", label: "With Summaries" },
                        { id: "all", label: "All Synced Emails" },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setHistoryFilter(tab.id);
                          fetchHistoryEmails(1, tab.id);
                        }}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                          historyFilter === tab.id
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Total: {historyTotal} records
                  </p>
                </div>

                {/* History Content */}
                {historyLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-xl border border-border/30 p-4 space-y-3 bg-[#161619] animate-pulse">
                        <div className="h-4 w-36 bg-muted/40 rounded" />
                        <div className="h-12 bg-muted/20 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : historyEmails.length === 0 ? (
                  <Card className="p-12 text-center text-sm text-muted-foreground space-y-3">
                    <History className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <p className="font-semibold text-foreground text-base">No analyzed emails in history yet</p>
                    <p className="max-w-md mx-auto text-xs text-muted-foreground">
                      Click &quot;Analyze 10 More&quot; to process incoming emails with n8n AI workflow. Analyzed emails will appear here grouped by date.
                    </p>
                    <Button size="sm" onClick={handleAnalyzeMore} disabled={analyzing || !isConnected} className="gap-2 mt-2">
                      <Sparkles className="h-4 w-4" /> Analyze 10 More Emails
                    </Button>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {/* Group by Date */}
                    {(() => {
                      const groups: Record<string, DbEmail[]> = {};
                      historyEmails.forEach((email) => {
                        const dateObj = new Date(email.receivedAt);
                        let dateKey = "Other";
                        if (!isNaN(dateObj.getTime())) {
                          const today = new Date();
                          const yesterday = new Date();
                          yesterday.setDate(today.getDate() - 1);

                          if (dateObj.toDateString() === today.toDateString()) {
                            dateKey = "Today";
                          } else if (dateObj.toDateString() === yesterday.toDateString()) {
                            dateKey = "Yesterday";
                          } else {
                            dateKey = dateObj.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            });
                          }
                        }
                        if (!groups[dateKey]) groups[dateKey] = [];
                        groups[dateKey].push(email);
                      });

                      return Object.entries(groups).map(([dateLabel, emails]) => (
                        <div key={dateLabel} className="space-y-3">
                          {/* Date Header */}
                          <div className="flex items-center gap-2 px-1">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              {dateLabel}
                            </h3>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border/50 text-muted-foreground">
                              {emails.length}
                            </Badge>
                            <div className="flex-1 h-px bg-border/20" />
                          </div>

                          {/* Email list for this date */}
                          <div className="rounded-xl border border-border/30 overflow-hidden bg-[#161619] divide-y">
                            {emails.map((email) => {
                              const summaryText = emailSummaries[email.id] ?? email.summary;
                              const isLoadingSummary = summaryLoadingIds.has(email.id);
                              const senderDisplay = email.fromName || email.fromEmail;
                              const fromForColor = email.fromName ?? email.fromEmail;

                              return (
                                <div
                                  key={email.id}
                                  className="p-4 hover:bg-muted/20 transition-colors space-y-2.5"
                                >
                                  {/* Top row */}
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div
                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getSenderColor(
                                          fromForColor
                                        )}`}
                                      >
                                        {getSenderInitials(senderDisplay)}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-foreground truncate">
                                          {senderDisplay}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground truncate">
                                          {email.fromEmail}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {/* Category badge */}
                                      {email.category && (
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px] uppercase font-mono font-semibold"
                                        >
                                          {email.category}
                                        </Badge>
                                      )}
                                      {/* Priority badge */}
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] h-4 px-1.5 border-current ${
                                          email.priority === "HIGH"
                                            ? "text-rose-400"
                                            : email.priority === "MEDIUM"
                                            ? "text-amber-400"
                                            : "text-zinc-400"
                                        }`}
                                      >
                                        {email.priority}
                                      </Badge>
                                      <span className="text-[11px] text-muted-foreground tabular-nums">
                                        {new Date(email.receivedAt).toLocaleTimeString("en-US", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Subject */}
                                  <p className="text-sm font-semibold text-foreground leading-snug">
                                    {email.subject || "(No Subject)"}
                                  </p>

                                  {/* AI Summary or snippet */}
                                  {summaryText ? (
                                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        <span>AI Summary</span>
                                      </div>
                                      <p className="text-xs text-foreground/90 leading-relaxed">
                                        {summaryText}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-3 pt-1">
                                      <p className="text-xs text-muted-foreground line-clamp-1 flex-1">
                                        {email.snippet}
                                      </p>
                                      <button
                                        onClick={() => handleSummarizeEmail(email)}
                                        disabled={isLoadingSummary}
                                        className="shrink-0 flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/15 transition-colors disabled:opacity-50"
                                      >
                                        {isLoadingSummary ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Sparkles className="h-3 w-3" />
                                        )}
                                        {isLoadingSummary ? "Summarizing…" : "Summarize with AI"}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}

                    {/* Workflows Execution Log section */}
                    {historyWorkflows.length > 0 && (
                      <div className="space-y-3 pt-4">
                        <div className="flex items-center gap-2 px-1">
                          <Zap className="h-4 w-4 text-amber-400" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Workflow Execution Log
                          </h3>
                        </div>
                        <div className="rounded-xl border border-border/30 bg-[#161619] divide-y">
                          {historyWorkflows.map((wf) => (
                            <div key={wf.id} className="p-3 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-2 w-2 rounded-full ${
                                    wf.status === "COMPLETED"
                                      ? "bg-emerald-400"
                                      : wf.status === "FAILED"
                                      ? "bg-rose-400"
                                      : "bg-amber-400 animate-pulse"
                                  }`}
                                />
                                <span className="font-semibold text-foreground">{wf.type}</span>
                                <span className="text-muted-foreground">({wf.status})</span>
                              </div>
                              <span className="text-muted-foreground tabular-nums">
                                {new Date(wf.createdAt).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pagination */}
                    {Math.ceil(historyTotal / 20) > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={historyPage === 1}
                          onClick={() => fetchHistoryEmails(historyPage - 1, historyFilter)}
                          className="h-8 text-xs gap-1"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" /> Prev
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Page {historyPage} of {Math.ceil(historyTotal / 20)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={historyPage >= Math.ceil(historyTotal / 20)}
                          onClick={() => fetchHistoryEmails(historyPage + 1, historyFilter)}
                          className="h-8 text-xs gap-1"
                        >
                          Next <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── SETTINGS ──────────────────────────────────────────────── */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Account Settings</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Manage workspace preferences and authentication.</p>
                </div>
                <Card className="p-6 space-y-4">
                  <h3 className="text-base font-semibold">User Profile</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div><p className="text-xs text-muted-foreground">Display Name</p><p className="text-sm font-medium">{userDisplayName}</p></div>
                    <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium">{userEmail}</p></div>
                  </div>
                  <Separator />
                  <h3 className="text-base font-semibold">Gmail Integration</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{gmailEmail}</p>
                      <p className="text-xs text-muted-foreground">{isConnected ? "Connected via Google OAuth" : "Not connected"}</p>
                    </div>
                    <Button size="sm" variant={isConnected ? "outline" : "default"} onClick={handleConnectGmail}>
                      {isConnected ? "Reconnect Gmail" : "Connect Gmail"}
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* ── BILLING ───────────────────────────────────────────────── */}
            {activeTab === "billing" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Billing & Usage</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Manage your plan and AI usage limits.</p>
                </div>
                <Card className="p-6 space-y-4">
                  <Badge className="bg-primary/20 text-primary">Free Tier</Badge>
                  <h3 className="text-lg font-semibold">EmailAI Pro (Free)</h3>
                  <p className="text-xs text-muted-foreground">Unlimited AI summaries on current tier.</p>
                </Card>
              </div>
            )}

            {/* ── HELP ──────────────────────────────────────────────────── */}
            {activeTab === "help" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Help & Documentation</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Get assistance with EmailAI integration.</p>
                </div>
                <Card className="p-6 space-y-3">
                  <h3 className="text-base font-semibold">Connecting Gmail safely</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    EmailAI uses Google OAuth 2.0. We request read-only access to emails for generating summaries and categorization. Your credentials are never stored.
                  </p>
                </Card>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}


