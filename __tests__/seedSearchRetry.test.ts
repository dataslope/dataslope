import { afterEach, describe, expect, it, vi } from "vitest";
import { __testing } from "../scripts/seed-search.mjs";

// The search re-seed runs last in the production deploy command, after the
// Worker has shipped, so a D1 that resets mid-import fails the whole build
// over an index that will simply be rebuilt next time. `applySeed` retries
// that family and only that family.

const { applySeed, retryReason, APPLY_ATTEMPTS } = __testing as {
  applySeed: (opts: { run: () => string; sleep: (ms: number) => void }) => void;
  retryReason: (output: unknown) => string | null;
  APPLY_ATTEMPTS: number;
};

/** An `execFileSync` failure: the two streams are separate properties, and
 *  which one carries the message is the point of several tests below. */
function execFailure({ stdout = "", stderr = "" }: { stdout?: string; stderr?: string }) {
  return Object.assign(new Error("Command failed: npx wrangler d1 execute"), {
    status: 1,
    stdout,
    stderr,
  });
}

/** The banner wrangler had already printed to stdout when the real 2026-08-26
 *  production deploy died — no error text in it at all. */
const BANNER =
  "\n ⛅️ wrangler 4.119.0\n🌀 Executing on remote database dataslope-search:\n" +
  "├ Checking if file needs uploading\n│ 🌀 Uploading complete.\n";

afterEach(() => {
  vi.restoreAllMocks();
});

function silenced() {
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("retryReason", () => {
  it("recognises the reset D1 returns from a broken import", () => {
    expect(retryReason('✘ [ERROR] {"D1_RESET_DO":true}')).toBeTruthy();
    expect(retryReason("Internal error in D1 DB storage caused object to be reset.")).toBeTruthy();
    expect(retryReason("D1 DB is overloaded. Too many requests queued.")).toBeTruthy();
    expect(retryReason("Network connection lost.")).toBeTruthy();
  });

  it("refuses to retry a limit, even though another attempt would look the same", () => {
    expect(retryReason("Exceeded maximum DB size.")).toBeNull();
    expect(retryReason("Your account has exceeded D1's free tier daily row write limit.")).toBeNull();
  });

  it("refuses to retry an ordinary failure", () => {
    expect(retryReason("Error: near \"INSRT\": syntax error")).toBeNull();
    expect(retryReason("")).toBeNull();
    expect(retryReason(undefined)).toBeNull();
  });

  it("is case-insensitive, since the code and the prose spell it differently", () => {
    expect(retryReason('{"d1_reset_do":true}')).toBeTruthy();
    expect(retryReason('{"D1_RESET_DO":true}')).toBeTruthy();
  });
});

describe("applySeed", () => {
  it("retries a reset and returns once an attempt succeeds", () => {
    silenced();
    const run = vi
      .fn()
      .mockImplementationOnce(() => {
        throw execFailure({ stdout: BANNER, stderr: '✘ [ERROR] {"D1_RESET_DO":true}' });
      })
      .mockReturnValueOnce("🚣 Executed 285 queries");
    const sleep = vi.fn();

    expect(() => applySeed({ run, sleep })).not.toThrow();
    expect(run).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  // The regression this whole change exists for: wrangler printed the banner
  // to stdout and `D1_RESET_DO` to stderr, and the old code inherited stderr,
  // so the reason was never visible to the process that had to decide.
  it("reads the reason from stderr, which carries it and stdout does not", () => {
    silenced();
    const run = vi.fn().mockImplementation(() => {
      throw execFailure({ stdout: BANNER, stderr: '✘ [ERROR] {"D1_RESET_DO":true}' });
    });

    expect(() => applySeed({ run, sleep: vi.fn() })).toThrow();
    expect(run).toHaveBeenCalledTimes(APPLY_ATTEMPTS);
  });

  it("gives up after the attempt cap and rethrows the last failure", () => {
    silenced();
    const run = vi.fn().mockImplementation(() => {
      throw execFailure({ stderr: '✘ [ERROR] {"D1_RESET_DO":true}' });
    });

    expect(() => applySeed({ run, sleep: vi.fn() })).toThrow(/Command failed/);
    expect(run).toHaveBeenCalledTimes(APPLY_ATTEMPTS);
  });

  it("does not retry a failure that would fail the same way again", () => {
    silenced();
    const run = vi.fn().mockImplementation(() => {
      throw execFailure({ stderr: 'Error: near "INSRT": syntax error' });
    });
    const sleep = vi.fn();

    expect(() => applySeed({ run, sleep })).toThrow(/Command failed/);
    expect(run).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("backs off longer on each successive reset", () => {
    silenced();
    const run = vi.fn().mockImplementation(() => {
      throw execFailure({ stderr: "D1 DB storage operation exceeded timeout, object was reset" });
    });
    const sleep = vi.fn();

    expect(() => applySeed({ run, sleep })).toThrow();
    const waits = sleep.mock.calls.map(([ms]) => ms as number);
    expect(waits).toHaveLength(APPLY_ATTEMPTS - 1);
    expect(waits).toEqual([...waits].sort((a, b) => a - b));
    expect(waits[0]).toBeGreaterThan(0);
  });

  it("runs once and sleeps not at all when the first attempt works", () => {
    silenced();
    const run = vi.fn().mockReturnValue("🚣 Executed 285 queries");
    const sleep = vi.fn();

    applySeed({ run, sleep });
    expect(run).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
