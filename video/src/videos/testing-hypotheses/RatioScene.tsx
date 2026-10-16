import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, INK, INK_SOFT, PAPER } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { jitter } from "./data";
import { Bracket, curvePath, DATA, DOT, Head, Kicker, Label, lerp, Mark, phi, RAW, STAT, STAT_INK, Svg } from "./parts";

/** The schematic mounds: two groups, their gap and their width. */
const CX = 1340;
const UNIT = 120;
const M_BASE = 600;
const M_TALL = 220;
const CARD_Y = 690;
const CARD_W = 500;
const CARD_X = [160, 710, 1260];

const J1 = jitter(51, 14);
const J2 = jitter(52, 14);

/**
 * The t-statistic as a ratio, signal over noise, shown on two schematic
 * groups pulled apart and pushed together; then the three designs it comes
 * in.
 */
export const RatioScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const ratioFrom = n.beat("ratio").from;
  const ratioAt = n.word("ratio", "ratio");
  const gapAt = n.word("ratio", "gap you observed");
  const noiseAt = n.word("ratio", "noise");
  const seAt = n.word("ratio", "standard error");
  const bigAt = n.word("big", "big t");
  const dwarfsAt = n.word("big", "dwarfs");
  const smallAt = n.word("big", "small one");
  const wobbleAt = n.word("big", "wobble");
  const designsAt = n.word("designs", "three designs");
  const targetAt = n.word("designs", "target");
  const separateAt = n.word("designs", "two separate groups");
  const twiceAt = n.word("designs", "twice");

  // The mounds: as drawn, then apart and narrow (big t), then together and wide (small t).
  const toBig = ease(frame, bigAt - 4, 22);
  const toSmall = ease(frame, smallAt - 4, 22);
  const half = lerp(lerp(1.0, 1.55, toBig), 0.42, toSmall);
  const sd = lerp(lerp(0.62, 0.42, toBig), 0.95, toSmall);
  const mounds = ease(frame, ratioFrom + 4, 20);
  const mx = (v: number) => CX + v * UNIT;
  const my = (u: number) => y(M_BASE) - h(M_TALL) * u;
  const a = -half;
  const b = half;
  const peakY = my(1);
  const widthY = y(M_BASE) - (y(M_BASE) - peakY) * 0.5;
  const sig = ease(frame, gapAt - 2, 14);
  const noi = ease(frame, seAt - 4, 14);

  const card = (i: number, at: number, title: string, draw: React.ReactNode) => {
    const p = ease(frame, at - 4, 14);
    if (p <= 0) return null;
    return (
      <div
        style={{
          position: "absolute",
          left: CARD_X[i],
          top: y(CARD_Y),
          width: CARD_W,
          height: h(200),
          border: `2px solid ${HAIRLINE}`,
          borderRadius: 10,
          opacity: p,
          transform: `translateY(${(1 - p) * 18}px)`,
          boxSizing: "border-box",
          padding: "16px 22px",
        }}
      >
        <Label size={26}>{title}</Label>
        <svg width={CARD_W - 44} height={h(200) - 70} style={{ position: "absolute", left: 22, top: 58, overflow: "visible" }}>
          {draw}
        </svg>
      </div>
    );
  };
  const cardH = h(200) - 70;
  const strip = (j: readonly number[], cx: number, cy: number, spread: number, fill: string) =>
    j.map((v, k) => <circle key={k} cx={cx + (v - 0.5) * spread} cy={cy + ((k % 3) - 1) * 9} r={6} fill={fill} stroke={PAPER} strokeWidth={1.2} />);

  return (
    <AbsoluteFill>
      {/* ── Sound: the two halves of the ratio, the mounds moving, the cards ── */}
      <Sfx name="el-tap" at={gapAt - 2} level={-29} />
      <Sfx name="el-tap" at={seAt - 4} level={-30} />
      <Sfx name="el-whoosh" at={bigAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={smallAt - 4} level={-34} />
      {[targetAt, separateAt, twiceAt].map((at) => (
        <Sfx key={at} name="el-pop" at={at - 4} level={-30} />
      ))}

      <Kicker at={ratioFrom - 10}>t-tests: signal over noise</Kicker>
      <Head a="Signal," b="over noise." at={ratioFrom - 6} bAt={noiseAt - 6} />

      {/* ── The ratio ── */}
      <div style={{ position: "absolute", left: 160, top: y(330), opacity: ease(frame, ratioAt - 6, 14), display: "flex", alignItems: "center", gap: 28 }}>
        <span style={{ ...body(84, true), color: INK }}>t =</span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <span style={{ ...body(40, true), color: STAT_INK, opacity: sig, whiteSpace: "nowrap" }}>the gap you observed</span>
          <div style={{ width: 430 * ease(frame, ratioAt - 4, 16), height: 3, background: INK }} />
          <span style={{ ...body(40, true), color: INK, opacity: noi, whiteSpace: "nowrap" }}>its standard error</span>
        </div>
      </div>
      <Note at={gapAt + 6} x={160 + 140} y={y(330) + 200}>
        <Label size={22} color={INK_SOFT} weight={520}>
          <Mark at={dwarfsAt}>big t: the gap dwarfs the noise</Mark>
        </Label>
      </Note>
      <Note at={smallAt + 4} x={160 + 140} y={y(330) + 240}>
        <Label size={22} color={INK_SOFT} weight={520}>
          <Mark at={wobbleAt}>small t: an ordinary wobble</Mark>
        </Label>
      </Note>

      {/* ── The mounds ── */}
      {mounds > 0 ? (
        <Svg opacity={mounds}>
          <line x1={CX - 420} x2={CX + 420} y1={y(M_BASE)} y2={y(M_BASE)} stroke={INK} strokeWidth={1.6} />
          {[a, b].map((m, i) => (
            <path
              key={i}
              d={curvePath((v) => phi((v - m) / sd) / phi(0), -3.5, 3.5, mx, my, y(M_BASE))}
              fill={i ? DATA : RAW}
              opacity={i ? 0.45 : 0.75}
            />
          ))}
          {[a, b].map((m, i) => (
            <line key={`m${i}`} x1={mx(m)} x2={mx(m)} y1={y(M_BASE)} y2={peakY - 8} stroke={i ? DATA : INK_SOFT} strokeWidth={2.4} />
          ))}
        </Svg>
      ) : null}
      {/* The signal: the gap between the two means. */}
      <Bracket x0={mx(a)} x1={mx(b)} y={peakY - 24} at={gapAt - 2} color={STAT} up width={3} />
      <Note at={gapAt + 2} x={(mx(a) + mx(b)) / 2} y={peakY - 74} from="up">
        <span style={{ display: "inline-block", transform: "translateX(-50%)" }}>
          <Label size={22} color={STAT_INK}>
            signal
          </Label>
        </span>
      </Note>
      {/* The noise: the spread inside one group. */}
      <Bracket x0={mx(b) - sd * UNIT} x1={mx(b) + sd * UNIT} y={widthY} at={seAt - 4} color={INK} width={2.4} />
      <Note at={seAt} x={mx(b) + sd * UNIT + 14} y={widthY - 16}>
        <Label size={22}>noise</Label>
      </Note>

      {/* ── The three designs ── */}
      <Ink at={designsAt - 4} dur={14} style={{ left: 160, top: y(CARD_Y) - 46, whiteSpace: "nowrap" }}>
        <Label size={22} color={INK_SOFT}>
          Three designs
        </Label>
      </Ink>
      {card(
        0,
        targetAt,
        "One group against a target",
        <>
          {strip(J1, 200, cardH / 2, 220, DOT)}
          <line x1={250} x2={250} y1={4} y2={cardH - 4} stroke={INK} strokeWidth={2.2} strokeDasharray="6 5" />
        </>,
      )}
      {card(
        1,
        separateAt,
        "Two separate groups",
        <>
          {strip(J1, 130, cardH / 2, 170, RAW)}
          {strip(J2, 320, cardH / 2, 170, DATA)}
        </>,
      )}
      {card(
        2,
        twiceAt,
        "The same units, measured twice",
        <>
          {J1.slice(0, 6).map((v, k) => {
            const yy = 12 + k * ((cardH - 24) / 5);
            const x0 = 90 + v * 60;
            const x1 = x0 + 150 + J2[k] * 40;
            return (
              <g key={k}>
                <line x1={x0} x2={x1} y1={yy} y2={yy} stroke={STAT} strokeWidth={2} opacity={0.7} />
                <circle cx={x0} cy={yy} r={6} fill={RAW} stroke={PAPER} strokeWidth={1.2} />
                <circle cx={x1} cy={yy} r={6} fill={DATA} stroke={PAPER} strokeWidth={1.2} />
              </g>
            );
          })}
        </>,
      )}
    </AbsoluteFill>
  );
};
