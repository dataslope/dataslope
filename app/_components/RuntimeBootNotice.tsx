"use client";

/**
 * RuntimeBootNotice — the first-execution loading affordance shared by
 * <CodeBlock> and <ChallengeCard>.
 *
 * Shown while a runtime is downloading / instantiating on the first Run
 * (or Check Answer), so a multi-second cold start reads as "setting up"
 * rather than "broken". It pairs the brand assemble-and-quarter-turn
 * loader with a staged status line, a first-run size hint, and a
 * determinate progress bar driven by the adapter's coarse boot
 * fractions (see runtimeRegistry's progress hub + useCreepingBootFraction).
 *
 * Presentational and self-contained (it carries its own theme tokens),
 * so it renders identically embedded in a block and standalone in the
 * /learn/runtime-loading-states showcase.
 */

import { useEffect, useState, type ReactNode } from "react";
import { DiamondAssembleTurnLoader } from "./mdx/loadingAnimations";
import styles from "./RuntimeBootNotice.module.css";

export interface RuntimeBootNoticeProps {
  /** Display language name, e.g. "Python". Used in the default copy. */
  language: string;
  /** Current stage line from the adapter; falls back to a generic
   *  "Setting up the <language> runtime…" when empty. */
  statusMessage?: string;
  /** True while a first-run (cold) download is in flight — adds the
   *  "downloads once" reassurance and the size hint. */
  cold?: boolean;
  /** Approximate cold download size in MB (adapter.coldDownloadMB). */
  downloadMB?: number;
  /** Smoothed boot fraction in 0..1, or null for an indeterminate boot
   *  (loader + copy only, no bar). */
  fraction?: number | null;
  /** Forwarded to the root for e2e selectors. */
  testId?: string;
}

export function RuntimeBootNotice({
  language,
  statusMessage,
  cold = false,
  downloadMB,
  fraction = null,
  testId,
}: RuntimeBootNoticeProps) {
  const title = statusMessage || `Setting up the ${language} runtime…`;
  const pct =
    fraction == null
      ? null
      : Math.round(Math.max(0, Math.min(1, fraction)) * 100);

  return (
    <div className={styles.notice} data-testid={testId}>
      <span className={styles.loader} aria-hidden>
        <DiamondAssembleTurnLoader size={46} label="" />
      </span>
      <div className={styles.body}>
        {/* `key` re-triggers the cross-fade when the stage line changes. */}
        <span className={styles.title} key={title}>
          {title}
        </span>
        {cold && (
          <span className={styles.hint}>
            Downloading the {language} runtime
            {downloadMB ? ` (~${downloadMB} MB)` : ""} — this happens once;
            later runs are instant.
          </span>
        )}
        {pct != null && (
          <div className={styles.progress}>
            <div
              className={styles.bar}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-label={title}
            >
              <div className={styles.barFill} style={{ width: `${pct}%` }} />
            </div>
            <span className={styles.pct}>{pct}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── /learn showcase ───────────────────────────────────────────────────
// Renders the notice in representative states with the JSX that produces
// each, so the loading display can be reviewed without waiting on a real
// cold boot. Registered as an MDX component (`RuntimeLoadingStates`).

interface ShowcaseItem {
  title: string;
  blurb: string;
  jsx: string;
  node: ReactNode;
}

/** A live boot simulation: cycles a fraction 0 → ~0.97 across a few
 *  staged messages, then loops, so the moving bar + loader can be seen
 *  in motion. Mirrors what the real components feed the notice. */
function SimulatedBoot() {
  const stages: Array<{ at: number; message: string }> = [
    { at: 0.04, message: "Starting Python worker…" },
    { at: 0.2, message: "Loading Pyodide…" },
    { at: 0.55, message: "Preparing the Python environment…" },
    { at: 0.82, message: "Installing the data packages…" },
  ];
  const [fraction, setFraction] = useState(0.04);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setFraction((f) => (f >= 0.97 ? 0.04 : Math.min(0.97, f + 0.03)));
    }, 220);
    return () => window.clearInterval(tick);
  }, []);

  const message =
    [...stages].reverse().find((s) => fraction >= s.at)?.message ??
    stages[0].message;

  return (
    <RuntimeBootNotice
      language="Python"
      statusMessage={message}
      cold
      downloadMB={6}
      fraction={fraction}
    />
  );
}

