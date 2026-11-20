import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { SKEW } from "./data";
import { commas, Drift, Fade, Flow, Line, Mark, MiniMap, Node, OK, OK_INK, pct, pulse, Q_SIZE, Q_W, Svg, Tag, X0 } from "./parts";

const DEF = { x: X0, w: 440, h: 88 };
const FORK = { x: 640, w: 250, h: 62 };
const RX = 990;
/** The timeline: four past transactions and the current one. */
const DOTS = [1110, 1260, 1410, 1560];
const NOW_X = 1730;
/** The two histograms' panels. */
const PANELS = [
  { x: RX, title: "training", data: SKEW.histTraining },
  { x: 1440, title: "serving", data: SKEW.histServing },
] as const;
const BAR_W = 32;
const BAR_STEP = 41;

/**
 * Question 2: one feature computed one way for training and another for
 * serving. A simulated fraud model's most telling feature, the card's
 * transactions in the past hour, counted from the warehouse (which already
 * holds the current transaction, so it counts itself) and on the serving
 * path (before it is written): off by one. Offline the model catches 60% of
 * held-out fraud, served it catches 42%, because training never saw a zero
 * and serving sees one six times in ten. Nothing errors; the fix is one
 * shared path, and comparing logged serving features with training's.
 */
export const SkewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q2").from;
  const qAt = n.word("q2", "Question two");
  const textAt = n.word("q2", "What is training-serving skew");
  const defAt = n.word("q2", "A feature computed");
  const oneWayAt = n.word("q2", "one way");
  const otherAt = n.word("q2", "another way");
  const codeAt = n.word("q2", "different code");
  const dataAt = n.word("q2", "different data");
  const timingAt = n.word("q2", "different timing");
  const simAt = n.word("q2-sim", "Simulate a fraud model");
  const pastHourAt = n.word("q2-sim", "transactions in the past hour");
  const warehouseAt = n.word("q2-sim", "Training builds it from the warehouse");
  const currentAt = n.word("q2-sim", "the current transaction is already logged");
  const includesAt = n.word("q2-sim", "the count includes it");
  const servingAt = n.word("q2-sim", "The serving path counts");
  const offByOneAt = n.word("q2-sim", "Off by one");
  const offlineAt = n.word("q2-result", "Offline, the model catches");
  const fortyTwoAt = n.word("q2-result", "it catches forty-two");
  const trainingZeroAt = n.word("q2-result", "In training");
  const neverAt = n.word("q2-result", "never zero");
  const sixAt = n.word("q2-result", "zero six times in ten");
  const errorsAt = n.word("q2-silent", "Nothing errors");
  const cantSeeAt = n.word("q2-silent", "offline evaluation can't see it");
  const sharedAt = n.word("q2-silent", "one shared path");
  const compareAt = n.word("q2-silent", "compare logged serving features");
  const end = n.beat("q2-silent").to;

  const defMid = y(372);
  const forkMid = [y(330), y(430)];
  const axisY = y(424);
  const recall = { offline: SKEW.offline.recall, serving: SKEW.serving.recall };
  const barScale = 560;
  const histBottom = y(792);
  const histH = h(200);
  const share = (v: number) => v / SKEW.test;
  const maxShare = 0.6;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={defAt} level={-30} />
      <Sfx name="el-pencil" at={oneWayAt} level={-35} />
      <Sfx name="el-pencil" at={otherAt} level={-35} />
      <Sfx name="el-tap" at={codeAt} level={-32} />
      <Sfx name="el-tap" at={dataAt} level={-32} />
      <Sfx name="el-tap" at={timingAt} level={-32} />
      <Sfx name="el-sprinkle" at={pastHourAt} level={-33} />
      <Sfx name="el-tap" at={includesAt} level={-30} />
      <Sfx name="el-tap" at={servingAt + 8} level={-31} />
      <Sfx name="el-scratch" at={offByOneAt} level={-33} />
      <Sfx name="el-pop" at={offlineAt} level={-31} />
      <Sfx name="el-pop" at={fortyTwoAt} level={-31} />
      <Sfx name="el-sprinkle" at={trainingZeroAt} level={-33} />
      <Sfx name="el-tap" at={errorsAt} level={-31} />
      <Sfx name="el-whoosh" at={sharedAt} level={-36} />
      <Sfx name="el-chime" at={compareAt + 20} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          What is training–serving skew?
        </QuestionCard>
        <MiniMap at={qAt} lit={[["features", qAt + 10]]} />

        {/* ── One definition, forking two ways ── */}
        <Node
          x={DEF.x}
          y={defMid - DEF.h / 2}
          w={DEF.w}
          h={DEF.h}
          at={defAt}
          title="One Feature"
          sub="the card's transactions in the past hour"
          lit={pastHourAt}
          litOut={warehouseAt}
        />
        {[0, 1].map((i) => {
          const at = i ? otherAt : oneWayAt;
          const start = defMid + (i ? 14 : -14);
          return (
            <React.Fragment key={i}>
              <Flow
                points={[
                  [DEF.x + DEF.w + 3, start],
                  [DEF.x + DEF.w + 30, start],
                  [DEF.x + DEF.w + 30, forkMid[i]],
                  [FORK.x - 3, forkMid[i]],
                ]}
                at={at}
                color={INK}
                out={sharedAt}
              />
              <Node
                x={FORK.x}
                y={forkMid[i] - FORK.h / 2}
                w={FORK.w}
                h={FORK.h}
                at={at + 6}
                title={i ? "Serving Path" : "Training Pipeline"}
                size={22}
                out={sharedAt}
                lit={at + 6}
                litOut={at + 40}
              />
            </React.Fragment>
          );
        })}
        <Flow points={[[DEF.x + DEF.w + 3, defMid], [FORK.x - 3, defMid]]} at={sharedAt + 6} color={OK} />
        <Node
          x={FORK.x}
          y={defMid - 44}
          w={FORK.w + 30}
          h={88}
          at={sharedAt + 4}
          tone="ok"
          title="Shared Feature Path"
          sub="for training and serving"
          size={22}
        />
        <Ink at={codeAt} dur={12} style={{ left: X0, top: y(500), whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 12, fontSize: 22 }}>
          <span style={{ ...note(22, INK) }}>Different</span>
          <span style={{ opacity: ease(frame, codeAt, 8) }}>
            <Tag size={22}>code</Tag>
          </span>
          <span style={{ opacity: ease(frame, dataAt, 8) }}>
            <Tag size={22}>data</Tag>
          </span>
          <span style={{ opacity: ease(frame, timingAt, 8) }}>
            <Mark at={offByOneAt}>
              <Tag size={22}>timing</Tag>
            </Mark>
          </span>
        </Ink>

        {/* ── The simulation, named ── */}
        <Fade out={errorsAt - 4}>
          <Line at={simAt} x={X0} y={y(610)} size={22}>
            Simulation
          </Line>
          <Line at={simAt + 6} x={X0} y={y(610) + h(40)} size={21} color={INK_SOFT}>
            <Num>{commas(SKEW.n)}</Num> card transactions, <Num>{Math.round(SKEW.fraudShare * 100)}</Num>% fraud
          </Line>
          <Line at={simAt + 12} x={X0} y={y(610) + h(76)} size={21} color={INK_SOFT}>
            Gradient boosting, trained on <Num>{commas(SKEW.train)}</Num>
          </Line>
          <Line at={simAt + 18} x={X0} y={y(610) + h(112)} size={21} color={INK_SOFT}>
            Scored on the <Num>{commas(SKEW.test)}</Num> held out
          </Line>
        </Fade>

        {/* ── Off by one: the warehouse counts the current transaction ── */}
        <Fade out={offlineAt - 6}>
          <Line at={pastHourAt} x={RX} y={y(300)} size={22}>
            One card&apos;s transactions in the past hour
          </Line>
          <Svg opacity={ease(frame, pastHourAt, 12)}>
            <line x1={RX} x2={NOW_X + 40} y1={axisY} y2={axisY} stroke={INK_SOFT} strokeWidth={2} />
            {DOTS.map((x, i) => {
              const p = ease(frame, pastHourAt + 4 + i * 4, 10);
              return <circle key={i} cx={x} cy={axisY} r={13 * p} fill={BAR} />;
            })}
            <circle cx={NOW_X} cy={axisY} r={13 * ease(frame, currentAt, 10)} fill={BAR} />
            <circle
              cx={NOW_X}
              cy={axisY}
              r={24}
              fill="none"
              stroke={ds("yellow", 500)}
              strokeWidth={6}
              pathLength={1}
              strokeDasharray={`${ease(frame, includesAt, 16)} 1`}
            />
            {/* The two counts, as brackets under the dots. */}
            {[
              { at: includesAt, x1: DOTS[0] - 18, x2: NOW_X + 18, yy: y(500) },
              { at: servingAt + 6, x1: DOTS[0] - 18, x2: DOTS[3] + 18, yy: y(596) },
            ].map((b, i) => {
              const p = ease(frame, b.at, 14);
              if (p <= 0) return null;
              const x2 = b.x1 + (b.x2 - b.x1) * p;
              return (
                <path
                  key={i}
                  d={`M${b.x1},${b.yy - 12} L${b.x1},${b.yy} L${x2},${b.yy} L${x2},${b.yy - 12}`}
                  fill="none"
                  stroke={i ? ACCENT : INK}
                  strokeWidth={2.4}
                  strokeLinejoin="round"
                />
              );
            })}
          </Svg>
          <Line at={pastHourAt + 6} x={RX} y={axisY + h(22)} size={20} color={INK_SOFT}>
            1 h ago
          </Line>
          <Line at={pastHourAt + 6} x={NOW_X + 40} y={axisY + h(22)} size={20} color={INK_SOFT} align="right" width={120}>
            now
          </Line>
          <Ink at={currentAt} dur={12} style={{ left: NOW_X - 220, top: axisY - h(76), width: 260, textAlign: "right", whiteSpace: "nowrap" }}>
            <span style={{ ...note(21, INK), fontWeight: 500 }}>
              {frame < includesAt ? "this one" : <Mark at={includesAt}>counts itself</Mark>}
            </span>
          </Ink>
          <Line at={warehouseAt + 6} x={RX} y={y(500) + h(18)} size={22}>
            Training, from the warehouse
            <b style={{ opacity: ease(frame, includesAt + 8, 10) }}>
              : <Num>{DOTS.length + 1}</Num>
            </b>
          </Line>
          <Line at={servingAt + 10} x={RX} y={y(596) + h(18)} size={22}>
            Serving path: <b style={{ color: ACCENT_INK }}><Num>{DOTS.length}</Num></b>
            <span style={{ color: INK_SOFT }}>, counted before it&apos;s written</span>
          </Line>
          <Line at={offByOneAt} x={RX} y={y(704)} size={28} color={ACCENT_INK}>
            Off by one
          </Line>
        </Fade>

        {/* ── What it costs: fraud caught, offline against served ── */}
        <Line at={offlineAt} x={RX} y={y(300)} size={22}>
          Fraud caught, of <Num>{SKEW.testFraud}</Num> held-out frauds
        </Line>
        {[
          { k: "offline", v: recall.offline, at: offlineAt + 4, color: BAR, ink: BLUE_INK, row: y(356) },
          { k: "served", v: recall.serving, at: fortyTwoAt, color: ACCENT, ink: ACCENT_INK, row: y(356) + h(54) },
        ].map((b) => {
          const p = ease(frame, b.at, 18);
          if (p <= 0) return null;
          return (
            <React.Fragment key={b.k}>
              <div style={{ position: "absolute", left: RX, top: b.row, width: 96, ...label(22, INK), fontWeight: 500, opacity: Math.min(1, p * 2) }}>{b.k}</div>
              <div style={{ position: "absolute", left: RX + 110, top: b.row + 2, width: barScale * b.v * p, height: 30, background: b.color, borderRadius: 4 }} />
              <div style={{ position: "absolute", left: RX + 110 + barScale * b.v * p + 14, top: b.row, ...label(22, b.ink), fontWeight: 500, whiteSpace: "nowrap", opacity: p }}>
                <Num>{pct(b.v)}</Num>
              </div>
            </React.Fragment>
          );
        })}
        <Ink at={errorsAt + 4} dur={12} style={{ left: RX + 110 + barScale * recall.serving + 100, top: y(356) + h(54) - 4, whiteSpace: "nowrap" }}>
          <Tag size={21}>no errors</Tag>
        </Ink>
        <Line at={cantSeeAt} x={RX + 110 + barScale * recall.offline + 100} y={y(356) + 2} size={21} color={INK_SOFT}>
          all offline evaluation sees
        </Line>

        {/* The past-hour count, held-out rows: training never zero, serving
            zero six times in ten. */}
        <Line at={trainingZeroAt} x={RX} y={y(476)} size={22}>
          The past-hour count, held-out rows
        </Line>
        {PANELS.map((panel, pi) => {
          const at = trainingZeroAt + pi * 10;
          const shown = ease(frame, at, 12);
          if (shown <= 0) return null;
          return (
            <React.Fragment key={panel.title}>
              <div style={{ position: "absolute", left: panel.x, top: y(522), ...label(21, INK_SOFT), fontWeight: 500, opacity: shown }}>{panel.title}</div>
              {panel.data.map((v, k) => {
                const p = ease(frame, at + 4 + k * 2, 14);
                const hh = (share(v) / maxShare) * histH * p;
                const red = pi === 1 && k === 0;
                return (
                  <React.Fragment key={k}>
                    <div
                      style={{
                        position: "absolute",
                        left: panel.x + k * BAR_STEP,
                        top: histBottom - hh,
                        width: BAR_W,
                        height: Math.max(0, hh),
                        background: red ? ACCENT : BAR,
                        borderRadius: 3,
                        boxShadow: red ? `0 0 0 ${6 * pulse(frame, sixAt, 26)}px ${HIGHLIGHT}` : undefined,
                      }}
                    />
                    <div style={{ position: "absolute", left: panel.x + k * BAR_STEP - 6, width: BAR_W + 12, top: histBottom + 8, textAlign: "center", ...label(19, INK_SOFT), opacity: shown }}>
                      {k === 8 ? "8+" : <Num>{k}</Num>}
                    </div>
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          );
        })}
        <ColumnRule x={1400} top={y(522)} height={histBottom + 34 - y(522)} at={trainingZeroAt + 10} />
        <Line at={neverAt} x={RX} y={histBottom + h(52)} size={21}>
          Never zero
        </Line>
        <Line at={sixAt} x={1440} y={histBottom + h(52)} size={21} color={ACCENT_INK}>
          Zero <Num>6</Num> times in <Num>10</Num>
        </Line>

        {/* ── Silent: a clean log, and the fix ── */}
        <Ink at={errorsAt} dur={14} style={{ left: X0, top: y(600) }}>
          <div
            style={{
              width: 640,
              boxSizing: "border-box",
              padding: "14px 20px",
              borderRadius: 8,
              background: ds("gray", 50),
              fontFamily: MONO,
              fontSize: 20,
              lineHeight: 1.6,
              color: INK,
              whiteSpace: "nowrap",
            }}
          >
            <div>
              <span style={{ color: INK_SOFT }}>INFO</span> scored <Num>{commas(SKEW.test)}</Num> transactions
            </div>
            <div>
              <span style={{ color: INK_SOFT }}>INFO</span> errors: <Num>0</Num>
            </div>
          </div>
        </Ink>
        <Line at={cantSeeAt + 4} x={X0} y={y(600) + h(118)} size={21}>
          Offline report: <span style={{ color: BLUE_INK }}><Num>{pct(recall.offline)}</Num></span> of fraud caught
        </Line>
        <Line at={compareAt} x={X0} y={y(840)} size={22} color={OK_INK}>
          Compare logged serving features
        </Line>
        <Flow points={[[X0 + 374, y(840) + 15], [X0 + 452, y(840) + 15]]} at={compareAt + 8} color={OK} head={12} both />
        <Line at={compareAt + 12} x={X0 + 470} y={y(840)} size={22} color={OK_INK}>
          with training ones
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
