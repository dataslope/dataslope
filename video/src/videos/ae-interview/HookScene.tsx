import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Badge } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { partOf } from "./data";
import { Box, Drift, Flow, Kicker, Mark, PartsLabel, Spot } from "./parts";

/** The row: raw tables, the layer of models, the dashboard. x in px; the
 *  row's middle in layout units (through y()), first where the hook draws it
 *  and then where it slides up to, over the probes. */
const RAW_X = 120;
const RAW_W = 260;
const STACK_X = 700;
const STACK_W = 300;
const STACK_CX = STACK_X + STACK_W / 2;
const DASH_X = 1320;
const DASH_W = 260;
const BOX_H = 80;
/** The three models, stacked from staging at the bottom to marts on top. */
const MODEL_H = 52;
const MODEL_GAP = 12;
const STACK_H = 3 * MODEL_H + 2 * MODEL_GAP;
const ROW_A = 332;
/** How strongly the empty places are drawn before they are named. */
const FAINT = 0.4;
const ROW_B = 253;
/** The easel beside the dashboard (its image is 705 by 1015), 80px clear of
 *  the box and well inside the page's right edge. */
const EASEL_X = DASH_X + DASH_W + 80;
const EASEL_W = 140;
const EASEL_H = 202;
/** The platypus (1516 by 1000), under the stack while the hook is up, then
 *  beside the probes. Drawn at 330 by 218, under half its pixels, so it stays
 *  sharp at 4K. */
const PLATY_W = 330;
const PLATY_H = 218;
/** How far under the row's middle it stands: 80px clear of the "built with
 *  dbt" line, the lowest text under the stack. */
const PLATY_DROP = 286;
const PLATY_B_X = 1460;
/** The probes: a ruled list of plain text under the row, its left and right
 *  edges, its first row's top (layout units) and each row's height. */
const LIST_X = 120;
const LIST_R = 1250;
const LIST_TOP = 394;
const LIST_STEP = 119;

type Probe = {
  head: React.ReactNode;
  at: number;
  parts: number[];
  topics: { text: string; at: number }[];
};

