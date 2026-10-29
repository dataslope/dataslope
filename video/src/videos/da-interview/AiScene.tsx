import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Hero, Kicker, Mark, X0 } from "./parts";

const ROW_Y = 330;
const PITCH = 110;

/**
 * A two-way switch, "AI on" and "AI off", thrown to off on `at`. The knob is
 * neutral at both ends: neither state is the right answer, so it takes
 * neither green nor red.
 */
const Switch: React.FC<{ at: number; x: number; y: number }> = ({ at, x, y }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at - 4, 12);
  const off = ease(frame, at + 10, 14);
  if (p <= 0) return null;
  const W = 260;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: W, height: 56, opacity: p }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 28, border: `2px solid ${INK_SOFT}`, background: PAPER }} />
      <div
        style={{
          position: "absolute",
          top: 4,
          left: 4 + off * (W / 2 - 4),
          width: W / 2 - 4,
          height: 48,
          borderRadius: 24,
          background: INK_SOFT,
        }}
      />
      <div style={{ position: "absolute", left: 0, width: W / 2, top: 14, textAlign: "center", ...label(22, off < 0.5 ? PAPER : INK_SOFT) }}>AI on</div>
      <div style={{ position: "absolute", left: W / 2, width: W / 2, top: 14, textAlign: "center", ...label(22, off >= 0.5 ? PAPER : INK_SOFT) }}>AI off</div>
    </div>
  );
};

/**
 * What AI has changed, the role page's four points, each its own beat:
 * checking beats writing (and why), what responsible use means, BI tools that
 * answer correctly only on clean metrics, and the live SQL round that is
 * usually AI-off, drawn as a switch thrown to off. The yellow mark follows
 * the narration: row 1 while it is read, then the recruiter's advice. The
 * owl is Part 8's hero, the video these questions are covered in.
 */
export const AiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("ai").from;
  const changedAt = n.word("ai", "some of it");
  const checkAt = n.word("ai", "Checking now matters more");
  const rows = [
    { at: checkAt, text: <>Checking a query an assistant wrote, more than writing one</> },
    { at: n.word("ai-use", "You'll be asked"), text: <>Responsible use: what you paste in, disclosure, no hallucinated insights</> },
    { at: n.word("ai-bi", "BI tools now answer"), text: <>BI tools that answer in plain language, correctly only on clean metrics</> },
    { at: n.word("ai-off", "the live SQL round"), text: <>The live SQL round, usually AI-off</> },
  ];
  const offAt = n.word("ai-off", "AI-off");
  const askAt = n.word("ai-off", "Ask the recruiter");
  const end = n.beat("ai-off").to;

  return (
    <AbsoluteFill>
      {rows.map((r, i) => (
        <Sfx key={i} name="el-tap" at={r.at} level={-33} />
      ))}
      <Sfx name="el-pop" at={offAt + 10} level={-32} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>What AI has changed</Kicker>
        <Headline lead="AI has changed" turn="some of it." at={from + 2} turnAt={changedAt} size={64} />

        <Hero video="da-ai-assisted" id="da-ai-assisted-owl" at={from + 10} left={1400} top={y(300)} width={400} height={400} />

        {rows.map((r, i) => {
          const p = ease(frame, r.at - 2, 14);
          if (p <= 0) return null;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: X0,
                top: y(ROW_Y) + i * h(PITCH),
                ...note(34, INK),
                whiteSpace: "nowrap",
                opacity: p,
                transform: `translateX(${(1 - p) * -16}px)`,
              }}
            >
              {i === 0 ? (
                <Mark at={checkAt + 6} out={rows[1].at}>
                  {r.text}
                </Mark>
              ) : (
                r.text
              )}
            </div>
          );
        })}
        <Switch at={offAt} x={X0 + 640} y={y(ROW_Y) + 3 * h(PITCH) - 8} />
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(ROW_Y) + 4 * h(PITCH) + h(20),
            ...note(28, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, askAt - 2, 12),
          }}
        >
          <Mark at={askAt + 4}>ask the recruiter about each round</Mark>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
