import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, TABULAR, headline, label, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { BUBBLES, INK_WEEK, PARTS, SCATTER } from "./data";
import { bandMid, BarSet, CATS, Drift, Headline, Kicker, LineSet, pulse, Spot, Svg, Verdict, X0 } from "./parts";

/** Where the answers go: right of the list. */
const R_X = 760;
const R_END = 1720;
const LIST_TOP = 300;
const ROW = 50;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

const GRAY = ds("gray", 300);
const CLUTTER = ds("gray", 200);

// ── 18. 3D and area ─────────────────────────────────────────────────────────

const ThreeD: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at0 = c.w("r-3d", "Three D bars meet the axis twice");
  const frontAt = c.w("r-3d", "at the front edge");
  const backAt = c.w("r-3d", "and the back");
  const whichAt = c.w("r-3d", "nothing says which to read");
  const radiusAt = c.w("r-3d", "Size circles by radius");
  const squaredAt = c.w("r-3d", "every ratio is squared");
  const fiveAt = c.w("r-3d", "five looks twenty-five times");

  // One deep bar beside its axis: the front face's top and the back face's
  // top are two different heights, and each reaches the axis on its own.
  const axisX = R_X + 60;
  const base = c.y(760);
  const bx = R_X + 170;
  const bw = 110;
  const depth = { x: 44, y: -34 };
  const frontTop = c.y(470);
  const grow = ease(frame, at0, 16);
  const ft = base - (base - frontTop) * grow;
  const backY = ft + depth.y;
  const leaders = [
    { y: ft, x: bx, at: frontAt, text: "front?" },
    { y: backY, x: bx + depth.x, at: backAt, text: "back?" },
  ];

  // Circles for 1 to 5, sized by radius and by area, from a radius of 12.
  const r1 = 12;
  const rowX0 = R_X + 520;
  const rows = [
    { key: "radius", title: "Sized by radius", r: (v: number) => r1 * v, cy: c.y(470), at: radiusAt },
    { key: "area", title: "Sized by area", r: (v: number) => r1 * Math.sqrt(v), cy: c.y(700), at: squaredAt + 10 },
  ];
  const xs = (r: (v: number) => number) => {
    let x = rowX0;
    return BUBBLES.values.map((v) => {
      const cx = x + r(v);
      x = cx + r(v) + 14;
      return cx;
    });
  };

  return (
    <>
      <Svg>
        <line x1={axisX} x2={axisX} y1={base} y2={c.y(400)} stroke={INK} strokeWidth={1.6} opacity={ease(frame, at0 - 4, 10)} />
        <line x1={axisX} x2={bx + bw + depth.x + 30} y1={base} y2={base} stroke={INK} strokeWidth={1.6} opacity={ease(frame, at0 - 4, 10)} />
        <g opacity={grow}>
          {/* back, side, top, then front */}
          <polygon points={`${bx + bw},${ft} ${bx + bw + depth.x},${backY} ${bx + bw + depth.x},${base + depth.y} ${bx + bw},${base}`} fill={ds("blue", 700)} />
          <polygon points={`${bx},${ft} ${bx + depth.x},${backY} ${bx + bw + depth.x},${backY} ${bx + bw},${ft}`} fill={ds("blue", 300)} />
          <rect x={bx} y={ft} width={bw} height={base - ft} fill={BAR} />
        </g>
        {leaders.map((l) => {
          const p = ease(frame, l.at - 2, 12);
          return (
            <g key={l.text} opacity={p}>
              <line x1={l.x} x2={l.x - (l.x - axisX) * p} y1={l.y} y2={l.y} stroke={ACCENT} strokeWidth={2} strokeDasharray="5 5" />
              <circle cx={l.x} cy={l.y} r={4} fill={ACCENT} />
            </g>
          );
        })}
      </Svg>
      {leaders.map((l) => (
        <Note key={l.text} at={l.at + 4} x={axisX - 86} y={l.y - 15}>
          <span style={{ ...label(20, ACCENT), whiteSpace: "nowrap" }}>{l.text}</span>
        </Note>
      ))}
      <Verdict ok={false} x={axisX} y={base + c.h(40)} at={whichAt}>
        two readings, no rule for which
      </Verdict>

      {rows.map((row) => {
        const cx = xs(row.r);
        return (
          <React.Fragment key={row.key}>
            <Note at={row.at - 2} x={rowX0} y={row.cy - row.r(5) - c.h(48)}>
              <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>{row.title}</span>
            </Note>
            <Svg>
              {BUBBLES.values.map((v, i) => {
                const p = ease(frame, row.at + i * 3, 12);
                const lit = v === 1 || v === 5;
                return (
                  <g key={v} opacity={p}>
                    <circle cx={cx[i]} cy={row.cy} r={row.r(v) * p} fill={lit ? BAR : ds("blue", 200)} />
                    <text x={cx[i]} y={row.cy + row.r(5) + 28} textAnchor="middle" style={{ ...label(18, INK_SOFT), ...TABULAR }} fill={INK_SOFT}>
                      {v}
                    </text>
                  </g>
                );
              })}
            </Svg>
          </React.Fragment>
        );
      })}
      <Verdict ok={false} x={rowX0} y={rows[0].cy + rows[0].r(5) + c.h(44)} at={fiveAt}>
        5 looks {BUBBLES.radiusRatio}× as big as 1
      </Verdict>
      <Verdict ok x={rowX0} y={rows[1].cy + rows[1].r(5) + c.h(44)} at={fiveAt + 14}>
        5 looks {BUBBLES.areaRatio}× as big
      </Verdict>
    </>
  );
};

