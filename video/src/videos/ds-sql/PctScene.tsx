import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PCT } from "./data";
import { colsOf, DataTable, Drift, geoOf, Listing, listingHeight, MARK_OK, OK, OK_INK, rowsAt, X0 } from "./parts";

/** A log axis from 60 ms to 3 s: the fast body spread out, the tail kept. */
const LO = 60;
const HI = 3000;
const AX_X0 = 150;
const AX_X1 = 1700;
const STRIP_Y = 440;
const SQL_TOP = 590;
const SIZE = 19;
const RES_X = 1080;

const px = (ms: number) => AX_X0 + ((Math.log(ms) - Math.log(LO)) / (Math.log(HI) - Math.log(LO))) * (AX_X1 - AX_X0);

/** A labelled marker standing on the strip. */
const Marker: React.FC<{ at: number; out?: number; ms: number; y: number; color: string; children: React.ReactNode; above?: boolean }> = ({
  at,
  out,
  ms,
  y,
  color,
  children,
  above = true,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const x = px(ms);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: p * (1 - o) }}>
      <div style={{ position: "absolute", left: x - 1.5, top: y - 46 * p, width: 3, height: 92 * p, background: color, borderRadius: 2 }} />
      <div
        style={{
          position: "absolute",
          left: x + 10,
          top: above ? y - 74 : y + 30,
          ...note(24, color),
          fontWeight: 650,
          whiteSpace: "nowrap",
          ...TABULAR,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * Question 6, on the video's own twelve request times: a strip of them on a
 * log axis, the mean standing past ten of them; the median two ways
 * (PERCENTILE_CONT's 165 between two dots, PERCENTILE_DISC's 150 on one);
 * then the p90 the same two ways, out where the tail is.
 */
export const PctScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("pct").from;
  const qAt = n.word("pct", "Question");
  const textAt = n.word("pct", "How do you compute a median");
  const twelveAt = n.word("pct", "Here are twelve request times");
  const meanAt = n.word("pct", "Their average is");
  const slowerAt = n.word("pct", "slower than ten of the twelve");
  const contAt = n.word("pct-median", "Percentile cont interpolates");
  const medAt = n.word("pct-median", "the median is one sixty-five");
  const halfwayAt = n.word("pct-median", "halfway between");
  const discAt = n.word("pct-median", "Percentile disc returns");
  const fiftyAt = n.word("pct-median", "one fifty");
  const whyAt = n.word("pct-tail", "That's why latency");
  const p90At = n.word("pct-tail", "The ninetieth percentile is");
  const nineAt = n.word("pct-tail", "nine requests in ten");
  const tailAt = n.word("pct-tail", "the slow tail stays in view");
  const end = n.beat("pct-tail").to;

  const sy = y(STRIP_Y);
  const M = PCT.median;
  const P = PCT.p90;
  const cont = Number(M.rows[0][0]);
  const disc = Number(M.rows[0][1]);
  const p90 = Number(P.rows[0][0]);
  const p90d = Number(P.rows[0][1]);
  const resTop = y(SQL_TOP);
  const mg = geoOf(M, RES_X, resTop, h, { rowH: 46 });
  const pg = geoOf(P, RES_X, resTop, h, { rowH: 46 });
  const sorted = PCT.values;
  const faster = sorted.flatMap((v, i) => (v < PCT.mean ? [i] : []));
  // The two values the median falls between (the sixth and seventh).
  const mid = [sorted.length / 2 - 1, sorted.length / 2];

  return (
    <AbsoluteFill>
      {sorted.map((_, i) => (
        <Sfx key={i} name="el-tap" at={twelveAt + 6 + i * 2} level={-38} />
      ))}
      <Sfx name="el-scratch" at={meanAt + 6} level={-32} />
      <Sfx name="el-pop" at={medAt + 2} level={-32} />
      <Sfx name="el-pop" at={p90At + 6} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you compute a median or a percentile in SQL?
        </QuestionCard>

        {/* ── The twelve times ── */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, twelveAt - 2, 12) }}>
          <line x1={AX_X0 - 10} x2={AX_X1 + 10} y1={sy + 22} y2={sy + 22} stroke={INK} strokeWidth={1.5} />
          {[100, 300, 1000, 3000].map((t) => (
            <g key={t}>
              <line x1={px(t)} x2={px(t)} y1={sy + 22} y2={sy + 30} stroke={INK_SOFT} strokeWidth={1.4} />
              <text x={px(t)} y={sy + 54} textAnchor="middle" style={{ ...label(18, INK_SOFT), ...TABULAR }}>
                {t >= 1000 ? `${t / 1000} s` : `${t} ms`}
              </text>
            </g>
          ))}
          {sorted.map((v, i) => {
            const p = ease(frame, twelveAt + 6 + i * 2, 10);
            const fast = faster.includes(i) ? ease(frame, slowerAt + 4 + i, 10) : 0;
            const between = mid.includes(i) ? ease(frame, halfwayAt, 10) : 0;
            const isDisc = (v === disc ? ease(frame, fiftyAt - 2, 10) : 0) + (v === p90d ? ease(frame, p90At + 14, 10) : 0);
            return (
              <g key={i} opacity={p}>
                <circle cx={px(v)} cy={sy} r={10 * p} fill={fast > 0.5 ? OK : BAR} />
                {between > 0 && <circle cx={px(v)} cy={sy} r={16} fill="none" stroke={INK} strokeWidth={2} opacity={between} />}
                {isDisc > 0 && <circle cx={px(v)} cy={sy} r={17} fill="none" stroke={OK} strokeWidth={3} opacity={Math.min(1, isDisc)} />}
              </g>
            );
          })}
        </svg>
        <div style={{ position: "absolute", left: AX_X0 - 10, top: sy + h(70), ...label(19, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, twelveAt + 4, 12) }}>
          12 request times, made up for this video (log scale)
        </div>
        <Marker at={meanAt + 2} out={whyAt} ms={PCT.mean} y={sy} color={ACCENT_INK}>
          mean {PCT.mean}
        </Marker>
        <div
          style={{
            position: "absolute",
            left: px(sorted[faster[0]]) - 10,
            top: sy - h(70),
            ...note(22, OK_INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, slowerAt + 6, 12) * (1 - ease(frame, contAt, 10)),
          }}
        >
          {faster.length} of {sorted.length} are faster
        </div>
        <Marker at={medAt} ms={cont} y={sy} color={OK_INK} above={false} out={whyAt}>
          median {cont}
        </Marker>
        <Marker at={p90At + 4} ms={p90} y={sy} color={OK_INK}>
          p90 {p90}
        </Marker>
        <div
          style={{
            position: "absolute",
            left: px(p90) + 10,
            top: sy + h(30),
            ...note(22, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, nineAt, 12),
          }}
        >
          9 in 10 finish within it
        </div>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, tailAt, 14) }}>
          <path
            d={`M${px(p90)},${sy - 30} L${px(p90)},${sy - 40} L${px(HI)},${sy - 40} L${px(HI)},${sy - 30}`}
            fill="none"
            stroke={ACCENT}
            strokeWidth={2.6}
          />
          <text x={(px(p90) + px(HI)) / 2} y={sy - 52} textAnchor="middle" style={{ ...label(19, ACCENT_INK), fontWeight: 700 }}>
            the slow tail
          </text>
        </svg>

        {/* ── The two medians, then the two p90s ── */}
        <Listing lines={M.lines} x={X0} top={resTop} width={900} size={SIZE} at={contAt - 4} out={whyAt} marks={[{ line: 1, at: contAt + 6 }, { line: 2, at: discAt + 4, color: MARK_OK }]} />
        <DataTable
          g={mg}
          cols={colsOf(M, { median_cont: { ink: BLUE_INK }, median_disc: { ink: BLUE_INK, at: discAt + 2 } })}
          at={medAt - 4}
          out={whyAt}
          rows={rowsAt(M.rows, medAt)}
          marks={[{ row: 0, col: 1, at: fiftyAt, color: MARK_OK }]}
        />
        <Listing lines={P.lines} x={X0} top={resTop} width={900} size={SIZE} at={whyAt + 4} marks={[{ line: 1, at: p90At }]} />
        <DataTable g={pg} cols={colsOf(P, { p90_cont: { ink: BLUE_INK }, p90_disc: { ink: BLUE_INK } })} at={p90At - 2} rows={rowsAt(P.rows, p90At + 2)} />
        <div
          style={{
            position: "absolute",
            left: X0,
            top: resTop + listingHeight(M.lines.length, SIZE) + h(18),
            ...note(22, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, discAt + 6, 12) * (1 - ease(frame, whyAt, 10)),
          }}
        >
          <span style={{ color: INK }}>cont</span> interpolates between rows; <span style={{ color: INK }}>disc</span> returns one of them
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
