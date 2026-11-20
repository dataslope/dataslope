import { LayoutDashboard, Table2 } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { during, ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, body, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Badge, Ink, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { kb, mb, OBT, SAMPLE } from "./data";
import { Box, COLUMN_TINT, DataTable, Drift, FileBar, Flow, MARK_BAD, MARK_OK, OK_INK, SmallMono, TableName, tableGeometry, X0 } from "./parts";

const TABLE_Y = 382;
const HEAD_H = 38;
const ROW_H = 32;
const LOW_Y = 630;
const BAR_X = 520;
const PX_PER_KB = 0.8;
const FLOW_Y = 790;
const NEW_NAME = "Home & Garden";

/**
 * Question 10, with the modeling page's one-big-table question as the card's
 * second line. The star (three of the million sales in fct_sales, keyed to a
 * five-row dim_category) pre-joined into one wide table that carries the
 * category and department on every row. Then the measured cost of the
 * copies: each copied column compresses to the size of the key it replaces.
 * Then the real cost: renaming "Home" touches one dimension row in the star
 * and almost 200,000 rows, in every block, in the wide table. Then where
 * each belongs: the star upstream, the wide table serving a dashboard.
 */
export const ObtScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("obt").from;
  const qAt = n.word("obt", "Question ten");
  const qTextAt = n.word("obt", "Why is a wide");
  const whenAt = n.word("obt", "and when is it appropriate");
  const preAt = n.word("obt-def", "pre-joins the dimensions into the fact");
  const flatAt = n.word("obt-def", "one flat table");
  const skipAt = n.word("obt-def", "Queries skip the joins");
  const toolsAt = n.word("obt-def", "dashboard tools that struggle");
  const oneAt = n.word("obt-def", "get just one");
  const cheapAt = n.word("obt-cheap", "Columnar storage makes the copies cheap");
  const nameAt = n.word("obt-cheap", "the category name on every row");
  const kbAt = n.word("obt-cheap", "three hundred eighty kilobytes");
  const keyAt = n.word("obt-cheap", "the same as the integer key it replaces");
  const costAt = n.word("obt-cost", "The cost is maintenance");
  const renameAt = n.word("obt-cost", "Rename one category");
  const starOneAt = n.word("obt-cost", "the star updates one row");
  const wideAt = n.word("obt-cost", "The wide table updates almost two hundred thousand");
  const blockAt = n.word("obt-cost", "in every block of the file");
  const serveAt = n.word("obt-where", "So serve a wide table at the end");
  const speedAt = n.word("obt-where", "where speed matters");
  const upstreamAt = n.word("obt-where", "keep the star upstream");
  const rebuiltAt = n.word("obt-where", "the source it's rebuilt from");
  const end = n.beat("obt-where").to;

  const dimRows = OBT.dimension.rows.map((r) => r.map(String));
  const idOf = (name: string) => dimRows.find((r) => r[1] === name)?.[0] ?? "?";
  const deptOf = (name: string) => dimRows.find((r) => r[1] === name)?.[2] ?? "?";
  const sample = SAMPLE.rows.slice(0, 3);
  const at = (c: string) => SAMPLE.cols.indexOf(c);
  const fctRows = sample.map((r) => [r[at("sale_id")], idOf(r[at("category")]), r[at("amount")]]);
  const obtRows = sample.map((r) => [r[at("sale_id")], r[at("category")], deptOf(r[at("category")]), r[at("amount")]]);
  const HOME = dimRows.findIndex((r) => r[1] === "Home");
  const obtHome = obtRows.map((r, i) => (r[1] === "Home" ? i : -1)).filter((i) => i >= 0);

  const top = y(TABLE_Y);
  const geo = { headH: h(HEAD_H), rowH: h(ROW_H), headSize: 20, bodySize: 20, pad: 16 };
  const fct = tableGeometry({ x: X0, top, cols: [{ name: "sale_id" }, { name: "category_id" }, { name: "amount", numeric: true }], rows: fctRows, ...geo });
  const dim = tableGeometry({ x: fct.right + 48, top, cols: [{ name: "category_id" }, { name: "category" }, { name: "department" }], rows: dimRows, extra: [["", NEW_NAME, ""]], ...geo });
  const obtX = 1800 - tableGeometry({ x: 0, top, cols: [{ name: "sale_id" }, { name: "category" }, { name: "department" }, { name: "amount", numeric: true }], rows: obtRows, extra: [["", NEW_NAME, "", ""]], ...geo }).width;
  const obt = tableGeometry({ x: obtX, top, cols: [{ name: "sale_id" }, { name: "category" }, { name: "department" }, { name: "amount", numeric: true }], rows: obtRows, extra: [["", NEW_NAME, "", ""]], ...geo });
  const tablesDim = serveAt - 2;
  const lowTop = (i: number) => y(LOW_Y) + i * h(44);
  const cheapOut = costAt - 2;
  const costDim = serveAt - 2;

  const bars = [
    { label: <>Wide: <SmallMono>category</SmallMono></>, bytes: OBT.nameBytes, tint: COLUMN_TINT.category, at: nameAt, valueAt: kbAt },
    { label: <>Star: <SmallMono>category_id</SmallMono></>, bytes: OBT.keyBytes, tint: COLUMN_TINT.units, at: keyAt - 4, valueAt: keyAt + 2 },
    { label: <>Wide: <SmallMono>department</SmallMono></>, bytes: OBT.departmentBytes, tint: COLUMN_TINT.category, at: kbAt + 6, valueAt: kbAt + 12 },
  ];
  const flowTop = y(FLOW_Y);
  const flowH = h(62);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={preAt + 4} level={-34} />
      <Sfx name="el-whoosh" at={flatAt} level={-36} />
      <Sfx name="el-tap" at={cheapAt} level={-33} />
      <Sfx name="el-tap" at={kbAt} level={-33} />
      <Sfx name="el-tap" at={starOneAt + 4} level={-33} />
      <Sfx name="el-sprinkle" at={wideAt + 4} level={-33} />
      <Sfx name="el-tap" at={serveAt} level={-33} />
      <Sfx name="el-pencil" at={upstreamAt + 4} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={10} at={qAt - 4} textAt={qTextAt - 2} size={56}>
          Why is a wide, denormalized &ldquo;one big table&rdquo; sometimes preferred in a warehouse?
        </QuestionCard>
        <Ink at={whenAt} dur={16} style={{ left: 92, top: y(266), ...body(28), color: INK_SOFT, whiteSpace: "nowrap" }}>
          And: What is a wide (one-big-table) approach, and when is it appropriate?
        </Ink>

        {/* ── The star ── */}
        <TableName g={fct} at={preAt - 4} dim={tablesDim}>
          fct_sales
        </TableName>
        <DataTable
          g={fct}
          cols={[{ name: "sale_id" }, { name: "category_id", ink: BLUE_INK }, { name: "amount", numeric: true }]}
          rows={fctRows.map((cells, i) => ({ cells, at: preAt + i * 3 }))}
          at={preAt - 4}
          dim={tablesDim}
        />
        <TableName g={dim} at={preAt + 4} dim={tablesDim}>
          dim_category
        </TableName>
        <DataTable
          g={dim}
          cols={[{ name: "category_id", ink: BLUE_INK }, { name: "category" }, { name: "department" }]}
          rows={dimRows.map((cells, i) => ({ cells, at: preAt + 8 + i * 2 }))}
          at={preAt + 4}
          bands={[{ row: HOME, at: starOneAt, color: MARK_OK }]}
          swaps={[{ row: HOME, col: 1, at: renameAt + 6, value: NEW_NAME }]}
          dim={tablesDim}
        />

        {/* ── Pre-joined: one wide table ── */}
        <Flow points={[[dim.right + 14, top + h(HEAD_H) + h(ROW_H) * 1.5], [obt.x - 14, top + h(HEAD_H) + h(ROW_H) * 1.5]]} at={flatAt - 6} dur={12} width={2.6} head={13} dim={tablesDim} />
        <TableName g={obt} at={flatAt} dim={tablesDim}>
          obt_sales
        </TableName>
        <DataTable
          g={obt}
          cols={[{ name: "sale_id" }, { name: "category" }, { name: "department" }, { name: "amount", numeric: true }]}
          rows={obtRows.map((cells, i) => ({ cells, at: flatAt + 4 + i * 3 }))}
          at={flatAt}
          marks={obtHome.map((row) => ({ row, col: 1, at: wideAt + 4, color: MARK_BAD }))}
          swaps={obtHome.map((row) => ({ row, col: 1, at: renameAt + 10, value: NEW_NAME }))}
          dim={tablesDim}
        />
        <Note at={skipAt} x={obt.x} y={obt.rowTop(obtRows.length) + h(18)} out={cheapOut}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            No joins<span style={{ color: INK_SOFT, opacity: ease(frame, toolsAt, 10) }}>: a dashboard tool gets</span>
            <span style={{ color: INK_SOFT, opacity: ease(frame, oneAt, 10) }}> one table</span>
          </span>
        </Note>

        {/* ── The copies are cheap: measured ── */}
        <Note at={cheapAt} x={X0} y={lowTop(0) - h(10)} out={cheapOut}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.6em", fontSize: 23 }}>
            <Badge tone="blue" size={23}>
              measured
            </Badge>
            <span>The million sales, both ways, column by column</span>
          </span>
        </Note>
        {bars.map((b, i) => {
          const o = during(frame, b.at, cheapOut + 8, 10);
          return (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: X0, top: lowTop(i + 1) + h(2), ...note(22, INK), whiteSpace: "nowrap", opacity: o }}>
                {b.label}
              </div>
              <FileBar x={BAR_X} y={lowTop(i + 1)} width={(b.bytes / 1e3) * PX_PER_KB} height={h(30)} at={b.at} fill={b.tint} out={cheapOut} />
              <div
                style={{
                  position: "absolute",
                  left: BAR_X + (b.bytes / 1e3) * PX_PER_KB + 16,
                  top: lowTop(i + 1) + h(2),
                  ...note(22, INK),
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  opacity: Math.min(o, ease(frame, b.valueAt, 10)),
                }}
              >
                <Num>{kb(b.bytes)}</Num>
              </div>
            </React.Fragment>
          );
        })}
        <Note at={cheapAt + 20} x={1000} y={lowTop(1) + h(2)} out={cheapOut}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            Files: star&rsquo;s fact <Num>{mb(OBT.starFile, 2)}</Num>, wide <Num>{mb(OBT.obtFile, 2)}</Num>
          </span>
        </Note>
        <Note at={keyAt + 4} x={1000} y={lowTop(2) + h(2)} out={cheapOut}>
          <span style={{ ...note(22, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>The copied name costs what the key did</span>
        </Note>

        {/* ── The cost: a rename ── */}
        <Note at={costAt} x={X0} y={lowTop(0)} dim={costDim}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap" }}>
            The cost is maintenance.
          </span>
        </Note>
        <Note at={renameAt} x={X0 + 330} y={lowTop(0)} dim={costDim}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap" }}>
            Rename <SmallMono>&lsquo;Home&rsquo;</SmallMono> to <SmallMono>&lsquo;{NEW_NAME}&rsquo;</SmallMono>
          </span>
        </Note>
        <Note at={starOneAt + 2} x={X0} y={lowTop(1)} dim={costDim}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Star: <b style={{ color: OK_INK }}>{OBT.rename.star.rows} dimension row</b>
          </span>
        </Note>
        <Note at={wideAt + 4} x={X0} y={lowTop(2)} dim={costDim}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Wide table: <b style={{ color: ACCENT_INK }}>{OBT.rename.obt.rows.toLocaleString("en-US")} rows</b>
            <span style={{ color: INK_SOFT, opacity: ease(frame, blockAt, 10) }}>
              , in all <Num>{OBT.rename.rowGroups}</Num> blocks of the file
            </span>
          </span>
        </Note>

        {/* ── Where each belongs ── */}
        <Box x={X0} y={flowTop} w={330} h={flowH} at={upstreamAt} title="Star: fact and dimensions" size={21} />
        <Note at={rebuiltAt} x={X0} y={flowTop + flowH + h(12)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>Upstream: the source</span>
        </Note>
        <Flow points={[[X0 + 330 + 12, flowTop + flowH / 2], [620 - 12, flowTop + flowH / 2]]} at={rebuiltAt} dur={12} width={2.6} head={13} />
        <Box x={620} y={flowTop} w={250} h={flowH} at={serveAt} title={<SmallMono>obt_sales</SmallMono>} icon={Table2} size={22} tone="ok" />
        <Note at={speedAt} x={620} y={flowTop + flowH + h(12)}>
          <span style={{ ...note(21, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Serving, where speed matters</span>
        </Note>
        <Flow points={[[870 + 12, flowTop + flowH / 2], [1020 - 12, flowTop + flowH / 2]]} at={speedAt + 4} dur={12} width={2.6} head={13} />
        <Box x={1020} y={flowTop} w={250} h={flowH} at={speedAt + 8} title="Dashboard" icon={LayoutDashboard} size={22} />
      </Drift>
    </AbsoluteFill>
  );
};
