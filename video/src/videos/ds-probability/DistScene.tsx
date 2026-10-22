import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { HIGHLIGHT, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DISTS, pct } from "./data";
import { DATA, DATA_LIGHT, Drift, math, Svg, V } from "./parts";

const PANEL = { x0: 120, w: 300, gap: 42, top: 400, height: 230 };
const panelX = (i: number) => PANEL.x0 + i * (PANEL.w + PANEL.gap);

/** A probability mass function as bars, filling a panel's width. */
const Bars: React.FC<{ i: number; pmf: readonly number[]; at: number }> = ({ i, pmf, at: from }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const top = Math.max(...pmf);
  const pitch = PANEL.w / pmf.length;
  const base = y(PANEL.top) + h(PANEL.height);
  return (
    <Svg>
      {pmf.map((v, k) => {
        const p = ease(frame, from + k * 1.2, 12);
        const hh = h(PANEL.height) * (v / top) * p;
        return <rect key={k} x={panelX(i) + k * pitch + pitch * 0.14} y={base - hh} width={pitch * 0.72} height={hh} rx={2} fill={DATA} />;
      })}
      <line x1={panelX(i)} x2={panelX(i) + PANEL.w} y1={base} y2={base} stroke={INK} strokeWidth={1.5} opacity={ease(frame, from, 10)} />
    </Svg>
  );
};

/** A density as a drawn curve across a panel, with an optional shaded band
 *  under it between two x values (in the curve's own units). */
const Curve: React.FC<{
  i: number;
  xs: readonly number[];
  ys: readonly number[];
  at: number;
  bands?: { lo: number; hi: number; at: number }[];
}> = ({ i, xs, ys, at: from, bands = [] }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const top = Math.max(...ys);
  const lo = xs[0];
  const hi = xs[xs.length - 1];
  const base = y(PANEL.top) + h(PANEL.height);
  const px = (x: number) => panelX(i) + ((x - lo) / (hi - lo)) * PANEL.w;
  const py = (v: number) => base - h(PANEL.height) * (v / top);
  const d = xs.map((x, k) => `${k ? "L" : "M"}${px(x)},${py(ys[k])}`).join(" ");
  const p = ease(frame, from, 22);
  return (
    <Svg>
      {bands.map((b, k) => {
        const q = ease(frame, b.at, 14);
        const pts = xs.map((x, j) => [x, ys[j]] as const).filter(([x]) => x >= b.lo - 1e-9 && x <= b.hi + 1e-9);
        if (q <= 0 || pts.length < 2) return null;
        const area = `M${px(pts[0][0])},${base} ${pts.map(([x, v]) => `L${px(x)},${py(v)}`).join(" ")} L${px(pts[pts.length - 1][0])},${base} Z`;
        return <path key={k} d={area} fill={k === bands.length - 1 ? HIGHLIGHT : DATA_LIGHT} opacity={q * (k === bands.length - 1 ? 0.9 : 0.45)} />;
      })}
      <line x1={panelX(i)} x2={panelX(i) + PANEL.w} y1={base} y2={base} stroke={INK} strokeWidth={1.5} opacity={ease(frame, from, 10)} />
      <path d={d} fill="none" stroke={DATA} strokeWidth={3.4} pathLength={1} strokeDasharray={`${p} 1`} />
    </Svg>
  );
};

/**
 * Question 8, which also answers the Statistics page's own normal, Poisson
 * and binomial questions: five small panels, each drawn as it is named.
 * Bernoulli(0.3), Binomial(10, 0.3) and Poisson(3) as bars; the standard
 * normal with its one, two and three standard deviations shaded in turn;
 * and the exponential's falling density.
 */