/**
 * The opening. The layer an analytics engineer owns, drawn as the place
 * between two others: raw tables on the left, a dashboard on the right (the
 * easel beside it), and between them an empty place that becomes a stack of
 * three models, staging at the bottom and marts on top, with the platypus,
 * this video's hero (half one animal and half another), settling under it.
 * Raw tables go in and models come out, clean, tested and documented, built
 * with dbt, and the two ends take their names, data engineering and
 * analytics. Then the row slides up, the platypus steps aside, and the
 * page's four probes come in as a ruled list of plain text, one per beat:
 * each one's name under the highlighter as it is said, its topics as a line
 * of words, and, small and right-aligned, the parts that answer it. "Layers
 * from staging to marts" lights the stack it points at.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const rawAt = n.word("hook", "raw tables");
  const dashAt = n.word("hook", "A dashboard");
  const betweenAt = n.word("hook", "Between the two");
  const layerAt = n.word("hook", "a layer of models");
  const ownsAt = n.word("hook", "owns it");
  const goInAt = n.word("hook-more", "go in");
  const words = [
    { text: "Clean,", at: n.word("hook-more", "clean") },
    { text: "tested,", at: n.word("hook-more", "tested") },
    { text: "documented", at: n.word("hook-more", "documented") },
  ];
  const comeOutAt = n.word("hook-more", "come out");
  const dbtAt = n.word("hook-more", "dbt");
  const deAt = n.word("hook-more", "data engineering");
  const analyticsAt = n.word("hook-more", "analytics");
  const probeFrom = n.beat("probe").from;
  const stagingAt = n.word("probe-practice", "layers from staging to marts");
  const end = n.beat("probe-tradeoffs").to;

  const probes: Probe[] = [
    {
      head: "SQL and modeling",
      at: n.word("probe-model", "SQL and modeling"),
      parts: [partOf("ae-facts-and-grain"), partOf("ae-changing-dimensions"), partOf("ae-advanced-sql")],
      topics: [
        { text: "facts and dimensions", at: n.word("probe-model", "facts and dimensions") },
        { text: "star schemas", at: n.word("probe-model", "star schemas") },
        { text: "grain", at: n.word("probe-model", "the grain") },
        { text: "slowly changing dimensions", at: n.word("probe-model", "slowly changing dimensions") },
      ],
    },
    {
      head: "dbt",
      at: n.word("probe-dbt", "dbt itself"),
      parts: [partOf("ae-dbt"), partOf("ae-incremental"), partOf("ae-testing")],
      topics: [
        { text: "models", at: n.word("probe-dbt", "models") },
        { text: "refs", at: n.word("probe-dbt", "refs") },
        { text: "sources", at: n.word("probe-dbt", "sources") },
        { text: "tests", at: n.word("probe-dbt", "tests") },
        { text: "materializations", at: n.word("probe-dbt", "materializations") },
        { text: "documentation", at: n.word("probe-dbt", "documentation") },
      ],
    },
    {
      head: "Software practice",
      at: n.word("probe-practice", "Software practice"),
      parts: [partOf("ae-dbt"), partOf("ae-testing")],
      topics: [
        { text: "version control", at: n.word("probe-practice", "version control") },
        { text: "continuous integration", at: n.word("probe-practice", "continuous integration") },
        { text: "staging to marts", at: stagingAt },
        { text: "DRY SQL", at: n.word("probe-practice", "SQL that doesn't repeat itself") },
      ],
    },
    {
      head: "Trade-offs",
      at: n.word("probe-tradeoffs", "trade-offs"),
      parts: [partOf("ae-dbt"), partOf("ae-incremental"), partOf("ae-warehousing")],
      topics: [
        { text: "view, table or incremental", at: n.word("probe-tradeoffs", "a view") },
        { text: "cost against freshness", at: n.word("probe-tradeoffs", "cost against freshness") },
      ],
    },
  ];

  // The hook's words step back in the pause before "probe"; the row slides
  // up and the platypus steps aside as the beat begins.
  const wordsOut = probeFrom - 14;
  const slide = ease(frame, probeFrom - 6, 22);
  const rowY = y(ROW_A);
  const shift = (y(ROW_B) - y(ROW_A)) * slide;
  const stackTop = rowY - STACK_H / 2;
  const modelY = (i: number) => stackTop + (2 - i) * (MODEL_H + MODEL_GAP);
  const stagingY = modelY(0) + MODEL_H / 2;
  const martsY = modelY(2) + MODEL_H / 2;
  // Raw tables go into staging, the bottom model; the dashboard reads from
  // marts, the top one. Each arrow turns in the middle of its gap.
  const leftMid = (RAW_X + RAW_W + STACK_X) / 2;
  const rightMid = (STACK_X + STACK_W + DASH_X) / 2;
  const listTop = y(LIST_TOP);
  const step = h(LIST_STEP);
  const glide = ease(frame, probeFrom - 6, 26);
  const platyA = { x: STACK_CX - PLATY_W / 2, y: rowY + PLATY_DROP };
  const platyB = { x: PLATY_B_X, y: listTop + 2 * step - PLATY_H / 2 };

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={rawAt} level={-31} />
      <Sfx name="el-tap" at={dashAt} level={-31} />
      <Sfx name="el-pop" at={dashAt + 6} level={-30} />
      <Sfx name="el-pencil" at={betweenAt} level={-36} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="el-tap" at={layerAt + i * 5} level={-35} />
      ))}
      <Sfx name="el-pop" at={ownsAt} level={-30} />
      <Sfx name="el-pencil" at={goInAt} level={-36} />
      {words.map((w) => (
        <Sfx key={w.text} name="el-tap" at={w.at} level={-36} />
      ))}
      <Sfx name="el-pencil" at={comeOutAt} level={-36} />
      <Sfx name="el-tap" at={dbtAt} level={-33} />
      <Sfx name="el-whoosh" at={probeFrom - 6} level={-36} />
      {probes.map((p) => (
        <Sfx key={p.at} name="el-tap" at={p.at} level={-31} />
      ))}
      {probes.flatMap((p) => p.topics.map((t) => <Sfx key={t.text} name="el-tap" at={t.at} level={-37} />))}

      <Drift from={from} to={end + 40} scale={0.02}>
        {/* Inked before frame 0, so the video's first frame (its poster) is
            not a blank page. */}
        <Kicker at={-14}>Analytics engineer interview questions</Kicker>

        {/* The row, which slides up as the probes begin. */}
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${shift}px)` }}>
          {/* The three places wait as faint dashed outlines from the first
              frame (the video's poster), and each is drawn as it is named. */}
          <Box x={RAW_X} y={rowY - BOX_H / 2} w={RAW_W} h={BOX_H} at={-14} out={rawAt + 4} dashed strength={FAINT} />
          <Box x={DASH_X} y={rowY - BOX_H / 2} w={DASH_W} h={BOX_H} at={-14} out={dashAt + 4} dashed strength={FAINT} />
          <Box x={RAW_X} y={rowY - BOX_H / 2} w={RAW_W} h={BOX_H} at={rawAt} size={26}>
            Raw tables
          </Box>
          <Box x={DASH_X} y={rowY - BOX_H / 2} w={DASH_W} h={BOX_H} at={dashAt} size={26}>
            Dashboard
          </Box>
          <Spot id="ae-interview-dashboard" at={dashAt + 6} left={EASEL_X} top={rowY - EASEL_H / 2} width={EASEL_W} height={EASEL_H} phase={40} amp={3} />

          {/* Between the two, the empty place darkens, then the models
              fill it. */}
          <Box
            x={STACK_X}
            y={stackTop}
            w={STACK_W}
            h={STACK_H}
            at={-14}
            out={layerAt + 8}
            dashed
            strength={FAINT + (1 - FAINT) * ease(frame, betweenAt - 2, 12)}
          />
          {["Staging", "Intermediate", "Marts"].map((name, i) => (
            <Box key={name} x={STACK_X} y={modelY(i)} w={STACK_W} h={MODEL_H} at={layerAt + i * 5} markAt={stagingAt + 4 + i * 3} markOut={n.beat("probe-tradeoffs").from - 6}>
              {name}
            </Box>
          ))}
          <Flow
            points={[
              [RAW_X + RAW_W + 14, rowY],
              [leftMid, rowY],
              [leftMid, stagingY],
              [STACK_X - 14, stagingY],
            ]}
            at={goInAt}
            dur={16}
          />
          <Flow
            points={[
              [STACK_X + STACK_W + 14, martsY],
              [rightMid, martsY],
              [rightMid, rowY],
              [DASH_X - 14, rowY],
            ]}
            at={comeOutAt}
            dur={16}
          />

          {/* What comes out, under the stack. */}
          <div
            style={{
              position: "absolute",
              left: STACK_X - 100,
              width: STACK_W + 200,
              top: rowY + STACK_H / 2 + 30,
              textAlign: "center",
              ...note(26, INK),
              whiteSpace: "nowrap",
              opacity: 1 - ease(frame, wordsOut, 10),
            }}
          >
            {words.map((w, k) => (
              <span key={w.text} style={{ opacity: ease(frame, w.at - 2, 10) }}>
                {k ? " " : ""}
                {w.text}
              </span>
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              left: STACK_X - 100,
              width: STACK_W + 200,
              top: rowY + STACK_H / 2 + 84,
              textAlign: "center",
              ...note(24, INK_SOFT),
              whiteSpace: "nowrap",
              opacity: ease(frame, dbtAt - 8, 10) * (1 - ease(frame, wordsOut, 10)),
            }}
          >
            Usually built with <Badge tone="gray" size={24} style={{ marginLeft: 6, opacity: ease(frame, dbtAt - 2, 10) }}>dbt</Badge>
          </div>

          {/* The two ends take their names. */}
          {[
            { text: "Data engineering", x: RAW_X, w: RAW_W, at: deAt },
            { text: "Analytics", x: DASH_X, w: DASH_W, at: analyticsAt },
          ].map((c) => (
            <div
              key={c.text}
              style={{
                position: "absolute",
                left: c.x - 40,
                width: c.w + 80,
                top: rowY + BOX_H / 2 + 28,
                textAlign: "center",
                ...note(24, INK_SOFT),
                whiteSpace: "nowrap",
                opacity: ease(frame, c.at - 2, 12) * (1 - ease(frame, wordsOut, 10)),
                transform: `translateY(${(1 - ease(frame, c.at - 2, 12)) * 8}px)`,
              }}
            >
              {c.text}
            </div>
          ))}
        </div>

        {/* The platypus settles under the models it owns, then steps aside
            for the probes. */}
        <Spot
          id="ae-interview-platypus"
          at={ownsAt}
          left={platyA.x + (platyB.x - platyA.x) * glide}
          top={platyA.y + (platyB.y - platyA.y) * glide}
          width={PLATY_W}
          height={PLATY_H}
          amp={4}
        />

        {/* The four probes, one per beat. */}
        {probes.map((p, i) => {
          const q = ease(frame, p.at - 4, 14);
          if (q <= 0) return null;
          const top = listTop + i * step;
          const next = probes[i + 1]?.at;
          return (
            <React.Fragment key={p.at}>
              <div
                style={{
                  position: "absolute",
                  left: LIST_X,
                  top: top + 18,
                  width: LIST_R - LIST_X,
                  opacity: q,
                  transform: `translateY(${(1 - q) * -10}px)`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 30 }}>
                  <span style={{ ...note(30, INK), whiteSpace: "nowrap", marginLeft: "-0.14em" }}>
                    <Mark at={p.at + 2} out={next === undefined ? undefined : next - 4}>
                      {p.head}
                    </Mark>
                  </span>
                  <span style={{ ...label(22, BLUE_INK), whiteSpace: "nowrap", opacity: ease(frame, p.at + 12, 12) }}>
                    <PartsLabel parts={p.parts} />
                  </span>
                </div>
                <div style={{ ...note(24, INK), marginTop: 14, whiteSpace: "nowrap" }}>
                  {p.topics.map((t, k) => (
                    <span key={t.text} style={{ opacity: ease(frame, t.at - 2, 10) }}>
                      {k ? <span style={{ color: INK_SOFT }}> · </span> : null}
                      {t.text}
                    </span>
                  ))}
                </div>
              </div>
              <div
                style={{
                  position: "absolute",
                  left: LIST_X,
                  top: top + step,
                  width: (LIST_R - LIST_X) * ease(frame, p.at - 2, 18),
                  height: 1,
                  background: HAIRLINE,
                }}
              />
            </React.Fragment>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
