import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, body, halo, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ACCURACY, BUDGETS, FIRST_500_SHARE, kTokens } from "./data";
import { Drift, GOOD_INK, Headline, Illustrative, Kicker, Svg, X0 } from "./kit";

/** Fig. 19: the budgets at even steps (each one past 250 doubles). */
const PX0 = 230;
const PITCH = 152;
const px = (k: number) => PX0 + k * PITCH;
const A_LO = 0.4;
const A_HI = 0.85;
const C_TOP = 320;
const C_BASE = 760;
const A_TICKS = [0.4, 0.5, 0.6, 0.7, 0.8];
const RIGHT_X = 1420;

/**
 * Returns, flat, where, overthink: the lesson's stylized accuracy against
 * thinking budget (labelled so), with the share of the gain the first 500
 * tokens buy and the doubling that buys nothing, then where thinking helps,
 * where it can't, and overthinking.
 */
export const ReturnsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const start = n.beat("returns").from;
  const pointAt = n.word("returns", "up to a point");
  const firstAt = n.word("returns", "first five hundred");
  const thirdsAt = n.word("returns", "two thirds");
  const pastAt = n.word("flat", "Past eight thousand");
  const nothingAt = n.word("flat", "nothing at all");
  const paysAt = n.word("where", "pays off");
  const itemAt = [n.word("where", "math"), n.word("where", "code"), n.word("where", "planning")];
  const butAt = n.word("where", "no amount");
  const neverAt = n.word("where", "never had");
  const easyAt = n.word("overthink", "easy problem");
  const talkAt = n.word("overthink", "talk it out");

  const ay = (a: number) => y(C_BASE) - ((y(C_BASE) - y(C_TOP)) * (a - A_LO)) / (A_HI - A_LO);
  const pts = ACCURACY.map((a, k) => [px(k), ay(a)] as const);
  const draw = ease(frame, start, 40);
  const k500 = BUDGETS.indexOf(500);
  const k8k = BUDGETS.indexOf(8000);
  const last = BUDGETS.length - 1;
  const path = pts.map(([x, yy], i) => `${i ? "L" : "M"}${x},${yy}`).join(" ");

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={start} level={-35} />
      <Sfx name="el-pop" at={thirdsAt - 2} level={-31} />
      <Sfx name="el-scratch" at={nothingAt - 2} level={-35} />
      {itemAt.map((t, k) => (
        <Sfx key={k} name="el-tap" at={t - 2} level={-31} />
      ))}

      <Drift from={start} to={n.beat("bill").from} amount={0.012} origin="45% 60%">
      <Kicker at={start - 6}>Reasoning models</Kicker>
      <Headline lead="More thinking helps," turn="up to a point." at={start - 4} turnAt={pointAt - 2} />
      <FigLabel n="19" title="Accuracy against thinking tokens (the lesson's stylized curve)" at={start} x={X0} y={y(240)} />

      {/* The gain the first 500 tokens buy, shaded between the curve and its start. */}
      <Svg opacity={ease(frame, firstAt - 2, 14)}>
        <rect x={px(0)} y={ay(ACCURACY[k500])} width={px(k500) - px(0)} height={ay(ACCURACY[0]) - ay(ACCURACY[k500])} fill={HIGHLIGHT} opacity={0.55} />
      </Svg>
      {/* The doubling that buys nothing. */}
      <Svg opacity={ease(frame, pastAt - 2, 14)}>
        <rect x={px(k8k)} y={ay(ACCURACY[last]) - 24} width={px(last) - px(k8k)} height={48} fill={`color-mix(in srgb, ${ACCENT} 16%, transparent)`} />
      </Svg>

      <Svg opacity={ease(frame, start - 4, 12)}>
        {A_TICKS.map((a) => (
          <line key={a} x1={px(0) - 20} x2={px(last) + 20} y1={ay(a)} y2={ay(a)} stroke={HAIRLINE} strokeWidth={0.8} strokeDasharray="2 5" />
        ))}
        <line x1={px(0) - 20} x2={px(last) + 20} y1={y(C_BASE)} y2={y(C_BASE)} stroke={INK} strokeWidth={1.6} />
        <path d={path} fill="none" stroke={BAR} strokeWidth={3.2} pathLength={1} strokeDasharray={`${draw} 1`} />
        {pts.map(([x, yy], k) => (
          <circle key={k} cx={x} cy={yy} r={6} fill={k >= k8k ? ACCENT : BAR} stroke={PAPER} strokeWidth={2} opacity={ease(frame, start + 4 + k * 5, 8)} />
        ))}
      </Svg>
      {A_TICKS.map((a) => (
        <div key={a} style={{ position: "absolute", right: 1920 - (px(0) - 20) + 12, top: ay(a) - 13, opacity: ease(frame, start, 12), ...note(20, INK_SOFT) }}>
          {Math.round(a * 100)}%
        </div>
      ))}
      {BUDGETS.map((b, k) => (
        <div
          key={b}
          style={{ position: "absolute", left: px(k) - 50, width: 100, top: y(C_BASE) + 12, textAlign: "center", opacity: ease(frame, start + k * 3, 10), ...note(20, INK_SOFT) }}
        >
          {b === 0 ? "0" : b < 1000 ? b : kTokens(b)}
        </div>
      ))}
      <Ink at={start + 10} dur={12} style={{ left: px(0), top: y(C_BASE) + 46, width: px(last) - px(0), textAlign: "center" }}>
        <span style={label(20)}>Thinking tokens (each step past 250 doubles)</span>
      </Ink>
      {/* The accuracy at each end, in the curve's own figures. */}
      <Note at={start + 40} x={px(last)} y={pts[last][1] - 50} align="right">
        <span style={{ ...note(22, BLUE_INK), fontWeight: 650, ...halo }}>{Math.round(ACCURACY[last] * 100)}%</span>
      </Note>
      <Note at={thirdsAt - 2} x={px(k500) + 16} y={ay((ACCURACY[0] + ACCURACY[k500]) / 2) + 4}>
        <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>
          {Math.round(FIRST_500_SHARE * 100)}% of the whole gain
        </span>
      </Note>
      <Note at={nothingAt - 2} x={(px(k8k) + px(last)) / 2} y={ay(ACCURACY[last]) + 34} from="up" style={{ transform: "translateX(-50%)" }}>
        <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>+0 points</span>
      </Note>
      <Note at={start + 50} x={X0} y={y(888)}>
        <Illustrative>Stylized numbers, from the lesson. The saturating shape is what is consistently reported.</Illustrative>
      </Note>

      {/* Where it helps, where it can't, and where it hurts. */}
      <Ink at={paysAt - 2} dur={14} style={{ left: RIGHT_X, top: y(330) }}>
        <span style={label(22, GOOD_INK)}>Helps where steps can be checked</span>
      </Ink>
      {["math", "code", "planning"].map((t, k) => (
        <Ink key={t} at={itemAt[k] - 2} dur={12} style={{ left: RIGHT_X, top: y(370 + k * 46) }}>
          <span style={{ ...body(32), color: INK }}>{t}</span>
        </Ink>
      ))}
      <Ink at={butAt - 2} dur={14} style={{ left: RIGHT_X, top: y(540) }}>
        <span style={label(22, ACCENT_INK)}>Can&apos;t help</span>
      </Ink>
      <Ink at={neverAt - 8} dur={14} style={{ left: RIGHT_X, top: y(580), width: 420 }}>
        <div style={{ ...body(32), color: INK }}>recalling a fact it never had</div>
      </Ink>
      <Ink at={easyAt - 2} dur={14} style={{ left: RIGHT_X, top: y(690) }}>
        <span style={label(22, ACCENT_INK)}>Can hurt</span>
      </Ink>
      <Ink at={talkAt - 4} dur={14} style={{ left: RIGHT_X, top: y(730), width: 420 }}>
        <div style={{ ...body(32), color: INK }}>an easy problem, talked out of a right answer</div>
      </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
