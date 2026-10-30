import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { JOIN, thousands } from "./data";
import { Drift, Listing, listingHeight, MARK_OK, PlanBox, X0 } from "./parts";

const TOP = 300;
const PLAN = 20;
const R_X = 1200;
const DIAG_Y = 780;
const PANEL_W = 520;

const keyText = (size: number, color: string = INK) => svgText({ fontFamily: MONO, fontSize: size, fontWeight: 600, color });

/** A small box with a centred label, in SVG. */
const Box: React.FC<{ x: number; y: number; w: number; h: number; text: string; fill?: string; stroke?: string; ink?: string; p: number }> = ({
  x,
  y,
  w,
  h,
  text,
  fill = PAPER,
  stroke = INK_SOFT,
  ink = INK,
  p,
}) => (
  <g opacity={p}>
    <rect x={x} y={y} width={w} height={h} rx={5} fill={fill} stroke={stroke} strokeWidth={1.5} />
    <text x={x + w / 2} y={y + h / 2 + 7} textAnchor="middle" style={svgText({ ...label(20, ink) })}>
      {text}
    </text>
  </g>
);

/**
 * Question 8. Right: the year's revenue by region with a December filter,
 * and left the plan Postgres printed for it: the filter removes 915,301
 * orders before the Hash Join, so 84,699 reach it, and the Hash is built
 * from the 50,000 customers. Then, drawn under it, the three strategies the
 * answer names: a hash join (build a table from the small side, stream the
 * big one through it), a sort-merge join (two sorted runs walked together),
 * and across machines, a broadcast of the small table or both tables
 * bucketed on the key.
 */
