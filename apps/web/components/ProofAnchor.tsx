"use client";

import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAnchorInfo, useVerifyAnchor, useViewer } from "@/lib/chain/hooks";
import type { Challenge } from "@/lib/chain/types";
import { Button } from "./ui/Button";

function anchorHost(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return url;
  }
}

/**
 * F5 anchored proof: the challenge's proof-source status. For everyone it's a
 * badge (evidence for this grudge can only come from the registered account);
 * for the creator of an unverified anchor it's the verification flow — paste
 * the ownership code on the anchor page, then let the validators fetch it.
 */
export function ProofAnchor({ challenge }: { challenge: Challenge }) {
  const { address } = useViewer();
  const isCreator = challenge.creator.toLowerCase() === address.toLowerCase();
  const needsVerify = isCreator && !challenge.anchorVerified && challenge.status === "ACTIVE";
  const { data: info } = useAnchorInfo(challenge.id, Boolean(challenge.proofAnchor) && needsVerify);
  const verify = useVerifyAnchor(challenge.id);

  if (!challenge.proofAnchor) return null;
  const host = anchorHost(challenge.proofAnchor);

  return (
    <div className="mb-5">
      <p className="font-mono text-[10px] uppercase tracking-widest">
        <span className="text-mut">proof source · </span>
        <a
          href={challenge.proofAnchor}
          target="_blank"
          rel="noopener noreferrer"
          className="text-paper/80 hover:underline"
        >
          {host}
        </a>
        <span className={cn("ml-2 font-bold", challenge.anchorVerified ? "text-believe" : "text-gold")}>
          {challenge.anchorVerified ? "⚓ ownership verified" : "⚓ unverified"}
        </span>
      </p>
      {challenge.anchorVerified && (
        <p className="mt-1 text-xs text-mut">Evidence for this grudge only counts if it links to {host}.</p>
      )}
      {needsVerify && (
        <div className="mt-3 rounded-card border border-gold/40 bg-gold/5 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gold">
            Prove you own this account before submitting evidence
          </p>
          <p className="mt-2 text-sm text-paper/90">
            Paste this code into the profile at{" "}
            <span className="font-mono text-gold">{host}</span> (bio or a pinned post), then verify —
            the validators fetch the page and check for it by consensus.
          </p>
          {info?.code && (
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 select-all truncate rounded-control bg-ink px-3 py-2 font-mono text-sm text-gold">
                {info.code}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await navigator.clipboard.writeText(info.code);
                  toast.success("Ownership code copied");
                }}
              >
                Copy
              </Button>
            </div>
          )}
          <Button
            size="sm"
            className="mt-3"
            loading={verify.isPending}
            onClick={() => verify.mutate()}
          >
            Verify anchor
          </Button>
        </div>
      )}
    </div>
  );
}
