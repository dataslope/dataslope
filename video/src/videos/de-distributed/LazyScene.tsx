import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { arrowHead } from "../../components/arrow";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { Chip, Drift, lineOf, Listing, listingHeight, OK, OK_INK, Svg } from "./parts";

/** The page's own PySpark block, without its comments. */
const LINES = [
  'df = spark.read.parquet("s3://bucket/events")',
  'filtered = df.filter(df.status == "active")',
  'grouped = filtered.groupBy("region").count()',
  "grouped.show()",
];
const SIZE = 26;
const L_X = 120;
const L_TOP = 330;
const L_W = 820;

const N_X = 1150;
const N_W = 470;
const N_H = 64;
const SLOT = 116;
const N_TOP = 342;

/** The table's columns, for the pruning. */
const COLUMNS = ["event_id", "user_id", "status", "region", "ts", "payload"];
const USED = new Set(["status", "region"]);

/**
 * Questions 3 and 4. The page's PySpark block inks in a line at a time, and
 * each transformation adds a dashed node to a plan beside it; nothing runs.
 * `show()` is the action: the plan's nodes turn solid and run, top to bottom.
 * Then why it waits: the optimizer sees the whole plan, pushes the filter
 * into the scan (the filter node folds into it), and prunes the columns the
 * query never names.
 */
