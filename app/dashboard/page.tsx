"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles, LayoutDashboard, Inbox, FileText, Zap, History,
  Settings, CreditCard, HelpCircle, Search, Bell, ChevronDown,
  Mail, CheckCircle2, RefreshCw, Unlink, Tag, Calendar,
  BarChart3, Newspaper, Reply, Receipt, Archive, AlertCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", active: true },
  { icon: Inbox, label: "Inbox", href: "/dashboard/inbox" },
  { icon: Sparkles, label: "AI Summary", href: "/dashboard/summary" },
  { icon: Zap, label: "Automations", href: "/dashboard/automations" },
  { icon: History, label: "History", href: "/dashboard/history" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
  { icon: CreditCard, label: "Billing", href: "/dashboard/billing" },
  { icon: HelpCircle, label: "Help", href: "/dashboard/help" },
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

interface GmailAccountInfo {
  gmailEmail: string;
  connectedAt: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailAccount, setGmailAccount] = useState<GmailAccountInfo | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchGmailStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/gmail/status");
      const data = await res.json();
      if (data.connected) {
        setGmailConnected(true);
        setGmailAccount(data.account);
      } else {
        setGmailConnected(false);
        setGmailAccount(null);
      }
    } catch (err) {
      console.error("Error fetching Gmail status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGmailStatus();
  }, []);

  const handleConnectGmail = () => {
    window.location.href = "/api/gmail/connect";
  };

  const handleDisconnectGmail = async () => {
    try {
      setDisconnecting(true);
      const res = await fetch("/api/gmail/disconnect", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setGmailConnected(false);
        setGmailAccount(null);
      }
    } catch (err) {
      console.error("Disconnect failed:", err);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold">EmailAI</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                id={`sidebar-${item.label.toLowerCase().replace(" ", "-")}`}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                  item.active
                    ? "bg-sidebar-primary/15 text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <Separator />
        <div className="p-4">
          <button className="flex w-full items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-sidebar-accent">
            <Avatar size="sm">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {gmailAccount?.gmailEmail?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-medium">Workspace User</p>
              <p className="truncate text-xs text-muted-foreground">{gmailAccount?.gmailEmail || "user@gmail.com"}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 min-w-0 flex-col">
        {/* Top navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">EmailAI</span>
          </div>

          {/* Search */}
          <div className="hidden flex-1 max-w-md lg:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search emails..."
                className="h-9 w-full rounded-xl border border-border bg-muted/50 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" id="notifications-btn" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
            </Button>
            <Button variant="ghost" size="icon-sm" id="settings-btn">
              <Settings className="h-4 w-4" />
            </Button>
            <Avatar size="sm" id="profile-btn">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {gmailAccount?.gmailEmail?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-5xl space-y-8">

            {/* Title */}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Welcome back 👋</h1>
              <p className="mt-1 text-sm text-muted-foreground">Here's an overview of your EmailAI workspace.</p>
            </div>

            {/* Gmail Connection Card */}
            {loading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Checking Gmail connection status...</span>
                </CardContent>
              </Card>
            ) : gmailConnected ? (
              <Card>
                <CardHeader className="border-b border-border">
                  <CardTitle>Connection Status</CardTitle>
                  <CardDescription>Your Gmail account is active</CardDescription>
                  <CardAction>
                    <Badge variant="secondary" className="gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Gmail Connected
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Connected Account</p>
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400">G</div>
                          <p className="text-sm font-medium">{gmailAccount?.gmailEmail || "Connected"}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Connected On</p>
                        <p className="text-sm font-medium">
                          {gmailAccount?.connectedAt
                            ? new Date(gmailAccount.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "Recently"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        id="reconnect-gmail-btn"
                        variant="outline"
                        size="sm"
                        onClick={handleConnectGmail}
                        className="gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Reconnect
                      </Button>
                      <Button
                        id="disconnect-gmail-btn"
                        variant="destructive"
                        size="sm"
                        disabled={disconnecting}
                        onClick={handleDisconnectGmail}
                        className="gap-1.5"
                      >
                        {disconnecting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Unlink className="h-3.5 w-3.5" />
                        )}
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center py-14 text-center">
                  {/* Illustration */}
                  <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                    <Mail className="h-10 w-10 text-primary/60" />
                    <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted">
                      <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                    </div>
                  </div>

                  <h2 className="text-lg font-semibold">No Gmail account connected</h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Connect your Gmail account to unlock AI summaries, smart search, reminders,
                    email automation, and intelligent inbox management.
                  </p>

                  <Button
                    id="connect-gmail-btn"
                    size="lg"
                    className="mt-7 gap-2.5 shadow-lg shadow-primary/20"
                    onClick={handleConnectGmail}
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" opacity="0.9"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity="0.8"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" opacity="0.7"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity="0.6"/>
                    </svg>
                    Connect Gmail
                  </Button>

                  <p className="mt-3 text-xs text-muted-foreground">
                    Secure Google OAuth · Your credentials are never stored.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Coming Soon */}
            <div>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">AI Features</h2>
                  <p className="text-sm text-muted-foreground">Powerful capabilities rolling out soon.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {comingSoonFeatures.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <Card key={feature.title} className="opacity-60">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Badge variant="outline" className="text-[10px] rounded-full">Coming Soon</Badge>
                        </div>
                        <CardTitle className="mt-3 text-sm">{feature.title}</CardTitle>
                        <CardDescription className="text-xs">{feature.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
