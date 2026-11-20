import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { M } from "../../editorial/math";
import { ACCENT, ACCENT_INK, BAR, HAIRLINE, headline, INK, INK_SOFT, label, TABULAR } from "../../editorial/style";
import { ColumnRule, OutlineBadge } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CV } from "./data";
import { Drift, Fade, line, LIT_INK, LIT_LINE, mulberry32, OK, OK_INK, pct, PlanMap, Q_SIZE, Say, StraightArrow, Svg, X0 } from "./parts";

const FOLD_W = 130;
const FOLD_GAP = 12;
const K = 5;

/** Which of each user's eight rows a shuffled five-fold split holds out: a
 *  fifth of all the rows, scattered. Seeded, the same on every frame. */
const SHUFFLED = (() => {
  const r = mulberry32(4242);
  return Array.from({ length: CV.users }, () => Array.from({ length: CV.rowsPerUser }, () => r() < 0.2));
})();
/** Grouped: a fifth of the users held out whole. */
const GROUPED = Array.from({ length: CV.users }, (_, u) => u % K === 2);

/**
 * Question 7. Five folds, rotated: each round's held-out fold lit, its score
 * arriving as the page reads them, then the mean the page prints. When to
 * use it, and when one hold-out wins. Then what a fold must not split: sixty
 * simulated users whose label is their own, shuffled folds scattering each
 * user across both sides (97%) against folds grouped by user (50%), and time
 * series validated only forward. Then the map, the third movement lit.
 */
