import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  BLUE_INK,
  HAIRLINE,
  HIGHLIGHT,
  INK,
  INK_SOFT,
  PAPER,
  TABULAR,
  fmt,
  label,
  note,
} from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SHAP } from "./data";
import {
  at,
  C0,
  Drift,
  Mark,
  OK,
  OK_INK,
  type Scale,
  Svg,
  WARM,
  WARM_INK,
  X0,
} from "./parts";

const TABLE_TOP = 330;
const COLS = [
  { name: "plan", w: 130 },
  { name: "region", w: 120 },
  { name: "tenure", w: 130 },
  { name: "customer ID", w: 190 },
  { name: "churned", w: 130 },
];
const ROW = 36;
const BARS_TOP = 640;
const BAR_ROW = 58;
const BAR_X = X0 + 190;
const BAR_W = 520;
const WF_X = 1060;
const WF_W = 720;
const WF_TOP = 360;
const WF_ROW = 66;

const PLAN = ["annual", "monthly"];
const REGION = ["A", "B", "C"];
const cellText = (row: number[], j: number) =>
  j === 0
    ? PLAN[row[0]]
    : j === 1
      ? REGION[row[1]]
      : j === 2
        ? `${Math.round(row[2])} mo`
        : j === 3
          ? String(row[3])
          : row[4]
            ? "yes"
            : "no";

const share = (v: readonly number[]) => {
  const t = v.reduce((a, b) => a + b, 0);
  return v.map((x) => x / t);
};

/**
 * Question 11, on the video's own made-up churn table, whose customer ID
 * carries nothing. The forest's impurity importance hands the ID 40%; one
 * customer's prediction split exactly among the four features as a
 * waterfall from the average; and the same Shapley values, averaged over
 * customers, set beside the impurity bars with the ID last.
 */
