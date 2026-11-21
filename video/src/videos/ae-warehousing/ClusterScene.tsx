import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { ColumnRule, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CLUSTER, mb } from "./data";
import { COLUMN_TINT, Drift, OK, OK_INK, X0, KindTag } from "./parts";

const AX0 = 420;
const AX1 = 1480;
const MONTHS_Y = 356;
const SORTED_Y = 392;
const SORTED_STEP = 19;
const SORTED_BAR = 14;
const SHUFFLED_Y = 590;
const SHUFFLED_STEP = 14;
const SHUFFLED_BAR = 10;
const RESULT_X = 1530;
const DIFF_Y = 756;
const DIFF_X = [X0, 980];
const RULE_X = 930;
const RULE_Y = 848;

const DAY = 86_400_000;
const YEAR0 = Date.UTC(2024, 0, 1);
const dayOf = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - YEAR0) / DAY);
const xOf = (day: number) => AX0 + (day / 366) * (AX1 - AX0);
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthStart = (m: number) => Math.round((Date.UTC(2024, m, 1) - YEAR0) / DAY);
/** "Feb 14". */
const short = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

/**
 * Question 7, after de-warehousing's ClusterScene. The million sales in one
 * Parquet file, its nine blocks of rows (row groups) drawn as the date range
 * each one's first and last date covers, against a band for March. In date
 * order two blocks cross March and the query read 1.13 MB; shuffled, every
 * block spans the year, none can be skipped, and it read 5.74 MB. Then the
 * difference from partitioning, two columns, and the rule.
 */
