import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { HAIRLINE, INK, INK_SOFT, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { LISTING_PAPER, MARK } from "../da-sql/parts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit, the interview kit
 * (editorial/interview.tsx) and the ERD kit (editorial/erd.tsx). The result
 * tables, marks, strikes and arrows are the Data Analyst SQL videos'
 * (da-sql/parts.tsx, and the column and geometry helpers from
 * da-advanced-sql/parts.tsx), re-exported the way ds-sql/parts.tsx does, so
 * the series' SQL figures look like one family. What is local:
 *
 * - the listing, copied from da-sql's with a wider keyword set: a modeling
 *   video prints UPDATE, INSERT, CREATE and ON CONFLICT, which da-sql's
 *   tokenizer set in plain ink (the shared kit would want these keywords;
 *   see the report);
 * - the two cities' inks, the spot illustration and `lineOf`.
 */
export {
  DataTable,
  Drift,
  ElbowArrow,
  Headline,
  KeyArrow,
  Kicker,
  Mark,
  MARK,
  MARK_BAD,
  MARK_KEY,
  MARK_OK,
  Mono,
  OK,
  OK_INK,
  pulse,
  Strike,
  Svg,
  TableName,
  Tag,
  X0,
  type Col,
  type TableGeometry,
} from "../da-sql/parts";
export { colsOf, geoOf, rowsAt } from "../da-advanced-sql/parts";

/** Two versions of one customer are both data: Boston in the brand blue,
 *  Austin in teal, a category hue with no meaning of its own. */
export const BOSTON = ds("blue", 500);
export const BOSTON_INK = inkOf.blue;
export const BOSTON_WASH = `color-mix(in srgb, ${ds("blue", 500)} 18%, transparent)`;
export const AUSTIN = ds("teal", 500);
export const AUSTIN_INK = inkOf.teal;
export const AUSTIN_WASH = `color-mix(in srgb, ${ds("teal", 500)} 20%, transparent)`;

/**
 * The index of the listing line that holds `text`. A highlight finds its line
 * by what the line says, not by a number, so a reworded query fails the
 * render instead of marking the wrong line.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

// ── The SQL listing ──────────────────────────────────────────────────────────

const TOKEN_INK = {
  keyword: inkOf.purple,
  string: inkOf.green,
  number: inkOf.orange,
  punct: INK_SOFT,
  name: INK,
} as const;
const KEYWORDS = new Set(
  (
    "SELECT FROM WHERE GROUP BY HAVING ORDER LIMIT JOIN LEFT INNER CROSS ON AND OR NOT IN IS NULL AS WITH DISTINCT " +
    "CASE WHEN THEN ELSE END DESC ASC OVER PARTITION DATE VALUES QUALIFY BETWEEN USING TIMESTAMP INTERVAL " +
    "UPDATE SET INSERT INTO CREATE TABLE ALTER ADD COLUMN CONFLICT DO NOTHING DELETE COUNT SUM ROW_NUMBER"
  ).split(" "),
);
/** Literals DuckDB prints in lower case. */
const LITERALS = new Set(["true", "false"]);
const TABLES = new Set([
  "dim_customer",
  "fact_orders",
  "customer_t1",
  "customer_t3",
  "staged_orders",
  "order_events",
  "order_snapshot",
  "order_promotion_bridge",
  "dim_promotion",
  "dim_date",
  "fact_shipments",
  "fact_order_lines",
  "attendance",
  "customer",
  "customer_history",
]);

type Token = { text: string; color: string; weight?: number };

const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(--.*$)|('(?:[^']|'')*')|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, comment, str, num, word] = m;
    if (comment) out.push({ text, color: INK_SOFT });
    else if (str) out.push({ text, color: TOKEN_INK.string });
    else if (num) out.push({ text, color: TOKEN_INK.number });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: TOKEN_INK.keyword, weight: 700 });
    else if (word && LITERALS.has(word)) out.push({ text, color: TOKEN_INK.number });
    else if (word && TABLES.has(word)) out.push({ text, color: TOKEN_INK.name, weight: 600 });
    else if (word) out.push({ text, color: TOKEN_INK.name });
    else out.push({ text, color: TOKEN_INK.punct });
  }
  return out;
};

/** One line of SQL, colored. */
export const Code: React.FC<{ line: string; size?: number }> = ({ line, size }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

const listingGeometry = (size: number) => ({
  lineH: Math.round(size * 1.8),
  padY: Math.round(size * 0.66),
  padX: Math.round(size * 0.8),
});

/** The full height of a listing of `lines` lines. */
export const listingHeight = (lines: number, size: number) => {
  const g = listingGeometry(size);
  return g.padY * 2 + lines * g.lineH;
};

/** The width a listing needs for its longest line. */
export const listingWidth = (lines: readonly string[], size: number) =>
  Math.ceil(Math.max(...lines.map((l) => l.length)) * 0.6 * size + 2 * listingGeometry(size).padX + 8);

/**
 * A printed SQL listing: tinted paper between a rule above and a hairline
 * below. Each line inks in on its own cue; `marks` lay a band under a line
 * (find it with `lineOf`), `dim` sets the listing back. Copied from
 * da-sql/parts.tsx; only the tokenizer differs.
 */
export const Listing: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  size?: number;
  at: number;
  lineAt?: readonly number[];
  marks?: readonly { line: number; at: number; out?: number; color?: string }[];
  dim?: number;
  out?: number;
  /** A small title over the listing's top rule. */
  title?: React.ReactNode;
}> = ({ lines, x, top, width, size = 22, at, lineAt, marks = [], dim, out, title }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
  const p = ease(frame, at, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top, width, height: listingHeight(lines.length, size), opacity: (1 - d) * (1 - o) }}>
      {title ? (
        <div style={{ position: "absolute", left: 0, bottom: "100%", paddingBottom: 8, whiteSpace: "nowrap", ...label(21, INK_SOFT), opacity: p }}>{title}</div>
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: LISTING_PAPER,
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
          borderTop: `2px solid ${INK}`,
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      />
      {marks.map((m, i) => {
        const w = ease(frame, m.at, 12);
        const mo = m.out === undefined ? 0 : ease(frame, m.out, 10);
        if (w <= 0 || mo >= 1) return null;
        const indent = lines[m.line].length - lines[m.line].trimStart().length;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.padX - size * 0.2 + indent * 0.6 * size,
              top: g.padY + m.line * g.lineH + g.lineH * 0.12,
              height: g.lineH * 0.76,
              width: `${((lines[m.line].length - indent) * 0.6 + 0.4) * w}em`,
              fontSize: size,
              background: m.color ?? MARK,
              opacity: 1 - mo,
            }}
          />
        );
      })}
      {lines.map((line, i) => (
        <Ink
          key={i}
          at={lineAt?.[i] ?? at + 4 + i * 3}
          dur={14}
          style={{ left: g.padX, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}
        >
          <Code line={line} size={size} />
        </Ink>
      ))}
    </div>
  );
};

/** A watercolor spot from illustrations.json: it pops in on `at`, bobs
 *  gently, and fades on `out`. */
export const Spot: React.FC<{
  id: string;
  /** Another video's folder, for art the series shares. */
  video?: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, video = VIDEO, at, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  if ((video === VIDEO && !ILLUSTRATIONS) || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={video}
      id={id}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};
