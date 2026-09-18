/**
 * Presentational pieces shared by the desktop and mobile challenge layouts.
 *
 * Both layouts render from the same state (see `ChallengeWorkspace`), so
 * anything that shows the same content in both lives here and takes a
 * `mobile` flag only where the two genuinely differ — the schema browser
 * (always open vs. collapsible) and a handful of type scales.
 */

import { Fragment } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Lock,
  Table2,
  XCircle,
} from "lucide-react";
import {
  DIFFICULTY_BARS,
  type Challenge,
  type CodeLanguage,
  type Difficulty,
  type InstructionBlock,
  type OutputPanel,
  type SchemaTable,
  type SolutionPanel,
  type Span,
  type TableColumn,
  type TestCase,
} from "@/lib/challengeCatalog";
import { highlight, type TokenKind } from "./highlight";
import s from "./ChallengeWorkspace.module.css";

const TOKEN_CLASS: Record<TokenKind, string | undefined> = {
  plain: undefined,
  keyword: s.tokKeyword,
  builtin: s.tokBuiltin,
  string: s.tokString,
  number: s.tokNumber,
  comment: s.tokComment,
};

// ─── Code ────────────────────────────────────────────────────────────

/** Highlighted source with a line-number gutter. */
export function CodeView({
  source,
  language,
  muted,
  mobile,
}: {
  source: string;
  language: CodeLanguage;
  muted?: boolean;
  mobile?: boolean;
}) {
  const lines = highlight(source, language);
  return (
    <div className={mobile ? `${s.code} ${s.mCode}` : s.code}>
      <div className={s.gutter} aria-hidden="true">
        {lines.map((_, i) => (
          <span key={i}>{i + 1}</span>
        ))}
      </div>
      <pre className={muted ? `${s.codePre} ${s.codePreMuted}` : s.codePre}>
        {lines.map((tokens, i) => (
          <Fragment key={i}>
            {tokens.map((token, j) => {
              const cls = TOKEN_CLASS[token.kind];
              return cls ? (
                <span key={j} className={cls}>
                  {token.text}
                </span>
              ) : (
                <Fragment key={j}>{token.text}</Fragment>
              );
            })}
            {/* Keeps a blank line's height so the gutter stays aligned. */}
            {tokens.length === 0 ? " " : null}
            {i < lines.length - 1 ? "\n" : null}
          </Fragment>
        ))}
      </pre>
    </div>
  );
}

/** Highlighted source with no gutter, for the reference solution. */
export function CodeBlock({
  source,
  language,
  className,
}: {
  source: string;
  language: CodeLanguage;
  className: string;
}) {
  const lines = highlight(source, language);
  return (
    <pre className={className}>
      {lines.map((tokens, i) => (
        <Fragment key={i}>
          {tokens.map((token, j) => {
            const cls = TOKEN_CLASS[token.kind];
            return cls ? (
              <span key={j} className={cls}>
                {token.text}
              </span>
            ) : (
              <Fragment key={j}>{token.text}</Fragment>
            );
          })}
          {i < lines.length - 1 ? "\n" : null}
        </Fragment>
      ))}
    </pre>
  );
}

// ─── Prose ───────────────────────────────────────────────────────────

export function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((span, i) =>
        typeof span === "string" ? (
          <Fragment key={i}>{span}</Fragment>
        ) : (
          <code key={i} className={s.inlineCode}>
            {span.code}
          </code>
        ),
      )}
    </>
  );
}

// ─── Difficulty meter ────────────────────────────────────────────────

export function DifficultyMeter({
  difficulty,
  mobile,
}: {
  difficulty: Difficulty;
  mobile?: boolean;
}) {
  const filled = DIFFICULTY_BARS[difficulty];
  return (
    <span className={s.meter} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={[mobile ? s.mBar : s.bar, i < filled ? s.barOn : ""]
            .filter(Boolean)
            .join(" ")}
        />
      ))}
    </span>
  );
}

// ─── Instruction blocks ──────────────────────────────────────────────

export function InstructionBlocks({
  blocks,
  signature,
  onBack,
}: {
  blocks: InstructionBlock[];
  /** Active language's signature, for the `signature` block. */
  signature?: string;
  /** Sends the learner back to the step they can actually work on. */
  onBack: (stepNumber: number) => void;
}) {
  return (
    <>
      {blocks.map((block, i) => (
        <InstructionBlockView
          key={i}
          block={block}
          signature={signature}
          onBack={onBack}
        />
      ))}
    </>
  );
}

