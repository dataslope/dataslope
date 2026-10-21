import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, body, HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { jitter, SLICES, type Slice } from "./data";
import { Arrow, Check, Cross, Headline, lerp, Marker, Ring, STAT, STAT_INK, Strike, Svg, Wall } from "./parts";

export const WALL_X = 960;
export const WALL_TOP = 300;
export const WALL_BOTTOM = 790;
/** Where the lead's card sits at the end of LookScene, and where it settles. */
export const CARD_FROM = { x: 1410, y: 846 };
const CARD_TO = { x: 1060, y: 398 };

const THUMB_W = 210;
const THUMB_H = 120;
const THUMB_X = [160, 395, 630];
const THUMB_Y = [400, 596];
/** The "by day" slice sits nearest the wall, where the trap's arrow lands. */
const THUMBS: { title: string; slice?: Slice; corr?: boolean }[] = [
  { title: "by time", slice: SLICES.time },
  { title: "by party size", slice: SLICES.size },
  { title: "by day", slice: SLICES.day },
  { title: "by smoker", slice: SLICES.smoker },
  { title: "by sex", slice: SLICES.sex },
  { title: "correlations", corr: true },
];
const DAY_THUMB = 2;
/** The middle of Friday's bar in the "by day" slice. */
const FRI_X = THUMB_X[DAY_THUMB] + (THUMB_W / SLICES.day.length) * (SLICES.day.findIndex((s) => s.key === "Fri") + 0.5);
/** Set below the two lines under the trap's cross ("tilted", "luck"). */
const SEALED = { x0: 1060, x1: 1390, y0: 540, y1: 668 };
/** The column the notes beside the sealed data start in, right of the check. */
const NOTE_X = 1458;
const SEALED_JIT = jitter(77, 48);

/** The card that carries the lead from one side of the wall to the other. */
export const LeadCard: React.FC<{ x: number; y: number; opacity?: number }> = ({ x, y, opacity = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, opacity, whiteSpace: "nowrap" }}>
    <span
      style={{
        ...body(34, true),
        color: INK,
        display: "inline-block",
        padding: "6px 18px 8px",
        border: `2px solid ${INK}`,
        borderRadius: 10,
        background: PAPER,
      }}
    >
      Does Friday tip more?
    </span>
  </div>
);

/** One small slice of the tips data: tip % by a column, as little bars. */
const Thumb: React.FC<{ x: number; y: number; t: number; title: string; slice?: Slice; corr?: boolean; hot?: number }> = ({
  x,
  y,
  t,
  title,
  slice,
  corr,
  hot = 0,
}) => {
  const { h } = useLayout();
  if (t <= 0.001) return null;
  const top = y + 34;
  const base = y + h(THUMB_H);
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y, opacity: Math.min(1, t), whiteSpace: "nowrap", ...label(20, INK_SOFT) }}>
        {title}
      </div>
      <Svg opacity={Math.min(1, t)}>
        <line x1={x} x2={x + THUMB_W} y1={base} y2={base} stroke={HAIRLINE} strokeWidth={1.4} />
        {slice
          ? slice.map((s, i) => {
              const w = THUMB_W / slice.length;
              const bh = (s.mean - 12) * 7.2 * t;
              const friday = s.key === "Fri";
              return (
                <rect
                  key={s.key}
                  x={x + i * w + 4}
                  y={base - bh}
                  width={w - 8}
                  height={bh}
                  fill={friday ? `color-mix(in srgb, ${STAT} ${Math.round(hot * 100)}%, ${BAR})` : BAR}
                  opacity={friday ? 1 : 0.55 + 0.45 * (1 - hot)}
                />
              );
            })
          : null}
        {corr
          ? SLICES.corr.r.map((row, i) =>
              row.map((r, j) => {
                const c = (base - top) / 3;
                return (
                  <rect
                    key={`${i}-${j}`}
                    x={x + 60 + j * c}
                    y={top + i * c}
                    width={c - 3}
                    height={c - 3}
                    fill={BAR}
                    opacity={(0.15 + 0.85 * r) * t}
                  />
                );
              }),
            )
          : null}
      </Svg>
    </>
  );
};

/**
 * The two jobs: exploring (every slice you like; out come questions) and
 * confirming (one hypothesis, stated first, tested once on unseen data; out
 * comes a claim), with a wall between them, and the trap of carrying the
 * test back across it: Friday was picked for looking best, so part of its
 * lead is luck the test would count as evidence.
 */
