import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COLUMNS, FOURTH, LIST_CELL, LIST_SEARCH, SOUGHT } from "./data";
import {
  BODY_SIZE,
  BODY_Y,
  DbTable,
  ErrorBox,
  Fig,
  FIG_Y,
  HEAD_H,
  Headline,
  Listing,
  listingHeight,
  MARK,
  MARK_BAD,
  Mono,
  ROW_H,
  tableGeometry,
  X0,
} from "./kit";
import { Drift, pulse, Spot, Svg } from "./parts";

const SEARCH_X = 820;
const COLS_FIG_Y = 560;
const COLS_Y = 604;
const LIST_SIZE = 24;

/**
 * First normal form's problem, twice: Ada's two phone numbers in one cell,
 * which an equality search can't find, and the numbered columns that hold
 * them instead, with no room for a fourth.
 */
export const CellScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cell").from;
  const perCellAt = n.word("cell", "per cell");
  const adaAt = n.word("cell", "Here's Ada");
  const twoAt = n.word("cell", "two phone numbers");
  const inOneAt = n.word("cell", "in one");
  const askAt = n.word("search", "Ask");
  const fiveAt = n.word("search", "five five five");
  const nobodyAt = n.word("search", "nobody");
  const buriedAt = n.word("search", "buried");
  const phoneAt = n.word("columns", "Phone one");
  const groupAt = n.word("columns", "repeating group");
  const ceilingAt = n.word("columns", "ceiling");
  const fourthAt = n.word("columns", "fourth number");
  const fitAt = n.word("columns", "fit");
  const end = n.beat("columns").to;

  const ga = tableGeometry({ x: X0, top: y(BODY_Y), cols: LIST_CELL.cols, rows: LIST_CELL.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const ada = LIST_CELL.rows.findIndex((r) => r[1] === "Ada");
  const phones = LIST_CELL.cols.indexOf("phones");
  const fits = FOURTH.row.slice(0, COLUMNS.cols.length);
  const over = FOURTH.row[COLUMNS.cols.length];
  const gb = tableGeometry({ x: X0, top: y(COLS_Y), cols: COLUMNS.cols, rows: [...COLUMNS.rows, fits], headH: h(HEAD_H), rowH: h(ROW_H) });
  const phoneCols = COLUMNS.cols.map((c, j) => (c.startsWith("phone") ? j : -1)).filter((j) => j >= 0);
  const ghost = COLUMNS.rows.length;
  const edge = gb.x + gb.width;
  const listH = listingHeight(LIST_SEARCH.lines.length, LIST_SIZE);

  // The fourth number, outside the last column: it slides in, then is struck.
  const overIn = ease(frame, fourthAt + 4, 12);
  const struck = ease(frame, fitAt, 12);
  const ceiling = ease(frame, ceilingAt - 2, 14);
  const buriedSwell = pulse(frame, buriedAt, 24);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={twoAt} level={-30} />
      <Sfx name="el-tap" at={nobodyAt} level={-28} />
      <Sfx name="el-pencil" at={ceilingAt - 2} level={-34} />
      <Sfx name="el-pop" at={fourthAt + 4} level={-30} />
      <Sfx name="el-scratch" at={fitAt} level={-30} />

      <Headline kicker="First normal form" lead="One value" turn="per cell." at={from - 6} turnAt={perCellAt - 6} underlineAt={inOneAt} />
      <Spot id="db-normalization-telephone" at={twoAt - 4} left={1480} top={40} width={330} height={250} />

      <Drift from={from} to={end + 40} amount={0.012} origin="30% 50%">
        <Fig n="3" at={from + 2} y={y(FIG_Y)}>
          <Mono>students</Mono>, with a list in one cell
        </Fig>
        <DbTable
          g={ga}
          cols={LIST_CELL.cols}
          rows={LIST_CELL.rows.map((cells, i) => ({ cells, at: adaAt + i * 6 }))}
          at={from + 6}
          numeric={[0]}
          marks={[
            { row: ada, col: phones, at: twoAt + 2, color: MARK_BAD },
            { row: ada, col: phones, at: buriedAt - 4, out: buriedAt + 26, color: MARK },
          ]}
        />
        {/* "in one": the crowded cell swells. */}
        <div
          style={{
            position: "absolute",
            left: ga.xs[phones] + 4,
            top: ga.rowTop(ada) + 4,
            width: ga.widths[phones] - 8,
            height: ga.rowH - 8,
            border: `2px solid ${ACCENT}`,
            borderRadius: 4,
            opacity: Math.max(pulse(frame, inOneAt, 22), buriedSwell),
          }}
        />

        {/* The search that can't see inside it. */}
        <Listing
          lines={LIST_SEARCH.lines}
          x={SEARCH_X}
          top={y(BODY_Y)}
          width={540}
          size={LIST_SIZE}
          at={askAt - 6}
          lineAt={[askAt - 2, fiveAt - 6]}
          marks={[{ line: 1, at: fiveAt }]}
        />
        <Note at={nobodyAt - 2} x={SEARCH_X} y={y(BODY_Y) + listH + 16}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>({LIST_SEARCH.rows} rows)</span>
        </Note>
        <Note at={buriedAt} x={SEARCH_X + 130} y={y(BODY_Y) + listH + 16}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <Mono>{SOUGHT}</Mono> is in Ada&apos;s cell, inside one string
          </span>
        </Note>

        {/* Numbered columns instead: a repeating group, with a ceiling. */}
        <Fig n="4" at={phoneAt - 4} y={y(COLS_FIG_Y)}>
          The same phones, as numbered columns
        </Fig>
        <DbTable
          g={gb}
          cols={COLUMNS.cols}
          rows={[
            ...COLUMNS.rows.map((cells, i) => ({ cells, at: phoneAt + 6 + i * 5 })),
            { cells: fits, at: fourthAt - 2, ghost: true, grow: true },
          ]}
          at={phoneAt}
          numeric={[0]}
          marks={phoneCols.map((col, k) => ({ row: 0, col, at: groupAt + k * 4 }))}
        />
        <Svg>
          <line
            x1={edge}
            x2={edge}
            y1={gb.top - 10}
            y2={gb.top - 10 + (gb.bottom(COLUMNS.rows.length + 1) + 20 - gb.top) * ceiling}
            stroke={ACCENT}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={ceiling > 0 ? 1 : 0}
          />
        </Svg>
        <Note at={groupAt + 4} x={edge + 40} y={gb.top + 12}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap" }}>A repeating group</span>
        </Note>
        <Note at={ceilingAt + 2} x={edge + 40} y={gb.top + 50}>
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>and nowhere to put a fourth</span>
        </Note>
        {/* The fourth number, with no column to land in. */}
        {overIn > 0 ? (
          <div
            style={{
              position: "absolute",
              left: edge + 20 + (1 - overIn) * 30,
              top: gb.rowMid(ghost) - BODY_SIZE * 0.7,
              opacity: overIn,
              fontFamily: MONO,
              fontSize: BODY_SIZE,
              color: ACCENT_INK,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ position: "relative", display: "inline-block" }}>
              {over}
              <span
                style={{
                  position: "absolute",
                  left: "-0.1em",
                  top: "0.52em",
                  width: `calc((100% + 0.2em) * ${struck})`,
                  height: 3,
                  background: ACCENT,
                  borderRadius: 2,
                }}
              />
            </span>
          </div>
        ) : null}
        {/* Fig. 3 gave Grace one number; this row is a new attempt, with four. */}
        <Note at={fourthAt} x={gb.x} y={gb.bottom(COLUMNS.rows.length + 1) + 18}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Grace, with four numbers</span>
        </Note>
        {/* Postgres refuses as the fourth number arrives, so the refusal is up
            for the rest of the beat and the hold after it. */}
        <ErrorBox x={edge + 220} top={gb.rowTop(ghost) - 6} width={600} at={fourthAt + 6} message={FOURTH.message} />
      </Drift>
    </AbsoluteFill>
  );
};

