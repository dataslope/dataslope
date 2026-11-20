import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { money, TYPE1, TYPE2 } from "./data";
import {
  Axis,
  Band,
  colsOf,
  DataTable,
  Drift,
  geoOf,
  lineOf,
  Listing,
  listingHeight,
  listingWidth,
  LOW,
  MARK_OK,
  OK_INK,
  Pin,
  QMono,
  Strike,
  TableName,
  useAcme,
  X0,
  YEARS,
} from "./parts";

const ROWS = { headH: 42, rowH: 48, bodySize: 23, headSize: 20 } as const;
/** The bars' left edge and the width of the largest. */
const BAR_X = 270;
const BAR_W = 640;
const WAS = ds("blue", 200);
const SIZE = 22;

/**
 * Question 1, on the recurring figure. Type 1 is one row for all time: its
 * band spans the whole axis, East is struck and West written in its place,
 * and both of Acme's orders land in it, so the 2022 order reads West. Done
 * to every customer, every region's 2022 revenue moves (Type 2's as-it-was
 * against Type 1's as-it-is, East down by exactly Acme's 1,200.00). Then
 * when to use it, and how (a MERGE on the natural key); then types chosen
 * per column: the band splits into Type 2's two versions, both carrying a
 * typo, and one UPDATE on customer_id fixes the name on both.
 */
