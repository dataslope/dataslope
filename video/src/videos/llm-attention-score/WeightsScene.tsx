import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, halo, INK, INK_SOFT, label, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { D, ROOT, three, TOKENS, TROPHY, two } from "./data";
import {
  DATA,
  DATA_TINT,
  Fade,
  FIG_Y,
  Headline,
  KEY,
  Kicker,
  Mark,
  POINT,
  POINT_INK,
  pulse,
  Svg,
  Swap,
  Tag,
  TokenChip,
  X0,
} from "./parts";

// ═══ Scene 3: scale, then softmax in two steps ═════════════════════════════

const C = { chip: X0, dot: 360, score: 620, power: 900, weight: 1160 };
const NUM = 34;

/** e with a superscript, set in the label face: "e to the score". */
const EScore: React.FC<{ color?: string }> = ({ color = INK_SOFT }) => (
  <span style={{ ...label(23, color), whiteSpace: "nowrap" }}>
    e<sup style={{ fontSize: "0.7em", marginLeft: 1 }}>score</sup>
  </span>
);

export const WeightsScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("scale").from;
  const manyAt = n.word("scale", "many more numbers");
  const bigAt = n.word("scale", "big");
  const topAt = n.word("scale", "top one");
  const dividedAt = n.word("root", "divided");
  const squareAt = n.word("root", "square root");
  const howManyAt = n.word("root", "how many numbers");
  const rootTwoAt = n.word("root", "root two");
  const smAt = n.word("softmax", "softmax");
  const stepsAt = n.word("softmax", "two steps");
  const raiseAt = n.word("softmax", "Raise e");
  const eachScoreAt = n.word("softmax", "each score");
  const divideAt = n.word("divide", "divide");
  const totalAt = n.word("divide", "total");
  const trophyAt = n.word("weights", "Trophy");
  const fourSixAt = n.word("weights", "point four six");
  const biggestAt = n.word("weights", "biggest share");
  const addUpAt = n.word("weights", "add up to one");

  const headY = y(385);
  const rowY = (i: number) => y(450) + i * 88;
  const rows = TROPHY.rows;
  const scoreIn = (i: number) => rootTwoAt + 6 + i * 5;
  const powerIn = (i: number) => eachScoreAt + i * 5;
  const weightIn = (i: number) => totalAt + 8 + i * 5;
  const swell = pulse(frame, bigAt - 4, 34);

  // Fig. 6: the three e-powers end to end, then the same bar read as shares of one.
  const BX = X0;
  const BY = y(775);
  const BH = 64;
  const PX = 1120 / TROPHY.total;
  const bar = ease(frame, divideAt - 4, 18);
  const share = ease(frame, trophyAt - 2, 12);
  let acc = 0;
  const segs = rows.map((r) => {
    const x = BX + acc * PX;
    acc += r.power;
    return { x, w: r.power * PX };
  });
  const end = BX + TROPHY.total * PX;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={dividedAt} level={-35} />
      {rows.map((_, i) => (
        <Sfx key={`s${i}`} name="el-tap" at={scoreIn(i)} level={-29} />
      ))}
      {rows.map((_, i) => (
        <Sfx key={`p${i}`} name="el-tap" at={powerIn(i)} level={-29} />
      ))}
      <Sfx name="el-whoosh" at={divideAt - 4} level={-33} />
      {rows.map((_, i) => (
        <Sfx key={`w${i}`} name="el-tap" at={weightIn(i)} level={-28} />
      ))}
      <Sfx name="el-tap" at={fourSixAt} level={-23} />

      <Kicker at={from - 10}>Attention, by hand</Kicker>
      <Headline lead="Scale the scores," turn="then softmax." at={from} turnAt={smAt - 2} />

      {/* ── Fig. 5: from dot products to weights ── */}
      <FigLabel n="5" title="From dot products to weights" at={from} x={X0} y={y(FIG_Y)} />
      <Fade at={from} style={{ left: 0, top: headY, width: 1500 }}>
        <span style={{ position: "absolute", left: C.dot, ...label(23, INK_SOFT), whiteSpace: "nowrap" }}>Dot product</span>
        <span style={{ position: "absolute", left: C.score, ...label(23, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, dividedAt - 2, 10) }}>
          Score, ÷ √2
        </span>
        <span style={{ position: "absolute", left: C.power, opacity: ease(frame, raiseAt - 2, 10) }}>
          <EScore />
        </span>
        <span style={{ position: "absolute", left: C.weight, ...label(23, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, divideAt - 2, 10) }}>
          Weight, ÷ total
        </span>
      </Fade>
      <Svg opacity={ease(frame, from + 4, 12)}>
        <line x1={X0} x2={1340} y1={headY + 44} y2={headY + 44} stroke={INK} strokeWidth={1.6} />
      </Svg>
      {TOKENS.map((t, i) => {
        const r = rows[i];
        const isTrophy = i === 0;
        const hot = isTrophy ? ease(frame, fourSixAt - 2, 10) : 0;
        const top = isTrophy ? pulse(frame, topAt - 2, 30) : 0;
        return (
          <Fade key={t} at={from + 4 + i * 4} style={{ left: 0, top: rowY(i), width: 1500, height: 70 }}>
            <div style={{ position: "absolute", left: C.chip, top: 2 }}>
              <TokenChip text={t} size={26} border={KEY} />
            </div>
            <span
              style={{
                position: "absolute",
                left: C.dot,
                top: 4,
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: NUM,
                color: INK,
                transform: `scale(${1 + 0.22 * swell + 0.16 * top})`,
                transformOrigin: "left center",
                ...TABULAR,
              }}
            >
              {two(r.dot)}
            </span>
            {[
              { x: C.score, v: three(r.score), at: scoreIn(i) },
              { x: C.power, v: three(r.power), at: powerIn(i) },
            ].map((c) => (
              <span
                key={c.x}
                style={{
                  position: "absolute",
                  left: c.x,
                  top: 4,
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: NUM,
                  color: INK,
                  opacity: ease(frame, c.at, 10),
                  ...TABULAR,
                }}
              >
                {c.v}
              </span>
            ))}
            <span
              style={{
                position: "absolute",
                left: C.weight,
                top: 4,
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: NUM,
                color: hot > 0.5 ? POINT_INK : INK,
                opacity: ease(frame, weightIn(i), 10),
                ...TABULAR,
              }}
            >
              {three(r.weight)}
            </span>
          </Fade>
        );
      })}
      {/* Sum of the weights. */}
      <Svg opacity={ease(frame, addUpAt - 4, 10)}>
        <line x1={C.weight} x2={C.weight + 120} y1={rowY(3) - 14} y2={rowY(3) - 14} stroke={INK} strokeWidth={1.6} />
      </Svg>
      <Fade at={addUpAt - 2} style={{ left: C.weight, top: rowY(3) - 6, display: "flex", gap: 14, alignItems: "baseline" }}>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: NUM, color: INK, ...TABULAR }}>1.000</span>
        <span style={{ ...label(22, INK_SOFT) }}>in all</span>
      </Fade>

      {/* The two rules, on the right, as the narration states them. */}
      <Note at={dividedAt - 2} x={1390} y={headY - 4} width={450}>
        <div style={{ ...body(32), color: INK }}>
          score = dot product{" "}
          <Mark at={squareAt}>
            ÷ <span style={{ fontFamily: MONO, fontWeight: 600 }}>√d</span>
          </Mark>
        </div>
        <div style={{ ...body(27), color: INK_SOFT, marginTop: 12, whiteSpace: "nowrap", opacity: ease(frame, howManyAt - 2, 10) }}>
          <span style={{ fontFamily: MONO, fontWeight: 600, color: INK }}>d</span>: <Mark at={howManyAt}>how many numbers</Mark> a vector holds
        </div>
        <div style={{ ...body(28), color: INK_SOFT, marginTop: 10, opacity: ease(frame, rootTwoAt - 2, 10) }}>
          here <span style={{ fontFamily: MONO, fontWeight: 600, color: INK }}>d = {D}</span>, so ÷ <Mark at={rootTwoAt}>{ROOT.toFixed(3)}</Mark>
        </div>
      </Note>
      <Note at={stepsAt - 2} x={1390} y={y(640)} width={430}>
        <div style={{ ...body(32), color: INK }}>
          softmax: <Mark at={raiseAt}>raise e</Mark> to each score, then <Mark at={divideAt}>divide</Mark> by the total
        </div>
      </Note>
      <Fade at={manyAt - 2} out={dividedAt - 6} style={{ left: 1390, top: headY + 4 }}>
        <div style={{ ...body(30, true), color: INK_SOFT, width: 430 }}>
          Real queries and keys: many more numbers, so <Mark at={bigAt}>bigger sums</Mark>.
        </div>
      </Fade>

      {/* ── Fig. 6: divide by the total ── */}
      <FigLabel n="6" title="The total, shared out" at={divideAt - 4} x={X0} y={y(705)} />
      {segs.map((s, i) => {
        const p = ease(frame, divideAt - 4 + i * 5, 14);
        if (p <= 0) return null;
        const hot = i === 0 ? ease(frame, fourSixAt - 2, 10) : 0;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: s.x + 2,
                top: BY,
                width: Math.max(0, s.w * p - 4),
                height: BH,
                borderRadius: 6,
                background: hot > 0 ? `color-mix(in srgb, ${POINT} ${Math.round(hot * 28)}%, ${PAPER})` : DATA_TINT,
                border: `${2 + hot}px solid ${hot > 0.5 ? POINT : DATA}`,
              }}
            />
            <div style={{ position: "absolute", left: s.x + 16, top: BY + 13, opacity: ease(frame, divideAt + 4 + i * 5, 10), display: "flex", gap: 14, alignItems: "baseline", whiteSpace: "nowrap" }}>
              <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: INK }}>{TOKENS[i]}</span>
              <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: hot > 0.5 ? POINT_INK : INK, ...TABULAR }}>
                <Swap a={three(rows[i].power)} b={three(rows[i].weight)} swapAt={trophyAt - 2 + i * 4} />
              </span>
            </div>
          </React.Fragment>
        );
      })}
      {/* The bar's two ends: 0, and its total, which division makes one. */}
      <Svg opacity={bar}>
        {[BX, end].map((x) => (
          <line key={x} x1={x} x2={x} y1={BY + BH + 6} y2={BY + BH + 18} stroke={INK} strokeWidth={1.6} />
        ))}
      </Svg>
      <Fade at={divideAt} style={{ left: BX - 6, top: BY + BH + 22 }}>
        <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: INK_SOFT }}>0</span>
      </Fade>
      <Fade at={totalAt - 2} style={{ left: end - 6, top: BY + BH + 22, transform: "translateX(-60%)" }}>
        <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: INK, whiteSpace: "nowrap", ...TABULAR }}>
          <Swap a={`total ${three(TROPHY.total)}`} b="1" swapAt={trophyAt - 2} />
        </span>
      </Fade>
      <div style={{ position: "absolute", left: end + 26, top: BY + 18, opacity: share * (1 - 0.3 * pulse(frame, biggestAt, 30)), ...halo }}>
        <Tag size={22}>each piece ÷ {three(TROPHY.total)}</Tag>
      </div>
    </AbsoluteFill>
  );
};