export const ClusterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cluster").from;
  const qAt = n.word("cluster", "Question seven");
  const qTextAt = n.word("cluster", "What is clustering");
  const sortsAt = n.word("cluster-def", "Clustering sorts rows inside storage");
  const skipAt = n.word("cluster-def", "skip blocks that can't match");
  const fileAt = n.word("cluster-def", "In the sales file");
  const recordsAt = n.word("cluster-def", "records its first and last date");
  const orderAt = n.word("cluster-def", "In date order");
  const marchAt = n.word("cluster-def", "March overlaps");
  const twoAt = n.word("cluster-def", "two blocks of nine");
  const shuffledAt = n.word("cluster-def", "Shuffled");
  const spansAt = n.word("cluster-def", "every block spans the year");
  const fiveAt = n.word("cluster-def", "five times the bytes");
  const coarseAt = n.word("cluster-diff", "Partitions are coarse");
  const capAt = n.word("cluster-diff", "often with a cap");
  const fineAt = n.word("cluster-diff", "Clustering is fine-grained");
  const manyAt = n.word("cluster-diff", "columns with many values");
  const ruleAt = n.word("cluster-rule", "So partition by date");
  const keysAt = n.word("cluster-rule", "cluster by the high-cardinality keys");
  const end = n.beat("cluster-rule").to;

  const [lo, hi] = CLUSTER.range;
  const bandX0 = xOf(dayOf(lo));
  const bandX1 = xOf(dayOf(hi) + 1);
  const overlaps = (g: { lo: string; hi: string }) => g.hi >= lo && g.lo <= hi;
  const dim = coarseAt - 2;

  const panel = (top: number, step: number, bar: number, groups: readonly { id: number; lo: string; hi: string }[], at: number, readAt: number, readColor: string, labels: boolean) => (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - 0.55 * ease(frame, dim, 14) }}>
      {groups.map((g, i) => {
        const p = ease(frame, at + i * 2, 12);
        if (p <= 0) return null;
        const hit = overlaps(g);
        const r = ease(frame, readAt + i * 1.5, 10);
        const x0 = xOf(dayOf(g.lo));
        const x1 = xOf(dayOf(g.hi) + 1);
        const yy = y(top) + i * h(step);
        return (
          <g key={g.id} opacity={hit ? 1 : 1 - 0.6 * r}>
            <rect
              x={x0}
              y={yy}
              width={(x1 - x0) * p}
              height={h(bar)}
              rx={3}
              fill={hit && r > 0 ? `color-mix(in srgb, ${readColor} ${Math.round(100 * r)}%, ${COLUMN_TINT.sale_date})` : COLUMN_TINT.sale_date}
            />
            {labels && hit ? (
              <text x={x1 + 12} y={yy + h(bar) - 1} style={svgText(label(19, INK))} opacity={ease(frame, readAt + 6, 10)}>
                {short(g.lo)} to {short(g.hi)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={sortsAt + 4} level={-34} />
      <Sfx name="el-tap" at={fileAt} level={-33} />
      <Sfx name="el-pencil" at={marchAt} level={-35} />
      <Sfx name="el-tap" at={twoAt} level={-33} />
      <Sfx name="el-sprinkle" at={shuffledAt + 2} level={-34} />
      <Sfx name="el-tap" at={fiveAt} level={-33} />
      <Sfx name="el-pencil" at={coarseAt} level={-35} />
      <Sfx name="el-pencil" at={fineAt} level={-35} />
      <Sfx name="el-chime" at={keysAt + 6} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          What is clustering, and how does it differ from partitioning?
        </QuestionCard>
        <Note at={sortsAt} x={X0} y={y(280)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            Rows sorted inside storage
            <span style={{ opacity: ease(frame, skipAt, 10) }}>, so blocks that can&rsquo;t match a filter are skipped</span>
          </span>
        </Note>
        <Note at={fileAt} x={X0} y={y(280) + h(38)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.6em", fontSize: 23 }}>
            <KindTag kind="measured" />
            <span>
              The sales file<span style={{ opacity: ease(frame, recordsAt, 10) }}>: each block of rows records its first and last date, drawn as a span</span>
            </span>
          </span>
        </Note>

        {/* ── The year, and March ── */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - 0.55 * ease(frame, dim, 14) }}>
          <rect
            x={bandX0}
            y={y(MONTHS_Y) - 4}
            width={bandX1 - bandX0}
            height={(y(SHUFFLED_Y) + 9 * h(SHUFFLED_STEP) + 6 - (y(MONTHS_Y) - 4)) * ease(frame, marchAt, 14)}
            fill={HIGHLIGHT}
            opacity={0.55}
          />
          {MONTH_NAMES.map((m, i) => (
            <g key={m} opacity={ease(frame, recordsAt + i * 1.5, 10)}>
              <line x1={xOf(monthStart(i))} x2={xOf(monthStart(i))} y1={y(MONTHS_Y) + 4} y2={y(MONTHS_Y) + 28} stroke={INK} strokeOpacity={0.35} />
              <text x={xOf(monthStart(i)) + 6} y={y(MONTHS_Y) + 22} style={svgText(label(19, i === 2 && frame >= marchAt ? INK : INK_SOFT))}>
                {m}
              </text>
            </g>
          ))}
        </svg>

        {/* ── In date order ── */}
        <div style={{ position: "absolute", left: X0, top: y(SORTED_Y) - 4, width: AX0 - X0 - 20, opacity: ease(frame, orderAt - 2, 12) * (1 - 0.55 * ease(frame, dim, 14)) }}>
          <div style={{ ...label(23, INK) }}>In date order</div>
          <div style={{ ...note(20, INK_SOFT), marginTop: 6 }}>
            <Num>{CLUSTER.groups.length}</Num> blocks, six weeks each
          </div>
        </div>
        {panel(SORTED_Y, SORTED_STEP, SORTED_BAR, CLUSTER.groups, recordsAt + 4, twoAt, BAR, true)}
        <div style={{ position: "absolute", left: RESULT_X, top: y(SORTED_Y) + h(SORTED_STEP) * 2, opacity: ease(frame, twoAt + 4, 12) * (1 - 0.55 * ease(frame, dim, 14)) }}>
          <div style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            <Num>{CLUSTER.overlapping}</Num> of <Num>{CLUSTER.groups.length}</Num> blocks read
          </div>
          <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", marginTop: 4 }}>
            <Num>{mb(CLUSTER.sortedRead, 2)}</Num>
          </div>
        </div>

        {/* ── Shuffled ── */}
        <div style={{ position: "absolute", left: X0, top: y(SHUFFLED_Y) - 4, width: AX0 - X0 - 20, opacity: ease(frame, shuffledAt, 12) * (1 - 0.55 * ease(frame, dim, 14)) }}>
          <div style={{ ...label(23, INK) }}>Shuffled</div>
          <div style={{ ...note(20, INK_SOFT), marginTop: 6, opacity: ease(frame, spansAt, 10) }}>every block spans the year</div>
        </div>
        {panel(SHUFFLED_Y, SHUFFLED_STEP, SHUFFLED_BAR, CLUSTER.shuffledGroups, shuffledAt + 4, spansAt + 10, ACCENT, false)}
        <div style={{ position: "absolute", left: RESULT_X, top: y(SHUFFLED_Y), opacity: ease(frame, spansAt + 14, 12) * (1 - 0.55 * ease(frame, dim, 14)) }}>
          <div style={{ ...note(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            <Num>{CLUSTER.shuffledOverlapping}</Num> of <Num>{CLUSTER.shuffledGroups.length}</Num> blocks read
          </div>
          <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", marginTop: 4, opacity: ease(frame, fiveAt - 4, 10) }}>
            <Num>{mb(CLUSTER.shuffledRead, 2)}</Num>
            <span style={{ color: ACCENT_INK, fontWeight: 500 }}>
              , <Num>{Math.round(CLUSTER.ratio)}</Num> times the bytes
            </span>
          </div>
        </div>

        {/* ── Partitions against clustering ── */}
        <ColumnRule x={RULE_X} top={y(DIFF_Y)} height={h(66)} at={fineAt} />
        <Note at={coarseAt} x={DIFF_X[0]} y={y(DIFF_Y)}>
          <span style={{ ...label(24, INK), whiteSpace: "nowrap" }}>Partitions: coarse</span>
        </Note>
        <Note at={coarseAt + 6} x={DIFF_X[0]} y={y(DIFF_Y) + h(36)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            A few large segments<span style={{ opacity: ease(frame, capAt, 10) }}>, often a cap on how many</span>
          </span>
        </Note>
        <Note at={fineAt} x={DIFF_X[1]} y={y(DIFF_Y)}>
          <span style={{ ...label(24, INK), whiteSpace: "nowrap" }}>Clustering: fine-grained</span>
        </Note>
        <Note at={fineAt + 6} x={DIFF_X[1]} y={y(DIFF_Y) + h(36)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            Sorted inside<span style={{ opacity: ease(frame, manyAt, 10) }}>, and fine with columns of many values</span>
          </span>
        </Note>
        <div style={{ position: "absolute", left: X0, top: y(RULE_Y), display: "flex", alignItems: "center", gap: 12, ...note(25, INK), whiteSpace: "nowrap", opacity: ease(frame, ruleAt - 2, 12) }}>
          <Tick at={ruleAt + 4} size={25} color={OK} />
          <span>
            <b style={{ color: OK_INK }}>Partition by date</b>
            <span style={{ opacity: ease(frame, keysAt, 10) }}>, cluster by the high-cardinality keys your filters use</span>
          </span>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
