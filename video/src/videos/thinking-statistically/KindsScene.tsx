import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, body, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { ZIPS } from "./data";
import { lerp, Mark, pulse, RAW, STAT_INK, Svg } from "./parts";

const PARENT_Y = 310;
const RULE_Y = 446;
const LEAF_Y = 494;
const PICTURE_Y = 690;
const LEAF_W = 330;
/** Two parents, two leaves each. */
const PARENTS = [
  { x: 160, name: "Categorical", what: "Labels: which group something is in", more: "" },
  { x: 1000, name: "Numerical", what: "Quantities: how much,", more: " or how many" },
];
const LEAVES = [
  { x: 160, name: "Nominal", what: "No order", like: "country, color" },
  { x: 530, name: "Ordinal", what: "Ordered, with uneven gaps", like: "shirt size, a 1 to 5 rating" },
  { x: 1000, name: "Discrete", what: "Counts of whole things", like: "logins, defects" },
  { x: 1370, name: "Continuous", what: "Any value in a range", like: "price, latency" },
];
const RULE_W = 700;

/** Shirt sizes on a line, at gaps nobody measured. */
const SIZES = [
  { s: "S", x: 0 },
  { s: "M", x: 64 },
  { s: "L", x: 176 },
  { s: "XL", x: 226 },
];
const LAST_X = SIZES[SIZES.length - 1].x;
/** Three country labels, set down anyhow; "no order" shuffles them. */
const COUNTRIES = [
  ["US", 0, 18],
  ["CA", 104, -10],
  ["MX", 214, 24],
] as const;
const SHUFFLED = [2, 0, 1];
const EVEN_X = SIZES.map((_, k) => (k * LAST_X) / (SIZES.length - 1));

/**
 * Part 3: every column is categorical or numerical, and each splits once
 * more. Each leaf carries a small picture of what makes it what it is.
 */
