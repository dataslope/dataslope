import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { num, pct, TABLE } from "./data";
import { Headline, Kicker, lerp, STAT, STAT_INK, Svg, Sweep } from "./parts";

/** Column centres: row label, churned, stayed, total. */
const COL = { label: 160, churned: 530, stayed: 750, total: 970 } as const;
const CELL_W = 190;
const HEAD_Y = 370;
const ROW_Y = { paid: 480, free: 590, all: 730 } as const;
const CHIP_X = 1170;

/** One cell of the table, lit by a highlighter behind it. */
const Cell: React.FC<{ x: number; y: number; at: number; lit?: number; dim?: number; bold?: boolean; children: React.ReactNode }> = ({
  x,
  y,
  at,
  lit = 0,
  dim = 0,
  bold = false,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - CELL_W / 2,
        top: y - 30,
        width: CELL_W,
        textAlign: "center",
        opacity: p * (1 - dim * 0.7),
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      <span
        style={{
          ...note(42, INK),
          fontWeight: bold ? 700 : 500,
          padding: "0 10px",
          borderRadius: 6,
          background: `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(lit * 100)}%, transparent)`,
        }}
      >
        {children}
      </span>
    </div>
  );
};

/**
 * Part 2 opens on the lesson's table of 1,000 users: the overall churn rate,
 * then the rate inside each row, and what conditioning does to the
 * denominator.
 */
