import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { column, COLUMNS, count, FILES, KB, MB, SORTED_REGION, TABLE } from "./data";
import { COLUMN_TINT, Drift, FileBar, OK_INK, X0 } from "./parts";

/** Bars start here, at this many px a megabyte. */
const BAR_X = 470;
const PX_PER_MB = 80;
const BAR_H = 28;
const STEP = 38;
const TINTS = COLUMNS.map((c) => COLUMN_TINT[c.name]);

/** "554 bytes", "3 KB", "380 KB", "4.2 MB": a size the way the narration says it. */
const size = (bytes: number) => (bytes < 1000 ? `${bytes} bytes` : bytes < 1e6 ? KB(bytes) : MB(bytes));

/**
 * Question 4, measured column by column on the made-up million sales: each
 * column's share of the CSV (its values as text) against its chunks in the
 * Parquet file. Region, four values, is a dictionary and about three bits a
 * row; amount, random to the cent, barely shrinks; sorting makes runs, so
 * the dates in date order take 3 KB and region sorted by region 554 bytes.
 * Then the whole file under two codecs.
 */
export const CompressScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cmp").from;
  const qAt = n.word("cmp", "Question four");
  const qTextAt = n.word("cmp", "Why is compression");
  const typeAt = n.word("cmp", "A column holds one type");
  const fewAt = n.word("cmp", "few distinct values");
  const regionAt = n.word("cmp-region", "Region has four");
  const dictAt = n.word("cmp-region", "in a dictionary");
  const bitsAt = n.word("cmp-region", "about three bits a row");
  const kbAt = n.word("cmp-region", "three hundred eighty kilobytes");
  const textAt = n.word("cmp-region", "five and a half megabytes of text");
  const amountAt = n.word("cmp-amount", "Amount is random");
  const fromAt = n.word("cmp-amount", "six point eight megabytes");
  const toAt = n.word("cmp-amount", "four point two");
  const sortAt = n.word("cmp-sort", "Sorting before writing");
  const datesAt = n.word("cmp-sort", "In date order");
  const threeKbAt = n.word("cmp-sort", "three kilobytes");
  const sortedRegionAt = n.word("cmp-sort", "Sorted by region");
  const bytesAt = n.word("cmp-sort", "five hundred fifty-four bytes");
  const codecAt = n.word("cmp-codec", "Codecs trade too");
  const zstdAt = n.word("cmp-codec", "six point three megabytes");
  const snappyAt = n.word("cmp-codec", "Snappy, the default");
  const slowerAt = n.word("cmp-codec", "decompresses slower");
  const slowLinkAt = n.word("cmp-codec", "Over a slow link");
  const fastAt = n.word("cmp-codec", "on a fast disk");
  const end = n.beat("cmp-codec").to;

  const region = column("region");
  const amount = column("amount");
  const date = column("sale_date");
  const bits = (region.parquet * 8) / TABLE.rows;
  const w = (bytes: number) => Math.max(3, (bytes / 1e6) * PX_PER_MB);

  /** One bar and its label: the size, then what it is. */
  const bar = (top: number, bytes: number, at: number, kind: React.ReactNode, opts: { csv?: boolean; tint: string; sizeAt?: number; ink?: string }) => (
    <>
      <FileBar x={BAR_X} y={top} width={w(bytes)} height={h(BAR_H)} at={at} pattern={opts.csv ? TINTS : undefined} fill={opts.tint} />
      <div
        style={{
          position: "absolute",
          left: BAR_X + w(bytes) + 16,
          top: top + (h(BAR_H) - 30) / 2,
          ...note(23, opts.ink ?? INK),
          whiteSpace: "nowrap",
          opacity: ease(frame, opts.sizeAt ?? at + 6, 10),
        }}
      >
        <b>
          <Num>{size(bytes)}</Num>
        </b>{" "}
        <span style={{ color: INK_SOFT }}>{kind}</span>
      </div>
    </>
  );

  const name = (top: number, at: number, col: string, sub: React.ReactNode) => (
    <div style={{ position: "absolute", left: X0, top: top - 4, width: BAR_X - X0 - 20, opacity: ease(frame, at, 12) }}>
      <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: INK }}>{col}</div>
      <div style={{ ...note(20, INK_SOFT), marginTop: 2 }}>{sub}</div>
    </div>
  );

  const R = y(340);
  const A = y(486);
  const D = y(596);
  const C = y(742);
  const sample = TABLE.sample;
  const regionCol = sample.cols.indexOf("region");
  const firstSeen = TABLE.regions;

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={regionAt + 4} level={-37} />
      <Sfx name="el-tap" at={kbAt} level={-35} />
      <Sfx name="el-tap" at={toAt} level={-35} />
      <Sfx name="el-tap" at={threeKbAt} level={-35} />
      <Sfx name="el-tap" at={bytesAt} level={-35} />
      <Sfx name="el-whoosh" at={codecAt + 4} level={-37} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          Why is compression more effective in columnar formats?
        </QuestionCard>
        <Note at={typeAt} x={X0} y={y(262)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            One column: one type
            <span style={{ opacity: ease(frame, fewAt, 10) }}>, often few distinct values</span>
            <span style={{ opacity: ease(frame, regionAt + 10, 10) }}>. Each column, as CSV text against its bytes in Parquet:</span>
          </span>
        </Note>

        {/* ── region: four values ── */}
        {name(R, regionAt, "region", <><Num>{count(region.distinct)}</Num> distinct values</>)}
        {bar(R, region.csv, regionAt + 4, "as CSV text", { csv: true, tint: TINTS[2], sizeAt: textAt })}
        {bar(R + h(STEP), region.parquet, kbAt - 4, <>in Parquet, about <Num>{bits.toFixed(0)}</Num> bits a row</>, { tint: COLUMN_TINT.region, sizeAt: kbAt })}
        {bar(R + 2 * h(STEP), SORTED_REGION.region, sortedRegionAt + 4, "sorted by region first", { tint: COLUMN_TINT.region, sizeAt: bytesAt, ink: OK_INK })}

        {/* The dictionary: each value once, then a short code per row. */}
        <div style={{ position: "absolute", left: 1400, top: R - 6, opacity: ease(frame, dictAt, 12) }}>
          <div style={{ ...label(20, INK_SOFT), marginBottom: 8 }}>dictionary</div>
          {firstSeen.map((v, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", height: 30, fontFamily: MONO, fontSize: 21, color: INK }}>
              <span style={{ width: 26, textAlign: "right", color: INK_SOFT }}>{i}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 1600, top: R - 6, opacity: ease(frame, bitsAt - 4, 12) }}>
          <div style={{ ...label(20, INK_SOFT), marginBottom: 8, whiteSpace: "nowrap" }}>first rows</div>
          {sample.rows.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", height: 30, fontFamily: MONO, fontSize: 21, color: INK, whiteSpace: "nowrap" }}>
              <span style={{ display: "inline-block", minWidth: 28, padding: "0 6px", borderRadius: 4, background: COLUMN_TINT.region, textAlign: "center" }}>
                {firstSeen.indexOf(r[regionCol])}
              </span>
              <span style={{ color: INK_SOFT, fontSize: 19 }}>{r[regionCol]}</span>
            </div>
          ))}
        </div>

        {/* ── amount: random to the cent ── */}
        {name(A, amountAt, "amount", <><Num>{count(amount.distinct)}</Num> distinct values</>)}
        {bar(A, amount.csv, amountAt + 4, "as CSV text", { csv: true, tint: TINTS[5], sizeAt: fromAt })}
        {bar(A + h(STEP), amount.parquet, toAt - 6, "in Parquet", { tint: COLUMN_TINT.amount, sizeAt: toAt })}

        {/* ── sale_date: in date order ── */}
        {name(D, sortAt, "sale_date", <><Num>{count(date.distinct)}</Num> days, in date order</>)}
        {bar(D, date.csv, datesAt + 2, "as CSV text", { csv: true, tint: TINTS[1] })}
        {bar(D + h(STEP), date.parquet, threeKbAt - 4, "in Parquet: long runs of one date", { tint: COLUMN_TINT.sale_date, sizeAt: threeKbAt, ink: OK_INK })}

        {/* ── The whole file, by codec ── */}
        <div style={{ position: "absolute", left: X0, top: C - 6, width: BAR_X - X0 - 20, opacity: ease(frame, codecAt, 12) }}>
          <div style={{ ...label(23, INK) }}>the whole file</div>
          <div style={{ ...note(20, INK_SOFT), marginTop: 2 }}>by codec</div>
        </div>
        <div style={{ position: "absolute", left: BAR_X - 10, top: C - h(18), width: 1340, height: 1, background: HAIRLINE, opacity: ease(frame, codecAt, 12) }} />
        {bar(C, FILES.zstd, zstdAt - 4, <><QMono>zstd</QMono> (Zstandard)</>, { tint: COLUMN_TINT.units, sizeAt: zstdAt })}
        {bar(C + h(STEP), FILES.parquet, snappyAt - 4, <><QMono>snappy</QMono>, the default</>, { tint: COLUMN_TINT.category, sizeAt: snappyAt })}
        <Note at={slowerAt} x={BAR_X + w(FILES.zstd) + 380} y={C + (h(BAR_H) - 30) / 2}>
          <span style={{ ...note(23, INK), fontWeight: 650, whiteSpace: "nowrap" }}>but slower to decompress</span>
        </Note>
        <Note at={slowLinkAt} x={X0} y={C + h(STEP) * 2 + h(14)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            Over a slow link, the smaller file wins
            <span style={{ opacity: ease(frame, fastAt, 10) }}>; on a fast disk, the faster codec.</span>
            <span style={{ ...note(20, INK_SOFT), opacity: ease(frame, fastAt + 12, 10) }}> The trade-off is the page&apos;s chart of codec speeds.</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
