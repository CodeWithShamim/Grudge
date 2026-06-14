"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { WalletAddressContext } from "@/lib/chain/wallet";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "./index";

/**
 * Pipes the auth session address into the shared WalletAddressContext (so the
 * rest of the app reads the connected address unchanged), and auto-funds the
 * embedded wallet once, on first login, when on studionet.
 */
export function SessionAddressBridge({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const funded = useRef<string | null>(null);

  useEffect(() => {
    const address = session?.address;
    if (!address || funded.current === address) return;
    funded.current = address;
    void (async () => {
      const { ensureFunded } = await import("@/lib/chain/fund");
      const ok = await ensureFunded(address);
      if (ok) {
        toast.success("Test GEN ready", { description: "Your account is funded on studionet." });
      }
    })();
  }, [session?.address]);

  return (
    <WalletAddressContext.Provider value={session?.address ?? null}>
      <AuthGate>{children}</AuthGate>
    </WalletAddressContext.Provider>
  );
}
