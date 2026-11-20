import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { Drift, Flow, Node, noteLine, OK, pulse, Strike, X0 } from "./parts";

const DAYS_Y = 330;
const DAY_ROW = 34;
const BOX_X = 420;
const BOX_W = 380;
const NUM_Y = 330;
const DEN_Y = 470;
const DIV_X = 940;
const RESULT_X = 1060;
const STRUCK_Y = 620;
const LIMIT_Y = 720;

/**
 * Question 8: a ratio metric is a numerator and a denominator, kept as two
 * separate measures and divided at query time, at the grain asked for:
 * nothing is stored pre-divided. By week, the week's days are summed into
 * both first and divided once, so there is no average of averages. And the
 * page's limit: a numerator and a denominator with different filters (or a
 * dimension one of them lacks) are joined by a red "≠" that no layer fixes.
 */
export const RatioScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("ratio").from;
  const qAt = n.word("ratio", "Question");
  const textAt = n.word("ratio", "How does a semantic layer");
  const keepsAt = n.word("ratio", "keeps the numerator and the denominator");
  const separateAt = n.word("ratio", "two separate measures");
  const dividesAt = n.word("ratio", "divides at query time");
  const grainAt = n.word("ratio", "at whatever grain is asked for");
  const nothingAt = n.word("ratio", "Nothing is pre-divided");
  const weekAt = n.word("ratio-week", "Conversion by week");
  const sumsAt = n.word("ratio-week", "sums the week's conversions and sessions first");
  const onceAt = n.word("ratio-week", "then divides once");
  const avgAt = n.word("ratio-week", "no average of averages");
  const cantAt = n.word("ratio-limit", "What it can't do");
  const filtersAt = n.word("ratio-limit", "different filters or grains");
  const dimensionAt = n.word("ratio-limit", "a dimension one of them doesn't have");
  const end = n.beat("ratio-limit").to;

  const boxH = h(86);
  const numTop = y(NUM_Y);
  const denTop = y(DEN_Y);
  const divY = (numTop + boxH / 2 + denTop + boxH / 2) / 2;
  const divP = pop(frame, dividesAt, fps, 14);
  const divPulse = pulse(frame, onceAt + 4, 22);
  const daysTop = y(DAYS_Y);
  const dayRow = h(DAY_ROW);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const daysMid = daysTop + (days.length * dayRow) / 2;
  const struckTop = y(STRUCK_Y);
  const limitTop = y(LIMIT_Y);
  const partW = 520;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={keepsAt} level={-31} />
      <Sfx name="el-pop" at={dividesAt} level={-32} />
      <Sfx name="el-scratch" at={nothingAt + 6} level={-32} />
      <Sfx name="el-sprinkle" at={weekAt} level={-34} />
      <Sfx name="el-tap" at={onceAt + 4} level={-32} />
      <Sfx name="el-scratch" at={avgAt + 6} level={-32} />
      <Sfx name="el-pencil" at={filtersAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={62}>
          How does a semantic layer handle a ratio metric correctly?
        </QuestionCard>

        {/* ── Two measures, kept apart ── */}
        <Node
          x={BOX_X}
          y={numTop}
          w={BOX_W}
          h={boxH}
          at={keepsAt}
          title="numerator"
          sub={<span style={{ fontFamily: MONO, fontSize: 21, color: INK }}>SUM(conversions)</span>}
          tone="plain"
          toneTo="data"
          toneAt={separateAt}
        />
        <Node
          x={BOX_X}
          y={denTop}
          w={BOX_W}
          h={boxH}
          at={keepsAt + 8}
          title="denominator"
          sub={<span style={{ fontFamily: MONO, fontSize: 21, color: INK }}>SUM(sessions)</span>}
          tone="plain"
          toneTo="data"
          toneAt={separateAt + 4}
        />
        {/* ── Divided at query time ── */}
        <Flow points={[[BOX_X + BOX_W + 8, numTop + boxH / 2], [DIV_X, numTop + boxH / 2], [DIV_X, divY - 42]]} at={dividesAt - 6} dur={12} />
        <Flow points={[[BOX_X + BOX_W + 8, denTop + boxH / 2], [DIV_X, denTop + boxH / 2], [DIV_X, divY + 42]]} at={dividesAt - 4} dur={12} />
        <div
          style={{
            position: "absolute",
            left: DIV_X - 34,
            top: divY - 34,
            width: 68,
            height: 68,
            boxSizing: "border-box",
            borderRadius: 999,
            border: `${2 + 2 * divPulse}px solid ${divPulse > 0.05 ? OK : INK}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...label(38, INK),
            opacity: Math.min(1, divP),
            transform: `scale(${(0.7 + 0.3 * Math.min(1, divP)) * (1 + 0.1 * divPulse)})`,
          }}
        >
          ÷
        </div>
        <Flow points={[[DIV_X + 40, divY], [RESULT_X - 10, divY]]} at={dividesAt + 6} dur={10} />
        <Node x={RESULT_X} y={divY - boxH / 2} w={320} h={boxH} at={dividesAt + 10} title="conversion rate" sub="at query time" tone="ok" />
        <Note at={grainAt} x={RESULT_X + 350} y={divY - h(30)}>
          <span style={noteLine(22, INK)}>at the grain asked for:</span>
        </Note>
        <Note at={grainAt + 8} x={RESULT_X + 350} y={divY + h(6)}>
          <span style={noteLine(22, INK_SOFT)}>a day, a week, a month</span>
        </Note>

        {/* ── By week: the days summed into both, then one division ── */}
        {days.map((d, i) => (
          <Ink key={d} at={weekAt + i * 2} dur={10} style={{ left: X0, top: daysTop + i * dayRow }}>
            <span style={{ ...note(21, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap", lineHeight: `${dayRow}px` }}>{d}</span>
          </Ink>
        ))}
        <Flow points={[[X0 + 80, daysMid - h(14)], [X0 + 190, daysMid - h(14)], [X0 + 190, numTop + boxH / 2], [BOX_X - 12, numTop + boxH / 2]]} at={sumsAt} dur={14} color={BAR} />
        <Flow points={[[X0 + 80, daysMid + h(14)], [X0 + 190, daysMid + h(14)], [X0 + 190, denTop + boxH / 2], [BOX_X - 12, denTop + boxH / 2]]} at={sumsAt + 6} dur={14} color={BAR} />
        <Note at={sumsAt + 4} x={X0 + 206} y={numTop - h(36)}>
          <span style={noteLine(21, BLUE_INK)}>sum first</span>
        </Note>

        {/* ── Never pre-divided, never averaged ── */}
        <Ink at={nothingAt} dur={12} style={{ left: BOX_X, top: struckTop }}>
          <span style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap" }}>
            <Strike at={nothingAt + 6}>a stored, pre-divided rate</Strike>
          </span>
        </Ink>
        <Ink at={avgAt} dur={12} style={{ left: BOX_X + 400, top: struckTop }}>
          <span style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap" }}>
            <Strike at={avgAt + 6}>an average of daily rates</Strike>
          </span>
        </Ink>

        {/* ── What no layer can rescue ── */}
        <Ink at={cantAt} dur={12} style={{ left: X0, top: limitTop }}>
          <span style={{ ...label(24, INK), fontWeight: 600, whiteSpace: "nowrap" }}>What it can&rsquo;t rescue</span>
        </Ink>
        <Node
          x={X0}
          y={limitTop + h(56)}
          w={partW}
          h={boxH}
          at={filtersAt - 4}
          title="conversions"
          sub={<span style={{ fontFamily: MONO, fontSize: 21 }}>where channel = &apos;paid&apos;</span>}
          tone="bad"
        />
        <div
          style={{
            position: "absolute",
            left: X0 + partW + 30,
            top: limitTop + h(56) + boxH / 2 - 30,
            width: 60,
            textAlign: "center",
            ...label(46, ACCENT_INK),
            fontWeight: 600,
            opacity: ease(frame, filtersAt + 4, 10),
          }}
        >
          ≠
        </div>
        <Node
          x={X0 + partW + 120}
          y={limitTop + h(56)}
          w={partW}
          h={boxH}
          at={filtersAt}
          title="sessions"
          sub="every channel"
          tone="bad"
        />
        <Note at={dimensionAt} x={X0 + 2 * partW + 170} y={limitTop + h(56) + boxH / 2 - h(16)}>
          <span style={noteLine(22, INK_SOFT)}>or a dimension one side lacks</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
