import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { badgeStyle } from "../../editorial/ui";
import { Drift, Headline, Kicker, Mark, OK_INK, X0 } from "./parts";

/** Two columns of text, each at its left edge, the second 880px in, so a
 *  column's figure (FIG_X in, 220 wide) ends 50px short of the hairline in
 *  the gap and the second column's figure ends at 1780. */
const COL_X = [X0, X0 + 880];
const ROW_Y = [290, 560];
/** Where each block's small figure sits, from its text's left edge. */
const FIG_X = 560;
/** The figure's right edge, from the text's left edge. */
const FIG_R = FIG_X + 220;
/** How tall each row's hairline stands, in px (text does not stretch with
 *  the layout): the row's text, title to last line. */
const RULE_H = [192, 172];

/** One of the four points: a title over its lines and its small figure, as a
 *  block of plain text that inks in on `at`. The second block on a row gets a
 *  hairline in the gap before it, inking in with it. */
const Panel: React.FC<{ i: number; at: number; title: string; children: React.ReactNode }> = ({ i, at, title, children }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const p = ease(frame, at - 2, 14);
  if (p <= 0) return null;
  const row = Math.floor(i / 2);
  const left = COL_X[i % 2];
  return (
    <>
      {i % 2 === 1 ? (
        <div
          style={{
            position: "absolute",
            left: (COL_X[0] + FIG_R + COL_X[1]) / 2,
            top: y(ROW_Y[row]),
            width: 1,
            height: RULE_H[row],
            background: HAIRLINE,
            opacity: p,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left,
          top: y(ROW_Y[row]),
          width: FIG_R,
          opacity: p,
          transform: `translateY(${(1 - p) * 14}px)`,
        }}
      >
        <div style={{ ...note(32, INK), fontWeight: 500, marginBottom: 16, whiteSpace: "nowrap" }}>{title}</div>
        {children}
      </div>
    </>
  );
};

const line = (frame: number, at: number): React.CSSProperties => ({
  ...note(26, INK_SOFT),
  lineHeight: 1.35,
  whiteSpace: "nowrap",
  opacity: ease(frame, at - 2, 12),
});

/**
 * What AI has brought in (`ai`), the role page's four points, a block of
 * plain text each in two rows of two, a hairline between the blocks on a row,
 * each with its own beat: evaluating an LLM feature as a measurement problem,
 * with an interval on a pass rate between 0% and 100% (`ai-eval`);
 * experiments where the output itself varies, drawn as three labeled runs of
 * one prompt that never settle, and where the provider can change the model
 * mid-test (`ai-exp`); checking what an assistant wrote (`ai-check`); and
 * coding rounds that allow an assistant and grade how you check its work,
 * beside rounds that ban it (`ai-rounds`).
 */
export const AiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { h } = useLayout();

  const from = n.beat("ai").from;
  const broughtAt = n.word("ai", "has brought in new questions");
  // Panel 1 inks in as "an LLM" is said, so the panel names what was said.
  const llmAt = n.word("ai-eval", "built on an LLM");
  const measureAt = n.word("ai-eval", "a measurement problem");
  const setAt = n.word("ai-eval", "an eval set");
  const ciAt = n.word("ai-eval", "a confidence interval");
  const judgeAt = n.word("ai-eval", "an LLM judge");
  const expAt = n.word("ai-exp", "Experiments on AI features");
  const runAt = n.word("ai-exp", "changes from one run to the next");
  const swapAt = n.word("ai-exp", "the provider can change the model");
  const checkAt = n.word("ai-check", "Checking code");
  const analysisAt = n.word("ai-check", "or an analysis");
  const allowAt = n.word("ai-rounds", "some coding rounds allow an assistant");
  const gradeAt = n.word("ai-rounds", "grade how you check its work");
  const banAt = n.word("ai-rounds", "Others ban it");
  const askAt = n.word("ai-rounds", "ask the recruiter about each round");
  const end = n.beat("ai-rounds").to;

  // Panel 1's figure: a pass rate with its interval, drawn on a short scale.
  const ciP = ease(frame, ciAt, 16);
  // Panel 2's figure: three runs of one prompt, each bar breathing on its own.
  const runP = ease(frame, runAt - 4, 14);
  const runs = [0, 1, 2].map((k) => 70 + 26 * Math.sin(frame / (11 + 4 * k) + k * 2.1));
  const checkP = ease(frame, analysisAt + 4, 12);

  return (
    <AbsoluteFill>
      {[llmAt, expAt, checkAt, allowAt].map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-33} />
      ))}
      <Sfx name="el-pop" at={banAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>What AI has changed</Kicker>
        <Headline lead="AI has" turn="brought in new questions." at={from + 2} turnAt={broughtAt} size={62} />

        <Panel i={0} at={llmAt} title="Evaluating an LLM feature">
          <div style={{ ...line(frame, measureAt), color: INK }}>
            <Mark at={measureAt + 4}>A measurement problem</Mark>
          </div>
          <div style={line(frame, setAt)}>An eval set of test prompts</div>
          <div style={line(frame, ciAt)}>An interval on its pass rate</div>
          <div style={line(frame, judgeAt)}>Does the LLM judge agree with experts?</div>
          <svg style={{ position: "absolute", left: FIG_X, top: 66, overflow: "visible" }} width={220} height={80}>
            <line x1={0} x2={220} y1={60} y2={60} stroke={INK_SOFT} strokeWidth={1.4} opacity={ciP} />
            {[0, 220].map((x) => (
              <line key={x} x1={x} x2={x} y1={55} y2={65} stroke={INK_SOFT} strokeWidth={1.4} opacity={ciP} />
            ))}
            {(
              [
                { x: 0, y: 86, anchor: "start", text: "0%" },
                { x: 220, y: 86, anchor: "end", text: "100%" },
                { x: 110, y: 110, anchor: "middle", text: "pass rate" },
              ] as const
            ).map((t) => (
              <text key={t.text} x={t.x} y={t.y} textAnchor={t.anchor} style={label(20, INK_SOFT)} fill={INK_SOFT} opacity={ciP}>
                {t.text}
              </text>
            ))}
            <line x1={110 - 46 * ciP} x2={110 + 46 * ciP} y1={36} y2={36} stroke={BAR} strokeWidth={4} strokeLinecap="round" opacity={ciP} />
            <line x1={110 - 46 * ciP} x2={110 - 46 * ciP} y1={26} y2={46} stroke={BAR} strokeWidth={3} opacity={ciP} />
            <line x1={110 + 46 * ciP} x2={110 + 46 * ciP} y1={26} y2={46} stroke={BAR} strokeWidth={3} opacity={ciP} />
            <circle cx={110} cy={36} r={8 * ciP} fill={BAR} />
          </svg>
        </Panel>

        <Panel i={1} at={expAt} title="Experiments on AI features">
          <div style={line(frame, runAt)}>The output changes</div>
          <div style={line(frame, runAt + 6)}>from one run to the next,</div>
          <div style={line(frame, swapAt)}>and the model can change mid-test</div>
          <svg style={{ position: "absolute", left: FIG_X, top: 24, overflow: "visible" }} width={220} height={140}>
            <line x1={0} x2={220} y1={130} y2={130} stroke={INK_SOFT} strokeWidth={1.4} opacity={runP} />
            {runs.map((v, k) => (
              <rect key={k} x={20 + k * 70} y={130 - v * runP} width={44} height={v * runP} rx={4} fill={BAR} opacity={0.35 + 0.25 * k} />
            ))}
            {runs.map((_, k) => (
              <text key={k} x={42 + k * 70} y={156} textAnchor="middle" style={label(20, INK_SOFT)} fill={INK_SOFT} opacity={runP}>
                run {k + 1}
              </text>
            ))}
          </svg>
        </Panel>

        <Panel i={2} at={checkAt} title="Checking what an assistant wrote">
          <div style={line(frame, checkAt + 4)}>Its code</div>
          <div style={line(frame, analysisAt)}>or a whole analysis</div>
          <div
            style={{
              position: "absolute",
              left: FIG_X - 40,
              top: 70,
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
            <span style={{ color: BLUE_INK, fontWeight: 500 }}>SELECT</span> …
            <span style={{ display: "inline-block", width: 34 }} />
            <span style={{ color: OK_INK, fontWeight: 500, opacity: checkP, display: "inline-block", transform: `scale(${0.6 + 0.4 * checkP})` }}>✓</span>
          </div>
        </Panel>

        <Panel i={3} at={allowAt} title="Assistant allowed, or banned">
          <div style={{ display: "flex", gap: 18, marginTop: 6 }}>
            {[
              { at: allowAt + 6, text: "allowed", tone: "green" as const },
              { at: banAt, text: "banned", tone: "red" as const },
            ].map((pill) => {
              const q = ease(frame, pill.at - 2, 12);
              return (
                <div
                  key={pill.text}
                  style={{
                    ...label(24),
                    ...badgeStyle(pill.tone, 24),
                    opacity: q,
                    transform: `scale(${0.8 + 0.2 * q})`,
                  }}
                >
                  {pill.text}
                </div>
              );
            })}
          </div>
          <div style={{ ...line(frame, gradeAt), color: INK, marginTop: h(14) }}>
            If allowed, <Mark at={gradeAt + 4}>graded on how you check its work</Mark>
          </div>
          <div style={{ ...line(frame, askAt), color: INK }}>Ask the recruiter about each round</div>
        </Panel>
      </Drift>
    </AbsoluteFill>
  );
};