// ── 19. The data-ink ratio ──────────────────────────────────────────────────

const DataInk: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at0 = c.w("r-ink", "The data-ink ratio");
  const tufteAt = c.w("r-ink", "Tufte's idea");
  const spendAt = c.w("r-ink", "spend the ink on the data");
  const deleteAt = c.w("r-ink", "Delete a mark");
  const losesAt = c.w("r-ink", "loses nothing");
  const clutterAt = c.w("r-ink", "it was clutter");

  const x0 = R_X + 60;
  const x1 = R_X + 580;
  const base = c.y(740);
  const top = c.y(420);
  const hi = 100;
  const values = INK_WEEK.map((d) => d.v);
  const days = INK_WEEK.map((d) => d.key);
  const yOf = (v: number) => base - (v / hi) * (base - top);
  const band = (x1 - x0) / values.length;
  // The clutter goes one mark at a time, from "Delete a mark".
  const gone = (k: number) => 1 - ease(frame, deleteAt + k * 7, 10);
  const shadow = gone(0);
  const fill = gone(1);
  const grid = gone(2);
  const frame_ = gone(3);
  const legend = gone(4);

  return (
    <>
      <Svg opacity={ease(frame, at0 - 4, 12)}>
        <rect x={x0 - 30} y={top - 40} width={x1 - x0 + 60} height={base - top + 80} fill={CLUTTER} opacity={0.6 * fill} />
        <rect x={x0 - 30} y={top - 40} width={x1 - x0 + 60} height={base - top + 80} fill="none" stroke={INK_SOFT} strokeWidth={2.4} opacity={frame_} />
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1={x0} x2={x1} y1={yOf(i * 10)} y2={yOf(i * 10)} stroke={INK_SOFT} strokeWidth={1.2} opacity={0.7 * grid} />
        ))}
        {values.map((v, i) => {
          const w = band * 0.68;
          const x = x0 + i * band + (band - w) / 2;
          return <rect key={i} x={x + 8} y={yOf(v) - 8} width={w} height={base - yOf(v) + 8} fill={GRAY} opacity={shadow} />;
        })}
        <g opacity={legend}>
          <rect x={x1 - 118} y={top - 28} width={110} height={36} fill={PAPER} stroke={INK_SOFT} strokeWidth={1.4} />
          <rect x={x1 - 106} y={top - 18} width={16} height={16} fill={BAR} />
          <text x={x1 - 82} y={top - 4} style={{ ...label(17, INK) }} fill={INK}>
            Visits
          </text>
        </g>
      </Svg>
      <BarSet values={values} labels={days} x0={x0} x1={x1} base={base} top={top} lo={0} hi={hi} at={at0} step={1} labelSize={17} />
      <Svg opacity={ease(frame, losesAt, 12)}>
        {values.map((v, i) => (
          <text key={i} x={bandMid(i, values.length, x0, x1)} y={yOf(v) - 10} textAnchor="middle" style={{ ...label(17, BLUE_INK), ...TABULAR }} fill={BLUE_INK}>
            {v}
          </text>
        ))}
      </Svg>

      <Note at={at0} x={R_X + 680} y={c.y(420)} width={R_END - R_X - 680}>
        <span style={{ ...note(26, INK) }}>
          <b>data-ink ratio</b>: the share of the ink that shows data
        </span>
      </Note>
      <Note at={tufteAt} x={R_X + 680} y={c.y(530)} width={R_END - R_X - 680}>
        <span style={{ ...note(24, INK_SOFT) }}>
          Edward Tufte&apos;s idea:<span style={{ opacity: ease(frame, spendAt - 2, 10) }}> spend it on the data</span>
        </span>
      </Note>
      <Note at={deleteAt} x={R_X + 680} y={c.y(620)} width={R_END - R_X - 680}>
        <span style={{ ...note(24, INK) }}>delete a mark: if nothing is lost, it was clutter</span>
      </Note>
      <Verdict ok x={R_X + 680} y={c.y(720)} at={clutterAt}>
        same week, less ink
      </Verdict>
    </>
  );
};

