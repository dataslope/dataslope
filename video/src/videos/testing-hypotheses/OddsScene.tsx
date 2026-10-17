import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, halo, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { AT_LEAST, PEEK, TWENTY } from "./data";
import { Count, DATA, DATA_WASH, DOT, Head, Label, lerp, Mark, pct, pulse, RAW, STAT, STAT_INK, Svg, Tick } from "./parts";

/** The chance that at least one of k tests fires. */
const X: XScale = { lo: 0, hi: 20.5, x0: 220, x1: 980 };
const BASE = 760;
const TALL = 400;
const TOP = 0.8;
/** The Bonferroni panel: p from 0 to 0.06, wide enough to tell 0.0025 from 0.033. */
const B: XScale = { lo: 0, hi: 0.06, x0: 1120, x1: 1760 };
const B_BASE = 830;
const HIT = TWENTY.hits[0];
/** The peeking panel: one experiment with nothing to find, p after every 100 visitors. */
const PK: XScale = { lo: 0, hi: PEEK.planned, x0: 1120, x1: 1760 };
const PK_BASE = 690;
const PK_TALL = 280;

/**
 * Twenty tests of nothing give at least one hit 64% of the time; peeking is
 * the same thing one look at a time; and the cure, deciding in advance or
 * raising the bar to 0.05 / 20.
 */
