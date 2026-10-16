import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Pt } from "../../components/arrow";
import type { Cardinality } from "../../components/crowsfoot";
import { ease } from "../../components/motion";
import { Entity, entityLayout, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Leader } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Fig } from "./kit";
import { Drift, endSymbols, Glow, Headline, Kicker, Link, Svg } from "./parts";

/** The first half draws the two ends large: the marker at this size and
 *  stroke, on header-only boxes, so each symbol can be pointed at. */
const BIG = 58;
const BIG_STROKE = 4.2;
const VIEW_Y = 470;
const LEFT_O = 150;
const RIGHT_O = 1770;
const BOX_W = 300;
/** The boxes are drawn larger too, about the edge the line meets. */
const BOX_SCALE = 1.6;
const STUB = 260;

/** The table of ends: one row per end, the lesson's own example beside it. */
const ROW_Y = 320;
const ROW_STEP = 118;
const LEFT_X = 150;
const LEFT_W = 240;
const RIGHT_X = 600;
const RIGHT_W = 270;
const TEXT_X = 950;

type EndRow = {
  beat: string;
  left: string;
  right: string;
  from: Cardinality;
  to: Cardinality;
  /** Words that name the end's two marks, then its reading, then its example. */
  marks: string;
  reading: string;
  readAt: string;
  example: string;
  exampleAt: string;
};

const ROWS: EndRow[] = [
  {
    beat: "one",
    left: "profiles",
    right: "users",
    from: "exactly-one",
    to: "exactly-one",
    marks: "Two bars",
    reading: "Exactly one",
    readAt: "exactly one",
    example: "A profile belongs to one user.",
    exampleAt: "profile",
  },
  {
    beat: "zero-or-one",
    left: "employees",
    right: "parking_passes",
    from: "exactly-one",
    to: "zero-or-one",
    marks: "bar and a circle",
    reading: "Zero or one",
    readAt: "zero or one",
    example: "An employee gets one parking pass, at most.",
    exampleAt: "employee",
  },
  {
    beat: "one-or-many",
    left: "orders",
    right: "order_items",
    from: "exactly-one",
    to: "one-or-many",
    marks: "foot and a bar",
    reading: "One or many",
    readAt: "one or many",
    example: "An order holds at least one item.",
    exampleAt: "order holds",
  },
  {
    beat: "zero-or-many",
    left: "customers",
    right: "orders",
    from: "exactly-one",
    to: "zero-or-many",
    marks: "foot and a circle",
    reading: "Zero or many",
    readAt: "zero or many",
    example: "A customer might not have ordered yet.",
    exampleAt: "customer",
  },
  {
    beat: "m2m",
    left: "students",
    right: "courses",
    from: "zero-or-many",
    to: "zero-or-many",
    marks: "feet at both ends",
    reading: "Many to many",
    readAt: "many-to-many",
    example: "Students and courses.",
    exampleAt: "students",
  },
];

/** A two-line callout on a magnified end: what the symbol tells (the most,
 *  the least), then its value, with a short leader to the symbol. */
const Callout: React.FC<{
  x: number;
  lineY: number;
  above: boolean;
  title: string;
  titleAt: number;
  value: string;
  valueAt: number;
}> = ({ x, lineY, above, title, titleAt, value, valueAt }) => {
  const top = above ? lineY - 168 : lineY + 92;
  const titleEl = (
    <Ink at={titleAt} dur={12} style={{ position: "relative" }}>
      <span style={label(22, INK_SOFT)}>{title}</span>
    </Ink>
  );
  const valueEl = (
    <Ink at={valueAt} dur={12} style={{ position: "relative" }}>
      <span style={{ ...body(36, true), color: ACCENT_INK }}>{value}</span>
    </Ink>
  );
  return (
    <>
      <Leader
        points={above ? [[x, lineY - 84], [x, lineY - 40]] : [[x, lineY + 84], [x, lineY + 40]]}
        at={titleAt}
        dur={10}
        dot={false}
        color={INK_SOFT}
      />
      <div
        style={{
          position: "absolute",
          left: x,
          top,
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          whiteSpace: "nowrap",
        }}
      >
        {above ? valueEl : titleEl}
        {above ? titleEl : valueEl}
      </div>
    </>
  );
};

/**
 * Crow's feet, read. First the two ends of the customers and orders line,
 * magnified: next to the box is the most (a bar for one, a foot for many),
 * farther out the least (a circle for zero, a bar for one). Then the four
 * ends with the lesson's examples, one row each, and feet on both ends.
 */
