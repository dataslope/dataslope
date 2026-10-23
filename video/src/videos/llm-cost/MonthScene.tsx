import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { headline, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { int, MONTH, NAME, usd } from "./data";
import {
  Arrow,
  COST,
  Drift,
  FIG_Y,
  Hairline,
  HBar,
  Headline,
  Marked,
  POINT,
  POINT_INK,
  pulse,
  rowGlow,
  RULE,
  X0,
} from "./parts";

const HEAD_Y = 350;
const ROW_Y0 = 410;
const ROW_DY = 92;
const MODEL_X = 410;
const TOK_R = 900;
const DAY_R = 1060;
const PER_R = 1230;
const BAR_X = 1280;
const BAR_MAX = 330;
const RIGHT = 1800;
const TOTAL_Y = 802;

/**
 * A month of four workloads, estimating-cost's own: code review on Opus looks
 * like the big line, document summaries on Sonnet are, because volume and
 * tokens multiply. The total, and the question the next part answers.
 */
export const MonthScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const monthFrom = n.beat("month").from;
  const monthAt = n.word("month", "month");
  const fourAt = n.word("month", "four workloads");
  const modelAt = n.word("month", "model");
  const volumeWordAt = n.word("month", "volume");
  const codeAt = n.word("guess", "Code review");
  const bigAt = n.word("guess", "big line");
  const isntAt = n.word("guess", "isn't");
  const summariesAt = n.word("answer", "Document summaries");
  const eightAt = n.word("answer", "eight hundred");
  const volumeAt = n.word("answer", "volume");
  const tokensAt = n.word("answer", "tokens");
  const wholeAt = n.word("total", "whole month");
  const seventeenAt = n.word("total", "seventeen hundred");
  const billAt = n.word("control-in", "bill");
  const shrinkAt = n.word("control-in", "shrink");
  const end = n.beat("levers").from;

  const rows = MONTH.workloads;
  const maxMonth = Math.max(...rows.map((r) => r.month));
  const rowY = (i: number) => y(ROW_Y0 + i * ROW_DY);
  const dom = rows.findIndex((r) => r.name === MONTH.dominant);
  const dear = rows.findIndex((r) => r.name === MONTH.dearestModel);
  const growAt = (i: number) => isntAt - 2 + i * 4;

  return (
    <AbsoluteFill>
      {/* ── Sound: the rows, the bars, the two marks, the total ── */}
      <Sfx name="el-pencil" at={monthAt - 2} level={-36} />
      {rows.map((_, i) => (
        <Sfx key={i} name="el-tap" at={fourAt + i * 5} level={-31} />
      ))}
      <Sfx name="el-whoosh" at={isntAt - 2} level={-34} />
      <Sfx name="el-tap" at={eightAt - 2} level={-27} />
      <Sfx name="el-tap" at={seventeenAt - 2} level={-27} />
      <Sfx name="el-pencil" at={shrinkAt - 4} level={-35} />

      <Headline at={monthFrom - 6} second={fourAt - 4} italic="four workloads.">
        A month,
      </Headline>

      <Drift from={monthFrom} to={end} amount={0.012} origin="50% 60%">
        <FigLabel n="10" title="A monthly estimate" at={monthAt - 6} x={X0} y={y(FIG_Y)} />
        {[
          ["Workload", X0, "left", monthAt],
          ["Model", MODEL_X, "left", modelAt - 4],
          ["Tokens", TOK_R, "right", volumeWordAt - 4],
          ["Per day", DAY_R, "right", volumeWordAt - 2],
          ["Per request", PER_R, "right", codeAt - 4],
          ["Per month", BAR_X, "left", isntAt - 4],
        ].map(([t, x, a, at]) => (
          <Note key={t as string} at={at as number} x={x as number} y={y(HEAD_Y)} align={a as "left" | "right"} from="up">
            <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>{t}</span>
          </Note>
        ))}
        <Hairline x={X0} y={y(HEAD_Y) + 36} w={RIGHT - X0} at={monthAt} color={INK_SOFT} />

        {rows.map((r, i) => {
          const ry = rowY(i);
          const glow =
            (i === dear ? ease(frame, codeAt - 4, 10) * (1 - ease(frame, summariesAt - 4, 10)) : 0) +
            (i === dom ? ease(frame, summariesAt - 4, 10) : 0);
          const barLit = i === dom ? pulse(frame, eightAt, 26) : 0;
          return (
            <React.Fragment key={r.name}>
              <div
                style={{
                  position: "absolute",
                  left: X0 - 12,
                  top: ry - 12,
                  width: RIGHT - X0 + 24,
                  height: h(ROW_DY) - 14,
                  borderRadius: 6,
                  background: rowGlow(Math.min(1, glow)),
                }}
              />
              <Note at={fourAt - 2 + i * 5} x={X0} y={ry}>
                <span style={{ ...note(25, INK), fontWeight: 600, whiteSpace: "nowrap" }}>{r.name}</span>
              </Note>
              <Note at={modelAt - 2 + i * 3} x={MODEL_X} y={ry}>
                <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>{NAME[r.model]}</span>
              </Note>
              <Note at={volumeWordAt - 2 + i * 3} x={TOK_R} y={ry} align="right">
                <span style={{ ...note(25, INK), ...TABULAR, whiteSpace: "nowrap" }}>
                  {i === dom ? (
                    <Marked at={tokensAt - 2}>{`${int(r.in)} in, ${int(r.out)} out`}</Marked>
                  ) : (
                    `${int(r.in)} in, ${int(r.out)} out`
                  )}
                </span>
              </Note>
              <Note at={volumeWordAt + i * 3} x={DAY_R} y={ry} align="right">
                <span style={{ ...note(25, INK), ...TABULAR, whiteSpace: "nowrap" }}>
                  {i === dom || i === dear ? <Marked at={volumeAt - 2 + (i === dear ? 6 : 0)}>{int(r.perDay)}</Marked> : int(r.perDay)}
                </span>
              </Note>
              <Note at={codeAt - 2 + i * 3} x={PER_R} y={ry} align="right">
                {/* The decoy is red only until the real answer is named; then red belongs to that row alone. */}
                <span
                  style={{
                    ...note(25, i === dear && frame < summariesAt - 4 ? POINT_INK : INK),
                    fontWeight: i === dear && frame < summariesAt - 4 ? 700 : 500,
                    ...TABULAR,
                    whiteSpace: "nowrap",
                  }}
                >
                  {i === dear ? <Marked at={bigAt - 2} out={summariesAt - 4}>{usd(r.per, 5)}</Marked> : usd(r.per, 5)}
                </span>
              </Note>
              <HBar
                x={BAR_X}
                y={ry + 2}
                w={(r.month / maxMonth) * BAR_MAX}
                h={h(30)}
                at={growAt(i)}
                dur={20}
                fill={i === dom ? `color-mix(in srgb, ${POINT} ${Math.round(ease(frame, summariesAt - 4, 12) * 100)}%, ${COST})` : COST}
                style={{ transform: `scaleY(${1 + barLit * 0.35})` }}
              />
              <Note at={growAt(i) + 12} x={BAR_X + (r.month / maxMonth) * BAR_MAX + 14} y={ry}>
                <span style={{ ...note(25, i === dom ? POINT_INK : INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>
                  {i === dom ? <Marked at={eightAt - 2}>{usd(r.month)}</Marked> : usd(r.month)}
                </span>
              </Note>
              <Hairline x={X0} y={ry + h(ROW_DY) - 30} w={RIGHT - X0} at={fourAt + 2 + i * 5} color={RULE} />
            </React.Fragment>
          );
        })}

        {/* The month. */}
        <Hairline x={X0} y={y(TOTAL_Y) - 20} w={RIGHT - X0} at={wholeAt - 4} color={INK} />
        <Ink at={wholeAt - 2} dur={14} style={{ left: X0, top: y(TOTAL_Y), whiteSpace: "nowrap" }}>
          <span style={{ ...label(28, INK) }}>The whole month</span>
        </Ink>
        <Ink at={seventeenAt - 4} dur={16} style={{ left: BAR_X, top: y(TOTAL_Y) - 12, whiteSpace: "nowrap" }}>
          <span style={{ ...headline(52), ...TABULAR, transform: `scale(${1 + pulse(frame, billAt, 22) * 0.05})`, display: "inline-block" }}>
            {usd(MONTH.total)}
          </span>
        </Ink>
        {/* …and the question the levers answer. */}
        <Arrow from={[BAR_X - 40, y(TOTAL_Y) - 6]} to={[BAR_X - 40, y(TOTAL_Y) + 50]} at={shrinkAt - 2} dur={12} color={POINT_INK} width={3} />
      </Drift>
    </AbsoluteFill>
  );
};
