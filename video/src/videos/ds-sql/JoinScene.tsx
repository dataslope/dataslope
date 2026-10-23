import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, TABULAR, headline, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RETAIN } from "./data";
import { colsOf, DataTable, Drift, geoOf, Listing, listingHeight, MARK_BAD, MARK_OK, OK, OK_INK, rowsAt, TableName, X0 } from "./parts";

const TOP = 350;
const FEB_X = X0 + 230;
const SQL_X = 600;
const SIZE = 21;
const CHIP_X = 1380;
const CHURN_X = 1420;

/** A big percentage with its label, for the retention each join counts. */
const Chip: React.FC<{ at: number; out?: number; x: number; y: number; value: string; color: string; children: React.ReactNode }> = ({
  at,
  out,
  x,
  y,
  value,
  color,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: p * (1 - o), transform: `translateY(${(1 - p) * 14}px)` }}>
      <div style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>{children}</div>
      <div style={{ ...headline(96), color, ...TABULAR, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
};

/**
 * Questions 1 and 2, on the video's own two months of active users. The
 * inner join draws its three matches between the tables and counts
 * retention over them: 100%. The left join keeps all six, nulls where
 * February has none: 50%. Then those null rows are the churned users, and
 * the page's anti-join returns them.
 */
export const JoinScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("join").from;
  const qAt = n.word("join", "Question");
  const textAt = n.word("join", "Inner join or left join");
  const janAt = n.word("join", "January's six active users");
  const febAt = n.word("join", "February's four");
  const innerAt = n.word("join-inner", "An inner join keeps only");
  const threeAt = n.word("join-inner", "three rows");
  const countAt = n.word("join-inner", "Count February's matches");
  const hundredAt = n.word("join-inner", "a hundred percent");
  const droppedAt = n.word("join-inner", "The users who left were dropped");
  const leftAt = n.word("join-left", "A left join keeps all six");
  const nullAt = n.word("join-left", "writes null where February");
  const halfAt = n.word("join-left", "fifty percent");
  const q2At = n.word("churn", "Question two");
  const q2TextAt = n.word("churn", "How do you find users");
  const nullsAt = n.word("churn", "Those nulls are the answer");
  const filterAt = n.word("churn", "filter where February's user ID is null");
  const usersAt = n.word("churn", "users one, four and six");
  const existsAt = n.word("churn", "Not exists returns the same three");
  const end = n.beat("rate-in").to;

  const jan = RETAIN.jan;
  const feb = RETAIN.feb;
  const jg = geoOf(jan, X0, y(TOP), h, { rowH: 44 });
  const fg = geoOf(feb, FEB_X, y(TOP), h, { rowH: 44 });
  const febIds = feb.rows.map((r) => r[0]);
  const matched = jan.rows.flatMap((r, i) => (febIds.includes(r[0]) ? [i] : []));
  const missing = jan.rows.flatMap((r, i) => (febIds.includes(r[0]) ? [] : [i]));

  const resTop = y(TOP) + listingHeight(RETAIN.inner.lines.length, SIZE) + h(22);
  const ig = geoOf(RETAIN.inner, SQL_X, resTop, h, { rowH: 44 });
  const lg = geoOf(RETAIN.left, SQL_X, resTop, h, { rowH: 44 });
  const leftNulls = RETAIN.left.rows.flatMap((r, i) => (r[1] === "null" ? [i] : []));
  const cg = geoOf(RETAIN.churn, CHURN_X, y(TOP) + h(40), h, { rowH: 44 });
  const pct = (t: { rows: string[][] }) => `${Math.round(Number(t.rows[0][0]) * 100)}%`;

  const lineIn = ease(frame, innerAt + 6, 16);
  const lineOut = ease(frame, leftAt, 10);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={innerAt + 6} level={-34} />
      <Sfx name="el-scratch" at={hundredAt + 2} level={-32} />
      <Sfx name="el-pop" at={halfAt} level={-32} />
      <Sfx name="el-pencil" at={filterAt + 4} level={-34} />
      <Sfx name="el-pop" at={usersAt + 2} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} out={q2At - 4} size={60}>
          <QMono>INNER</QMono> or <QMono>LEFT JOIN</QMono>: which does a retention query need?
        </QuestionCard>
        <QuestionCard n={2} at={q2At} textAt={q2TextAt - 2} size={60}>
          How do you find users active one month but not the next?
        </QuestionCard>

        {/* ── The two months ── */}
        <TableName g={jg} at={janAt - 2}>
          active_jan
        </TableName>
        <DataTable
          g={jg}
          cols={colsOf(jan, { user_id: { ink: BLUE_INK } })}
          at={janAt - 2}
          rows={rowsAt(jan.rows, janAt)}
          bands={[
            ...missing.map((row, k) => ({ row, at: droppedAt + k * 3, out: leftAt, color: MARK_BAD })),
            ...missing.map((row, k) => ({ row, at: nullsAt + k * 3, color: MARK_OK })),
          ]}
        />
        <TableName g={fg} at={febAt - 2}>
          active_feb
        </TableName>
        <DataTable g={fg} cols={colsOf(feb, { user_id: { ink: BLUE_INK } })} at={febAt - 2} rows={rowsAt(feb.rows, febAt)} dim={q2At} />

        {/* The inner join's matches, drawn between the tables. */}
        {lineIn > 0 && lineOut < 1 && (
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - lineOut }}>
            {matched.map((row, k) => {
              const to = febIds.indexOf(jan.rows[row][0]);
              const p = ease(frame, innerAt + 6 + k * 4, 12);
              const x1 = jg.right + 4;
              const y1 = jg.rowMid(row);
              const x2 = fg.x - 4;
              const y2 = fg.rowMid(to);
              return <path key={row} d={`M${x1},${y1} L${x1 + (x2 - x1) * p},${y1 + (y2 - y1) * p}`} stroke={BAR} strokeWidth={3} fill="none" />;
            })}
          </svg>
        )}

        {/* ── 1. The inner join, then the left ── */}
        <Listing lines={RETAIN.inner.lines} x={SQL_X} top={y(TOP)} width={700} size={SIZE} at={innerAt - 4} out={leftAt - 2} marks={[{ line: 2, at: innerAt + 2 }]} />
        <DataTable g={ig} cols={colsOf(RETAIN.inner, { feb: { ink: BLUE_INK } })} at={threeAt - 4} out={leftAt - 2} rows={rowsAt(RETAIN.inner.rows, threeAt, 3)} />
        <Chip at={countAt + 4} out={leftAt} x={CHIP_X} y={y(TOP) + h(40)} value={pct(RETAIN.innerRate)} color={ACCENT_INK}>
          retention, counted over the inner join
        </Chip>
        <Note at={droppedAt + 4} x={CHIP_X} y={y(TOP) + h(210)} out={leftAt}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>
            users 1, 4 and 6
            <br />
            were never counted
          </span>
        </Note>

        <Listing
          lines={RETAIN.left.lines}
          x={SQL_X}
          top={y(TOP)}
          width={700}
          size={SIZE}
          at={leftAt}
          out={q2At}
          marks={[{ line: 2, at: leftAt + 6, color: MARK_OK }]}
        />
        <DataTable
          g={lg}
          cols={colsOf(RETAIN.left, { feb: { ink: BLUE_INK } })}
          at={leftAt + 2}
          rows={rowsAt(RETAIN.left.rows, leftAt + 6, 2)}
          marks={leftNulls.map((row, k) => ({ row, col: 1, at: nullAt + 6 + k * 3, out: q2At }))}
          bands={leftNulls.map((row, k) => ({ row, at: nullsAt + k * 3, color: MARK_OK }))}
        />
        <Chip at={halfAt - 4} out={q2At} x={CHIP_X} y={y(TOP) + h(40)} value={pct(RETAIN.leftRate)} color={OK_INK}>
          retention, over the left join
        </Chip>

        {/* ── 2. The nulls are the churn ── */}
        <Listing
          lines={RETAIN.churn.lines}
          x={SQL_X}
          top={y(TOP)}
          width={760}
          size={SIZE - 1}
          at={q2At + 6}
          marks={[{ line: 3, at: filterAt + 4, color: MARK_OK }]}
          out={end}
        />
        <div
          style={{
            position: "absolute",
            left: CHURN_X,
            top: y(TOP) - h(4),
            ...label(21, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, usersAt - 4, 12),
          }}
        >
          churned
        </div>
        <DataTable g={cg} cols={colsOf(RETAIN.churn, { user_id: { ink: BLUE_INK } })} at={usersAt - 4} rows={rowsAt(RETAIN.churn.rows, usersAt, 4)} />
        <Note at={existsAt} x={CHURN_X} y={cg.rowTop(RETAIN.churn.rows.length) + h(22)}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, ...note(24, INK), whiteSpace: "nowrap" }}>
            <QMono>NOT EXISTS</QMono>: the same three
            <Tick at={existsAt + 8} size={24} color={OK} />
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