function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  return (
    <section className={styles.showcaseCard}>
      <div className={styles.showcasePreview}>{item.node}</div>
      <div className={styles.showcaseMeta}>
        <h3 className={styles.showcaseTitle}>{item.title}</h3>
        <p className={styles.showcaseBlurb}>{item.blurb}</p>
        <pre className={styles.showcaseCode}>
          <code>{item.jsx}</code>
        </pre>
      </div>
    </section>
  );
}

export default function RuntimeLoadingStates() {
  const items: ShowcaseItem[] = [
    {
      title: "Live boot (simulated)",
      blurb:
        "What a learner sees on a first Run: the assemble-and-quarter-turn mark, the current stage, the one-time size hint, and a determinate bar that creeps between stages.",
      jsx: `<RuntimeBootNotice
  language="Python"
  statusMessage="Loading Pyodide…"
  cold
  downloadMB={6}
  fraction={0.42}
/>`,
      node: <SimulatedBoot />,
    },
    {
      title: "Cold start — just begun",
      blurb:
        "The first stage floor: the worker has started and the runtime download is about to stream in.",
      jsx: `<RuntimeBootNotice
  language="Python"
  statusMessage="Starting Python worker…"
  cold
  downloadMB={6}
  fraction={0.05}
/>`,
      node: (
        <RuntimeBootNotice
          language="Python"
          statusMessage="Starting Python worker…"
          cold
          downloadMB={6}
          fraction={0.05}
        />
      ),
    },
    {
      title: "Cold start — downloading",
      blurb:
        "Mid-download. The bar shows real position; the percentage is derived from the adapter's stage weights.",
      jsx: `<RuntimeBootNotice
  language="R"
  statusMessage="Initialising R runtime…"
  cold
  downloadMB={15}
  fraction={0.55}
/>`,
      node: (
        <RuntimeBootNotice
          language="R"
          statusMessage="Initialising R runtime…"
          cold
          downloadMB={15}
          fraction={0.55}
        />
      ),
    },
    {
      title: "Cold start — finishing",
      blurb:
        "Near the end (the bar never hits 100% — the notice unmounts the moment the runtime is ready).",
      jsx: `<RuntimeBootNotice
  language="C#"
  statusMessage="Loading Roslyn (C# scripting engine)…"
  cold
  downloadMB={35}
  fraction={0.9}
/>`,
      node: (
        <RuntimeBootNotice
          language="C#"
          statusMessage="Loading Roslyn (C# scripting engine)…"
          cold
          downloadMB={35}
          fraction={0.9}
        />
      ),
    },
    {
      title: "Warm start (no download)",
      blurb:
        "When the runtime is already warm (a prior block booted it, or the route-land warm-up finished), there is no size hint and the wait is brief.",
      jsx: `<RuntimeBootNotice
  language="Python"
  statusMessage="Initialising runtime…"
/>`,
      node: (
        <RuntimeBootNotice
          language="Python"
          statusMessage="Initialising runtime…"
        />
      ),
    },
    {
      title: "Mid-run package install",
      blurb:
        "Two-phase Pyodide: a stdlib-only block runs immediately, but the first block that imports pandas waits here while the data stack finishes downloading.",
      jsx: `<RuntimeBootNotice
  language="Python"
  statusMessage="Installing the Python data packages — first run only…"
  cold
  fraction={0.7}
/>`,
      node: (
        <RuntimeBootNotice
          language="Python"
          statusMessage="Installing the Python data packages — first run only…"
          cold
          fraction={0.7}
        />
      ),
    },
  ];

  return (
    <div className={`not-prose ${styles.showcase}`}>
      {items.map((item) => (
        <ShowcaseCard key={item.title} item={item} />
      ))}
    </div>
  );
}