export const DistScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("dist").from;
  const qAt = n.word("dist", "Question");
  const textAt = n.word("dist", "Walk through");
  const bernAt = n.word("dist-counts", "A Bernoulli");
  const trialAt = n.word("dist-counts", "one yes or no trial");
  const binAt = n.word("dist-counts", "A binomial");
  const npAt = n.word("dist-counts", "mean n times p");
  const poisAt = n.word("dist-counts", "A Poisson");
  const lambdaAt = n.word("dist-counts", "both its rate, lambda");
  const normAt = n.word("dist-curves", "The normal");
  const s68At = n.word("dist-curves", "sixty-eight");
  const s95At = n.word("dist-curves", "ninety-five");
  const s997At = n.word("dist-curves", "ninety-nine point seven");
  const expAt = n.word("dist-curves", "the exponential");
  const waitAt = n.word("dist-curves", "the wait between Poisson events");
  const end = n.beat("dist-curves").to;

  const names: [string, number][] = [
    ["Bernoulli", bernAt],
    ["binomial", binAt],
    ["Poisson", poisAt],
    ["normal", normAt],
    ["exponential", expAt],
  ];
  const capY = y(PANEL.top) + h(PANEL.height) + 40;
  const within = DISTS.normal.within;

  return (
    <AbsoluteFill>
      {names.map(([name, at]) => (
        <Sfx key={name} name="el-tap" at={at + 2} level={-34} />
      ))}
      <Sfx name="el-pop" at={s997At + 4} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={60}>
          Walk through the distributions a data scientist should know.
        </QuestionCard>

        {names.map(([name, at], i) => (
          <Ink key={name} at={at} dur={14} style={{ left: panelX(i), top: y(PANEL.top) - 62 }}>
            <span style={{ ...label(30, INK), whiteSpace: "nowrap" }}>{name}</span>
          </Ink>
        ))}

        <Bars i={0} pmf={DISTS.bernoulli.pmf} at={bernAt + 4} />
        <Bars i={1} pmf={DISTS.binomial.pmf} at={binAt + 4} />
        <Bars i={2} pmf={DISTS.poisson.pmf} at={poisAt + 4} />
        <Curve
          i={3}
          xs={DISTS.normal.x}
          ys={DISTS.normal.pdf}
          at={normAt + 2}
          bands={[
            { lo: -3, hi: 3, at: s997At },
            { lo: -2, hi: 2, at: s95At },
            { lo: -1, hi: 1, at: s68At },
          ]}
        />
        <Curve i={4} xs={DISTS.exponential.t} ys={DISTS.exponential.pdf} at={expAt + 2} />

        {/* What each one is, as it is said. */}
        <Note at={trialAt} x={panelX(0)} y={capY} width={PANEL.w}>
          <span style={{ ...note(23, INK) }}>one yes or no trial</span>
        </Note>
        <Note at={binAt + 8} x={panelX(1)} y={capY} width={PANEL.w}>
          <span style={{ ...note(23, INK) }}>successes in <span style={math(26)}><V>n</V></span> trials</span>
        </Note>
        <Note at={npAt} x={panelX(1)} y={capY + 40} width={PANEL.w}>
          <span style={math(28)}>
            mean <V>n</V>
            <V>p</V>
          </span>
        </Note>
        <Note at={poisAt + 8} x={panelX(2)} y={capY} width={PANEL.w}>
          <span style={{ ...note(23, INK) }}>events in an interval</span>
        </Note>
        <Note at={lambdaAt} x={panelX(2)} y={capY + 40} width={PANEL.w}>
          <span style={math(28)}>mean = variance = λ</span>
        </Note>
        <Note at={normAt + 8} x={panelX(3)} y={capY} width={PANEL.w}>
          <span style={{ ...note(23, INK) }}>the symmetric bell</span>
        </Note>
        <Note at={s68At} x={panelX(3)} y={capY + 40} width={PANEL.w + 40}>
          <span style={{ ...label(23, INK), ...TABULAR, whiteSpace: "nowrap" }}>
            {pct(within[0])} <Late at={s95At}>· {pct(within[1])}</Late> <Late at={s997At}>· {pct(within[2], 1)}</Late>
          </span>
          <div style={{ ...note(20, INK_SOFT), marginTop: 4 }}>within one, two and three standard deviations</div>
        </Note>
        <Note at={waitAt} x={panelX(4)} y={capY} width={PANEL.w}>
          <span style={{ ...note(23, INK) }}>the wait between Poisson events</span>
        </Note>
        <Note at={bernAt + 10} x={panelX(0)} y={y(PANEL.top) + h(PANEL.height) + 4} width={PANEL.w}>
          <span style={{ ...label(18, INK_SOFT), display: "flex", justifyContent: "space-around" }}>
            <span>no</span>
            <span>yes</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

/** Words that ink in later than the rest of their line. */
const Late: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  return <span style={{ opacity: ease(frame, at, 10) }}>{children}</span>;
};
