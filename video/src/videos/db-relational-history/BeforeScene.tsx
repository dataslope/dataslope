import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { type Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { ADA, CUSTOMERS, ORDERS_OF } from "./data";
import { Cross, Headline, lerp, Mark, pulse, RecordNode, Spot, Strike, Svg, Wire } from "./parts";

const NODE_H = 54;
const ROOT = { x: 1040, w: 210 };
const PARENT_W = 140;
const CHILD_W = 104;
/** The customers' slots, left to right, and how far each child sits from its parent. */
const SLOT_X = [700, 1040, 1380];
const CHILD_DX = [-85, 85];

/** A program's route through the tree, as the program card spells it. */
const STEPS = (first: string, child: string, next: string) => [
  "start at customers",
  `down to child 1: ${first}`,
  `down to its first order: ${child}`,
  `across to the next: ${next}`,
];

/**
 * Part 1, before tables: the lesson's customers and orders filed as IMS filed
 * them, each record under its parent, and a program that finds Ada's orders
 * by walking pointers down from the top. Network databases add more pointers;
 * the program still has to know its route. Reorganize the file and the route
 * leads somewhere else.
 */
export const BeforeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const ROOT_Y = y(380);
  const PARENT_Y = y(510);
  const CHILD_Y = y(650);

  // ── Cues ──
  const treesFrom = n.beat("trees").from;
  const treesAt = n.word("trees", "trees");
  const imsAt = n.word("trees", "IMS");
  const saturnAt = n.word("trees", "Saturn Five");
  const filedAt = n.word("trees", "filed");
  const parentAt = n.word("trees", "parent");
  const adasAt = n.word("walk", "Ada's");
  const startsAt = n.word("walk", "starts");
  const topAt = n.word("walk", "top");
  const followsAt = n.word("walk", "follows");
  const pointersAt = n.word("walk", "pointers");
  const downAt = n.word("walk", "down");
  const networkAt = n.word("route", "Network");
  const webAt = n.word("route", "web");
  const ruleAt = n.word("route", "rule");
  const knowAt = n.word("route", "had to know");
  const routeAt = n.word("route", "ROUTE");
  const reorgAt = n.word("broke", "reorganize");
  const everyAt = n.word("broke", "every program");
  const walkedAt = n.word("broke", "walked");
  const breaksAt = n.word("broke", "breaks");

  // ── The file reorganized: the first customer's subtree and the last one's
  // trade places, carrying their orders; the pointers from the top stay put.
  const swap = ease(frame, reorgAt - 2, 30);
  const arc = Math.sin(swap * Math.PI);
  const span = SLOT_X[2] - SLOT_X[0];
  const shift = (i: number): Pt => (i === 0 ? [span * swap, -arc * 60] : i === 2 ? [-span * swap, arc * 40] : [0, 0]);

  const parentBottom = (i: number): Pt => [SLOT_X[i] + shift(i)[0], PARENT_Y + NODE_H / 2 + shift(i)[1]];
  const childX = (i: number, k: number) => SLOT_X[i] + CHILD_DX[k] + shift(i)[0];
  const childY = (i: number) => CHILD_Y + shift(i)[1];
  const rootBottom = ROOT_Y + NODE_H / 2;
  const parentTop = PARENT_Y - NODE_H / 2;
  const mid1 = (rootBottom + parentTop) / 2;
  const toParent = (i: number): Pt[] =>
    SLOT_X[i] === ROOT.x
      ? [
          [ROOT.x, rootBottom],
          [ROOT.x, parentTop],
        ]
      : [
          [ROOT.x + (i - 1) * 30, rootBottom],
          [ROOT.x + (i - 1) * 30, mid1],
          [SLOT_X[i], mid1],
          [SLOT_X[i], parentTop],
        ];
  const toChild = (i: number, k: number): Pt[] => {
    const [px, pb] = parentBottom(i);
    const top = childY(i) - NODE_H / 2;
    const mid = (pb + top) / 2;
    const cx = childX(i, k);
    return [
      [px + (k ? 18 : -18), pb],
      [px + (k ? 18 : -18), mid],
      [cx, mid],
      [cx, top],
    ];
  };
  const twin = (i: number): Pt[] => [
    [childX(i, 0) + CHILD_W / 2, childY(i)],
    [childX(i, 1) - CHILD_W / 2, childY(i)],
  ];

  // The route the program knows, in fixed page positions: down the pointer
  // to child 1, down to its first order, across to the next. It stops at
  // each record's edge, and runs under the records between.
  const parentBottomY = PARENT_Y + NODE_H / 2;
  const childTopY = CHILD_Y - NODE_H / 2;
  const mid2 = (parentBottomY + childTopY) / 2;
  const fx = SLOT_X[0] + CHILD_DX[0];
  const nx = SLOT_X[0] + CHILD_DX[1];
  const route: Pt[] = [
    [ROOT.x - 30, rootBottom],
    [ROOT.x - 30, mid1],
    [SLOT_X[0], mid1],
    [SLOT_X[0], parentTop],
    [SLOT_X[0], PARENT_Y],
    [SLOT_X[0] - 18, PARENT_Y],
    [SLOT_X[0] - 18, mid2],
    [fx, mid2],
    [fx, childTopY],
    [fx, CHILD_Y],
    [fx + CHILD_W / 2, CHILD_Y],
    [nx - CHILD_W / 2, CHILD_Y],
  ];
  // Where each leg ends: child 1's top, its first order's top, the next order's edge.
  const legs = [0, 3, 8, 11];
  const lens = route.slice(1).map((q, i) => Math.hypot(q[0] - route[i][0], q[1] - route[i][1]));
  const cum = [0, ...lens.map((_, i) => lens.slice(0, i + 1).reduce((a, b) => a + b, 0))];
  // How far along the route the program has walked: to child 1 on
  // "follows", its first order on "pointers", the next on "down".
  const walked =
    cum[legs[1]] * ease(frame, followsAt - 4, 16) +
    (cum[legs[2]] - cum[legs[1]]) * ease(frame, pointersAt - 2, 14) +
    (cum[legs[3]] - cum[legs[2]]) * ease(frame, downAt - 2, 12);
  const at = (d: number): Pt => {
    for (let i = 0; i < lens.length; i++) {
      if (d <= cum[i + 1] || i === lens.length - 1) {
        const f = lens[i] ? Math.min(1, Math.max(0, (d - cum[i]) / lens[i])) : 0;
        return [lerp(route[i][0], route[i + 1][0], f), lerp(route[i][1], route[i + 1][1], f)];
      }
    }
    return route[route.length - 1];
  };
  const passed = route.filter((_, i) => cum[i] < walked);
  const trail: Pt[] = [...(passed.length ? passed : [route[0]]), at(walked)];
  const cursorIn = ease(frame, topAt - 6, 10);
  const [cx, cy] = at(walked);
  const routeSwell = pulse(frame, routeAt - 2, 22);
  const broken = ease(frame, breaksAt - 2, 10);

  const first = CUSTOMERS[0];
  const last = CUSTOMERS[2];
  const firstOrders = ORDERS_OF(first.id).map((o) => String(o.id));
  const lastOrders = ORDERS_OF(last.id).map((o) => String(o.id));
  const steps = STEPS(first.name, firstOrders[0], firstOrders[1]);
  const stepAt = [topAt - 4, followsAt, pointersAt, downAt];

  // Network databases: more pointers, between customers and along orders.
  const webLinks: { points: Pt[]; at: number }[] = [
    { points: [[SLOT_X[0] + PARENT_W / 2, PARENT_Y], [SLOT_X[1] - PARENT_W / 2, PARENT_Y]], at: webAt - 6 },
    { points: [[SLOT_X[1] + PARENT_W / 2, PARENT_Y], [SLOT_X[2] - PARENT_W / 2, PARENT_Y]], at: webAt - 2 },
    ...[0, 1].flatMap((k) =>
      [0, 1].map((i) => {
        const depth = CHILD_Y + NODE_H / 2 + (k ? 54 : 28);
        const from = SLOT_X[i] + CHILD_DX[k] + 10;
        const to = SLOT_X[i + 1] + CHILD_DX[k] - 10;
        return {
          points: [
            [from, CHILD_Y + NODE_H / 2],
            [from, depth],
            [to, depth],
            [to, CHILD_Y + NODE_H / 2],
          ] as Pt[],
          at: webAt + 2 + (k * 2 + i) * 4,
        };
      }),
    ),
  ];

  return (
    <AbsoluteFill>
      {/* ── Sound: the records filing in, the rocket, the walk, the web, the swap ── */}
      <Sfx name="el-pop" at={treesAt - 2} level={-30} />
      <Sfx name="el-sprinkle" at={filedAt - 2} level={-34} />
      <Sfx name="el-pop" at={saturnAt - 4} level={-29} />
      <Sfx name="el-tap" at={followsAt - 4} level={-29} />
      <Sfx name="el-tap" at={pointersAt - 2} level={-29} />
      <Sfx name="el-tap" at={downAt - 2} level={-30} />
      <Sfx name="el-pencil" at={webAt - 6} level={-34} />
      <Sfx name="el-whoosh" at={reorgAt - 2} level={-33} />
      <Sfx name="el-scratch" at={walkedAt - 2} level={-31} />

      <Headline at={treesFrom - 4} lead="In the sixties, data lived in trees." out={knowAt - 8} />
      <Headline at={knowAt - 2} lead="The program had to know" turn="the route." turnAt={routeAt - 4} out={reorgAt - 6} />
      <Headline at={reorgAt} lead="Reorganize the file," turn="and it breaks." turnAt={breaksAt - 4} />

      <FigLabel n="1" title="Every record filed under its parent, as IMS stored them" at={treesAt - 2} x={560} y={y(290)} />

      {/* ── The rocket IMS was built for, then the program that walks the tree ── */}
      <Spot id="db-relational-history-rocket" at={saturnAt - 6} out={startsAt - 4} left={180} top={y(300)} width={170} height={400} />
      <Ink at={imsAt - 2} dur={14} out={startsAt - 4} style={{ left: 96, top: y(740), whiteSpace: "nowrap" }}>
        <div style={{ ...label(22, INK) }}>IBM&apos;s IMS, first shipped 1967</div>
        <div style={{ ...body(23, true), marginTop: 6 }}>built to track Saturn V parts</div>
      </Ink>

      <Ink at={startsAt - 2} dur={14} style={{ left: 96, top: y(340), whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, ACCENT_INK) }}>The program</span>
      </Ink>
      {steps.map((s, i) => (
        <Ink key={i} at={stepAt[i]} dur={12} style={{ left: 96, top: y(392 + i * 56), whiteSpace: "nowrap" }}>
          <span style={{ ...note(21, INK), fontFamily: MONO }}>
            <span style={{ color: INK_SOFT }}>{i + 1}&nbsp;&nbsp;</span>
            {i === 1 ? (
              <Strike at={walkedAt}>
                <Mark at={routeAt + i * 3} out={reorgAt}>
                  {s}
                </Mark>
              </Strike>
            ) : (
              <Mark at={routeAt + i * 3} out={reorgAt}>
                {s}
              </Mark>
            )}
          </span>
        </Ink>
      ))}
      <Ink at={everyAt} dur={12} style={{ left: 126, top: y(392 + 4 * 56), whiteSpace: "nowrap" }}>
        <span style={{ ...note(21, ACCENT_INK), fontWeight: 650 }}>
          child 1 is now {last.name}: orders {lastOrders.join(" and ")}
        </span>
      </Ink>

      {/* ── The pointers ── */}
      {[0, 1, 2].map((i) => (
        <Wire key={`p${i}`} points={toParent(i)} at={treesAt + 4 + i * 4} />
      ))}
      {[0, 1, 2].flatMap((i) =>
        [0, 1].map((k) => <Wire key={`c${i}${k}`} points={toChild(i, k)} at={filedAt + i * 6 + k * 3} />),
      )}
      {[0, 1, 2].map((i) => (
        <Wire key={`t${i}`} points={twin(i)} at={parentAt + i * 3} />
      ))}
      {webLinks.map((l, i) => (
        <Wire key={`w${i}`} points={l.points} at={l.at} dur={16} color={INK_SOFT} dash="6 5" width={2} dim={knowAt + 4} />
      ))}

      {/* ── The route, walked: a red trail under the records ── */}
      {cursorIn > 0 ? (
        <Svg opacity={cursorIn}>
          <path
            d={trail.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ")}
            fill="none"
            stroke={ACCENT}
            strokeWidth={4.5 + routeSwell * 3}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={broken > 0 ? "10 8" : undefined}
            opacity={0.85}
          />
        </Svg>
      ) : null}

      {/* ── The records ── */}
      <RecordNode x={ROOT.x} y={ROOT_Y} w={ROOT.w} h={NODE_H} text="customers" at={treesAt - 2} swell={pulse(frame, topAt - 4, 18)} />
      {CUSTOMERS.map((c, i) => (
        <React.Fragment key={c.id}>
          <RecordNode
            x={SLOT_X[i]}
            y={PARENT_Y}
            dx={shift(i)[0]}
            dy={shift(i)[1]}
            w={PARENT_W}
            h={NODE_H}
            text={c.name}
            at={treesAt + 4 + i * 4}
            swell={pulse(frame, parentAt + i * 4, 16)}
            wash={c.id === ADA.id ? { at: adasAt - 2, color: HIGHLIGHT, out: knowAt } : undefined}
          />
          {ORDERS_OF(c.id).map((o, k) => (
            <RecordNode
              key={o.id}
              x={SLOT_X[i] + CHILD_DX[k]}
              y={CHILD_Y}
              dx={shift(i)[0]}
              dy={shift(i)[1]}
              w={CHILD_W}
              h={NODE_H}
              text={String(o.id)}
              at={filedAt + i * 6 + k * 3 + 4}
              wash={
                c.id === ADA.id
                  ? { at: adasAt + 2 + k * 3, color: HIGHLIGHT, out: knowAt }
                  : i === 2
                    ? { at: breaksAt - 2, color: `color-mix(in srgb, ${ACCENT} 22%, transparent)` }
                    : undefined
              }
            />
          ))}
        </React.Fragment>
      ))}

      {/* The program's cursor, over the records. */}
      {cursorIn > 0 ? (
        <Svg opacity={cursorIn * (1 - broken)}>
          <circle cx={cx} cy={cy} r={10 + routeSwell * 4} fill={ACCENT} stroke="var(--ds-red-ink)" strokeWidth={2} />
        </Svg>
      ) : null}
      <Cross x={nx} y={childTopY - 26} at={breaksAt - 2} />

      {/* The web of extra pointers, and the rule that held. */}
      <div style={{ position: "absolute", left: 560, top: y(818), display: "flex", gap: "0.3em", ...note(22, INK_SOFT) }}>
        <Ink at={networkAt - 2} dur={14} out={reorgAt - 6} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Network databases: more pointers,
        </Ink>
        <Ink at={ruleAt - 2} dur={14} out={reorgAt - 6} style={{ position: "relative", whiteSpace: "nowrap", color: INK, fontWeight: 600 }}>
          and still a route.
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
