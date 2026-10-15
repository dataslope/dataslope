import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { FIRST, ILLUSTRATIONS, PARTITIONS, PAYOFF, PAYOFF_SQL, VIDEO } from "./data";
import {
  BODY_Y,
  CellText,
  cellBox,
  COL_W,
  Fig,
  FIG_Y,
  HeadText,
  Headline,
  LIST_W,
  Listing,
  MARK,
  PartitionBar,
  REGION_WASH,
  Ring,
  Rules,
  useTable,
  Wash,
  X0,
} from "./kit";

/**
 * Share, order, running: the payoff. One query adds a share of the region and
 * a running total to the same six rows. A band over the amounts shows which
 * rows each running sum has read so far.
 */
export const PayoffScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("share").from - 8;
  const divisionAt = n.word("share", "one division away");
  const firstAt = n.word("share", "first North sale");
  const thirdAt = n.word("share", "about a third");
  const orderAt = n.word("order", "ORDER BY day");
  const eachAt = n.word("order", "each sum");
  const stopsAt = n.word("order", "stops");
  const currentAt = n.word("order", "current row");
  const climbsAt = n.word("running", "three hundred fifty-five");
  const overAt = n.word("running", "starts over");
  const restartAt = n.word("running", "one hundred seventy-five");

  /** The six rows and their region washes are the ones the last scene closed
   *  on, so they are already printed when this scene fades in. */
  const base = open - 40;
  const top = y(BODY_Y);
  const g = useTable(PAYOFF.columns, top);
  const AMOUNT = PAYOFF.columns.indexOf("amount");
  const PCT = PAYOFF.columns.indexOf("pct");
  const RUN = PAYOFF.columns.indexOf("running_total");
  const rows = PAYOFF.rows.length;
  const [north, south] = PARTITIONS;
  /** The table's width so far: each new column's room opens as it arrives. */
  const tableW =
    g.width -
    COL_W.pct * (1 - ease(frame, divisionAt - 10, 14)) -
    COL_W.running_total * (1 - ease(frame, orderAt - 6, 14));

  // When the running sum reaches each row: North as the narration says
  // "each sum stops at the current row", South once it "starts over".
  const reach = [eachAt - 2, stopsAt, currentAt, overAt, restartAt + 16, restartAt + 30];
  const runAt = (i: number) => reach[i];
  /** The row the band has reached in partition `p`, fractional in motion. */
  const reached = (p: (typeof PARTITIONS)[number]) => {
    let k = p.first;
    for (let i = p.first + 1; i <= p.last; i++) k += ease(frame, reach[i] - 4, 10);
    return k;
  };
  const band = (p: (typeof PARTITIONS)[number], out?: number) => {
    const on = ease(frame, reach[p.first] - 6, 10);
    const off = out === undefined ? 0 : ease(frame, out, 12);
    const k = reached(p);
    if (on <= 0 || off >= 1) return null;
    const t = g.rowTop(p.first) + 3;
    const b = g.rowTop(k + 1) - 3;
    const cur = g.rowTop(k) + 3;
    return (
      <React.Fragment key={p.region}>
        {/* The amounts the sum has read so far. */}
        <div
          style={{
            position: "absolute",
            left: g.colX[AMOUNT],
            top: t,
            width: COL_W.amount,
            height: b - t,
            background: MARK,
            opacity: on * (1 - off),
          }}
        />
        {/* The row whose sum it is. */}
        <div
          style={{
            position: "absolute",
            left: g.colX[RUN],
            top: cur,
            width: COL_W.running_total,
            height: b - cur,
            background: MARK,
            opacity: on * (1 - off),
          }}
        />
      </React.Fragment>
    );
  };

  const jars = pop(frame, eachAt - 6, fps, 16);

  return (
    <AbsoluteFill>
      <Headline kicker="Two more columns, from one query" line1="A share of the region," line2="and a running total." at={open + 2} />
      <Fig n="4" at={open + 6} y={y(FIG_Y)}>
        Two windows over the same six rows
      </Fig>

      <Listing
        lines={PAYOFF_SQL}
        x={X0}
        top={top}
        width={LIST_W}
        at={open + 4}
        lineAt={[open + 8, divisionAt - 4, divisionAt + 2, orderAt - 6, orderAt - 1, orderAt + 4, open + 12, open + 16]}
        marks={[
          { line: 1, at: divisionAt + 4, start: 14, chars: 20, out: orderAt - 8 },
          { line: 4, at: orderAt + 2, start: 24, chars: 12 },
        ]}
      />

      {PARTITIONS.map((p) => (
        <React.Fragment key={p.region}>
          <Wash g={g} from={p.first} to={p.last} color={REGION_WASH[p.region]} at={base} dur={16} rowWidth={tableW} />
          <PartitionBar g={g} from={p.first} to={p.last} region={p.region} at={base} />
        </React.Fragment>
      ))}
      {band(north, overAt - 4)}
      {band(south)}

      {/* The rules widen for each new column as it arrives. */}
      <Rules
        g={g}
        rows={rows}
        at={base}
        width={tableW}
      />
      {PAYOFF.columns.map((c, ci) => (
        <Ink
          key={c}
          at={ci === PCT ? divisionAt - 6 : ci === RUN ? orderAt - 2 : base}
          dur={12}
          style={cellBox(g, ci, top + 2, g.headH - 2)}
        >
          <HeadText color={ci === PCT || ci === RUN ? ACCENT_INK : undefined}>{c}</HeadText>
        </Ink>
      ))}
      {PAYOFF.rows.map((row, i) =>
        row.map((v, ci) => (
          <Ink
            key={`${i}-${ci}`}
            at={ci === PCT ? divisionAt + i * 3 : ci === RUN ? runAt(i) : base}
            dur={12}
            style={cellBox(g, ci, g.rowTop(i), g.rowH)}
          >
            <CellText col={PAYOFF.columns[ci]} value={v} weight={ci === PCT || ci === RUN ? 650 : undefined} />
          </Ink>
        )),
      )}

      {/* "The first North sale is about a third of its region." */}
      <Ring g={g} from={0} to={0} col={AMOUNT} at={firstAt - 2} out={orderAt - 8} />
      <Ring g={g} from={0} to={0} col={PCT} at={thirdAt - 2} out={orderAt - 8} />
      <Note at={thirdAt} out={orderAt - 8} x={g.x} y={g.rowTop(rows) + h(22)} from="up">
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          <span style={{ color: INK, fontWeight: 600 }}>{FIRST.amount}</span> of North&apos;s {FIRST.total} is{" "}
          <span style={{ color: INK, fontWeight: 600 }}>{FIRST.pct}%</span>, about a third
        </span>
      </Note>

      {/* "North climbs to three hundred fifty-five", "South starts over at one hundred seventy-five". */}
      <Ring g={g} from={north.last} to={north.last} col={RUN} at={climbsAt - 2} out={overAt + 2} />
      <Ring g={g} from={south.first} to={south.first} col={RUN} at={restartAt - 2} />
      <Note at={overAt + 2} x={g.x} y={g.rowTop(rows) + h(22)} from="up">
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          Each region&apos;s running total starts again at its first row
        </span>
      </Note>

      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="window-functions-jars"
          style={{
            position: "absolute",
            left: 1300,
            top: y(102),
            width: 480,
            height: h(250),
            opacity: jars,
            transform: `translateY(${bob(frame, 4, 110) + (1 - jars) * 26}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
