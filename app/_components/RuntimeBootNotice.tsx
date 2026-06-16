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
import { Play, RotateCcw } from "lucide-react";
import { DiamondAssembleTurnLoader } from "./mdx/loadingAnimations";
import { CopyIcon, FormatIcon } from "./challengeShared";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "./languageIcons";
import styles from "./RuntimeBootNotice.module.css";
import challengeStyles from "./ChallengeCard.module.css";
import codeBlockStyles from "./CodeBlock.module.css";

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
  /** Compiled languages (Java, C, C++, C#). No longer changes the boot
   *  copy — every runtime now reads "much faster" — but kept so existing
   *  call sites still type-check. */
  compiled?: boolean;
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
          <>
            <span className={styles.hint}>
              This can take a moment on first load
            </span>
            <span className={styles.hint}>
              {downloadMB ? `Downloading (~${downloadMB} MB) — ` : ""}This
              happens once. Later runs are much faster.
            </span>
          </>
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

// ─── Code-block layout preview ─────────────────────────────────────────
// A static, non-interactive mock of a <CodeBlock> frozen in its loading
// state — the real card chrome (header, editor, action bar, output
// panel) reused via the shared CSS modules, with a faux editor instead
// of a live CodeMirror instance. Lets the loading display be reviewed in
// context without booting a runtime (and without the route-land warm-up
// racing the screenshot).

function PreviewLanguageGlyph({
  langId,
  logoText,
}: {
  langId: string;
  logoText: string;
}) {
  const Icon = LANGUAGE_ICONS[langId];
  const factor = LANGUAGE_ICON_SIZE_FACTOR[langId] ?? 1;
  if (!Icon) return <span aria-hidden>{logoText}</span>;
  return (
    <Icon
      style={{
        width: `${Math.round(14 * factor)}px`,
        height: `${Math.round(14 * factor)}px`,
      }}
      aria-hidden
    />
  );
}

export interface CodeBlockLoadingPreviewProps
  extends Omit<RuntimeBootNoticeProps, "testId"> {
  /** Runtime version shown beside the language in the header. */
  version: string;
  /** Adapter id used for the header glyph (e.g. "python"). */
  langId?: string;
  /** Two-character fallback used when no glyph icon exists. */
  logoText?: string;
  /** Faux editor contents (purely visual — no editing or execution). */
  code: string;
}

