import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Badge, Note, Num } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { count, GATE } from "./data";
import { Cross, Drift, Edge, MARK_BAD, OK_INK, TaskBox, X0 } from "./parts";

const NODE_W = 226;
const STEP = 296;
const NODES = ["extract", "transform", "load to staging", "quality gate", "publish", "dashboard"];
const LOAD_I = 2;
const GATE_I = 3;
const PUBLISH_I = 4;

/**
 * Question 7. The checks the page lists, named as they are read; then where
 * they go: a gate task between load and publish. Load writes to a staging
 * table no consumer reads, and publish swaps it in only on a pass: write,
 * audit, publish. Run here on the video's own batch of 1,000 orders in
 * Postgres (check.mjs): four percent of its customer IDs are null against a
 * limit of one percent, so the gate fails and publish never runs.
 */
export const GateScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("quality").from;
  const qAt = n.word("quality", "Question seven");
  const textAt = n.word("quality", "What are data-quality checks");
  const testAt = n.word("quality", "They test the data before it moves on");
  const CHECKS = [
    { text: "row counts", at: n.word("quality", "row counts") },
    { text: "null rates", at: n.word("quality", "null rates") },
    { text: "uniqueness", at: n.word("quality", "uniqueness") },
    { text: "keys that resolve", at: n.word("quality", "keys that resolve") },
    { text: "value ranges", at: n.word("quality", "value ranges") },
    { text: "the schema", at: n.word("quality", "the schema") },
    { text: "freshness", at: n.word("quality", "freshness") },
  ];
  const toolsAt = n.word("quality", "dbt tests");
  const gateAt = n.word("gate", "Put them in a gate task");
  const betweenAt = n.word("gate", "between load and publish");
  const stagingAt = n.word("gate-wap", "Load writes to a staging table");
  const swapAt = n.word("gate-wap", "publish swaps it in");
  const passesAt = n.word("gate-wap", "only if the gate passes");
  const wapAt = n.word("gate-wap", "write, audit, publish");
  const batchAt = n.word("gate-run", "In this batch of a thousand orders");
  const fourAt = n.word("gate-run", "four percent have no customer ID");
  const limitAt = n.word("gate-run", "against a limit of one percent");
  const failsAt = n.word("gate-run", "The gate fails");
  const neverAt = n.word("gate-run", "publish never runs");
  const end = n.beat("gate-run").to;

  const cx = (i: number) => 220 + i * STEP;
  const dagY = y(494);
  const nodeH = h(60);
  const passAt = (i: number) => gateAt + 6 + i * 6;

  // The batch's checks under the gate: a ruled table, no frame.
  const cardX = cx(GATE_I) - 260;
  const cardW = 520;
  const cardTop = y(600);
  const HEAD = 48;
  const ROW = 44;
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const rows = GATE.checks.map((c) => {
    const value =
      c.name === "null customer IDs" ? pct(c.value) : c.name === "amounts above zero" ? (c.value === 0 ? "all" : `${count(c.value)} not`) : count(c.value);
    return { ...c, value };
  });
  const nullRow = rows.findIndex((r) => !r.pass);

  return (
    <AbsoluteFill>
      {CHECKS.map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at} level={-38} />
      ))}
      <Sfx name="el-pencil" at={gateAt + 2} level={-36} />
      <Sfx name="el-pop" at={batchAt + 2} level={-35} />
      <Sfx name="el-scratch" at={failsAt + 2} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={54}>
          What are data-quality checks, and where do they belong in a DAG?
        </QuestionCard>

        {/* What gets checked. */}
        <Note at={testAt} x={X0} y={y(284)}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>tested before the data moves on</span>
        </Note>
        <div style={{ position: "absolute", left: X0, top: y(326), display: "flex", gap: 14, opacity: 1 - 0.35 * ease(frame, gateAt, 14) }}>
          {CHECKS.map((c) => {
            const p = ease(frame, c.at - 2, 10);
            return (
              <Badge key={c.text} tone="blue" size={22} style={{ fontFamily: SANS, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
                {c.text}
              </Badge>
            );
          })}
        </div>
        <Note at={toolsAt} x={X0} y={y(386)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>run by dbt tests · Great Expectations · Soda</span>
        </Note>

        {/* Where they belong: a gate between load and publish. */}
        {NODES.map((name, i) => (
          <TaskBox
            key={name}
            cx={cx(i)}
            cy={dagY}
            w={NODE_W}
            h={nodeH}
            at={gateAt + i * 2}
            size={24}
            tones={
              i === LOAD_I
                ? [
                    { at: passAt(i), tone: "ok" },
                    { at: stagingAt, tone: "lit" },
                    { at: swapAt, tone: "ok" },
                  ]
                : i < GATE_I
                  ? [{ at: passAt(i), tone: "ok" }]
                  : i === GATE_I
                    ? [
                        { at: betweenAt, tone: "lit" },
                        { at: stagingAt, tone: "plain" },
                        { at: passesAt, tone: "lit" },
                        { at: failsAt, tone: "bad" },
                      ]
                    : i === PUBLISH_I
                      ? [
                          { at: swapAt, tone: "lit" },
                          { at: passesAt, tone: "plain" },
                          { at: neverAt, tone: "quiet" },
                        ]
                      : [{ at: neverAt, tone: "quiet" }]
            }
          >
            {name}
          </TaskBox>
        ))}
        {NODES.slice(1).map((name, i) => (
          <Edge
            key={name}
            points={[
              [cx(i) + NODE_W / 2 + 2, dagY],
              [cx(i + 1) - NODE_W / 2 - 3, dagY],
            ]}
            at={gateAt + 2 + i * 2}
            dur={8}
            head={11}
            dim={i >= GATE_I ? neverAt : undefined}
          />
        ))}
        <Note at={betweenAt + 4} x={cx(GATE_I) - NODE_W / 2 - 40} y={dagY - nodeH / 2 - h(44)}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>the checks run here</span>
        </Note>
        <Note at={stagingAt} x={X0} y={dagY + nodeH / 2 + h(40)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            load writes where no one reads<span style={{ opacity: ease(frame, swapAt, 10) }}>; publish swaps it in</span>
            <span style={{ opacity: ease(frame, passesAt, 10) }}> on a pass</span>
          </span>
        </Note>
        <Note at={wapAt} x={X0} y={dagY + nodeH / 2 + h(80)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>write, audit, publish</span>
        </Note>
        <Note at={neverAt + 2} x={cx(4) - NODE_W / 2} y={dagY + nodeH / 2 + h(16)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>never runs</span>
        </Note>

        {/* This batch, through the gate. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, batchAt, 10) }}>
          <line x1={cx(GATE_I)} x2={cx(GATE_I)} y1={dagY + nodeH / 2} y2={cardTop} stroke={INK_SOFT} strokeWidth={1.6} strokeDasharray="4 4" />
        </svg>
        <div
          style={{
            position: "absolute",
            left: cardX,
            top: cardTop,
            width: cardW,
            height: HEAD + rows.length * ROW,
            opacity: ease(frame, batchAt, 12),
            transform: `translateY(${(1 - ease(frame, batchAt, 12)) * 12}px)`,
          }}
        >
          <div style={{ height: HEAD, display: "flex", alignItems: "center", borderBottom: `1px solid ${HAIRLINE}` }}>
            <span style={{ ...label(21, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>
              this batch: <Num>{count(GATE.rows)}</Num> orders
            </span>
          </div>
          {rows.map((r, i) => {
            const at = i === nullRow ? fourAt : batchAt + 8 + i * 4;
            const p = ease(frame, at - 2, 10);
            const bad = !r.pass ? ease(frame, fourAt + 4, 10) : 0;
            return (
              <div
                key={r.name}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: HEAD + i * ROW,
                  height: ROW,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  borderTop: i ? `1px solid ${HAIRLINE}` : undefined,
                  opacity: p,
                }}
              >
                {/* The failing row's red, a little past the text either side. */}
                {bad > 0 ? (
                  <div style={{ position: "absolute", left: -10, right: -10, top: 0, bottom: 0, background: `color-mix(in srgb, ${MARK_BAD} ${bad * 100}%, transparent)` }} />
                ) : null}
                <span style={{ position: "relative", ...note(23, INK), flex: 1, whiteSpace: "nowrap" }}>{r.name}</span>
                <span style={{ position: "relative", ...note(23, r.pass ? INK : ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
                  <Num>{r.value}</Num>
                  {!r.pass ? (
                    <span style={{ ...label(21, ACCENT_INK), fontWeight: 500, opacity: ease(frame, limitAt, 10) }}>
                      {" "}
                      · limit <Num>{(GATE.limits.maxNullRate * 100).toFixed(0)}%</Num>
                    </span>
                  ) : null}
                </span>
                <span style={{ position: "relative", width: 24, display: "flex", justifyContent: "center" }}>
                  {r.pass ? frame >= at + 4 ? <Tick at={at + 4} size={22} /> : null : frame >= limitAt + 6 ? <Cross at={limitAt + 6} size={22} /> : null}
                </span>
              </div>
            );
          })}
        </div>
        <Note at={failsAt + 4} x={cardX + cardW + 30} y={cardTop + h(10)}>
          <Badge tone="red" size={26} style={{ fontFamily: SANS }}>
            gate fails: halt
          </Badge>
        </Note>
        <Note at={failsAt + 10} x={cardX + cardW + 30} y={cardTop + h(74)}>
          <span style={{ ...label(21, OK_INK), whiteSpace: "nowrap" }}>bad data stops before anyone sees it</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
