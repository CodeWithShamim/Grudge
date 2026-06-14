"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Modal } from "@/components/ui/Modal";
import { LoginScreen } from "./LoginScreen";

/**
 * AuthGate — wraps the app and exposes `requireAuth`. Write actions call it:
 * if the user is signed in, the action runs; otherwise the email-login modal
 * opens instead of erroring, and the pending action runs after login.
 *
 * Reads (browsing the feed) never touch this — they need no account.
 */

interface AuthGateContextValue {
  /** Returns true if signed in; otherwise opens login and returns false. */
  requireAuth: () => boolean;
  /** Run `action` now if signed in, else after a successful login. */
  withAuth: (action: () => void) => void;
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function useAuthGate(): AuthGateContextValue {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useAuthGate must be used within <AuthGate>");
  return ctx;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);

  const requireAuth = useCallback(() => {
    if (session) return true;
    setOpen(true);
    return false;
  }, [session]);

  const withAuth = useCallback(
    (action: () => void) => {
      if (session) {
        action();
        return;
      }
      setPending(() => action);
      setOpen(true);
    },
    [session],
  );

  const onLoggedIn = useCallback(() => {
    setOpen(false);
    if (pending) {
      const run = pending;
      setPending(null);
      // let the session settle before firing the queued action
      setTimeout(run, 50);
    }
  }, [pending]);

  return (
    <AuthGateContext.Provider value={{ requireAuth, withAuth }}>
      {children}
      <Modal open={open} onClose={() => setOpen(false)} title="Sign in to act">
        <LoginScreen onDone={onLoggedIn} />
      </Modal>
    </AuthGateContext.Provider>
  );
}