export function CodeBlockLoadingPreview({
  language,
  version,
  langId = "python",
  logoText = language.slice(0, 2).toLowerCase(),
  code,
  statusMessage,
  cold = false,
  downloadMB,
  compiled = false,
  fraction = null,
}: CodeBlockLoadingPreviewProps) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div
      className={`${challengeStyles.card} ${codeBlockStyles.outputScope}`}
      aria-label={`${language} code block (loading preview)`}
    >
      <div className={challengeStyles.header}>
        <div className={challengeStyles.headerRow}>
          <div className={challengeStyles.badge}>
            <Play size={9} aria-hidden /> Code Block
          </div>
          <div className={challengeStyles.headerMeta}>
            <span className={challengeStyles.headerRuntimeLabel}>
              <PreviewLanguageGlyph langId={langId} logoText={logoText} />
              {language} {version}
            </span>
            <span
              className={challengeStyles.statusDot}
              data-status="loading"
              aria-label="loading"
            />
          </div>
        </div>
      </div>

      {/* Faux editor — a styled code listing in place of CodeMirror. */}
      <div className={`${challengeStyles.editor} ${challengeStyles.topBorderLight}`}>
        <div className={styles.previewEditor} aria-hidden>
          {lines.map((line, i) => (
            <div className={styles.previewLine} key={i}>
              <span className={styles.previewGutter}>{i + 1}</span>
              <span className={styles.previewCode}>{line || " "}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={challengeStyles.actionBar} role="toolbar" aria-label="Code block actions">
        <div className={challengeStyles.btnGroupPrimary}>
          <button
            type="button"
            className={challengeStyles.runBtn}
            disabled
            aria-label="Run code"
          >
            <svg
              viewBox="0 0 12 12"
              className={challengeStyles.runBtnSpinner}
              aria-hidden
            >
              <circle
                cx="6"
                cy="6"
                r="4.5"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="14 8"
              />
            </svg>
            <span className={challengeStyles.runBtnLabel}>Loading…</span>
          </button>
        </div>
        <div className={challengeStyles.btnGroupUtil}>
          {statusMessage && (
            <span
              className={challengeStyles.actionBarStatus}
              data-status="loading"
            >
              {statusMessage}
            </span>
          )}
          <button type="button" className={challengeStyles.utilBtn} disabled>
            <RotateCcw size={12} strokeWidth={2.4} aria-hidden />
            <span className={challengeStyles.utilBtnLabel}>Reset</span>
          </button>
          <div className={challengeStyles.btnGroupUtilSep} aria-hidden />
          <button type="button" className={challengeStyles.utilBtn} disabled>
            <FormatIcon />
            <span className={challengeStyles.utilBtnLabel}>Format</span>
          </button>
          <div className={challengeStyles.btnGroupUtilSep} aria-hidden />
          <button type="button" className={challengeStyles.copyBtn} disabled>
            <CopyIcon />
          </button>
        </div>
      </div>

      {/* No "Output" header while loading — matches the real block,
          which hides it until user code actually runs. */}
      <div
        className={`${challengeStyles.outputPanel} ${codeBlockStyles.outputRunning}`}
      >
        <div className={codeBlockStyles.bootNoticeWrap}>
          <RuntimeBootNotice
            language={language}
            statusMessage={statusMessage}
            cold={cold}
            downloadMB={downloadMB}
            compiled={compiled}
            fraction={fraction}
          />
        </div>
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

const SAMPLE_CODE = `import pandas as pd

penguins = pd.read_csv("penguins.csv")
by_species = penguins.groupby("species")["body_mass_g"].mean()
print(by_species.round(1))`;

/** A live boot simulation: cycles a fraction 0 → ~0.97 across a few
 *  staged messages, then loops, so the moving bar + loader can be seen
 *  in motion inside the real code-block layout. Mirrors exactly what the
 *  components feed the notice during a cold Pyodide boot. */
function SimulatedCodeBlock() {
  const stages: Array<{ at: number; message: string }> = [
    { at: 0.04, message: "Starting Python runtime…" },
    { at: 0.2, message: "Loading Python runtime…" },
    { at: 0.55, message: "Preparing the Python environment…" },
    { at: 0.82, message: "Installing data packages…" },
  ];
  const [fraction, setFraction] = useState(0.04);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setFraction((f) => (f >= 0.97 ? 0.04 : Math.min(0.97, f + 0.025)));
    }, 220);
    return () => window.clearInterval(tick);
  }, []);

  const message =
    [...stages].reverse().find((s) => fraction >= s.at)?.message ??
    stages[0].message;

  return (
    <CodeBlockLoadingPreview
      language="Python"
      version="3.13.2"
      langId="python"
      code={SAMPLE_CODE}
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

export type RuntimeLoadingSection = "code-block" | "notice";

/** Code-block-layout previews: the loading display shown in context, in
 *  the real card chrome. */
function codeBlockItems(): ShowcaseItem[] {
  return [
    {
      title: "Live boot, in a code block (simulated)",
      blurb:
        "Exactly what a learner sees on a first Run — the full code-block card frozen in its loading state: a disabled Run button, the staged status beside it, and the boot notice in the output panel. The loader and bar are animating; the rest is a static preview (no runtime).",
      jsx: `<CodeBlockLoadingPreview
  language="Python"
  version="3.13.2"
  code={pandasSnippet}
  statusMessage="Loading Python runtime…"
  cold
  downloadMB={6}
  fraction={0.42}
/>`,
      node: <SimulatedCodeBlock />,
    },
    {
      title: "Cold start, in a code block",
      blurb:
        "A fresh page: the worker has started and the runtime is downloading. The output panel hosts the same notice the live block renders.",
      jsx: `<CodeBlockLoadingPreview
  language="Python"
  version="3.13.2"
  code={pandasSnippet}
  statusMessage="Starting Python runtime…"
  cold
  downloadMB={6}
  fraction={0.06}
/>`,
      node: (
        <CodeBlockLoadingPreview
          language="Python"
          version="3.13.2"
          langId="python"
          code={SAMPLE_CODE}
          statusMessage="Starting Python runtime…"
          cold
          downloadMB={6}
          fraction={0.06}
        />
      ),
    },
    {
      title: "Mid-run package install, in a code block",
      blurb:
        "Two-phase Pyodide: a stdlib-only block runs immediately, but the first block that imports pandas pauses here while the data stack finishes downloading.",
      jsx: `<CodeBlockLoadingPreview
  language="Python"
  version="3.13.2"
  code={pandasSnippet}
  statusMessage="Installing data packages — first run only…"
  cold
  fraction={0.7}
/>`,
      node: (
        <CodeBlockLoadingPreview
          language="Python"
          version="3.13.2"
          langId="python"
          code={SAMPLE_CODE}
          statusMessage="Installing data packages — first run only…"
          cold
          fraction={0.7}
        />
      ),
    },
  ];
}

/** The notice on its own, across representative states. */
function noticeItems(): ShowcaseItem[] {
  return [
    {
      title: "Cold start — just begun",
      blurb:
        "The first stage floor: the worker has started and the runtime download is about to stream in.",
      jsx: `<RuntimeBootNotice
  language="Python"
  statusMessage="Starting Python runtime…"
  cold
  downloadMB={6}
  fraction={0.05}
/>`,
      node: (
        <RuntimeBootNotice
          language="Python"
          statusMessage="Starting Python runtime…"
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
      title: "Cold start — finishing (compiled language)",
      blurb:
        "Near the end (the bar never hits 100% — the notice unmounts the moment the runtime is ready). The boot copy promises that later runs are much faster for every runtime.",
      jsx: `<RuntimeBootNotice
  language="C#"
  statusMessage="Preparing C# compiler…"
  cold
  downloadMB={35}
  compiled
  fraction={0.9}
/>`,
      node: (
        <RuntimeBootNotice
          language="C#"
          statusMessage="Preparing C# compiler…"
          cold
          downloadMB={35}
          compiled
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
  ];
}

export default function RuntimeLoadingStates({
  section = "code-block",
}: {
  section?: RuntimeLoadingSection;
}) {
  const items = section === "notice" ? noticeItems() : codeBlockItems();
  return (
    <div className={`not-prose ${styles.showcase}`}>
      {items.map((item) => (
        <ShowcaseCard key={item.title} item={item} />
      ))}
    </div>
  );
}
