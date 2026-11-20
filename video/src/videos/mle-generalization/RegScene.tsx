import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, M, MathRun } from "../../editorial/math";
import { BAR, BLUE_INK, headline, INK, INK_SOFT, label, TABULAR } from "../../editorial/style";
import { ColumnRule, OutlineBadge } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { REG } from "./data";
import { Drift, Fade, line, LIT_LINE, NOISE_C, OK_INK, PlanMap, pulse, Q_SIZE, Say, StraightArrow, Svg, X0 } from "./parts";

const SLOT = 76;
const BARS_L = 210;
const BAR_W = 44;
const MAX = 100;

/** A weight's path under each penalty, 0 → 1 over the beat: L2's shrinks in
 *  proportion and never arrives; L1's falls at a constant rate and stops on 0. */
const W0 = 0.8;
const l2Path = (t: number) => W0 * Math.exp(-2.4 * t);
const l1Path = (t: number) => Math.max(0, W0 - 1.1 * W0 * t);

/**
 * Question 4 on the page's own run: twenty coefficients under each penalty,
 * ridge keeping all twenty (the fifteen useless shrunk to slivers) and lasso
 * exactly the five informative ones. Then why: each penalty's pull on a small
 * weight, drawn as an arrow that fades for L2 and holds for L1, which lands
 * the weight on zero. What that saves at serving time, and what lasso does
 * with a correlated pair. Then the round's map again, the second movement lit.
 */
