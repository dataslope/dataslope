import { Warehouse } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Badge, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { TABLE } from "./data";
import { Box, Drift, Flow, Headline, Kicker, Mark, pulse, SERIES, Spot, X0 } from "./parts";

const MODELS = ["stg_sales", "int_sales", "fct_sales"];
const MODEL_W = 230;
const MODEL_H = 52;
const MODEL_TOP = 330;
const MODEL_STEP = 70;
const WH = { x: 470, w: 260, top: 345, h: 170 };
const RECEIPT = { x: 820, top: 316, w: 170 };
const BILL_X = 1070;
const CAMEL = { x: 1350, top: 300, w: 430 };
const SQUARES_Y = 640;
const SQ = 48;
const SQ_GAP = 10;
const SMALL = 36;
const DEEP = 10;
const QUICK = 3;

/**
 * The opening. Three dbt models (staging, intermediate, the fact) run as
 * queries into a warehouse, and the warehouse prints a bill; the bill counts
 * either the bytes a query scans or the time its compute runs. The camel,
 * the video's hero, carries the load beside it. Then the promise, counted
 * from what the video does: ten numbered squares and three smaller ones, and
 * the two kinds of number the video shows, measured and modelled.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const modelAt = n.word("hook", "Every model");
  const queryAt = n.word("hook", "runs as a query");
  const whAt = n.word("hook", "in a warehouse");
  const billAt = n.word("hook", "sends a bill");
  const countsAt = n.word("hook-bill", "What the bill counts");
  const bytesAt = n.word("hook-bill", "the bytes a query scans");
  const timeAt = n.word("hook-bill", "the time its compute runs");
  const tenAt = n.word("plan", "Ten questions");
  const workedAt = n.word("plan", "worked through");
  const threeAt = n.word("plan", "three come quickly");
  const vendorAt = n.word("plan", "No vendor's warehouse");
  const measuredAt = n.word("plan", "Sizes are measured in DuckDB");
  const millionAt = n.word("plan", "a million sales");
  const modelBadgeAt = n.word("plan", "anything bigger is a model");
  const end = n.beat("plan").to;

  const whTop = y(WH.top);
  const whH = h(WH.h);
  const modelTop = (i: number) => y(MODEL_TOP + i * MODEL_STEP);
  const sqTop = y(SQUARES_Y);
  const sqX = (i: number) => (i < DEEP ? X0 + i * (SQ + SQ_GAP) : X0 + DEEP * (SQ + SQ_GAP) + 22 + (i - DEEP) * (SMALL + 8));
  const squaresEnd = sqX(DEEP + QUICK - 1) + SMALL;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={from + 14} level={-30} />
      {MODELS.map((m, i) => (
        <Sfx key={m} name="el-tap" at={modelAt + i * 4} level={-33} />
      ))}
      <Sfx name="el-pencil" at={queryAt} level={-35} />
      <Sfx name="el-tap" at={whAt} level={-32} />
      <Sfx name="el-pop" at={billAt} level={-30} />
      <Sfx name="el-pencil" at={bytesAt + 2} level={-35} />
      <Sfx name="el-pencil" at={timeAt + 2} level={-35} />
      <Sfx name="el-sprinkle" at={tenAt} level={-33} />
      <Sfx name="el-tap" at={threeAt + 2} level={-33} />
      <Sfx name="el-tap" at={measuredAt + 2} level={-33} />
      <Sfx name="el-tap" at={modelBadgeAt + 2} level={-33} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>{SERIES}</Kicker>
        <Headline lead="Warehouses," turn="and what they cost." at={from + 4} turnAt={billAt - 4} size={70} />

        <Spot art="camel" at={from + 14} left={CAMEL.x} top={y(CAMEL.top)} width={CAMEL.w} />

        {/* ── A dbt project's models, run as queries in a warehouse ── */}
        <Note at={modelAt - 2} x={X0} y={y(MODEL_TOP) - h(40)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>A dbt project</span>
        </Note>
        {MODELS.map((m, i) => (
          <Box key={m} x={X0} y={modelTop(i)} w={MODEL_W} h={h(MODEL_H)} at={modelAt + i * 4} title={m} mono size={22} />
        ))}
        {MODELS.map((m, i) => {
          const fromY = modelTop(i) + h(MODEL_H) / 2;
          const toY = whTop + whH * (0.3 + 0.2 * i);
          return <Flow key={m} points={[[X0 + MODEL_W + 10, fromY], [WH.x - 12, toY]]} at={queryAt + i * 3} color={INK} width={2.4} head={13} />;
        })}
        <Box x={WH.x} y={whTop} w={WH.w} h={whH} at={whAt - 2} title="Warehouse" icon={Warehouse} size={26} sub="runs every model" />

        {/* ── The bill, and what it counts ── */}
        <Spot art="receipt" at={billAt} left={RECEIPT.x} top={y(RECEIPT.top)} width={RECEIPT.w} />
        <Note at={countsAt} x={BILL_X} y={y(318)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>The bill counts</span>
        </Note>
        <Note at={bytesAt - 2} x={BILL_X} y={y(362)}>
          <span style={{ ...note(30, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            <Mark at={bytesAt + 4}>Bytes scanned</Mark>
          </span>
        </Note>
        <Note at={timeAt - 2} x={BILL_X} y={y(420)}>
          <span style={{ ...note(30, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            or <Mark at={timeAt + 4}>compute time</Mark>
          </span>
        </Note>

        {/* ── Ten questions worked through, three quick ── */}
        {Array.from({ length: DEEP + QUICK }, (_, i) => {
          const deep = i < DEEP;
          const at = tenAt - 2 + i * 1.5;
          const p = ease(frame, at, 10);
          if (p <= 0) return null;
          const lit = deep ? ease(frame, workedAt + i * 1.5, 10) : ease(frame, threeAt + (i - DEEP) * 2, 10);
          const size = deep ? SQ : SMALL;
          const glow = deep ? pulse(frame, workedAt + i * 1.5, 16) : pulse(frame, threeAt + (i - DEEP) * 2, 16);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: sqX(i),
                top: sqTop + (SQ - size) / 2,
                width: size,
                height: size,
                borderRadius: 6,
                background: `color-mix(in srgb, ${BAR} ${18 + 72 * lit}%, ${PAPER})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(deep ? 21 : 19, lit > 0.5 ? PAPER : BLUE_INK),
                fontWeight: 500,
                ...TABULAR,
                opacity: p,
                transform: `scale(${(0.7 + 0.3 * p) * (1 + 0.12 * glow)})`,
              }}
            >
              {i + 1}
            </div>
          );
        })}
        <Note at={workedAt} x={squaresEnd + 34} y={sqTop - h(14)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <b>
              <Num>{DEEP}</Num>
            </b>{" "}
            worked through
          </span>
        </Note>
        <Note at={threeAt} x={squaresEnd + 34} y={sqTop + h(22)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <b>
              <Num>{QUICK}</Num>
            </b>{" "}
            quickly, at the end
          </span>
        </Note>

        {/* ── Two kinds of number ── */}
        <Note at={vendorAt} x={X0} y={y(730)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>No vendor&rsquo;s warehouse runs here.</span>
        </Note>
        <Note at={measuredAt} x={X0} y={y(782)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.6em", fontSize: 23 }}>
            <Badge tone="blue" size={23}>
              measured
            </Badge>
            <span>
              in DuckDB
              <span style={{ opacity: ease(frame, millionAt, 10) }}>
                , on <Num>{TABLE.rows.toLocaleString("en-US")}</Num> sales made up for this video
              </span>
            </span>
          </span>
        </Note>
        <Note at={modelBadgeAt} x={X0} y={y(838)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.6em", fontSize: 23 }}>
            <Badge tone="purple" size={23}>
              model
            </Badge>
            <span>anything bigger, from stated assumptions</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
