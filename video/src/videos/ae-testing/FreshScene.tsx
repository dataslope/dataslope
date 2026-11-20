import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note, svgText, TABULAR } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds, inkOf } from "../../theme/brand";
import { FRESHNESS, type FreshnessCheck } from "./data";
import { Box, Chip, Drift, Flow, Listing, ListingTitle, pulse, SmallMono, Spot, Svg, X0 } from "./parts";

const COLS_Y = 286;
const COL_X = [X0, 760];
const YAML_Y = 470;
const YAML_SIZE = 20;
const AXIS = { x0: 830, x1: 1770, y: 630, from: 0, to: 15 };
const CLOCK = { x: 1630, w: 130 };
const WARN_FILL = `color-mix(in srgb, ${ds("yellow", 400)} 34%, transparent)`;
const ERROR_FILL = `color-mix(in srgb, ${ds("red", 400)} 26%, transparent)`;
const VERDICT_INK: Record<FreshnessCheck["verdict"], string> = { pass: OK, warn: inkOf.yellow, error: ACCENT };
const VERDICT_TONE = { pass: "green", warn: "yellow", error: "red" } as const;

/** "2026-03-02 09:00:00" → 9. */
const hourOf = (ts: string) => Number(ts.slice(11, 13)) + Number(ts.slice(14, 16)) / 60;
/** "09:00". */
const clockOf = (ts: string) => ts.slice(11, 16);

/**
 * Question 6. Two columns: a test reads what the rows say, freshness reads
 * when they arrived (the clock). The page's sources YAML (warn after 6 hours,
 * error after 12), then a day on a time axis: the newest row at 01:00, the
 * warn and error zones, and three checks, at 04:00 (3 h, pass), 09:00 (8 h,
 * warn) and 14:00 (13 h, error). The four tests on the same rows all return
 * nothing, in neutral ink. Then freshness ahead of the build, and a drawn
 * (not measured) feed slipping later each day, the warning catching the slip
 * before the outage.
 */