export const Type1Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const A = useAcme();

  const from = n.beat("t1").from;
  const qAt = n.word("t1", "Question one");
  const textAt = n.word("t1", "What is SCD Type one");
  const overAt = n.word("t1", "Type one overwrites");
  const westAt = n.word("t1", "Acme's region becomes West");
  const oneRowAt = n.word("t1", "there's still one row");
  const traceAt = n.word("t1", "no trace of the East");
  const pastAt = n.word("t1-history", "So the past moves with it");
  const reportsAt = n.word("t1-history", "now reports as West");
  const everyAt = n.word("t1-history", "Overwrite every customer that way");
  const revAt = n.word("t1-history", "every region's 2022 revenue changes");
  const losesAt = n.word("t1-history", "East loses twelve hundred dollars");
  const wentAt = n.word("t1-history", "already went out");
  const neverAt = n.word("t1-when", "Use it when the old value was never true");
  const typoAt = n.word("t1-when", "like a typo in a name");
  const nowAt = n.word("t1-when", "only ever asks about now");
  const mergeAt = n.word("t1-when", "a merge on the natural key");
  const updAt = n.word("t1-when", "update the row if it's there");
  const insAt = n.word("t1-when", "insert it if not");
  const perColAt = n.word("t1-mix", "types are chosen per column");
  const versionsAt = n.word("t1-mix", "versions the region");
  const nameAt = n.word("t1-mix", "treat the name as Type one");
  const fixedAt = n.word("t1-mix", "a fixed misspelling is fixed on every version");
  const end = n.beat("t1-mix").to;

  // ── The Type 1 row: one band for all time ──
  const R = TYPE1.row42;
  const name = R.rows[0][R.cols.indexOf("customer_name")];
  const was = TYPE2.rows42.rows[0][TYPE2.rows42.cols.indexOf("region")];
  const now = R.rows[0][R.cols.indexOf("region")];
  const splitAt = versionsAt;

  // ── Lower: the row and its orders ──
  const low = y(LOW);
  const gr = geoOf(R, X0, low, h, ROWS);
  const rRegion = R.cols.indexOf("region");
  const O = TYPE1.orders42;
  const oAmount = O.cols.indexOf("amount");
  const orders = O.rows.map((r) => r.map((v, j) => (j === oAmount ? money(v) : v)));
  const go = geoOf({ cols: O.cols, rows: orders }, gr.right + 90, low, h, ROWS);
  const oRegion = O.cols.indexOf("region");
  const tablesOut = everyAt - 2;

  // ── Lower: 2022 revenue by region, as it was and as it is ──
  const { type2, type1 } = TYPE1.regions2022;
  const regions = [...new Set([...Object.keys(type2), ...Object.keys(type1)])].sort();
  const max = Math.max(...regions.flatMap((r) => [Number(type2[r] ?? 0), Number(type1[r] ?? 0)]));
  const chartOut = neverAt - 4;
  const rowTop = (i: number) => y(LOW + 42) + i * h(74);
  const drop = Number(type2.East) - Number(type1.East);

  // ── Lower: per column ──
  const B = TYPE1.mixBefore;
  const M = TYPE1.mixAfter;
  const gm = geoOf(M, 840, y(LOW + 96), h, { ...ROWS, extra: B.rows });
  const mName = M.cols.indexOf("customer_name");
  const mRegion = M.cols.indexOf("region");
  const F = TYPE1.mixFix;
  const lines = F.lines;
  const typo = B.rows[0][B.cols.indexOf("customer_name")];
  const v = A.versions;

  return (
    <AbsoluteFill>
      <Sfx name="el-scratch" at={westAt + 2} level={-34} />
      <Sfx name="el-tap" at={oneRowAt + 6} level={-34} />
      <Sfx name="el-whoosh" at={everyAt} level={-36} />
      <Sfx name="el-tap" at={losesAt + 2} level={-33} />
      <Sfx name="el-pencil" at={neverAt} level={-36} />
      <Sfx name="el-pencil" at={mergeAt} level={-36} />
      <Sfx name="el-whoosh" at={splitAt} level={-36} />
      <Sfx name="el-tap" at={fixedAt + 6} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is SCD Type 1, and when should you use it?
        </QuestionCard>

        {/* ── The recurring figure ── */}
        <Axis tl={A} top={A.axisTop} at={textAt + 6} years={YEARS} />
        <Band
          x0={A.x0}
          x1={A.x1}
          top={A.bandTop}
          h={A.bandH}
          at={overAt - 4}
          out={splitAt}
          label={
            <span style={{ display: "inline-flex", alignItems: "baseline", whiteSpace: "pre" }}>
              {name} ·{" "}
              {/* East struck as West takes its place, then gone: no trace. */}
              <span
                style={{
                  display: "inline-block",
                  overflow: "hidden",
                  maxWidth: `${(1 - ease(frame, traceAt + 4, 14)) * 4}em`,
                  opacity: 1 - ease(frame, traceAt, 12),
                  color: ACCENT_INK,
                }}
              >
                <Strike at={westAt + 2}>{was}</Strike>{" "}
              </span>
              <span style={{ opacity: ease(frame, westAt + 8, 10) }}>{now}</span>
            </span>
          }
          tones={[{ at: reportsAt, tone: "look" }, { at: everyAt, tone: "plain" }]}
        />
        {A.orders.map((o, i) => (
          <Pin
            key={o.id}
            x={o.x}
            top={A.labelTop}
            bottom={A.bandTop}
            at={oneRowAt + i * 4}
            title={<Num>{o.id}</Num>}
            sub={o.date}
            tones={i === 0 ? [{ at: reportsAt, tone: "look" }, { at: everyAt, tone: "plain" }] : []}
          />
        ))}
        {/* Types chosen per column: the same history as Type 2's versions,
            the name carrying a typo on both until one UPDATE fixes it. */}
        {v.map((ver, i) => (
          <Band
            key={ver.key}
            x0={ver.x0 + (i ? 3 : 0)}
            x1={ver.x1}
            top={A.bandTop}
            h={A.bandH}
            at={splitAt + 2 + i * 6}
            open={ver.current}
            label={
              <span>
                <Num>{ver.key}</Num> · {typo} · {ver.region}
              </span>
            }
            swapTo={
              <span>
                <Num>{ver.key}</Num> · {M.rows[i][mName]} · {ver.region}
              </span>
            }
            swapAt={fixedAt + 6 + i * 4}
            tones={[{ at: fixedAt + 6 + i * 4, tone: "ok" }]}
          />
        ))}

        {/* ── Lower: the row, overwritten, and both orders reading it ── */}
        <TableName g={gr} at={overAt} out={tablesOut}>
          dim_customer, Type 1
        </TableName>
        <DataTable
          g={gr}
          cols={colsOf(R)}
          at={overAt}
          out={tablesOut}
          rows={[{ cells: R.rows[0].map((c, j) => (j === rRegion ? was : c)), at: overAt + 4 }]}
          swaps={[{ row: 0, col: rRegion, at: westAt + 6, value: now }]}
          marks={[{ row: 0, col: rRegion, at: westAt + 2, out: pastAt }]}
        />
        <Note at={oneRowAt + 2} x={X0} y={gr.rowTop(1) + h(26)} out={tablesOut}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            Still one row
            <span style={{ color: ACCENT_INK, opacity: ease(frame, traceAt, 10) }}>, and no trace of the East</span>
          </span>
        </Note>
        <TableName g={go} at={oneRowAt + 6} out={tablesOut}>
          Acme&rsquo;s orders, joined to it
        </TableName>
        <DataTable
          g={go}
          cols={colsOf({ cols: O.cols, rows: orders })}
          at={oneRowAt + 6}
          out={tablesOut}
          rows={orders.map((cells, i) => ({ cells, at: oneRowAt + 10 + i * 4 }))}
          marks={[{ row: 0, col: oRegion, at: reportsAt + 4 }]}
        />

        {/* ── Lower: 2022 revenue by region, every pair different ── */}
        <Note at={everyAt + 2} x={X0} y={y(LOW - 4)} out={chartOut}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>2022 revenue by region, every customer overwritten</span>
        </Note>
        <Note at={revAt} x={1100} y={y(LOW - 4)} out={chartOut}>
          <span style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 21, whiteSpace: "nowrap" }}>
            <span style={{ width: 22, height: 14, background: WAS, borderRadius: 2 }} />
            <span style={{ ...label(21, INK_SOFT) }}>as it was (Type 2)</span>
            <span style={{ width: 22, height: 14, background: BAR, borderRadius: 2, marginLeft: 22 }} />
            <span style={{ ...label(21, BLUE_INK) }}>as it is (Type 1)</span>
          </span>
        </Note>
        {regions.map((r, i) => {
          const at = revAt + i * 4;
          const top = rowTop(i);
          const o = 1 - ease(frame, chartOut, 10);
          const p = ease(frame, at, 18);
          const q = ease(frame, at + 10, 18);
          if (p <= 0 || o <= 0) return null;
          const a = type2[r];
          const b = type1[r];
          const barH = h(22);
          const val = (v: string | undefined, w: number, top: number, color: string, op: number) => (
            <div style={{ position: "absolute", left: BAR_X + w + 14, top, height: barH, display: "flex", alignItems: "center", ...label(21, color), opacity: op, whiteSpace: "nowrap" }}>
              {v === undefined ? "none" : <Num>{money(v)}</Num>}
            </div>
          );
          const wa = a === undefined ? 0 : (Number(a) / max) * BAR_W * p;
          const wb = b === undefined ? 0 : (Number(b) / max) * BAR_W * q;
          return (
            <div key={r} style={{ position: "absolute", inset: 0, opacity: o }}>
              <div style={{ position: "absolute", left: X0, top: top + barH - 14, ...note(25, INK), opacity: p, whiteSpace: "nowrap" }}>{r}</div>
              <div style={{ position: "absolute", left: BAR_X, top, width: wa, height: barH, background: WAS, borderRadius: 2 }} />
              {val(a, wa, top, INK_SOFT, ease(frame, at + 12, 10))}
              <div style={{ position: "absolute", left: BAR_X, top: top + barH + h(6), width: wb, height: barH, background: BAR, borderRadius: 2 }} />
              {val(b, wb, top + barH + h(6), BLUE_INK, ease(frame, at + 22, 10))}
            </div>
          );
        })}
        <Note at={losesAt} x={1100} y={rowTop(regions.indexOf("East")) + h(6)} out={chartOut}>
          <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>
            East: −<Num>{money(String(drop))}</Num>, Acme&rsquo;s order
          </span>
        </Note>
        <Note at={wentAt - 2} x={1100} y={rowTop(regions.indexOf("East")) + h(46)} out={chartOut}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>In a report that already went out</span>
        </Note>

        {/* ── Lower: when, and how ── */}
        <Note at={neverAt - 2} x={X0} y={y(LOW)} out={perColAt - 4}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>Use it when</span>
        </Note>
        <Note at={typoAt - 4} x={X0} y={y(LOW + 50)} out={perColAt - 4}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>The old value was never true: a typo</span>
        </Note>
        <Note at={nowAt - 4} x={X0} y={y(LOW + 104)} out={perColAt - 4}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>Only the present matters</span>
        </Note>
        {ease(frame, perColAt - 4, 10) < 1 ? <ColumnRule x={860} top={y(LOW)} height={h(150)} at={mergeAt} /> : null}
        <Note at={mergeAt - 2} x={900} y={y(LOW)} out={perColAt - 4}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>In practice</span>
        </Note>
        <Note at={mergeAt} x={900} y={y(LOW + 50)} out={perColAt - 4}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            A <QMono>MERGE</QMono> on the natural key
          </span>
        </Note>
        <Note at={updAt} x={900} y={y(LOW + 104)} out={perColAt - 4}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>Matched: update the row</span>
        </Note>
        <Note at={insAt} x={900} y={y(LOW + 150)} out={perColAt - 4}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>Not matched: insert it</span>
        </Note>

        {/* ── Lower: types per column ── */}
        <Note at={perColAt} x={X0} y={y(LOW - 12)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>Types are chosen per column</span>
        </Note>
        <DataTable
          g={gm}
          cols={colsOf(M)}
          at={versionsAt}
          rows={B.rows.map((cells, i) => ({ cells, at: versionsAt + 4 + i * 4 }))}
          swaps={B.rows.map((_, row) => ({ row, col: mName, at: fixedAt + 6 + row * 4, value: M.rows[row][mName] }))}
          marks={[
            ...B.rows.map((_, row) => ({ row, col: mRegion, at: versionsAt + 8, out: nameAt })),
            ...B.rows.map((_, row) => ({ row, col: mName, at: nameAt + 4, out: fixedAt + 6 })),
            ...B.rows.map((_, row) => ({ row, col: mName, at: fixedAt + 8 + row * 4, color: MARK_OK })),
          ]}
        />
        <TableName g={gm} at={versionsAt}>
          dim_customer, customer <Num>42</Num>
        </TableName>
        <Listing
          lines={lines}
          x={X0}
          top={y(LOW + 96)}
          width={listingWidth(lines, SIZE)}
          size={SIZE}
          at={nameAt - 2}
          title="Type 1 on the name"
          marks={[{ line: lineOf(lines, "WHERE customer_id"), at: nameAt + 14 }]}
        />
        <Note at={fixedAt} x={X0} y={y(LOW + 96) + listingHeight(lines.length, SIZE) + h(22)}>
          <span style={{ ...note(25, OK_INK), whiteSpace: "nowrap" }}>
            <Num>{TYPE1.mixFixed}</Num> rows: the name, on every version
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
