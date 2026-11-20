import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Box, Cylinder, Drift, Mark, Wire, X0 } from "./parts";

const HEAD_Y = 330;
const BOX_Y = 436;
const BOX_W = 210;
const BOX_H = 66;
const BOX_XS = [X0, 395, 670];
const STORE = { x: 300, w: 400, top: 590, h: 130 };
const RULE_X = 960;
const RX = 1040;
const FUSED_W = 300;
const FUSED_Y = 436;
const FUSED_HALF = 142;

/** A traditional warehouse node: compute and storage in one outlined box,
 *  split by a line, inking in on `at`; its storage half can turn red. */
const Fused: React.FC<{ x: number; top: number; half: number; at: number; badAt?: number }> = ({ x, top, half, at, badAt }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const bad = badAt === undefined ? 0 : ease(frame, badAt, 10);
  const lower = `color-mix(in srgb, ${ACCENT_INK} ${Math.round(100 * bad)}%, ${INK})`;
  const W = FUSED_W;
  return (
    <div style={{ position: "absolute", left: x, top, width: W, height: half * 2, opacity: p, transform: `scale(${0.92 + 0.08 * p})` }}>
      <svg width={W} height={half * 2} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={`M1,${half} L1,9 Q1,1 9,1 L${W - 9},1 Q${W - 1},1 ${W - 1},9 L${W - 1},${half}`} fill="none" stroke={INK} strokeWidth={2} />
        <path d={`M1,${half} L1,${half * 2 - 9} Q1,${half * 2 - 1} 9,${half * 2 - 1} L${W - 9},${half * 2 - 1} Q${W - 1},${half * 2 - 1} ${W - 1},${half * 2 - 9} L${W - 1},${half}`} fill="none" stroke={lower} strokeWidth={2} />
        <line x1={1} x2={W - 1} y1={half} y2={half} stroke={INK} strokeWidth={2} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: half, display: "flex", alignItems: "center", justifyContent: "center", ...label(24, INK), fontWeight: 500 }}>
        Compute
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: half, height: half, display: "flex", alignItems: "center", justifyContent: "center", ...label(24, lower), fontWeight: 500 }}>
        Storage
      </div>
    </div>
  );
};

/**
 * Question 1. Left, the cloud warehouse: one copy of the data in object
 * storage, compute started over it, resized without moving the data, and
 * several isolated workloads reading the same copy. Right, the traditional
 * shape: compute and storage fused in one node, scaled by adding another
 * whole node, storage and all. Then the catch: a cluster left running after
 * its work, billed by the second the whole time.
 */
