import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { useLayout } from "../../editorial/layout";
import { INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BANANA, CHECK_SQL, LOOSE, LOOSE_IN, LOOSE_OUT } from "./data";
import { DbTable, ErrorBox, Fig, FIG_GAP, HEAD_H, Listing, Mono, ROW_H, tableGeometry } from "./kit";
import { Bracket, Drift, Headline, OK_INK, OK_WASH, STAT_INK } from "./parts";

const S = 1.3;
/** Where the loose table ends up, beside the CHECK listing. */
const LOOSE_X = 130;
/** Where it sits while it is the only figure: nearer the middle of the page,
 *  so the right half isn't left empty. It glides left on "narrow it". */
const LOOSE_FROM_X = 640;
const RIGHT_X = 600;
const RIGHT_W = 1200;

/**
 * Status as plain text takes the four spellings the lesson names, and nobody
 * can say which mean the same. The lesson's CHECK narrows the domain: of the
 * four, only "shipped" gets in, and "banana" is refused by name.
 */
export const DomainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("loose").from;
  const textAt = n.word("loose", "just text");
  const anythingAt = n.word("loose", "anything");
  const spellAt = [
    n.word("loose", "Sent"),
    n.word("loose", "shipped"),
    n.word("loose", "ship"),
    n.word("loose", "done"),
  ];
  const sameAt = n.word("loose", "mean the same");
  const narrowAt = n.word("narrow", "narrow it");
  const fourAt = n.word("narrow", "Four statuses");
  const totalAt = n.word("narrow", "no total");
  const zeroAt = n.word("narrow", "zero");
  const onlyAt = n.word("narrow", "only shipped");
  const getsAt = n.word("narrow", "gets in");
  const bananaAt = n.word("banana", "banana");
  const refusedAt = n.word("banana", "Refused");
  const ruleAt = n.word("banana", "name of the rule");
  const end = n.beat("banana").to;

  const top = y(372);
  const g = tableGeometry({ x: 0, top: 0, cols: LOOSE.cols, rows: LOOSE.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const rowsTop = top + g.rowTop(0) * S;
  const rowsBottom = top + g.bottom(LOOSE.rows.length) * S;
  const looseRight = LOOSE_X + g.width * S;
  const statusLine = CHECK_SQL.findIndex((l) => l.includes("status IN"));
  const totalLine = CHECK_SQL.findIndex((l) => l.includes("total_cents >="));
  const listTop = y(372);
  // Low enough for Fig. 8's label to sit on its own line under the CHECKs.
  const bananaTop = y(664);
  const errorTop = y(742);
  /** The error box's height: its padding and two lines of 21px mono. */
  const errorBottom = errorTop + 34 + 2 * 21 * 1.5 + 8;
  // "So narrow it": the table moves aside, then the listing comes in on "Four statuses".
  const glide = interpolate(frame, [narrowAt - 6, narrowAt + 22], [LOOSE_FROM_X - LOOSE_X, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
  const listAt = Math.max(fourAt - 8, narrowAt + 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: the spellings going in, the strikes, the refusal ── */}
      <Sfx name="el-tap" at={spellAt[0]} level={-29} />
      <Sfx name="el-tap" at={spellAt[3]} level={-30} />
      <Sfx name="el-pencil" at={sameAt - 2} level={-34} />
      <Sfx name="el-scratch" at={getsAt} level={-32} />
      <Sfx name="el-pop" at={refusedAt - 2} level={-32} />
      <Sfx name="el-pencil" at={ruleAt} level={-35} />

      <Drift from={ruleAt + 10} to={end + 70} scale={0.018} origin={[960, 560]}>
        <Headline lead="Text takes anything." leadAt={from - 6} turn="So narrow it." turnAt={narrowAt - 4} />

        {/* ── status as plain text ── */}
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${glide}px)` }}>
          <Fig n="6" at={textAt - 4} x={LOOSE_X} y={top - FIG_GAP}>
            <Mono>status</Mono> as plain text
          </Fig>
          <div style={{ position: "absolute", left: LOOSE_X, top, transform: `scale(${S})`, transformOrigin: "0 0" }}>
            <DbTable
              g={g}
              cols={LOOSE.cols}
              rows={LOOSE.rows.map((cells, i) => ({
                cells,
                at: spellAt[i] - 2,
                strikeAt: LOOSE_OUT.includes(i) ? getsAt + LOOSE_OUT.indexOf(i) * 4 : undefined,
                dimAt: LOOSE_OUT.includes(i) ? getsAt + 14 : undefined,
              }))}
              at={textAt - 2}
              numeric={[0]}
              bands={LOOSE_IN.map((row) => ({ row, at: onlyAt, color: OK_WASH }))}
            />
          </div>
          <Note at={anythingAt - 2} out={spellAt[0] - 2} x={looseRight + 30} y={rowsTop + 10}>
            <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>Anything goes in</span>
          </Note>
          {/* The question holds through the pause, and leaves as the table moves aside. */}
          <Bracket x={looseRight + 14} y0={rowsTop + 6} y1={rowsBottom - 6} at={sameAt - 2} out={narrowAt + 6} />
          <Note at={sameAt + 4} out={narrowAt + 6} x={looseRight + 42} y={(rowsTop + rowsBottom) / 2 - 30}>
            <span style={{ ...note(23, STAT_INK), whiteSpace: "nowrap" }}>
              {LOOSE.distinct} values.
              <br />
              The same state?
            </span>
          </Note>
          {LOOSE_IN.map((row) => (
            <Note key={row} at={onlyAt + 6} x={looseRight + 30} y={top + g.rowMid(row) * S - 15}>
              <span style={{ ...note(23, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>gets in</span>
            </Note>
          ))}
        </div>

        {/* ── The narrow domain: the lesson's two CHECKs ── */}
        <Fig n="7" at={listAt - 2} x={RIGHT_X} y={listTop - FIG_GAP}>
          <Mono>status</Mono> and <Mono>total_cents</Mono>, narrowed by <Mono>CHECK</Mono>
        </Fig>
        <Listing
          lines={CHECK_SQL}
          x={RIGHT_X}
          top={listTop}
          width={RIGHT_W}
          size={24}
          at={listAt}
          lineAt={CHECK_SQL.map((_, i) => (i <= statusLine ? (i === statusLine ? fourAt + 2 : listAt + 2) : i < totalLine ? totalAt - 2 : zeroAt - 4))}
          marks={[
            { line: statusLine, at: fourAt + 8, out: totalAt },
            { line: totalLine, at: zeroAt, out: onlyAt },
            // The rule banana broke: the same yellow as its name in the error.
            { line: statusLine, at: ruleAt + 4 },
          ]}
        />

        {/* ── banana, and the rule it broke ── */}
        <Fig n="8" at={bananaAt - 10} x={RIGHT_X} y={bananaTop - FIG_GAP}>
          Inserting the status banana, and Postgres&apos;s answer
        </Fig>
        <Listing
          lines={[BANANA.sql]}
          x={RIGHT_X}
          top={bananaTop}
          width={RIGHT_W}
          size={22}
          at={bananaAt - 8}
          lineAt={[bananaAt - 4]}
        />
        <ErrorBox
          x={RIGHT_X}
          top={errorTop}
          width={RIGHT_W}
          at={refusedAt - 2}
          message={BANANA.error.message}
          detail={BANANA.error.detail}
          mark={BANANA.error.constraint ?? undefined}
          markAt={ruleAt}
        />
        {/* Where that name came from: the CHECK above has none of its own. */}
        <Note at={ruleAt + 12} x={RIGHT_X + RIGHT_W - 22} y={errorBottom + 18} align="right" from="up">
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Named by Postgres: table, column, check</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