export const KindsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const kindsFrom = n.beat("kinds").from;
  const categoricalAt = n.word("kinds", "Categorical");
  const numericalAt = n.word("kinds", "Numerical");
  const muchAt = n.word("kinds", "how much");
  const nominalAt = n.word("labels", "Nominal");
  const ordinalAt = n.word("labels", "Ordinal");
  const unevenAt = n.word("labels", "uneven");
  const countsAt = n.word("numbers", "counts");
  const measurementsAt = n.word("numbers", "measurements");
  const twoKindsAt = n.word("kinds", "two kinds");
  const whichGroupAt = n.word("kinds", "which group");
  const manyAt = n.word("kinds", "how many");
  const splitAt = [n.word("labels", "split"), n.word("numbers", "split")];
  const noOrderAt = n.word("labels", "no order");
  const doAt = n.word("labels", "do");
  const sizesAt = n.word("labels", "shirt sizes");
  const gapsAt = n.word("labels", "gaps");
  const likeAt = [
    n.word("labels", "like countries"),
    n.word("labels", "like shirt sizes"),
    n.word("numbers", "like logins"),
    n.word("numbers", "like price"),
  ];
  const plainlyAt = n.word("trap-in", "plainly");
  const fewAt = n.word("trap-in", "A few");
  const dontAt = n.word("trap-in", "don't");

  const parentAt = [categoricalAt, numericalAt];
  const leafAt = [nominalAt, ordinalAt, countsAt, measurementsAt];
  const pic = leafAt.map((at) => ease(frame, at + 4, 14));
  // The sizes arrive evenly spaced on "Ordinal" and slide to their uneven
  // gaps on "uneven". (Scaling the positions from zero instead stacked all
  // four labels on one spot until then.)
  const gaps = ease(frame, unevenAt - 4, 16);
  const sizeX = (k: number) => EVEN_X[k] + (SIZES[k].x - EVEN_X[k]) * gaps;
  // The sizes arrive one at a time, from "do" to "shirt sizes".
  const sizeIn = (k: number) => ease(frame, lerp(doAt - 2, sizesAt + 4, k / (SIZES.length - 1)), 10);
  const shuffle = ease(frame, noOrderAt - 2, 22);
  // "A few don't": a zip code, undecided between the two sides.
  const zipIn = ease(frame, fewAt - 4, 16);
  const sway = Math.sin(((frame - fewAt) / 72) * Math.PI * 2) * 34 * ease(frame, fewAt + 6, 30);

  return (
    <AbsoluteFill>
      {/* ── Sound: the two branches, the sizes sliding apart, the counts, the zip code ── */}
      <Sfx name="el-pencil" at={twoKindsAt - 2} level={-35} />
      <Sfx name="el-pencil" at={twoKindsAt + 6} level={-35} />
      <Sfx name="el-whoosh" at={unevenAt - 4} level={-33} />
      <Sfx name="el-sprinkle" at={leafAt[2] + 4} level={-34} />
      <Sfx name="el-pop" at={fewAt - 4} level={-30} />

      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={kindsFrom - 4} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Which group,
        </Ink>
        <Ink at={muchAt - 6} dur={18} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          or how much?
        </Ink>
      </div>

      {/* ── The two parents ── */}
      {PARENTS.map((p, i) => (
        <React.Fragment key={p.name}>
          <Ink at={parentAt[i] - 4} dur={16} style={{ left: p.x, top: y(PARENT_Y), whiteSpace: "nowrap" }}>
            <div style={{ ...body(52, true), color: INK }}>{p.name}</div>
            {/* What it says arrives on "which group" and "how much", "or how many". */}
            <div style={{ ...note(25, INK_SOFT), marginTop: 12, opacity: ease(frame, (i ? muchAt : whichGroupAt) - 4, 12) }}>
              {p.what}
              <span style={{ opacity: ease(frame, manyAt - 2, 10) }}>{p.more}</span>
            </div>
          </Ink>
          {/* "one of two kinds": two places, ruled before they are named. */}
          <div
            style={{
              position: "absolute",
              left: p.x,
              top: y(RULE_Y),
              width: RULE_W * ease(frame, twoKindsAt - 2 + i * 8, 18),
              height: 2,
              background: INK,
            }}
          />
          {/* "split": a branch down to each of the two leaves below. */}
          {[LEAVES[i * 2].x, LEAVES[i * 2 + 1].x].map((x) => (
            <div
              key={x}
              style={{
                position: "absolute",
                left: x,
                top: y(RULE_Y),
                width: 2,
                height: 26 * ease(frame, splitAt[i] - 2 + (x === p.x ? 0 : 6), 12),
                background: INK,
              }}
            />
          ))}
        </React.Fragment>
      ))}

      {/* ── The four leaves ── */}
      {LEAVES.map((l, i) => (
        <Ink key={l.name} at={leafAt[i] - 4} dur={16} style={{ left: l.x, top: y(LEAF_Y), width: LEAF_W }}>
          {/* "tell you plainly which kind they are": each name, in turn. */}
          <div
            style={{
              ...body(40, true),
              color: INK,
              transform: `scale(${1 + pulse(frame, plainlyAt - 2 + i * 5, 16) * 0.09})`,
              transformOrigin: "0 70%",
            }}
          >
            {l.name}
          </div>
          <div style={{ ...note(23, INK), fontWeight: 650, marginTop: 12 }}>{l.what}</div>
          <div style={{ ...note(23, INK_SOFT), marginTop: 6 }}>
            <Mark at={likeAt[i] - 2} out={likeAt[i] + 40}>
              like {l.like}
            </Mark>
          </div>
        </Ink>
      ))}

      {/* Nominal: labels with no order, set down anyhow, and shuffled on "no order". */}
      {COUNTRIES.map(([c], k) => (
        <div
          key={c}
          style={{
            position: "absolute",
            left: LEAVES[0].x + lerp(COUNTRIES[k][1], COUNTRIES[SHUFFLED[k]][1], shuffle),
            top: y(PICTURE_Y) + lerp(COUNTRIES[k][2], COUNTRIES[SHUFFLED[k]][2], shuffle) - Math.sin(shuffle * Math.PI) * 22,
            opacity: ease(frame, leafAt[0] + 4 + k * 4, 10),
            border: `2px solid ${INK}`,
            borderRadius: 8,
            padding: "6px 16px",
            background: PAPER,
            ...note(26, INK),
            fontWeight: 650,
          }}
        >
          {c}
        </div>
      ))}

      {/* Ordinal: an order, at gaps nobody measured. */}
      <Svg>
        <line
          x1={LEAVES[1].x}
          x2={LEAVES[1].x + (LAST_X + 20) * pic[1]}
          y1={y(PICTURE_Y) + 44}
          y2={y(PICTURE_Y) + 44}
          stroke={INK}
          strokeWidth={1.6}
        />
        {SIZES.map((_, k) => (
          <circle key={k} cx={LEAVES[1].x + 10 + sizeX(k)} cy={y(PICTURE_Y) + 44} r={7 * sizeIn(k)} fill={INK} />
        ))}
        {/* "the gaps between them": each gap bracketed, stretching as they go uneven. */}
        {SIZES.slice(1).map((_, k) => {
          const a = LEAVES[1].x + 10 + sizeX(k) + 9;
          const b = LEAVES[1].x + 10 + sizeX(k + 1) - 9;
          const g = ease(frame, gapsAt - 2 + k * 4, 10);
          const by = y(PICTURE_Y) + 62;
          return (
            <path
              key={k}
              d={`M${a},${by - 6} L${a},${by} L${b},${by} L${b},${by - 6}`}
              fill="none"
              stroke={INK_SOFT}
              strokeWidth={1.8}
              opacity={g}
            />
          );
        })}
      </Svg>
      {SIZES.map(({ s }, k) => (
        <div
          key={s}
          style={{
            position: "absolute",
            left: LEAVES[1].x + 10 + sizeX(k),
            top: y(PICTURE_Y) - 4,
            opacity: sizeIn(k),
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ ...label(24, INK), display: "inline-block", transform: "translateX(-50%)" }}>{s}</span>
        </div>
      ))}

      {/* Discrete: whole things you can count. */}
      <Svg>
        {Array.from({ length: 7 }, (_, k) => {
          const a = ease(frame, leafAt[2] + 4 + k * 2.5, 8);
          if (a <= 0) return null;
          return <circle key={k} cx={LEAVES[2].x + 14 + k * 38} cy={y(PICTURE_Y) + 36} r={13 * a} fill={RAW} stroke={INK} strokeWidth={1.6} />;
        })}
      </Svg>

      {/* Continuous: a ruler, with a value anywhere along it. */}
      <Svg opacity={pic[3]}>
        <line x1={LEAVES[3].x} x2={LEAVES[3].x + 300} y1={y(PICTURE_Y) + 52} y2={y(PICTURE_Y) + 52} stroke={INK} strokeWidth={1.6} />
        {Array.from({ length: 31 }, (_, k) => (
          <line
            key={k}
            x1={LEAVES[3].x + k * 10}
            x2={LEAVES[3].x + k * 10}
            y1={y(PICTURE_Y) + 52}
            y2={y(PICTURE_Y) + 52 - (k % 10 === 0 ? 20 : k % 5 === 0 ? 13 : 7)}
            stroke={INK}
            strokeWidth={1.2}
          />
        ))}
        <path
          d={`M${LEAVES[3].x + 10 + 233 * pic[3]},${y(PICTURE_Y) + 22} l-9,-14 h18 z`}
          fill={BAR}
        />
      </Svg>

      {/* "A few don't": a zip code, between the two kinds. */}
      {zipIn > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 930 + sway,
            top: y(PICTURE_Y + 116) + (1 - zipIn) * 20,
            transform: "translateX(-50%)",
            opacity: zipIn,
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              border: `2px solid ${INK}`,
              borderRadius: 8,
              padding: "6px 14px",
              background: PAPER,
              fontFamily: MONO,
              fontSize: 26,
              color: INK,
            }}
          >
            {ZIPS.zip}
          </span>
          <span style={{ ...body(40, true), color: STAT_INK, opacity: ease(frame, dontAt - 2, 10) }}>?</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
