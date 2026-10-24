import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { fmt, HAIRLINE, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SCORES, TIERS } from "./data";
import { A, A_INK, Arrow, B_INK, Drift, Headline, Kicker, Marked, pulse, Svg, TRAP, TRAP_INK, X0 } from "./parts";

/** Fig. 1: the four tiers, a bar per input price. */
const ROW_Y = [404, 500, 596, 692];
const NAME_W = 170;
const BAR_X = X0 + NAME_W;
const PX_PER_USD = 44;
/** The "passes?" column: one empty box per tier, the test that isn't written. */
const GATE_X = 930;
const GATE_W = 36;
/** Fig. 2: the launch table. */
const TABLE_X = 1150;
const COLS = [TABLE_X, TABLE_X + 290, TABLE_X + 460];
const TABLE_W = 640;
const HEAD_Y = 392;
const LINE_Y = [462, 548, 634];

/** The tiers' names as the lesson's table writes the models. */
const tierName = (n: string) => n[0].toUpperCase() + n.slice(1);

/**
 * The bridge in from the cost unit: "the cheapest model that passes" needs a
 * test to pass. Fig. 1 is the four tiers by input price, with an empty box
 * for each where the test should be; Fig. 2 is the launch table that looks
 * like one, its benchmark names marked as the narration asks what they
 * measure.
 */
