import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ColumnRule, Cylinder, cylinderH, Drift, Flow, Node, Svg, X0 } from "./parts";

const COL_HEAD = 316;
const R_X = 980;
const SHAPE_W = 240;
const SHAPE_GAP = 50;
const SHAPES_TOP = 436;
const SHAPE_H = 186;

/** A small table drawn as a header strip and row stripes. */
const MiniTable: React.FC<{
  x: number;
  y: number;
  w: number;
  rows: number;
  rowH: number;
  name: string;
  at: number;
  lit?: { rows: readonly number[]; at: number; color: string };
}> = ({ x, y, w, rows, rowH, name, at, lit }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const headH = 34;
  const litP = lit ? ease(frame, lit.at, 12) : 0;
  return (
    <g opacity={p}>
      <rect x={x} y={y} width={w} height={headH + rows * rowH} rx={6} fill={PAPER} stroke={BAR} strokeWidth={2} />
      <rect x={x} y={y} width={w} height={headH} rx={6} fill={`color-mix(in srgb, ${BAR} 18%, ${PAPER})`} />
      <text x={x + 14} y={y + 24} style={svgText({ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: INK })}>
        {name}
      </text>
      {Array.from({ length: rows }, (_, i) => (
        <g key={i} opacity={ease(frame, at + 4 + i * 2, 10)}>
          {lit && lit.rows.includes(i) ? (
            <rect x={x + 3} y={y + headH + i * rowH + 3} width={w - 6} height={rowH - 6} rx={3} fill={lit.color} opacity={0.35 * litP} />
          ) : null}
          <line x1={x} x2={x + w} y1={y + headH + i * rowH} y2={y + headH + i * rowH} stroke={`color-mix(in srgb, ${INK} 18%, transparent)`} strokeWidth={1} />
          <rect x={x + 16} y={y + headH + i * rowH + rowH / 2 - 4} width={w * 0.22} height={8} rx={4} fill={`color-mix(in srgb, ${BAR} 55%, ${PAPER})`} />
          <rect x={x + 26 + w * 0.22} y={y + headH + i * rowH + rowH / 2 - 4} width={w * (0.25 + ((i * 37) % 30) / 100)} height={8} rx={4} fill={`color-mix(in srgb, ${INK} 22%, ${PAPER})`} />
        </g>
      ))}
    </g>
  );
};