// ── 20. Tableau, Power BI and Looker ────────────────────────────────────────

const Tools: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at0 = c.w("r-tools", "Tableau, Power BI and Looker");
  const biAt = c.w("r-tools", "B I tools");
  const busAt = c.w("r-tools", "business intelligence");
  const transfersAt = c.w("r-tools", "What transfers");
  const framingAt = c.w("r-tools", "framing the question");
  const checkAt = c.w("r-tools", "checking the numbers");
  const cards = [
    { name: "Tableau", at: c.w("r-tools", "Tableau is built for exploring"), text: "built for exploring" },
    { name: "Power BI", at: c.w("r-tools", "Power BI fits the Microsoft stack"), text: "fits the Microsoft stack" },
    { name: "Looker", at: c.w("r-tools", "Looker defines metrics as code"), text: "metrics defined as code" },
  ];
  const cardW = 290;
  const gap = 30;
  return (
    <>
      {cards.map((card, k) => {
        const p = ease(frame, at0 + k * 6, 14);
        if (p <= 0) return null;
        return (
          <div
            key={card.name}
            style={{
              position: "absolute",
              left: R_X + 40 + k * (cardW + gap),
              top: c.y(360),
              width: cardW,
              height: c.h(200),
              boxSizing: "border-box",
              border: `1.5px solid ${HAIRLINE}`,
              borderRadius: 12,
              padding: "24px 26px",
              background: PAPER,
              opacity: p,
              transform: `translateY(${(1 - p) * 12}px)`,
            }}
          >
            <div style={{ ...headline(38), color: INK, whiteSpace: "nowrap" }}>{card.name}</div>
            <div style={{ ...note(24, INK_SOFT), marginTop: 18, opacity: ease(frame, card.at - 2, 12) }}>{card.text}</div>
          </div>
        );
      })}
      <Note at={biAt - 2} x={R_X + 40} y={c.y(600)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
          all three are <b>BI</b> tools<span style={{ opacity: ease(frame, busAt - 2, 10) }}>: business intelligence</span>
        </span>
      </Note>
      <Note at={transfersAt - 2} x={R_X + 40} y={c.y(670)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>what transfers between them:</span>
      </Note>
      <Verdict ok x={R_X + 60} y={c.y(720)} at={framingAt}>
        framing the question
      </Verdict>
      <Verdict ok x={R_X + 60} y={c.y(764)} at={checkAt}>
        checking the numbers
      </Verdict>
    </>
  );
};

// ── 21. Scatter plots and overplotting ──────────────────────────────────────

const Scatter: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at0 = c.w("r-scatter", "A scatter plot shows");
  const pileAt = c.w("r-scatter", "When the points pile up");
  const lowerAt = c.w("r-scatter", "lower the opacity");
  const fourAt = c.w("r-scatter", "over four thousand points");
  const blobAt = c.w("r-scatter", "from a blob");
  const clustersAt = c.w("r-scatter", "two clusters and a bridge");

  const x0 = R_X + 60;
  const x1 = R_X + 500;
  const base = c.y(780);
  const top = c.y(360);
  const lo = 0;
  const hi = 10;
  const px = (v: number) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
  const py = (v: number) => base - ((v - lo) / (hi - lo)) * (base - top);
  const shown = ease(frame, at0 + 4, 20);
  const alpha = 0.95 - 0.88 * ease(frame, lowerAt + 4, 30);
  const count = Math.round(SCATTER.points.length * shown);

  return (
    <>
      <Svg>
        <line x1={x0} x2={x0} y1={base} y2={top} stroke={INK} strokeWidth={1.6} opacity={ease(frame, at0 - 4, 10)} />
        <line x1={x0} x2={x1} y1={base} y2={base} stroke={INK} strokeWidth={1.6} opacity={ease(frame, at0 - 4, 10)} />
        <g style={{ clipPath: `inset(${top}px ${1920 - x1}px ${1080 - base}px ${x0}px)` }}>
          {SCATTER.points.slice(0, count).map(([x, y], i) => (
            <circle key={i} cx={px(x)} cy={py(y)} r={4} fill={BAR} opacity={alpha} />
          ))}
        </g>
      </Svg>
      <Note at={pileAt - 2} x={R_X + 580} y={c.y(400)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>two continuous variables, one dot each</span>
      </Note>
      <Note at={fourAt - 2} x={R_X + 580} y={c.y(460)}>
        <span style={{ ...note(26, INK), whiteSpace: "nowrap", ...TABULAR }}>{SCATTER.n.toLocaleString("en-US")} points</span>
      </Note>
      <Verdict ok={false} x={R_X + 580} y={c.y(540)} at={blobAt}>
        solid dots: one blob
      </Verdict>
      <Verdict ok x={R_X + 580} y={c.y(590)} at={clustersAt}>
        faint dots: two clusters and a bridge
      </Verdict>
    </>
  );
};

// ── 22. Part to whole over time ─────────────────────────────────────────────

const PartWhole: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at0 = c.w("r-part", "for a part of a whole over time");
  const stackAt = c.w("r-part", "use a stacked area or bar");
  const hundredAt = c.w("r-part", "a hundred percent stack for shares");
  const followAt = c.w("r-part", "To follow one segment");
  const ownAt = c.w("r-part", "give it its own line");
  const webAt = c.w("r-part", "web orders are flat all year");
  const hidesAt = c.w("r-part", "which the stack hides");

  const x0 = R_X + 60;
  const x1 = R_X + 500;
  const base = c.y(740);
  const top = c.y(380);
  const hi = 240;
  const { channels, totals } = PARTS;
  const n = totals.length;
  const xAt = (i: number) => x0 + (i * (x1 - x0)) / (n - 1);
  // Absolute, then shares on "a hundred percent", then back to see the web band climb.
  const share = ease(frame, hundredAt, 18) * (1 - ease(frame, followAt - 6, 18));
  const scale = (i: number) => hi + (totals[i] - hi) * share;
  const yOf = (v: number, i: number) => base - (v / scale(i)) * (base - top);
  const cum = channels.map((_, k) => totals.map((_, i) => channels.slice(0, k + 1).reduce((s, ch) => s + ch.values[i], 0)));
  const reveal = ease(frame, stackAt - 2, 22);
  const reach = x0 + (x1 - x0) * reveal;
  const web = channels.findIndex((ch) => ch.key === "Web");
  const webLift = pulse(frame, hidesAt, 40);
  const L = { x0: R_X + 600, x1: R_X + 920 };

  return (
    <>
      <Svg opacity={ease(frame, at0 - 2, 10)}>
        <line x1={x0} x2={x1} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
        <g style={{ clipPath: `inset(0px ${1920 - reach}px 0px 0px)` }}>
          {channels.map((ch, k) => {
            const upper = cum[k].map((v, i) => `${xAt(i)},${yOf(v, i)}`);
            const lower = (k ? cum[k - 1] : totals.map(() => 0)).map((v, i) => `${xAt(i)},${yOf(v, i)}`).reverse();
            const lit = k === web;
            return (
              <polygon
                key={ch.key}
                points={[...upper, ...lower].join(" ")}
                fill={CATS[k]}
                stroke={lit && webLift > 0.02 ? INK : PAPER}
                strokeWidth={lit ? 1.5 + 2 * webLift : 1.5}
              />
            );
          })}
        </g>
        {["Jan", "Dec"].map((m, i) => (
          <text key={m} x={i ? x1 : x0} y={base + 26} textAnchor={i ? "end" : "start"} style={{ ...label(17, INK_SOFT) }} fill={INK_SOFT} opacity={reveal}>
            {m}
          </text>
        ))}
      </Svg>
      {channels.map((ch, k) => {
        const mid = ((k ? cum[k - 1][n - 1] : 0) + cum[k][n - 1]) / 2;
        return (
          <Note key={ch.key} at={stackAt + 10 + k * 2} x={x1 + 12} y={yOf(mid, n - 1) - 13}>
            <span style={{ ...label(18, k === web ? INK : INK_SOFT), whiteSpace: "nowrap", fontWeight: k === web ? 650 : 500 }}>{ch.key}</span>
          </Note>
        );
      })}
      <Note at={hundredAt - 2} x={x0} y={top - c.h(56)}>
        <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>
          {share > 0.5 ? "As shares: a 100% stack" : "Orders, stacked by channel"}
        </span>
      </Note>

      <LineSet
        values={channels[web].values}
        x0={L.x0}
        x1={L.x1}
        base={base}
        top={top}
        lo={0}
        hi={hi}
        at={ownAt - 2}
        color={CATS[web]}
        dots={false}
        width={3.6}
        labels={channels[web].values.map((_, i) => (i === 0 ? "Jan" : i === n - 1 ? "Dec" : ""))}
        labelSize={17}
        edges
      />
      <Note at={ownAt + 4} x={L.x0} y={top - c.h(56)}>
        <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>Web, on its own line</span>
      </Note>
      <Note at={webAt} x={L.x0} y={base - ((channels[web].values[0] / hi) * (base - top)) - c.h(52)}>
        <span style={{ ...label(20, INK), whiteSpace: "nowrap", ...TABULAR }}>
          {channels[web].values[0]} in January, {channels[web].values[n - 1]} in December
        </span>
      </Note>
      <Verdict ok={false} x={x0} y={base + c.h(46)} at={hidesAt}>
        stacked, it seems to climb
      </Verdict>
      <Verdict ok x={L.x0} y={base + c.h(46)} at={webAt + 8}>
        flat all year
      </Verdict>
    </>
  );
};

