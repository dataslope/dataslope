import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { DASHBOARDS, money } from "./data";
import { Drift, Flow, Node, Svg, Tile, X0 } from "./parts";

const LIST_Y = 340;
const ITEM = 117;
const TILE_A = 960;
const TILE_B = 1420;
const TILE_W = 380;
const TILE_H = 160;
const TILES_Y = 470;
const CHART = { x: 980, w: 740, top: 700, h: 170 };

/**
 * Question 1, first because the opening asks it. Two hand-written
 * definitions, and the four ways they part (the page's list, each inking in
 * as it is read). Here it is the fan trap: the cause turns red, with an arrow
 * to the second tile. The cure is one shared definition with an arrow down to
 * each tile, which then both read 1,949.25. Left alone, the gap grows: two
 * lines that start close and spread apart, drawn without numbers (the page's
 * claim, not data).
 */
export const DisagreeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("disagree").from;
  const qAt = n.word("disagree", "Question");
  const textAt = n.word("disagree", "What causes");
  const handAt = n.word("disagree", "Two hand-written definitions");
  const causes = [
    { title: "Filters", detail: "refunds, tax or cancelled orders, counted by one", at: n.word("disagree-how", "One counts refunds") },
    { title: "Date logic", detail: "order date, or ship date", at: n.word("disagree-how", "One goes by order date") },
    { title: "Grain", detail: "aggregated at different grains", at: n.word("disagree-how", "They aggregate at different grains") },
    { title: "A fan trap", detail: "one of them hits it", at: n.word("disagree-how", "Or one of them hits a fan trap") },
  ];
  const trapAt = n.word("disagree-here", "the fan trap");
  const cureAt = n.word("disagree-cure", "one shared definition");
  const bothAt = n.word("disagree-cure", "both dashboards");
  const identicalAt = n.word("disagree-cure", "identical SQL");
  const widenAt = n.word("disagree-widen", "Left alone, the gap grows");
  const driftAt = n.word("disagree-widen", "they drift apart");
  const lookingAt = n.word("disagree-widen", "just when everyone is looking");
  const end = n.beat("disagree-widen").to;

  const listTop = y(LIST_Y);
  const tilesTop = y(TILES_Y);
  const itemTop = (i: number) => listTop + i * ITEM;
  const trapY = itemTop(3) + 17;
  const boxTop = listTop - 4;
  const boxH = 92;
  const midA = TILE_A + TILE_W / 2;
  const midB = TILE_B + TILE_W / 2;

  // ── The drift: two lines, close at first, then apart ──
  const cTop = y(CHART.top);
  const cH = h(CHART.h);
  const base = cTop + cH;
  const pts = 60;
  const lineA = (t: number) => base - cH * (0.28 + 0.12 * t + 0.5 * t * t + 0.03 * Math.sin(t * 7));
  const lineB = (t: number) => base - cH * (0.3 + 0.12 * t - 0.12 * t * t + 0.03 * Math.sin(t * 7 + 0.4));
  const grow = ease(frame, widenAt + 4, 40);
  const shown = Math.max(0, Math.min(pts, Math.round(grow * pts)));
  const path = (f: (t: number) => number) =>
    Array.from({ length: shown + 1 }, (_, i) => `${i ? "L" : "M"}${CHART.x + (CHART.w * i) / pts},${f(i / pts).toFixed(1)}`).join(" ");
  const gap = ease(frame, driftAt, 16);
  const gapPath =
    shown > 1
      ? `${path(lineA)} ${Array.from({ length: shown + 1 }, (_, k) => {
          const i = shown - k;
          return `L${CHART.x + (CHART.w * i) / pts},${lineB(i / pts).toFixed(1)}`;
        }).join(" ")} Z`
      : "";
  const nowX = CHART.x + CHART.w;
  const now = ease(frame, lookingAt, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={handAt} level={-35} />
      {causes.map((c) => (
        <Sfx key={c.title} name="el-tap" at={c.at} level={-33} />
      ))}
      <Sfx name="el-pencil" at={trapAt + 2} level={-34} />
      <Sfx name="el-pop" at={cureAt} level={-31} />
      <Sfx name="el-pencil" at={bothAt} level={-35} />
      <Sfx name="el-chime" at={identicalAt + 6} level={-33} />
      <Sfx name="el-pencil" at={widenAt + 4} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={62}>
          What causes two dashboards to report different numbers for the same metric?
        </QuestionCard>

        {/* ── Four ways two hand-written definitions part ── */}
        {causes.map((c, i) => {
          const top = itemTop(i);
          const isTrap = i === 3;
          const lit = isTrap ? ease(frame, trapAt, 10) : 0;
          const dim = isTrap ? 0 : ease(frame, trapAt, 12) * 0.5 * (1 - ease(frame, cureAt, 12));
          return (
            <React.Fragment key={c.title}>
              {i > 0 ? (
                <div style={{ position: "absolute", left: X0, top: top - 30, width: 620 * ease(frame, c.at - 4, 14), height: 1, background: HAIRLINE }} />
              ) : null}
              <Ink at={c.at - 2} dur={14} style={{ left: X0, top, opacity: 1 - dim }}>
                <div style={{ ...label(28, lit > 0.5 ? ACCENT_INK : INK), fontWeight: 600, whiteSpace: "nowrap" }}>{c.title}</div>
                <div style={{ ...note(23, INK_SOFT), marginTop: 8, whiteSpace: "nowrap" }}>{c.detail}</div>
              </Ink>
            </React.Fragment>
          );
        })}

        {/* ── Two tiles, each with its own SQL ── */}
        {[TILE_A, TILE_B].map((x, i) => (
          <Ink key={x} at={handAt + i * 4} dur={12} out={cureAt - 4} style={{ left: x + 4, top: tilesTop - 44 }}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Hand-written SQL</span>
          </Ink>
        ))}
        <Tile
          x={TILE_A}
          y={tilesTop}
          w={TILE_W}
          h={TILE_H}
          at={from + 10}
          title="Revenue"
          value={money(DASHBOARDS.a.value)}
          tones={[{ at: identicalAt + 4, tone: "ok" }]}
        />
        <Tile
          x={TILE_B}
          y={tilesTop}
          w={TILE_W}
          h={TILE_H}
          at={from + 14}
          title="Revenue"
          value={money(DASHBOARDS.b.value)}
          swap={{ at: identicalAt, value: money(DASHBOARDS.a.value) }}
          tones={[
            { at: trapAt + 6, tone: "bad", out: identicalAt },
            { at: identicalAt + 4, tone: "ok" },
          ]}
        />

        {/* ── Here: the fan trap, in the second tile ── */}
        <Flow
          points={[
            [X0 + 250, trapY],
            [midB, trapY],
            [midB, tilesTop + TILE_H + 12],
          ]}
          at={trapAt}
          dur={18}
          color={ACCENT}
          out={cureAt - 2}
        />

        {/* ── The cure: one shared definition, the same SQL for both ── */}
        <Node
          x={midA - 90}
          y={boxTop}
          w={midB - midA + 180}
          h={boxH}
          at={cureAt}
          title="One shared definition"
          sub={<span style={{ fontFamily: MONO, fontSize: 21, color: INK }}>SUM(amount) FROM orders</span>}
          size={24}
        />
        {[midA, midB].map((x, i) => (
          <Flow key={x} points={[[x, boxTop + boxH + 6], [x, tilesTop - 10]]} at={bothAt + i * 4} dur={10} />
        ))}

        {/* ── Left alone, the gap grows ── */}
        <Ink at={widenAt - 2} dur={14} style={{ left: CHART.x, top: cTop - h(44) }}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>Left alone, the gap grows</span>
        </Ink>
        <Svg>
          <line x1={CHART.x} y1={base} x2={CHART.x + CHART.w * ease(frame, widenAt, 16)} y2={base} stroke={INK} strokeWidth={1.5} />
          {gapPath ? <path d={gapPath} fill={HIGHLIGHT} opacity={gap * 0.9} /> : null}
          {shown > 0 ? <path d={path(lineA)} fill="none" stroke={BAR} strokeWidth={3} strokeLinejoin="round" /> : null}
          {shown > 0 ? <path d={path(lineB)} fill="none" stroke={ds("blue", 300)} strokeWidth={3} strokeLinejoin="round" /> : null}
          {now > 0 ? (
            <line x1={nowX + 14} y1={lineA(1)} x2={nowX + 14} y2={lineB(1)} stroke={inkOf.yellow} strokeWidth={4} strokeLinecap="round" opacity={now} />
          ) : null}
          <text x={CHART.x + CHART.w + 14} y={base + 7} textAnchor="start" style={svgText(note(21, INK_SOFT))} opacity={ease(frame, widenAt + 20, 10)}>
            time
          </text>
        </Svg>
      </Drift>
    </AbsoluteFill>
  );
};
