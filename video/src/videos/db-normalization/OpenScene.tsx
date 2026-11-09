import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { F, FLAT, FLAT_CONSTRAINTS, FLAT_NOT_NULL, NEW_EMAIL, UPDATE } from "./data";
import {
  BODY_Y,
  DbTable,
  Fig,
  FIG_Y,
  HEAD_H,
  Headline,
  Listing,
  listingHeight,
  MARK_BAD,
  Mono,
  ROW_H,
  tableGeometry,
  X0,
} from "./kit";
import { Drift, pulse, Reply, Spot, Tick } from "./parts";

/** The right-hand column: notes, the statement, Postgres's reply. */
const RIGHT = 1250;
const CHECKS_Y = 650;
const LISTING_Y = 496;
const LISTING_SIZE = 22;
const SCAN = `color-mix(in srgb, ${BAR} 16%, transparent)`;

/** How many rows hold a value in a column. */
const copies = (col: number, value: string | null) => FLAT.rows.filter((r) => r[col] === value).length;

/**
 * Part 1 opens on Unit 6's bridge: the shop's orders_flat passes every one of
 * its constraints, yet Ada's email and the notebook's price are each stored
 * twice, and a rushed, perfectly legal update leaves Ada with two emails.
 */
export const OpenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // The series intro holds the page until the first word, so the page waits for it.
  const open = n.beat("open").from;
  const tableAt = n.word("open", "orders table");
  const keyAt = n.word("open", "key");
  const nullAt = n.word("open", "null");
  const passesAt = n.word("open", "passes");
  const closerAt = n.word("twice", "closer");
  const emailAt = n.word("twice", "email");
  const twiceAt = n.word("twice", "twice");
  const priceAt = n.word("twice", "price");
  const changesAt = n.word("rushed", "changes");
  const rushedAt = n.word("rushed", "rushed update");
  const orderOneAt = n.word("rushed", "order one");
  const tagAt = n.word("rushed", "update one");
  const complaintsAt = n.word("rushed", "complaints");
  const twoAt = n.word("disagree", "two emails");
  const brokeAt = n.word("disagree", "broke");
  const placesAt = n.word("disagree", "two places");
  const end = n.beat("disagree").to;

  const g = tableGeometry({
    x: X0,
    top: y(BODY_Y),
    cols: FLAT.cols,
    rows: FLAT.rows,
    extra: [[null, null, NEW_EMAIL, null, null]],
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const right = g.x + g.width;
  const email = FLAT.rows[0][F.email];
  const price = FLAT.rows[0][F.price];
  const emailRows = FLAT.rows.map((r, i) => (r[F.email] === email ? i : -1)).filter((i) => i >= 0);
  const priceRows = FLAT.rows.map((r, i) => (r[F.price] === price && r[F.product] === FLAT.rows[0][F.product] ? i : -1)).filter((i) => i >= 0);
  const listTop = y(LISTING_Y);
  const listH = listingHeight(UPDATE.lines.length, LISTING_SIZE);
  // "No constraint broke": the three checks swell again.
  const recheck = pulse(frame, brokeAt, 22);

  const checks = [
    { at: keyAt, text: <>Primary key on <Mono>order_id</Mono></> },
    { at: nullAt, text: <><Mono>NOT NULL</Mono> on all {FLAT_NOT_NULL} columns</> },
    // Short enough to end well clear of Postgres's reply on the same line.
    { at: passesAt, text: <>{FLAT_CONSTRAINTS} constraints, all pass</> },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={tableAt} level={-30} />
      <Sfx name="el-tap" at={passesAt} level={-28} />
      <Sfx name="el-pop" at={twiceAt - 4} level={-30} />
      <Sfx name="el-tap" at={tagAt} level={-27} />
      <Sfx name="el-pencil" at={placesAt - 2} level={-34} />

      <Headline
        kicker="Why normalize"
        lead="Valid rows,"
        turn="wrong data."
        at={open - 6}
        turnAt={closerAt - 2}
        underlineAt={placesAt}
      />
      <Spot id="db-normalization-drawer" at={twiceAt - 6} left={1500} top={36} width={300} height={298} />

      <Drift from={closerAt} to={end + 40} amount={0.015} origin="30% 45%">
        <Fig n="1" at={tableAt - 6} y={y(FIG_Y)}>
          <Mono>orders_flat</Mono>, the shop&apos;s only table
        </Fig>
        <DbTable
          g={g}
          cols={FLAT.cols}
          rows={FLAT.rows.map((cells, i) => ({ cells, at: tableAt + 6 + i * 5 }))}
          at={tableAt}
          numeric={[F.id, F.price]}
          marks={[
            ...emailRows.map((row, k) => ({ row, col: F.email, at: emailAt + 2 + k * 5 })),
            ...priceRows.map((row, k) => ({ row, col: F.price, at: priceAt + 2 + k * 5 })),
            // Ada's email as she changes it, then both of her rows, wrong.
            { row: 0, col: F.name, at: changesAt, out: rushedAt },
            ...emailRows.map((row, k) => ({ row, col: F.email, at: twoAt + k * 6, color: MARK_BAD })),
          ]}
          swaps={[{ row: 0, col: F.email, at: orderOneAt + 4, value: NEW_EMAIL, color: ACCENT_INK }]}
          // "look closer": a pale wash runs down the rows before the copies are marked.
          bands={FLAT.rows.map((_, i) => ({ row: i, at: closerAt + i * 5, out: closerAt + 18 + i * 5, color: SCAN }))}
        />
        {/* A tick at the end of every row: each one satisfies every constraint. */}
        {FLAT.rows.map((_, i) => (
          <Tick key={i} x={right + 18} y={g.rowMid(i) - 11} at={passesAt + 4 + i * 4} />
        ))}

        {/* The constraints the table carries, ticked one by one. */}
        {checks.map((c, k) => (
          <Ink key={k} at={c.at - 2} dur={14} style={{ left: X0 + k * 360, top: y(CHECKS_Y), whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12, ...note(22, INK) }}>
              <svg width={24} height={24} style={{ overflow: "visible", transform: `scale(${1 + recheck * 0.25})` }}>
                <path d="M1,12.5 L9,20.5 L23,2" fill="none" stroke={BLUE_INK} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{c.text}</span>
            </span>
          </Ink>
        ))}

        {/* Two copies of each fact. The email's goes when the update makes it
            false (one row is new), and the price's steps back as the talk
            moves to the update. */}
        <Note at={twiceAt} out={orderOneAt + 4} x={RIGHT} y={g.rowMid(0) - 18}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <Mono>{email ?? ""}</Mono>, on {copies(F.email, email)} rows
          </span>
        </Note>
        <Note at={priceAt + 4} dim={rushedAt} x={RIGHT} y={g.rowMid(0) + 22}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            {FLAT.rows[0][F.product]} at <Mono>{price ?? ""}</Mono>, on {priceRows.length} rows
          </span>
        </Note>

        {/* The rushed update, and Postgres's answer. */}
        <Listing
          lines={UPDATE.lines}
          x={RIGHT}
          top={listTop}
          width={590}
          size={LISTING_SIZE}
          at={rushedAt - 8}
          lineAt={[rushedAt - 4, rushedAt + 4, orderOneAt - 6]}
          marks={[{ line: 2, at: orderOneAt }]}
        />
        <Reply at={tagAt - 2} x={RIGHT} y={listTop + listH + 18}>
          {UPDATE.tag}
        </Reply>
        <Note at={complaintsAt - 2} x={RIGHT + 150} y={listTop + listH + 24}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>No error, no warning.</span>
        </Note>
        <Note at={twoAt + 4} x={RIGHT} y={listTop + listH + 100}>
          <span style={{ ...label(26, ACCENT_INK), whiteSpace: "nowrap" }}>Two emails for one Ada</span>
        </Note>
        <Note at={brokeAt + 2} x={RIGHT} y={listTop + listH + 144}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Every constraint still holds.</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
