import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, halo, INK, INK_SOFT, label, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { D, ROOT, SPREAD, three, TOKENS, TROPHY, two, UNSCALED } from "./data";
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

/** A column head in two lines, in the lesson's terms: "raw scores" are the
 *  dot products, "scaled scores" the same over the square root of d. */
const Head: React.FC<{ x: number; lines: [React.ReactNode, React.ReactNode]; opacity?: number }> = ({ x, lines, opacity = 1 }) => (
  <div style={{ position: "absolute", left: x, top: -30, ...label(23, INK_SOFT), lineHeight: 1.25, whiteSpace: "nowrap", opacity }}>
    <div>{lines[0]}</div>
    <div>{lines[1]}</div>
  </div>
);

/** Fig. 6: pixels per unit of a sum's typical size. */
const SU = 34;

export const WeightsScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("scale").from;
  const realAt = n.word("big", "Real queries");
  const manyAt = n.word("big", "many more numbers");
  const bigAt = n.word("big", "big");
  const topAt = n.word("big", "top one");
  const dividedAt = n.word("root", "divided");
  const squareAt = n.word("root", "square root");
  const howManyAt = n.word("root", "how many numbers");
  const rootTwoAt = n.word("rootTwo", "root two");
  const smAt = n.word("softmax", "softmax");
  const stepsAt = n.word("softmax", "two steps");
  const raiseAt = n.word("raise", "Raise e");
  const eachScoreAt = n.word("raise", "each scaled score");
  const addThemAt = n.word("divide", "Add them up");
  const totalSaidAt = n.word("divide", "four point four six four");
  const divideAt = n.word("divide", "divide");
  const totalAt = n.word("divide", "total");
  const trophyAt = n.word("weights", "Trophy");
  const fourSixAt = n.word("weights", "point four six");
  const biggestAt = n.word("weights", "biggest share");
  const addUpAt = n.word("weights", "add up to one");
  const withoutAt = n.word("unscaled", "Without");
  const fiveTwoAt = n.word("unscaled", "point five two");

  const headY = y(385);
  const rowY = (i: number) => y(450) + i * 88;
  const rows = TROPHY.rows;
  const scoreIn = (i: number) => rootTwoAt + 6 + i * 5;
  const powerIn = (i: number) => eachScoreAt + i * 5;
  const weightIn = (i: number) => totalAt + 2 + i * 5;
  const swell = pulse(frame, bigAt - 4, 34);

  // Fig. 6: how big a sum of products gets, as summed and over the root of d.
  const spreadOut = addThemAt - 16;
  const SY = y(705);
  const sRow = (i: number) => SY + 92 + i * 54;
  const SA = 300;
  const SB = 880;

  // Fig. 7: the three e-powers end to end, then the same bar read as shares of
  // one; under it, the shares softmax would give the undivided dot products.
  const BX = X0;
  const BY = y(775);
  const BH = 64;
  const PX = 1120 / TROPHY.total;
  const bar = ease(frame, addThemAt - 4, 18);
  const swapAt = fourSixAt - 4;
  const share = ease(frame, swapAt, 12);
  const GY = BY + BH + 70;
  const GH = 38;
  let gAcc = 0;
  const ghost = UNSCALED.map((u) => {
    const x = BX + gAcc * 1120;
    gAcc += u;
    return { x, w: u * 1120 };
  });
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
      <Sfx name="el-pencil" at={manyAt - 4} level={-36} />
      <Sfx name="el-whoosh" at={bigAt - 6} level={-34} />
      <Sfx name="el-whoosh" at={addThemAt - 4} level={-33} />
      <Sfx name="el-pencil" at={withoutAt - 2} level={-35} />
      <Sfx name="el-tap" at={fiveTwoAt} level={-25} />
      {rows.map((_, i) => (
        <Sfx key={`w${i}`} name="el-tap" at={weightIn(i)} level={-28} />
      ))}
      <Sfx name="el-tap" at={fourSixAt} level={-23} />

      <Kicker at={from - 10}>Attention, by hand</Kicker>
      <Headline lead="Scale the scores," turn="then softmax." at={from} turnAt={smAt - 2} />

      {/* ── Fig. 5: from dot products to weights ── */}
      <FigLabel n="5" title="From dot products to weights" at={from} x={X0} y={y(FIG_Y)} />
      <Fade at={from} style={{ left: 0, top: headY, width: 1500 }}>
        <Head x={C.dot} lines={["Raw score", "(dot product)"]} />
        <Head x={C.score} lines={["Scaled score", "÷ √2"]} opacity={ease(frame, dividedAt - 2, 10)} />
        <Head x={C.power} lines={["e to the", "scaled score"]} opacity={ease(frame, raiseAt - 2, 10)} />
        <Head x={C.weight} lines={["Weight", "÷ total"]} opacity={ease(frame, divideAt - 2, 10)} />
      </Fade>
      <Svg opacity={ease(frame, from + 4, 12)}>
        <line x1={X0} x2={1340} y1={headY + 44} y2={headY + 44} stroke={INK} strokeWidth={1.6} />
      </Svg>
      {TOKENS.map((t, i) => {
        const r = rows[i];
        const isTrophy = i === 0;
        const hot = isTrophy ? ease(frame, trophyAt - 2, 10) : 0;
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
          scaled = raw score{" "}
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
          softmax: <Mark at={raiseAt}>raise e</Mark> to each scaled score, then <Mark at={divideAt}>divide</Mark> by the total
        </div>
      </Note>
      <Fade at={realAt - 2} out={dividedAt - 6} style={{ left: 1390, top: headY + 4 }}>
        <div style={{ ...body(30, true), color: INK_SOFT, width: 430 }}>
          Real queries and keys: many more numbers, so <Mark at={bigAt}>bigger sums</Mark>.
        </div>
      </Fade>

      {/* ── Fig. 6: why divide; the sums of long vectors, before and after ── */}
      <FigLabel n="6" title="How big the sum gets, for random vectors" at={manyAt - 4} out={spreadOut} x={X0} y={SY} />
      <Fade at={manyAt - 2} out={spreadOut} style={{ left: SA, top: SY + 50 }}>
        <span style={{ ...label(23, INK_SOFT), whiteSpace: "nowrap" }}>The sum</span>
      </Fade>
      <Fade at={squareAt - 2} out={spreadOut} style={{ left: SB, top: SY + 50 }}>
        <span style={{ ...label(23, INK_SOFT), whiteSpace: "nowrap" }}>
          ÷ <span style={{ fontFamily: MONO, fontWeight: 600 }}>√d</span>
        </span>
      </Fade>
      {SPREAD.map((sp, i) => {
        const rowAt = i ? manyAt + 8 : manyAt - 2;
        const grow = ease(frame, i ? bigAt - 6 : manyAt + 2, i ? 26 : 14);
        const after = ease(frame, squareAt + 2 + i * 5, 14);
        const gone = ease(frame, spreadOut, 10);
        if (frame < rowAt) return null;
        const cell = (x: number, v: number, p: number) => (
          <>
            <div
              style={{
                position: "absolute",
                left: x,
                top: sRow(i),
                width: Math.max(0, v * SU * p),
                height: 36,
                borderRadius: 5,
                background: DATA_TINT,
                border: `2px solid ${DATA}`,
                boxSizing: "border-box",
                opacity: p > 0 ? 1 : 0,
              }}
            />
            <span
              style={{
                position: "absolute",
                left: x + v * SU + 14,
                top: sRow(i) + 1,
                fontFamily: MONO,
                fontSize: 26,
                fontWeight: 700,
                color: INK,
                opacity: Math.max(0, (p - 0.7) / 0.3),
                ...TABULAR,
              }}
            >
              {(x === SA ? sp.std : sp.scaled).toFixed(1)}
            </span>
          </>
        );
        return (
          <div key={sp.d} style={{ position: "absolute", inset: 0, opacity: ease(frame, rowAt, 10) * (1 - gone) }}>
            <span style={{ position: "absolute", left: X0, top: sRow(i) + 2, ...label(23, INK), whiteSpace: "nowrap" }}>
              {sp.d} numbers
            </span>
            {cell(SA, sp.std, grow)}
            {cell(SB, sp.scaled, after)}
          </div>
        );
      })}
      <Fade at={bigAt + 12} out={spreadOut} style={{ left: X0, top: sRow(2) + 4 }}>
        <Tag size={20}>each bar: the sum&apos;s typical size, over 1,000 random pairs</Tag>
      </Fade>

      {/* ── Fig. 7: add them up, then divide by the total ── */}
      <FigLabel n="7" title="The total, shared out" at={addThemAt - 4} x={X0} y={y(705)} />
      {segs.map((s, i) => {
        const p = ease(frame, addThemAt - 4 + i * 5, 14);
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
            <div style={{ position: "absolute", left: s.x + 16, top: BY + 13, opacity: ease(frame, addThemAt + 4 + i * 5, 10), display: "flex", gap: 14, alignItems: "baseline", whiteSpace: "nowrap" }}>
              <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: INK }}>{TOKENS[i]}</span>
              <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: hot > 0.5 ? POINT_INK : INK, ...TABULAR }}>
                <Swap a={three(rows[i].power)} b={three(rows[i].weight)} swapAt={swapAt + i * 4} />
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
      <Fade at={addThemAt} style={{ left: BX - 6, top: BY + BH + 22 }}>
        <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: INK_SOFT }}>0</span>
      </Fade>
      <Fade at={totalSaidAt - 2} style={{ left: end - 6, top: BY + BH + 22, transform: "translateX(-60%)" }}>
        <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: INK, whiteSpace: "nowrap", ...TABULAR }}>
          <Swap a={`total ${three(TROPHY.total)}`} b="1" swapAt={swapAt} />
        </span>
      </Fade>
      <div style={{ position: "absolute", left: end + 26, top: BY + 18, opacity: share * (1 - 0.3 * pulse(frame, biggestAt, 30)), ...halo }}>
        <Tag size={22}>each piece ÷ {three(TROPHY.total)}</Tag>
      </div>

      {/* Without the division: the same softmax on the raw scores. */}
      {ghost.map((g, i) => {
        const p = ease(frame, withoutAt - 2 + i * 5, 14);
        if (p <= 0) return null;
        const hot = i === 0 ? ease(frame, fiveTwoAt - 2, 10) : 0;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: g.x + 2,
                top: GY,
                width: Math.max(0, g.w * p - 4),
                height: GH,
                borderRadius: 6,
                border: `2px dashed ${hot > 0.5 ? POINT : INK_SOFT}`,
                boxSizing: "border-box",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: g.x + 16,
                top: GY + 4,
                fontFamily: MONO,
                fontSize: 23,
                fontWeight: 600,
                color: hot > 0.5 ? POINT_INK : INK_SOFT,
                opacity: ease(frame, withoutAt + 6 + i * 5, 10),
                ...TABULAR,
              }}
            >
              {three(UNSCALED[i])}
            </span>
          </React.Fragment>
        );
      })}
      <Fade at={withoutAt + 4} style={{ left: end + 26, top: GY + 6 }}>
        <Tag size={22}>without the ÷ √2</Tag>
      </Fade>
    </AbsoluteFill>
  );
};
