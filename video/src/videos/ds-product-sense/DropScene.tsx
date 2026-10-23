import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DROP, num, pct } from "./data";
import { Chip, DATA, DATA_LIGHT, Drift, madeUp, Mark, Step, Svg, VLine, X0 } from "./parts";

const STEPS_TOP = 350;
const STEP_GAP = 84;
const CHART = { x0: 840, x1: 1640, top: 345, bottom: 475, days: 17, dropDay: 15 };
const BARS = { x0: 980, w: 600, top: 545, gap: 66, h: 34 };

/**
 * Question 6, worked outside-in: four steps down the left, each lit as it is
 * asked. On the right, the made-up app's daily users stepping down 8%; what
 * can fake that shape; the drop split by platform, where Android holds 7,500
 * of the 8,000; the release that went out that morning; and the last call,
 * internal or external.
 */
export const DropScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("drop").from;
  const qAt = n.word("drop", "Question");
  const textAt = n.word("drop", "Walk me through diagnosing");
  const dauAt = n.word("drop", "DAU");
  const realAt = n.word("drop", "is it real?");
  const fakes = [
    { text: "a logging change", at: n.word("drop", "A logging change") },
    { text: "a broken pipeline", at: n.word("drop", "a broken pipeline") },
    { text: "a holiday", at: n.word("drop", "a holiday") },
  ];
  const shapeAt = n.word("drop", "make that shape on its own");
  const broadAt = n.word("drop-split", "is it broad or narrow?");
  const hundredAt = n.word("drop-split", "a hundred thousand daily users");
  const splitAt = n.word("drop-split", "Split by platform");
  const barelyAt = n.word("drop-split", "iPhone and web barely moved");
  const androidAt = n.word("drop-split", "Android lost");
  const eightAt = n.word("drop-split", "of the eight thousand");
  const whenAt = n.word("drop-when", "what changed, and when?");
  const releaseAt = n.word("drop-when", "Android release five point two");
  const morningAt = n.word("drop-when", "went out that morning");
  const internalAt = n.word("drop-when", "internal or external");
  const competitorAt = n.word("drop-when", "a competitor's launch");
  const bugAt = n.word("drop-when", "a bug of your own");
  const end = n.beat("drop-when").to;

  const steps = [
    { text: "Is it real?", at: realAt },
    { text: "Broad or narrow?", at: broadAt },
    { text: "What changed, and when?", at: whenAt },
    { text: "Internal or external?", at: internalAt },
  ];

  // The daily total: flat, then the 8% step on the release day.
  const xOf = (d: number) => CHART.x0 + ((d - 1) / (CHART.days - 1)) * (CHART.x1 - CHART.x0);
  const vOf = (v: number) => y(CHART.bottom) - ((v - 85_000) / (102_000 - 85_000)) * (y(CHART.bottom) - y(CHART.top));
  const pts = Array.from({ length: CHART.days }, (_, i) => {
    const d = i + 1;
    return [xOf(d), vOf(d < CHART.dropDay ? DROP.totalBefore : DROP.totalAfter)] as const;
  });
  const draw = ease(frame, dauAt - 6, 28);
  const fakeOut = broadAt - 2;

  const platforms = Object.keys(DROP.before) as (keyof typeof DROP.before)[];
  const scale = BARS.w / DROP.before.iPhone;

  return (
    <AbsoluteFill>
      {steps.map((s) => (
        <Sfx key={s.text} name="el-tap" at={s.at} level={-32} />
      ))}
      <Sfx name="el-pencil" at={dauAt} level={-36} />
      <Sfx name="slide" at={splitAt} level={-32} />
      <Sfx name="el-scratch" at={androidAt + 4} level={-32} />
      <Sfx name="el-pop" at={releaseAt + 2} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={56}>
          Walk me through diagnosing a sudden 8% drop in daily active users (DAU).
        </QuestionCard>

        {/* The procedure, outside-in. */}
        {steps.map((s, i) => (
          <Step key={s.text} n={i + 1} x={X0} y={y(STEPS_TOP) + i * h(STEP_GAP)} at={s.at - 2} lit={s.at} done={steps[i + 1]?.at} width={560}>
            {s.text}
          </Step>
        ))}

        {/* The made-up app's daily users, and the step down. */}
        <Svg opacity={draw > 0 ? 1 : 0}>
          <path
            d={pts.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ")}
            fill="none"
            stroke={DATA}
            strokeWidth={4}
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={`${draw} 1`}
          />
        </Svg>
        <Note at={dauAt} x={CHART.x0} y={y(CHART.top) - h(44)}>
          <span style={{ ...label(21, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>daily active users</span>
        </Note>
        <Note at={dauAt + 10} x={CHART.x0 - 16} align="right" y={vOf(DROP.totalBefore) - h(14)}>
          <span style={{ ...label(20, INK), ...TABULAR, whiteSpace: "nowrap" }}>{num(DROP.totalBefore)}</span>
        </Note>
        <Note at={dauAt + 18} x={CHART.x1 + 14} y={vOf(DROP.totalAfter) - h(14)}>
          <span style={{ ...label(20, ACCENT_INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>
            {num(DROP.totalAfter)} ({pct(DROP.change)})
          </span>
        </Note>
        <VLine
          x={(xOf(CHART.dropDay - 1) + xOf(CHART.dropDay)) / 2}
          top={y(CHART.top) - h(6)}
          bottom={y(CHART.bottom) + h(10)}
          at={releaseAt}
          color={INK}
          dash="6 6"
          width={2}
          side="left"
          labelY={y(CHART.bottom) - h(30)}
          label={
            <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
              <Mark at={morningAt}>Android 5.2 released</Mark>
            </span>
          }
        />

        {/* Step 1: what can fake the shape. */}
        {fakes.map((f, i) => (
          <Chip key={f.text} x={CHART.x0 + i * 300} y={y(BARS.top)} at={f.at - 2} out={fakeOut} size={25}>
            {f.text}
          </Chip>
        ))}
        <Note at={shapeAt} x={CHART.x0} y={y(BARS.top) + h(74)} out={fakeOut}>
          <span style={{ ...note(26, ACCENT_INK), whiteSpace: "nowrap" }}>each can make that shape on its own</span>
        </Note>

        {/* Step 2: split by platform. */}
        <Note at={hundredAt} x={CHART.x0} y={y(BARS.top) - h(48)}>
          <span style={madeUp(20)}>say the app had {num(DROP.totalBefore)} daily users (made up)</span>
        </Note>
        {platforms.map((p, i) => {
          const top = y(BARS.top) + i * h(BARS.gap);
          const grow = ease(frame, splitAt + i * 3, 14);
          const after = ease(frame, (p === "Android" ? androidAt : barelyAt) + 2, 16);
          const b = DROP.before[p] * scale;
          const a = DROP.after[p] * scale;
          const lost = DROP.byPlatform[p].lost;
          return (
            <React.Fragment key={p}>
              <Note at={splitAt + i * 3} x={BARS.x0 - 20} align="right" y={top + h(2)}>
                <span style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>{p}</span>
              </Note>
              <Svg opacity={grow}>
                <rect x={BARS.x0} y={top} width={b * grow} height={h(BARS.h)} fill={DATA_LIGHT} rx={3} />
                <rect x={BARS.x0} y={top} width={(b - (b - a) * after) * grow} height={h(BARS.h)} fill={DATA} rx={3} />
                {lost > 0 && after > 0 ? (
                  <rect x={BARS.x0 + b - (b - a) * after} y={top} width={(b - a) * after} height={h(BARS.h)} fill={ACCENT} opacity={0.8} rx={3} />
                ) : null}
              </Svg>
              <Note at={(p === "Android" ? androidAt : barelyAt) + 6} x={BARS.x0 + b + 16} y={top + h(2)}>
                <span style={{ ...label(21, lost > 1000 ? ACCENT_INK : INK_SOFT), fontWeight: lost > 1000 ? 700 : 500, ...TABULAR, whiteSpace: "nowrap" }}>
                  {lost > 0 ? `−${num(lost)}` : "no change"}
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={eightAt} x={BARS.x0} y={y(BARS.top) + 3 * h(BARS.gap) - h(6)}>
          <span style={{ ...note(27, ACCENT_INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>
            Android: {num(DROP.byPlatform.Android.lost)} of the {num(DROP.lost)} lost
          </span>
        </Note>

        {/* Step 4: internal or external. */}
        <Chip x={X0 + 40} y={y(STEPS_TOP) + 4 * h(STEP_GAP) + h(10)} at={competitorAt - 2} size={24} ink={INK_SOFT}>
          external: a competitor&apos;s launch
        </Chip>
        <Chip x={X0 + 40} y={y(STEPS_TOP) + 4 * h(STEP_GAP) + h(78)} at={bugAt - 2} size={24} ink={ACCENT_INK} lit={bugAt + 8}>
          internal: a bug of your own
        </Chip>
      </Drift>
    </AbsoluteFill>
  );
};

