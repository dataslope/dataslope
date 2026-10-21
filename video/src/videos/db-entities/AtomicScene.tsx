import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, ENTITY, entityLayout, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { PACKED, PHONES_COL } from "./data";
import { DbTable, HEAD_H, Listing, MARK_BAD, ROW_H, tableGeometry } from "./kit";
import { BoxPulse, Drift, Headline, lerp, Pulse, Stack, STAT_INK, Svg } from "./parts";

const S = 1.2;
const X = 120;
const BOX_X = 1260;
const BOX_W = 360;

/**
 * One value per cell: the lesson's packed phone_numbers cell, which a search
 * for either number cannot find (Postgres returned no rows). Then the other
 * way a fact grows up: saved addresses, many per customer, become an entity
 * of their own, and the address row they came from is struck. The packed
 * example leaves as that question starts, so two different customers tables
 * are never on the page together. It ends on the turn to drawing.
 */
export const AtomicScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("atomic").from;
  const cellAt = n.word("atomic", "per cell");
  const packAt = n.word("atomic", "Pack");
  const twoAt = n.word("atomic", "two phone");
  const searchAt = n.word("atomic", "searching");
  const nothingAt = n.word("atomic", "finds nothing");
  const factAt = n.word("entity-or", "a fact");
  const detailsAt = n.word("entity-or", "details");
  const copiesAt = n.word("entity-or", "lots of copies");
  const savedAt = n.word("entity-or", "saved addresses");
  const tooAt = n.word("entity-or", "entity too");
  const boxesAt = n.word("erd-in", "Boxes");
  const end = n.beat("erd-in").to;

  const top = y(352);
  const g = tableGeometry({ x: 0, top: 0, cols: PACKED.cols, rows: PACKED.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const tableBottom = top + g.bottom(PACKED.rows.length) * S;

  const customers = useEntityLayout({
    x: BOX_X,
    y: y(352),
    width: BOX_W,
    name: "customers",
    // No key badge yet: the video names PK when it draws the diagram.
    columns: [{ name: "id" }, { name: "name" }, { name: "email" }, { name: "address" }],
  });
  const addressRow = customers.columns.findIndex((c) => c.name === "address");
  const address = customers.rows[addressRow];
  const addresses = entityLayout({ x: BOX_X, y: y(720), width: BOX_W, name: "addresses", columns: [] }, h);
  // The new entity rises out of the address row and settles below.
  const rise = ease(frame, savedAt, 22);
  const dy = lerp(customers.rows[addressRow].top - addresses.y, 0, rise);
  // The packed example goes as the new question starts, and the customers box
  // glides from the right into the middle of the page in its place.
  const leftOut = factAt - 6;
  const glide = interpolate(frame, [factAt - 4, factAt + 32], [0, 520], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
  // Once addresses has settled, the row it came from is struck out of customers.
  const struckAt = savedAt + 20;
  const strike = ease(frame, struckAt, 12);

  return (
    <AbsoluteFill>
      {/* ── Sound: the packed cell, the empty answer, the address moving out ── */}
      <Sfx name="el-pencil" at={twoAt} level={-35} />
      <Sfx name="el-pop" at={nothingAt} level={-30} />
      <Sfx name="el-tap" at={factAt} level={-30} />
      <Sfx name="el-whoosh" at={savedAt} level={-33} />
      <Sfx name="el-tap" at={savedAt + 20} level={-29} />

      <Drift from={tooAt} to={end + 70} scale={0.02} origin={[1440, 600]}>
        <Headline lead="One value per cell." leadAt={from - 6} out={n.beat("erd-in").from - 2} />

        {/* ── A packed cell ── */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, leftOut, 16) }}>
          <div style={{ position: "absolute", left: X, top, transform: `scale(${S})`, transformOrigin: "0 0" }}>
            <DbTable
              g={g}
              cols={PACKED.cols}
              rows={PACKED.rows.map((cells) => ({ cells, at: cellAt + 2 }))}
              at={cellAt - 4}
              numeric={[0]}
              marks={[{ row: 0, col: PHONES_COL, at: twoAt, color: MARK_BAD }]}
            />
          </div>
          <Note at={packAt + 2} x={X + g.xs[PHONES_COL] * S} y={tableBottom + 14} from="up">
            <span style={{ ...note(23, STAT_INK), whiteSpace: "nowrap" }}>Two facts in one cell</span>
          </Note>
          <Listing lines={[PACKED.search]} x={X} top={y(560)} width={960} size={22} at={searchAt - 6} lineAt={[searchAt - 2]} />
          <Ink at={nothingAt - 2} dur={14} style={{ left: X, top: y(650), whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 26, color: STAT_INK, fontWeight: 700 }}>({PACKED.found} rows)</span>
            <span style={{ ...note(23, INK_SOFT), marginLeft: 18 }}>though Ada has that number</span>
          </Ink>
        </div>

        {/* ── A fact with details of its own becomes an entity ── */}
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${-glide}px)` }}>
          <Ink at={factAt - 6} dur={14} style={{ left: BOX_X, top: customers.top - 46, whiteSpace: "nowrap" }}>
            <span style={label(22, INK_SOFT)}>Attribute, or entity?</span>
          </Ink>
          <Entity
            layout={customers}
            at={factAt - 4}
            rowGap={3}
            marks={{ address: { at: detailsAt, tone: "warn", out: struckAt } }}
          />
          <Svg>
            <rect
              x={BOX_X + ENTITY.border}
              y={address.top}
              width={BOX_W - 2 * ENTITY.border}
              height={customers.row}
              fill={PAPER}
              opacity={0.55 * strike}
            />
            <line
              x1={BOX_X + ENTITY.pad - 6}
              x2={BOX_X + ENTITY.pad - 6 + 104 * strike}
              y1={address.mid}
              y2={address.mid}
              stroke={STAT_INK}
              strokeWidth={2.6}
              strokeLinecap="round"
              opacity={strike > 0 ? 1 : 0}
            />
          </Svg>
          <div style={{ position: "absolute", inset: 0, transform: `translateY(${dy}px)` }}>
            <Stack layout={addresses} at={savedAt + 14} />
            <Entity layout={addresses} at={savedAt - 2} />
          </div>
          <Pulse x={customers.right - 40} y={customers.rows[addressRow].mid} at={copiesAt} r={10} color={STAT_INK} />
          <BoxPulse x={addresses.x} y={addresses.y} width={BOX_W} height={addresses.head} at={tooAt} />
          {/* "Boxes and facts": the two boxes the next part draws. */}
          <BoxPulse x={customers.x} y={customers.y} width={BOX_W} height={customers.height} at={boxesAt} />
          <BoxPulse x={addresses.x} y={addresses.y} width={BOX_W} height={addresses.head} at={boxesAt + 4} />
          <Note at={tooAt + 2} x={BOX_X} y={addresses.bottom + 46} from="up">
            <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
              An entity of its own, <span style={{ color: INK_SOFT }}>many per customer</span>
            </span>
          </Note>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
