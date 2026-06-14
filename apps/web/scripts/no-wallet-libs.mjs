#!/usr/bin/env node
/**
 * CI guard: fail if any wagmi / rainbowkit / injected-wallet code creeps back
 * in. The app's only signing path is the Privy embedded wallet (lib/auth).
 *
 * Usage: node scripts/no-wallet-libs.mjs   (run from apps/web)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["app", "components", "lib"];
const EXTS = new Set([".ts", ".tsx"]);
// patterns that must never appear in source again
const BANNED = [
  /@rainbow-me\/rainbowkit/,
  /\bfrom ["']wagmi/,
  /\buseAccount\(/,
  /\buseConnect\(/,
  // wagmi's standalone switchChain action — NOT Privy's embedded
  // `wallet.switchChain()`, which is the supported way to move the embedded
  // wallet to the GenLayer chain.
  /\bswitchChain\(config\b/,
  /["']wagmi\/actions["']/,
  /window\.ethereum/,
];

const offenders = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(p);
    } else if (EXTS.has(extname(p))) {
      const text = readFileSync(p, "utf8");
      for (const re of BANNED) {
        if (re.test(text)) offenders.push(`${p}  →  ${re}`);
      }
    }
  }
}

for (const r of ROOTS) {
  try {
    walk(r);
  } catch {
    /* root may not exist */
  }
}

if (offenders.length) {
  console.error("✘ Wallet-lib guard failed — these must be removed:\n");
  for (const o of offenders) console.error("  " + o);
  console.error("\nThe only signing path is the Privy embedded wallet (lib/auth).");
  process.exit(1);
}
console.log("✓ No wagmi / rainbowkit / injected-wallet references found.");
