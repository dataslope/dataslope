import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PRUNE, thousands } from "./data";
import { Drift, Listing, listingHeight, MARK_OK, MARK_RED, OK, OK_INK, PlanBox, planHeight, X0 } from "./parts";

const BOX_TOP = 300;
const BOX_W = 128;
const BOX_H = 78;
const BOX_GAP = 12;
const SIZE = 21;
const PLAN = 20;
const LIST_TOP = 450;
const R_X = 1290;
/** Lines of the twelve-scan plan shown before the ellipsis note. */
const FN_SHOWN = 6;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Question 6, on the million orders partitioned by month: twelve boxes, one
 * per partition, with its real row count. March's sum filtered on the date
 * itself: the plan Postgres printed scans orders_2024_03 alone, so March
 * lights and the other eleven fade. Then the same sum through EXTRACT: the
 * plan's Append over all twelve (shown to its first two scans, then counted),
 * every box lit in red, and the same total.
 */
export const PruneScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("prune").from;
  const qAt = n.word("prune", "Question six");
  const textAt = n.word("prune", "What is partition pruning");
  const splitAt = n.word("prune", "Split orders by month");
  const twelveAt = n.word("prune", "twelve partitions");
  const onlyAt = n.word("prune", "reads only the months");
  const marchAt = n.word("prune-one", "March's revenue");
  const oneAt = n.word("prune-one", "scans one partition");
  const rowsAt = n.word("prune-one", "eighty-five thousand rows");
  const skipsAt = n.word("prune-one", "skips the other eleven");
  const wrapAt = n.word("prune-fn", "Wrap the column in a function");
  const extractAt = n.word("prune-fn", "extract month equals three");
  const goneAt = n.word("prune-fn", "pruning is gone");
  const sameAt = n.word("prune-fn", "the same total");
  const allAt = n.word("prune-fn", "read from all twelve");
  const keyAt = n.word("prune-fn", "Filter on the partition key");
  const end = n.beat("prune-fn").to;

  const boxX = (i: number) => X0 + i * (BOX_W + BOX_GAP);
  const marchPlanTop = y(LIST_TOP) + listingHeight(PRUNE.march.length, SIZE) + h(22);
  const fnPlanTop = y(LIST_TOP) + listingHeight(PRUNE.fn.length, SIZE) + h(22);
  const fnLines = PRUNE.fnPlan.slice(0, FN_SHOWN);
  const marchIndex = PRUNE.partitions.findIndex((p) => p.name.endsWith("_03"));

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={twelveAt} level={-33} />
      <Sfx name="el-pop" at={oneAt + 2} level={-32} />
      <Sfx name="el-scratch" at={goneAt + 2} level={-33} />
      <Sfx name="el-tap" at={keyAt + 2} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is partition pruning?
        </QuestionCard>

        {/* ── The twelve partitions ── */}
        <Note at={splitAt} x={X0} y={y(BOX_TOP) - h(40)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
            orders, <QMono>PARTITION BY RANGE (order_date)</QMono>: one table per month, rows in each
          </span>
        </Note>
        {PRUNE.partitions.map((p, i) => {
          const at = twelveAt - 4 + i * 2;
          const shown = ease(frame, at, 10);
          const isMarch = i === marchIndex;
          // March lights on the pruned plan; the rest fade as they are
          // skipped, then all twelve light red when pruning is gone.
          const skipped = isMarch ? 0 : ease(frame, skipsAt, 12) * (1 - ease(frame, allAt, 10));
          const green = isMarch ? ease(frame, oneAt, 10) * (1 - ease(frame, allAt, 10)) : 0;
          const red = ease(frame, allAt + i, 10) * (1 - ease(frame, keyAt + 6, 14));
          const border = red > 0.5 ? ACCENT : green > 0.5 ? OK : `color-mix(in srgb, ${BAR} 55%, ${PAPER})`;
          const fill = red > 0 ? `color-mix(in srgb, ${ACCENT} ${18 * red}%, ${PAPER})` : green > 0 ? `color-mix(in srgb, ${OK} ${22 * green}%, ${PAPER})` : `color-mix(in srgb, ${BAR} 10%, ${PAPER})`;
          return (
            <div
              key={p.name}
              style={{
                position: "absolute",
                left: boxX(i),
                top: y(BOX_TOP),
                width: BOX_W,
                height: h(BOX_H),
                boxSizing: "border-box",
                border: `2px solid ${border}`,
                borderRadius: 6,
                background: fill,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                opacity: shown * (1 - 0.65 * skipped),
                transform: `translateY(${(1 - shown) * 10}px)`,
              }}
            >
              <span style={{ ...label(21, INK) }}>{MONTHS[i]}</span>
              <span style={{ ...note(20, BLUE_INK), ...TABULAR }}>{thousands(p.orders)}</span>
            </div>
          );
        })}

        {/* ── March, filtered on the key: one partition ── */}
        <Listing lines={PRUNE.march} x={X0} top={y(LIST_TOP)} width={760} size={SIZE} at={onlyAt - 2} out={wrapAt - 2} marks={[{ line: "WHERE", text: "order_date >= DATE '2024-03-01'", at: marchAt + 4 }]} />
        <PlanBox
          lines={PRUNE.marchPlan}
          x={X0}
          top={marchPlanTop}
          width={1120}
          size={PLAN}
          at={marchAt + 4}
          out={wrapAt - 2}
          marks={[
            { line: "Seq Scan on orders_2024_03", text: "orders_2024_03", at: oneAt, color: MARK_OK },
            { line: "Seq Scan on orders_2024_03", text: "actual rows=84699.00", at: rowsAt },
          ]}
        />
        <Note at={skipsAt} x={R_X} y={y(LIST_TOP)} out={wrapAt - 2}>
          <div style={{ ...note(28, OK_INK), whiteSpace: "nowrap" }}>
            <b>1</b> of 12 partitions read
          </div>
          <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", marginTop: h(8) }}>
            SUM = <Num>{thousands(Number(PRUNE.marchSum))}</Num>
          </div>
        </Note>

        {/* ── Through a function: all twelve ── */}
        <Listing
          lines={PRUNE.fn}
          x={X0}
          top={y(LIST_TOP)}
          width={760}
          size={SIZE}
          at={wrapAt}
          marks={[{ line: "WHERE", text: "EXTRACT(MONTH FROM order_date) = 3", at: extractAt, color: MARK_RED }]}
        />
        <PlanBox
          lines={fnLines}
          x={X0}
          top={fnPlanTop}
          width={1120}
          size={PLAN}
          step={2}
          at={goneAt - 4}
          marks={[
            { line: "Append", text: "Append", at: goneAt + 4, color: MARK_RED },
            { line: "orders_2024_01", text: "orders_2024_01", at: allAt },
            { line: "orders_2024_02", text: "orders_2024_02", at: allAt + 3 },
          ]}
        />
        <Note at={allAt} x={X0 + 30} y={fnPlanTop + planHeight(FN_SHOWN, PLAN) + h(14)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            … then the same Seq Scan on the other ten: <b>{PRUNE.fnScans}</b> in all
          </span>
        </Note>
        <Note at={sameAt} x={R_X} y={y(LIST_TOP)}>
          <div style={{ ...note(28, ACCENT_INK), whiteSpace: "nowrap", opacity: ease(frame, allAt, 10) }}>
            <b>{PRUNE.fnScans}</b> of 12 partitions read
          </div>
          <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", marginTop: h(8) }}>
            SUM = <Num>{thousands(Number(PRUNE.fnSum))}</Num>, the same
          </div>
        </Note>
        <Note at={keyAt} x={R_X} y={y(LIST_TOP) + h(120)}>
          <div style={{ ...note(24, OK_INK), width: 600 }}>
            Filter on the partition key itself, as a range: <QMono>order_date &gt;= …</QMono>
          </div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
