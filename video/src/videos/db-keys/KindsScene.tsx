import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COUNTRIES, IDENTITY } from "./data";
import { DataTable, Drift, Headline, KEY_INK, Kicker, MARK, MARK_KEY, Mark, Mono, TableName, tableGeometry } from "./parts";

const LEFT_X = 120;
const RIGHT_X = 1000;
const PANEL_Y = 318;
const TABLE_Y = 486;
const HEAD_H = 52;
const ROW_H = 70;
/** Two short tables on a half page each: set large. */
const SIZES = { headSize: 24, bodySize: 32, pad: 22 };

/**
 * Part 2 opens: the two kinds of key. A natural key is a value the thing
 * already has (countries keyed on 'JP'); a surrogate key is a number the
 * database makes up (the lesson's GENERATED ALWAYS AS IDENTITY block, whose
 * ids came back as 1 and 2).
 */
export const KindsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("kinds").from;
  const naturalAt = n.word("kinds", "natural key");
  const alreadyAt = n.word("kinds", "already has");
  const codeAt = n.word("kinds", "country code");
  const jpAt = n.word("kinds", "J P");
  const japanAt = n.word("kinds", "Japan");
  const surrogateAt = n.word("surrogate", "surrogate key");
  const makesAt = n.word("surrogate", "makes up");
  const nameAt = n.word("surrogate", "name the row");
  const nothingAt = n.word("surrogate", "nothing");
  const purposeAt = n.word("surrogate", "on purpose");
  const end = n.beat("surrogate").to;

  const countryCols = [{ name: "code", ink: KEY_INK, tag: { text: "PK", at: codeAt + 6 } }, { name: "name" }];
  const countries = tableGeometry({ x: LEFT_X, top: y(TABLE_Y), cols: countryCols, rows: COUNTRIES.rows, headH: h(HEAD_H), rowH: h(ROW_H), ...SIZES });
  const customerCols = [
    { name: "customer_id", numeric: true, ink: KEY_INK, tag: { text: "PK", at: makesAt + 4 } },
    { name: "full_name" },
  ];
  const customers = tableGeometry({ x: RIGHT_X, top: y(TABLE_Y), cols: customerCols, rows: IDENTITY.slim.rows, headH: h(HEAD_H), rowH: h(ROW_H), ...SIZES });
  const jp = COUNTRIES.rows.findIndex((r) => r[0] === "JP");
  const below = (g: typeof countries) => g.rowTop(g === countries ? COUNTRIES.rows.length : IDENTITY.slim.rows.length) + 34;
  const divider = ease(frame, surrogateAt - 10, 16);

  return (
    <AbsoluteFill>
      {/* ── Sound: each table, the marked code, the made-up ids ── */}
      <Sfx name="el-whoosh" at={naturalAt + 10} level={-34} />
      <Sfx name="el-pencil" at={jpAt - 2} level={-35} />
      <Sfx name="el-whoosh" at={makesAt - 8} level={-34} />
      <Sfx name="el-tap" at={nameAt} level={-28} />
      <Sfx name="el-pencil" at={purposeAt} level={-34} />

      <Kicker at={from - 10}>Natural or surrogate</Kicker>
      <Drift from={from} to={end + 50}>
        <Headline lead="A value it has," turn="or a number the database makes up." at={from - 6} turnAt={surrogateAt - 4} />

        {/* ── Natural ── */}
        <Ink at={naturalAt - 4} dur={14} style={{ left: LEFT_X, top: y(PANEL_Y), whiteSpace: "nowrap" }}>
          <span style={{ ...label(30, INK) }}>
            <Mark at={naturalAt}>Natural key</Mark>
          </span>
        </Ink>
        <Note at={alreadyAt - 2} x={LEFT_X} y={y(PANEL_Y) + 50}>
          <span style={{ ...body(30, true), color: INK_SOFT, whiteSpace: "nowrap" }}>a real-world value the thing already has</span>
        </Note>
        {/* The table's frame arrives with "natural key"; its rows with "country code". */}
        <TableName g={countries} at={naturalAt + 10}>
          countries
        </TableName>
        <DataTable
          g={countries}
          cols={countryCols}
          at={naturalAt + 10}
          rows={COUNTRIES.rows.map((cells, i) => ({ cells, at: codeAt + i * 6 }))}
          marks={[
            { row: jp, col: 0, at: jpAt - 2, color: MARK_KEY },
            { row: jp, col: 1, at: japanAt - 2 },
          ]}
        />
        <Note at={japanAt + 2} x={LEFT_X} y={below(countries)}>
          <span style={{ ...body(30, true), color: INK, whiteSpace: "nowrap" }}>
            Readable: <Mono>JP</Mono> is Japan.
          </span>
        </Note>

        {/* The two panels' divider. */}
        <div
          style={{
            position: "absolute",
            left: 900,
            top: y(PANEL_Y),
            width: 1.5,
            height: (y(830) - y(PANEL_Y)) * divider,
            background: `color-mix(in srgb, ${INK} 30%, transparent)`,
          }}
        />

        {/* ── Surrogate ── */}
        <Ink at={surrogateAt - 4} dur={14} style={{ left: RIGHT_X, top: y(PANEL_Y), whiteSpace: "nowrap" }}>
          <span style={{ ...label(30, INK) }}>
            <Mark at={surrogateAt}>Surrogate key</Mark>
          </span>
        </Ink>
        <Note at={makesAt - 2} x={RIGHT_X} y={y(PANEL_Y) + 50}>
          <span style={{ ...body(27, true), color: INK_SOFT, whiteSpace: "nowrap" }}>
            made up by the database: <Mono>GENERATED ALWAYS AS IDENTITY</Mono>
          </span>
        </Note>
        <TableName g={customers} at={makesAt - 8}>
          customers
        </TableName>
        <DataTable
          g={customers}
          cols={customerCols}
          at={makesAt - 8}
          rows={IDENTITY.slim.rows.map((cells, i) => ({ cells, at: makesAt + i * 6 }))}
          marks={IDENTITY.slim.rows.map((_, i) => ({ row: i, col: 0, at: nameAt + i * 5, color: MARK_KEY }))}
        />
        <Note at={nothingAt - 2} x={RIGHT_X} y={below(customers)}>
          <span style={{ ...body(30, true), color: INK, whiteSpace: "nowrap" }}>
            <Mono>1</Mono> and <Mono>2</Mono> say nothing about Ada or Grace,
            <span style={{ opacity: ease(frame, purposeAt - 2, 10) }}>
              {" "}
              <span style={{ background: MARK, padding: "0 4px" }}>on purpose.</span>
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
