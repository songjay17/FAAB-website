import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BettingProvider } from "@/lib/state/betting-provider";
import { SessionProvider } from "@/lib/state/session-provider";
import { SleeperDataProvider } from "@/lib/state/sleeper-data-provider";
import { AppShell } from "@/components/layout/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JHULads",
  description: "Private fantasy football FAAB betting for JHULads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Session first: everything below it can assume a signed-in member. */}
        <SessionProvider>
          <SleeperDataProvider>
            <BettingProvider>
              <TooltipProvider>
                <AppShell>{children}</AppShell>
              </TooltipProvider>
            </BettingProvider>
          </SleeperDataProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
