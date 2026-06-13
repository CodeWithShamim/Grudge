import type { Metadata } from "next";
import { Anton, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ChainProviders } from "@/lib/chain/wallet";
import { Header } from "@/components/Header";
import { CommandMenu } from "@/components/CommandMenu";
import { DocsFab } from "@/components/DocsFab";

const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap", style: "normal" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "GRUDGE — your friends bet you'll fail",
  description:
    "Stake on yourself. Let them doubt you publicly. A GenLayer Intelligent Contract is the referee.",
  openGraph: {
    title: "GRUDGE — your friends bet you'll fail",
    description: "Every doubt recorded. Every receipt public.",
    siteName: "GRUDGE",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${sans.variable}`}>
      <body className="min-h-dvh bg-ink text-paper">
        <ChainProviders>
          <Header />
          <main>{children}</main>
          <CommandMenu />
          <DocsFab />
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: { background: "#1e222a", border: "1px solid #2a2f39", color: "#f5f1e6" },
            }}
          />
        </ChainProviders>
      </body>
    </html>
  );
}
