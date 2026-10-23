import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { NUCLEUS, NUCLEUS_TOKENS, type Nucleus, pct, row, TOKENS, TOP_P } from "./data";
import { Drift, FILL, Headline, Kicker, Struck, Svg, TEXT, tint, TINT, X0 } from "./kit";

/** Fig. 3's bars run 0 to 100% across this span; rock's label goes past its end. */
const A0 = 160;
const A1 = 1660;
const px = (share: number) => A0 + (A1 - A0) * share;
const BAR_H = 60;
const BAR_A = 312;
const BAR_B = 490;
/** Fig. 4: the lesson's six-token example, a sure context and a torn one. */
const N0 = 340;
const N1 = 1660;
const nx = (share: number) => N0 + (N1 - N0) * share;
const N_H = 52;
const SURE_Y = 668;
const TORN_Y = 760;

const HOT = row(1.5);
const KEPT = HOT.topP.kept;
const ROCK = TOKENS.length - 1;
/** Tokens are already in probability order, so segments run left to right. */
const starts = (probs: readonly number[]) => probs.map((_, i) => probs.slice(0, i).reduce((a, b) => a + b, 0));

/** One of Fig. 4's two bars: kept segments in blue, dropped ones in grey. */
const NucleusBar: React.FC<{ nuc: Nucleus; top: number; height: number; at: number; keptAt: number }> = ({
  nuc,
  top,
  height,
  at,
  keptAt,
}) => {
  const frame = useCurrentFrame();
  const s = starts(nuc.probs);
  const kept = ease(frame, keptAt, 14);
  return (
    <>
      {nuc.probs.map((p, i) => {
        const isKept = nuc.kept.includes(i);
        const x = nx(s[i]);
        const w = nx(s[i] + p) - x;
        const fill = isKept ? tint(BAR, i % 2 ? 16 : 30) : tint(ds("gray", 400), 30);
        return (
          <Ink key={i} at={at + i * 3} dur={12} style={{ left: x, top, width: Math.max(1, w - 2), height }}>
            <div
              style={{
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                background: isKept ? `color-mix(in srgb, ${fill} ${kept * 100}%, ${tint(ds("gray", 400), 30)})` : fill,
                borderBottom: `4px solid ${isKept ? BAR : ds("gray", 400)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: nuc.kept.length === 1 ? "flex-start" : "center",
                paddingLeft: nuc.kept.length === 1 ? 12 : 0,
                overflow: "hidden",
                ...note(21, isKept ? BLUE_INK : INK_SOFT),
                fontWeight: 650,
                whiteSpace: "nowrap",
              }}
            >
              {w > 120 ? (nuc.kept.length === 1 ? `${NUCLEUS_TOKENS[i]} ${pct(p)}` : NUCLEUS_TOKENS[i]) : null}
            </div>
          </Ink>
        );
      })}
    </>
  );
};

/**
 * Top p, the cut, and the nucleus that adapts: the distribution at T = 1.5
 * summed likeliest first until it passes 0.9 (after LlmTemperature's
 * TopPScene), then the lesson's own top-p block, whose confident context
 * keeps one token and whose uncertain one keeps all six.
 */
export const TopPScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("topp").from;
  const keepAt = n.word("topp", "likeliest tokens");
  const ninetyAt = n.word("topp", "ninety percent");
  const dropAt = n.word("topp", "drop the rest");
  const keepsAt = n.word("topp-cut", "keeps cat");
  const cutAt = n.word("topp-cut", "Rock can't");
  const adaptsAt = n.word("adapt", "cut adapts");
  const sureAt = n.word("adapt", "sure");
  const oneAt = n.word("adapt", "one token");
  const tornAt = n.word("adapt", "torn");
  const sixAt = n.word("adapt", "all six");

  const startsA = starts(HOT.probs);
  const startsB = starts(HOT.topP.renormalized);
  const barA = y(BAR_A);
  const barB = y(BAR_B);
  const bh = h(BAR_H);
  const rockGone = ease(frame, dropAt, 14);
  const runAt = (k: number) => keepAt + k * 10;
  const sureY = y(SURE_Y);
  const tornY = y(TORN_Y);
  const nh = h(N_H);

  return (
    <AbsoluteFill>
      {KEPT.map((_, k) => (
        <Sfx key={k} name="el-tap" at={runAt(k)} level={-30} />
      ))}
      <Sfx name="el-pencil" at={ninetyAt - 2} level={-35} />
      <Sfx name="el-scratch" at={dropAt + 2} level={-34} />
      <Sfx name="el-whoosh" at={keepsAt - 4} level={-36} />
      <Sfx name="el-pop" at={sureAt - 4} level={-31} />
      <Sfx name="el-pop" at={tornAt - 4} level={-31} />

      <Drift from={start} to={n.beat("runs").from} amount={0.012} origin="45% 60%">
      <Kicker at={start - 6}>Sampling</Kicker>
      <Headline lead="Top-p trims the tail" turn="before the draw." at={start - 4} turnAt={n.word("topp", "before the draw") - 2} />
      <FigLabel n="3" title={`Top-p of ${TOP_P}, at temperature ${HOT.t}`} at={start} x={X0} y={y(236)} />

      {/* Bar A: the distribution at T = 1.5, one segment per token. */}
      <Ink at={start - 4} dur={14} style={{ left: A0, top: barA - 40 }}>
        <span style={label(20)}>At T = {HOT.t}</span>
      </Ink>
      {TOKENS.map((_, i) => {
        const x = px(startsA[i]);
        const w = px(startsA[i] + HOT.probs[i]) - x;
        const isRock = i === ROCK;
        return (
          <React.Fragment key={i}>
            <Ink at={start - 2 + i * 4} dur={14} style={{ left: x, top: barA, width: w - 2, height: bh }}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  boxSizing: "border-box",
                  background: isRock ? `color-mix(in srgb, ${TINT[i]} ${(1 - rockGone) * 100}%, transparent)` : TINT[i],
                  borderBottom: `5px solid ${FILL[i]}`,
                  outline: isRock ? `2px dashed color-mix(in srgb, ${FILL[i]} ${rockGone * 100}%, transparent)` : undefined,
                  outlineOffset: -2,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 14,
                  ...note(23, TEXT[i]),
                  fontWeight: 650,
                }}
              >
                {!isRock ? (
                  <span style={{ whiteSpace: "nowrap" }}>
                    {TOKENS[i]} {pct(HOT.probs[i])}
                  </span>
                ) : null}
              </div>
            </Ink>
            {isRock ? (
              <Note at={start + 10} x={A1 + 14} y={barA + bh / 2 - 15}>
                <span style={{ ...note(23, TEXT[i]), fontWeight: 650 }}>
                  <Struck at={dropAt + 2}>
                    {TOKENS[i]} {pct(HOT.probs[i])}
                  </Struck>
                </span>
              </Note>
            ) : null}
          </React.Fragment>
        );
      })}

      {/* The running total, likeliest first, until it passes p. */}
      {KEPT.map((tok, k) => {
        const x = px(HOT.topP.running[k]);
        const at = runAt(k);
        return (
          <React.Fragment key={tok}>
            <Svg opacity={ease(frame, at, 10)}>
              <line x1={x} x2={x} y1={barA + bh} y2={barA + bh + 14} stroke={INK} strokeWidth={1.6} />
            </Svg>
            <Note at={at} x={x} y={barA + bh + 18} from="up" style={{ transform: "translateX(-50%)" }}>
              <span style={{ ...note(21, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
                {k === 0 ? "" : "+ "}
                <span style={{ color: TEXT[tok] }}>{TOKENS[tok]}</span> = {pct(HOT.topP.running[k])}
              </span>
            </Note>
          </React.Fragment>
        );
      })}

      {/* The threshold, p = 0.9. */}
      <Svg opacity={ease(frame, ninetyAt - 2, 14) > 0 ? 1 : 0}>
        <line
          x1={px(TOP_P)}
          x2={px(TOP_P)}
          y1={barA - 16}
          y2={barA - 16 + (bh + 24) * ease(frame, ninetyAt - 2, 14)}
          stroke={ACCENT}
          strokeWidth={3}
          strokeDasharray="7 6"
        />
      </Svg>
      <Note at={ninetyAt} x={px(TOP_P)} y={barA - 48} from="up" style={{ transform: "translateX(-50%)" }}>
        <span style={{ ...note(21, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>p = {TOP_P}</span>
      </Note>

      {/* Bar B: what is left, rescaled to sum to one, and drawn from. */}
      <Ink at={keepsAt - 4} dur={14} style={{ left: A0, top: barB - 40 }}>
        <span style={label(20)}>Kept, rescaled to 100%, then drawn from</span>
      </Ink>
      {KEPT.map((tok, k) => {
        const x = px(startsB[tok]);
        const w = px(startsB[tok] + HOT.topP.renormalized[tok]) - x;
        return (
          <Ink key={tok} at={keepsAt + k * 6} dur={14} style={{ left: x, top: barB, width: w - 2, height: bh }}>
            <div
              style={{
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                background: TINT[tok],
                borderBottom: `5px solid ${FILL[tok]}`,
                display: "flex",
                alignItems: "center",
                paddingLeft: 14,
                ...note(23, TEXT[tok]),
                fontWeight: 650,
                whiteSpace: "nowrap",
              }}
            >
              {TOKENS[tok]} {pct(HOT.topP.renormalized[tok])}
            </div>
          </Ink>
        );
      })}
      <Note at={cutAt} x={A1 + 14} y={barB + bh / 2 - 15}>
        <span style={{ ...note(23, ACCENT_INK), fontWeight: 650 }}>rock 0%</span>
      </Note>

      {/* Fig. 4: the same rule on the lesson's own six-token block. */}
      <FigLabel n="4" title="The same cut, in a sure context and a torn one" at={adaptsAt - 6} x={X0} y={y(616)} />
      <Ink at={sureAt - 4} dur={12} style={{ left: X0, top: sureY + nh / 2 - 16 }}>
        <span style={{ ...label(22, INK), fontWeight: 600 }}>Sure</span>
      </Ink>
      <NucleusBar nuc={NUCLEUS.confident} top={sureY} height={nh} at={sureAt - 2} keptAt={oneAt} />
      <Ink at={tornAt - 4} dur={12} style={{ left: X0, top: tornY + nh / 2 - 16 }}>
        <span style={{ ...label(22, INK), fontWeight: 600 }}>Torn</span>
      </Ink>
      <NucleusBar nuc={NUCLEUS.uncertain} top={tornY} height={nh} at={tornAt - 2} keptAt={sixAt} />
      {[sureY, tornY].map((ty, k) => (
        <Svg key={k} opacity={ease(frame, (k === 0 ? sureAt : tornAt) + 4, 10)}>
          <line x1={nx(TOP_P)} x2={nx(TOP_P)} y1={ty - 10} y2={ty + nh + 10} stroke={ACCENT} strokeWidth={2.4} strokeDasharray="6 5" />
        </Svg>
      ))}
      <Note at={oneAt} x={N1 + 16} y={sureY + nh / 2 - 15}>
        <span style={{ ...note(22, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>keeps {NUCLEUS.confident.kept.length} of 6</span>
      </Note>
      <Note at={sixAt} x={N1 + 16} y={tornY + nh / 2 - 15}>
        <span style={{ ...note(22, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>keeps {NUCLEUS.uncertain.kept.length} of 6</span>
      </Note>
      </Drift>
    </AbsoluteFill>
  );
};
