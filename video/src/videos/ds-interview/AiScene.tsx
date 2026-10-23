import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, Mark, OK, OK_INK, X0 } from "./parts";

const PANEL_W = 820;
const GAP = 40;
const ROW_Y = [290, 560];
const PANEL_H = 240;
/** Where each panel's small figure sits, from the panel's left edge. */
const FIG_X = 560;

/** A panel that inks in on `at`, with its title, its lines and its figure. */
const Panel: React.FC<{ i: number; at: number; title: string; children: React.ReactNode }> = ({ i, at, title, children }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const p = ease(frame, at - 2, 14);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: X0 + (i % 2) * (PANEL_W + GAP),
        top: y(ROW_Y[Math.floor(i / 2)]),
        width: PANEL_W,
        height: h(PANEL_H),
        boxSizing: "border-box",
        border: `1.5px solid ${HAIRLINE}`,
        borderRadius: 12,
        background: PAPER,
        padding: "26px 30px",
        opacity: p,
        transform: `translateY(${(1 - p) * 14}px)`,
      }}
    >
      <div style={{ ...note(32, INK), fontWeight: 650, marginBottom: 16, whiteSpace: "nowrap" }}>{title}</div>
      {children}
    </div>
  );
};

const line = (frame: number, at: number): React.CSSProperties => ({
  ...note(26, INK_SOFT),
  lineHeight: 1.35,
  whiteSpace: "nowrap",
  opacity: ease(frame, at - 2, 12),
});

/**
 * What AI has brought in, the role page's four points, one panel each:
 * evaluating an LLM feature as a measurement problem, with an interval on a
 * pass rate; experiments where the output itself varies, drawn as three runs
 * of one prompt that never settle; checking what an assistant wrote; and
 * rounds that allow an assistant and rounds that ban it.
 */
export const AiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { h } = useLayout();
  const w = (p: string) => n.word("ai", p);

  const from = n.beat("ai").from;
  const broughtAt = w("has brought in new questions");
  const evalAt = w("Evaluating a feature");
  const measureAt = w("a measurement problem");
  const setAt = w("an eval set");
  const ciAt = w("a confidence interval");
  const judgeAt = w("an LLM judge agrees with experts");
  const expAt = w("Experiments on AI features");
  const runAt = w("changes from one run to the next");
  const checkAt = w("Checking code");
  const analysisAt = w("or an analysis");
  const allowAt = w("some rounds allow an assistant");
  const banAt = w("others ban it");
  const askAt = w("ask the recruiter which is which");
  const end = n.beat("ai").to;

  // Panel 1's figure: a pass rate with its interval, drawn on a short scale.
  const ciP = ease(frame, ciAt, 16);
  // Panel 2's figure: three runs of one prompt, each bar breathing on its own.
  const runP = ease(frame, runAt - 4, 14);
  const runs = [0, 1, 2].map((k) => 70 + 26 * Math.sin(frame / (11 + 4 * k) + k * 2.1));
  const checkP = ease(frame, analysisAt + 4, 12);

  return (
    <AbsoluteFill>
      {[evalAt, expAt, checkAt, allowAt].map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-33} />
      ))}
      <Sfx name="el-pop" at={banAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>What AI has changed</Kicker>
        <Headline lead="AI, artificial intelligence," turn="brought in new questions." at={from + 2} turnAt={broughtAt} size={62} />

        <Panel i={0} at={evalAt} title="Evaluating an LLM feature">
          <div style={{ ...line(frame, measureAt), color: INK }}>
            <Mark at={measureAt + 4}>a measurement problem</Mark>
          </div>
          <div style={line(frame, setAt)}>an eval set</div>
          <div style={line(frame, ciAt)}>an interval on its pass rate</div>
          <div style={line(frame, judgeAt)}>does the judge agree with experts?</div>
          <svg style={{ position: "absolute", left: FIG_X, top: 92, overflow: "visible" }} width={220} height={80}>
            <line x1={0} x2={220} y1={60} y2={60} stroke={INK_SOFT} strokeWidth={1.4} opacity={ciP} />
            <line x1={110 - 46 * ciP} x2={110 + 46 * ciP} y1={36} y2={36} stroke={BAR} strokeWidth={4} strokeLinecap="round" />
            <line x1={110 - 46 * ciP} x2={110 - 46 * ciP} y1={26} y2={46} stroke={BAR} strokeWidth={3} opacity={ciP} />
            <line x1={110 + 46 * ciP} x2={110 + 46 * ciP} y1={26} y2={46} stroke={BAR} strokeWidth={3} opacity={ciP} />
            <circle cx={110} cy={36} r={8 * ciP} fill={BAR} />
          </svg>
        </Panel>

        <Panel i={1} at={expAt} title="Experiments on AI features">
          <div style={line(frame, runAt)}>the output changes</div>
          <div style={line(frame, runAt + 6)}>from one run to the next</div>
          <svg style={{ position: "absolute", left: FIG_X, top: 50, overflow: "visible" }} width={220} height={140}>
            <line x1={0} x2={220} y1={130} y2={130} stroke={INK_SOFT} strokeWidth={1.4} opacity={runP} />
            {runs.map((v, k) => (
              <rect key={k} x={20 + k * 70} y={130 - v * runP} width={44} height={v * runP} rx={4} fill={BAR} opacity={0.35 + 0.25 * k} />
            ))}
          </svg>
        </Panel>

        <Panel i={2} at={checkAt} title="Checking what an assistant wrote">
          <div style={line(frame, checkAt + 4)}>its code</div>
          <div style={line(frame, analysisAt)}>or a whole analysis</div>
          <div
            style={{
              position: "absolute",
              left: FIG_X - 40,
              top: 96,
              padding: "10px 16px",
              border: `1.5px solid ${HAIRLINE}`,
              borderRadius: 8,
              fontFamily: MONO,
              fontSize: 22,
              color: INK,
              whiteSpace: "pre",
              fontVariantLigatures: "none",
              opacity: ease(frame, checkAt + 6, 12),
            }}
          >
            <span style={{ color: BLUE_INK, fontWeight: 600 }}>SELECT</span> …
            <span style={{ display: "inline-block", width: 34 }} />
            <span style={{ color: OK_INK, fontWeight: 700, opacity: checkP, display: "inline-block", transform: `scale(${0.6 + 0.4 * checkP})` }}>✓</span>
          </div>
        </Panel>

        <Panel i={3} at={allowAt} title="Assistant allowed, or banned">
          <div style={{ display: "flex", gap: 18, marginTop: 6 }}>
            {[
              { at: allowAt + 6, text: "allowed", color: OK, ink: OK_INK },
              { at: banAt, text: "banned", color: ACCENT, ink: ACCENT_INK },
            ].map((pill) => {
              const q = ease(frame, pill.at - 2, 12);
              return (
                <div
                  key={pill.text}
                  style={{
                    padding: "8px 22px",
                    borderRadius: 28,
                    border: `2px solid ${pill.color}`,
                    background: `color-mix(in srgb, ${pill.color} 16%, ${PAPER})`,
                    ...label(24, pill.ink),
                    opacity: q,
                    transform: `scale(${0.8 + 0.2 * q})`,
                  }}
                >
                  {pill.text}
                </div>
              );
            })}
          </div>
          <div style={{ ...note(26, ACCENT_INK), marginTop: h(26), whiteSpace: "nowrap", opacity: ease(frame, askAt - 2, 12) }}>
            ask the recruiter which is which
          </div>
        </Panel>
      </Drift>
    </AbsoluteFill>
  );
};