export const LazyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("lazy").from;
  const qAt = n.word("lazy", "Question three");
  const textAt = n.word("lazy", "What is the difference between");
  const transAt = n.word("lazy", "Transformations, like filter");
  const filterAt = n.word("lazy", "filter");
  const groupAt = n.word("lazy", "group by");
  const lazyAt = n.word("lazy", "are lazy");
  const planAt = n.word("lazy", "adds a step to a plan");
  const nothingAt = n.word("lazy", "nothing runs");
  const showAt = n.word("lazy-action", "only show is an action");
  const compileAt = n.word("lazy-action", "compile the plan");
  const scheduleAt = n.word("lazy-action", "schedule it");
  const runAt = n.word("lazy-action", "and run it");
  const countAt = n.word("lazy-action", "Count, collect and write");
  const q4At = n.word("lazy-why", "Question four");
  const text4At = n.word("lazy-why", "Why does Spark use lazy evaluation");
  const wholeAt = n.word("lazy-why", "sees the whole plan");
  const rewriteAt = n.word("lazy-why", "can rewrite it");
  const pushAt = n.word("lazy-rewrite", "pushes the filter into the scan");
  const lessAt = n.word("lazy-rewrite", "so less is read");
  const pruneAt = n.word("lazy-rewrite", "prunes unused columns");
  const fuseAt = n.word("lazy-rewrite", "fuses chained steps");
  const joinAt = n.word("lazy-rewrite", "picks the join strategy");
  const eagerAt = n.word("lazy-rewrite", "Run step by step");
  const noneAt = n.word("lazy-rewrite", "none of that is possible");
  const end = n.beat("lazy-rewrite").to;

  const lineAt = [transAt, filterAt + 2, groupAt + 2, showAt];
  const solid = ease(frame, compileAt, 12);
  const push = ease(frame, pushAt + 4, 20);
  // Each node's slot, and how it moves when the filter folds into the scan.
  const slotY = (k: number) => y(N_TOP + k * SLOT);
  const nodes = [
    { key: "scan", at: transAt + 6, slot: 0, text: "Scan events" },
    { key: "filter", at: filterAt + 6, slot: 1 - push, text: "Filter status = active" },
    { key: "count", at: groupAt + 6, slot: 2 - push, text: "Count by region" },
    { key: "show", at: showAt + 4, slot: 3 - push, text: "Show" },
  ];
  const runOf = (k: number) => ease(frame, runAt + k * 6, 10) * (1 - ease(frame, q4At, 12));
  const nodeH = h(N_H);
  const bracket = ease(frame, wholeAt, 14) * (1 - ease(frame, pushAt, 10));

  const rewrites = [
    { at: pushAt, text: "push the filter into the scan", more: { at: lessAt, text: ": read less" } },
    { at: pruneAt, text: "prune unused columns" },
    { at: fuseAt, text: "fuse chained steps" },
    { at: joinAt, text: "pick the join strategy" },
  ];

  return (
    <AbsoluteFill>
      {lineAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at + 4} level={-37} />
      ))}
      <Sfx name="el-pencil" at={compileAt} level={-37} />
      <Sfx name="el-sprinkle" at={runAt} level={-36} />
      <Sfx name="el-whoosh" at={pushAt + 4} level={-36} />
      <Sfx name="el-scratch" at={noneAt} level={-37} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={58} out={q4At - 6}>
          What is the difference between a transformation and an action in Spark?
        </QuestionCard>
        <QuestionCard n={4} at={q4At - 2} textAt={text4At - 2} size={58}>
          Why does Spark use lazy evaluation?
        </QuestionCard>

        {/* The page's block. */}
        <Listing
          lines={LINES}
          x={L_X}
          top={y(L_TOP)}
          width={L_W}
          size={SIZE}
          at={transAt - 4}
          lineAt={lineAt}
          marks={[
            { line: lineOf(LINES, ".filter("), at: filterAt, out: groupAt },
            { line: lineOf(LINES, ".groupBy("), at: groupAt, out: lazyAt + 10 },
            { line: lineOf(LINES, ".show()"), at: showAt + 4, out: q4At },
          ]}
        />
        <Note at={nothingAt - 2} x={L_X} y={y(L_TOP) + listingHeight(LINES.length, SIZE) + h(24)} out={showAt}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            transformations: a plan, and <b style={{ color: INK }}>nothing runs</b>
          </span>
        </Note>
        <Note at={showAt + 6} x={L_X} y={y(L_TOP) + listingHeight(LINES.length, SIZE) + h(24)} out={q4At}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600 }}>show()</span> is an action
            <span style={{ opacity: ease(frame, scheduleAt, 10) }}>: compile, schedule</span>
            <span style={{ opacity: ease(frame, runAt, 10), color: BLUE_INK, fontWeight: 650 }}>, run</span>
          </span>
        </Note>
        <Note at={countAt - 2} x={L_X} y={y(L_TOP) + listingHeight(LINES.length, SIZE) + h(80)} out={q4At}>
          <span style={{ display: "flex", gap: 10, alignItems: "center", whiteSpace: "nowrap" }}>
            <span style={{ ...note(23, INK_SOFT) }}>actions too:</span>
            {["count()", "collect()", "write"].map((t) => (
              <Chip key={t} mono size={23}>
                {t}
              </Chip>
            ))}
          </span>
        </Note>

        {/* The plan beside it. */}
        <Note at={planAt - 2} x={N_X} y={y(N_TOP) - h(46)}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
            the plan<span style={{ opacity: ease(frame, nothingAt, 10) * (1 - ease(frame, runAt, 10)) }}>, not yet run</span>
          </span>
        </Note>
        <Svg>
          {nodes.slice(0, -1).map((a, k) => {
            const b = nodes[k + 1];
            const p = ease(frame, b.at, 10);
            // The filter folds into the scan, and the scan then feeds the count.
            const fromSlot = a.key === "filter" ? nodes[0].slot : a.slot;
            if (a.key === "scan" && push > 0) return null;
            const x = N_X + N_W / 2;
            const y1 = slotY(fromSlot) + nodeH + 4;
            const y2 = slotY(b.slot) - 6;
            if (p <= 0 || y2 - y1 < 14) return null;
            const line: [number, number][] = [
              [x, y1],
              [x, y1 + (y2 - y1) * p],
            ];
            return (
              <g key={a.key}>
                <path d={`M${x},${y1} L${x},${line[1][1]}`} stroke={INK_SOFT} strokeWidth={1.8} fill="none" />
                {p >= 1 ? <path d={arrowHead([[x, y1], [x, y2]], 11, 6, { filled: true })} fill={INK_SOFT} /> : null}
              </g>
            );
          })}
        </Svg>
        {nodes.map((nd, k) => {
          const p = ease(frame, nd.at, 12);
          if (p <= 0) return null;
          const run = runOf(k);
          const folded = nd.key === "filter" ? push : 0;
          const isShow = nd.key === "show";
          return (
            <div
              key={nd.key}
              style={{
                position: "absolute",
                left: N_X,
                top: slotY(nd.slot),
                width: N_W,
                height: nodeH,
                boxSizing: "border-box",
                border: `${solid > 0.5 ? 2 : 1.8}px ${solid > 0.5 ? "solid" : "dashed"} ${isShow ? INK : INK_SOFT}`,
                borderRadius: 10,
                background: run > 0 ? `color-mix(in srgb, ${BAR} ${run * 16}%, ${PAPER})` : PAPER,
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                gap: 12,
                opacity: p * (1 - folded),
                transform: `translateY(${(1 - p) * 10}px)`,
                zIndex: nd.key === "filter" ? 0 : 1,
              }}
            >
              <span style={{ ...note(24, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
                {nd.text}
                {nd.key === "scan" ? (
                  <span style={{ color: OK_INK, opacity: push }}>, status = active</span>
                ) : null}
              </span>
              {isShow ? (
                <span style={{ marginLeft: "auto", ...label(20, ACCENT_INK), fontWeight: 700 }}>action</span>
              ) : run > 0 ? (
                <span style={{ marginLeft: "auto", ...label(20, BLUE_INK), opacity: run }}>ran</span>
              ) : null}
            </div>
          );
        })}
        {/* The whole plan, all at once. */}
        {bracket > 0 ? (
          <Svg opacity={bracket}>
            <path
              d={`M${N_X + N_W + 18},${slotY(0)} L${N_X + N_W + 30},${slotY(0)} L${N_X + N_W + 30},${slotY(3) + nodeH} L${N_X + N_W + 18},${slotY(3) + nodeH}`}
              fill="none"
              stroke={ds("yellow", 600)}
              strokeWidth={3}
            />
          </Svg>
        ) : null}
        <Note at={wholeAt + 4} x={N_X + N_W + 44} y={(slotY(0) + slotY(3) + nodeH) / 2 - h(40)} out={pushAt}>
          <span style={{ ...label(22, INK), display: "block", lineHeight: 1.3 }}>
            the whole
            <br />
            plan<span style={{ opacity: ease(frame, rewriteAt, 10) }}>, rewritten</span>
          </span>
        </Note>

        {/* The columns the scan reads, beside it. */}
        <Note at={pruneAt - 2} x={N_X + N_W + 34} y={slotY(0) - h(46)}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>columns</span>
        </Note>
        {COLUMNS.map((c, i) => (
          <Note key={c} at={pruneAt + i} x={N_X + N_W + 34} y={slotY(0) + i * h(40)}>
            <span style={{ opacity: USED.has(c) ? 1 : 1 - 0.75 * ease(frame, pruneAt + 10, 12) }}>
              <Chip mono size={21} color={USED.has(c) ? OK : ds("gray", 400)} ink={USED.has(c) ? OK_INK : INK_SOFT}>
                {c}
              </Chip>
            </span>
          </Note>
        ))}

        {/* What the optimizer does with it, and what eager execution can't. */}
        {rewrites.map((r, i) => (
          <Note key={r.text} at={r.at - 2} x={L_X} y={y(L_TOP) + listingHeight(LINES.length, SIZE) + h(40 + i * 46)}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
              <b style={{ color: OK_INK }}>{i + 1}</b>
              {"  "}
              {r.text}
              {r.more ? <span style={{ opacity: ease(frame, r.more.at, 10), color: OK_INK }}>{r.more.text}</span> : null}
            </span>
          </Note>
        ))}
        <Note at={eagerAt - 2} x={L_X} y={y(L_TOP) + listingHeight(LINES.length, SIZE) + h(40 + 4 * 46 + 14)}>
          <span style={{ ...note(25, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            run step by step, eagerly<span style={{ opacity: ease(frame, noneAt, 10) }}>: none of this is possible</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
