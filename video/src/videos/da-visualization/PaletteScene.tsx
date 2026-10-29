import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { categorical, ds } from "../../theme/brand";
import { DEUTERANOPE, PARTS, TICKETS } from "./data";
import { CATS, Drift, LineSet, PanelTitle, pulse, Svg, Verdict } from "./parts";

const FILTER = "da-visualization-deuteranope";
const GRAY = ds("gray", 300);

/** Question 15: the three palette families, side by side. */
const FAMILIES_X = [140, 720, 1300];
const STRIP_W = 480;
const FAMILIES = [
  {
    title: "Categories",
    caption: "distinct hues",
    cells: categorical,
    ticks: TICKETS.byChannel.slice(0, categorical.length).map((c) => c.key),
  },
  {
    title: "Ordered values",
    caption: "one hue, light to dark",
    cells: ([100, 200, 300, 400, 500, 600, 700] as const).map((s) => ds("blue", s)),
    ends: ["low", "", "high"],
  },
  {
    title: "A meaningful middle",
    caption: "two hues, a neutral center",
    cells: [ds("orange", 700), ds("orange", 500), ds("orange", 300), ds("gray", 100), ds("blue", 300), ds("blue", 500), ds("blue", 700)],
    ends: ["loss", "0", "profit"],
  },
];
/** The accent chart under the families. */
const ACC = { x0: 140, x1: 900, top: 620, base: 830 };

/** Question 16: ten groups on a palette of eight, then the tail folded. */
const DISC_X0 = 200;
const DISC_STEP = 128;
const DISC_R = 34;
const GROUPS = 10;
/** Small panels, one channel each. */
const SMALL = { x0: 1440, w: 170, gap: 26, top: 610, hgt: 96, vgap: 34 };

/** Question 17: as most see it, as a deuteranope sees it, labeled in gray. */
const PANELS = [
  { x0: 180, x1: 600 },
  { x0: 760, x1: 1180 },
  { x0: 1340, x1: 1760 },
];
const P_TOP = 500;
const P_BASE = 760;
/** A colorblind-safe pair, dark blue against orange, far apart in lightness too. */
const SAFE = [ds("blue", 700), ds("orange", 500)] as const;

/** A legend's line sample, in a series' ink. */
const Swatch: React.FC<{ color: string }> = ({ color }) => (
  <span style={{ display: "inline-block", width: 26, height: 4, borderRadius: 2, background: color, verticalAlign: "middle", marginRight: 8 }} />
);

/**
 * Questions 15, 16 and 17. The three palette families, each on a strip (the
 * page's ticket channels in four hues, one blue from light to dark, orange
 * and blue meeting at a neutral gray), and one series in color over three
 * in gray. Ten groups on the eight-color palette this video uses, where the
 * ninth and tenth come round to the first two colors, then the tail folded
 * into "other" and the same channels as small panels. Last, two lines in red
 * and green, then the same two through the page's deuteranope simulation
 * (an SVG color matrix computed in check.mjs), then redrawn in a
 * colorblind-safe pair, blue and orange, labeled, and in gray.
 */
