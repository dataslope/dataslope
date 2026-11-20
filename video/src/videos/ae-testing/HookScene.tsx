import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, TABULAR, body, label, note } from "../../editorial/style";
import { Badge, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { SANS } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { DUPLICATES, money, UNIQUE } from "./data";
import { Box, DataTable, Drift, Kicker, MARK_RED, pulse, SERIES, Spot, TableName, tableGeometry, X0 } from "./parts";

const TABLE_TOP = 206;
const RX = 500;
const BADGES_Y = 196;
const TILES_LABEL_Y = 300;
const TILES_Y = 338;
const TILE = { w: 230, h: 112, gap: 28 };
const PROBE_Y = 548;
const WORDS_Y = 592;
const SQUARES_Y = 712;
const DEEP = 10;
const QUICK = 9;
const SQ = 44;
const SQ_GAP = 8;
const SMALL = 32;
const BIRD = { x: 1520, w: 290 };

/**
 * The opening. The testing page's own 24-row fct_orders as a tall table,
 * cheap to build and quick to query; then its three duplicated orders lit
 * in pairs, the revenue they add under the amount column (3,569.50 summed,
 * against 3,234.50 counted once per order), and three dashboards that read
 * the table, all agreeing on the wrong number. The table recedes for what
 * interviews probe, four words in a row, and then the promise: nineteen
 * squares, ten worked through and nine quick. The woodpecker, the video's
 * hero, taps on the right.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const tableAt = n.word("hook", "This orders table");
  const cheapAt = n.word("hook", "cheap to build");
  const quickAt = n.word("hook", "quick to query");
  const wrongAt = n.word("hook", "wrong");
  const rowsAt = n.word("hook", "twenty-four rows");
  const twiceAt = n.word("hook", "three of the order IDs appear twice");
  const nothingAt = n.word("hook-quiet", "Nothing errors");
  const revenueAt = n.word("hook-quiet", "Revenue is");
  const tooHighAt = n.word("hook-quiet", "too high");
  const dashAt = n.word("hook-quiet", "every dashboard");
  const agreesAt = n.word("hook-quiet", "agrees on it");
  const jobFrom = n.beat("hook-job").from;
  const defenseAt = n.word("hook-job", "the last line of defense");
  const probeAt = n.word("hook-job", "so interviews probe");
  const words = [
    { text: "Tests", at: n.word("hook-job", "tests") },
    { text: "Contracts", at: n.word("hook-job", "contracts") },
    { text: "Freshness", at: n.word("hook-job", "freshness") },
    { text: "Checks on every change", at: n.word("hook-job", "checks on every change") },
  ];
  const nineteenAt = n.word("plan", "Nineteen questions");
  const tenAt = n.word("plan", "Ten are worked through");
  const postgresAt = n.word("plan", "real rows in Postgres");
  const nineAt = n.word("plan", "nine come quickly");
  const end = n.beat("plan").to;

  // ── The page's table, tall ──
  const g = tableGeometry({
    x: X0,
    top: y(TABLE_TOP),
    cols: [{ name: "order_id" }, { name: "amount" }],
    rows: UNIQUE.table.rows,
    headH: h(30),
    rowH: h(22.6),
    headSize: 19,
    bodySize: 19,
    pad: 18,
  });
  const dupRows = UNIQUE.table.rows.map((r, i) => (DUPLICATES.includes(Number(r[0])) ? i : -1)).filter((i) => i >= 0);
  const pairs = DUPLICATES.map((id) => dupRows.filter((i) => Number(UNIQUE.table.rows[i][0]) === id));
  const tableBottom = g.rowTop(UNIQUE.table.rows.length);
  const recede = jobFrom;

  // ── The dashboards ──
  const tilesTop = y(TILES_Y);
  const tileX = (i: number) => RX + i * (TILE.w + TILE.gap);
  const tilesDim = probeAt - 4;

  // ── Nineteen squares ──
  const sqTop = y(SQUARES_Y);
  const sqX = (i: number) => (i < DEEP ? RX + i * (SQ + SQ_GAP) : RX + DEEP * (SQ + SQ_GAP) + 22 + (i - DEEP) * (SMALL + SQ_GAP));
  const smallX = sqX(DEEP);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={tableAt} level={-34} />
      <Sfx name="el-pop" at={from + 10} level={-30} />
      <Sfx name="el-tap" at={cheapAt} level={-33} />
      <Sfx name="el-tap" at={quickAt} level={-33} />
      <Sfx name="el-tap" at={wrongAt} level={-31} />
      <Sfx name="el-pencil" at={twiceAt + 4} level={-35} />
      <Sfx name="el-tap" at={nothingAt} level={-34} />
      <Sfx name="el-pencil" at={revenueAt + 4} level={-35} />
      <Sfx name="el-sprinkle" at={dashAt} level={-34} />
      <Sfx name="el-whoosh" at={recede} level={-37} />
      {words.map((w) => (
        <Sfx key={w.text} name="el-tap" at={w.at} level={-34} />
      ))}
      <Sfx name="el-sprinkle" at={nineteenAt} level={-33} />
      <Sfx name="el-tap" at={nineAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>{SERIES}</Kicker>

        <Spot art="woodpecker" at={from + 10} left={BIRD.x} top={y(TABLE_TOP)} width={BIRD.w} />

        {/* ── fct_orders, 24 rows ── */}
        <TableName g={g} at={tableAt} dim={recede}>
          fct_orders
          <span style={{ color: INK_SOFT, opacity: ease(frame, rowsAt, 10) }}>
            {" "}
            · <span style={{ color: BLUE_INK }}><Num>{UNIQUE.rows}</Num> rows</span>
          </span>
        </TableName>
        <DataTable
          g={g}
          cols={[
            { name: "order_id", numeric: true },
            { name: "amount", numeric: true },
          ]}
          rows={UNIQUE.table.rows.map((cells, i) => ({ cells, at: tableAt + 4 + i * 1.2 }))}
          at={tableAt}
          bands={dupRows.map((row, k) => ({ row, at: twiceAt + 4 + Math.floor(k / 2) * 5, color: MARK_RED }))}
          dim={recede}
        />
        {pairs.map((rows, k) => {
          const mid = (g.rowTop(rows[0]) + g.rowTop(rows[rows.length - 1] + 1)) / 2;
          return (
            <Note key={k} at={twiceAt + 8 + k * 5} x={g.right + 14} y={mid - 13} dim={recede}>
              <span style={{ ...note(20, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
                twice
              </span>
            </Note>
          );
        })}
        {/* Under the amount column: every row summed, against one per order. */}
        <div style={{ position: "absolute", left: g.x - 200, top: tableBottom + h(10), width: g.width + 200, textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: h(6) }}>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 600, ...TABULAR, opacity: ease(frame, revenueAt + 2, 10) }}>{money(UNIQUE.everyRow)}</span>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, revenueAt + 10, 10) }}>
            against <Num>{money(UNIQUE.onePerOrder)}</Num>, once per order
          </span>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap", opacity: ease(frame, tooHighAt - 2, 10) }}>
            <Num>{money(UNIQUE.tooHigh)}</Num> too high
          </span>
        </div>

        {/* ── Cheap, quick, wrong, and nothing errors ── */}
        <div style={{ position: "absolute", left: RX, top: y(BADGES_Y), display: "flex", gap: "0.6em", fontSize: 24, fontFamily: SANS, alignItems: "center" }}>
          {[
            { text: "cheap to build", tone: "gray" as const, at: cheapAt },
            { text: "quick to query", tone: "gray" as const, at: quickAt },
            { text: "wrong", tone: "red" as const, at: wrongAt },
            { text: "no errors", tone: "gray" as const, at: nothingAt },
          ].map((b) => {
            const p = ease(frame, b.at - 2, 10);
            return (
              <Badge key={b.text} tone={b.tone} size={24} style={{ opacity: p * (1 - 0.45 * ease(frame, tilesDim, 14)), transform: `scale(${(0.85 + 0.15 * p) * (1 + 0.06 * pulse(frame, b.at + 4, 16))})` }}>
                {b.text}
              </Badge>
            );
          })}
        </div>

        {/* ── Every dashboard that reads it agrees ── */}
        <Note at={dashAt - 2} x={RX} y={y(TILES_LABEL_Y)} dim={tilesDim}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>Every dashboard that reads it</span>
        </Note>
        {["Sales", "Finance", "Executive"].map((name, i) => (
          <Box key={name} x={tileX(i)} y={tilesTop} w={TILE.w} h={h(TILE.h)} at={dashAt + 2 + i * 5} title={`${name} revenue`} size={21} dim={tilesDim}>
            <span style={{ ...note(30, ACCENT_INK), fontWeight: 600, ...TABULAR, marginTop: h(4), opacity: ease(frame, agreesAt - 4 + i * 4, 10) }}>{money(UNIQUE.everyRow)}</span>
          </Box>
        ))}

        {/* ── What interviews probe ── */}
        <Note at={defenseAt} x={RX} y={y(PROBE_Y) - h(54)} dim={probeAt + 30}>
          <span style={{ ...body(32), color: INK, whiteSpace: "nowrap" }}>The last line of defense before a dashboard</span>
        </Note>
        <Note at={probeAt} x={RX} y={y(PROBE_Y) + h(6)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>What interviews probe</span>
        </Note>
        <WordsRow words={words} x={RX} top={y(WORDS_Y) + h(10)} />

        {/* ── Nineteen questions: ten worked through, nine quick ── */}
        {Array.from({ length: DEEP + QUICK }, (_, i) => {
          const deep = i < DEEP;
          const at = nineteenAt - 2 + i * 1.5;
          const p = ease(frame, at, 10);
          if (p <= 0) return null;
          const tone = deep ? ease(frame, tenAt + i * 1.5, 10) : ease(frame, nineAt + (i - DEEP) * 2, 10);
          const size = deep ? SQ : SMALL;
          const glow = deep ? pulse(frame, tenAt + i * 1.5, 16) : pulse(frame, nineAt + (i - DEEP) * 2, 16);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: sqX(i),
                top: sqTop + (SQ - size) / 2,
                width: size,
                height: size,
                borderRadius: 4,
                boxSizing: "border-box",
                border: `2px solid ${BAR}`,
                background: `color-mix(in srgb, ${BAR} ${12 + 78 * tone}%, ${PAPER})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(deep ? 20 : 19, tone > 0.5 ? PAPER : BLUE_INK),
                fontWeight: 500,
                ...TABULAR,
                opacity: p,
                transform: `scale(${(0.7 + 0.3 * p) * (1 + 0.12 * glow)})`,
              }}
            >
              {i + 1}
            </div>
          );
        })}
        <Note at={tenAt} x={RX} y={sqTop + SQ + h(16)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <b>10</b> worked through
            <span style={{ color: INK_SOFT, opacity: ease(frame, postgresAt, 10) }}>, most on real rows in Postgres</span>
          </span>
        </Note>
        <Note at={nineAt} x={smallX} y={sqTop + SQ + h(16)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <b>9</b> quickly, at the end
          </span>
        </Note>
        <Note at={nineteenAt + 8} x={RX} y={sqTop + SQ + h(62)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
            <Num>19</Num> questions · <Num>7</Num> more on the dbt page, answered with them
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

/** Four words in a row, a hairline in each gap (README: items set side by
 *  side take one), each word and its hairline inking in on its cue. */
const WordsRow: React.FC<{ words: readonly { text: string; at: number }[]; x: number; top: number }> = ({ words, x, top }) => {
  const frame = useCurrentFrame();
  const SIZE = 32;
  return (
    <div style={{ position: "absolute", left: x, top, display: "flex", alignItems: "center", fontSize: SIZE, whiteSpace: "nowrap" }}>
      {words.map((w, i) => {
        const p = ease(frame, w.at - 2, 12);
        return (
          <React.Fragment key={w.text}>
            {i > 0 ? (
              <div style={{ width: 1, height: SIZE + 10, margin: "0 32px", display: "flex", alignItems: "flex-start" }}>
                <div style={{ width: 1, height: (SIZE + 10) * ease(frame, w.at - 4, 14), background: HAIRLINE }} />
              </div>
            ) : null}
            <span style={{ ...note(SIZE, INK), fontWeight: 500, opacity: p, transform: `translateY(${(1 - p) * 8}px)` }}>{w.text}</span>
          </React.Fragment>
        );
      })}
    </div>
  );
};
