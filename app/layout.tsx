import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EmailAI — AI-Powered Email Assistant",
  description:
    "Summarize emails, find important conversations, automate repetitive tasks, organize your inbox, and stay focused—all powered by AI.",
  keywords: ["email", "AI", "assistant", "productivity", "Gmail", "automation"],
  openGraph: {
    title: "EmailAI — AI-Powered Email Assistant",
    description:
      "Summarize emails, find important conversations, automate repetitive tasks, and stay focused—all powered by AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