export const PaletteScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("palette").from;
  const qAt = n.word("palette", "Question");
  const textAt = n.word("palette", "How do you choose");
  const matchAt = n.word("palette", "Match it to the data");
  const catAt = n.word("palette", "Categories get distinct hues");
  const seqAt = n.word("palette", "Ordered values get one hue");
  const darkAt = n.word("palette", "from light to dark");
  const divAt = n.word("palette", "Values with a meaningful middle");
  const centerAt = n.word("palette", "meet at a neutral center");
  const accentAt = n.word("palette-accent", "save one bold accent");
  const seeAt = n.word("palette-accent", "the series you want them to see");
  const q16At = n.word("cap", "Question sixteen");
  const q16TextAt = n.word("cap", "Why cap");
  const becauseAt = n.word("cap", "Because past that");
  const againAt = n.word("cap", "starts again");
  const shareAt = n.word("cap", "two unrelated groups share a color");
  const foldAt = n.word("cap", "Fold the tail into other");
  const panelsAt = n.word("cap", "split the chart into small panels");
  const q17At = n.word("access", "Question seventeen");
  const q17TextAt = n.word("access", "How do you make");
  const eightAt = n.word("access", "About eight percent");
  const aloneAt = n.word("access", "don't carry meaning by color alone");
  const mostAt = n.word("access", "as most people see them");
  const cbAt = n.word("access", "as a red-green colorblind reader");
  const safeAt = n.word("access-safe", "Use a colorblind-safe pair");
  const blueOrangeAt = n.word("access-safe", "like blue and orange");
  const cueAt = n.word("access-fix", "Add a second cue");
  const labelAt = n.word("access-fix", "like a direct label");
  const grayAt = n.word("access-fix", "check the chart in grayscale");
  const robustAt = n.word("access-fix", "it's robust");
  const end = n.beat("access-fix").to;

  const out15 = q16At - 4;
  const out16 = q17At - 4;
  const familyAt = [catAt, seqAt, divAt];
  const center = pulse(frame, centerAt, 30);

  // Question 15's accent chart: the page's four channels, one in color.
  const accTop = y(ACC.top);
  const accBase = y(ACC.base);
  const [mobile, , , retail] = PARTS.channels;
  const accY = (v: number) => accBase - (v / 100) * (accBase - accTop);

  // Question 16.
  const discY = y(500);
  const discX = (i: number) => DISC_X0 + i * DISC_STEP;
  const arc = (a: number, b: number, lift: number) => {
    const y0 = discY - DISC_R - 8;
    return `M${discX(a)},${y0} Q${(discX(a) + discX(b)) / 2},${y0 - lift} ${discX(b)},${y0}`;
  };
  const foldY = y(750);
  const smallY = (r: number) => y(SMALL.top) + r * h(SMALL.hgt + SMALL.vgap);

  // Question 17.
  const pTop = y(P_TOP);
  const pBase = y(P_BASE);
  const pY = (v: number) => pBase - (v / 100) * (pBase - pTop);
  const lines = (p: (typeof PANELS)[number], at: number, colors: readonly [string, string] = [OK, ACCENT]) => (
    <>
      <LineSet values={mobile.values} x0={p.x0} x1={p.x1} base={pBase} top={pTop} lo={0} hi={100} at={at} color={colors[0]} dots={false} edges />
      <LineSet values={retail.values} x0={p.x0} x1={p.x1} base={pBase} top={pTop} lo={0} hi={100} at={at + 4} color={colors[1]} dots={false} axis={false} edges />
    </>
  );
  const legend = (p: (typeof PANELS)[number], at: number) => (
    <div style={{ position: "absolute", left: p.x0, top: pBase + h(34), ...label(20, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, at, 10) }}>
      <Swatch color={OK} /> {mobile.key}
      <span style={{ display: "inline-block", width: 28 }} />
      <Swatch color={ACCENT} /> {retail.key}
    </div>
  );
  const gray = ease(frame, grayAt, 16);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={catAt} level={-34} />
      <Sfx name="el-tap" at={seqAt} level={-34} />
      <Sfx name="el-tap" at={divAt} level={-34} />
      <Sfx name="el-pop" at={seeAt} level={-32} />
      <Sfx name="el-pencil" at={becauseAt} level={-34} />
      <Sfx name="el-scratch" at={shareAt} level={-32} />
      <Sfx name="el-pop" at={foldAt} level={-32} />
      <Sfx name="el-tap" at={mostAt} level={-34} />
      <Sfx name="el-scratch" at={cbAt + 8} level={-32} />
      <Sfx name="el-pop" at={robustAt} level={-32} />

      {/* The page's red-green simulation, as one matrix in linear RGB. */}
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id={FILTER} colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values={DEUTERANOPE} />
          </filter>
        </defs>
      </svg>

      <Drift from={from} to={end + 40}>
        <QuestionCard n={15} at={qAt - 4} textAt={textAt - 4} out={out15} size={60}>
          How do you choose a color palette?
        </QuestionCard>
        <QuestionCard n={16} at={q16At} textAt={q16TextAt - 2} out={out16} size={60}>
          Why cap a categorical palette at six or eight colors?
        </QuestionCard>
        <QuestionCard n={17} at={q17At} textAt={q17TextAt - 2} size={60}>
          How do you make a chart accessible?
        </QuestionCard>

        {/* ── Question 15: three families, then one accent ── */}
        <Note at={matchAt - 2} x={FAMILIES_X[0]} y={y(290)} out={out15}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>match the palette to the data</span>
        </Note>
        {FAMILIES.map((f, k) => {
          const x = FAMILIES_X[k];
          const at = familyAt[k];
          const o = 1 - ease(frame, out15, 10);
          const cellW = STRIP_W / f.cells.length;
          const stripTop = y(400);
          const stripH = h(64);
          return (
            <React.Fragment key={f.title}>
              <PanelTitle x={x} y={y(350)} at={at - 4} out={out15}>
                {f.title}
              </PanelTitle>
              <Svg opacity={o}>
                {f.cells.map((c, i) => {
                  const p = ease(frame, at + (k === 1 ? (darkAt - at) * (i / f.cells.length) : i * 2), 10);
                  const mid = k === 2 && i === 3;
                  const lift = mid ? center : 0;
                  return (
                    <rect
                      key={i}
                      x={x + i * cellW + 2}
                      y={stripTop - lift * 10}
                      width={cellW - 4}
                      height={stripH * p + lift * 20}
                      rx={4}
                      fill={c}
                      stroke={mid ? INK_SOFT : undefined}
                      strokeWidth={mid ? 1.2 : undefined}
                      opacity={p}
                    />
                  );
                })}
                {"ticks" in f && f.ticks
                  ? f.ticks.map((t, i) => (
                      <text
                        key={t}
                        x={x + (i + 0.5) * cellW}
                        y={stripTop + stripH + 30}
                        textAnchor="middle"
                        style={{ ...label(19, INK_SOFT) }}
                        fill={INK_SOFT}
                        opacity={ease(frame, at + 6 + i * 2, 10)}
                      >
                        {t}
                      </text>
                    ))
                  : null}
                {"ends" in f && f.ends
                  ? f.ends.map((t, i) =>
                      t ? (
                        <text
                          key={t}
                          x={x + [cellW / 2, STRIP_W / 2, STRIP_W - cellW / 2][i]}
                          y={stripTop + stripH + 30}
                          textAnchor="middle"
                          style={{ ...label(19, INK_SOFT) }}
                          fill={INK_SOFT}
                          opacity={ease(frame, (k === 1 ? darkAt : at) + 6, 10)}
                        >
                          {t}
                        </text>
                      ) : null,
                    )
                  : null}
              </Svg>
              <Note at={(k === 2 ? centerAt : k === 1 ? darkAt : at) + 4} x={x} y={stripTop + stripH + h(52)} out={out15}>
                <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>{f.caption}</span>
              </Note>
            </React.Fragment>
          );
        })}

        {/* The accent drawn last, over the gray. */}
        {[...PARTS.channels.filter((c) => c.key !== mobile.key), mobile].map((c, i) => {
          const lead = c.key === mobile.key;
          return (
            <LineSet
              key={c.key}
              values={c.values}
              x0={ACC.x0}
              x1={ACC.x1}
              base={accBase}
              top={accTop}
              lo={0}
              hi={100}
              at={lead ? seeAt - 4 : accentAt - 4}
              color={lead ? BAR : GRAY}
              width={lead ? 4 : 2.4}
              dots={false}
              axis={i === 0}
              out={out15}
              edges
            />
          );
        })}
        <Note at={seeAt + 6} x={ACC.x1 + 14} y={accY(mobile.values.at(-1)!) - 15} out={out15}>
          <span style={{ ...label(21, BLUE_INK), whiteSpace: "nowrap" }}>{mobile.key}</span>
        </Note>
        <Note at={accentAt} x={ACC.x1 + 160} y={y(650)} out={out15}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b>one bold accent</b>
          </span>
        </Note>
        <Note at={seeAt} x={ACC.x1 + 160} y={y(700)} out={out15}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>for the series they should see,</span>
        </Note>
        <Note at={seeAt + 10} x={ACC.x1 + 160} y={y(744)} out={out15}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>and the rest in gray</span>
        </Note>

        {/* ── Question 16: the palette comes round again ── */}
        <PanelTitle x={DISC_X0 - DISC_R} y={y(340)} at={becauseAt - 2} out={out16}>
          {GROUPS} groups, a palette of {CATS.length} colors
        </PanelTitle>
        <Svg opacity={1 - ease(frame, out16, 10)}>
          {Array.from({ length: GROUPS }, (_, i) => {
            const wrapped = i >= CATS.length;
            const p = ease(frame, wrapped ? againAt + (i - CATS.length) * 4 : becauseAt + i * 2, 10);
            if (p <= 0) return null;
            return (
              <g key={i} opacity={p}>
                <circle cx={discX(i)} cy={discY} r={DISC_R * p} fill={CATS[i % CATS.length]} />
                {wrapped ? (
                  <circle cx={discX(i)} cy={discY} r={DISC_R + 7} fill="none" stroke={INK} strokeWidth={1.6} strokeDasharray="4 4" />
                ) : null}
                <text x={discX(i)} y={discY + DISC_R + 32} textAnchor="middle" style={{ ...label(19, INK_SOFT) }} fill={INK_SOFT}>
                  {i + 1}
                </text>
              </g>
            );
          })}
          {[
            [0, 8, 120],
            [1, 9, 92],
          ].map(([a, b, lift], k) => (
            <path
              key={k}
              d={arc(a, b, lift)}
              fill="none"
              stroke={ACCENT}
              strokeWidth={2.4}
              pathLength={1}
              strokeDasharray={`${ease(frame, shareAt + k * 4, 16)} 1`}
              opacity={ease(frame, shareAt + k * 4, 4)}
            />
          ))}
        </Svg>
        <Verdict ok={false} x={DISC_X0 - DISC_R} y={y(600)} at={shareAt + 6} out={out16}>
          9 looks like 1, and 10 like 2
        </Verdict>

        <PanelTitle x={DISC_X0 - DISC_R} y={y(670)} at={foldAt - 2} out={out16}>
          The tail folded into other
        </PanelTitle>
        <Svg opacity={1 - ease(frame, out16, 10)}>
          {Array.from({ length: 6 }, (_, i) => {
            const other = i === 5;
            const p = ease(frame, foldAt + i * 2, 10);
            if (p <= 0) return null;
            return (
              <g key={i} opacity={p}>
                <circle cx={discX(i)} cy={foldY} r={DISC_R * p} fill={other ? GRAY : CATS[i]} />
                <text x={discX(i)} y={foldY + DISC_R + 32} textAnchor="middle" style={{ ...label(19, INK_SOFT) }} fill={INK_SOFT}>
                  {other ? "other" : i + 1}
                </text>
              </g>
            );
          })}
        </Svg>
        <Verdict ok x={discX(5) + DISC_R + 40} y={foldY - h(16)} at={foldAt + 14} out={out16}>
          one color, one group
        </Verdict>

        <PanelTitle x={SMALL.x0} y={y(SMALL.top) - h(52)} at={panelsAt - 2} out={out16}>
          Or small panels
        </PanelTitle>
        {PARTS.channels.map((c, k) => {
          const col = k % 2;
          const row = Math.floor(k / 2);
          const x0 = SMALL.x0 + col * (SMALL.w + SMALL.gap);
          const top = smallY(row);
          const base = top + h(SMALL.hgt);
          const at = panelsAt + k * 3;
          return (
            <React.Fragment key={c.key}>
              <LineSet values={c.values} x0={x0} x1={x0 + SMALL.w} base={base} top={top + h(26)} lo={0} hi={100} at={at} dots={false} width={2.4} out={out16} edges />
              <div style={{ position: "absolute", left: x0, top, ...label(19, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, at + 2, 10) * (1 - ease(frame, out16, 10)) }}>
                {c.key}
              </div>
            </React.Fragment>
          );
        })}

        {/* ── Question 17: red and green, as two readers see them ── */}
        <Note at={eightAt - 2} x={PANELS[0].x0} y={y(300)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>about 8% of men have red-green color blindness</span>
        </Note>
        <Note at={aloneAt - 2} x={PANELS[0].x0} y={y(350)}>
          <span style={{ ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>so color can&apos;t be the only cue</span>
        </Note>

        <PanelTitle x={PANELS[0].x0} y={pTop - h(56)} at={mostAt - 4}>
          As most people see it
        </PanelTitle>
        {lines(PANELS[0], mostAt - 2)}
        {legend(PANELS[0], mostAt + 8)}

        <PanelTitle x={PANELS[1].x0} y={pTop - h(56)} at={cbAt - 4}>
          As a red-green colorblind reader sees it
        </PanelTitle>
        <div style={{ position: "absolute", inset: 0, filter: `url(#${FILTER})` }}>
          {lines(PANELS[1], cbAt - 2)}
          {legend(PANELS[1], cbAt + 8)}
        </div>
        <Verdict ok={false} x={PANELS[1].x0} y={pBase + h(90)} at={cbAt + 14}>
          which line is which?
        </Verdict>

        {/* The fix, built up as it is said: a safe pair, then labels, then gray. */}
        <PanelTitle x={PANELS[2].x0} y={pTop - h(56)} at={safeAt - 2}>
          Blue and orange
          <span style={{ opacity: ease(frame, labelAt, 10) }}>, labeled</span>
          <span style={{ opacity: ease(frame, grayAt, 10) }}>, in grayscale</span>
        </PanelTitle>
        <div style={{ position: "absolute", inset: 0, filter: `grayscale(${gray})` }}>
          {lines(PANELS[2], blueOrangeAt - 2, SAFE)}
          {[
            { key: mobile.key, v: mobile.values.at(-1)!, color: SAFE[0] },
            { key: retail.key, v: retail.values.at(-1)!, color: SAFE[1] },
          ].map((s) => (
            <Note key={s.key} at={labelAt + (s.key === retail.key ? 4 : 0)} x={PANELS[2].x1 - 70} y={pY(s.v) - h(42)}>
              <span style={{ ...label(21, INK), whiteSpace: "nowrap", borderBottom: `3px solid ${s.color}` }}>{s.key}</span>
            </Note>
          ))}
        </div>
        <Verdict ok x={PANELS[2].x0} y={pBase + h(90)} at={robustAt - 4}>
          still reads: robust
        </Verdict>
      </Drift>
    </AbsoluteFill>
  );
};
