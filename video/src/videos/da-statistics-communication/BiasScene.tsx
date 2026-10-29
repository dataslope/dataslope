import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BIAS } from "./data";
import { at, Axes, Bracket, Dots, Drift, mulberry32, OK_INK, type Scale, VLine } from "./parts";

const BAR_X = 340;
const BAR_W = 1160;
const BAR_Y = 330;
const BAR_H = 44;
const SCORE: Scale = { lo: 5.6, hi: 7.6, a: 420, b: 1500 };
const ROWS = [
  { n: "20", y: 540 },
  { n: "200", y: 640 },
  { n: "2000", y: 740 },
];
const BASE = 830;
const NOTE_X = 1540;
/** The strips of who churned and who stayed, on a 0 to 10 scale. */
const STRIP: Scale = { lo: 0, hi: 10, a: 420, b: 1500 };
const STRIP_ROWS = [
  { key: "churned", y: 490 },
  { key: "stayed", y: 550 },
] as const;
const STRIP_BASE = 600;
/** Each strip's dots spread a little up and down, the same on every frame. */
const SPREAD = (() => {
  const r = mulberry32(21);
  return Array.from({ length: 80 }, () => (r() - 0.5) * 20);
})();

/**
 * Question 4. The video's own 100,000 users: the 22.6% who churned, the
 * unhappiest likeliest among them, are out of reach of a survey of users.
 * Thirty surveys at each of three sizes land around 6.56, never near the
 * true 5.98: a bigger sample tightens on the wrong number.
 */