export const WallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const jobsFrom = n.beat("jobs").from;
  const roamingAt = n.word("jobs", "roaming");
  const canAt = n.word("jobs", "can", { edge: "end" });
  const questionsAt = n.word("jobs", "questions");
  const conclusionsAt = n.word("jobs", "conclusions");
  const confirmFrom = n.beat("confirm").from;
  const oneAt = n.word("confirm", "ONE");
  const advanceAt = n.word("confirm", "advance");
  const testingAt = n.word("confirm", "testing");
  const onceAt = n.word("confirm", "once");
  const nobodyAt = n.word("confirm", "nobody");
  const claimAt = n.word("confirm", "claim");
  const keepAt = n.word("sin", "Keep a wall");
  const crossingAt = n.word("sin", "crossing");
  const suggestedAt = n.word("sin", "suggested");
  const pickedAt = n.word("tilt", "picked");
  const veryAt = n.word("tilt", "very bills");
  const tiltedAt = n.word("tilt", "tilted");
  const luckFrom = n.beat("luck").from;
  const luckAt = n.word("luck", "lead is luck");
  const evidenceAt = n.word("luck", "evidence");
  const pValueAt = n.word("lie", "p-value");
  const lieAt = n.word("lie", "lie");
  const liePhraseAt = n.word("lie", "suggested");
  const freshAt = n.word("split-in", "fresh data");
  const fromAt = n.word("split-in", "from");

  // When each slice pops in, across "roaming the data, slicing it every way you can".
  const thumbAt = (i: number) => lerp(roamingAt - 6, canAt - 8, i / (THUMBS.length - 1));
  const slide = ease(frame, oneAt - 8, 20);
  const card = {
    x: lerp(CARD_FROM.x, CARD_TO.x, slide),
    y: lerp(y(CARD_FROM.y), y(CARD_TO.y), slide),
  };
  const hot = ease(frame, pickedAt - 4, 12);
  const suggested = ease(frame, suggestedAt - 4, 14);
  const leftDim = 1 - 0.45 * ease(frame, freshAt - 6, 14);
  const sealed = ease(frame, testingAt - 6, 16);

  return (
    <AbsoluteFill>
      {/* ── Sound: the wall, the slices, the card, the strike, the trap ── */}
      <Sfx name="el-pencil" at={jobsFrom - 6} level={-33} />
      <Sfx name="el-sprinkle" at={roamingAt - 6} level={-34} />
      <Sfx name="el-scratch" at={conclusionsAt - 2} level={-30} />
      <Sfx name="el-whoosh" at={oneAt - 8} level={-33} />
      <Sfx name="el-pencil" at={crossingAt - 4} level={-33} />
      <Sfx name="el-tap" at={tiltedAt - 2} level={-28} />
      <Sfx name="el-pencil" at={luckFrom - 2} level={-35} />

      <Headline lead="Two jobs," turn="with a wall between." at={jobsFrom - 6} turnAt={confirmFrom - 6} />
      <Wall x={WALL_X} top={y(WALL_TOP)} bottom={y(WALL_BOTTOM)} at={jobsFrom - 8} width={lerp(9, 15, ease(frame, keepAt - 4, 12))} />

      {/* ── Exploring ── */}
      <div style={{ position: "absolute", inset: 0, opacity: leftDim }}>
        <Ink at={jobsFrom - 2} dur={16} style={{ left: 160, top: y(318), whiteSpace: "nowrap" }}>
          <span style={{ ...body(44, true), color: INK }}>Exploring</span>
        </Ink>
        {THUMBS.map((t, i) => {
          const p = Math.min(1.08, pop(frame, thumbAt(i), fps, 16));
          return (
            <Thumb
              key={t.title}
              x={THUMB_X[i % 3]}
              y={y(THUMB_Y[Math.floor(i / 3)])}
              t={p}
              title={t.title}
              slice={t.slice}
              corr={t.corr}
              hot={i === DAY_THUMB ? hot : 0}
            />
          );
        })}
        <Ink at={questionsAt - 4} dur={16} style={{ left: 160, top: y(742), whiteSpace: "nowrap" }}>
          <span style={{ ...note(28, INK), fontWeight: 600 }}>Out come questions.</span>
        </Ink>
        <Ink at={conclusionsAt - 10} dur={14} style={{ left: 480, top: y(742), whiteSpace: "nowrap" }}>
          <span style={{ ...note(28, INK_SOFT) }}>
            <Strike at={conclusionsAt - 2}>Conclusions</Strike>
          </span>
        </Ink>
        {suggested > 0 ? (
          <Svg opacity={suggested}>
            <rect x={THUMB_X[DAY_THUMB] - 12} y={y(THUMB_Y[0]) - 10} width={THUMB_W + 24} height={h(THUMB_H) + 20} rx={10} fill={STAT} opacity={0.14} />
          </Svg>
        ) : null}
        <Ring x={FRI_X} y={y(THUMB_Y[0]) + h(THUMB_H) - 18} at={pickedAt} r0={16} r1={70} />
        <Ring x={FRI_X} y={y(THUMB_Y[0]) + h(THUMB_H) - 18} at={luckAt - 2} r0={16} r1={70} />
      </div>

      {/* ── Confirming ── */}
      <Ink at={confirmFrom - 4} dur={16} style={{ left: 1060, top: y(318), whiteSpace: "nowrap" }}>
        <span style={{ ...body(44, true), color: INK }}>Confirming</span>
      </Ink>
      <LeadCard x={card.x} y={card.y} />
      <Ink at={advanceAt - 4} dur={14} style={{ left: 1428, top: y(CARD_TO.y) + 16, whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, INK_SOFT) }}>stated in advance</span>
      </Ink>

      {/* The data nobody has looked at: sealed. */}
      {sealed > 0 ? (
        <Svg opacity={sealed}>
          <rect
            x={SEALED.x0}
            y={y(SEALED.y0)}
            width={SEALED.x1 - SEALED.x0}
            height={y(SEALED.y1) - y(SEALED.y0)}
            rx={12}
            fill="none"
            stroke={INK}
            strokeWidth={2}
            strokeDasharray="8 6"
          />
          {SEALED_JIT.map((j, i) => {
            const cx = SEALED.x0 + 26 + (i % 12) * 25 + (j - 0.5) * 6;
            const cy = y(SEALED.y0) + h(26) + Math.floor(i / 12) * h(26);
            return <circle key={i} cx={cx} cy={cy} r={5} fill={`color-mix(in srgb, ${INK} 40%, transparent)`} />;
          })}
        </Svg>
      ) : null}
      <Check x={NOTE_X - 42} y={y(SEALED.y0 + 40)} at={onceAt - 4} />
      <Ink at={onceAt - 2} dur={14} style={{ left: NOTE_X, top: y(SEALED.y0 + 40) - 18, whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, INK), fontWeight: 600 }}>tested once</span>
      </Ink>
      <Ink at={nobodyAt - 4} dur={14} style={{ left: NOTE_X, top: y(SEALED.y0 + 90) - 6, whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, INK_SOFT) }}>on data nobody has seen</span>
      </Ink>
      <Ring x={(SEALED.x0 + SEALED.x1) / 2} y={(y(SEALED.y0) + y(SEALED.y1)) / 2} at={freshAt - 2} r0={60} r1={190} color={BAR} dur={26} />
      <Ink at={claimAt - 6} dur={16} style={{ left: 1060, top: y(742), whiteSpace: "nowrap" }}>
        <span style={{ ...note(28, INK), fontWeight: 600 }}>Out comes a claim,</span>
      </Ink>
      <Ink at={claimAt + 4} dur={16} style={{ left: 1060, top: y(742) + 40, whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, INK_SOFT) }}>with a p-value, an effect size and an interval.</span>
      </Ink>

      {/* ── The trap: the test carried back across the wall ── */}
      <Arrow
        from={[CARD_TO.x - 14, y(CARD_TO.y) + 32]}
        to={[THUMB_X[DAY_THUMB] + THUMB_W + 18, y(CARD_TO.y) + 32]}
        at={crossingAt - 4}
        dur={18}
        color={STAT}
        width={4.4}
      />
      <Ink at={suggestedAt - 4} dur={14} style={{ left: THUMB_X[DAY_THUMB], top: y(THUMB_Y[0]) + h(THUMB_H) + 8, whiteSpace: "nowrap" }}>
        <span style={{ ...note(20, STAT_INK), fontWeight: 650 }}>the same data</span>
      </Ink>
      <Cross x={WALL_X} y={y(CARD_TO.y) + 32} at={tiltedAt - 4} size={56} />
      <Ink at={veryAt - 4} dur={14} style={{ left: THUMB_X[DAY_THUMB], top: y(THUMB_Y[0]) + h(THUMB_H) + 36, whiteSpace: "nowrap" }}>
        <span style={{ ...note(24, STAT_INK), fontWeight: 650 }}>picked for looking best</span>
      </Ink>
      {/* Below and right of the cross, whose lower arm ends at x 988, 60 px under the card's top. */}
      <Ink at={tiltedAt - 4} dur={14} style={{ left: 1004, top: y(CARD_TO.y) + 74, whiteSpace: "nowrap" }}>
        <span style={{ ...note(24, STAT_INK), fontWeight: 650 }}>tilted before it runs:</span>
      </Ink>
      <div style={{ position: "absolute", left: 1004, top: y(CARD_TO.y) + 108, display: "flex", gap: "0.3em", whiteSpace: "nowrap", ...note(22, STAT_INK) }}>
        <Ink at={luckFrom - 2} dur={14} style={{ position: "relative" }}>
          <span style={{ ...note(22, STAT_INK) }}>
            part of its lead is <Marker at={luckAt - 2}>luck,</Marker>
          </span>
        </Ink>
        <Ink at={evidenceAt - 6} dur={14} style={{ position: "relative" }}>
          <span style={{ ...note(22, STAT_INK) }}>counted as evidence</span>
        </Ink>
      </div>

      <div style={{ position: "absolute", left: 160, top: y(830), display: "flex", gap: "0.36em", whiteSpace: "nowrap", opacity: 1 - 0.6 * ease(frame, fromAt - 4, 14) }}>
        <Ink at={pValueAt - 6} dur={18} style={{ position: "relative" }}>
          <span style={{ ...body(38), color: INK }}>
            A p-value from the data that <Marker at={liePhraseAt - 4}>suggested the question</Marker>
          </span>
        </Ink>
        <Ink at={lieAt - 6} dur={14} style={{ position: "relative" }}>
          <span style={{ ...body(38, true), color: STAT_INK }}>is a lie.</span>
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
