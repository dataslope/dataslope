import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, body, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { RAW, STAT_INK, Svg } from "./parts";

const PARENT_Y = 310;
const RULE_Y = 446;
const LEAF_Y = 494;
const PICTURE_Y = 690;
const LEAF_W = 330;
/** Two parents, two leaves each. */
const PARENTS = [
  { x: 160, name: "Categorical", what: "Labels: which group something is in" },
  { x: 1000, name: "Numerical", what: "Quantities: how much, or how many" },
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

  const parentAt = [categoricalAt, numericalAt];
  const leafAt = [nominalAt, ordinalAt, countsAt, measurementsAt];
  const pic = leafAt.map((at) => ease(frame, at + 4, 14));
  const gaps = ease(frame, unevenAt - 4, 16);

  return (
    <AbsoluteFill>
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
            <div style={{ ...note(25, INK_SOFT), marginTop: 12 }}>{p.what}</div>
          </Ink>
          <div
            style={{
              position: "absolute",
              left: p.x,
              top: y(RULE_Y),
              width: RULE_W * ease(frame, parentAt[i], 18),
              height: 2,
              background: INK,
            }}
          />
        </React.Fragment>
      ))}

      {/* ── The four leaves ── */}
      {LEAVES.map((l, i) => (
        <Ink key={l.name} at={leafAt[i] - 4} dur={16} style={{ left: l.x, top: y(LEAF_Y), width: LEAF_W }}>
          <div style={{ ...body(40, true), color: INK }}>{l.name}</div>
          <div style={{ ...note(23, INK), fontWeight: 650, marginTop: 12 }}>{l.what}</div>
          <div style={{ ...note(23, INK_SOFT), marginTop: 6 }}>like {l.like}</div>
        </Ink>
      ))}

      {/* Nominal: labels with no order, set down anyhow. */}
      {(
        [
          ["US", 0, 18],
          ["CA", 104, -10],
          ["MX", 214, 24],
        ] as const
      ).map(([c, dx, dy], k) => (
        <div
          key={c}
          style={{
            position: "absolute",
            left: LEAVES[0].x + dx,
            top: y(PICTURE_Y) + dy,
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
      <Svg opacity={pic[1]}>
        <line
          x1={LEAVES[1].x}
          x2={LEAVES[1].x + SIZES[SIZES.length - 1].x * gaps + 20}
          y1={y(PICTURE_Y) + 44}
          y2={y(PICTURE_Y) + 44}
          stroke={INK}
          strokeWidth={1.6}
        />
        {SIZES.map(({ x }, k) => (
          <circle key={k} cx={LEAVES[1].x + 10 + x * gaps} cy={y(PICTURE_Y) + 44} r={7} fill={INK} />
        ))}
      </Svg>
      {SIZES.map(({ s, x }) => (
        <div
          key={s}
          style={{
            position: "absolute",
            left: LEAVES[1].x + 10 + x * gaps,
            top: y(PICTURE_Y) - 4,
            opacity: pic[1],
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
    </AbsoluteFill>
  );
};
