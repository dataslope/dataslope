import { AppWindow } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { SAMPLE } from "./data";
import { Box, COLUMN_TINT, Drift, Flow, READ, X0 } from "./parts";

const TITLE_Y = 300;
const GRID_Y = 470;
const ROWS = 6;
const ROW_H = 35;
const CELL_H = 27;
const ROW_X = 380;
const CELL_W = 48;
const COL_X = 1080;
const STRIP_W = 40;
const STRIP_GAP = 10;
const CHIP = { x: X0, w: 180, h: 60 };
const T_BOX = { x: 1450, w: 240, h: 64 };
/** The warehouse's edge, drawn round the strips and the transform together
 *  when the narration says "transformed there". */
const WH = { left: COL_X - 30, right: 1800, pad: 30 };

/**
 * Question 3. Left, an app's database (OLTP): rows stored whole, each request
 * a short arrow to one row. Right, the warehouse (OLAP): the same six columns
 * stored as strips, one long scan down a column. Then the flow between them,
 * extract and load, and the transform inside the warehouse, in yellow: the
 * analytics engineer's part. Then the trap: a heavy query aimed at the app's
 * own database, and its requests slowing, in red.
 */
export const OltpScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("oltp").from;
  const qAt = n.word("oltp", "Question three");
  const qTextAt = n.word("oltp", "What is the difference");
  const oltpAt = n.word("oltp-def", "OLTP, online transaction processing");
  const smallAt = n.word("oltp-def", "many small reads and writes");
  const strictAt = n.word("oltp-def", "strict consistency");
  const pgAt = n.word("oltp-def", "an app's Postgres");
  const byRowAt = n.word("oltp-def", "stored by row");
  const olapAt = n.word("oltp-def", "OLAP, online analytical processing");
  const scansAt = n.word("oltp-def", "a few large scans");
  const whAt = n.word("oltp-def", "the warehouse");
  const byColAt = n.word("oltp-def", "stored by column");
  const extractAt = n.word("oltp-flow", "extracted from the first");
  const loadAt = n.word("oltp-flow", "loaded into the second");
  const transformAt = n.word("oltp-flow", "transformed there");
  const aeAt = n.word("oltp-flow", "the analytics engineer's");
  const heavyAt = n.word("oltp-heavy", "Run heavy analytics");
  const competesAt = n.word("oltp-heavy", "competes with the app");
  const badlyAt = n.word("oltp-heavy", "runs badly");
  const end = n.beat("oltp-heavy").to;

  const cols = SAMPLE.cols;
  const gridTop = y(GRID_Y);
  const rowH = h(ROW_H);
  const cellH = h(CELL_H);
  const gridBottom = gridTop + ROWS * rowH;
  const mid = gridTop + (ROWS * rowH) / 2;
  const rowMid = (r: number) => gridTop + r * rowH + cellH / 2;
  const stripX = (c: number) => COL_X + c * (STRIP_W + STRIP_GAP);
  const colsW = cols.length * (STRIP_W + STRIP_GAP) - STRIP_GAP;
  const AMOUNT = cols.indexOf("amount");
  const heavy = ease(frame, competesAt, 12);
  // The app's requests, one row each, in the order they arrive.
  const order = [2, 0, 4, 1, 5, 3];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={smallAt - 4} level={-34} />
      <Sfx name="el-sprinkle" at={smallAt + 2} level={-34} />
      <Sfx name="el-sprinkle" at={whAt} level={-34} />
      <Sfx name="el-pencil" at={scansAt + 4} level={-35} />
      <Sfx name="el-whoosh" at={extractAt} level={-36} />
      <Sfx name="el-pop" at={transformAt} level={-31} />
      <Sfx name="el-tap" at={heavyAt + 4} level={-32} />
      <Sfx name="el-scratch" at={competesAt + 2} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          What is the difference between OLTP and OLAP systems?
        </QuestionCard>

        {/* ── OLTP: the app's database ── */}
        <Note at={oltpAt} x={X0} y={y(TITLE_Y)}>
          <span style={{ ...label(26, INK), whiteSpace: "nowrap" }}>
            OLTP<span style={{ color: INK_SOFT }}>, online transaction processing</span>
          </span>
        </Note>
        <Note at={smallAt} x={X0} y={y(TITLE_Y) + h(42)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>Many small reads and writes of single rows</span>
        </Note>
        <Note at={strictAt} x={X0} y={y(TITLE_Y) + h(80)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            Strict consistency<span style={{ opacity: ease(frame, byRowAt, 10) }}>, stored by row</span>
          </span>
        </Note>
        {/* The app and its rows come first, so the requests below have a
            source and a target; "Postgres" inks in when it is named. */}
        <Box
          x={CHIP.x}
          y={mid - h(CHIP.h) / 2}
          w={CHIP.w}
          h={h(CHIP.h)}
          at={smallAt - 4}
          title="App"
          icon={AppWindow}
          size={24}
          sub={<span style={{ opacity: ease(frame, pgAt, 10) }}>Postgres</span>}
        />
        {Array.from({ length: ROWS }, (_, r) =>
          cols.map((c, j) => {
            const p = ease(frame, smallAt + r * 2 + j * 0.5, 10);
            if (p <= 0) return null;
            return (
              <div
                key={`${r}${c}`}
                style={{
                  position: "absolute",
                  left: ROW_X + j * CELL_W,
                  top: gridTop + r * rowH,
                  width: CELL_W - 3,
                  height: cellH,
                  borderRadius: 3,
                  background: COLUMN_TINT[c],
                  boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${INK} 20%, transparent)`,
                  opacity: p,
                }}
              />
            );
          }),
        )}
        {order.map((r, k) => {
          const at = smallAt + 14 + k * 5;
          const slow = heavy > 0.5;
          return (
            <Flow
              key={r}
              points={[[CHIP.x + CHIP.w + 10, mid + (r - 2.5) * h(6)], [ROW_X - 12, rowMid(r)]]}
              at={at}
              dur={10}
              color={slow ? ACCENT : INK}
              width={2.2}
              head={12}
              dash={slow ? "5 5" : undefined}
            />
          );
        })}

        {/* ── OLAP: the warehouse ── */}
        <Note at={olapAt} x={COL_X} y={y(TITLE_Y)}>
          <span style={{ ...label(26, INK), whiteSpace: "nowrap" }}>
            OLAP<span style={{ color: INK_SOFT }}>, online analytical processing</span>
          </span>
        </Note>
        <Note at={scansAt} x={COL_X} y={y(TITLE_Y) + h(42)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>A few large scans and aggregations</span>
        </Note>
        <Note at={whAt} x={COL_X} y={y(TITLE_Y) + h(80)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            The warehouse<span style={{ opacity: ease(frame, byColAt, 10) }}>, stored by column</span>
          </span>
        </Note>
        {/* The scan down one column, behind its strip. */}
        <div
          style={{
            position: "absolute",
            left: stripX(AMOUNT) - 7,
            top: gridTop - 7,
            width: STRIP_W + 14,
            height: (ROWS * rowH - (rowH - cellH) + 14) * ease(frame, byColAt + 6, 24),
            background: READ,
            borderRadius: 5,
            opacity: ease(frame, byColAt + 6, 6),
          }}
        />
        {cols.map((c, j) => {
          const p = ease(frame, whAt + j * 2, 12);
          if (p <= 0) return null;
          return (
            <div
              key={c}
              style={{
                position: "absolute",
                left: stripX(j),
                top: gridTop,
                width: STRIP_W,
                height: (ROWS * rowH - (rowH - cellH)) * p,
                borderRadius: 3,
                background: COLUMN_TINT[c],
                boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${INK} 20%, transparent)`,
              }}
            />
          );
        })}

        {/* The scan: one long arrow down the column, in the page's white. */}
        <Flow points={[[stripX(AMOUNT) + STRIP_W / 2, gridTop + 8], [stripX(AMOUNT) + STRIP_W / 2, gridBottom - (rowH - cellH) - 8]]} at={byColAt + 10} dur={20} color={PAPER} width={3} head={12} />

        {/* ── Extract, load, and the transform inside ── */}
        {/* One edge round the columns and the transform, so the T sits inside
            the warehouse (ELT), not after it as a stage of its own. */}
        <div
          style={{
            position: "absolute",
            left: WH.left,
            top: gridTop - 7 - WH.pad,
            width: WH.right - WH.left,
            height: gridBottom - (rowH - cellH) + 7 + WH.pad - (gridTop - 7 - WH.pad),
            boxSizing: "border-box",
            border: `2px solid ${INK_SOFT}`,
            borderRadius: 8,
            opacity: ease(frame, transformAt - 6, 12),
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 1920 - WH.right + 18,
            top: gridTop - 7 - WH.pad + 12,
            ...note(21, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, transformAt - 2, 12),
          }}
        >
          Inside the warehouse
        </div>
        <Flow points={[[ROW_X + cols.length * CELL_W + 14, mid], [COL_X - 16, mid]]} at={extractAt} dur={24} color={INK} width={2.6} />
        <Note at={extractAt + 2} x={ROW_X + cols.length * CELL_W + 30} y={mid - h(44)}>
          <span style={{ ...note(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>Extract</span>
        </Note>
        <Note at={loadAt} x={COL_X - 104} y={mid - h(44)}>
          <span style={{ ...note(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>Load</span>
        </Note>
        <Flow points={[[COL_X + colsW + 14, mid], [T_BOX.x - 14, mid]]} at={transformAt} dur={10} color={inkOf.yellow} width={2.6} head={12} />
        <Box x={T_BOX.x} y={mid - h(T_BOX.h) / 2} w={T_BOX.w} h={h(T_BOX.h)} at={transformAt + 4} title="Transform" tone="look" size={25} />
        <Note at={aeAt} x={T_BOX.x} y={mid + h(T_BOX.h) / 2 + h(14)}>
          <span style={{ ...note(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>The analytics engineer&rsquo;s part</span>
        </Note>

        {/* ── The trap: heavy analytics on the app's database ── */}
        <Box x={ROW_X} y={y(760)} w={300} h={h(60)} at={heavyAt + 2} title="Heavy analytics query" tone="bad" size={22} />
        <Flow points={[[ROW_X + 150, y(760) - 8], [ROW_X + 150, gridBottom + 10]]} at={heavyAt + 6} color={ACCENT} width={5} head={16} />
        <Note at={competesAt} x={ROW_X + 330} y={y(760) + h(14)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Competes with the app<span style={{ opacity: ease(frame, badlyAt, 10) }}>, and runs badly</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