export const SplitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("split").from;
  const qAt = n.word("split", "Question one");
  const qTextAt = n.word("split", "What makes a modern");
  const sepAt = n.word("split-new", "Storage is separate from compute");
  const vendorsAt = n.word("split-new", "Snowflake, BigQuery and Databricks");
  const storeAt = n.word("split-new", "cheap object storage");
  const startAt = n.word("split-new", "start compute that reads it");
  const scaleAt = n.word("split-new", "scale query power");
  const movingAt = n.word("split-new", "without moving data");
  const manyAt = n.word("split-new", "many isolated workloads");
  const copyAt = n.word("split-new", "over one copy");
  const tradAt = n.word("split-old", "A traditional warehouse");
  const teraAt = n.word("split-old", "an on-premises Teradata");
  const couplesAt = n.word("split-old", "couples the two");
  const growAt = n.word("split-old", "they grow together");
  const needAt = n.word("split-old", "whether you need both or not");
  const catchAt = n.word("split-catch", "The catch");
  const leaveAt = n.word("split-catch", "leave running");
  const billedAt = n.word("split-catch", "billed by the second");
  const wholeAt = n.word("split-catch", "the whole time");
  const end = n.beat("split-catch").to;

  const boxTop = y(BOX_Y);
  const boxH = h(BOX_H);
  const storeTop = y(STORE.top);
  const storeH = h(STORE.h);
  const fusedTop = y(FUSED_Y);
  const half = h(FUSED_HALF);
  const boxAt = [startAt, manyAt + 2, manyAt + 8];
  const titles = ["Loading", "Dashboards", "Ad hoc"];
  // The size of the first cluster, before and after it is scaled up.
  const scaled = ease(frame, scaleAt, 14);
  // The meter: seconds counted from the moment the work stopped.
  const idle = Math.max(0, Math.floor((frame - leaveAt) / 30));
  const clock = `0:${String(Math.floor(idle / 60)).padStart(2, "0")}:${String(idle % 60).padStart(2, "0")}`;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={storeAt} level={-33} />
      <Sfx name="el-tap" at={startAt} level={-33} />
      <Sfx name="el-whoosh" at={scaleAt} level={-36} />
      <Sfx name="el-tap" at={manyAt + 2} level={-34} />
      <Sfx name="el-tap" at={manyAt + 8} level={-34} />
      <Sfx name="el-tap" at={couplesAt} level={-33} />
      <Sfx name="el-tap" at={growAt} level={-33} />
      <Sfx name="el-scratch" at={needAt + 2} level={-35} />
      <Sfx name="el-pencil" at={catchAt + 2} level={-35} />
      <Sfx name="el-tap" at={billedAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          What makes a modern cloud warehouse different from a traditional one?
        </QuestionCard>

        {/* ── The cloud warehouse ── */}
        <Note at={sepAt} x={X0} y={y(HEAD_Y)}>
          <span style={{ ...label(26, INK), whiteSpace: "nowrap" }}>Storage apart from compute</span>
        </Note>
        <Note at={vendorsAt} x={X0} y={y(HEAD_Y) + h(40)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Snowflake, BigQuery, Databricks</span>
        </Note>
        <Cylinder x={STORE.x} y={storeTop} w={STORE.w} h={storeH} at={storeAt - 2} title="Object storage" tone="data" />
        {titles.map((t, i) => {
          const cx = BOX_XS[i] + BOX_W / 2;
          const tx = STORE.x + STORE.w * (0.18 + 0.32 * i);
          return (
            <React.Fragment key={t}>
              <Wire points={[[cx, boxTop + boxH + 4], [tx, storeTop + h(6)]]} at={boxAt[i] + 4} />
              <Box
                x={BOX_XS[i]}
                y={boxTop}
                w={BOX_W}
                h={boxH}
                at={boxAt[i]}
                title="Compute"
                sub={titles[i]}
                tones={[{ at: leaveAt, tone: i === 2 ? "look" : "off" }]}
                scale={i === 0 ? 1 + 0.12 * scaled * (1 - ease(frame, manyAt, 12)) : 1}
              />
            </React.Fragment>
          );
        })}
        <Note at={scaleAt + 4} x={X0} y={boxTop - h(46)} out={manyAt}>
          <span style={{ ...note(21, INK), fontWeight: 500, whiteSpace: "nowrap" }}>Resized, no data moved</span>
        </Note>
        <Note at={movingAt} x={STORE.x + STORE.w + 30} y={storeTop + storeH / 2 - h(30)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>The data stays put</span>
        </Note>
        <Note at={copyAt} x={STORE.x + STORE.w + 30} y={storeTop + storeH / 2 + h(6)}>
          <span style={{ ...note(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>One copy</span>
        </Note>

        {/* ── The traditional warehouse ── */}
        <ColumnRule x={RULE_X} top={y(HEAD_Y)} height={storeTop + storeH - y(HEAD_Y)} at={tradAt} />
        <Note at={tradAt} x={RX} y={y(HEAD_Y)}>
          <span style={{ ...label(26, INK), whiteSpace: "nowrap" }}>Traditional: coupled</span>
        </Note>
        <Note at={teraAt} x={RX} y={y(HEAD_Y) + h(40)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>On-premises Teradata, classic Redshift</span>
        </Note>
        <Fused x={RX} top={fusedTop} half={half} at={couplesAt} />
        <Note at={growAt + 2} x={RX + FUSED_W + 18} y={fusedTop + half - h(26)}>
          <span style={{ ...label(32, INK) }}>+</span>
        </Note>
        <Fused x={RX + FUSED_W + 60} top={fusedTop} half={half} at={growAt + 4} badAt={needAt} />
        <Note at={growAt + 8} x={RX} y={fusedTop + half * 2 + h(22)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            To scale one, add both
            <span style={{ color: ACCENT_INK, fontWeight: 500, opacity: ease(frame, needAt + 4, 10) }}>, whether you need the storage or not</span>
          </span>
        </Note>

        {/* ── The catch ── */}
        <Note at={catchAt} x={X0} y={y(770)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b>The catch:</b> compute you can start, you can leave running
          </span>
        </Note>
        <Note at={billedAt - 2} x={X0} y={y(770) + h(48)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            Billed per second while it runs
            <span style={{ opacity: ease(frame, wholeAt, 10) }}>
              , idle or not:{" "}
              <Mark at={wholeAt + 4}>
                <Num>{clock}</Num>
              </Mark>
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
