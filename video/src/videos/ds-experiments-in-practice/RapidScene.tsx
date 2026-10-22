import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CURSE } from "./data";
import { CONTROL, Drift, Headline, Kicker, OK, OK_INK, Spot, TREAT, WARM_INK, X0 } from "./parts";

const R_X = 820;
const LIST_TOP = 340;
const ROW = 64;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 11. ATE and ATT ─────────────────────────────────────────────────────────

const Ate: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const ateAt = c.w("r-ate", "The average treatment effect, A T E");
  const attAt = c.w("r-ate", "The average treatment effect on the treated");
  const gotAt = c.w("r-ate", "only over those who actually got it");
  const matchAt = c.w("r-ate", "A randomized test makes them match");
  const apartAt = c.w("r-ate", "Observational data can pull them apart");
  const cx = R_X + 260;
  const cy = c.y(560);
  const all = ease(frame, ateAt, 14);
  const got = ease(frame, attAt + 4, 14);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <circle cx={cx} cy={cy} r={c.h(190) * all} fill={`color-mix(in srgb, ${CONTROL} 30%, ${PAPER})`} stroke={INK} strokeWidth={2} />
        <circle cx={cx + 50} cy={cy + c.h(40)} r={c.h(96) * got} fill={TREAT} opacity={0.85} />
      </svg>
      <Note at={ateAt + 4} x={R_X + 520} y={c.y(400)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          <b>ATE</b>: averaged over everyone
        </span>
      </Note>
      <Note at={gotAt - 2} x={R_X + 520} y={c.y(460)}>
        <span style={{ ...note(26, BLUE_INK), whiteSpace: "nowrap" }}>
          <b>ATT</b>: only over those who got it
        </span>
      </Note>
      <Note at={matchAt} x={R_X + 520} y={c.y(560)}>
        <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>randomized: they match</span>
      </Note>
      <Note at={apartAt} x={R_X + 520} y={c.y(610)}>
        <span style={{ ...note(25, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>observational: they can come apart</span>
      </Note>
    </>
  );
};

// ── 12. Long-running experiments ────────────────────────────────────────────

const Long: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const driftAt = c.w("r-long", "Long-running experiments drift");
  const seasonsAt = c.w("r-long", "seasons turn");
  const launchesAt = c.w("r-long", "other launches land");
  const freezeAt = c.w("r-long", "Freeze the scope");
  const cycleAt = c.w("r-long", "one full business cycle");
  const endAt = c.w("r-long", "set the end date in advance");
  const x0 = R_X;
  const wk = 112;
  const top = c.y(470);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={x0 + i * wk} y={top} width={wk - 6} height={c.h(60)} rx={5} fill={`color-mix(in srgb, ${CONTROL} 40%, ${PAPER})`} stroke={INK} strokeWidth={1.2} opacity={ease(frame, driftAt + i * 1.5, 8)} />
        ))}
        {/* A full business cycle: two weeks here. */}
        <rect x={x0 - 4} y={top - 6} width={(2 * wk + 2) * ease(frame, cycleAt, 12)} height={c.h(60) + 12} rx={8} fill="none" stroke={OK} strokeWidth={3.5} />
        {/* The end date, set before the start. */}
        <g opacity={ease(frame, endAt, 10)}>
          <line x1={x0 + 6 * wk - 3} x2={x0 + 6 * wk - 3} y1={top - c.h(70)} y2={top + c.h(76)} stroke={OK} strokeWidth={3} />
          <path d={`M${x0 + 6 * wk - 3},${top - c.h(70)} l40,12 l-40,12 z`} fill={OK} />
        </g>
      </svg>
      <Note at={seasonsAt} x={x0 + 2 * wk} y={top + c.h(84)}>
        <span style={{ ...label(22, WARM_INK), fontWeight: 700, whiteSpace: "nowrap" }}>seasons turn</span>
      </Note>
      <Note at={launchesAt} x={x0 + 4 * wk} y={top + c.h(84)}>
        <span style={{ ...label(22, WARM_INK), fontWeight: 700, whiteSpace: "nowrap" }}>other launches land</span>
      </Note>
      <Note at={freezeAt} x={x0} y={top - c.h(110)}>
        <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>freeze the scope</span>
      </Note>
      <Note at={cycleAt + 4} x={x0} y={top + c.h(140)}>
        <span style={{ ...note(24, OK_INK), whiteSpace: "nowrap" }}>at least one full business cycle</span>
      </Note>
      <Note at={endAt + 4} x={x0 + 6 * wk + 50} y={top - c.h(72)}>
        <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>end date, set in advance</span>
      </Note>
    </>
  );
};