export const RegScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("reg").from;
  const qAt = n.word("reg", "Question four");
  const textAt = n.word("reg", "L one versus");
  const bothAt = n.word("reg", "Both add a penalty");
  const smallAt = n.word("reg", "what happens to a small weight");
  const runAt = n.word("reg-run", "The page's run");
  const fiveAt = n.word("reg-run", "five of them informative");
  const ridgeAt = n.word("reg-run", "Ridge, the L two penalty");
  const allAt = n.word("reg-run", "keeps all twenty");
  const quarterAt = n.word("reg-run", "below a quarter");
  const noneAt = n.word("reg-run", "none reaches zero");
  const lassoAt = n.word("reg-run", "Lasso, the L one penalty");
  const exactAt = n.word("reg-run", "keeps exactly the five");
  const l2At = n.word("reg-why", "L two pulls");
  const fadesAt = n.word("reg-why", "the pull fades");
  const l1At = n.word("reg-why", "L one pulls");
  const zeroAt = n.word("reg-why", "lands on zero");
  const prodAt = n.word("reg-prod", "In production");
  const fiveFeatAt = n.word("reg-prod", "five features to compute");
  const corrAt = n.word("reg-prod", "With correlated features");
  const oneAt = n.word("reg-prod", "lasso keeps one");
  const elasticAt = n.word("reg-prod", "elastic net");
  const groupAt = n.word("reg-prod", "keeps the group");
  const fixAt = n.word("measure-in", "Every fix so far");
  const honestAt = n.word("measure-in", "keep that judgement honest");
  const end = n.beat("measure-in").to;
  const mapAt = n.beat("measure-in").from;

  const informative = new Set(REG.informative);
  const strips = [
    {
      name: "Ridge",
      pen: (
        <MathRun>
          loss + λ Σ <I>w</I>²
        </MathRun>
      ),
      tag: "L2",
      vals: REG.ridge,
      head: y(370),
      base: y(556),
      at: ridgeAt,
      count: `keeps ${REG.ridgeNonZero} of ${REG.features}`,
      countAt: allAt,
      countInk: INK,
    },
    {
      name: "Lasso",
      pen: (
        <MathRun>
          loss + λ Σ |<I>w</I>|
        </MathRun>
      ),
      tag: "L1",
      vals: REG.lasso,
      head: y(632),
      base: y(818),
      at: lassoAt,
      count: `keeps ${REG.lassoNonZero} of ${REG.features}: the informative five`,
      countAt: exactAt,
      countInk: OK_INK,
    },
  ];
  const barH = (v: number) => Math.max(3, (Math.abs(v) / MAX) * h(146));
  const slotX = (i: number) => BARS_L + i * SLOT;

  // ── Each penalty's pull on a small weight ──
  const panels = [
    { name: "L2", f: (w: number) => w * w, slope: (w: number) => 2 * w, path: l2Path, from: l2At, to: l1At - 6, left: 200 },
    { name: "L1", f: (w: number) => Math.abs(w), slope: (w: number) => (w > 1e-6 ? 1 : 0), path: l1Path, from: l1At, to: zeroAt + 4, left: 1060 },
  ];
  const PW = 640;
  const pTop = y(430);
  const pBase = y(690);
  const px = (left: number, w: number) => left + PW / 2 + (w * PW) / 2.2;
  const py = (v: number) => pBase - v * (pBase - pTop);

  const outRun = l2At - 6;
  const outWhy = prodAt - 6;
  // The prod page stays until the map's headline arrives, so the group
  // elastic net keeps is up for a moment after it is said.
  const outProd = mapAt + 10;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={bothAt} level={-32} />
      <Sfx name="el-sprinkle" at={ridgeAt} level={-36} />
      <Sfx name="el-sprinkle" at={lassoAt} level={-36} />
      <Sfx name="el-pop" at={exactAt + 4} level={-30} />
      <Sfx name="el-whoosh" at={l2At - 4} level={-37} />
      <Sfx name="el-tap" at={zeroAt + 2} level={-28} />
      <Sfx name="el-pop" at={fiveFeatAt} level={-30} />
      <Sfx name="el-tap" at={oneAt} level={-32} />
      <Sfx name="el-tap" at={groupAt} level={-32} />
      <Sfx name="el-whoosh" at={mapAt - 2} level={-37} />
      <Sfx name="el-chime" at={honestAt + 10} level={-34} />

      <Drift from={from} to={end + 40} scale={0.016}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} out={mapAt - 6} size={Q_SIZE}>
          L1 vs L2 regularization?
        </QuestionCard>
        <Say at={bothAt - 2} x={X0} y={y(262)} out={mapAt - 6}>
          <span style={line(30, INK, 400)}>
            Both add a penalty on the weights to the loss
          </span>
        </Say>

        {/* ── The two penalties, while the question is asked ── */}
        <Fade from={bothAt - 4} out={runAt - 6}>
          {[
            { tag: "L2", name: "Ridge", pen: <>loss + λ Σ <I>w</I>²</> },
            { tag: "L1", name: "Lasso", pen: <>loss + λ Σ |<I>w</I>|</> },
          ].map((r, i) => (
            <Say key={r.tag} at={bothAt + 6 + i * 8} x={X0} y={y(400) + i * h(110)}>
              <span style={{ ...line(44, INK), display: "inline-flex", alignItems: "center", gap: "0.4em" }}>
                <OutlineBadge tone="ink" size={44}>
                  {r.tag}
                </OutlineBadge>
                <span style={{ width: "4.2em" }}>{r.name}</span>
                <MathRun>{r.pen}</MathRun>
              </span>
            </Say>
          ))}
          <Say at={smallAt} x={X0} y={y(400) + 2 * h(110) + h(20)}>
            <span style={line(30, INK_SOFT, 400)}>
              What happens to a <b style={{ color: INK, fontWeight: 500 }}>small</b> weight?
            </span>
          </Say>
        </Fade>

        {/* ── The page's run: twenty coefficients under each penalty ── */}
        <Fade from={runAt - 4} out={outRun}>
          <Say at={runAt - 2} x={X0} y={y(316)}>
            <span style={line(24, INK_SOFT)}>
              The page’s run: <span style={TABULAR}>{REG.features}</span> features,{" "}
              <span style={{ opacity: ease(frame, fiveAt - 2, 10), color: BLUE_INK }}>
                <span style={TABULAR}>{REG.informative.length}</span> informative
              </span>
            </span>
          </Say>
          {strips.map((s) => (
            <React.Fragment key={s.name}>
              <Say at={s.at - 4} x={X0} y={s.head}>
                <span style={{ ...line(28, INK), display: "inline-flex", alignItems: "center", gap: "0.45em" }}>
                  {s.name}
                  <OutlineBadge tone="ink" size={28}>
                    {s.tag}
                  </OutlineBadge>
                  <span style={{ color: INK_SOFT, fontWeight: 400 }}>{s.pen}</span>
                </span>
              </Say>
              <Say at={s.countAt} x={1760} y={s.head} width={760} align="right">
                <span style={line(28, s.countInk)}>{s.count}</span>
              </Say>
              <div style={{ position: "absolute", left: BARS_L - 16, top: s.base, width: SLOT * 20 + 8, height: 2, background: INK, opacity: ease(frame, s.at - 4, 10) }} />
              {s.vals.map((v, i) => {
                const g = ease(frame, s.at + i * 1.1, 14);
                const useful = informative.has(i);
                const isZero = v === 0;
                const lit = !useful && s.name === "Ridge" ? pulse(frame, quarterAt, 26) : 0;
                if (isZero) {
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: slotX(i),
                        top: s.base - h(40),
                        width: BAR_W,
                        textAlign: "center",
                        ...label(22, INK_SOFT),
                        ...TABULAR,
                        opacity: ease(frame, exactAt + (i % 7), 10),
                      }}
                    >
                      0
                    </div>
                  );
                }
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: slotX(i),
                      top: s.base - barH(v) * g,
                      width: BAR_W,
                      height: barH(v) * g,
                      background: useful ? BAR : NOISE_C,
                      borderRadius: "4px 4px 0 0",
                      transform: `scaleX(${1 + 0.25 * lit})`,
                    }}
                  />
                );
              })}
            </React.Fragment>
          ))}
          <Say at={quarterAt - 2} x={X0} y={strips[0].base + h(14)}>
            <span style={line(24, INK_SOFT)}>
              The <span style={TABULAR}>15</span> useless: all below <span style={TABULAR}>0.25</span>
              <span style={{ opacity: ease(frame, noneAt - 2, 10) }}>, none at 0</span>
            </span>
          </Say>
        </Fade>

        {/* ── Why: each penalty's pull on a small weight ── */}
        <Fade from={l2At - 4} out={outWhy}>
          {panels.map((p, k) => {
            const t = Math.min(1, Math.max(0, (frame - p.from) / Math.max(1, p.to - p.from)));
            const w = p.path(t);
            const curve = Array.from({ length: 81 }, (_, i) => -1 + (i / 80) * 2);
            const d = curve.map((v, i) => `${i ? "L" : "M"}${px(p.left, v).toFixed(1)},${py(p.f(v)).toFixed(1)}`).join(" ");
            const dotX = px(p.left, w);
            const dotY = py(p.f(w));
            const pull = p.slope(w) * 110;
            const shown = ease(frame, p.from - 4, 12);
            return (
              <React.Fragment key={p.name}>
                {k === 1 ? <ColumnRule x={(200 + PW + 1060) / 2} top={pTop - h(70)} height={pBase - pTop + h(170)} at={l1At - 4} /> : null}
                <Say at={p.from - 4} x={p.left} y={pTop - h(70)}>
                  <span style={{ ...line(28, INK), display: "inline-flex", alignItems: "center", gap: "0.45em" }}>
                    <OutlineBadge tone="ink" size={28}>
                      {p.name}
                    </OutlineBadge>
                    penalty <M>{p.name === "L2" ? "w²" : "|w|"}</M>
                  </span>
                </Say>
                <Svg opacity={shown}>
                  <line x1={p.left} x2={p.left + PW} y1={pBase} y2={pBase} stroke={INK} strokeWidth={1.6} />
                  <line x1={px(p.left, 0)} x2={px(p.left, 0)} y1={pBase} y2={pBase + 8} stroke={INK} strokeWidth={1.4} />
                  <path d={d} fill="none" stroke={INK_SOFT} strokeWidth={3} />
                  <circle cx={dotX} cy={dotY} r={11} fill={BAR} />
                  {p.name === "L1" ? (
                    <circle cx={px(p.left, 0)} cy={pBase} r={(20 + 6 * pulse(frame, zeroAt, 20)) * ease(frame, zeroAt, 10)} fill="none" stroke={LIT_LINE} strokeWidth={3.4} />
                  ) : null}
                </Svg>
                <Say at={p.from} x={px(p.left, 0)} y={pBase + h(14)} width={60} align="center">
                  <span style={{ ...label(21, INK_SOFT), ...TABULAR }}>0</span>
                </Say>
                <Say at={p.from} x={p.left + PW} y={pBase + h(14)} width={200} align="right">
                  <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
                    weight <M>w</M>
                  </span>
                </Say>
                {pull > 26 && frame >= p.from ? (
                  <StraightArrow from={[dotX + 4, dotY - 30]} to={[dotX + 4 - pull, dotY - 30]} at={p.from - 30} color={INK} width={3} />
                ) : null}
                <Say at={p.from + 6} x={p.left} y={pBase + h(64)}>
                  <span style={line(26, INK)}>
                    {p.name === "L2" ? (
                      <>
                        Pull <MathRun>2<I>w</I></MathRun>
                        <span style={{ opacity: ease(frame, fadesAt - 2, 10) }}>: it fades as the weight shrinks</span>
                      </>
                    ) : (
                      <>
                        Pull <MathRun>1</MathRun> all the way down
                        <span style={{ opacity: ease(frame, zeroAt - 2, 10) }}>: the weight lands on 0</span>
                      </>
                    )}
                  </span>
                </Say>
              </React.Fragment>
            );
          })}
        </Fade>

        {/* ── In production ── */}
        <Fade from={prodAt - 4} out={outProd}>
          <Say at={fiveFeatAt - 2} x={X0} y={y(350)}>
            <span style={line(40, OK_INK)}>
              <span style={TABULAR}>{REG.lassoNonZero}</span> features to compute at serving time, not <span style={TABULAR}>{REG.features}</span>
            </span>
          </Say>
          <Say at={corrAt - 2} x={X0} y={y(480)}>
            <span style={line(26, INK_SOFT)}>Two correlated features</span>
          </Say>
          {[
            { name: "Lasso", at: oneAt, keep: [true, false], note: "keeps one, arbitrarily", x: X0 },
            { name: "Elastic net", at: elasticAt, keep: [true, true], note: "both penalties: keeps the group", x: 960 },
          ].map((c, k) => (
            <React.Fragment key={c.name}>
              {k === 1 ? <ColumnRule x={900} top={y(548)} height={h(200)} at={elasticAt} /> : null}
              <Say at={c.at - 2} x={c.x} y={y(560)}>
                <span style={line(30, INK)}>{c.name}</span>
              </Say>
              <Say at={(k === 1 ? elasticAt + 8 : c.at) + 4} x={c.x} y={y(560) + h(66)}>
                <div style={{ display: "flex", gap: 18, fontSize: 30, alignItems: "center" }}>
                  {c.keep.map((kept, i) => (
                    <OutlineBadge key={i} tone={kept ? "blue" : "gray"} size={30} style={{ borderStyle: kept ? "solid" : "dashed", opacity: kept ? 1 : 0.7 }}>
                      <MathRun>
                        <I>x</I>
                        <sub>{i + 1}</sub>
                      </MathRun>
                      {kept ? "" : " → 0"}
                    </OutlineBadge>
                  ))}
                </div>
              </Say>
              <Say at={(k === 1 ? elasticAt + 14 : c.at) + 8} x={c.x} y={y(560) + h(140)}>
                <span style={line(26, INK_SOFT)}>{c.note}</span>
              </Say>
            </React.Fragment>
          ))}
        </Fade>

        {/* ── The round's map: the first movement done, the second lit ── */}
        <Say at={fixAt + 4} x={92} y={y(150)}>
          <span style={{ ...headline(58), whiteSpace: "nowrap" }}>Every fix so far was judged on validation data</span>
        </Say>
        <PlanMap x={X0} top={y(336)} width={1080} groupAt={[mapAt + 18, mapAt + 21, mapAt + 24, mapAt + 27]} done={{ 0: mapAt + 30 }} lit={{ 1: honestAt }} />
      </Drift>
    </AbsoluteFill>
  );
};