export const OddsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const oddsFrom = n.beat("odds").from;
  const twentyAt = n.word("odds", "twenty tests");
  const atLeastAt = n.word("odds", "at least one");
  const sixtyAt = n.word("odds", "sixty-four");
  const peekAt = n.word("peek", "Peeking");
  const peekEnd = n.beat("peek").to;
  const stopAt = n.word("peek", "stopping");
  const lookAt = n.word("peek", "one look");
  const dipsAt = n.word("peek", "dips");
  const cureAt = n.word("cure", "cure");
  const lookCureAt = n.word("cure", "look");
  const questionAt = n.word("cure", "question");
  const sampleAt = n.word("cure", "sample");
  const analysisAt = n.word("cure", "analysis");
  const advanceAt = n.word("cure", "advance");
  const raiseAt = n.word("bonferroni", "raise");
  const sharingAt = n.word("bonferroni", "sharing");
  const needsAt = n.word("bonferroni", "point zero zero two five");
  const everyTestAt = n.word("bonferroni", "every test");
  const errorsFrom = n.beat("errors-in").from;
  const twoWaysAt = n.word("errors-in", "two ways");
  const wrongAt = n.word("errors-in", "wrong");

  const py = (p: number) => y(BASE) - h(TALL) * (p / TOP);
  const pts = AT_LEAST.k.map((k, i) => [sx(X, k), py(AT_LEAST.p[i])] as const);
  const draw = ease(frame, twentyAt - 4, 36);
  const shown = draw * (pts.length - 1);
  const line = pts.slice(0, Math.floor(shown) + 1).map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`);
  if (Math.floor(shown) < pts.length - 1) {
    const [ax, ay] = pts[Math.floor(shown)];
    const [bx, by] = pts[Math.floor(shown) + 1];
    const f = shown - Math.floor(shown);
    line.push(`${lerp(ax, bx, f).toFixed(1)},${lerp(ay, by, f).toFixed(1)}`);
  }
  const last = pts[pts.length - 1];
  const lastGlow = pulse(frame, sixtyAt - 2, 26);
  // Peeking: the lesson's run, revealed look by look as the narration says it.
  const walk = ease(frame, peekAt + 4, Math.max(40, peekEnd - peekAt));
  const shownRows = PEEK.rows.filter((r) => r.n <= walk * PEEK.planned);
  const peekOut = ease(frame, cureAt - 8, 14);
  const pkx = (v: number) => sx(PK, v);
  const pky = (p: number) => y(PK_BASE) - h(PK_TALL) * p;
  const dipGlow = pulse(frame, dipsAt - 2, 26);
  const dips = shownRows.filter((r, i) => r.p < 0.05 && (i === 0 || shownRows[i - 1].p >= 0.05)).length;
  // The bar falls from 0.05 to 0.0025.
  const fall = ease(frame, needsAt - 8, 22);
  const bar = lerp(0.05, AT_LEAST.bonferroni, fall);
  const hitP = TWENTY.p[HIT];
  const passes = hitP <= bar;
  const dim = 1 - 0.2 * ease(frame, errorsFrom - 4, 14) - 0.2 * ease(frame, wrongAt - 4, 14) - 0.2 * ease(frame, twoWaysAt - 4, 14);
  const barGlow = pulse(frame, everyTestAt - 2, 24);

  return (
    <AbsoluteFill>
      {/* ── Sound: the curve, the 64%, each fixed choice, the bar falling ── */}
      <Sfx name="el-pencil" at={twentyAt - 4} level={-34} />
      <Sfx name="el-tap" at={sixtyAt - 2} level={-28} />
      <Sfx name="el-whoosh" at={stopAt - 6} level={-34} />
      {[questionAt, sampleAt, analysisAt].map((at) => (
        <Sfx key={at} name="el-tap" at={at} level={-30} />
      ))}
      <Sfx name="el-whoosh" at={needsAt - 8} level={-33} />

      <Head a="Twenty tests of nothing:" b="64% find something." at={oddsFrom - 6} bAt={sixtyAt - 6} size={72} />

      <div style={{ position: "absolute", inset: 0, opacity: dim }}>
        {/* ── Fig. 10: the chance of at least one false alarm ── */}
        <FigLabel n="10" title="Chance at least one test fires, if nothing is real" at={oddsFrom} x={160} y={y(290)} />
        <Axis scale={X} base={y(BASE)} ticks={[1, 5, 10, 15, 20]} at={oddsFrom + 2} />
        <Note at={oddsFrom + 6} x={X.x1} y={y(BASE) + 40} align="right">
          <Label size={21} color={INK_SOFT} weight={520}>
            tests run
          </Label>
        </Note>
        <Svg>
          {[0.2, 0.4, 0.6].map((v) => (
            <line key={v} x1={X.x0} x2={X.x1} y1={py(v)} y2={py(v)} stroke={HAIRLINE} strokeWidth={1} opacity={0.35 * ease(frame, oddsFrom + 4, 12)} />
          ))}
          {draw > 0 ? <polyline points={line.join(" ")} fill="none" stroke={STAT} strokeWidth={3.2} strokeLinejoin="round" /> : null}
          {draw >= 1 ? <circle cx={last[0]} cy={last[1]} r={8 + 5 * lastGlow} fill={STAT} stroke={PAPER} strokeWidth={2} /> : null}
        </Svg>
        {[0.2, 0.4, 0.6].map((v) => (
          <div
            key={v}
            style={{ position: "absolute", right: 1920 - X.x0 + 14, top: py(v) - 13, opacity: ease(frame, oddsFrom + 6, 12), ...note(20, INK_SOFT) }}
          >
            {pct(v, 0)}
          </div>
        ))}
        <Note at={atLeastAt - 2} x={sx(X, 1) + 14} y={py(AT_LEAST.p[0]) - 34}>
          <Label size={21} color={STAT_INK} style={halo}>
            one test: 5%
          </Label>
        </Note>
        <Note at={sixtyAt - 2} x={last[0] - 16} y={last[1] - 58} align="right">
          <span style={{ ...note(36, STAT_INK), fontWeight: 700, ...halo }}>
            <Count at={sixtyAt - 2} from={0.05} to={AT_LEAST.p[19]} dur={22} format={(v) => pct(v, 0)} />
          </span>
        </Note>
        {/* ── Fig. 11: peeking, the lesson's own run of two identical arms ── */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - peekOut }}>
          <FigLabel n="11" title="One test with nothing to find, peeked at" at={peekAt - 4} x={PK.x0} y={y(290)} />
          <Ink at={peekAt} dur={14} style={{ left: PK.x0, top: y(290) + 40, whiteSpace: "nowrap" }}>
            <Label size={21} color={INK_SOFT} weight={520}>
              p after every {PEEK.step} visitors, two identical arms
            </Label>
          </Ink>
          <Axis scale={PK} base={y(PK_BASE)} ticks={[0, 2000, 4000, 6000, 8000]} format={(v) => fmt(v, 0)} at={peekAt} />
          <Svg>
            <rect x={PK.x0} y={pky(0.05)} width={(PK.x1 - PK.x0) * ease(frame, peekAt, 14)} height={y(PK_BASE) - pky(0.05)} fill={STAT} opacity={0.18 + 0.25 * dipGlow} />
            {shownRows.length > 1 ? (
              <>
                <path
                  d={`M${pkx(shownRows[0].n)},${y(PK_BASE)} ${shownRows.map((r) => `L${pkx(r.n).toFixed(1)},${pky(r.p).toFixed(1)}`).join(" ")} L${pkx(shownRows[shownRows.length - 1].n)},${y(PK_BASE)}Z`}
                  fill={DATA_WASH}
                />
                <polyline points={shownRows.map((r) => `${pkx(r.n).toFixed(1)},${pky(r.p).toFixed(1)}`).join(" ")} fill="none" stroke={DATA} strokeWidth={2.4} strokeLinejoin="round" />
              </>
            ) : null}
            {shownRows
              .filter((r) => r.p < 0.05)
              .map((r) => (
                <circle key={r.n} cx={pkx(r.n)} cy={pky(r.p)} r={6} fill={STAT} stroke={PAPER} strokeWidth={1.5} />
              ))}
          </Svg>
          {[0, 0.5, 1].map((v) => (
            <div key={v} style={{ position: "absolute", right: 1920 - PK.x0 + 12, top: pky(v) - 13, opacity: ease(frame, peekAt, 12), ...note(20, INK_SOFT) }}>
              {v}
            </div>
          ))}
          <Note at={dipsAt - 2} x={PK.x1} y={y(PK_BASE) + 56} align="right">
            <Label size={22} color={STAT_INK} style={halo}>
              under 0.05: stop and ship?
            </Label>
          </Note>
          <Note at={lookAt - 4} x={PK.x1} y={y(PK_BASE) + 94} align="right">
            <span style={{ ...note(24, STAT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
              dips under 0.05: {dips} {dips === 1 ? "time" : "times"}, with nothing there
            </span>
          </Note>
        </div>

        {/* ── The cure: decide before you look ── */}
        <Ink at={cureAt - 4} dur={16} style={{ left: B.x0, top: y(290), whiteSpace: "nowrap" }}>
          <span style={{ ...body(38, true), color: INK }}>
            Decide <Mark at={lookCureAt - 4}>before you look</Mark>:
          </span>
        </Ink>
        {[
          ["the question", questionAt],
          ["the sample size", sampleAt],
          ["the analysis", analysisAt],
        ].map(([t, at], i) => (
          <React.Fragment key={t as string}>
            <Ink at={(at as number) - 4} dur={12} style={{ left: B.x0 + 52, top: y(358 + i * 58), whiteSpace: "nowrap" }}>
              <Label size={28}>{t}</Label>
            </Ink>
            <Tick x={B.x0 + 18} y={y(358 + i * 58) + 17} at={(at as number) + 2} size={24} />
          </React.Fragment>
        ))}
        <Ink at={advanceAt - 4} dur={14} style={{ left: B.x0 + 52, top: y(358 + 3 * 58), whiteSpace: "nowrap" }}>
          <Label size={24} color={STAT_INK}>
            <Mark at={advanceAt}>all fixed in advance</Mark>
          </Label>
        </Ink>

        {/* ── Or raise the bar: 0.05 shared by twenty tests ── */}
        <Ink at={raiseAt - 4} dur={14} style={{ left: B.x0, top: y(650), whiteSpace: "nowrap" }}>
          <Label size={24}>Or raise the bar:</Label>
          <span style={{ ...note(26, STAT_INK), fontWeight: 700, marginLeft: 14, opacity: ease(frame, sharingAt - 4, 12) }}>
            0.05 ÷ 20 = {AT_LEAST.bonferroni}
          </span>
        </Ink>
        <Axis scale={B} base={y(B_BASE)} ticks={[0, 0.02, 0.04, 0.06]} format={(v) => (v === 0 ? "0" : fmt(v, 2))} at={raiseAt - 2} />
        <Svg opacity={ease(frame, raiseAt - 2, 14)}>
          <line x1={sx(B, bar)} x2={sx(B, bar)} y1={y(B_BASE)} y2={y(B_BASE) - h(86)} stroke={STAT} strokeWidth={2.6 + 2.4 * barGlow} strokeDasharray="5 4" />
          <rect x={B.x0} y={y(B_BASE) - h(86)} width={sx(B, bar) - B.x0} height={h(86)} fill={STAT} opacity={0.12} />
          <circle cx={sx(B, hitP)} cy={y(B_BASE) - h(40)} r={10} fill={passes ? STAT : RAW} stroke={passes ? PAPER : DOT} strokeWidth={2} />
        </Svg>
        <Note at={raiseAt + 4} x={sx(B, hitP) + 16} y={y(B_BASE) - h(40) - 15}>
          <Label size={21} color={passes ? STAT_INK : INK_SOFT} style={halo}>
            test {HIT + 1}, {fmt(hitP, 3)}
            {passes ? "" : ": no longer passes"}
          </Label>
        </Note>
      </div>
    </AbsoluteFill>
  );
};
