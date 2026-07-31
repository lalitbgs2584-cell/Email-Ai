import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Search,
  Tag,
  RefreshCw,
  Bell,
  Trash2,
  Mail,
  Shield,
  ArrowRight,
  CheckCircle2,
  Zap,
  BookOpen,
  ChevronRight,
} from "lucide-react";

const features = [
  { icon: Sparkles, title: "AI Email Summaries", description: "Get instant AI-generated summaries of long email threads so you can respond faster." },
  { icon: Search, title: "Smart Search", description: "Find any email instantly using natural language — no more digging through folders." },
  { icon: Tag, title: "Intelligent Categorization", description: "Emails are automatically sorted into categories like Work, Personal, Receipts, and Newsletters." },
  { icon: RefreshCw, title: "Automated Follow-ups", description: "Never miss a follow-up again. EmailAI detects when a reply is needed and reminds you." },
  { icon: Bell, title: "AI Reminders", description: "Extracts meeting invites, deadlines, and action items and adds them to your schedule." },
  { icon: Trash2, title: "Inbox Cleanup", description: "Automatically archive old newsletters and low-priority emails to keep your inbox tidy." },
  { icon: Mail, title: "Gmail Integration", description: "Works natively with Gmail. Connect your account in seconds with zero configuration." },
  { icon: Shield, title: "Secure OAuth Authentication", description: "We use Google OAuth so your credentials are never stored on our servers." },
];

const steps = [
  { step: "01", title: "Sign In", description: "Create your free EmailAI account using Google." },
  { step: "02", title: "Connect Gmail", description: "Authorize Gmail access with secure OAuth in one click." },
  { step: "03", title: "AI Learns Your Inbox", description: "EmailAI analyzes your email patterns and priorities." },
  { step: "04", title: "Enable Automations", description: "Turn on smart summaries, reminders, and cleanup rules." },
  { step: "05", title: "Stay Productive", description: "Spend 80% less time in your inbox and focus on what matters." },
];

const GoogleIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold tracking-tight">EmailAI</span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {[
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "Documentation", href: "#docs" },
              { label: "About", href: "#about" },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Sign In
            </Link>
            <Link href="/sign-in">
              <Button size="sm" className="gap-1.5">
                Get started <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 text-center">
          <Badge variant="secondary" className="mb-6 gap-1.5 rounded-full px-3 py-1 text-xs">
            <Zap className="h-3 w-3" /> Powered by AI
          </Badge>

          <h1 className="mx-auto max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Your{" "}
            <span className="text-primary">AI-Powered</span>
            <br />
            Email Assistant
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Summarize emails, find important conversations, automate repetitive tasks, organize
            your inbox, and stay focused—all powered by AI.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/sign-in">
              <Button size="lg" className="h-12 gap-2.5 px-7 text-sm font-medium shadow-lg shadow-primary/25">
                <GoogleIcon />
                Continue with Google
              </Button>
            </Link>
            <a href="#how-it-works" className="inline-flex h-12 items-center gap-2 rounded-lg border border-border bg-muted/50 px-6 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground">
              Learn More <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
            {["Trusted by 5,000+ users", "Free to get started", "Gmail-ready in 30 seconds"].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" /> {item}
              </div>
            ))}
          </div>

          {/* App preview mockup */}
          <Card className="relative mx-auto mt-16 max-w-4xl overflow-hidden shadow-2xl">
            <div className="flex h-10 items-center gap-1.5 border-b border-border bg-muted/50 px-4">
              <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
              <div className="mx-auto flex h-6 w-64 items-center justify-center rounded-md border border-border bg-background px-3">
                <span className="text-xs text-muted-foreground">app.emailai.com/dashboard</span>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="hidden w-40 shrink-0 sm:block">
                  <div className="space-y-0.5">
                    {["Dashboard", "Inbox", "AI Summary", "Automations", "History", "Settings"].map((item, i) => (
                      <div key={item} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium ${i === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-primary" : "bg-muted-foreground/40"}`} />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="h-4 w-36 rounded-md bg-foreground/80" />
                      <div className="h-3 w-48 rounded bg-muted-foreground/30" />
                    </div>
                    <div className="h-8 w-28 rounded-lg bg-primary" />
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-border bg-muted/40 p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-primary/20" />
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-24 rounded bg-muted-foreground/30" />
                            <div className="h-2.5 w-16 rounded bg-primary/30" />
                          </div>
                          <div className="h-2.5 w-full rounded bg-muted-foreground/20" />
                          <div className="h-2.5 w-3/4 rounded bg-muted-foreground/20" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-muted/20 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1 text-xs">Features</Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need to master your inbox
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              EmailAI combines state-of-the-art AI with a clean, focused interface.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="group transition-all duration-200 hover:-translate-y-0.5 hover:ring-primary/20">
                  <CardContent className="pt-6">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 transition-colors group-hover:bg-primary/20">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="mb-1.5 text-sm font-semibold text-foreground">{feature.title}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1 text-xs">How It Works</Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Get set up in minutes, not hours
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-5">
            {steps.map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
                  <span className="text-base font-bold text-primary">{item.step}</span>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <Card className="relative overflow-hidden border-primary/20 bg-primary/10 text-center">
            <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <CardContent className="relative py-16">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Take back your inbox today.</h2>
              <p className="mt-4 text-base text-muted-foreground">
                Join thousands of professionals using EmailAI to be more productive.
              </p>
              <div className="mt-8 flex justify-center">
                <Link href="/sign-in">
                  <Button size="lg" className="h-12 gap-2.5 px-7 shadow-lg shadow-primary/25">
                    <GoogleIcon />
                    Continue with Google
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">EmailAI</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6">
              {[
                { label: "Privacy", href: "#" },
                { label: "Terms", href: "#" },
                { label: "Contact", href: "#" },
                { label: "Documentation", href: "#" },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              ))}
              <a href="#" className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <BookOpen className="h-4 w-4" /> Docs
              </a>
            </div>

            <p className="text-xs text-muted-foreground">© 2026 EmailAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