export const FreshScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("fresh").from;
  const qAt = n.word("fresh", "Question six");
  const qTextAt = n.word("fresh", "What is source freshness");
  const testAt = n.word("fresh", "A test checks what the data says");
  const clockAt = n.word("fresh", "Freshness checks the clock");
  const oldAt = n.word("fresh", "how old the newest row is");
  const loadedAt = n.word("fresh", "loaded-at column");
  const sourceAt = n.word("fresh-clock", "This source");
  const warnAt = n.word("fresh-clock", "warns after six hours");
  const errorAt = n.word("fresh-clock", "errors after twelve");
  const newestAt = n.word("fresh-clock", "Its newest row landed");
  const nineAt = n.word("fresh-clock", "Checked at nine");
  const warningAt = n.word("fresh-clock", "a warning");
  const twoAt = n.word("fresh-clock", "At two in the afternoon");
  const anErrorAt = n.word("fresh-clock", "an error");
  const fourAt = n.word("fresh-valid", "all four tests pass");
  const validAt = n.word("fresh-valid", "The rows that are there are valid");
  const justOldAt = n.word("fresh-valid", "they're just old");
  const beforeAt = n.word("fresh-two", "runs before the models build");
  const twoThreshAt = n.word("fresh-two", "It has two thresholds");
  const slippingAt = n.word("fresh-two", "a feed slipping later each day");
  const catchesAt = n.word("fresh-two", "the warning catches the slip");
  const outageAt = n.word("fresh-two", "before the outage");
  const end = n.beat("fresh-two").to;

  const colsTop = y(COLS_Y);
  const yamlTop = y(YAML_Y);

  // ── The day on an axis ──
  const ax = (hr: number) => AXIS.x0 + ((hr - AXIS.from) / (AXIS.to - AXIS.from)) * (AXIS.x1 - AXIS.x0);
  const axisY = y(AXIS.y);
  const newest = hourOf(FRESHNESS.newest);
  const warnFrom = newest + FRESHNESS.warnHours;
  const errorFrom = newest + FRESHNESS.errorHours;
  const zoneTop = axisY - h(100);
  const checkAt = [newestAt + 18, nineAt, twoAt];
  const verdictAt = [newestAt + 26, warningAt, anErrorAt];
  const axisDraw = ease(frame, newestAt - 8, 18);

  // ── The four tests on the same rows ──
  const tests = [
    { name: "unique", t: FRESHNESS.tests.unique },
    { name: "not_null", t: FRESHNESS.tests.notNull },
    { name: "accepted_values", t: FRESHNESS.tests.acceptedValues },
    { name: "relationships", t: FRESHNESS.tests.relationships },
  ];
  const testsTop = axisY + h(108);

  // ── Freshness first, and a feed slipping (drawn, not measured) ──
  const yamlOut = beforeAt - 4;
  const flowTop = yamlTop;
  const sketch = { x0: X0 + 60, x1: 700, top: y(640), bottom: y(860) };
  const days = 7;
  // Arrival delay in hours, drawn: a feed that slips about two hours a day.
  const delay = (d: number) => 1 + d * 2.1;
  const sx = (d: number) => sketch.x0 + (d / (days - 1)) * (sketch.x1 - sketch.x0);
  const sy = (hrs: number) => sketch.bottom - (hrs / 14) * (sketch.bottom - sketch.top);
  const warnDay = (FRESHNESS.warnHours - 1) / 2.1;
  const errorDay = (FRESHNESS.errorHours - 1) / 2.1;
  const drawn = ease(frame, slippingAt, 40);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={testAt} level={-34} />
      <Sfx name="el-tap" at={clockAt} level={-34} />
      <Sfx name="el-pop" at={clockAt + 4} level={-30} />
      <Sfx name="el-sprinkle" at={sourceAt} level={-36} />
      <Sfx name="el-pencil" at={warnAt + 2} level={-36} />
      <Sfx name="el-pencil" at={errorAt + 2} level={-36} />
      <Sfx name="el-pencil" at={newestAt - 8} level={-35} />
      {verdictAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={i === 2 ? -31 : -33} />
      ))}
      <Sfx name="el-sprinkle" at={fourAt} level={-35} />
      <Sfx name="el-whoosh" at={beforeAt - 4} level={-37} />
      <Sfx name="el-pencil" at={slippingAt} level={-35} />
      <Sfx name="el-tap" at={catchesAt + 4} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={qTextAt - 4} size={56}>
          What is source freshness, and how is it different from a test?
        </QuestionCard>

        {/* ── What each one reads ── */}
        <Ink at={testAt - 2} dur={12} style={{ left: COL_X[0], top: colsTop, whiteSpace: "nowrap" }}>
          <div style={{ ...label(26, INK), fontWeight: 600 }}>A test</div>
          <div style={{ ...note(23, INK_SOFT), marginTop: 10 }}>What the rows say</div>
        </Ink>
        <div style={{ position: "absolute", left: COL_X[1] - 44, top: colsTop + 2, width: 1, height: 70 * ease(frame, clockAt - 4, 14), background: HAIRLINE }} />
        <Ink at={clockAt - 2} dur={12} style={{ left: COL_X[1], top: colsTop, whiteSpace: "nowrap" }}>
          <div style={{ ...label(26, INK), fontWeight: 600 }}>Freshness</div>
          <div style={{ ...note(23, INK_SOFT), marginTop: 10 }}>
            When they arrived
            <span style={{ opacity: ease(frame, oldAt, 10) }}>: the newest row&rsquo;s age</span>
            <span style={{ opacity: ease(frame, loadedAt, 10) }}>
              , from <SmallMono color={INK}>_loaded_at</SmallMono>
            </span>
          </div>
        </Ink>
        <Spot art="clock" at={clockAt + 4} left={CLOCK.x} top={colsTop - h(16)} width={CLOCK.w} />

        {/* ── The page's thresholds ── */}
        <ListingTitle x={X0} top={yamlTop} at={sourceAt} out={yamlOut}>
          The page&rsquo;s sources YAML
        </ListingTitle>
        <Listing
          lines={FRESHNESS.yaml}
          lang="yaml"
          x={X0}
          top={yamlTop}
          size={YAML_SIZE}
          at={sourceAt}
          step={2}
          out={yamlOut}
          marks={[
            { line: "loaded_at_field", text: "_loaded_at", at: sourceAt + 20 },
            { line: "warn_after", text: "warn_after: {count: 6, period: hour}", at: warnAt },
            { line: "error_after", text: "error_after: {count: 12, period: hour}", at: errorAt, color: `color-mix(in srgb, ${ds("red", 400)} 30%, transparent)` },
          ]}
        />

        {/* ── One day: the newest row, the zones, three checks ── */}
        <Svg opacity={axisDraw}>
          <rect x={ax(warnFrom)} y={zoneTop} width={(ax(errorFrom) - ax(warnFrom)) * ease(frame, warnAt + 4, 16)} height={axisY - zoneTop} fill={WARN_FILL} />
          <rect x={ax(errorFrom)} y={zoneTop} width={(AXIS.x1 - ax(errorFrom)) * ease(frame, errorAt + 4, 16)} height={axisY - zoneTop} fill={ERROR_FILL} />
          <line x1={AXIS.x0} y1={axisY} x2={AXIS.x0 + (AXIS.x1 - AXIS.x0) * axisDraw} y2={axisY} stroke={INK} strokeWidth={2} />
          {[0, 3, 6, 9, 12, 15].map((hr) => (
            <g key={hr} opacity={ease(frame, newestAt - 6 + hr, 8)}>
              <line x1={ax(hr)} y1={axisY} x2={ax(hr)} y2={axisY + 8} stroke={INK_SOFT} strokeWidth={1.5} />
              <text x={ax(hr)} y={axisY + 34} textAnchor="middle" style={svgText({ ...note(19, INK_SOFT), ...TABULAR })}>
                {`${String(hr).padStart(2, "0")}:00`}
              </text>
            </g>
          ))}
          <text x={ax(warnFrom) + 10} y={zoneTop + 28} style={svgText(label(20, inkOf.yellow))} opacity={ease(frame, warnAt + 10, 10)}>
            warn
          </text>
          <text x={ax(errorFrom) + 10} y={zoneTop + 28} style={svgText(label(20, ACCENT_INK))} opacity={ease(frame, errorAt + 10, 10)}>
            error
          </text>
          {/* The newest row. */}
          <circle cx={ax(newest)} cy={axisY} r={9 * ease(frame, newestAt, 10)} fill={BAR} />
        </Svg>
        <Note at={newestAt + 4} x={ax(newest) + 16} y={axisY - h(44)}>
          <span style={{ ...note(21, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            newest row, {clockOf(FRESHNESS.newest)}
          </span>
        </Note>
        {FRESHNESS.checks.map((c, i) => {
          const x = ax(hourOf(c.checkedAt));
          const p = ease(frame, checkAt[i], 12);
          const color = VERDICT_INK[c.verdict];
          return (
            <React.Fragment key={c.checkedAt}>
              <Svg opacity={p}>
                <line x1={x} y1={axisY + 4} x2={x} y2={zoneTop - h(8) + 30 * (1 - p)} stroke={color} strokeWidth={2.5} strokeDasharray="5 5" />
                <circle cx={x} cy={axisY} r={6} fill={color} />
              </Svg>
              <Ink at={verdictAt[i]} dur={10} style={{ left: x - 70, top: zoneTop - h(52), width: 140, textAlign: "center", whiteSpace: "nowrap" }}>
                <Chip tone={VERDICT_TONE[c.verdict]} size={21} style={{ transform: `scale(${1 + 0.1 * pulse(frame, verdictAt[i] + 4, 16)})` }}>
                  {c.hours} h: {c.verdict}
                </Chip>
              </Ink>
            </React.Fragment>
          );
        })}

        {/* ── The four tests, on the same stale rows ── */}
        <Note at={fourAt - 2} x={AXIS.x0} y={testsTop - h(44)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>The four tests, on the same rows</span>
        </Note>
        {tests.map((tt, i) => (
          <Ink key={tt.name} at={fourAt + i * 4} dur={10} style={{ left: AXIS.x0 + i * 240, top: testsTop, whiteSpace: "nowrap" }}>
            <div style={{ fontFamily: "inherit" }}>
              <SmallMono color={INK}>{tt.name}</SmallMono>
            </div>
            <div style={{ marginTop: h(12) }}>
              <Chip tone="gray" size={20}>
                {tt.t.result.rows.length} rows: pass
              </Chip>
            </div>
          </Ink>
        ))}
        <Note at={validAt} x={AXIS.x0} y={testsTop + h(92)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            Valid rows<span style={{ color: INK_SOFT, opacity: ease(frame, justOldAt, 10) }}>, just old</span>
          </span>
        </Note>

        {/* ── Freshness runs first ── */}
        <Box x={X0} y={flowTop} w={300} h={h(58)} at={beforeAt - 2} title="dbt source freshness" mono size={21} />
        <Flow points={[[X0 + 300 + 10, flowTop + h(29)], [X0 + 400, flowTop + h(29)]]} at={beforeAt + 6} />
        <Box x={X0 + 410} y={flowTop} w={190} h={h(58)} at={beforeAt + 12} title="dbt build" mono size={21} />
        <Note at={beforeAt + 16} x={X0} y={flowTop + h(74)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>Stale data stops before any model is built on it</span>
        </Note>

        {/* ── A feed slipping later each day: drawn, not measured ── */}
        <Note at={twoThreshAt} x={X0} y={sketch.top - h(54)}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>
            A feed slipping later each day <span style={{ color: INK_SOFT }}>(a sketch)</span>
          </span>
        </Note>
        <Svg opacity={ease(frame, twoThreshAt, 12)}>
          <rect x={sketch.x0} y={sy(FRESHNESS.errorHours + 2)} width={sketch.x1 - sketch.x0} height={sy(FRESHNESS.errorHours) - sy(FRESHNESS.errorHours + 2)} fill={ERROR_FILL} />
          <rect x={sketch.x0} y={sy(FRESHNESS.errorHours)} width={sketch.x1 - sketch.x0} height={sy(FRESHNESS.warnHours) - sy(FRESHNESS.errorHours)} fill={WARN_FILL} />
          <line x1={sketch.x0} y1={sketch.bottom} x2={sketch.x1} y2={sketch.bottom} stroke={INK} strokeWidth={1.5} />
          <text x={sketch.x0 - 12} y={sy(FRESHNESS.warnHours) + 7} textAnchor="end" style={svgText(note(19, inkOf.yellow))}>
            {FRESHNESS.warnHours} h
          </text>
          <text x={sketch.x0 - 12} y={sy(FRESHNESS.errorHours) + 7} textAnchor="end" style={svgText(note(19, ACCENT_INK))}>
            {FRESHNESS.errorHours} h
          </text>
          <text x={sketch.x1} y={sketch.bottom + 28} textAnchor="end" style={svgText(note(19, INK_SOFT))}>
            days
          </text>
          {Array.from({ length: days }, (_, d) => {
            const p = ease(frame, slippingAt + d * 6, 8);
            return p > 0 ? <circle key={d} cx={sx(d)} cy={sy(delay(d))} r={6 * p} fill={BAR} /> : null;
          })}
          <polyline
            points={Array.from({ length: days }, (_, d) => `${sx(d)},${sy(delay(d))}`).join(" ")}
            fill="none"
            stroke={BAR}
            strokeWidth={2}
            strokeDasharray="3 7"
            strokeLinecap="round"
            style={{ clipPath: `inset(0 ${(1 - drawn) * 100}% 0 0)` }}
          />
          <circle cx={sx(warnDay)} cy={sy(FRESHNESS.warnHours)} r={16} fill="none" stroke={OK} strokeWidth={2.6} opacity={ease(frame, catchesAt + 2, 10)} />
        </Svg>
        <Note at={catchesAt + 6} x={sx(warnDay) + 26} y={sy(FRESHNESS.warnHours) + h(6)}>
          <span style={{ ...note(21, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>The warning catches the slip</span>
        </Note>
        <Note at={outageAt} x={sx(errorDay) - 220} y={sy(FRESHNESS.errorHours + 2) - h(36)}>
          <span style={{ ...note(21, ACCENT_INK), whiteSpace: "nowrap" }}>before the outage</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

