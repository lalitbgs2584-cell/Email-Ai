"use client";

import Link from "next/link";
import { Sparkles, Mail, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";

const perks = [
  { icon: Sparkles, label: "Instant AI email summaries" },
  { icon: Mail, label: "Smart inbox organization" },
  { icon: Zap, label: "Automated follow-ups & reminders" },
  { icon: Shield, label: "Secure Google OAuth — no stored credentials" },
];

const GoogleIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function SignInPage() {
  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Left brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-muted/30 p-12 lg:flex lg:w-1/2">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold">EmailAI</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-semibold leading-snug">
              Your inbox,
              <br />
              finally under control.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              EmailAI uses AI to summarize, organize, and automate your emails — so you can
              focus on what actually matters.
            </p>
          </div>

          <div className="space-y-2.5">
            {perks.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Testimonial */}
        <Card className="relative z-10 border-border/50">
          <CardContent className="py-5">
            <p className="text-sm italic leading-relaxed text-muted-foreground">
              "EmailAI cut my inbox time in half. The AI summaries are a game changer — I never
              miss an important email now."
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-primary/20" />
              <div>
                <p className="text-xs font-medium">Sarah K.</p>
                <p className="text-xs text-muted-foreground">Product Manager</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right auth panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-20">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold">EmailAI</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Continue with your Google account.
            </p>
          </div>

          <div className="space-y-4">
            {/* Google sign-in button */}
            <button
              onClick={handleGoogleSignIn}
              id="google-sign-in-btn"
              className="group flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-medium text-card-foreground shadow-sm transition-all duration-200 hover:border-border/80 hover:bg-muted active:scale-[0.99]"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Separator */}
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">Secure & private</span>
              <Separator className="flex-1" />
            </div>

            {/* Trust note */}
            <Card>
              <CardContent className="flex items-start gap-2.5 py-4">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  We only use your Google account for authentication. Your credentials are{" "}
                  <strong className="text-foreground">never stored</strong> on our servers.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link href="#" className="text-primary hover:underline">Terms of Service</Link>{" "}
              and{" "}
              <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
              ← Back to EmailAI
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
