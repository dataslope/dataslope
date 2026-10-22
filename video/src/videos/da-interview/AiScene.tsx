import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, Mark, OK, X0 } from "./parts";

const ROW_Y = 330;
const PITCH = 110;

/** A two-way switch, "AI on" and "AI off", thrown to off on `at`. */
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
          background: `color-mix(in srgb, ${ACCENT} ${off * 100}%, ${OK})`,
          opacity: 0.85,
        }}
      />
      <div style={{ position: "absolute", left: 0, width: W / 2, top: 14, textAlign: "center", ...label(22, off < 0.5 ? PAPER : INK_SOFT) }}>AI on</div>
      <div style={{ position: "absolute", left: W / 2, width: W / 2, top: 14, textAlign: "center", ...label(22, off >= 0.5 ? PAPER : INK_SOFT) }}>AI off</div>
    </div>
  );
};

/**
 * What AI has changed, the role page's four points: checking beats writing,
 * responsible use, BI tools that answer in plain language, and the live SQL
 * round that is usually AI-off, drawn as a switch thrown to off.
 */
export const AiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("ai").from;
  const changedAt = n.word("ai", "has changed some of it");
  const checkAt = n.word("ai", "check a query an assistant wrote");
  const rows = [
    { at: n.word("ai", "You're now as likely"), text: <>Checking a query an assistant wrote, as often as writing one</> },
    { at: n.word("ai", "responsibly"), text: <>Using these tools responsibly</> },
    { at: n.word("ai", "BI tools answer"), text: <>BI tools that answer in plain language, on top of clean metrics</> },
    { at: n.word("ai", "the live SQL round"), text: <>The live SQL round, usually AI-off</> },
  ];
  const offAt = n.word("ai", "AI-off");
  const askAt = n.word("ai", "ask the recruiter");
  const end = n.beat("ai").to;

  return (
    <AbsoluteFill>
      {rows.map((r, i) => (
        <Sfx key={i} name="el-tap" at={r.at} level={-33} />
      ))}
      <Sfx name="el-pop" at={offAt + 10} level={-32} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>What AI has changed</Kicker>
        <Headline lead="AI, artificial intelligence," turn="changed some of it." at={from + 2} turnAt={changedAt} size={64} />

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
              {i === 0 ? <Mark at={checkAt + 6}>{r.text}</Mark> : r.text}
            </div>
          );
        })}
        <Switch at={offAt} x={X0 + 640} y={y(ROW_Y) + 3 * h(PITCH) - 8} />
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(ROW_Y) + 4 * h(PITCH) + h(20),
            ...note(28, ACCENT_INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, askAt - 2, 12),
          }}
        >
          ask the recruiter about each round
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