export const CvScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cv").from;
  const qAt = n.word("cv", "Question seven");
  const textAt = n.word("cv", "What is k-fold");
  const splitAt = n.word("cv", "Split the data into k folds");
  const trainAt = n.word("cv", "train on all but one");
  const rotateAt = n.word("cv", "rotate until");
  const onceAt = n.word("cv", "held out once");
  const scoreAt = n.word("cv-run", "The page's five folds");
  const fromAt = n.word("cv-run", "from seventy-five");
  const toAt = n.word("cv-run", "to eighty-seven and a half");
  const anyAt = n.word("cv-run", "any one could have been");
  const meanAt = n.word("cv-run", "Their mean");
  const steadyAt = n.word("cv-run", "is steadier");
  const scarceAt = n.word("cv-when", "too scarce");
  const compareAt = n.word("cv-when", "compare models reliably");
  const daysAt = n.word("cv-when", "takes days");
  const holdAt = n.word("cv-when", "one hold-out wins");
  const groupsAt = n.word("cv-groups", "The follow-up");
  const simAt = n.word("cv-groups", "Simulate sixty users");
  const shuffledAt = n.word("cv-groups", "Shuffled folds");
  const bothAt = n.word("cv-groups", "on both sides");
  const ninetyAt = n.word("cv-groups", "ninety-seven percent");
  const groupedAt = n.word("cv-groups", "Grouped by user");
  const fiftyAt = n.word("cv-groups", "it scores fifty");
  const keepAt = n.word("cv-keep", "keep each user");
  const forwardAt = n.word("cv-keep", "validate only forward");
  const timeAt = n.word("cv-keep", "with time series");
  const honestAt = n.word("score-in", "Honest scores");
  const whichAt = n.word("score-in", "which score");
  const mapAt = n.beat("score-in").from;
  const end = n.beat("score-in").to;

  const gridTop = y(336);
  const rowP = h(72);
  const boxH = h(52);
  const roundAt = (r: number) => (r === 0 ? splitAt : rotateAt + (r - 1) * ((onceAt - rotateAt) / 3));
  const scoreTimes = CV.folds.map((_, i) => fromAt + i * ((toAt + 16 - fromAt) / 4));
  const lo = Math.min(...CV.folds);
  const hi = Math.max(...CV.folds);
  const foldsOut = groupsAt - 6;
  const SCORE_X = X0 + K * (FOLD_W + FOLD_GAP) + 30;

  // ── Users ──
  const UX = 200;
  const UP = 24;
  const dotP = h(17);
  const panels = [
    { name: "Shuffled folds", held: (u: number, r: number) => SHUFFLED[u][r], top: y(400), at: shuffledAt, score: CV.shuffled, scoreAt: ninetyAt, ink: ACCENT_INK, mark: ACCENT, markAt: bothAt },
    { name: "Grouped by user", held: (u: number) => GROUPED[u], top: y(650), at: groupedAt, score: CV.grouped, scoreAt: fiftyAt, ink: OK_INK, mark: OK, markAt: groupedAt + 8 },
  ];
  const usersOut = keepAt - 6;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={splitAt} level={-32} />
      <Sfx name="el-sprinkle" at={rotateAt} level={-36} />
      {scoreTimes.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-34} />
      ))}
      <Sfx name="el-pop" at={meanAt + 4} level={-30} />
      <Sfx name="el-tap" at={scarceAt} level={-34} />
      <Sfx name="el-tap" at={holdAt} level={-34} />
      <Sfx name="el-whoosh" at={groupsAt - 2} level={-37} />
      <Sfx name="el-sprinkle" at={simAt} level={-36} />
      <Sfx name="el-tap" at={ninetyAt} level={-30} />
      <Sfx name="el-tap" at={fiftyAt} level={-30} />
      <Sfx name="el-pencil" at={timeAt} level={-35} />
      <Sfx name="el-whoosh" at={mapAt - 2} level={-37} />
      <Sfx name="el-chime" at={whichAt + 8} level={-34} />

      <Drift from={from} to={end + 40} scale={0.016}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} out={mapAt - 6} size={Q_SIZE}>
          <>
            What is <M>k</M>-fold cross-validation and when do you use it?
          </>
        </QuestionCard>

        {/* ── Five folds, rotated, each round's score ── */}
        <Fade from={splitAt - 4} out={foldsOut}>
          <Say at={splitAt - 2} x={X0} y={gridTop - h(56)}>
            <span style={line(24, INK_SOFT)}>
              <M>k</M> = 5 folds, one held out each round
            </span>
          </Say>
          {Array.from({ length: K }, (_, r) => {
            const rAt = roundAt(r);
            const marked = ease(frame, r === 0 ? trainAt : rAt, 10);
            const rowTop = gridTop + r * rowP;
            return (
              <React.Fragment key={r}>
                {Array.from({ length: K }, (_, f) => {
                  const p = ease(frame, rAt + f * 1.5, 10);
                  if (p <= 0) return null;
                  const held = f === r;
                  const lit = held ? marked : 0;
                  const color = lit > 0.5 ? LIT_LINE : INK;
                  return (
                    <div
                      key={f}
                      style={{
                        position: "absolute",
                        left: X0 + f * (FOLD_W + FOLD_GAP),
                        top: rowTop,
                        width: FOLD_W,
                        height: boxH,
                        boxSizing: "border-box",
                        border: `2px solid ${color}`,
                        borderRadius: 8,
                        background: lit > 0 ? `color-mix(in srgb, ${ds("yellow", 300)} ${45 * lit}%, transparent)` : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: p,
                        ...label(22, held && lit > 0.5 ? LIT_INK : INK_SOFT),
                      }}
                    >
                      {held && lit > 0.5 ? "validate" : marked > 0.5 || r > 0 ? "train" : `fold ${f + 1}`}
                    </div>
                  );
                })}
                <Say at={scoreTimes[r]} x={SCORE_X} y={rowTop + boxH / 2 - 19}>
                  <span
                    style={{
                      ...line(30, CV.folds[r] === lo || CV.folds[r] === hi ? INK : INK_SOFT),
                      ...TABULAR,
                      fontWeight: CV.folds[r] === lo || CV.folds[r] === hi ? 600 : 500,
                    }}
                  >
                    {pct(CV.folds[r], 1)}
                  </span>
                </Say>
              </React.Fragment>
            );
          })}
          <Say at={scoreAt} x={SCORE_X} y={gridTop - h(56)}>
            <span style={line(24, INK_SOFT)}>the page’s scores</span>
          </Say>
          <Say at={anyAt - 2} x={X0} y={gridTop + K * rowP + h(10)}>
            <span style={line(26, INK_SOFT)}>Any one could have been your only validation set</span>
          </Say>
          <Say at={meanAt - 2} x={X0} y={gridTop + K * rowP + h(60)}>
            <span style={line(32, INK)}>
              Mean <span style={TABULAR}>{pct(CV.mean, 1)}</span> ± <span style={TABULAR}>{(CV.std * 100).toFixed(1)}</span>
              <span style={{ opacity: ease(frame, steadyAt - 2, 10), color: OK_INK }}>: steadier than any one fold</span>
            </span>
          </Say>
          <Say at={meanAt + 10} x={X0} y={gridTop + K * rowP + h(118)}>
            <div style={{ background: ds("gray", 50), borderLeft: `4px solid ${HAIRLINE}`, padding: "10px 18px", fontFamily: MONO, fontSize: 24, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>
              {CV.printed}
            </div>
          </Say>

          {/* The procedure, beside the folds, until when to use it */}
          <ColumnRule x={1120} top={gridTop - h(56)} height={h(420)} at={splitAt + 4} />
          {[
            { at: splitAt, text: <>Split the data into <M>k</M> folds</> },
            { at: trainAt, text: <>Train on all but one, validate on it</> },
            { at: rotateAt, text: <>Rotate until each is held out once</> },
          ].map((r, i) => (
            <Say key={i} at={r.at - 2} x={1180} y={gridTop + i * h(80)} out={scarceAt - 8}>
              <span style={{ ...line(28, INK, 400), display: "inline-flex", alignItems: "center", gap: "0.5em" }}>
                <OutlineBadge tone="ink" size={28}>
                  {i + 1}
                </OutlineBadge>
                {r.text}
              </span>
            </Say>
          ))}

          {/* When to use it, beside the folds */}
          <Say at={scarceAt - 6} x={1180} y={gridTop - h(56)}>
            <span style={line(24, INK_SOFT)}>When to use it</span>
          </Say>
          {[
            { at: scarceAt, text: "Data too scarce to set a validation set aside" },
            { at: compareAt, text: "Comparing models reliably" },
          ].map((r, i) => (
            <Say key={r.text} at={r.at - 2} x={1180} y={gridTop + i * h(62)}>
              <span style={line(26, OK_INK)}>{r.text}</span>
            </Say>
          ))}
          <Say at={daysAt - 2} x={1180} y={gridTop + 2 * h(62) + h(40)}>
            <span style={line(24, INK_SOFT)}>When a training run takes days</span>
          </Say>
          <Say at={daysAt + 8} x={1180} y={gridTop + 2 * h(62) + h(84)}>
            <span style={line(26, INK)}>
              <M>k</M> folds cost <M>k</M> runs
              <span style={{ opacity: ease(frame, holdAt - 2, 10), color: OK_INK }}>: one hold-out wins</span>
            </span>
          </Say>
        </Fade>

        {/* ── What a fold must not split: users ── */}
        <Fade from={groupsAt - 4} out={usersOut}>
          <Say at={simAt - 2} x={X0} y={y(296)}>
            <span style={line(26, INK)}>
              <span style={TABULAR}>{CV.users}</span> simulated users, <span style={TABULAR}>{CV.rowsPerUser}</span> rows each; the label is the user’s own
            </span>
          </Say>
          <Svg>
            {panels.map((pnl, k) =>
              Array.from({ length: CV.users }, (_, u) => {
                const shown = ease(frame, (k === 0 ? simAt : pnl.at - 6) + u * 0.25, 8);
                if (shown <= 0) return null;
                const x = UX + u * UP;
                const both = SHUFFLED[u].some(Boolean) && SHUFFLED[u].some((v) => !v);
                const markable = k === 0 ? both : true;
                const m = ease(frame, pnl.markAt + u * 0.3, 10);
                return (
                  <g key={`${k}-${u}`} opacity={shown}>
                    {Array.from({ length: CV.rowsPerUser }, (_, r) => {
                      const held = ease(frame, pnl.at, 12) > 0.5 && pnl.held(u, r);
                      const cy = pnl.top + r * dotP + 8;
                      return held ? (
                        <circle key={r} cx={x} cy={cy} r={5.4} fill="none" stroke={BAR} strokeWidth={2.2} />
                      ) : (
                        <circle key={r} cx={x} cy={cy} r={6} fill={BAR} />
                      );
                    })}
                    {markable && m > 0 ? (
                      <rect x={x - 8} y={pnl.top + CV.rowsPerUser * dotP + 4} width={16} height={5} rx={2} fill={k === 0 ? ACCENT : OK} opacity={m} />
                    ) : null}
                  </g>
                );
              }),
            )}
          </Svg>
          {panels.map((pnl, k) => (
            <React.Fragment key={pnl.name}>
              <Say at={pnl.at - 4} x={UX - 10} y={pnl.top - h(52)}>
                <span style={line(26, INK)}>
                  {pnl.name}
                  <span style={{ ...line(24, INK_SOFT), opacity: ease(frame, pnl.markAt, 10) }}>
                    {k === 0 ? ": every user on both sides" : ": each user on one side"}
                  </span>
                </span>
              </Say>
              <Say at={pnl.scoreAt - 2} x={UX + CV.users * UP + 26} y={pnl.top + h(40)}>
                <span style={{ ...headline(64), color: pnl.ink, ...TABULAR, whiteSpace: "nowrap" }}>{pct(pnl.score)}</span>
              </Say>
            </React.Fragment>
          ))}
          <Say at={shuffledAt + 6} x={UX - 10} y={y(870)}>
            <div style={{ display: "flex", gap: 30, alignItems: "center", ...label(22, INK_SOFT) }}>
              <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                <svg width={14} height={14}>
                  <circle cx={7} cy={7} r={6} fill={BAR} />
                </svg>
                training row
              </span>
              <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                <svg width={14} height={14}>
                  <circle cx={7} cy={7} r={5.4} fill="none" stroke={BAR} strokeWidth={2.2} />
                </svg>
                validation row
              </span>
            </div>
          </Say>
        </Fade>

        {/* ── One fold each; and time only forward ── */}
        <Fade from={keepAt - 4} out={mapAt - 6}>
          <Say at={keepAt - 2} x={X0} y={y(300)}>
            <span style={line(34, OK_INK)}>User, session, patient: each inside one fold</span>
          </Say>
          <Say at={timeAt - 2} x={X0} y={y(410)}>
            <span style={line(26, INK)}>
              Time series: validate only forward
            </span>
          </Say>
          {Array.from({ length: 4 }, (_, r) => {
            const top = y(480) + r * h(74);
            const unit = 300;
            const trainW = unit * (r + 1);
            const p = ease(frame, timeAt + 6 + r * 6, 14);
            return (
              <React.Fragment key={r}>
                <div style={{ position: "absolute", left: X0, top, width: trainW * p, height: h(48), background: ds("blue", 500), borderRadius: 4 }} />
                <div
                  style={{
                    position: "absolute",
                    left: X0 + trainW + 8,
                    top,
                    width: (unit - 8) * ease(frame, timeAt + 14 + r * 6, 12),
                    height: h(48),
                    background: `color-mix(in srgb, ${ds("yellow", 300)} 75%, transparent)`,
                    borderRadius: 4,
                  }}
                />
              </React.Fragment>
            );
          })}
          <StraightArrow from={[X0, y(480) + 4 * h(74) + h(10)]} to={[X0 + 1540, y(480) + 4 * h(74) + h(10)]} at={timeAt} color={INK} width={2.4} />
          <Say at={timeAt + 6} x={X0 + 1560} y={y(480) + 4 * h(74) - h(6)}>
            <span style={line(22, INK_SOFT)}>time</span>
          </Say>
          <Say at={forwardAt - 4} x={X0} y={y(480) + 4 * h(74) + h(30)}>
            <div style={{ display: "flex", gap: 30, alignItems: "center", ...label(22, INK_SOFT) }}>
              <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 26, height: 14, background: ds("blue", 500), borderRadius: 3, display: "inline-block" }} />
                train on the past
              </span>
              <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 26, height: 14, background: ds("yellow", 300), borderRadius: 3, display: "inline-block" }} />
                validate on what came after
              </span>
            </div>
          </Say>
        </Fade>

        {/* ── The round's map: the third movement lit ── */}
        <Say at={honestAt - 2} x={92} y={y(150)}>
          <span style={{ ...headline(58), whiteSpace: "nowrap" }}>Honest scores, then. Next, which score.</span>
        </Say>
        <PlanMap x={X0} top={y(300)} width={1080} groupAt={[mapAt, mapAt + 3, mapAt + 6, mapAt + 9]} done={{ 0: mapAt, 1: honestAt + 6 }} lit={{ 2: whichAt }} />
      </Drift>
    </AbsoluteFill>
  );
};
