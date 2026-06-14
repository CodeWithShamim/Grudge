import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Safety test for the studionet-only auto-fund. sim_fundAccount mints
 * simulated GEN and must be impossible on Bradbury (real testnet funds).
 */

const ORIGINAL = process.env.NEXT_PUBLIC_NETWORK;

afterEach(() => {
  process.env.NEXT_PUBLIC_NETWORK = ORIGINAL;
  vi.restoreAllMocks();
  vi.resetModules();
});

async function loadFund() {
  vi.resetModules();
  return import("@/lib/chain/fund");
}

describe("ensureFunded", () => {
  it("is a no-op on bradbury and never calls the RPC", async () => {
    process.env.NEXT_PUBLIC_NETWORK = "bradbury";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { ensureFunded } = await loadFund();

    const result = await ensureFunded("0x1234567890abcdef1234567890abcdef12345678");

    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("assertNoFundOnBradbury throws on bradbury", async () => {
    process.env.NEXT_PUBLIC_NETWORK = "bradbury";
    const { assertNoFundOnBradbury } = await loadFund();
    expect(() => assertNoFundOnBradbury()).toThrow(/forbidden on Bradbury/i);
  });

  it("funds when balance is zero (checks balance first)", async () => {
    process.env.NEXT_PUBLIC_NETWORK = "studionet";
    process.env.NEXT_PUBLIC_STUDIO_RPC = "https://studio.example/api";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const method = JSON.parse((init as RequestInit).body as string).method;
      if (method === "eth_getBalance") return new Response(JSON.stringify({ result: "0x0" }));
      return new Response(JSON.stringify({ result: "0xok" }));
    });
    const { ensureFunded } = await loadFund();

    const result = await ensureFunded("0x1234567890abcdef1234567890abcdef12345678");

    expect(result).toBe(true);
    // first call checks balance, second funds
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const fundBody = JSON.parse((fetchSpy.mock.calls[1]![1] as RequestInit).body as string);
    expect(fundBody.method).toBe("sim_fundAccount");
    // the amount MUST be a JSON number, not a string
    expect(typeof fundBody.params[1]).toBe("number");
  });

  it("does NOT re-fund when the account already has GEN", async () => {
    process.env.NEXT_PUBLIC_NETWORK = "studionet";
    process.env.NEXT_PUBLIC_STUDIO_RPC = "https://studio.example/api";
    // 5 GEN balance (well above the 1 GEN threshold)
    const fiveGen = "0x" + (5n * 10n ** 18n).toString(16);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ result: fiveGen })));
    const { ensureFunded } = await loadFund();

    const result = await ensureFunded("0x1234567890abcdef1234567890abcdef12345678");

    expect(result).toBe(false); // no fund happened
    expect(fetchSpy).toHaveBeenCalledOnce(); // only the balance check, no fund
    const onlyCall = JSON.parse((fetchSpy.mock.calls[0]![1] as RequestInit).body as string);
    expect(onlyCall.method).toBe("eth_getBalance");
  });
});
