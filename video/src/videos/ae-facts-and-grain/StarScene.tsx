import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SNOW } from "./data";
import { Caption, colsOf, DataTable, Drift, geoOf, KeyArrow, Listing, listingHeight, listingWidth, Mono, OK_INK, TableName, X0 } from "./parts";

const ROWS = { headH: 42, rowH: 38, bodySize: 22, headSize: 20 } as const;
const TOP = 300;
const CAT_X = 640;
/** The small schema on the right: the fact and what it joins. */
const CHIP_FACT_X = 1130;
const CHIP_DIM_X = 1480;
const CHIP_W = 300;
const LIST_SIZE = 20;

/**
 * Question 3. A star keeps each dimension flat: the challenge's twelve
 * products carry their category as text, Books three times. Snowflaked,
 * category moves to a table of its own, six names stored once, and the small
 * schema on the right grows a second join. Then the two reads side by side,
 * the challenge's solutionSql with one JOIN and the snowflaked one with two,
 * over the one result both return, and the verdict: a star by default,
 * snowflake only when a dimension is huge or genuinely shared.
 */
export const StarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("star").from;
  const qAt = n.word("star", "Question three");
  const textAt = n.word("star", "Star versus snowflake");
  const flatAt = n.word("star", "each dimension is one flat table");
  const twelveAt = n.word("star", "These twelve products");
  const booksAt = n.word("star", "Books is written three times");
  const snowAt = n.word("snow", "Snowflake it");
  const ownAt = n.word("snow", "category moves to a table of its own");
  const onceAt = n.word("snow", "each name stored once");
  const revAt = n.word("snow", "Revenue by category");
  const twoAt = n.word("snow", "two joins");
  const oneAt = n.word("snow", "instead of one");
  const sameAt = n.word("snow", "the same six rows come back");
  const defaultAt = n.word("star-pick", "So the star is the default");
  const fewerAt = n.word("star-pick", "fewer joins to get wrong");
  const costsAt = n.word("star-pick", "the repeated text costs little");
  const onlyAt = n.word("star-pick", "Snowflake a dimension only when");
  const sharedAt = n.word("star-pick", "or genuinely shared");
  const end = n.beat("star-pick").to;

  // ── Phase one: the tables ──
  const P = SNOW.products;
  const pg = geoOf(P, X0, y(TOP), h, ROWS);
  const PS = SNOW.productsSf;
  const sg = geoOf(PS, X0, y(TOP), h, ROWS);
  const C = SNOW.categories;
  const cg = geoOf(C, CAT_X, y(TOP), h, ROWS);
  const cat = P.cols.indexOf("category");
  const books = P.rows.map((r, i) => (r[cat] === "Books" ? i : -1)).filter((i) => i >= 0);
  if (books.length !== SNOW.booksRows) throw new Error(`Books is in ${books.length} rows, not ${SNOW.booksRows}`);
  const booksId = C.rows.find((r) => r[1] === "Books")![0];
  const booksCat = C.rows.findIndex((r) => r[1] === "Books");
  const tablesOut = revAt - 4;

  const fact = useEntityLayout({ x: CHIP_FACT_X, y: y(TOP + 40), width: CHIP_W - 40, name: "fact_orders", columns: [] });
  const dim = useEntityLayout({ x: CHIP_DIM_X, y: y(TOP + 40), width: CHIP_W, name: "dim_product", columns: [] });
  const dimSf = useEntityLayout({ x: CHIP_DIM_X, y: y(TOP + 40), width: CHIP_W, name: "dim_product_sf", columns: [] });
  const catChip = useEntityLayout({ x: CHIP_DIM_X, y: y(TOP + 220), width: CHIP_W, name: "dim_category", columns: [] });
  const joinLine = [fact.anchor("right"), dim.anchor("left")] as const;

  // ── Phase two: the two reads, and what both return ──
  const starL = SNOW.star.lines;
  const snowL = SNOW.snow.lines;
  const starW = listingWidth(starL, LIST_SIZE);
  const snowX = X0 + starW + 60;
  const listTop = y(TOP + 10);
  const resTop = listTop + listingHeight(snowL.length, LIST_SIZE) + h(84);
  const R = SNOW.snow;
  const rg = geoOf(R, X0, resTop, h, ROWS);
  const VERDICT_X = rg.right + 120;
  const joins = snowL.filter((l) => l.startsWith("JOIN"));

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={twelveAt} level={-31} />
      <Sfx name="el-sprinkle" at={booksAt + 4} level={-33} />
      <Sfx name="el-whoosh" at={snowAt} level={-34} />
      <Sfx name="el-pencil" at={onceAt + 4} level={-36} />
      <Sfx name="el-whoosh" at={revAt - 2} level={-35} />
      <Sfx name="el-tap" at={twoAt} level={-29} />
      <Sfx name="el-pop" at={sameAt} level={-30} />
      <Sfx name="el-chime" at={defaultAt + 4} level={-35} />

      <Drift from={from} to={end + 30} scale={0.015}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={60}>
          Star vs snowflake?
        </QuestionCard>

        {/* ── A star's dimension: one flat table, category as text ── */}
        <TableName g={pg} at={twelveAt - 4} out={snowAt + 6}>
          <Mono>dim_product</Mono>, one flat table
        </TableName>
        <DataTable
          g={pg}
          cols={colsOf(P)}
          at={twelveAt - 4}
          out={snowAt + 6}
          rows={P.rows.map((cells, i) => ({ cells, at: twelveAt + i * 2 }))}
          marks={books.map((row, k) => ({ row, col: cat, at: booksAt + 4 + k * 4 }))}
        />
        <Note at={booksAt + 8} x={pg.right + 40} y={pg.rowTop(books[1]) + h(6)} out={snowAt + 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Books, <Num>{SNOW.booksRows}</Num> times
          </span>
        </Note>

        {/* ── Snowflaked: the names in a table of their own ── */}
        <TableName g={sg} at={snowAt + 6} out={tablesOut}>
          <Mono>dim_product_sf</Mono>
        </TableName>
        <DataTable
          g={sg}
          cols={colsOf(PS)}
          at={snowAt + 6}
          out={tablesOut}
          rows={PS.rows.map((cells, i) => ({ cells, at: snowAt + 8 + i }))}
          marks={books.map((row) => ({ row, col: 1, at: onceAt + 2 }))}
        />
        <TableName g={cg} at={ownAt} out={tablesOut}>
          <Mono>dim_category</Mono>, each name once
        </TableName>
        <DataTable
          g={cg}
          cols={colsOf(C)}
          at={ownAt}
          out={tablesOut}
          rows={C.rows.map((cells, i) => ({ cells, at: ownAt + 4 + i * 2 }))}
          marks={[{ row: booksCat, col: 1, at: onceAt + 6 }]}
        />
        {books.map((row, k) => (
          <KeyArrow
            key={row}
            from={[sg.right + 10, sg.rowMid(row)]}
            to={[cg.x - 12, cg.rowMid(booksCat)]}
            at={onceAt + 4 + k * 3}
            out={tablesOut}
          />
        ))}
        <Note at={onceAt + 12} x={cg.x} y={cg.rowTop(C.rows.length) + h(24)} out={tablesOut}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            Books is <Mono>category_id</Mono> {booksId}, three rows point at it
          </span>
        </Note>

        {/* The schema each shape reads through, on the right. */}
        <Caption at={flatAt} x={CHIP_FACT_X} y={y(TOP) - h(6)} out={tablesOut}>
          What revenue by category joins
        </Caption>
        <Entity layout={fact} at={flatAt + 2} out={tablesOut} />
        <Entity layout={dim} at={flatAt + 8} out={snowAt + 4} />
        <Relation name="star" points={joinLine} from="zero-or-many" to="exactly-one" at={flatAt + 12} out={tablesOut} />
        <Entity layout={dimSf} at={snowAt + 6} out={tablesOut} />
        <Entity layout={catChip} at={ownAt + 2} out={tablesOut} />
        <Relation name="snow" points={[dimSf.anchor("bottom"), catChip.anchor("top")]} from="zero-or-many" to="exactly-one" at={ownAt + 6} out={tablesOut} />
        <Note at={flatAt + 14} x={CHIP_FACT_X} y={fact.bottom + h(40)} out={tablesOut}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Star: <b style={{ color: BLUE_INK }}>1</b> join
          </span>
        </Note>
        <Note at={ownAt + 10} x={CHIP_FACT_X} y={fact.bottom + h(84)} out={tablesOut}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Snowflake: <b style={{ color: BLUE_INK }}>2</b> joins
          </span>
        </Note>

        {/* ── The two reads, side by side, over the one result ── */}
        <Caption at={revAt} x={X0} y={listTop - h(40)} color={INK}>
          Star: one join
        </Caption>
        <Listing lines={starL} x={X0} top={listTop} size={LIST_SIZE} at={revAt} marks={[{ line: "JOIN", at: oneAt }]} />
        <Caption at={revAt + 6} x={snowX} y={listTop - h(40)} color={INK}>
          Snowflake: two joins
        </Caption>
        <Listing
          lines={snowL}
          x={snowX}
          top={listTop}
          size={LIST_SIZE}
          at={revAt + 6}
          marks={[{ line: joins[1], at: twoAt }]}
        />
        <TableName g={rg} at={sameAt - 4}>
          Both return these six rows
        </TableName>
        <DataTable g={rg} cols={colsOf(R)} at={sameAt - 4} rows={R.rows.map((cells, i) => ({ cells, at: sameAt + i * 2 }))} />
        <Note at={sameAt + 14} x={rg.right + 40} y={rg.rowTop(0) + h(4)} out={defaultAt - 4}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            Rows one read has and the other lacks: <Num>{SNOW.differ}</Num>
          </span>
        </Note>

        {/* ── The verdict ── */}
        <Note at={defaultAt} x={VERDICT_X} y={rg.rowTop(0)}>
          <span style={{ ...note(32, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Default: a star</span>
        </Note>
        <Note at={fewerAt} x={VERDICT_X} y={rg.rowTop(0) + h(62)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>Fewer joins to get wrong</span>
        </Note>
        <Note at={costsAt} x={VERDICT_X} y={rg.rowTop(0) + h(104)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>The repeated text costs little</span>
        </Note>
        <Note at={onlyAt} x={VERDICT_X} y={rg.rowTop(0) + h(170)}>
          <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>
            Snowflake: only when huge
            <span style={{ opacity: ease(frame, sharedAt, 10) }}>, or shared</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