/** A tick drawn on `at`. */
const TickMark: React.FC<{ x: number; y: number; at: number; color?: string }> = ({ x, y, at, color = OK }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (p <= 0) return null;
  return <path d={`M${x},${y} l6,6 l12,-13`} fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p} 1`} />;
};

/** One NoSQL shape: its drawing in a box, its name and its access pattern
 *  under it. */
const Shape: React.FC<{ x: number; y: number; at: number; name: string; pattern: string; children: React.ReactNode }> = ({ x, y, at, name, pattern, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: SHAPE_W, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
      <div
        style={{
          position: "relative",
          width: SHAPE_W,
          height: SHAPE_H,
          boxSizing: "border-box",
          borderTop: `1px solid ${HAIRLINE}`,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
      <div style={{ ...label(23, INK), fontWeight: 700, marginTop: 14, whiteSpace: "nowrap" }}>{name}</div>
      <div style={{ ...note(21, INK_SOFT), marginTop: 6, whiteSpace: "nowrap" }}>{pattern}</div>
    </div>
  );
};

const mono = (color: string = INK): React.CSSProperties => ({ fontFamily: MONO, fontSize: 19, fontWeight: 500, color, whiteSpace: "pre", fontVariantLigatures: "none", lineHeight: "26px" });

/**
 * Question 1, with system design's SQL-or-NoSQL question under it. Left,
 * relational: two tables joined by a line, three rows of one ticked into a
 * single transaction, the reasons along the bottom and "the safe default" in
 * green. Right, NoSQL: writes spread over machines, then the three shapes the
 * narration names (a document, key-value pairs, wide rows), each with its one
 * access pattern, and the price in the soft ink. Then one system using both,
 * and a new query arriving: the relational side answers it with a join, the
 * other copies its data into a second arrangement.
 */
export const NosqlScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("nosql").from;
  const qAt = n.word("nosql", "Question one");
  const textAt = n.word("nosql", "SQL versus NoSQL");
  const sdAt = n.word("nosql", "And from system design");
  const relAt = n.word("nosql-sql", "Pick relational");
  const joinsAt = n.word("nosql-sql", "joins");
  const txnAt = n.word("nosql-sql", "transactions across several rows");
  const strongAt = n.word("nosql-sql", "strong consistency");
  const safeAt = n.word("nosql-sql", "the safe default");
  const noAt = n.word("nosql-no", "Pick NoSQL");
  const machinesAt = n.word("nosql-no", "scale out across machines");
  const schemaAt = n.word("nosql-no", "the schema keeps changing");
  const patternAt = n.word("nosql-no", "one access pattern");
  const kvAt = n.word("nosql-no", "key-value");
  const wideAt = n.word("nosql-no", "wide-column");
  const priceAt = n.word("nosql-no", "The price");
  const bothAt = n.word("nosql-both", "many systems use both");
  const coreAt = n.word("nosql-both", "SQL for the core transactions");
  const logsAt = n.word("nosql-both", "NoSQL for high-volume logs");
  const askAt = n.word("nosql-next", "ask which queries");
  const relNewAt = n.word("nosql-next", "Relational answers a new one");
  const joinAt = n.word("nosql-next", "with a join");
  const storeAt = n.word("nosql-next", "a store built around one access pattern");
  const copiedAt = n.word("nosql-next", "copied again");
  const end = n.beat("nosql-next").to;

  const phase1Out = bothAt - 8;
  const out1 = 1 - ease(frame, phase1Out, 10);

  // ── Phase 1, left: two tables and a transaction ──
  const tTop = y(COL_HEAD) + h(70);
  const rowH = h(40);
  const cust = { x: X0, w: 200 };
  const ord = { x: X0 + 270, w: 290 };
  const rowMid = (i: number) => tTop + 34 + i * rowH + rowH / 2;
  const txnRows = [1, 2, 3];
  const bracketX = ord.x + ord.w + 52;

  // ── Phase 2: one system, both stores ──
  const app = { x: 860, w: 200, y: y(300), h: h(72) };
  // The stores, painted: SQL and NoSQL under the application's two arms,
  // and the copy to NoSQL's right, standing on the same line.
  const store = { w: 210, y: y(426) };
  const storeH = cylinderH(store.w);
  const sqlC = 430;
  const sqlX = sqlC - store.w / 2;
  const noX = 1280 - store.w / 2;
  const copy = { w: 176, c: 1650 };
  const copyH = cylinderH(copy.w, "look");
  const copyX = copy.c - copy.w / 2;
  const copyY = store.y + storeH - copyH;
  // The copy's arrow, across the middle of both painted fronts.
  const copyMid = store.y + storeH * 0.62;
  const underY = store.y + storeH + h(40);
  const newQ = { x: 860, w: 200, y: y(704), h: h(76) };
  const newMid = newQ.y + newQ.h / 2;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={joinsAt + 2} level={-35} />
      <Sfx name="el-tap" at={txnAt + 6} level={-33} />
      <Sfx name="el-tap" at={schemaAt} level={-34} />
      <Sfx name="el-tap" at={kvAt} level={-34} />
      <Sfx name="el-tap" at={wideAt} level={-34} />
      <Sfx name="el-whoosh" at={bothAt - 2} level={-36} />
      <Sfx name="el-pencil" at={relNewAt + 4} level={-35} />
      <Sfx name="el-whoosh" at={copiedAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={58}>
          SQL vs NoSQL, when do you pick each?
        </QuestionCard>
        <Ink at={sdAt - 2} dur={16} style={{ left: 94, top: y(222), whiteSpace: "nowrap" }}>
          <span style={{ ...note(28, INK_SOFT) }}>
            From system design: <span style={{ color: INK }}>SQL or NoSQL at scale, how do you choose?</span>
          </span>
        </Ink>

        {/* ── Phase 1, left: relational ── */}
        <div style={{ opacity: out1 }}>
          <Ink at={relAt - 2} dur={14} style={{ left: X0, top: y(COL_HEAD), whiteSpace: "nowrap" }}>
            <span style={{ ...label(26, INK), fontWeight: 700 }}>Relational</span>
          </Ink>
          <Svg>
            <MiniTable x={cust.x} y={tTop} w={cust.w} rows={4} rowH={rowH} name="customers" at={relAt} lit={{ rows: [1], at: joinsAt, color: BAR }} />
            <MiniTable x={ord.x} y={tTop} w={ord.w} rows={5} rowH={rowH} name="orders" at={relAt + 4} lit={{ rows: txnRows, at: txnAt + 2, color: OK }} />
            {/* customer 2's orders, joined */}
            {[0, 2].map((r, k) => (
              <path
                key={r}
                d={`M${cust.x + cust.w},${rowMid(1)} C${cust.x + cust.w + 40},${rowMid(1)} ${ord.x - 40},${rowMid(r)} ${ord.x},${rowMid(r)}`}
                fill="none"
                stroke={BAR}
                strokeWidth={2.4}
                pathLength={1}
                strokeDasharray={`${ease(frame, joinsAt + k * 4, 14)} 1`}
              />
            ))}
            {txnRows.map((r, k) => (
              <TickMark key={r} x={ord.x + ord.w + 14} y={rowMid(r) - 2} at={txnAt + 4 + k * 3} />
            ))}
            {/* The bracket: three rows, one transaction. */}
            <path
              d={`M${bracketX},${rowMid(1) - rowH / 2 + 3} h10 V${rowMid(3) + rowH / 2 - 3} h-10`}
              fill="none"
              stroke={OK}
              strokeWidth={2.6}
              opacity={ease(frame, txnAt + 6, 10)}
            />
          </Svg>
          <Note at={txnAt + 8} x={bracketX + 26} y={rowMid(2) - h(15)}>
            <span style={{ ...note(22, OK_INK), whiteSpace: "nowrap", fontWeight: 650 }}>one transaction</span>
          </Note>
          <div style={{ position: "absolute", left: X0, top: tTop + 34 + 5 * rowH + h(40), display: "flex", gap: "0.7em", fontSize: 24, whiteSpace: "nowrap" }}>
            {[
              { at: joinsAt, text: "joins" },
              { at: txnAt, text: "transactions across rows" },
              { at: strongAt, text: "strong consistency" },
            ].map((r, i) => (
              <span key={r.text} style={{ ...note(24, INK), opacity: ease(frame, r.at, 10) }}>
                {r.text}
                {i < 2 ? "," : ""}
              </span>
            ))}
          </div>
          <Note at={safeAt} x={X0} y={tTop + 34 + 5 * rowH + h(96)}>
            <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>the safe default for most applications</span>
          </Note>
        </div>

        {/* ── Phase 1, right: NoSQL ── */}
        <div style={{ opacity: out1 }}>
          <ColumnRule x={R_X - 34} top={y(COL_HEAD)} bottom={y(SHAPES_TOP) + SHAPE_H + h(156)} at={noAt - 2} />
          {[1, 2].map((k) => (
            <ColumnRule key={k} x={R_X + k * (SHAPE_W + SHAPE_GAP) - SHAPE_GAP / 2} top={y(SHAPES_TOP)} bottom={y(SHAPES_TOP) + SHAPE_H + h(82)} at={k === 1 ? kvAt : wideAt} />
          ))}
          <Ink at={noAt - 2} dur={14} style={{ left: R_X, top: y(COL_HEAD), whiteSpace: "nowrap" }}>
            <span style={{ ...label(26, INK), fontWeight: 700 }}>NoSQL</span>
          </Ink>
          <Note at={machinesAt} x={R_X + 120} y={y(COL_HEAD) + 4}>
            <span style={{ ...note(22, INK), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 12 }}>
              writes spread across machines
              {[0, 1, 2].map((k) => (
                <span
                  key={k}
                  style={{
                    display: "inline-block",
                    width: 26,
                    height: 22,
                    borderRadius: 4,
                    border: `2px solid ${BAR}`,
                    background: `color-mix(in srgb, ${BAR} 25%, ${PAPER})`,
                    opacity: ease(frame, machinesAt + 6 + k * 3, 8),
                  }}
                />
              ))}
            </span>
          </Note>
          <Shape x={R_X} y={y(SHAPES_TOP)} at={schemaAt} name="document" pattern="any shape, changing">
            <div style={{ position: "absolute", left: 0, top: 26 }}>
              {['{', '  "name": "Ava",', '  "tags": ["vip"],', '  "address": {…}', '}'].map((l, i) => (
                <div key={i} style={mono(i === 0 || i === 4 ? INK_SOFT : INK)}>
                  {l}
                </div>
              ))}
            </div>
          </Shape>
          <Shape x={R_X + SHAPE_W + SHAPE_GAP} y={y(SHAPES_TOP)} at={kvAt} name="key-value" pattern="one value per key">
            <div style={{ position: "absolute", left: 0, top: 22, display: "flex", flexDirection: "column", gap: 14 }}>
              {["user:41", "user:42", "user:43", "user:44"].map((k, i) => (
                <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", opacity: ease(frame, kvAt + 2 + i * 2, 8) }}>
                  <span style={{ ...mono(BLUE_INK), fontWeight: 600, lineHeight: "24px" }}>{k}</span>
                  <span style={{ ...mono(INK_SOFT), lineHeight: "24px" }}>→</span>
                  <span style={{ display: "inline-block", width: 64, height: 12, borderRadius: 6, background: `color-mix(in srgb, ${INK} 22%, ${PAPER})` }} />
                </div>
              ))}
            </div>
          </Shape>
          <Shape x={R_X + 2 * (SHAPE_W + SHAPE_GAP)} y={y(SHAPES_TOP)} at={wideAt} name="wide-column" pattern="rows by key, at volume">
            <div style={{ position: "absolute", left: 0, top: 26, display: "flex", flexDirection: "column", gap: 18 }}>
              {[5, 2, 4, 3].map((cells, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", opacity: ease(frame, wideAt + 2 + i * 2, 8) }}>
                  <span style={{ display: "inline-block", width: 40, height: 20, borderRadius: 4, background: `color-mix(in srgb, ${BAR} 55%, ${PAPER})` }} />
                  {Array.from({ length: cells }, (_, c) => (
                    <span key={c} style={{ display: "inline-block", width: 26, height: 20, borderRadius: 4, border: `1.5px solid color-mix(in srgb, ${INK} 30%, transparent)` }} />
                  ))}
                </div>
              ))}
            </div>
          </Shape>
          <Note at={patternAt} x={R_X + SHAPE_W + SHAPE_GAP} y={y(SHAPES_TOP) - h(40)}>
            <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>one access pattern, known in advance, at huge volume</span>
          </Note>
          <Note at={priceAt} x={R_X} y={y(SHAPES_TOP) + SHAPE_H + h(122)}>
            <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>The price: weaker consistency, limited joins</span>
          </Note>
        </div>

        {/* ── Phase 2: one system, both stores ── */}
        <Node x={app.x} y={app.y} w={app.w} h={app.h} at={bothAt} tone="plain" title="application" size={26} bare />
        <Flow points={[[app.x + 30, app.y + app.h + 2], [app.x + 30, app.y + app.h + h(20)], [sqlX + store.w / 2, app.y + app.h + h(20)], [sqlX + store.w / 2, store.y - 10]]} at={coreAt} color={BAR} width={2.6} />
        <Flow points={[[app.x + app.w - 30, app.y + app.h + 2], [app.x + app.w - 30, app.y + app.h + h(20)], [noX + store.w / 2, app.y + app.h + h(20)], [noX + store.w / 2, store.y - 10]]} at={logsAt} color={BAR} width={2.6} />
        <Cylinder x={sqlX} y={store.y} w={store.w} at={coreAt - 2} title="SQL" size={26} />
        <Cylinder x={noX} y={store.y} w={store.w} at={logsAt - 2} title="NoSQL" size={26} />
        <Note at={coreAt + 6} x={sqlX + store.w / 2} y={underY} style={{ transform: "translateX(-50%)" }}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            core transactions: <b>orders, payments</b>
          </span>
        </Note>
        <Note at={logsAt + 6} x={noX + store.w / 2} y={underY} style={{ transform: "translateX(-50%)" }}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            high volume: <b>logs, sessions, feeds</b>
          </span>
        </Note>

        {/* A query nobody planned for. */}
        <Node x={newQ.x} y={newQ.y} w={newQ.w} h={newQ.h} at={askAt} tone="look" title="a new query" sub="next year's" size={24} bare />
        <Flow points={[[newQ.x - 8, newMid], [sqlC + 200, newMid]]} at={relNewAt} color={inkOf.yellow} width={2.6} dash="9 7" />
        <Svg opacity={ease(frame, joinAt - 4, 12)}>
          <line x1={sqlC - 30} y1={newMid} x2={sqlC + 40} y2={newMid} stroke={OK} strokeWidth={3} pathLength={1} strokeDasharray={`${ease(frame, joinAt, 12)} 1`} />
          <text x={sqlC - 85} y={newMid + 7} textAnchor="middle" style={svgText({ fontFamily: MONO, fontSize: 19, fontWeight: 600, color: INK })}>
            orders
          </text>
          <text x={sqlC + 95} y={newMid + 7} textAnchor="middle" style={svgText({ fontFamily: MONO, fontSize: 19, fontWeight: 600, color: INK })}>
            users
          </text>
        </Svg>
        <Note at={joinAt + 4} x={sqlC - 140} y={newMid + h(40)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>a join</span>
        </Note>
        <Cylinder x={copyX} y={copyY} w={copy.w} at={copiedAt} tone="look" title="a copy" size={22} />
        {/* From NoSQL's painted right edge to the copy's left one (each art keeps a 2.5% margin). */}
        <Flow points={[[noX + store.w * 0.975 + 10, copyMid], [copyX + copy.w * 0.025 - 14, copyMid]]} at={copiedAt + 2} color={INK} width={2.6} />
        <Flow
          points={[
            [newQ.x + newQ.w + 8, newMid],
            [copy.c, newMid],
            [copy.c, store.y + storeH + 14],
          ]}
          at={storeAt}
          color={inkOf.yellow}
          width={2.6}
          dash="9 7"
        />
        <Note at={copiedAt + 6} x={copyX - 30} y={copyY - h(60)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>arranged for the new one</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
