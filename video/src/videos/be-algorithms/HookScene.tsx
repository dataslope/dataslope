import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { halo, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Art, BAR, BLUE_FILL, BLUE_INK, Drift, HIGHLIGHT, Headline, INK, INK_SOFT, Kicker, Line, OK_INK, Svg, VRule } from "./parts";

/** The million drawn as a square, a thousand items a side. */
const SQ = 440;
const SQ_X = 140;
/** The hundred: ten by ten. Drawn at full size first, then shrunk to the
 *  corner of the million it really is (ten thousandths of a side). */
const DOTS = 10;
const PITCH = 22;
const STRUCTS = ["hash map", "heap", "stack", "deque"];
const CHIP_X = 700;

/**
 * The opening. A hundred items as a ten-by-ten grid, fast; then the grid
 * shrinks into the corner of a million, a square a thousand a side, where it
 * is a speck, and the question is what the code costs there and which
 * structure keeps it cheap. Then the round: thirty-five questions, argued
 * with counts. The pangolin stands on the right.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("hook").from;
  const hundredAt = n.word("hook", "On a hundred items");
  const fastAt = n.word("hook", "almost any code is fast");
  const questionAt = n.word("hook", "The interview question");
  const millionAt = n.word("hook", "at a million");
  const structureAt = n.word("hook", "which structure keeps it cheap");
  const thirtyAt = n.word("plan", "Thirty-five questions");
  const countsAt = n.word("plan", "argued with counts");
  const eightAt = n.word("plan", "eight with a figure each");
  const threeAt = n.word("plan", "three inside those");
  const quickAt = n.word("plan", "twenty-four quickly");
  const end = n.beat("plan").to;

  const top = y(330);
  // The zoom out: the hundred's grid shrinks to its true size in the million.
  const zoom = ease(frame, millionAt, 28);
  const scale = 1 + (SQ / 1000 / PITCH - 1) * zoom;
  const square = ease(frame, millionAt + 6, 18);
  const ring = ease(frame, millionAt + 26, 10);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={from} level={-30} />
      <Sfx name="el-sprinkle" at={hundredAt} level={-31} />
      <Sfx name="el-whoosh" at={millionAt} level={-34} />
      {STRUCTS.map((s, i) => (
        <Sfx key={s} name="el-tap" at={structureAt + 6 + i * 5} level={-33} />
      ))}
      <Sfx name="el-chime" at={thirtyAt} level={-32} />

      <Drift from={0} to={end + 40}>
        <Kicker at={from - 10}>Backend engineer interview questions · Algorithms as reasoning</Kicker>
        <Headline lead="Fast at a hundred." turn="What does a million cost?" at={hundredAt} turnAt={questionAt} />

        {/* What the square shows, above it. */}
        <Line at={hundredAt} x={SQ_X} y={y(286)} size={24} weight={650} out={millionAt}>
          <Num>100</Num> items
        </Line>
        <Line at={millionAt + 10} x={SQ_X} y={y(286)} size={24} weight={650}>
          <Num>1,000,000</Num> items, a thousand a side
        </Line>

        {/* The million: a tinted square, gridded at a hundred items a cell. */}
        <Svg opacity={square}>
          <defs>
            <pattern id="be-alg-million" width={SQ / 100} height={SQ / 100} patternUnits="userSpaceOnUse" x={SQ_X} y={top}>
              <rect width={SQ / 100 - 0.9} height={SQ / 100 - 0.9} fill={BAR} opacity={0.32} />
            </pattern>
          </defs>
          <rect x={SQ_X} y={top} width={SQ} height={SQ} fill={BLUE_FILL} />
          <rect x={SQ_X} y={top} width={SQ} height={SQ} fill="url(#be-alg-million)" />
          <rect x={SQ_X} y={top} width={SQ} height={SQ} fill="none" stroke={BAR} strokeWidth={2} />
        </Svg>
        {/* The hundred, ten by ten, shrinking into its corner. */}
        <Svg>
          <g transform={`translate(${SQ_X} ${top}) scale(${scale})`}>
            {Array.from({ length: DOTS * DOTS }, (_, k) => {
              const p = ease(frame, hundredAt + (k % DOTS) + Math.floor(k / DOTS), 8);
              return <circle key={k} cx={PITCH / 2 + (k % DOTS) * PITCH} cy={PITCH / 2 + Math.floor(k / DOTS) * PITCH} r={7 * p} fill={BAR} />;
            })}
          </g>
          {ring > 0 ? (
            <circle cx={SQ_X + 2} cy={top + 2} r={10 + 6 * (1 - ring)} fill="none" stroke={HIGHLIGHT} strokeWidth={5} opacity={ring} />
          ) : null}
        </Svg>
        {/* Fast, while the hundred fills the box. */}
        <div style={{ position: "absolute", left: SQ_X + DOTS * PITCH + 24, top: top + 90, display: "flex", alignItems: "center", gap: 10, fontSize: 26, opacity: ease(frame, fastAt, 10) * (1 - ease(frame, millionAt, 10)) }}>
          <Tick at={fastAt} size={28} />
          <span style={{ ...note(26, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>fast</span>
        </div>
        <Line at={millionAt + 28} x={SQ_X + 26} y={top + 10} size={22} weight={700}>
          <span style={halo}>← the hundred</span>
        </Line>

        <VRule x={(SQ_X + SQ + CHIP_X) / 2} top={top} bottom={top + SQ} at={structureAt - 2} />

        {/* Which structure keeps it cheap. */}
        <Line at={structureAt - 2} x={CHIP_X} y={top + 20} size={26} weight={650}>
          Which structure keeps it cheap?
        </Line>
        <div style={{ position: "absolute", left: CHIP_X, top: top + 76, display: "flex", gap: 14, fontSize: 26, whiteSpace: "nowrap" }}>
          {STRUCTS.map((st, i) => (
            <span key={st} style={{ ...note(26, BLUE_INK), fontWeight: 700, opacity: ease(frame, structureAt + 6 + i * 5, 10) }}>
              {i ? <span style={{ color: INK_SOFT, fontWeight: 500, marginRight: 14 }}>·</span> : null}
              {st}
            </span>
          ))}
        </div>

        {/* The round. */}
        <Line at={thirtyAt - 2} x={CHIP_X} y={top + 236} size={30} weight={700}>
          <span style={{ color: BLUE_INK }}>
            <Num>35</Num> questions
          </span>
          <span style={{ opacity: ease(frame, countsAt, 10) }}>, argued with counts, not code</span>
        </Line>
        <div style={{ position: "absolute", left: CHIP_X, top: top + 300, display: "flex", gap: 34, fontSize: 26, whiteSpace: "nowrap" }}>
          {[
            { at: eightAt, n: 8, text: "with a figure each" },
            { at: threeAt, n: 3, text: "inside those" },
            { at: quickAt, n: 24, text: "quickly" },
          ].map((it) => (
            <span key={it.n} style={{ ...note(26, INK), opacity: ease(frame, it.at - 2, 10) }}>
              <b style={{ color: BLUE_INK }}>
                <Num>{it.n}</Num>
              </b>{" "}
              {it.text}
            </span>
          ))}
        </div>
        <Line at={quickAt + 10} x={CHIP_X} y={top + 362} size={22} color={INK_SOFT} weight={600}>
          Each answer: the structure, and its cost, counted
        </Line>

        <Art name="pangolin" at={from} left={1440} top={y(370)} h={440} />
      </Drift>
    </AbsoluteFill>
  );
};
