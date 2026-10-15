import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, headline, HIGHLIGHT, INK, INK_SOFT, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { ILLUSTRATIONS, LEFT, nullRows, ON, SQL_LINES, type Value, VANISHED, VIDEO, WHERE, FILTER_LINE } from "./data";
import {
  type CellMark,
  Fig,
  joinCols,
  KEPT_INK,
  KEPT_WASH,
  LOST,
  LOST_INK,
  Mono,
  rowCount,
  Table,
  tableGeometry,
  tableRows,
  Underline,
} from "./kit";

const SIZE = 26;
const WIDTHS = [140, 160, 140];
const TABLE_W = WIDTHS.reduce((s, w) => s + w, 0);
const GAP = 100;
const X0 = 120;
const TITLE_TOP = 248;
const TABLE_TOP = 296;

/** The filter line of each listing, minus its indent: what the title quotes. */
const filterOf = (lines: readonly string[]) => lines[FILTER_LINE].trim();

/**
 * Compare and rule: the three answers side by side, seven rows, then two,
 * then four, with the two customers the WHERE lost set out under its table.
 */
export const CompareScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("compare").from;
  const answersAt = n.word("compare", "three answers");
  const sevenAt = n.word("compare", "Seven rows");
  const twoAt = n.word("compare", "then two");
  const fourAt = n.word("compare", "then four");
  const ruleAt = n.beat("rule").from;
  const inOnAt = n.word("rule", "in ON");
  const boxes = pop(frame, ruleAt + 4, fps, 16);

  const top = y(TABLE_TOP);
  const g = tableGeometry(SIZE);
  const tables: {
    title: React.ReactNode;
    rows: Value[][];
    at: number;
    countAt: number;
    marks: CellMark[];
  }[] = [
    {
      title: <>Left join</>,
      rows: LEFT.rows,
      at: start - 6,
      countAt: sevenAt,
      marks: nullRows(LEFT.rows).map((row, k) => ({ row, at: start + 10 + k * 3, color: HIGHLIGHT })),
    },
    {
      title: (
        <>
          Plus <Mono weight={600}>{filterOf(SQL_LINES.where)}</Mono>
        </>
      ),
      rows: WHERE.rows,
      at: start + 2,
      countAt: twoAt,
      marks: [],
    },
    {
      title: (
        <>
          Plus <Mono weight={600}>{filterOf(SQL_LINES.on)}</Mono> in <Mono weight={600}>ON</Mono>
        </>
      ),
      rows: ON.rows,
      at: start + 10,
      countAt: fourAt,
      marks: nullRows(ON.rows).map((row, k) => ({ row, at: fourAt + 4 + k * 3, color: KEPT_WASH })),
    },
  ];
  const bottoms = tables.map((t) => tableRows(top, SIZE, t.rows.map(() => 1)).bottom);
  const countH = 34;
  const ruleTop = Math.max(...bottoms) + countH + h(64);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 14} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Same data,
        </Ink>
        <Ink
          at={answersAt - 2}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          three answers.
        </Ink>
      </div>
      <Fig n="5" at={start - 8} x={X0} y={y(196)}>
        The three queries, side by side
      </Fig>

      {tables.map((t, i) => {
        const x = X0 + i * (TABLE_W + GAP);
        const count = ease(frame, t.countAt - 2, 10);
        return (
          <React.Fragment key={i}>
            <Ink at={t.at - 2} dur={14} style={{ left: x + 14, top: y(TITLE_TOP), whiteSpace: "nowrap" }}>
              <span style={{ ...label(22, INK), fontWeight: 560 }}>{t.title}</span>
            </Ink>
            <Table
              x={x}
              top={top}
              size={SIZE}
              at={t.at}
              cols={joinCols(LEFT.fields).map((c, k) => ({ ...c, width: WIDTHS[k] }))}
              rows={t.rows}
              rowAt={t.rows.map((_, r) => t.at + 6 + r * 2)}
              marks={t.marks}
            />
            {/* The row count, the way psql prints it, marked as it is spoken:
                the wash is the span's own background, so it fits the words. */}
            <Ink at={t.at + 10} dur={12} style={{ left: x + 14, top: bottoms[i] + 8, height: countH - 6, display: "flex", alignItems: "center" }}>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 21,
                  color: count > 0.5 ? INK : INK_SOFT,
                  whiteSpace: "nowrap",
                  padding: "2px 0.4em",
                  margin: "0 -0.4em",
                  backgroundImage: `linear-gradient(${HIGHLIGHT}, ${HIGHLIGHT})`,
                  backgroundSize: `${count * 100}% 100%`,
                  backgroundRepeat: "no-repeat",
                }}
              >
                {rowCount(t.rows.length)}
              </span>
            </Ink>
          </React.Fragment>
        );
      })}

      {/* The customers the WHERE lost, set out under its table: not rows of
          the result, so drawn as empty dashed slots with the name struck. */}
      {VANISHED.map((name, k) => {
        const x = X0 + TABLE_W + GAP;
        const t = bottoms[1] + countH + h(30) + k * (g.rowH + 8);
        const p = ease(frame, twoAt + 6 + k * 5, 12);
        const strike = ease(frame, twoAt + 14 + k * 5, 10);
        if (p <= 0) return null;
        return (
          <div
            key={name}
            style={{
              position: "absolute",
              left: x,
              top: t,
              width: TABLE_W,
              height: g.rowH,
              border: `2px dashed ${LOST}`,
              borderRadius: 6,
              opacity: p,
              transform: `translateY(${(1 - p) * -10}px)`,
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              boxSizing: "border-box",
              gap: 26,
            }}
          >
            <span style={{ position: "relative", fontFamily: MONO, fontSize: SIZE, color: LOST_INK, whiteSpace: "nowrap" }}>
              {name}
              <span
                style={{
                  position: "absolute",
                  left: -4,
                  top: "50%",
                  height: 3,
                  marginTop: -1,
                  width: `calc((100% + 8px) * ${strike})`,
                  background: LOST,
                }}
              />
            </span>
            <span style={{ ...body(26, true), color: LOST_INK, whiteSpace: "nowrap" }}>vanished</span>
          </div>
        );
      })}

      <Ink at={ruleAt - 6} dur={22} style={{ left: X0, top: ruleTop, width: 1220 }}>
        <div style={{ height: 2, background: INK, width: 140, marginBottom: 26 }} />
        {/* Broken by sense, not by width: the condition, then the rule. */}
        <div style={{ ...headline(46, true), color: INK, lineHeight: 1.16 }}>
          <div>To keep every row on the left,</div>
          <div>
            filter the right table{" "}
            <Underline at={inOnAt - 2} color={KEPT_INK}>
              in <Mono weight={600}>ON</Mono>
            </Underline>
            , not in <Mono weight={600}>WHERE</Mono>.
          </div>
        </div>
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="ljt-mailboxes"
          style={{
            position: "absolute",
            left: 1440,
            top: ruleTop - 16,
            width: 360,
            height: 230,
            opacity: boxes,
            transform: `translateY(${bob(frame, 4, 110) + (1 - boxes) * 30}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
