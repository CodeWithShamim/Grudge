"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getChainMode, getGrudgeClient } from "./client";
import { explorerTxUrl } from "./bradbury";
import { MOCK_ME } from "./mock";
import { subscribeTxStatus } from "./txStatus";
import { useWalletAddress } from "./wallet";
import type { Challenge, CreateChallengeInput, EvidenceEntry, SettleResult, Side } from "./types";

/**
 * TanStack Query hooks — the only way components talk to the chain.
 * Mutations are optimistic: pending entries render instantly with the
 * `pending-tx` treatment and reconcile (or roll back + toast) on result.
 */

export const qk = {
  challenge: (id: string) => ["challenge", id] as const,
  open: ["challenges", "open"] as const,
  profile: (address: string) => ["profile", address] as const,
  leaderboards: ["leaderboards"] as const,
  claimable: (address: string) => ["claimable", address] as const,
  reputation: (address: string) => ["reputation", address] as const,
  anchor: (id: string) => ["anchor", id] as const,
};

/** The acting identity: connected wallet, or the demo identity in mock mode. */
export function useViewer(): { address: string; isDemo: boolean } {
  const wallet = useWalletAddress();
  if (wallet) return { address: wallet, isDemo: false };
  return { address: MOCK_ME, isDemo: true };
}

// Live consensus phases for in-flight writes (PENDING → PROPOSING →
// COMMITTING → ACCEPTED). One loading toast per tx, keyed by hash; the
// mutation's own success/error toast replaces it once the write settles.
if (typeof window !== "undefined") {
  subscribeTxStatus(({ txHash, functionName, status, done }) => {
    const id = `tx-${txHash}`;
    if (done) {
      toast.dismiss(id);
      return;
    }
    toast.loading(`${functionName.replace(/_/g, " ")} - ${status.toLowerCase()}`, {
      id,
      description: `tx ${txHash.slice(0, 10)}…${txHash.slice(-6)}`,
    });
  });
}

/**
 * Surface the contract's own error as the toast TITLE (the prominent line),
 * with the action context as the smaller description. `write()` already
 * extracts the on-chain UserError into err.message via friendlyError, so this
 * shows exactly what the explorer would for a reverted tx.
 */
function errToast(context: string, err: unknown): void {
  const message =
    err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.";
  toast.error(message, { description: context });
}

function txToast(label: string, txHash: string): void {
  const isMock = getChainMode() === "mock";
  toast.success(label, {
    description: `tx ${txHash.slice(0, 10)}…${txHash.slice(-6)}`,
    action: isMock
      ? undefined
      : { label: "Explorer", onClick: () => window.open(explorerTxUrl(txHash), "_blank") },
  });
}

export function useChallenge(id: string) {
  return useQuery({
    queryKey: qk.challenge(id),
    queryFn: async () => (await getGrudgeClient()).getChallenge(id),
    refetchInterval: 15_000,
  });
}

export function useOpenChallenges() {
  return useQuery({
    queryKey: qk.open,
    queryFn: async () => (await getGrudgeClient()).getOpenChallenges(),
    refetchInterval: 20_000,
  });
}

export function useProfile(address: string) {
  return useQuery({
    queryKey: qk.profile(address),
    queryFn: async () => (await getGrudgeClient()).getProfile(address),
  });
}

/** F4: on-chain conviction rating for an address. */
export function useReputation(address: string | undefined) {
  return useQuery({
    queryKey: qk.reputation(address ?? ""),
    queryFn: async () => (await getGrudgeClient()).getReputation(address!),
    enabled: !!address,
    staleTime: 60_000,
  });
}

/**
 * F3: explain a verdict on demand (read-only consensus). A mutation, not a
 * query, because it's triggered by a user click and each call is a fresh
 * consensus round — we don't want it auto-firing or background-refetching.
 */
export function useExplainVerdict(challengeId: string) {
  return useMutation({
    mutationFn: async (evidenceIndex: number) =>
      (await getGrudgeClient()).explainVerdict(challengeId, evidenceIndex),
    onError: (e) => toast.error("Couldn't explain this verdict", { description: e.message }),
  });
}

/** F2: ask the AI to design a fair evidence policy for a statement. */
export function useSuggestPolicy() {
  return useMutation({
    mutationFn: async (statement: string) => (await getGrudgeClient()).suggestPolicy(statement),
    onError: (e) => toast.error("Couldn't design a policy", { description: e.message }),
  });
}

export function useLeaderboards() {
  return useQuery({
    queryKey: qk.leaderboards,
    queryFn: async () => (await getGrudgeClient()).getLeaderboards(),
  });
}

export function useCreateChallenge() {
  const qc = useQueryClient();
  const { address } = useViewer();
  return useMutation({
    mutationFn: async (input: CreateChallengeInput) =>
      (await getGrudgeClient()).createChallenge(input, address),
    onSuccess: ({ id, txHash }) => {
      void qc.invalidateQueries({ queryKey: qk.open });
      txToast("Grudge recorded. Let them doubt.", txHash);
      return id;
    },
    onError: (e) => errToast("Couldn't create the grudge", e),
  });
}