export const ShapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("shap").from;
  const qAt = n.word("shap", "Question eleven");
  const textAt = n.word("shap", "What's the difference between a forest's");
  const asked = n.word("shap", "The built-in one adds up");
  const distinctAt = n.word("shap", "many distinct values");
  const madeAt = n.word("shap-id", "a made-up churn table");
  const nothingAt = n.word("shap-id", "means nothing at all");
  const impAt = n.word("shap-id", "Impurity importance gives");
  const fortyAt = n.word("shap-id", "forty percent");
  const fourAt = n.word("shap-id", "four times the plan");
  const driveAt = n.word("shap-id", "really does drive churn");
  const splitsAt = n.word("shap-values", "SHAP splits each prediction");
  const avgAt = n.word("shap-values", "starts from the average");
  const planAt = n.word("shap-values", "The monthly plan adds");
  const tenureAt = n.word("shap-values", "fifty-six months of tenure");
  const otherAt = n.word("shap-values", "the other two");
  const finalAt = n.word("shap-values", "point four seven five");
  const rankAt = n.word("shap-values", "Averaged over customers");
  const firstAt = n.word("shap-values", "the plan first");
  const lastAt = n.word("shap-values", "the ID last");
  const end = n.beat("shap-values").to;

  // ── The table ──
  const tableOn = ease(frame, asked - 2, 12);
  const colX = COLS.reduce<number[]>(
    (xs, c, i) => [...xs, i ? xs[i - 1] + COLS[i - 1].w : X0],
    [],
  );
  const idLit = ease(frame, nothingAt, 12);

  // ── The bars: each feature's share of the total, both ways ──
  const imp = share(SHAP.impurity);
  const sh = share(SHAP.meanAbs);
  const barScale = (v: number) => (v / 0.5) * BAR_W;

  // ── The waterfall ──
  const { base, row } = SHAP;
  const steps = [
    { name: "monthly plan", v: row.phi[0], at: planAt },
    {
      name: `${Math.round(row.values[2])} months of tenure`,
      v: row.phi[2],
      at: tenureAt,
    },
    { name: `region ${REGION[row.values[1]]}`, v: row.phi[1], at: otherAt },
    { name: "customer ID", v: row.phi[3], at: otherAt + 8 },
  ];
  const wx: Scale = { lo: 0, hi: 0.8, a: WF_X + 260, b: WF_X + WF_W };
  let run = base;
  const segs = steps.map((s) => {
    const a = run;
    run += s.v;
    return { ...s, a, b: run };
  });

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={asked} level={-36} />
      <Sfx name="el-scratch" at={nothingAt + 2} level={-33} />
      <Sfx name="el-pop" at={fortyAt} level={-33} />
      {segs.map((s, i) => (
        <Sfx key={i} name="el-tap" at={s.at + 2} level={-35} />
      ))}
      <Sfx name="el-chime" at={firstAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} size={58}>
          What&apos;s the difference between a forest&apos;s built-in feature
          importance and SHAP values?
        </QuestionCard>

        {/* ── The made-up table ── */}
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(TABLE_TOP),
            opacity: tableOn,
          }}
        >
          {[null, ...SHAP.head, "distinct"].map((r, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 0,
                top: i * h(ROW),
                display: "flex",
                width: 700,
                borderBottom:
                  i === 0 || i === 4 ? `1.5px solid ${HAIRLINE}` : undefined,
              }}
            >
              {COLS.map((c, j) => {
                const isId = j === 3;
                const many = r === "distinct" && (j === 2 || j === 3);
                return (
                  <div
                    key={c.name}
                    style={{
                      width: c.w,
                      height: h(ROW),
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 10,
                      boxSizing: "border-box",
                      background:
                        isId && i > 0 && i < 5
                          ? `color-mix(in srgb, ${ACCENT} ${14 * idLit}%, transparent)`
                          : undefined,
                      ...(r === null
                        ? { ...label(19, INK), fontWeight: 700 }
                        : r === "distinct"
                          ? { ...label(19, INK_SOFT), ...TABULAR }
                          : { ...note(21, INK), ...TABULAR }),
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r === null ? (
                      c.name
                    ) : r === "distinct" ? (
                      j < 4 ? (
                        many ? (
                          <Mark at={distinctAt + (j - 2) * 4}>
                            {SHAP.distinct[j].toLocaleString("en-US")}
                          </Mark>
                        ) : (
                          SHAP.distinct[j]
                        )
                      ) : null
                    ) : (
                      cellText(r as number[], j)
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <Note at={asked + 6} x={X0 + 580} y={y(TABLE_TOP) + 5 * h(ROW) + h(8)}>
          <span style={{ ...label(18, INK_SOFT), whiteSpace: "nowrap" }}>
            distinct values
          </span>
        </Note>
        <Note at={madeAt} x={X0} y={y(TABLE_TOP) + 6 * h(ROW) + h(6)}>
          <span
            style={{ ...label(19, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}
          >
            made up for this video: {SHAP.n.toLocaleString("en-US")} customers
          </span>
        </Note>
        <Note
          at={nothingAt + 4}
          x={colX[3] + 10}
          y={y(TABLE_TOP) - h(40)}
          from="up"
        >
          <span
            style={{
              ...label(20, ACCENT_INK),
              fontWeight: 650,
              whiteSpace: "nowrap",
            }}
          >
            means nothing
          </span>
        </Note>

        {/* ── Both importances, as each feature's share of the total ── */}
        <Note at={impAt} x={X0} y={y(BARS_TOP) - h(46)}>
          <span
            style={{ ...label(21, INK), fontWeight: 650, whiteSpace: "nowrap" }}
          >
            share of importance:{" "}
            <span style={{ color: BLUE_INK }}>the forest&apos;s impurity</span>
            <span style={{ color: OK_INK, opacity: ease(frame, rankAt, 10) }}>
              {" "}
              · SHAP
            </span>
          </span>
        </Note>
        {SHAP.names.map((name, i) => {
          const top = y(BARS_TOP) + i * h(BAR_ROW);
          const p = ease(frame, impAt + i * 3, 16);
          const q = ease(frame, rankAt + 4 + i * 3, 16);
          const isId = i === 3;
          return (
            <React.Fragment key={name}>
              <div
                style={{
                  position: "absolute",
                  left: X0,
                  top: top + h(6),
                  opacity: p,
                  ...note(22, isId ? ACCENT_INK : INK),
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: BAR_X,
                  top,
                  width: barScale(imp[i]) * p,
                  height: h(22),
                  background: isId ? ACCENT : C0,
                  opacity: 0.85,
                  borderRadius: 2,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: BAR_X + barScale(imp[i]) * p + 10,
                  top: top - h(3),
                  opacity: p,
                  ...label(19, isId ? ACCENT_INK : BLUE_INK),
                  fontWeight: 700,
                  ...TABULAR,
                }}
              >
                {Math.round(imp[i] * 100)}%
              </div>
              <div
                style={{
                  position: "absolute",
                  left: BAR_X,
                  top: top + h(26),
                  width: barScale(sh[i]) * q,
                  height: h(22),
                  background: OK,
                  opacity: 0.85,
                  borderRadius: 2,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: BAR_X + barScale(sh[i]) * q + 10,
                  top: top + h(23),
                  opacity: q,
                  ...label(19, OK_INK),
                  fontWeight: 700,
                  ...TABULAR,
                }}
              >
                {Math.round(sh[i] * 100)}%
              </div>
            </React.Fragment>
          );
        })}
        <Svg
          opacity={ease(frame, fourAt, 10) * (1 - ease(frame, splitsAt, 12))}
        >
          <rect
            x={X0 - 10}
            y={y(BARS_TOP) - h(6)}
            width={BAR_X - X0 + barScale(imp[0]) + 70}
            height={h(BAR_ROW) - h(4)}
            rx={8}
            fill="none"
            stroke={HIGHLIGHT}
            strokeWidth={5}
          />
        </Svg>
        <Note at={driveAt} x={BAR_X + barScale(imp[0]) + 70} y={y(BARS_TOP)}>
          <span style={{ ...label(19, INK_SOFT), whiteSpace: "nowrap" }}>
            which really drives churn
          </span>
        </Note>

        {/* ── One customer's prediction, split ── */}
        <Note at={splitsAt} x={WF_X} y={y(WF_TOP) - h(50)}>
          <span
            style={{ ...label(21, INK), fontWeight: 650, whiteSpace: "nowrap" }}
          >
            one customer: the chance of churning, feature by feature
          </span>
        </Note>
        <Svg opacity={ease(frame, splitsAt, 12)}>
          {[0, 0.2, 0.4, 0.6, 0.8].map((v) => (
            <g key={v}>
              <line
                x1={at(wx, v)}
                x2={at(wx, v)}
                y1={y(WF_TOP)}
                y2={y(WF_TOP) + 6 * h(WF_ROW)}
                stroke={INK_SOFT}
                strokeWidth={1}
                strokeDasharray="2 6"
                opacity={0.6}
              />
              <text
                x={at(wx, v)}
                y={y(WF_TOP) + 6 * h(WF_ROW) + 24}
                textAnchor="middle"
                style={{ ...label(18, INK_SOFT), ...TABULAR }}
              >
                {fmt(v, 1)}
              </text>
            </g>
          ))}
        </Svg>
        {[
          {
            name: "average customer",
            a: 0,
            b: base,
            at: avgAt,
            color: INK_SOFT,
            text: fmt(base, 2),
          },
          ...segs.map((s) => ({
            name: s.name,
            a: s.a,
            b: s.b,
            at: s.at,
            color: s.v >= 0 ? C0 : WARM,
            text: `${s.v >= 0 ? "+" : "−"}${fmt(Math.abs(s.v), 3)}`,
          })),
          {
            name: "this customer",
            a: 0,
            b: row.prediction,
            at: finalAt,
            color: INK,
            text: fmt(row.prediction, 3),
          },
        ].map((r, i) => {
          const p = ease(frame, r.at, 14);
          const top = y(WF_TOP) + i * h(WF_ROW);
          const lo = Math.min(r.a, r.b);
          const hi = Math.max(r.a, r.b);
          const grow = r.b >= r.a ? 0 : 1;
          const width = (at(wx, hi) - at(wx, lo)) * p;
          return (
            <React.Fragment key={r.name}>
              <div
                style={{
                  position: "absolute",
                  left: WF_X,
                  top: top + h(14),
                  opacity: p,
                  ...note(22, INK),
                  fontWeight: i === 0 || i === 5 ? 650 : 500,
                  whiteSpace: "nowrap",
                }}
              >
                {r.name}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: grow ? at(wx, hi) - width : at(wx, lo),
                  top: top + h(12),
                  width,
                  height: h(36),
                  background: r.color,
                  opacity: i === 0 || i === 5 ? 0.45 : 0.85,
                  borderRadius: 2,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: at(wx, hi) + 10,
                  top: top + h(16),
                  opacity: p,
                  ...label(
                    20,
                    r.color === WARM
                      ? WARM_INK
                      : r.color === C0
                        ? BLUE_INK
                        : INK,
                  ),
                  fontWeight: 700,
                  ...TABULAR,
                  whiteSpace: "nowrap",
                }}
              >
                {r.text}
              </div>
            </React.Fragment>
          );
        })}
        <Note at={finalAt + 8} x={WF_X} y={y(WF_TOP) + 6 * h(WF_ROW) + h(46)}>
          <span
            style={{
              ...label(18, INK_SOFT),
              whiteSpace: "nowrap",
              background: PAPER,
            }}
          >
            exact Shapley values: every subset of the 4 features, computed in
            NumPy
          </span>
        </Note>
        <Note
          at={lastAt}
          x={BAR_X + barScale(sh[3]) + 120}
          y={y(BARS_TOP) + 3 * h(BAR_ROW) + h(24)}
        >
          <span
            style={{
              ...label(19, OK_INK),
              fontWeight: 650,
              whiteSpace: "nowrap",
            }}
          >
            ← last, by SHAP
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