function InstructionBlockView({
  block,
  signature,
  onBack,
}: {
  block: InstructionBlock;
  signature?: string;
  onBack: (stepNumber: number) => void;
}) {
  switch (block.kind) {
    case "banner":
      return (
        <div className={s.banner}>
          <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
          {block.text}
        </div>
      );

    case "status":
      return (
        <div className={s.status}>
          <span className={s.statusDot} aria-hidden="true" />
          {block.text}
        </div>
      );

    case "heading":
      return <h2 className={s.blockHeading}>{block.text}</h2>;

    case "prose":
      return (
        <p className={s.prose}>
          <Spans spans={block.spans} />
        </p>
      );

    case "label":
      return <h3 className={s.blockLabel}>{block.text}</h3>;

    case "columns":
      return (
        <div className={s.card}>
          <div className={s.columnsHead}>
            <span>Column</span>
            <span>Type</span>
          </div>
          {block.rows.map((row) => (
            <div key={row.name} className={s.columnsRow}>
              <span>{row.name}</span>
              <span className={s.columnsType}>{row.type}</span>
            </div>
          ))}
        </div>
      );

    case "table":
      return (
        <div className={s.cardScroll}>
          <table className={s.previewTable}>
            <thead>
              <tr>
                {block.columns.map((col) => (
                  <th
                    key={col.key}
                    className={col.align === "right" ? s.alignRight : undefined}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {block.columns.map((col) => (
                    <td
                      key={col.key}
                      className={
                        col.align === "right" ? s.alignRight : undefined
                      }
                    >
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "code":
      return (
        <CodeBlock
          source={block.source}
          language={block.language}
          className={s.signatureBlock}
        />
      );

    case "signature":
      return signature ? <pre className={s.signatureBlock}>{signature}</pre> : null;

    case "examples":
      return (
        <div className={s.exampleList}>
          {block.items.map((item) => (
            <div key={item.label} className={s.schemaCard}>
              <div className={s.cardHead}>{item.label}</div>
              <div className={s.exampleGrid}>
                {item.fields.map((field) => (
                  <Fragment key={field.name}>
                    <span className={s.exampleName}>{field.name}</span>
                    <span
                      className={[
                        s.exampleValue,
                        field.emphasis ? s.exampleEmphasis : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {field.value}
                    </span>
                  </Fragment>
                ))}
              </div>
              {item.note ? <p className={s.exampleNote}>{item.note}</p> : null}
            </div>
          ))}
        </div>
      );

    case "list":
      return (
        <ul className={s.constraints}>
          {block.items.map((spans, i) => (
            <li key={i}>
              <Spans spans={spans} />
            </li>
          ))}
        </ul>
      );

    case "locked":
      return (
        <div className={s.lockedCard}>
          <Lock size={18} strokeWidth={2} aria-hidden="true" color="var(--cw-text-faint)" />
          <h2 className={s.lockedTitle}>{block.title}</h2>
          <p className={s.lockedText}>{block.text}</p>
          <button
            type="button"
            className={s.secondaryBtn}
            onClick={() => onBack(block.backTo)}
          >
            {block.backLabel}
          </button>
        </div>
      );
  }
}

// ─── Schema browser ──────────────────────────────────────────────────

/** Desktop schema: every table expanded, since the pane has the room. */
export function SchemaList({ tables }: { tables: SchemaTable[] }) {
  return (
    <div className={s.schemaList}>
      {tables.map((table) => (
        <div key={table.name} className={s.schemaCard}>
          <div className={s.schemaHead}>
            <span className={s.schemaName}>
              <Table2 size={13} strokeWidth={2} aria-hidden="true" />
              {table.name}
            </span>
            <span className={s.schemaRows}>{table.rows} rows</span>
          </div>
          <div className={s.schemaCols}>
            {table.columns.map((col) => (
              <span key={col.name} className={s.schemaCol}>
                <span>
                  {col.name}
                  {col.key ? <span className={s.schemaKey}> {col.key}</span> : null}
                </span>
                <span className={s.schemaType}>{col.type}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Mobile schema: collapsed by default so the tables don't bury the prose. */
export function SchemaAccordion({
  tables,
  openTable,
  onToggle,
}: {
  tables: SchemaTable[];
  openTable: string | null;
  onToggle: (name: string) => void;
}) {
  return (
    <div className={s.schemaList}>
      {tables.map((table) => {
        const open = openTable === table.name;
        return (
          <div key={table.name} className={s.schemaCard}>
            <button
              type="button"
              className={`${s.schemaHead} ${s.schemaToggle}`}
              onClick={() => onToggle(table.name)}
              aria-expanded={open}
            >
              <span className={s.schemaName}>
                <Table2 size={13} strokeWidth={2} aria-hidden="true" />
                {table.name}
              </span>
              <span className={s.schemaRows}>
                {table.rows}
                <ChevronDown
                  size={14}
                  strokeWidth={2}
                  aria-hidden="true"
                  className={[s.schemaCaret, open ? s.schemaCaretOpen : ""]
                    .filter(Boolean)
                    .join(" ")}
                />
              </span>
            </button>
            {open ? (
              <div className={`${s.schemaCols} ${s.schemaColsOpen}`}>
                {table.columns.map((col) => (
                  <span key={col.name} className={s.schemaCol}>
                    <span>{col.name}</span>
                    <span className={s.schemaType}>{col.type}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ─── Output ──────────────────────────────────────────────────────────

export function OutputPanelView({
  output,
  mobile,
}: {
  output: OutputPanel;
  mobile?: boolean;
}) {
  if (output.kind === "table") {
    const table = (
      <table className={s.outTable}>
        <thead>
          <tr>
            {output.columns.map((col: TableColumn) => (
              <th
                key={col.key}
                className={col.align === "right" ? s.alignRight : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {output.rows.map((row, i) => (
            <tr key={i}>
              {output.columns.map((col) => (
                <td
                  key={col.key}
                  className={col.align === "right" ? s.alignRight : undefined}
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );

    return (
      <>
        {/* The review pass flagged the phone table clipping at the frame
            edge; it gets its own horizontal scroller. */}
        {mobile ? (
          <div className={`${s.mTableScroll} ${s.noScrollbar}`}>{table}</div>
        ) : (
          table
        )}
        <div className={mobile ? `${s.outFooter} ${s.mOutFooter}` : s.outFooter}>
          <span>{mobile ? output.footer.replace(/^Showing /, "") : output.footer}</span>
          <a className={s.downloadLink} href="#">
            {mobile ? null : <Download size={13} strokeWidth={2} aria-hidden="true" />}
            Download CSV
          </a>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={s.stdioGrid}>
        <div className={s.stdioCell}>
          <div className={s.stdioHead}>
            <span>{output.stdinLabel}</span>
          </div>
          <pre className={s.stdioPre}>{output.stdin}</pre>
        </div>
        <div className={s.stdioCell}>
          <div className={s.stdioHead}>
            <span>stdout</span>
            {output.matchesExpected ? (
              <span className={s.stdioMatch}>
                <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                Matches expected
              </span>
            ) : null}
          </div>
          <pre className={`${s.stdioPre} ${s.stdioPreOut}`}>{output.stdout}</pre>
        </div>
      </div>
      <div className={s.stdioFooter}>
        {output.footer.map((part, i) => (
          <Fragment key={part}>
            {i > 0 ? <span>·</span> : null}
            <span>{part}</span>
          </Fragment>
        ))}
      </div>
    </>
  );
}

// ─── Test cases ──────────────────────────────────────────────────────

export function TestsPanel({
  challenge,
  mobile,
}: {
  challenge: Challenge;
  mobile?: boolean;
}) {
  const allPassed = challenge.tests.every((t) => t.pass);
  return (
    <div className={s.stack}>
      <div className={[s.testBanner, allPassed ? s.testBannerPass : ""].filter(Boolean).join(" ")}>
        {allPassed ? (
          <CheckCircle2 size={15} strokeWidth={2} aria-hidden="true" />
        ) : (
          <XCircle size={15} strokeWidth={2} aria-hidden="true" />
        )}
        <span className={s.testBannerText}>{challenge.testsSummary}</span>
        {!mobile && challenge.testsSubtitle ? (
          <span className={s.testBannerSub}>{challenge.testsSubtitle}</span>
        ) : null}
      </div>
      {challenge.tests.map((test) => (
        <TestRow key={test.name} test={test} mobile={mobile} />
      ))}
    </div>
  );
}

function TestRow({ test, mobile }: { test: TestCase; mobile?: boolean }) {
  return (
    <div className={mobile ? `${s.testRow} ${s.mTestRow}` : s.testRow}>
      {test.pass ? (
        <CheckCircle2
          size={15}
          strokeWidth={2}
          aria-hidden="true"
          className={`${s.testIcon} ${s.testIconPass}`}
        />
      ) : (
        <XCircle
          size={15}
          strokeWidth={2}
          aria-hidden="true"
          className={`${s.testIcon} ${s.testIconFail}`}
        />
      )}
      <div className={s.testText}>
        <span className={s.testName}>{test.name}</span>
        <span className={s.testDetail}>{test.detail}</span>
        {!test.pass && test.got ? (
          <span className={s.testGot}>{test.got}</span>
        ) : null}
      </div>
      {/* The phone drops the redundant badge: the icon already says it, and
          the row needs the width for the detail line. */}
      {mobile ? null : (
        <span
          className={[
            s.testBadge,
            test.pass ? s.testBadgePass : s.testBadgeFail,
          ].join(" ")}
        >
          {test.pass ? "Passed" : "Failed"}
        </span>
      )}
    </div>
  );
}

// ─── Solution ────────────────────────────────────────────────────────

export function SolutionPanelView({ solution }: { solution: SolutionPanel }) {
  return (
    <div className={s.solution}>
      <p className={s.solutionText}>
        <Spans spans={solution.spans} />
      </p>
      <div className={s.solutionCard}>
        <div className={s.solutionHead}>
          <span className={s.solutionLabel}>{solution.label}</span>
          <CopyButton source={solution.source} />
        </div>
        <CodeBlock
          source={solution.source}
          language={solution.language}
          className={s.solutionPre}
        />
      </div>
    </div>
  );
}

function CopyButton({ source }: { source: string }) {
  return (
    <button
      type="button"
      className={s.copyBtn}
      onClick={() => {
        void navigator.clipboard?.writeText(source);
      }}
    >
      <Copy size={12} strokeWidth={2} aria-hidden="true" />
      Copy
    </button>
  );
}

// ─── Submissions ─────────────────────────────────────────────────────

const SUB_HEADINGS: Record<string, string> = {
  step: "Step",
  result: "Result",
  lang: "Language",
  runtime: "Runtime",
  when: "When",
};

/** Track widths per column; `result` takes the remaining space. */
const SUB_WIDTHS: Record<string, string> = {
  step: "80px",
  result: "minmax(0, 1fr)",
  lang: "120px",
  runtime: "90px",
  when: "90px",
};

export function SubmissionsPanel({ challenge }: { challenge: Challenge }) {
  const columns = challenge.submissionColumns;
  // The single-step table has no Step column, so Language needs the wider
  // track that the multi-step layout gives to Step + Language together.
  const template = columns
    .map((c) => (c === "lang" && !columns.includes("step") ? "150px" : SUB_WIDTHS[c]))
    .join(" ");

  return (
    <div className={s.stack}>
      <div className={s.subsHead} style={{ gridTemplateColumns: template }}>
        {columns.map((col) => (
          <span key={col}>{SUB_HEADINGS[col]}</span>
        ))}
      </div>
      {challenge.submissions.map((sub, i) => (
        <div key={i} className={s.subsRow} style={{ gridTemplateColumns: template }}>
          {columns.map((col) => {
            switch (col) {
              case "step":
                return (
                  <span key={col} className={s.subStep}>
                    {sub.step}
                  </span>
                );
              case "result":
                return (
                  <span
                    key={col}
                    className={[s.subResult, sub.ok ? s.subResultOk : ""]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {sub.result}
                  </span>
                );
              case "lang":
                return (
                  <span key={col} className={s.subLang}>
                    {sub.lang}
                  </span>
                );
              case "runtime":
                return (
                  <span key={col} className={s.subRuntime}>
                    {sub.runtime}
                  </span>
                );
              case "when":
                return (
                  <span key={col} className={s.subWhen}>
                    {sub.when}
                  </span>
                );
            }
          })}
        </div>
      ))}
    </div>
  );
}

/** Phone submissions: a stacked list rather than a four-column table. */
export function MobileSubmissions({ challenge }: { challenge: Challenge }) {
  return (
    <div className={s.stack}>
      {challenge.submissions.map((sub, i) => (
        <div key={i} className={s.mSubRow}>
          <span className={s.mSubMain}>
            <span
              className={[s.mSubResult, sub.ok ? s.mSubResultOk : ""]
                .filter(Boolean)
                .join(" ")}
            >
              {sub.result}
            </span>
            <span className={s.mSubMeta}>
              {[sub.step, challenge.languageLabel].filter(Boolean).join(" · ")}
            </span>
          </span>
          <span className={s.mSubWhen}>{sub.when}</span>
        </div>
      ))}
    </div>
  );
}