// ── 13. Holdback ────────────────────────────────────────────────────────────

const Holdback: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const holdAt = c.w("r-holdback", "A holdback keeps a few percent");
  const afterAt = c.w("r-holdback", "after launch");
  const monthsAt = c.w("r-holdback", "months later");
  const W = 880;
  const top = c.y(500);
  const p = ease(frame, holdAt, 16);
  const hold = 0.06;
  return (
    <>
      <div style={{ position: "absolute", left: R_X, top, width: W * (1 - hold) * p, height: c.h(70), background: TREAT, borderRadius: "6px 0 0 6px" }} />
      <div style={{ position: "absolute", left: R_X + W * (1 - hold) * p + 4, top, width: W * hold * ease(frame, holdAt + 10, 10), height: c.h(70), background: CONTROL, borderRadius: "0 6px 6px 0" }} />
      <Note at={afterAt - 2} x={R_X} y={top - c.h(48)}>
        <span style={{ ...label(22, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>after launch: almost everyone on the new version</span>
      </Note>
      <Note at={holdAt + 12} x={R_X + W - 260} y={top + c.h(84)}>
        <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>a few percent on the old ↑</span>
      </Note>
      <Note at={monthsAt} x={R_X} y={top + c.h(150)}>
        <span style={{ ...note(26, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>months later: did the win last?</span>
      </Note>
    </>
  );
};

// ── 14. Meta-analysis and the winner's curse ───────────────────────────────

const Meta: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const poolAt = c.w("r-meta", "a meta-analysis pools many experiments");
  const weightAt = c.w("r-meta", "weighting each by its precision");
  const headAt = c.w("r-meta", "rather than averaging headlines");
  const curseAt = c.w("r-meta", "Watch for the winner's curse");
  const twentyAt = c.w("r-meta", "at twenty percent power");
  const overAt = c.w("r-meta", "more than twofold");
  const low = CURSE.find((r) => r.power === 0.2)!;
  // Three experiments, sized by precision: a sketch of the pooling, no numbers.
  const studies = [
    { x: R_X + 60, r: 26 },
    { x: R_X + 180, r: 46 },
    { x: R_X + 330, r: 16 },
  ];
  const sy = c.y(470);
  const weigh = ease(frame, weightAt, 14);
  const merge = ease(frame, headAt + 6, 18);
  const BAR = { x: R_X + 520, base: c.y(760), unit: c.h(110) };
  const truth = ease(frame, twentyAt, 12);
  const pub = ease(frame, overAt - 6, 18);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {studies.map((s, i) => {
          const tx = R_X + 200;
          const x = s.x + (tx - s.x) * merge;
          const r = (14 + (s.r - 14) * weigh) * (1 - 0.3 * merge);
          return <circle key={i} cx={x} cy={sy} r={r * ease(frame, poolAt + i * 4, 10)} fill={TREAT} opacity={0.55} />;
        })}
        <circle cx={R_X + 200} cy={sy + c.h(150)} r={44 * merge} fill={TREAT} />
        {/* Truth against what reached significance, at 20% power. */}
        <g opacity={ease(frame, curseAt, 12)}>
          <line x1={BAR.x - 20} x2={BAR.x + 340} y1={BAR.base} y2={BAR.base} stroke={INK} strokeWidth={1.6} />
          <rect x={BAR.x} y={BAR.base - BAR.unit * truth} width={120} height={BAR.unit * truth} fill={OK} rx={3} />
          <rect x={BAR.x + 180} y={BAR.base - BAR.unit * low.ratio * pub} width={120} height={BAR.unit * low.ratio * pub} fill={ACCENT} rx={3} />
        </g>
      </svg>
      <Note at={weightAt + 2} x={R_X} y={sy - c.h(110)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>weighted by precision</span>
      </Note>
      <Note at={headAt + 10} x={R_X + 260} y={sy + c.h(132)}>
        <span style={{ ...note(24, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>pooled</span>
      </Note>
      <Note at={curseAt + 2} x={BAR.x - 20} y={c.y(380)}>
        <span style={{ ...note(26, ACCENT_INK), fontWeight: 750, whiteSpace: "nowrap" }}>the winner's curse, at 20% power</span>
      </Note>
      {[
        { text: "true effect", at: twentyAt + 6, x: BAR.x, ink: OK_INK, v: "1×" },
        { text: "significant results", at: overAt, x: BAR.x + 180, ink: ACCENT_INK, v: `${low.ratio.toFixed(2)}×` },
      ].map((b) => (
        <React.Fragment key={b.text}>
          <div style={{ position: "absolute", left: b.x - 40, width: 200, top: BAR.base + c.h(10), textAlign: "center", ...label(20, INK_SOFT), fontWeight: 700, opacity: ease(frame, b.at - 4, 10) }}>
            {b.text}
          </div>
          <Note at={b.at} x={b.x + 20} y={BAR.base - BAR.unit * (b.v === "1×" ? 1 : low.ratio) - c.h(44)}>
            <span style={{ ...note(27, b.ink), fontWeight: 800, ...TABULAR }}>{b.v}</span>
          </Note>
        </React.Fragment>
      ))}
    </>
  );
};

/**
 * The quick round: four questions down the left, each answer on the right
 * while it is read, then the bridge into Product sense.
 */
export const RapidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const leftAt = n.word("rapid-in", "Four left");
  const defAt = n.word("rapid-in", "a definition and a reason");
  const end = n.beat("r-meta").to;
  const assumedAt = n.word("next", "Every answer here assumed");
  const testAt = n.word("next", "what to test");
  const countAt = n.word("next", "what to count");
  const roundAt = n.word("next", "the product-sense round");
  const nextAt = n.word("next", "Next:");

  const items: RapidItem[] = [
    { n: 11, label: "ATE or ATT", at: n.word("r-ate", "The average treatment effect, A T E"), body: <Ate c={c} /> },
    { n: 12, label: "Long-running experiments", at: n.word("r-long", "Long-running experiments drift"), body: <Long c={c} /> },
    { n: 13, label: "A holdback", at: n.word("r-holdback", "A holdback keeps"), body: <Holdback c={c} /> },
    { n: 14, label: "Meta-analysis", at: n.word("r-meta", "a meta-analysis pools"), body: <Meta c={c} /> },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={leftAt} level={-36} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-37} />
      ))}
      <Sfx name="el-pop" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40}>
        <Kicker at={leftAt}>Quick round</Kicker>
        <Headline lead="Four left." turn="A definition and a reason each." at={leftAt} turnAt={defAt - 2} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={620} at={leftAt + 6} end={end} />
        <Spot id="ds-experiments-in-practice-turtle" at={assumedAt} left={1440} top={y(330)} width={320} height={214} />

        {/* The bridge. */}
        <Note at={assumedAt} x={X0} y={y(LIST_TOP) + 4 * h(ROW) + h(40)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            Every answer assumed someone chose <b style={{ color: BLUE_INK, opacity: ease(frame, testAt, 10) }}>what to test</b>
            <span style={{ opacity: ease(frame, countAt, 10) }}>
              {" "}
              and <b style={{ color: WARM_INK }}>what to count</b>
            </span>
            .
          </span>
        </Note>
        <Note at={roundAt} x={X0} y={y(LIST_TOP) + 4 * h(ROW) + h(90)}>
          <span style={{ ...note(26, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>That choice is the product-sense round.</span>
        </Note>
        <NextLine at={nextAt} x={X0} y={y(760)} width={900}>
          product sense and metrics
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
