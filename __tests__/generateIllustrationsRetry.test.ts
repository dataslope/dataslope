import { afterEach, describe, expect, it, vi } from "vitest";
import * as gen from "../scripts/generate-illustrations.mjs";

// The batch generator fetches each job's output through a proxy that once
// 504'd AFTER the images were generated and billed. `api` retries transient
// failures only where a caller opts in: the same helper creates batches and
// submits generations, and re-sending those would double the bill.

const apiFor = gen.__testing as {
  api: (
    path: string,
    opts: { method?: string; key?: string; json?: unknown; retries?: number },
  ) => Promise<Response>;
};

function response(status: number, body = ""): Response {
  return new Response(body, { status, statusText: `status ${status}` });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Run `fn` with sleeps collapsed, so backoff does not slow the suite. */
async function withoutWaiting<T>(fn: () => Promise<T>): Promise<T> {
  vi.useFakeTimers();
  // Settle into a result object *before* pumping the clock. Awaiting the raw
  // promise only after the loop leaves a window where a rejection is unhandled,
  // which Node reports as an error even though the test itself passes.
  const settled = fn().then(
    (value) => ({ ok: true as const, value }),
    (error) => ({ ok: false as const, error }),
  );
  for (let i = 0; i < 20; i++) {
    await vi.advanceTimersByTimeAsync(60_000);
  }
  const result = await settled;
  if (!result.ok) throw result.error;
  return result.value;
}

describe("api retry behaviour", () => {
  it("retries a transient 504 and returns the eventual success", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(504))
      .mockResolvedValueOnce(response(502))
      .mockResolvedValueOnce(response(200, "ok"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await withoutWaiting(() =>
      apiFor.api("/files/file-x/content", { key: "k", retries: 5 }),
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries a network error, not just an HTTP status", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce(response(200, "ok"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await withoutWaiting(() =>
      apiFor.api("/batches/b1", { key: "k", retries: 3 }),
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry when the caller did not opt in", async () => {
    // The default path covers batch creation and image generation: retrying
    // those would duplicate paid work, so one attempt is the contract.
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response(504));

    await expect(apiFor.api("/batches", { method: "POST", key: "k", json: {} })).rejects.toThrow(
      /504/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry a non-transient status even with retries available", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response(400, "bad request"));

    await expect(
      apiFor.api("/files/file-x/content", { key: "k", retries: 5 }),
    ).rejects.toThrow(/400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after the retry budget and surfaces the last failure", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response(503));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      withoutWaiting(() => apiFor.api("/files/file-x/content", { key: "k", retries: 2 })),
    ).rejects.toThrow(/503/);
    // Initial attempt plus two retries.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
