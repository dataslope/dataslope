import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LOOP } from "./data";
import type { Pt } from "../../components/arrow";
import { ChipFace, Drift, FIG_Y, Headline, InlineArrow, lerp, Out, PathArrow, pulse, Spot, Svg, TOKEN, UnderBracket, X0 } from "./parts";

const SIZE = 28;
const GAP = 10;
const ROW0 = 372;
const ROW_STEP = 70;
const CTX_X = 176;
/** Width of a chip of `text` at SIZE: JetBrains Mono advances 0.6 em. */
const chipW = (text: string) => text.length * 0.6 * SIZE + 2 * Math.round(SIZE * 0.4) + 4;
/** Each context chip's left edge, in a row. */
const lefts = (ctx: readonly string[]) => {
  const out: number[] = [];
  let x = CTX_X;
  for (const t of ctx) {
    out.push(x);
    x += chipW(t) + GAP;
  }
  return { lefts: out, right: x - GAP };
};
const ARROW_W = 40;
/** The right column: the loop as a ring, then the missing plan, the
 *  weights, and what comes out of them. */
const RX = 1140;
const RING = { cx: 1450, cy: 590, r: 150 };
/** The three stations round the ring, clockwise from the top, in degrees. */
const STATIONS = [-90, 30, 150];
const ARC_GAP = 16;
const arc = (from: number, to: number): Pt[] =>
  Array.from({ length: 81 }, (_, i) => {
    const a = ((from + ((to - from) * i) / 80) * Math.PI) / 180;
    return [RING.cx + RING.r * Math.cos(a), RING.cy + RING.r * Math.sin(a)] as Pt;
  });

/**
 * Generation as the lesson's toy loop runs it, one row per step: the context
 * so far, and the token picked next, which joins the context of the row
 * below. Then what is not in the loop: a plan, and a database. What the model
 * knows is in its weights, the ball of yarn, and a fact and an invented
 * citation come out of it the same way.
 */