export const JoinScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("join").from;
  const qAt = n.word("join", "Question eight");
  const textAt = n.word("join", "How do you join");
  const smallerAt = n.word("join", "make them smaller");
  const decAt = n.word("join", "Filter to December");
  const reachAt = n.word("join", "eighty-four thousand orders reach");
  const millionAt = n.word("join", "instead of a million");
  const strategyAt = n.word("join-hash", "pick the strategy");
  const buildAt = n.word("join-hash", "builds a hash table");
  const customersAt = n.word("join-hash", "fifty thousand customers");
  const streamAt = n.word("join-hash", "streams the orders past it");
  const defaultAt = n.word("join-hash", "the usual default");
  const mergeAt = n.word("join-merge", "A sort-merge join");
  const walksAt = n.word("join-merge", "walks them together");
  const sortedAt = n.word("join-merge", "already sorted");
  const memoryAt = n.word("join-merge", "too big to hash in memory");
  const machinesAt = n.word("join-dist", "Across many machines");
  const movingAt = n.word("join-dist", "moving rows");
  const broadcastAt = n.word("join-dist", "Broadcast a small table");
  const bucketAt = n.word("join-dist", "bucket both tables");
  const togetherAt = n.word("join-dist", "already sit together");
  const end = n.beat("join-dist").to;

  const diagY = y(DIAG_Y);
  const p1 = X0;
  const p2 = X0 + PANEL_W + 70;
  const p3 = X0 + 2 * (PANEL_W + 70);

  // The hash join: customers build buckets; orders stream through them.
  const buckets = 6;
  const bucketX = (i: number) => p1 + 210 + i * 46;
  const streamP = (k: number) => ease(frame, streamAt + k * 4, 22);

  // The sort-merge join: two sorted runs, a pointer on each, walking down.
  const left = [1, 2, 2, 4, 5];
  const right = [1, 2, 3, 4, 5];
  const walk = Math.min(left.length - 1, Math.max(0, ((frame - walksAt) / 8) | 0));

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={decAt + 6} level={-34} />
      <Sfx name="el-pop" at={reachAt + 2} level={-32} />
      <Sfx name="el-sprinkle" at={streamAt + 2} level={-34} />
      <Sfx name="el-pencil" at={walksAt} level={-35} />
      <Sfx name="el-whoosh" at={broadcastAt + 2} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you join two large tables efficiently at scale?
        </QuestionCard>

        {/* ── Shrink first: the December filter, and the plan ── */}
        <Note at={smallerAt} x={R_X} y={y(TOP) - h(46)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Shrink both sides before the join</span>
        </Note>
        <Listing lines={JOIN.december} x={R_X} top={y(TOP)} width={600} size={20} at={smallerAt + 2} marks={[{ line: "WHERE", at: decAt + 4 }]} />
        <PlanBox
          lines={JOIN.decemberPlan}
          x={X0}
          top={y(TOP)}
          width={1020}
          size={PLAN}
          step={2}
          at={decAt + 2}
          dim={mergeAt}
          marks={[
            { line: "Rows Removed", at: decAt + 18 },
            { line: "Seq Scan on orders o", text: "actual rows=84699.00", at: reachAt, color: MARK_OK },
            { line: "Hash Join", text: "Hash Join", at: buildAt - 4 },
            { line: "Seq Scan on customers c", text: "Seq Scan on customers c", at: customersAt },
          ]}
        />
        <Note at={reachAt + 4} x={R_X} y={y(TOP) + listingHeight(JOIN.december.length, 20) + h(24)}>
          <div style={{ ...label(21, INK_SOFT) }}>orders into the join</div>
          <div style={{ ...note(40, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Num>{thousands(JOIN.probe)}</Num>
            <span style={{ ...note(24, INK_SOFT), marginLeft: 14, opacity: ease(frame, millionAt, 10) }}>
              not <Num>{thousands(JOIN.allProbe)}</Num>
            </span>
          </div>
        </Note>

        {/* ── Three strategies, drawn ── */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {/* 1. Hash join */}
          <g opacity={ease(frame, strategyAt, 12)}>
            <text x={p1} y={diagY - 16} style={svgText(label(21, INK))}>
              Hash join
              <tspan style={svgText(note(20, INK_SOFT))} opacity={ease(frame, defaultAt, 10)}>
                {"  the usual default"}
              </tspan>
            </text>
            <Box x={p1} y={diagY + 10} w={170} h={50} text={`customers ${thousands(JOIN.build / 1000)}k`} p={ease(frame, customersAt, 10)} stroke={BAR} ink={BLUE_INK} />
            {Array.from({ length: buckets }, (_, i) => (
              <rect
                key={i}
                x={bucketX(i)}
                y={diagY + 10}
                width={38}
                height={50}
                rx={4}
                fill={`color-mix(in srgb, ${BAR} ${30 * ease(frame, buildAt + 4 + i * 2, 10)}%, ${PAPER})`}
                stroke={BAR}
                strokeWidth={1.5}
                opacity={ease(frame, buildAt + i * 2, 8)}
              />
            ))}
            <text x={bucketX(0)} y={diagY + 84} style={svgText(note(20, INK_SOFT))} opacity={ease(frame, buildAt + 8, 10)}>
              hash table, in memory
            </text>
            {/* Orders stream along under the buckets, each dropping into one. */}
            {Array.from({ length: 8 }, (_, k) => {
              const t = streamP(k);
              if (t <= 0) return null;
              const target = bucketX((k * 5) % buckets) + 19;
              const x = p1 + 20 + (target - p1 - 20) * t;
              const yy = diagY + 150 - 70 * Math.max(0, (t - 0.7) / 0.3);
              return <rect key={k} x={x - 8} y={yy - 8} width={16} height={16} rx={3} fill={inkOf.yellow} opacity={1 - Math.max(0, (t - 0.92) / 0.08)} />;
            })}
            <text x={p1} y={diagY + 190} style={svgText(note(20, INK_SOFT))} opacity={ease(frame, streamAt, 10)}>
              orders stream past and probe it
            </text>
          </g>

          {/* 2. Sort-merge join */}
          <g opacity={ease(frame, mergeAt - 4, 12)}>
            <text x={p2} y={diagY - 16} style={svgText(label(21, INK))}>
              Sort-merge join
            </text>
            {[left, right].map((run, side) =>
              run.map((k, i) => {
                const x = p2 + 40 + side * 170;
                const yy = diagY + 10 + i * 34;
                const here = frame >= walksAt && i === walk;
                return (
                  <g key={`${side}-${i}`}>
                    <rect x={x} y={yy} width={60} height={28} rx={4} fill={here ? `color-mix(in srgb, ${ds("yellow", 400)} 70%, ${PAPER})` : PAPER} stroke={INK_SOFT} strokeWidth={1.2} />
                    <text x={x + 30} y={yy + 21} textAnchor="middle" style={keyText(19)}>
                      {k}
                    </text>
                  </g>
                );
              }),
            )}
            {left.map((k, i) => {
              const j = right.indexOf(k);
              const show = j >= 0 && frame >= walksAt && i <= walk;
              return show ? (
                <line key={i} x1={p2 + 100} y1={diagY + 24 + i * 34} x2={p2 + 210} y2={diagY + 24 + j * 34} stroke={BAR} strokeWidth={2} />
              ) : null;
            })}
            <text x={p2 + 300} y={diagY + 40} style={svgText(note(20, INK))} opacity={ease(frame, mergeAt + 6, 10)}>
              both sorted on the key,
            </text>
            <text x={p2 + 300} y={diagY + 68} style={svgText(note(20, INK))} opacity={ease(frame, walksAt, 10)}>
              walked once, together
            </text>
            <text x={p2 + 300} y={diagY + 124} style={svgText(note(20, INK_SOFT))} opacity={ease(frame, sortedAt, 10)}>
              wins if already sorted,
            </text>
            <text x={p2 + 300} y={diagY + 152} style={svgText(note(20, INK_SOFT))} opacity={ease(frame, memoryAt, 10)}>
              or too big to hash
            </text>
          </g>

          {/* 3. Across machines */}
          <g opacity={ease(frame, machinesAt - 4, 12)}>
            <text x={p3} y={diagY - 16} style={svgText(label(21, INK))}>
              Across machines
            </text>
            {[0, 1, 2].map((m) => {
              const mx = p3 + m * 172;
              return (
                <g key={m}>
                  <rect x={mx} y={diagY + 10} width={156} height={130} rx={6} fill={PAPER} stroke={HAIRLINE} strokeWidth={1.5} />
                  <text x={mx + 12} y={diagY + 38} style={svgText(label(19, INK_SOFT))}>
                    machine {m + 1}
                  </text>
                  {/* Broadcast: a copy of the small table on every machine. */}
                  <g opacity={ease(frame, broadcastAt + m * 4, 10) * (1 - ease(frame, bucketAt, 10))}>
                    <rect x={mx + 12} y={diagY + 52} width={132} height={32} rx={4} fill={`color-mix(in srgb, ${BAR} 18%, ${PAPER})`} stroke={BAR} />
                    <text x={mx + 78} y={diagY + 74} textAnchor="middle" style={svgText(note(19, BLUE_INK))}>
                      customers
                    </text>
                  </g>
                  {/* Bucketing: both tables split on the key, bucket by bucket. */}
                  <g opacity={ease(frame, bucketAt + m * 4, 10)}>
                    <text x={mx + 12} y={diagY + 74} style={svgText(note(19, INK))}>
                      orders, bucket {m + 1}
                    </text>
                    <text x={mx + 12} y={diagY + 100} style={svgText(note(19, INK))}>
                      customers, {m + 1}
                    </text>
                  </g>
                </g>
              );
            })}
            <text x={p3} y={diagY + 176} style={svgText(note(20, INK_SOFT))} opacity={ease(frame, movingAt, 10) * (1 - ease(frame, togetherAt, 10))}>
              the cost is moving rows between machines
            </text>
            <text x={p3} y={diagY + 176} style={svgText(note(20, INK))} opacity={ease(frame, togetherAt, 10)}>
              matching rows already on one machine
            </text>
          </g>
        </svg>
      </Drift>
    </AbsoluteFill>
  );
};
