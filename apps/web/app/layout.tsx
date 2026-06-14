import type { Metadata } from "next";
import { Anton, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ChainProviders } from "@/lib/chain/wallet";
import { Header } from "@/components/Header";
import { CommandMenu } from "@/components/CommandMenu";
import { DocsFab } from "@/components/DocsFab";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { SITE, SITE_URL, absoluteUrl } from "@/lib/seo";

const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap", style: "normal" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE.title,
    template: "%s · GRUDGE",
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  authors: [{ name: "GRUDGE" }],
  creator: "GRUDGE",
  category: "technology",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.shortDescription,
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.shortDescription,
    creator: SITE.twitter,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${sans.variable}`}>
      <body className="min-h-dvh bg-ink text-paper">
        {/* Site-wide structured data for SEO/AEO */}
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE.name,
            url: SITE_URL,
            description: SITE.description,
            potentialAction: {
              "@type": "SearchAction",
              target: `${absoluteUrl("/explorer")}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          }}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: SITE.name,
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web",
            url: SITE_URL,
            description: SITE.description,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "Stake GEN on a public commitment",
              "Believers and doubters bet on the outcome",
              "Validator-LLM consensus settles every verdict",
              "On-chain, publicly auditable receipts",
            ],
          }}
        />
        <ChainProviders>
          <Header />
          <main>{children}</main>
          <Footer />
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