/**
 * Questions 18 to 22, the short ones, as a numbered list on the left with
 * each answer drawn on the right while it is current: a deep bar read two
 * ways and circles sized by radius against area, a week of bars losing its
 * clutter, the three BI tools, 4,333 points going from a blob to clusters as
 * their opacity falls, and the page's four channels stacked, then web orders
 * on their own line.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h };

  const from = n.beat("rapid-in").from;
  const restAt = n.word("rapid-in", "a sentence or two");
  const finishAt = n.word("rapid-in", "Five to finish");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").from;

  const items: RapidItem[] = [
    { n: 18, label: "3D and area", beat: "r-3d", body: <ThreeD c={c} /> },
    { n: 19, label: "The data-ink ratio", beat: "r-ink", body: <DataInk c={c} /> },
    { n: 20, label: "Tableau, Power BI, Looker", beat: "r-tools", body: <Tools c={c} /> },
    { n: 21, label: "Scatter plots, overplotting", beat: "r-scatter", body: <Scatter c={c} /> },
    { n: 22, label: "Part to whole over time", beat: "r-part", body: <PartWhole c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));
  const lastAt = n.beat("r-part").from;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-chime" at={end} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 18 to 22</Kicker>
        <Headline lead="A sentence or two," turn="five to finish." at={restAt - 4} turnAt={finishAt - 2} size={64} />
        <Spot id="da-visualization-duck" at={from + 6} left={1590} top={y(96)} width={210} height={140} />

        {/* The last answer stays up through the bridge, so its body sits outside the list. */}
        <RapidFire
          items={items.map((it) => (it.n === 22 ? { ...it, body: undefined } : it))}
          x={X0}
          top={y(LIST_TOP) + h(40)}
          rowH={h(ROW)}
          width={560}
          at={finishAt}
          end={end}
        />
        <Fade from={lastAt - 6}>
          <PartWhole c={c} />
        </Fade>

        <NextLine at={nextAt} x={R_X + 40} y={y(840)} width={960}>
          A/B testing and metrics
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};

const Fade: React.FC<{ from: number; children: React.ReactNode }> = ({ from, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, from, 8);
  return o > 0 ? <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill> : null;
};

