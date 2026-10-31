import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FRESH } from "./data";
import { Drift, Headline, Kicker, OK_INK, Pill, Spot, X0 } from "./parts";

const CARD_TOP = 320;
const CARD_W = 720;
const HEAD_H = 62;
const ROW_H = 72;
const DASH_X = 900;
const DASH_W = 470;

/**
 * The opening: last night's three jobs, each reporting success, and the
 * dashboard at six still showing yesterday's numbers. The bars are the
 * video's own daily_orders (Question ten runs its freshness check on them):
 * June 1 and 2 full, June 3 never loaded. Then the round: fourteen
 * questions, eleven with a figure.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const startAt = n.word("hook", "Every job ran last night");
  const successAt = n.word("hook", "every one reported success");
  const sixAt = n.word("hook", "At six");
  const yestAt = n.word("hook", "yesterday's numbers");
  const failedAt = n.word("hook", "Nothing failed");
  const readyAt = n.word("hook", "Nothing was ready");
  const roundAt = n.word("plan", "keeping data on time");
  const orderAt = n.word("plan", "tasks in order");
  const recoverAt = n.word("plan", "recovery from failure");
  const badAt = n.word("plan", "bad data caught early");
  const fourteenAt = n.word("plan", "Fourteen questions");
  const elevenAt = n.word("plan", "eleven with a figure");
  const threeAt = n.word("plan", "three quick ones");
  const end = n.beat("plan").to;

  const JOBS = [
    { time: "01:00", name: "extract" },
    { time: "02:00", name: "transform" },
    { time: "03:00", name: "load" },
  ];
  const cardP = ease(frame, startAt + 2, 14);
  const dashP = ease(frame, sixAt, 14);
  const top = y(CARD_TOP);
  const cardH = HEAD_H + JOBS.length * ROW_H;
  const dim = ease(frame, roundAt, 16) * 0.45;

  // The dashboard's bars: orders per day in daily_orders. June 3's never came.
  const DAYS = [
    { name: "Jun 1", v: FRESH.rowsPerDay },
    { name: "Jun 2", v: FRESH.rowsPerDay },
    { name: "Jun 3", v: 0 },
  ];
  const BAR_W = 76;
  const base = top + cardH - h(64);
  const barH = h(104);

  return (
    <AbsoluteFill>
      {JOBS.map((j, i) => (
        <Sfx key={j.name} name="el-tap" at={successAt + 4 + i * 5} level={-36} />
      ))}
      <Sfx name="el-pop" at={sixAt + 2} level={-34} />
      <Sfx name="el-pencil" at={yestAt} level={-36} />
      <Sfx name="el-chime" at={fourteenAt} level={-36} />

      <Drift from={0} to={end + 20}>
        <Kicker at={startAt}>Data engineer interview prep · Orchestration and reliability</Kicker>
        <Headline lead="Nothing failed." turn="Nothing was ready." at={failedAt - 2} turnAt={readyAt - 2} size={72} />
        <Spot id="de-orchestration-collie" at={startAt + 10} left={1424} top={y(330)} width={400} height={242} />

        {/* Last night's runs, each reporting success. */}
        <div
          style={{
            position: "absolute",
            left: X0,
            top,
            width: CARD_W,
            height: cardH,
            boxSizing: "border-box",
            border: `2px solid ${INK}`,
            borderRadius: 10,
            background: PAPER,
            opacity: cardP * (1 - dim),
            transform: `translateY(${(1 - cardP) * 16}px)`,
          }}
        >
          <div style={{ height: HEAD_H, display: "flex", alignItems: "center", padding: "0 24px", borderBottom: `1px solid ${HAIRLINE}` }}>
            <span style={{ ...label(22, INK_SOFT), fontWeight: 700 }}>Last night&apos;s runs</span>
          </div>
          {JOBS.map((j, i) => {
            const p = ease(frame, startAt + 6 + i * 4, 10);
            const ok = successAt + 4 + i * 5;
            return (
              <div
                key={j.name}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: HEAD_H + i * ROW_H,
                  height: ROW_H,
                  display: "flex",
                  alignItems: "center",
                  gap: 26,
                  padding: "0 24px",
                  borderTop: i ? `1px solid color-mix(in srgb, ${INK} 18%, transparent)` : undefined,
                  opacity: p,
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 25, fontWeight: 600, color: INK_SOFT, fontVariantLigatures: "none" }}>{j.time}</span>
                <span style={{ ...note(29, INK), fontWeight: 600, flex: 1 }}>{j.name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 10, ...note(26, OK_INK), fontWeight: 700, opacity: ease(frame, ok, 8) }}>
                  success
                  {frame >= ok ? <Tick at={ok} size={26} /> : <span style={{ width: 26 }} />}
                </span>
              </div>
            );
          })}
        </div>

        {/* The dashboard at six. */}
        <div
          style={{
            position: "absolute",
            left: DASH_X,
            top,
            width: DASH_W,
            height: cardH,
            boxSizing: "border-box",
            border: `2px solid ${INK}`,
            borderRadius: 10,
            background: PAPER,
            opacity: dashP * (1 - dim),
            transform: `translateY(${(1 - dashP) * 16}px)`,
          }}
        >
          <div style={{ height: HEAD_H, display: "flex", alignItems: "center", padding: "0 24px", borderBottom: `1px solid ${HAIRLINE}` }}>
            <span style={{ ...label(22, INK_SOFT), fontWeight: 700 }}>Orders dashboard · 06:00</span>
          </div>
        </div>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: dashP * (1 - dim) }}>
          {DAYS.map((d, i) => {
            const x = DASH_X + 60 + i * (BAR_W + 50);
            const p = ease(frame, sixAt + 6 + i * 4, 12);
            if (d.v === 0) {
              return (
                <rect
                  key={d.name}
                  x={x}
                  y={base - barH}
                  width={BAR_W}
                  height={barH}
                  rx={3}
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth={2.2}
                  strokeDasharray="7 6"
                  opacity={ease(frame, yestAt, 12)}
                />
              );
            }
            return <rect key={d.name} x={x} y={base - barH * p} width={BAR_W} height={barH * p} rx={3} fill={BAR} opacity={0.85} />;
          })}
          <line x1={DASH_X + 40} x2={DASH_X + DASH_W - 40} y1={base} y2={base} stroke={INK} strokeWidth={1.6} />
        </svg>
        {DAYS.map((d, i) => (
          <div
            key={d.name}
            style={{
              position: "absolute",
              left: DASH_X + 60 + i * (BAR_W + 50) - 20,
              width: BAR_W + 40,
              top: base + h(10),
              textAlign: "center",
              ...label(20, d.v === 0 ? ACCENT_INK : INK_SOFT),
              opacity: dashP * (1 - dim),
            }}
          >
            {d.name}
          </div>
        ))}
        <Note at={yestAt + 2} x={DASH_X} y={top + cardH + h(22)} out={roundAt}>
          <span style={{ ...note(27, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>June 3 never loaded: still yesterday&apos;s numbers</span>
        </Note>

        {/* The round. */}
        {[
          { text: "tasks in order", at: orderAt },
          { text: "recovery from failure", at: recoverAt },
          { text: "bad data caught early", at: badAt },
        ].map((c, i) => (
          <Pill key={c.text} x={X0 + [0, 270, 620][i]} y={y(650)} at={c.at - 2} ink={BLUE_INK} size={25}>
            {c.text}
          </Pill>
        ))}
        <Note at={fourteenAt - 4} x={X0} y={y(740)}>
          <span style={{ ...note(32, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            Orchestration and reliability:{" "}
            <span style={{ color: BLUE_INK }}>
              <Num>14</Num> questions
            </span>
          </span>
        </Note>
        <Note at={elevenAt - 2} x={X0} y={y(800)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>
              <Num>11</Num>
            </b>{" "}
            with a figure each
          </span>
        </Note>
        <Note at={threeAt - 2} x={X0 + 330} y={y(800)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>
              <Num>3</Num>
            </b>{" "}
            quick ones
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
