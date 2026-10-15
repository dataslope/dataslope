import React from "react";
import { AbsoluteFill } from "remotion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, HAIRLINE, headline, INK, INK_SOFT, label } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { ADF_DIFF, ADF_WALK, dec, DIFF_A, WALK_A } from "./data";
import { COLOR, PASS_INK, prose, Spot } from "./parts";

const LEFT = 120;
const COL = { name: LEFT + 230, p: 700, verdict: 960 };
const SPARK_W = 190;
const SPARK_H = 56;
/** The thumbnail of the differences shows the first flips, at a width where
 *  each one is still a separate tick. */
const SPARK_FLIPS = 64;

const Spark: React.FC<{ kind: "walk" | "flips" }> = ({ kind }) => {
  if (kind === "walk") {
    const X: XScale = { lo: 0, hi: WALK_A.length - 1, x0: 2, x1: SPARK_W - 2 };
    const lo = Math.min(...WALK_A);
    const hi = Math.max(...WALK_A);
    const yOf = (v: number) => SPARK_H - 4 - ((v - lo) / (hi - lo)) * (SPARK_H - 8);
    const d = WALK_A.map((v, i) => `${i ? "L" : "M"}${sx(X, i).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");
    return (
      <svg width={SPARK_W} height={SPARK_H} style={{ display: "block", overflow: "visible" }}>
        <path d={d} fill="none" stroke={COLOR.a} strokeWidth={2} strokeLinejoin="round" />
      </svg>
    );
  }
  const X: XScale = { lo: 0, hi: SPARK_FLIPS, x0: 2, x1: SPARK_W - 2 };
  const mid = SPARK_H / 2;
  return (
    <svg width={SPARK_W} height={SPARK_H} style={{ display: "block", overflow: "visible" }}>
      <line x1={0} x2={SPARK_W} y1={mid} y2={mid} stroke={INK} strokeWidth={1.2} />
      {DIFF_A.slice(0, SPARK_FLIPS).map((d, i) => (
        <line
          key={i}
          x1={sx(X, i + 0.5)}
          x2={sx(X, i + 0.5)}
          y1={mid}
          y2={mid - d * (mid - 4)}
          stroke={COLOR.a}
          strokeWidth={1.6}
        />
      ))}
    </svg>
  );
};

/**
 * Rule: test for stationarity before trusting a correlation. The lesson's
 * Augmented Dickey-Fuller test on walk a and on its differences.
 */
export const RuleScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();
  const start = n.beat("rule").from;
  const trustAt = n.word("rule", "before trusting");
  const walkAt = n.word("rule", "This walk");
  const failsAt = n.word("rule", "fails");
  const diffsAt = n.word("rule", "Its differences");
  const passAt = n.word("rule", "pass");

  const head = y(370);
  const row = (i: number) => y(440) + i * 104;
  const rows = [
    { at: walkAt, verdictAt: failsAt, spark: "walk" as const, name: "Walk a", p: dec(ADF_WALK), verdict: "non-stationary", ink: ACCENT_INK },
    {
      at: diffsAt,
      verdictAt: passAt,
      spark: "flips" as const,
      name: "Its differences",
      p: ADF_DIFF < 0.001 ? "below 0.001" : dec(ADF_DIFF, 3),
      verdict: "stationary",
      ink: PASS_INK,
    },
  ];

  return (
    <AbsoluteFill>
      <Ink at={start - 4} dur={14} style={{ left: LEFT, top: y(140) }}>
        <span style={label(22, ACCENT_INK)}>Before you trust a correlation</span>
      </Ink>
      <Ink at={start - 2} dur={22} style={{ left: LEFT - 6, top: y(184), width: 1180, ...headline(84), lineHeight: 1.08 }}>
        Test each series for stationarity.
      </Ink>

      <Ink at={trustAt - 4} dur={16} style={{ left: LEFT, top: head, width: 1180 }}>
        <div style={{ position: "relative", height: 34 }}>
          <span style={{ ...label(20, INK_SOFT), position: "absolute", left: 0 }}>Series</span>
          <span style={{ ...label(20, INK_SOFT), position: "absolute", left: COL.p - LEFT }}>Dickey-Fuller p-value</span>
          <span style={{ ...label(20, INK_SOFT), position: "absolute", left: COL.verdict - LEFT }}>Verdict</span>
        </div>
        <div style={{ height: 2, background: INK }} />
      </Ink>

      {rows.map((r, i) => (
        <React.Fragment key={r.name}>
          <Ink at={r.at - 4} dur={16} style={{ left: LEFT, top: row(i), width: 1180 }}>
            <div style={{ position: "relative", height: 76 }}>
              <div style={{ position: "absolute", left: 0, top: 6 }}>
                <Spark kind={r.spark} />
              </div>
              <span style={{ ...body(36), color: INK, position: "absolute", left: COL.name - LEFT, top: 12, whiteSpace: "nowrap" }}>
                {r.name}
              </span>
              <span style={{ ...headline(48), position: "absolute", left: COL.p - LEFT, top: 10, whiteSpace: "nowrap" }}>{r.p}</span>
            </div>
            <div style={{ height: 1, background: HAIRLINE, marginTop: 14 }} />
          </Ink>
          <Note at={r.verdictAt} x={COL.verdict} y={row(i) + 20}>
            <span style={{ ...headline(44, true), color: r.ink, whiteSpace: "nowrap" }}>{r.verdict}</span>
          </Note>
        </React.Fragment>
      ))}

      <Note at={passAt + 10} x={LEFT} y={row(2) + 20} width={1100}>
        <span style={prose(21)}>
          The lesson’s rule: a p-value under 0.05 rejects the unit root, so the series counts as stationary.
        </span>
      </Note>

      <Spot id="random-walks-balloons" at={start + 6} box={{ left: 1420, top: y(300), width: 390, height: y(700) - y(300) }} />
    </AbsoluteFill>
  );
};