export const LoopScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const loopFrom = n.beat("loop").from;
  const tokenAt = n.word("loop", "token");
  const addsAt = n.word("loop", "adds");
  const runsAt = n.word("loop", "runs again");
  const longerAt = n.word("loop", "longer");
  const theAt = n.word("again", "The", { nth: 1 });
  const catAt = n.word("again", "cat");
  const satAt = n.word("again", "sat");
  const onAt = n.word("again", "on");
  const the2At = n.word("again", "the", { nth: 2 });
  const matAt = n.word("again", "mat");
  const doneAt = n.word("again", "done");
  const missingAt = n.word("plan", "missing");
  const aPlanAt = n.word("plan", "a plan");
  const eachStepAt = n.word("plan", "each step");
  const reasonableAt = n.word("plan", "reasonable");
  const advanceAt = n.word("plan", "advance");
  const databaseAt = n.word("weights", "database");
  const knowsAt = n.word("weights", "knows");
  const weightsAt = n.word("weights", "weights");
  const tunedAt = n.word("weights", "tuned");
  const guessesAt = n.word("weights", "guesses");
  const factAt = n.word("same", "fact");
  const citationAt = n.word("same", "citation");
  const machineryAt = n.word("same", "machinery");
  const sureAt = n.word("same", "sure");
  const whatAt = n.word("token-in", "token");
  const end = n.beat("token").from;

  // When each row's context lands, and when its next token is picked.
  const ctxAt = [loopFrom, addsAt - 2, onAt - 10, the2At - 10, matAt - 10, doneAt - 12];
  const nextAt = [tokenAt, longerAt, onAt, the2At, matAt, doneAt];
  const rowY = (i: number) => y(ROW0) + i * h(ROW_STEP);
  const geo = LOOP.map((s) => lefts(s.context));
  // "The, cat, sat": the first chips named as the beat runs through them.
  const named = (i: number, j: number | "next") =>
    (i === 0 && j === 0 ? pulse(frame, theAt - 2, 16) : 0) +
    (i === 0 && j === "next" ? pulse(frame, catAt - 2, 16) : 0) +
    (i === 1 && j === "next" ? pulse(frame, satAt - 2, 16) : 0) +
    (i === LOOP.length - 1 && j !== "next" ? pulse(frame, whatAt - 4 + (j as number) * 3, 16) : 0);

  return (
    <AbsoluteFill>
      {/* ── Sound: each pick landing, the plan's absence, the yarn, the two answers ── */}
      {nextAt.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t + 2} level={-26} />
      ))}
      <Sfx name="el-whoosh" at={addsAt} level={-36} />
      <Sfx name="el-pencil" at={missingAt} level={-35} />
      <Sfx name="el-pop" at={databaseAt - 2} level={-30} />
      <Sfx name="el-pencil" at={factAt - 4} level={-36} />
      <Sfx name="el-pencil" at={citationAt - 4} level={-36} />

      <Headline lead="Pick one, add it," turn="run again." at={loopFrom - 6} turnAt={runsAt - 4} out={missingAt - 10} />
      <Headline lead="No plan," turn="no database." at={aPlanAt - 2} turnAt={databaseAt - 4} />

      <Drift from={loopFrom} to={end} amount={0.012} origin="30% 55%">
        <FigLabel n="2" title="The lesson's toy model, one step a row" at={loopFrom} x={X0} y={y(FIG_Y)} />

        {LOOP.map((s, i) => {
          const g = geo[i];
          const inAt = ctxAt[i];
          const pickAt = nextAt[i];
          const rowP = ease(frame, inAt, 10);
          if (rowP <= 0) return null;
          // The newest context chip arrives from the row above, where it was picked.
          const fly = i > 0 ? ease(frame, inAt, 14) : 1;
          const fromX = geo[i - 1]?.right ?? 0;
          const flyFromX = i > 0 ? fromX + 14 + ARROW_W + 14 : 0;
          const focusNext = ease(frame, pickAt, 8) * (1 - (i < LOOP.length - 1 ? ease(frame, ctxAt[i + 1], 12) : 0));
          const done = s.next === "<end>";
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  position: "absolute",
                  left: X0,
                  top: rowY(i) + 10,
                  ...label(21, INK_SOFT),
                  opacity: rowP,
                  transform: `scale(${1 + 0.35 * pulse(frame, eachStepAt + i * 5, 16)})`,
                }}
              >
                {i + 1}
              </div>
              {s.context.map((t, j) => {
                const last = i > 0 && j === s.context.length - 1;
                const x = last ? lerp(flyFromX, g.lefts[j], fly) : g.lefts[j];
                const yy = last ? lerp(rowY(i - 1), rowY(i), fly) : rowY(i);
                return (
                  <div key={j} style={{ position: "absolute", left: x, top: yy, opacity: last ? 1 : rowP }}>
                    <ChipFace text={t} size={SIZE} focus={named(i, j)} />
                  </div>
                );
              })}
              <div
                style={{
                  position: "absolute",
                  left: g.right + 14,
                  top: rowY(i) + 12,
                  opacity: ease(frame, pickAt - 6, 8),
                }}
              >
                <InlineArrow width={ARROW_W} size={24} />
              </div>
              <div
                style={{
                  position: "absolute",
                  left: g.right + 14 + ARROW_W + 14,
                  top: rowY(i),
                  opacity: ease(frame, pickAt, 8),
                  transform: `translateY(${(1 - ease(frame, pickAt, 10)) * -12}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <ChipFace text={s.next} size={SIZE} focus={Math.max(focusNext, named(i, "next"), pulse(frame, eachStepAt + i * 5, 16))} />
                {done ? <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>the token that means done</span> : null}
              </div>
            </React.Fragment>
          );
        })}
        <UnderBracket
          x0={CTX_X}
          x1={geo[LOOP.length - 1].right}
          y={rowY(LOOP.length - 1) + h(62)}
          at={whatAt - 6}
        />
        <Note at={whatAt} x={CTX_X} y={rowY(LOOP.length - 1) + h(62) + 10}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>tokens, but what is one?</span>
        </Note>
      </Drift>

      {/* Fig. 3: the same loop as a ring, until the plan's absence takes the column. */}
      <Out at={missingAt - 4}>
        <FigLabel n="3" title="One step, repeated" at={tokenAt - 4} x={RX} y={y(FIG_Y)} />
        {STATIONS.map((a, i) => {
          const next = STATIONS[(i + 1) % STATIONS.length] + (i === STATIONS.length - 1 ? 360 : 0);
          return (
            <PathArrow
              key={i}
              line={arc(a + ARC_GAP, next - ARC_GAP).map(([px, py]) => [px, y(py)] as Pt)}
              at={[tokenAt, addsAt, runsAt][i] - 2}
              dur={16}
              color={INK_SOFT}
              width={2.4}
              head={14}
            />
          );
        })}
        {STATIONS.map((a, i) => {
          const rad = (a * Math.PI) / 180;
          const px = RING.cx + RING.r * Math.cos(rad);
          const py = y(RING.cy + RING.r * Math.sin(rad));
          const at = [loopFrom, tokenAt, addsAt][i];
          const glow = pulse(frame, [runsAt + 8, tokenAt, addsAt][i], 20);
          const text = ["run the model", "pick a token", "add it to the end"][i];
          const place: React.CSSProperties =
            i === 0
              ? { left: px, top: py - 54, transform: "translateX(-50%)" }
              : i === 1
                ? { left: px + 22, top: py - 6 }
                : { right: 1920 - px + 22, top: py - 6 };
          return (
            <React.Fragment key={i}>
              <Svg opacity={ease(frame, at, 10)}>
                <circle cx={px} cy={py} r={7 + 3 * glow} fill={TOKEN} />
              </Svg>
              <div style={{ position: "absolute", ...place, opacity: ease(frame, at, 12), whiteSpace: "nowrap", ...note(24, INK), fontWeight: 600 }}>
                {text}
              </div>
            </React.Fragment>
          );
        })}
        {/* Each new token goes once round the ring. */}
        {nextAt.slice(2).map((t, i) => {
          const p = (frame - (t - 12)) / 12;
          if (p <= 0 || p >= 1) return null;
          const a = ((-90 + 360 * p) * Math.PI) / 180;
          return (
            <Svg key={i}>
              <circle cx={RING.cx + RING.r * Math.cos(a)} cy={y(RING.cy + RING.r * Math.sin(a))} r={9} fill={TOKEN} />
            </Svg>
          );
        })}
      </Out>

      {/* What the loop does not have. */}
      <Note at={aPlanAt - 2} x={RX} y={y(FIG_Y) - 4} dim={databaseAt}>
        <div style={{ ...body(32), color: INK, whiteSpace: "nowrap" }}>Each step sees only the row it is on.</div>
        <div style={{ ...note(22, INK_SOFT), marginTop: 10, whiteSpace: "nowrap", opacity: ease(frame, reasonableAt, 12) }}>
          The sentence comes from steps that were each reasonable,
        </div>
        <div style={{ ...note(22, INK_SOFT), marginTop: 4, whiteSpace: "nowrap", opacity: ease(frame, advanceAt - 6, 12) }}>
          not from anything that decided it in advance.
        </div>
      </Note>

      {/* What it knows: the weights, a ball of many strands with no labelled drawer. */}
      <Spot id="llm-tokens-yarn" at={knowsAt - 4} left={RX + 10} top={y(470)} width={300} height={300} />
      <Note at={weightsAt - 2} x={RX + 340} y={y(470) + 40}>
        <div style={{ ...body(32), color: INK, whiteSpace: "nowrap" }}>Its weights</div>
        <div style={{ ...note(22, INK_SOFT), marginTop: 8, whiteSpace: "nowrap", opacity: ease(frame, tunedAt, 12) }}>
          numbers tuned in training
        </div>
        <div style={{ ...note(22, INK_SOFT), marginTop: 4, whiteSpace: "nowrap", opacity: ease(frame, guessesAt, 12) }}>
          until its guesses matched real text
        </div>
      </Note>
      {[
        { at: factAt, text: "a well known fact", x: RX + 10 },
        { at: citationAt, text: "an invented citation", x: RX + 300 },
      ].map((o, k) => (
        <React.Fragment key={k}>
          <Leader
            points={[
              // From just under the ball, clear of its trailing strand.
              [RX + 80 + k * 40, y(470) + 312],
              [o.x + 80, y(470) + h(318)],
            ]}
            at={o.at - 6}
            dur={12}
            color={INK_SOFT}
            dot={false}
          />
          <Note at={o.at - 2} x={o.x} y={y(470) + h(326)}>
            <span
              style={{
                ...note(24, INK),
                fontWeight: 600,
                whiteSpace: "nowrap",
                display: "inline-block",
                transform: `scale(${1 + 0.05 * pulse(frame, sureAt - 4 + k * 4, 18)})`,
              }}
            >
              {o.text}
            </span>
          </Note>
        </React.Fragment>
      ))}
      <Note at={machineryAt - 2} x={RX + 10} y={y(470) + h(326) + 44}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>the same machinery, and just as sure</span>
      </Note>
    </AbsoluteFill>
  );
};