export const BiasScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("bias").from;
  const qAt = n.word("bias", "Question");
  const textAt = n.word("bias", "What is sampling bias");
  const usersAt = n.word("bias-who", "your app's users");
  // The users arrive as the question ends, so it never sits on the question alone.
  const distortAt = n.word("bias", "distort results");
  const leftAt = n.word("bias-who", "everyone who already left");
  const quarterAt = n.word("bias-who", "nearly a quarter");
  const unhappiestAt = n.word("bias-who", "the unhappiest");
  const survivorAt = n.word("bias-who", "survivorship bias");
  const pollAt = n.word("bias-who", "A web poll");
  const selfAt = n.word("bias-who", "self-selection");
  const truthAt = n.word("bias-truth", "Across all");
  const truthNumAt = n.word("bias-truth", "five point nine eight");
  const stayedNumAt = n.word("bias-truth", "six point five six");
  const twentyAt = n.word("bias-bigger", "Survey twenty");
  const scatterAt = n.word("bias-bigger", "the answers scatter");
  const thousandAt = n.word("bias-bigger", "Survey two thousand");
  const settleAt = n.word("bias-bigger", "they settle");
  const noiseAt = n.word("bias-bigger", "shrinks the noise");
  const nothingAt = n.word("bias-bigger", "does nothing about the bias");
  const fixAt = n.word("bias-fix", "The fix is the design");
  const randomAt = n.word("bias-fix", "a random sample of everyone");
  const strataAt = n.word("bias-fix", "a set share from each group");
  const exitAt = n.word("bias-fix", "run an exit survey");
  const end = n.beat("metric-in").to;
  // The strips clear before the surveys' axis draws.
  const stripsOut = truthAt - 14;

  const barP = ease(frame, distortAt - 4, 18);
  const churnP = ease(frame, leftAt, 14);
  const churnX = BAR_X + BAR_W * (1 - BIAS.churned);
  const pct = `${fmt(BIAS.churned * 100, 1)}%`;

  const rowAt = [twentyAt, thousandAt - 6, thousandAt + 4];
  const dots = ROWS.flatMap((row, r) =>
    BIAS.surveys[row.n].map((v, i) => ({ x: at(SCORE, v), y: y(row.y), at: rowAt[r] + i * 0.8 })),
  );
  const tx = at(SCORE, BIAS.truth);
  const sx = at(SCORE, BIAS.stayed);
  const linesTop = y(490);
  const linesBottom = y(BASE) - 6;
  const xs: Scale = { ...SCORE };
  const ys: Scale = { lo: 0, hi: 1, a: y(BASE), b: y(490) };

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={usersAt} level={-34} />
      <Sfx name="el-scratch" at={leftAt + 2} level={-32} />
      <Sfx name="el-sprinkle" at={twentyAt} level={-34} />
      <Sfx name="el-sprinkle" at={thousandAt} level={-34} />
      <Sfx name="el-pop" at={nothingAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is sampling bias, and how can it distort results?
        </QuestionCard>

        {/* ── Who the survey can reach ── */}
        <Note at={distortAt - 4} x={120} y={y(BAR_Y) + h(6)}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap", ...TABULAR }}>{BIAS.users.toLocaleString("en-US")} users</span>
        </Note>
        <div
          style={{
            position: "absolute",
            left: BAR_X,
            top: y(BAR_Y),
            width: (churnX - BAR_X) * barP,
            height: h(BAR_H),
            background: BAR,
            opacity: 0.85,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: churnX,
            top: y(BAR_Y),
            width: (BAR_X + BAR_W - churnX) * barP,
            height: h(BAR_H),
            background: `color-mix(in srgb, ${ACCENT} ${15 + 60 * churnP}%, ${BAR})`,
            opacity: 0.85,
          }}
        />
        <Note at={usersAt + 8} x={BAR_X} y={y(BAR_Y + BAR_H) + h(10)}>
          <span style={{ ...note(23, BLUE_INK), whiteSpace: "nowrap" }}>stayed: the users a survey reaches</span>
        </Note>
        <Note at={quarterAt - 2} x={churnX} y={y(BAR_Y + BAR_H) + h(10)}>
          <div style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap", ...TABULAR }}>churned: {pct}</div>
          <div style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap" }}>mostly the unhappiest</div>
        </Note>
        <Note at={survivorAt - 2} x={NOTE_X} y={y(BAR_Y) - h(4)}>
          <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap" }}>survivorship bias</span>
        </Note>
        <Note at={selfAt - 2} x={NOTE_X} y={y(BAR_Y) + h(34)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <span style={{ opacity: ease(frame, pollAt, 10) }}>a web poll: </span>
            <b>self-selection</b>
          </span>
        </Note>

        {/* ── Who left: forty scores from each side ── */}
        <Axes
          x={STRIP}
          y={{ lo: 0, hi: 1, a: y(STRIP_BASE), b: y(STRIP_ROWS[0].y) }}
          xTicks={[0, 2, 4, 6, 8, 10]}
          xTitle="each dot: one user's satisfaction score, out of 10"
          at={unhappiestAt - 4}
          out={stripsOut}
        />
        {STRIP_ROWS.map((row, r) => (
          <React.Fragment key={row.key}>
            <Note at={unhappiestAt + r * 6 - 4} out={stripsOut} x={120} y={y(row.y) - 16}>
              <span style={{ ...label(23, r === 0 ? ACCENT_INK : BLUE_INK), whiteSpace: "nowrap" }}>{row.key}</span>
            </Note>
            <Dots
              dots={BIAS.strips[row.key].map((v, i) => ({
                x: at(STRIP, v),
                y: y(row.y) + SPREAD[r * 40 + i],
                at: unhappiestAt + r * 6 + i * 0.4,
              }))}
              r={7}
              color={r === 0 ? ACCENT : BAR}
              opacity={0.6}
              out={stripsOut}
            />
          </React.Fragment>
        ))}

        {/* ── Thirty surveys at each size ── */}
        <Axes
          x={xs}
          y={ys}
          xTicks={[5.6, 6, 6.4, 6.8, 7.2, 7.6]}
          xFormat={(v) => fmt(v, 1)}
          xTitle="each dot: one survey's average score, out of 10"
          at={truthAt - 6}
        />
        {ROWS.map((row, r) => (
          <Note key={row.n} at={rowAt[r] - 4} x={120} y={y(row.y) - 16}>
            <span style={{ ...label(23, INK), whiteSpace: "nowrap", ...TABULAR }}>
              {Number(row.n).toLocaleString("en-US")} users
            </span>
          </Note>
        ))}
        <VLine
          x={tx}
          top={linesTop}
          bottom={linesBottom}
          at={truthNumAt - 4}
          color={INK}
          dash="7 6"
          width={2.4}
          side="left"
          labelY={y(452)}
          label={<span style={{ ...note(24, INK), fontWeight: 650 }}>everyone {fmt(BIAS.truth)}</span>}
        />
        <VLine
          x={sx}
          top={linesTop}
          bottom={linesBottom}
          at={stayedNumAt - 4}
          color={ACCENT}
          width={2.4}
          side="right"
          labelY={y(452)}
          label={<span style={{ ...note(24, ACCENT_INK), fontWeight: 650 }}>stayed {fmt(BIAS.stayed)}</span>}
        />
        <Dots dots={dots} r={8} opacity={0.55} />
        <Note at={scatterAt} x={NOTE_X} y={y(ROWS[0].y) - 16}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>they scatter</span>
        </Note>
        <Note at={settleAt} x={NOTE_X} y={y(ROWS[2].y) - 16}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", ...TABULAR }}>they settle, on {fmt(BIAS.stayed)}</span>
        </Note>
        <Note at={noiseAt} x={NOTE_X} y={y(ROWS[1].y) - 16}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>less noise…</span>
        </Note>
        <Bracket x0={tx} x1={sx} y={y(478)} up at={nothingAt} color={ACCENT}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the same bias</span>
        </Bracket>
        {/* In the plot's empty lower right, clear of the axis row and the notes column. */}
        {[
          { at: Math.min(fixAt + 10, randomAt), text: "the fix: a random sample of everyone" },
          { at: strataAt, text: "or stratified: a set share per group" },
          { at: exitAt, text: "for those who left: an exit survey" },
        ].map((line, i) => (
          <Note key={line.text} at={line.at - 2} x={1060} y={y(ROWS[1].y) + h(50) + i * 32}>
            <span style={{ ...note(23, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>{line.text}</span>
          </Note>
        ))}
      </Drift>
    </AbsoluteFill>
  );
};
