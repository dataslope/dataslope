import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { count, NOVELTY, SRM } from "./data";
import { Drift, Headline, Kicker, MARK_BAD, OK, OK_INK, pulse, Spot, X0 } from "./parts";

const CARD_TOP = 330;
const CARD_W = 760;
const ROW_H = 74;
const HEAD_H = 64;
const FLAG_X = X0 + CARD_W + 36;

/**
 * The opening: an experiment readout that says ship it, taken apart. Its
 * users row is the page's SRM split, its lift DA Part 7's week-one novelty
 * figure, and its metric one of ten: three rows that are three of this
 * video's questions. Then the round: fourteen questions, ten with a figure.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const startAt = n.word("hook", "The A B test is live");
  const splitAt = n.word("hook", "users split at random");
  const readoutAt = n.word("hook", "the readout says");
  const wonAt = n.word("hook", "the new one won");
  const shipAt = n.word("hook", "ship it today");
  const closerAt = n.word("hook", "Look closer first");
  const sizeAt = n.word("hook", "aren't the size you asked for");
  const weekAt = n.word("hook", "It's only week one");
  const bestAt = n.word("hook", "the best of ten metrics");
  const nothingAt = n.word("hook", "turn a win into nothing");
  const roundAt = n.word("plan", "experiments once they're running");
  const fourteenAt = n.word("plan", "fourteen questions");
  const tenAt = n.word("plan", "Ten get a figure each");
  const fourAt = n.word("plan", "The other four");
  const passingAt = n.word("plan", "take in passing");
  const end = n.beat("plan").to;

  const [a, b] = SRM.bad.observed;
  const ROWS = [
    { key: "users", name: "Users per arm", value: `${count(a)} · ${count(b)}`, at: splitAt + 4, flag: sizeAt, note: "not the size you asked for" },
    { key: "lift", name: "Conversion lift", value: `+${NOVELTY.novelty[0].toFixed(1)}%`, at: wonAt - 2, flag: undefined, note: "" },
    { key: "week", name: "Data from", value: "week 1", at: readoutAt + 8, flag: weekAt, note: "only week one" },
    { key: "metric", name: "Metric", value: "best of 10", at: readoutAt + 12, flag: bestAt, note: "the best of ten metrics" },
  ];

  const cardP = ease(frame, readoutAt - 4, 14);
  const look = pulse(frame, closerAt, 22);
  const stamp = pop(frame, shipAt, fps, 12);
  const stampStrike = ease(frame, nothingAt + 2, 12);
  const liftStrike = ease(frame, nothingAt, 12);
  const dimCard = ease(frame, roundAt, 16) * 0.55;
  const cardBottom = y(CARD_TOP) + HEAD_H + ROWS.length * ROW_H;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={readoutAt} level={-36} />
      <Sfx name="el-pop" at={shipAt + 2} level={-34} />
      {ROWS.filter((r) => r.flag !== undefined).map((r) => (
        <Sfx key={r.key} name="el-tap" at={r.flag as number} level={-36} />
      ))}
      <Sfx name="el-scratch" at={nothingAt + 2} level={-34} />
      <Sfx name="el-chime" at={fourteenAt} level={-36} />

      <Drift from={0} to={end + 20}>
        <Kicker at={startAt}>Data scientist interview prep · Experimentation II</Kicker>
        <Headline lead="The readout says it won." turn="Look closer." at={readoutAt - 2} turnAt={closerAt} size={72} />
        <Spot id="ds-experiments-in-practice-turtle" at={startAt + 12} left={1480} top={y(560)} width={340} height={230} />

        {/* The readout card. */}
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(CARD_TOP),
            width: CARD_W,
            height: HEAD_H + ROWS.length * ROW_H,
            boxSizing: "border-box",
            border: `2px solid ${INK}`,
            borderRadius: 10,
            background: PAPER,
            boxShadow: look > 0 ? `0 0 0 ${6 * look}px color-mix(in srgb, ${ACCENT} ${30 * look}%, transparent)` : undefined,
            opacity: cardP * (1 - dimCard),
            transform: `translateY(${(1 - cardP) * 16}px)`,
          }}
        >
          <div style={{ height: HEAD_H, display: "flex", alignItems: "center", padding: "0 24px", borderBottom: `1px solid ${HAIRLINE}` }}>
            <span style={{ ...label(22, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>New checkout · A/B test readout</span>
          </div>
          {ROWS.map((r, i) => {
            const p = ease(frame, r.at, 10);
            const flag = r.flag === undefined ? 0 : ease(frame, r.flag, 10);
            return (
              <div
                key={r.key}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: HEAD_H + i * ROW_H,
                  height: ROW_H,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 24px",
                  background: flag > 0 ? `color-mix(in srgb, ${MARK_BAD} ${flag * 100}%, transparent)` : undefined,
                  borderTop: i ? `1px solid color-mix(in srgb, ${INK} 18%, transparent)` : undefined,
                  opacity: p,
                }}
              >
                <span style={{ ...note(27, INK_SOFT), whiteSpace: "nowrap" }}>{r.name}</span>
                <span
                  style={{
                    position: "relative",
                    ...note(30, r.key === "lift" ? OK_INK : r.flag !== undefined && flag > 0.5 ? ACCENT_INK : INK),
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    ...TABULAR,
                  }}
                >
                  {r.value}
                  {r.key === "lift" ? (
                    <span
                      style={{
                        position: "absolute",
                        left: -4,
                        top: "52%",
                        width: `calc((100% + 8px) * ${liftStrike})`,
                        height: 4,
                        background: ACCENT,
                        borderRadius: 2,
                      }}
                    />
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>

        {/* The stamp somebody wants. */}
        {stamp > 0.001 ? (
          <div
            style={{
              position: "absolute",
              left: X0 + CARD_W - 210,
              top: y(CARD_TOP) - 26,
              padding: "8px 18px",
              border: `3px solid ${OK}`,
              borderRadius: 8,
              background: PAPER,
              ...label(24, OK_INK),
              fontWeight: 800,
              whiteSpace: "nowrap",
              transform: `rotate(-6deg) scale(${0.6 + 0.4 * Math.min(1, stamp)})`,
              opacity: Math.min(1, stamp) * (1 - dimCard),
            }}
          >
            ship it today
            <span
              style={{
                position: "absolute",
                left: 6,
                top: "50%",
                width: `calc((100% - 12px) * ${stampStrike})`,
                height: 4,
                background: ACCENT,
                borderRadius: 2,
              }}
            />
          </div>
        ) : null}

        {/* What a closer look finds, beside each row it is about. */}
        {ROWS.map((r, i) =>
          r.flag === undefined ? null : (
            <Note key={r.key} at={r.flag + 2} x={FLAG_X} y={y(CARD_TOP) + HEAD_H + i * ROW_H + 18} out={roundAt + 4}>
              <span style={{ ...note(25, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>← {r.note}</span>
            </Note>
          ),
        )}

        {/* The round. */}
        <Note at={fourteenAt - 4} x={X0} y={cardBottom + h(40)}>
          <span style={{ ...note(32, INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>
            Experiments once they're running: <span style={{ color: BLUE_INK }}>14 questions</span>
          </span>
        </Note>
        <Note at={tenAt - 2} x={X0} y={cardBottom + h(96)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap", ...TABULAR }}>
            <b style={{ color: BLUE_INK }}>10</b> with a figure each
          </span>
        </Note>
        <Note at={fourAt - 2} x={X0 + 360} y={cardBottom + h(96)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap", ...TABULAR }}>
            <b style={{ color: OK_INK }}>4</b> short ones
            <span style={{ opacity: ease(frame, passingAt - 2, 10) }}>, taken in passing</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