export const RouteScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const cheapestAt = n.word("hook", "cheapest");
  const passesAt = n.word("hook", "passes");
  const passesWhatAt = n.word("passes", "passes");
  const whatAt = n.word("passes", "what");
  const writeAt = n.word("passes", "write");
  const testAt = n.word("passes", "test");
  const launchAt = n.word("table", "launch");
  const tableAt = n.word("table", "table");
  const scoresAt = n.word("table", "scores");
  const looksAt = n.word("table", "looks");
  const measuringAt = n.word("hook-in", "measuring");
  const benchAt = n.word("hook-in", "benchmarks");
  const end = n.beat("families").from;

  const rowAt = (i: number) => hookFrom + 2 + i * 5;
  const lineAt = (i: number) => lerpFrame(tableAt - 2, scoresAt + 4, i / 2);
  const gateIn = ease(frame, passesAt - 2, 12);
  const gateBox = ease(frame, testAt - 4, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: the tiers landing, the test that isn't there, the table ── */}
      {TIERS.map((_, i) => (
        <Sfx key={i} name="el-tap" at={rowAt(i) + 6} level={-27 - i} />
      ))}
      <Sfx name="el-pencil" at={testAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={launchAt - 6} level={-33} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="el-tap" at={lineAt(i) + 6} level={-28} />
      ))}

      <Kicker at={hookFrom - 10}>What benchmarks measure</Kicker>
      <Headline at={hookFrom - 6} second={passesAt - 4} italic="that passes." out={passesWhatAt - 8}>
        The cheapest model
      </Headline>
      <Headline at={passesWhatAt - 2} second={writeAt - 4} italic="Somebody writes the test.">
        Passes what?
      </Headline>

      <Drift from={hookFrom} to={end} amount={0.012} origin="30% 50%">
        {/* ── Fig. 1: four tiers by input price ── */}
        <FigLabel n="1" title="Four tiers, input price per million tokens" at={hookFrom - 2} x={X0} y={y(300)} />
        {TIERS.map((t, i) => {
          const at = rowAt(i);
          const grow = ease(frame, at + 2, 16);
          const w = Math.max(5, t.inPrice * PX_PER_USD) * grow;
          const ry = y(ROW_Y[i]);
          const lit = i === 0 ? ease(frame, cheapestAt - 2, 10) : 0;
          return (
            <React.Fragment key={t.name}>
              <Ink at={at} dur={12} style={{ left: X0, top: ry - 17, whiteSpace: "nowrap" }}>
                <span style={{ ...label(26, INK), fontWeight: 600 }}>
                  <Marked at={i === 0 ? cheapestAt - 2 : 1e9}>{tierName(t.name)}</Marked>
                </span>
              </Ink>
              <Svg>
                <rect x={BAR_X} y={ry - 13} width={w} height={26} rx={3} fill={A} opacity={0.85 + lit * 0.15} />
              </Svg>
              <Ink at={at + 10} dur={12} style={{ left: BAR_X + Math.max(5, t.inPrice * PX_PER_USD) + 14, top: ry - 15, whiteSpace: "nowrap" }}>
                <span style={{ ...note(24, INK), fontWeight: 600, ...TABULAR }}>${fmt(t.inPrice)}</span>
              </Ink>
              {/* The test each tier would have to pass: an empty box, then a question. */}
              <Svg opacity={gateIn}>
                <rect
                  x={GATE_X}
                  y={ry - GATE_W / 2}
                  width={GATE_W}
                  height={GATE_W}
                  rx={6}
                  fill="none"
                  stroke={TRAP}
                  strokeWidth={2.4}
                  strokeDasharray="5 5"
                  transform={`rotate(${pulse(frame, whatAt - 2 + i * 3, 16) * 6} ${GATE_X + GATE_W / 2} ${ry})`}
                />
              </Svg>
              <Ink at={whatAt - 2 + i * 3} dur={10} style={{ left: GATE_X + 9, top: ry - 19, whiteSpace: "nowrap" }}>
                <span style={{ ...label(28, TRAP_INK), fontWeight: 700 }}>?</span>
              </Ink>
            </React.Fragment>
          );
        })}
        <Ink at={passesAt - 2} dur={12} style={{ left: GATE_X - 22, top: y(ROW_Y[0]) - 66, whiteSpace: "nowrap" }}>
          <span style={{ ...label(22, TRAP_INK) }}>passes?</span>
        </Ink>
        {/* "Somebody has to write the test": the column becomes one blank test. */}
        <Svg opacity={gateBox}>
          <rect
            x={GATE_X - 18}
            y={y(ROW_Y[0]) - 34}
            width={GATE_W + 36}
            height={(y(ROW_Y[3]) - y(ROW_Y[0])) * gateBox + 68}
            rx={12}
            fill="none"
            stroke={TRAP}
            strokeWidth={2}
          />
        </Svg>
        <Ink at={testAt - 2} dur={14} style={{ left: GATE_X - 30, top: y(ROW_Y[3]) + 46, whiteSpace: "nowrap" }}>
          <span style={{ ...label(22, TRAP_INK) }}>the test</span>
        </Ink>
        <Ink at={hookFrom + 22} dur={14} style={{ left: X0, top: y(ROW_Y[3]) + 46, whiteSpace: "nowrap" }}>
          <span style={note(21, INK_SOFT)}>USD, October 2026</span>
        </Ink>

        {/* ── Fig. 2: the launch table ── */}
        <FigLabel n="2" title="A launch table" at={launchAt - 6} x={TABLE_X} y={y(300)} />
        <Ink at={tableAt - 6} dur={14} style={{ left: TABLE_X, top: y(HEAD_Y) - 14, width: TABLE_W }}>
          <div style={{ position: "relative", height: 30 }}>
            <span style={{ ...label(22, INK_SOFT), position: "absolute", left: 0 }}>Benchmark</span>
            <span style={{ ...label(22, A_INK), position: "absolute", left: COLS[1] - TABLE_X }}>Model A</span>
            <span style={{ ...label(22, B_INK), position: "absolute", left: COLS[2] - TABLE_X }}>Model B</span>
          </div>
        </Ink>
        <Svg opacity={ease(frame, tableAt - 4, 12)}>
          <line x1={TABLE_X} x2={TABLE_X + TABLE_W} y1={y(HEAD_Y) + 26} y2={y(HEAD_Y) + 26} stroke={INK} strokeWidth={2} />
        </Svg>
        {SCORES.map((s, i) => {
          const at = lineAt(i);
          const ly = y(LINE_Y[i]);
          const markAt = lerpFrame(benchAt - 4, measuringAt + 6, i / 2);
          return (
            <React.Fragment key={s.name}>
              <Ink at={at} dur={14} style={{ left: TABLE_X, top: ly - 16, width: TABLE_W }}>
                <div style={{ position: "relative", height: 34 }}>
                  <span style={{ ...label(26, INK), fontWeight: 600, position: "absolute", left: 0, whiteSpace: "nowrap" }}>
                    <Marked at={markAt}>{s.name}</Marked>
                  </span>
                  <span style={{ ...note(26, A_INK), fontWeight: 700, position: "absolute", left: COLS[1] - TABLE_X, ...TABULAR }}>
                    {fmt(s.a, 1)}
                  </span>
                  <span style={{ ...note(26, B_INK), position: "absolute", left: COLS[2] - TABLE_X, ...TABULAR }}>{fmt(s.b, 1)}</span>
                </div>
              </Ink>
              <Svg opacity={ease(frame, at + 4, 12)}>
                <line x1={TABLE_X} x2={TABLE_X + TABLE_W} y1={ly + 33} y2={ly + 33} stroke={HAIRLINE} strokeWidth={1} />
              </Svg>
            </React.Fragment>
          );
        })}
        <Ink at={scoresAt + 10} dur={14} style={{ left: TABLE_X, top: y(LINE_Y[2]) + 56, whiteSpace: "nowrap" }}>
          <span style={note(21, INK_SOFT)}>percent of questions right</span>
        </Ink>
        {/* "...that looks like one": the table offered as the test. */}
        <Arrow from={[TABLE_X - 24, y(548)]} to={[GATE_X + GATE_W + 34, y(548)]} at={looksAt - 4} dur={14} color={TRAP} />
      </Drift>
    </AbsoluteFill>
  );
};

const lerpFrame = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
