import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { count, PARSE } from "./data";
import { Cross, Drift, Edge, lineOf, MARK, MARK_BAD, MARK_OK, OK_INK, PyListing, TaskBox, X0 } from "./parts";

/** The page's XCom pair. The fix is the page's with one change: the page
 *  writes `"{{ ds }}"` inside the function body, where Jinja never renders (only
 *  an operator's templated fields are), so every date would write one key
 *  literally named `{{ ds }}.parquet`. TaskFlow passes the date in by name. */
const BAD = ["@task", "def extract():", "    return fetch_million_rows()      # avoid"];
const GOOD = [
  "@task",
  "def extract(ds=None):",
  '    path = f"s3://bucket/staging/{ds}.parquet"',
  "    write_parquet(fetch_million_rows(), path)",
  "    return path",
];
const ROWS_X = 880;

/**
 * Question 3. A DAG: tasks, the edges between them, and no cycles (an edge
 * back to the start is crossed out). Then the page's four anti-patterns, with
 * why parse-time work hurts (Airflow re-parses each file every 30 seconds by
 * default, check.mjs) and what idempotent means at its first use, and the fix
 * for the last one: a million rows returned into the XCom store against a path
 * to storage, keyed by the date TaskFlow passes in.
 */
export const AntiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("anti").from;
  const qAt = n.word("anti", "Question three");
  const textAt = n.word("anti", "What is a DAG, and what");
  const tasksAt = n.word("anti", "a workflow's tasks");
  const edgesAt = n.word("anti", "the edges between them");
  const cyclesAt = n.word("anti", "with no cycles");
  const fourAt = n.word("anti", "Four anti-patterns come up");
  const everyAt = n.word("anti-parse", "about every thirty seconds");
  const sameAt = n.word("anti-idem", "that don't end the same");
  const corruptAt = n.word("anti-idem", "corrupt state when they rerun");
  const rows = [
    {
      title: "Expensive work at parse time",
      detail: (
        <>
          an API call in the DAG file, re-run on every parse
          <span style={{ opacity: ease(frame, everyAt, 10) }}>
            : every <Num>{PARSE.everySeconds}</Num> s, <Num>{count(PARSE.perDay)}</Num> times a day
          </span>
        </>
      ),
      at: n.word("anti-parse", "Expensive work at parse time"),
      detailAt: n.word("anti-parse", "an API call in the DAG file"),
    },
    {
      title: "Monolithic tasks",
      detail: "one failure redoes everything",
      at: n.word("anti-mono", "Monolithic tasks"),
      detailAt: n.word("anti-mono", "one failure redoes everything"),
    },
    {
      title: "Tasks that aren't idempotent",
      detail: (
        <>
          <span style={{ opacity: ease(frame, sameAt, 10) }}>not the same end state however often they run, so </span>
          <span style={{ opacity: ease(frame, corruptAt, 10) }}>a rerun corrupts state</span>
        </>
      ),
      at: n.word("anti-idem", "Tasks that aren't idempotent"),
      detailAt: n.word("anti-idem", "Tasks that aren't idempotent"),
    },
    {
      title: "Large data through XComs",
      detail: "XComs: Airflow's store for small messages between tasks",
      at: n.word("anti-xcom", "large data passed through XComs"),
      detailAt: n.word("anti-xcom", "Airflow's store for small messages"),
    },
  ];
  const writeAt = n.word("anti-fix", "Write the data to storage");
  const pathAt = n.word("anti-fix", "pass only its path");
  const end = n.beat("anti-fix").to;

  // ── A DAG, and the edge it may not have ───────────────────────────────────
  const NW = 180;
  const NH = h(50);
  const nodes = {
    extract: { cx: 220, cy: y(392) },
    orders: { cx: 470, cy: y(318) },
    customers: { cx: 470, cy: y(466) },
    report: { cx: 720, cy: y(392) },
  };
  const right = (k: keyof typeof nodes) => nodes[k].cx + NW / 2;
  const left = (k: keyof typeof nodes) => nodes[k].cx - NW / 2;
  const loopY = y(548);
  const crossX = (nodes.extract.cx + nodes.report.cx) / 2;

  const ROW_TOP = 282;
  const ROW_H = 80;
  const listTop = y(656);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={edgesAt} level={-36} />
      <Sfx name="el-scratch" at={cyclesAt + 12} level={-34} />
      {rows.map((r) => (
        <Sfx key={r.title} name="el-tap" at={r.at} level={-37} />
      ))}
      <Sfx name="el-pop" at={pathAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is a DAG, and what are common anti-patterns?
        </QuestionCard>

        {(Object.keys(nodes) as (keyof typeof nodes)[]).map((k, i) => (
          <TaskBox key={k} cx={nodes[k].cx} cy={nodes[k].cy} w={NW} h={NH} at={tasksAt + i * 3} size={23}>
            {k}
          </TaskBox>
        ))}
        {(
          [
            [
              [right("extract"), nodes.extract.cy - 8],
              [left("orders") - 3, nodes.orders.cy + 6],
            ],
            [
              [right("extract"), nodes.extract.cy + 8],
              [left("customers") - 3, nodes.customers.cy - 6],
            ],
            [
              [right("orders"), nodes.orders.cy + 6],
              [left("report") - 3, nodes.report.cy - 8],
            ],
            [
              [right("customers"), nodes.customers.cy - 6],
              [left("report") - 3, nodes.report.cy + 8],
            ],
          ] as [number, number][][]
        ).map((pts, i) => (
          <Edge key={i} points={pts} at={edgesAt + i * 3} dur={10} head={11} />
        ))}
        {/* The edge back to the start: a cycle, which a DAG never has. */}
        <Edge
          points={[
            [nodes.report.cx, nodes.report.cy + NH / 2 + 2],
            [nodes.report.cx, loopY],
            [nodes.extract.cx, loopY],
            [nodes.extract.cx, nodes.extract.cy + NH / 2 + 3],
          ]}
          at={cyclesAt}
          dur={14}
          head={11}
          color={ACCENT}
          dash="7 5"
        />
        <div style={{ position: "absolute", left: crossX - 20, top: loopY - 20 }}>{frame >= cyclesAt + 12 ? <Cross at={cyclesAt + 12} size={40} /> : null}</div>
        <Note at={cyclesAt + 14} x={crossX + 34} y={loopY + h(8)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>no cycles</span>
        </Note>

        {/* The four anti-patterns. */}
        <Note at={fourAt} x={ROWS_X} y={y(ROW_TOP) - h(46)}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>four anti-patterns</span>
        </Note>
        {rows.map((r, i) => (
          <Note key={r.title} at={r.at - 2} x={ROWS_X} y={y(ROW_TOP) + i * h(ROW_H)}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
              <span
                style={{
                  width: 34,
                  height: 34,
                  flex: "0 0 34px",
                  borderRadius: 17,
                  border: `2.2px solid ${ACCENT}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...label(20, ACCENT_INK),
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
              <div>
                <div style={{ ...note(27, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>{r.title}</div>
                <div style={{ ...label(21, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, r.detailAt, 10) }}>{r.detail}</div>
              </div>
            </div>
          </Note>
        ))}

        {/* The fix for the fourth, as the page writes it. */}
        <Note at={rows[3].at + 4} x={X0} y={listTop - h(40)}>
          <span style={{ ...label(22, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>a million rows into the XCom store</span>
        </Note>
        <PyListing
          lines={BAD}
          x={X0}
          top={listTop}
          width={700}
          size={21}
          at={rows[3].at + 4}
          marks={[{ line: lineOf(BAD, "return fetch_million_rows"), at: rows[3].detailAt, color: MARK_BAD }]}
        />
        <Note at={writeAt} x={920} y={listTop - h(40)}>
          <span style={{ ...label(22, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>the data to storage, the path through XCom</span>
        </Note>
        <PyListing
          lines={GOOD}
          x={920}
          top={listTop}
          width={880}
          size={21}
          at={writeAt - 2}
          marks={[
            { line: lineOf(GOOD, "write_parquet"), at: writeAt + 8, color: MARK },
            { line: lineOf(GOOD, "return path"), at: pathAt, color: MARK_OK },
          ]}
        />
      </Drift>
    </AbsoluteFill>
  );
};
