import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SCORES } from "./data";
import { A, A_INK, B_INK, Drift, FAINT, Headline, lerp, Marked, PANEL, Spot, Svg, TRAP, X0 } from "./parts";

/** The launch table again, small, on its way out. */
const MINI = { x: X0, y: 410, w: 600 };
const MINI_COLS = [0, 300, 450];
/** Your examples: thirty cards, the size next-steps.mdx recommends. */
const CARDS = 30;
const CARD_W = 36;
const CARD_GAP = 10;
const CARDS_Y = 640;

/**
 * The course's close: build the harness once and it outlives every model in
 * it. The next launch table (Fig. 2 again) is struck; your own examples run,
 * card by card; and the answer to the title comes from them, in an hour.
 */
export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("end").from;
  const onceAt = n.word("end", "once");
  const outlivesAt = n.word("end", "outlives");
  const nextAt = n.word("last", "next one");
  const launchesAt = n.word("last", "launches");
  const skipAt = n.word("last", "skip");
  const tableAt = n.word("last", "table");
  const runAt = n.word("last", "Run");
  const examplesAt = n.word("last", "examples");
  const hourAt = n.word("last", "hour");
  const knowAt = n.word("last", "know");
  const enoughAt = n.word("last", "good enough");
  const enoughEnd = n.word("last", "good enough", { edge: "end" });

  const miniOut = ease(frame, runAt - 6, 14);
  const cardAt = (i: number) => Math.round(lerp(runAt, hourAt + 6, i / (CARDS - 1)));

  return (
    <AbsoluteFill>
      {/* ── Sound: the art, the strike, the cards, the last word ── */}
      <Sfx name="el-pop" at={from} level={-30} />
      <Sfx name="el-whoosh" at={launchesAt - 6} level={-33} />
      <Sfx name="el-scratch" at={skipAt} level={-34} />
      <Sfx name="el-sprinkle" at={runAt} level={-34} />
      <Sfx name="el-chime" at={enoughEnd + 10} level={-32} />

      <Headline at={from - 6} second={outlivesAt - 4} italic="It outlives every model.">
        Build it once.
      </Headline>
      <Spot id="llm-benchmarks-measure" at={onceAt - 6} left={1180} top={y(330)} width={600} height={400} />

      <Drift from={from} to={n.durationInFrames} amount={0.014} origin="30% 60%">
        {/* The harness's models come and go: the next launch, and its table, struck. */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - miniOut * 0.75 }}>
          <FigLabel n="2" title="A launch table" at={nextAt - 4} x={MINI.x} y={y(MINI.y - 66)} />
          <Svg opacity={ease(frame, launchesAt - 4, 12)}>
            <rect x={MINI.x - 16} y={y(MINI.y) - 22} width={MINI.w + 32} height={196} rx={10} fill={PANEL} stroke={FAINT} strokeWidth={1.4} />
          </Svg>
          {SCORES.map((s, i) => (
            <Ink key={s.name} at={launchesAt - 4 + i * 3} dur={10} style={{ left: MINI.x, top: y(MINI.y) + i * 54, width: MINI.w }}>
              <div style={{ position: "relative", height: 34 }}>
                <span style={{ ...label(24, INK), fontWeight: 600, position: "absolute", left: MINI_COLS[0] }}>
                  {s.name}
                </span>
                <span style={{ ...note(24, A_INK), fontWeight: 700, position: "absolute", left: MINI_COLS[1], ...TABULAR }}>{fmt(s.a, 1)}</span>
                <span style={{ ...note(24, B_INK), position: "absolute", left: MINI_COLS[2], ...TABULAR }}>{fmt(s.b, 1)}</span>
              </div>
            </Ink>
          ))}
          {/* "Skip its table": one stroke through the whole of it. */}
          <Svg>
            <line
              x1={MINI.x - 24}
              y1={y(MINI.y) + 150}
              x2={MINI.x - 24 + (MINI.w + 48) * ease(frame, tableAt - 4, 14)}
              y2={y(MINI.y) - 6}
              stroke={TRAP}
              strokeWidth={3.2}
              strokeLinecap="round"
              opacity={ease(frame, tableAt - 4, 4)}
            />
          </Svg>
        </div>

        {/* Your examples, run one after another. */}
        <Ink at={runAt - 4} dur={12} style={{ left: X0, top: y(CARDS_Y) - 60, whiteSpace: "nowrap" }}>
          <span style={{ ...label(24, INK), fontWeight: 650 }}>
            <Marked at={examplesAt - 2}>your examples</Marked>
          </span>
        </Ink>
        <Svg>
          {Array.from({ length: CARDS }, (_, i) => {
            const at = cardAt(i);
            const row = Math.floor(i / 15);
            const col = i % 15;
            const run = ease(frame, at, 8);
            return (
              <rect
                key={i}
                x={X0 + col * (CARD_W + CARD_GAP)}
                y={y(CARDS_Y) + row * 58}
                width={CARD_W}
                height={48}
                rx={5}
                fill={run > 0 ? A : "none"}
                fillOpacity={0.25 + 0.6 * run}
                stroke={run > 0 ? A : FAINT}
                strokeWidth={1.6}
                opacity={ease(frame, runAt - 8 + (i % 15), 10)}
              />
            );
          })}
        </Svg>
        <Ink at={hourAt - 2} dur={12} style={{ left: X0 + 15 * (CARD_W + CARD_GAP) + 16, top: y(CARDS_Y) + 26, whiteSpace: "nowrap" }}>
          <span style={note(24, INK_SOFT)}>in an hour</span>
        </Ink>
        <Ink at={knowAt - 2} dur={18} style={{ left: X0, top: y(784), whiteSpace: "nowrap" }}>
          <span style={{ ...body(46, true), color: INK }}>
            You&apos;ll know if it&apos;s <Marked at={enoughAt - 2}>good enough.</Marked>
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
