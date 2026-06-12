/**
 * Live consensus-phase events for in-flight GenLayer writes.
 *
 * Zero-dependency pub/sub so hooks.ts can show consensus progress without
 * importing genlayer-js (mock mode must never ship wallet/chain JS). The
 * genlayer adapter emits; the UI subscribes.
 */

export interface TxStatusEvent {
  txHash: string;
  functionName: string;
  /** Consensus phase name: PENDING, PROPOSING, COMMITTING, ACCEPTED, … */
  status: string;
  /** True once the tx reached a decided state (or polling gave up). */
  done: boolean;
  ok?: boolean;
}

type TxStatusListener = (e: TxStatusEvent) => void;

const listeners = new Set<TxStatusListener>();

export function subscribeTxStatus(fn: TxStatusListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitTxStatus(e: TxStatusEvent): void {
  for (const fn of listeners) fn(e);
}