export function useStake(challengeId: string) {
  const qc = useQueryClient();
  const { address } = useViewer();
  return useMutation({
    mutationFn: async (vars: { side: Side; amount: number; taunt?: string }) =>
      (await getGrudgeClient()).stake(challengeId, vars.side, vars.amount, address, vars.taunt),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: qk.challenge(challengeId) });
      const prev = qc.getQueryData<Challenge>(qk.challenge(challengeId));
      if (prev) {
        const optimistic: Challenge = {
          ...prev,
          believerPool: prev.believerPool + (vars.side === "believe" ? vars.amount : 0),
          doubterPool: prev.doubterPool + (vars.side === "doubt" ? vars.amount : 0),
          stakes: [...prev.stakes, { address, side: vars.side, amount: vars.amount, taunt: vars.taunt, at: Date.now() }],
        };
        qc.setQueryData(qk.challenge(challengeId), optimistic);
      }
      return { prev };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.challenge(challengeId), ctx.prev);
      errToast("Stake failed - rolled back", e);
    },
    onSuccess: ({ txHash }, vars) => {
      txToast(vars.side === "doubt" ? "Doubt recorded. It's public now." : "Belief recorded.", txHash);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.challenge(challengeId) });
      void qc.invalidateQueries({ queryKey: qk.open });
    },
  });
}

export function useSubmitEvidence(challengeId: string) {
  const qc = useQueryClient();
  const { address } = useViewer();
  return useMutation({
    mutationFn: async (evidenceText: string): Promise<{ txHash: string; entry: EvidenceEntry }> =>
      (await getGrudgeClient()).submitEvidence(challengeId, evidenceText, address),
    onError: (e) => errToast("Evidence not recorded", e),
    onSettled: () => void qc.invalidateQueries({ queryKey: qk.challenge(challengeId) }),
  });
}

export function useDisputeEvidence(challengeId: string) {
  const qc = useQueryClient();
  const { address } = useViewer();
  return useMutation({
    mutationFn: async (vars: { evidenceIndex: number; counterEvidence: string }) =>
      (await getGrudgeClient()).disputeEvidence(challengeId, vars.evidenceIndex, vars.counterEvidence, address),
    onSuccess: ({ entry, txHash }) => {
      txToast(
        entry.verdict === "REJECTED" ? "Dispute landed. Verdict flipped." : "Dispute heard. Verdict stands.",
        txHash,
      );
    },
    onError: (e) => errToast("Dispute failed", e),
    onSettled: () => void qc.invalidateQueries({ queryKey: qk.challenge(challengeId) }),
  });
}

/** F1: appeal a REJECTED verdict with a bond. */
export function useAppealVerdict(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { evidenceIndex: number; bond: number }) =>
      (await getGrudgeClient()).appealVerdict(challengeId, vars.evidenceIndex, vars.bond),
    onSuccess: ({ entry, txHash }) => {
      txToast(
        entry.verdict === "VERIFIED" ? "Appeal won. Verdict flipped — bond returned." : "Appeal heard. Verdict stands.",
        txHash,
      );
    },
    onError: (e) => errToast("Appeal failed", e),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.challenge(challengeId) });
      void qc.invalidateQueries({ queryKey: ["claimable"] });
    },
  });
}

/** F5: the ownership code + status for a challenge's proof anchor. */
export function useAnchorInfo(challengeId: string, enabled = true) {
  return useQuery({
    queryKey: qk.anchor(challengeId),
    queryFn: async () => (await getGrudgeClient()).getAnchorInfo(challengeId),
    enabled,
    staleTime: 60_000,
  });
}

/** F5: consensus-verify the registered proof anchor (creator only). */
export function useVerifyAnchor(challengeId: string) {
  const qc = useQueryClient();
  const { address } = useViewer();
  return useMutation({
    mutationFn: async () => (await getGrudgeClient()).verifyAnchor(challengeId, address),
    onSuccess: ({ txHash }) => txToast("Anchor verified. Your proof source is locked in.", txHash),
    onError: (e) => errToast("Anchor verification failed", e),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.challenge(challengeId) });
      void qc.invalidateQueries({ queryKey: qk.anchor(challengeId) });
    },
  });
}

export function useSettle(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<SettleResult> => (await getGrudgeClient()).settle(challengeId),
    onSuccess: (res) => txToast(res.outcome === "SUCCEEDED" ? "Settled: they did it." : "Settled: called it.", res.txHash),
    onError: (e) => errToast("Settle failed", e),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.challenge(challengeId) });
      void qc.invalidateQueries({ queryKey: qk.open });
      // settle credits the winners' claimable ledgers
      void qc.invalidateQueries({ queryKey: ["claimable"] });
    },
  });
}

/** Settled-but-unclaimed winnings for an address, in GEN. */
export function useClaimable(address: string) {
  return useQuery({
    queryKey: qk.claimable(address),
    queryFn: async () => (await getGrudgeClient()).getClaimable(address),
    refetchInterval: 20_000,
  });
}

export function useClaim() {
  const qc = useQueryClient();
  const { address } = useViewer();
  return useMutation({
    mutationFn: async () => (await getGrudgeClient()).claim(address),
    onSuccess: ({ txHash, amount }) => {
      txToast(`Claimed ${amount} GEN. Spend it loudly.`, txHash);
    },
    onError: (e) => errToast("Claim failed", e),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.claimable(address) });
      void qc.invalidateQueries({ queryKey: qk.profile(address) });
    },
  });
}
