import Link from "next/link";
import { explorerAddressUrl, grudgeContractAddress } from "@/lib/chain/bradbury";
import { shortAddress } from "@/lib/utils";

/**
 * Global site footer — brand, product/resource nav, and (in genlayer mode) a
 * link to the deployed contract on the GenLayer explorer.
 */

const PRODUCT = [
  { label: "Ledger", href: "/" },
  { label: "Explorer", href: "/explorer" },
  { label: "Leaderboards", href: "/leaderboards" },
  { label: "Hold a grudge", href: "/create" },
];

const RESOURCES = [
  { label: "Docs", href: "/docs" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "GenLayer", href: "https://genlayer.com", external: true },
  { label: "GenLayer Docs", href: "https://docs.genlayer.com", external: true },
];

function FooterLink({ label, href, external }: { label: string; href: string; external?: boolean }) {
  const cls = "font-sans text-sm text-mut transition-colors hover:text-paper";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {label} <span aria-hidden>↗</span>
    </a>
  ) : (
    <Link href={href} className={cls}>
      {label}
    </Link>
  );
}

export function Footer() {
  const contract = grudgeContractAddress();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-ink-line bg-ink-soft/40">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* brand */}
          <div>
            <Link href="/" className="display-statement text-2xl text-paper hover:text-gold">
              GRUDGE<span className="text-doubt">.</span>
            </Link>
            <p className="mt-3 max-w-xs font-sans text-sm leading-relaxed text-mut">
              Stake on a promise. Let the doubters bet against you. GenLayer validator consensus is
              the referee - every receipt public.
            </p>
            {contract && (
              <a
                href={explorerAddressUrl(contract)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-control border border-ink-line bg-ink px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-mut transition-colors hover:border-gold/50 hover:text-paper"
                title={`Contract ${contract} on the GenLayer explorer`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                Contract {shortAddress(contract)} ↗
              </a>
            )}
          </div>

          {/* product */}
          <nav aria-label="Product" className="flex flex-col gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-mut/70">Product</p>
            {PRODUCT.map((l) => (
              <FooterLink key={l.label} {...l} />
            ))}
          </nav>

          {/* resources */}
          <nav aria-label="Resources" className="flex flex-col gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-mut/70">Resources</p>
            {RESOURCES.map((l) => (
              <FooterLink key={l.label} {...l} />
            ))}
          </nav>
        </div>

        {/* bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-ink-line pt-6 sm:flex-row">
          <p className="font-mono text-[10px] uppercase tracking-widest text-mut">
            © {year} GRUDGE · built on GenLayer
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-mut">
            every doubt recorded · every receipt public
          </p>
        </div>
      </div>
    </footer>
  );
}