export const EndsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const endsFrom = n.beat("ends").from;
  const drawsAt = n.word("ends", "draws");
  const answersAt = n.word("ends", "answers");
  const twoMarksAt = n.word("ends", "two marks");
  const nextToAt = n.word("max", "Next to the box");
  const mostAt = n.word("max", "the most");
  const barOneAt = n.word("max", "bar means one");
  const footManyAt = n.word("max", "foot means many");
  const fartherAt = n.word("min", "Farther out");
  const leastAt = n.word("min", "the least");
  const circleZeroAt = n.word("min", "circle means zero");
  const barOne2At = n.word("min", "bar means one");
  const oneFrom = n.beat("one").from;
  const m2mTo = n.beat("m2m").to;

  // ── Part one: the two ends, magnified ──
  const Y0 = y(VIEW_Y);
  // Laid out so that, scaled about the edge the line meets, each box spans
  // LEFT_O (or RIGHT_O) to that edge.
  const custL = useEntityLayout({ x: LEFT_O + BOX_W * BOX_SCALE - BOX_W, y: Y0, width: BOX_W, name: "customers", columns: [] });
  const ordR = useEntityLayout({ x: RIGHT_O - BOX_W * BOX_SCALE, y: Y0, width: BOX_W, name: "orders", columns: [] });
  const ly = custL.anchor("right")[1];
  const lTip = custL.anchor("right");
  const lBack: Pt = [lTip[0] + STUB, ly];
  const rTip = ordR.anchor("left");
  const rBack: Pt = [rTip[0] - STUB, ly];
  const lSym = endSymbols(lTip, lBack, "exactly-one", BIG);
  const rSym = endSymbols(rTip, rBack, "zero-or-many", BIG);
  const lineY = ly;
  const glowR = 34;
  const partOne = 1 - ease(frame, oneFrom - 14, 12);
  const viewIn = ease(frame, endsFrom - 6, 14);

  // ── Part two: the table of ends ──
  const rows = ROWS.map((r, i) => {
    const top = y(ROW_Y + i * ROW_STEP);
    const left = entityLayout({ x: LEFT_X, y: top, width: LEFT_W, name: r.left, columns: [] });
    const right = entityLayout({ x: RIGHT_X, y: top, width: RIGHT_W, name: r.right, columns: [] });
    // The first row waits for the magnified ends to clear.
    const start = i === 0 ? n.beat(r.beat).from + 10 : n.beat(r.beat).from;
    return {
      ...r,
      top,
      left,
      right,
      start,
      // Never before its own line has started to draw.
      marksAt: Math.max(n.word(r.beat, r.marks), start + 8),
      readingAt: n.word(r.beat, r.readAt),
      exAt: n.word(r.beat, r.exampleAt),
      next: i + 1 < ROWS.length ? n.beat(ROWS[i + 1].beat).from : m2mTo + 30,
    };
  });

  return (
    <AbsoluteFill>
      {/* ── Sound: the two ends, then each end of the table as it is drawn ── */}
      <Sfx name="el-pencil" at={drawsAt - 2} level={-33} />
      <Sfx name="el-tap" at={answersAt} level={-29} />
      <Sfx name="el-tap" at={mostAt} level={-30} />
      <Sfx name="el-tap" at={leastAt} level={-30} />
      {rows.map((r) => (
        <Sfx key={r.beat} name="el-pop" at={r.marksAt} level={-30} />
      ))}

      <Kicker at={endsFrom - 40}>Cardinality</Kicker>
      <Headline lead="Every end makes" at={endsFrom - 4} turn="two marks." turnAt={twoMarksAt - 4} out={oneFrom - 10} />
      <Headline lead="Read the far end" at={oneFrom - 2} turn="as a count." turnAt={oneFrom + 10} />

      {/* ── Part one ── */}
      <AbsoluteFill style={{ opacity: partOne }}>
        <Drift from={drawsAt} to={oneFrom} scale={0.02} origin={[960, lineY]}>
        <Fig n="3" at={endsFrom} x={LEFT_O} y={y(268)}>
          The two ends of one line, magnified
        </Fig>
        {/* The washes go under the marks they light. */}
        {[
          { c: (lSym.near), at: twoMarksAt, out: twoMarksAt + 16 },
          { c: (lSym.far), at: twoMarksAt + 5, out: twoMarksAt + 21 },
          { c: (rSym.near), at: twoMarksAt + 10, out: twoMarksAt + 26 },
          { c: (rSym.far), at: twoMarksAt + 15, out: twoMarksAt + 31 },
          { c: (lSym.near), at: nextToAt, out: fartherAt },
          { c: (rSym.near), at: nextToAt + 4, out: fartherAt },
          { c: (lSym.far), at: fartherAt, out: oneFrom },
          { c: (rSym.far), at: fartherAt + 4, out: oneFrom },
        ].map((g, i) => (
          <Glow key={i} c={g.c} r={glowR} at={g.at} out={g.out} />
        ))}

        <div style={{ position: "absolute", inset: 0, transform: `scale(${BOX_SCALE})`, transformOrigin: `${lTip[0]}px ${lTip[1]}px` }}>
          <Entity layout={custL} at={endsFrom - 6} />
        </div>
        <Link
          name="magnified customers end"
          points={[lTip, lBack]}
          at={endsFrom}
          dur={14}
          size={BIG}
          width={BIG_STROKE}
          from={{ kind: "exactly-one", at: drawsAt }}
        />
        <div style={{ position: "absolute", inset: 0, transform: `scale(${BOX_SCALE})`, transformOrigin: `${rTip[0]}px ${rTip[1]}px` }}>
          <Entity layout={ordR} at={endsFrom - 2} />
        </div>
        <Link
          name="magnified orders end"
          points={[rBack, rTip]}
          at={endsFrom + 4}
          dur={14}
          size={BIG}
          width={BIG_STROKE}
          to={{ kind: "zero-or-many", at: answersAt }}
        />
        {/* The same line runs on between the two. */}
        <Svg opacity={viewIn}>
          <line x1={lBack[0] + 16} x2={rBack[0] - 16} y1={lineY} y2={lineY} stroke={HAIRLINE} strokeWidth={3} strokeDasharray="4 10" />
        </Svg>

        <Callout lineY={lineY} x={(lSym.near)[0]} above={false} title="the most" titleAt={mostAt} value="one" valueAt={barOneAt + 4} />
        <Callout lineY={lineY} x={(rSym.near)[0]} above={false} title="the most" titleAt={mostAt + 4} value="many" valueAt={footManyAt + 4} />
        <Callout lineY={lineY} x={(lSym.far)[0]} above title="the least" titleAt={leastAt} value="one" valueAt={barOne2At + 4} />
        <Callout lineY={lineY} x={(rSym.far)[0]} above title="the least" titleAt={leastAt + 4} value="zero" valueAt={circleZeroAt + 4} />
        </Drift>
      </AbsoluteFill>

      {/* ── Part two: every end, with the lesson's example ── */}
      <Drift from={oneFrom} to={m2mTo + 60} scale={0.016} origin={[960, y(560)]}>
        <Fig n="4" at={oneFrom} x={LEFT_X} y={y(268)}>
          The four ends, and feet at both
        </Fig>
        {rows.map((r) => {
          const a = r.left.anchor("right");
          const b = r.right.anchor("left");
          const endC: Pt = [b[0] - 20, b[1]];
          const both = r.from === "zero-or-many";
          return (
            <React.Fragment key={r.beat}>
              <Glow c={endC} r={34} at={r.marksAt - 2} out={r.next} />
              {both ? <Glow c={[a[0] + 20, a[1]]} r={34} at={r.marksAt + 4} out={r.next} /> : null}
              <Entity layout={r.left} at={r.start - 8} />
              <Entity layout={r.right} at={r.start - 4} />
              <Link
                name={`${r.left.name} to ${r.right.name}`}
                points={[a, b]}
                at={r.start}
                dur={14}
                from={{ kind: r.from, at: both ? r.marksAt + 4 : r.start + 8 }}
                to={{ kind: r.to, at: r.marksAt }}
              />
              <Ink at={r.readingAt - 2} dur={14} style={{ left: TEXT_X, top: r.top - 6, whiteSpace: "nowrap" }}>
                <span style={{ ...body(36, true), color: INK }}>{r.reading}</span>
              </Ink>
              <Ink at={r.exAt - 2} dur={14} style={{ left: TEXT_X, top: r.top + 40, whiteSpace: "nowrap" }}>
                <span style={{ ...note(23, INK_SOFT) }}>{r.example}</span>
              </Ink>
            </React.Fragment>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
