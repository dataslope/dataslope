import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, headline, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import {
  BAYES,
  COLOR,
  COLOR_INK,
  COUNT,
  ILLUSTRATIONS,
  ODDS,
  POPULATION,
  PPV,
  PREVALENCE,
  SENSITIVITY,
  SPECIFICITY,
  VIDEO,
  num,
  pct,
} from "./data";
import { Headline, Held } from "./parts";

/** Fig. 4's bars run from here, one pixel per 8.3 people. */
const BARS = { x0: 440, x1: 1640, top: 622, gap: 60, height: 40 } as const;

/**
 * Bayes and neglect: the answer as a count, true positives over all
 * positives, and then why the false alarms win: who takes the test.
 */
export const BayesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("bayes").from;
  const shareAt = n.word("bayes", "what share");
  const everyoneAt = n.word("bayes", "Of everyone");
  const numAt = n.word("bayes", "true positives");
  const denAt = n.word("bayes", "all the positives");
  const resultAt = n.word("bayes", "all the positives", { edge: "end" });
  const winAt = n.word("neglect", "false alarms win");
  const outnumberAt = n.word("neglect", "outnumber");
  const ratioAt = n.word("neglect", "a thousand to one");
  const termAt = n.word("neglect", "base-rate neglect");
  const toaster = pop(frame, winAt - 2, fps, 16);

  const healthyW = BARS.x1 - BARS.x0;
  const bars = [
    { key: "has", name: "Have it", count: COUNT.sick, w: Math.max(4, (healthyW * COUNT.sick) / COUNT.healthy), color: COLOR.hasIt, ink: COLOR_INK.hasIt },
    { key: "not", name: "Don't have it", count: COUNT.healthy, w: healthyW, color: COLOR.crowd, ink: INK_SOFT },
  ];
  const rates = `${SENSITIVITY} × ${PREVALENCE} ÷ (${SENSITIVITY} × ${PREVALENCE} + ${(1 - SPECIFICITY).toFixed(2)} × ${1 - PREVALENCE}) = ${BAYES.toFixed(3)}`;

  return (
    <AbsoluteFill>
      <Headline
        top={y(104)}
        first="Of everyone who tests positive,"
        second="what share has it?"
        firstAt={start - 6}
        secondAt={shareAt - 2}
      />
      <FigLabel n="3" title="Bayes' rule, as a count" at={start + 4} x={160} y={y(196)} />

      {/* The fraction, its two readings beside it, and the answer. */}
      <div
        style={{
          position: "absolute",
          left: 160,
          top: y(268),
          display: "grid",
          gridTemplateColumns: "auto auto auto",
          columnGap: 48,
          alignItems: "center",
        }}
      >
        <Held at={numAt - 2} style={{ justifySelf: "center", ...headline(104), color: COLOR_INK.hasIt }}>
          {num(COUNT.tp)}
        </Held>
        <Held at={shareAt + 4}>
          <div style={label(24, COLOR_INK.hasIt)}>Positive, and have it</div>
          <div style={{ ...note(22, INK_SOFT), marginTop: 4 }}>
            {pct(SENSITIVITY)} of the {num(COUNT.sick)} who have it
          </div>
        </Held>
        <Held at={resultAt} style={{ gridRow: "1 / 4", gridColumn: 3, ...headline(132, true), color: COLOR_INK.falseAlarm }}>
          ≈ {pct(PPV)}
        </Held>

        <div
          style={{
            gridColumn: 1,
            height: 4,
            margin: `${h(12)}px 0`,
            background: INK,
            transformOrigin: "left",
            // The fraction's bar goes down with its first reading, so both labels
            // have a line to sit against.
            transform: `scaleX(${ease(frame, everyoneAt, 14)})`,
          }}
        />
        <div style={{ gridColumn: 2 }} />

        <Held at={denAt - 2} style={{ justifySelf: "center", ...headline(104), color: INK }}>
          <span style={{ color: COLOR_INK.hasIt }}>{num(COUNT.tp)}</span>
          <span style={{ color: INK_SOFT }}> + </span>
          <span style={{ color: COLOR_INK.falseAlarm }}>{num(COUNT.fp)}</span>
        </Held>
        <Held at={everyoneAt + 4}>
          <div style={label(24, INK)}>Everyone who tests positive</div>
          <div style={{ ...note(22, INK_SOFT), marginTop: 4 }}>
            plus {pct(1 - SPECIFICITY)} of the {num(COUNT.healthy)} who don&apos;t
          </div>
        </Held>
      </div>
      <Note at={resultAt + 14} x={160} y={y(520)}>
        <span style={note(20, INK_SOFT)}>The same in rates: {rates}</span>
      </Note>

      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="base-rate-toaster"
          style={{
            position: "absolute",
            left: 1440,
            top: y(236),
            width: 380,
            height: 280,
            opacity: toaster,
            transform: `translateY(${bob(frame, 5, 110) + (1 - toaster) * 30}px)`,
          }}
        />
      ) : null}

      {/* Fig. 4: who takes the test. */}
      <FigLabel n="4" title={`Who takes the test, out of ${num(POPULATION)}`} at={winAt} x={160} y={y(574)} />
      {bars.map((b, i) => {
        const top = y(BARS.top + i * BARS.gap);
        const grow = ease(frame, outnumberAt - 4 + i * 6, 22);
        return (
          <React.Fragment key={b.key}>
            <Ink at={winAt + 4 + i * 4} dur={14} style={{ left: 160, top: top + h(BARS.height) / 2 - 15 }}>
              <span style={note(22, INK)}>{b.name}</span>
            </Ink>
            <div
              style={{
                position: "absolute",
                left: BARS.x0,
                top,
                width: b.w * grow,
                height: h(BARS.height),
                background: b.color,
              }}
            />
            <Note at={outnumberAt + 10 + i * 6} x={BARS.x0 + b.w * grow + 14} y={top + h(BARS.height) / 2 - 15}>
              <span style={{ ...label(24, b.ink), whiteSpace: "nowrap" }}>{num(b.count)}</span>
            </Note>
          </React.Fragment>
        );
      })}
      <Note at={ratioAt} x={BARS.x0} y={y(BARS.top + 2 * BARS.gap + 8)}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
          <b>{num(ODDS)}</b> people without it for every one with it
        </span>
      </Note>
      <Ink at={termAt - 4} dur={18} style={{ left: 160, top: y(800), ...body(36), color: INK, whiteSpace: "nowrap" }}>
        <span style={{ background: `linear-gradient(transparent 55%, ${HIGHLIGHT} 55%, ${HIGHLIGHT} 92%, transparent 92%)` }}>
          Base-rate neglect
        </span>{" "}
        is reading the positive and forgetting this ratio.
      </Ink>
    </AbsoluteFill>
  );
};