export const TableScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const tableFrom = n.beat("table").from;
  const usersAt = n.word("table", "thousand users");
  const planAt = n.word("table", "plan");
  const churnedAt = n.word("table", "churned");
  const quarterAt = n.word("table", "this quarter");
  const everyoneAt = n.word("overall", "everyone");
  const oneFiftyAt = n.word("overall", "a hundred and fifty");
  const fifteenAt = n.word("overall", "Fifteen percent");
  const conditionAt = n.word("paid", "condition");
  const paidUsersAt = n.word("paid", "five hundred paid");
  const thirtyAt = n.word("paid", "thirty");
  const sixAt = n.word("paid", "six percent");
  const freeUsersAt = n.word("free", "five hundred free");
  const oneTwentyAt = n.word("free", "a hundred and twenty");
  const twentyFourAt = n.word("free", "Twenty-four percent");
  const allAt = n.word("zoom", "all conditioning");
  const keepAt = n.word("zoom", "Keep only");
  const holdsAt = n.word("zoom", "condition holds");
  const splitInFrom = n.beat("split-in").from;
  const fractionAt = n.word("zoom", "fraction");
  const comparingAt = n.word("split-in", "comparing");
  const fractionsAt = n.word("split-in", "fractions");
  const linkedAt = n.word("split-in", "linked");

  // Which rows are set back, as the narration conditions on one, then the other.
  const onPaid = ease(frame, conditionAt - 2, 12) * (1 - ease(frame, freeUsersAt - 6, 12));
  const onFree = ease(frame, freeUsersAt - 6, 12) * (1 - ease(frame, comparingAt - 4, 14));
  // "Where the condition holds": everything else all but goes.
  const gone = ease(frame, holdsAt - 4, 12) * (1 - ease(frame, comparingAt - 4, 14));
  const dimPaid = Math.min(1, onFree + gone * 0.4);
  const dimFree = onPaid;
  const dimAll = Math.min(1, Math.max(onPaid, onFree) + gone * 0.4);
  // The fence goes round the row being conditioned on, then moves to the next.
  const fence = ease(frame, conditionAt - 2, 16) * (1 - ease(frame, comparingAt - 4, 14));
  const fenceY = lerp(y(ROW_Y.paid), y(ROW_Y.free), ease(frame, freeUsersAt - 6, 16));
  const fenceBold = ease(frame, keepAt - 4, 10);
  // Comparing the fractions: the table sets back so the three rates stand out.
  const tableBack = ease(frame, comparingAt - 4, 14) * 0.5;

  const rows = [
    { key: "paid" as const, name: "Paid", i: 0, dim: dimPaid },
    { key: "free" as const, name: "Free", i: 1, dim: dimFree },
  ];
  const lit = (at: number, until: number) => ease(frame, at - 4, 8) * (1 - ease(frame, until, 10));

  const chips = [
    { key: "paid", at: sixAt, given: "paid", top: TABLE.churned[0], bottom: TABLE.rowTotals[0], p: TABLE.pPaid, rowY: ROW_Y.paid, mark: comparingAt },
    { key: "free", at: twentyFourAt, given: "free", top: TABLE.churned[1], bottom: TABLE.rowTotals[1], p: TABLE.pFree, rowY: ROW_Y.free, mark: fractionsAt },
    { key: "all", at: fifteenAt, given: null, top: TABLE.churnedTotal, bottom: TABLE.total, p: TABLE.pAll, rowY: ROW_Y.all, mark: linkedAt },
  ];

  return (
    <AbsoluteFill>
      {/* ── Sound: the table filling, each rate landing, the fence ── */}
      <Sfx name="el-whoosh" at={tableFrom - 4} level={-34} />
      <Sfx name="el-sprinkle" at={quarterAt - 4} level={-34} />
      <Sfx name="el-tap" at={fifteenAt - 4} level={-28} />
      <Sfx name="el-tap" at={sixAt - 4} level={-28} />
      <Sfx name="el-tap" at={twentyFourAt - 4} level={-28} />
      <Sfx name="el-pencil" at={keepAt - 4} level={-34} />

      <Kicker at={tableFrom - 10}>Conditioning and independence</Kicker>
      <Headline top={y(150)} first="A thousand users," second="by plan and churn." firstAt={tableFrom - 6} secondAt={usersAt + 6} out={allAt - 8} />
      <Headline top={y(150)} first="Conditioning" second="zooms into the rows." firstAt={allAt - 4} secondAt={keepAt - 2} out={splitInFrom - 6} />
      <Headline top={y(150)} first={`${pct(TABLE.pPaid)} against ${pct(TABLE.pFree)}:`} second="linked?" firstAt={splitInFrom - 2} secondAt={linkedAt - 4} />
      <FigLabel n="2" title="Users by plan, and whether they churned this quarter" at={tableFrom} x={COL.label} y={y(268)} />

      {/* ── The table ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - tableBack }}>
      {(
        [
          ["Churned", COL.churned, churnedAt - 2],
          ["Stayed", COL.stayed, churnedAt + 4],
          ["Total", COL.total, everyoneAt - 4],
        ] as const
      ).map(([t, x, at]) => (
        <Ink key={t} at={at} dur={12} style={{ left: x - CELL_W / 2, top: y(HEAD_Y) - 14, width: CELL_W, textAlign: "center" }}>
          <span style={label(23, t === "Churned" ? STAT_INK : INK_SOFT)}>{t}</span>
        </Ink>
      ))}
      <div
        style={{
          position: "absolute",
          left: COL.label,
          top: y(HEAD_Y) + 26,
          width: (COL.total + CELL_W / 2 - COL.label) * ease(frame, planAt - 4, 16),
          height: 2,
          background: INK,
        }}
      />
      {rows.map((r) => (
        <React.Fragment key={r.key}>
          <Ink at={planAt + r.i * 5} dur={12} style={{ left: COL.label, top: y(ROW_Y[r.key]) - 28, opacity: 1 - r.dim * 0.7 }}>
            <span style={{ ...headline(48), color: INK }}>{r.name}</span>
          </Ink>
          <Cell x={COL.churned} y={y(ROW_Y[r.key])} at={quarterAt - 4 + r.i * 4} dim={r.dim} lit={r.i === 0 ? lit(thirtyAt, freeUsersAt - 6) : lit(oneTwentyAt, comparingAt - 4)}>
            {num(TABLE.churned[r.i])}
          </Cell>
          <Cell x={COL.stayed} y={y(ROW_Y[r.key])} at={quarterAt + r.i * 4} dim={r.dim}>
            {num(TABLE.stayed[r.i])}
          </Cell>
          <Cell
            x={COL.total}
            y={y(ROW_Y[r.key])}
            at={everyoneAt - 2 + r.i * 3}
            dim={r.dim}
            bold
            lit={r.i === 0 ? lit(paidUsersAt, freeUsersAt - 6) : lit(freeUsersAt, comparingAt - 4)}
          >
            {num(TABLE.rowTotals[r.i])}
          </Cell>
          <div
            style={{
              position: "absolute",
              left: COL.label,
              top: y(ROW_Y[r.key]) + 46,
              width: COL.total + CELL_W / 2 - COL.label,
              height: 1,
              background: HAIRLINE,
              opacity: 0.45 * ease(frame, quarterAt, 12),
            }}
          />
        </React.Fragment>
      ))}
      {/* The whole table. */}
      <div
        style={{
          position: "absolute",
          left: COL.label,
          top: y(ROW_Y.all) - 56,
          width: (COL.total + CELL_W / 2 - COL.label) * ease(frame, everyoneAt - 4, 14),
          height: 2,
          background: INK,
          opacity: 1 - dimAll * 0.7,
        }}
      />
      <Ink at={everyoneAt - 2} dur={12} style={{ left: COL.label, top: y(ROW_Y.all) - 28, opacity: 1 - dimAll * 0.7 }}>
        <span style={{ ...headline(48), color: INK }}>All</span>
      </Ink>
      <Cell x={COL.churned} y={y(ROW_Y.all)} at={everyoneAt} dim={dimAll} bold lit={lit(oneFiftyAt, conditionAt - 2)}>
        {num(TABLE.churnedTotal)}
      </Cell>
      <Cell x={COL.stayed} y={y(ROW_Y.all)} at={everyoneAt + 3} dim={dimAll} bold>
        {num(TABLE.total - TABLE.churnedTotal)}
      </Cell>
      <Cell x={COL.total} y={y(ROW_Y.all)} at={everyoneAt + 6} dim={dimAll} bold lit={lit(oneFiftyAt + 4, conditionAt - 2)}>
        {num(TABLE.total)}
      </Cell>

      {/* The fence: only the rows where the condition holds. */}
      <Svg opacity={fence}>
        <rect
          x={COL.label - 24}
          y={fenceY - 50}
          width={(COL.total + CELL_W / 2 - COL.label + 48) * Math.min(1, fence * 1.2)}
          height={100}
          rx={12}
          fill={`color-mix(in srgb, ${STAT} ${Math.round(fenceBold * 8)}%, transparent)`}
          stroke={STAT}
          strokeWidth={lerp(3, 5, fenceBold)}
          strokeDasharray="10 7"
        />
      </Svg>

      </div>

      {/* ── Each rate, on its own row ── */}
      {chips.map((c) => (
        <Ink key={c.key} at={c.at - 8} dur={16} style={{ left: CHIP_X, top: y(c.rowY) - 36, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 18 }}>
          <span style={{ ...note(30, INK) }}>
            P(churn{c.given ? <span style={{ color: INK_SOFT }}> | {c.given}</span> : null}) = {num(c.top)} /{" "}
            {c.key === "free" ? (
              <Sweep at={fractionAt} dur={14}>
                {num(c.bottom)}
              </Sweep>
            ) : (
              num(c.bottom)
            )}
          </span>
          <span style={{ ...headline(60, true), color: STAT_INK }}>
            <Sweep at={c.mark}>{pct(c.p)}</Sweep>
          </span>
        </Ink>
      ))}
      <Note at={conditionAt + 4} x={CHIP_X} y={y(ROW_Y.paid) - 96}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          The bar reads &ldquo;given&rdquo;: churn, given a paid plan.
        </span>
      </Note>
      <Note at={fractionAt + 4} x={CHIP_X} y={y(ROW_Y.all) + 64}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
          Divide by the free users only,
          <span style={{ color: INK_SOFT }}> not by all {num(TABLE.total)}.</span>
        </span>
      </Note>
    </AbsoluteFill>
  );
};
