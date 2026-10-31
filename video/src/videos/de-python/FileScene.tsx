import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FILE, GEN } from "./data";
import {
  Bars,
  bytes,
  colsOf,
  Console,
  DataTable,
  Drift,
  geoOf,
  lineOf,
  Listing,
  listingHeight,
  Mark,
  MARK_BAD,
  MARK_OK,
  OK,
  OK_INK,
  Source,
  Strike,
  TableName,
  Title,
  TitleCode,
  X0,
} from "./parts";

const TOP = 322;
const SIZE = 21;
const RIGHT_X = 1000;
const CHUNK_X = 1110;
const TOTALS_X = 1340;

/**
 * Questions 3 and 4, on the video's own 8.2 MB file. Three reads, measured:
 * read() 16.6 MB and readlines() 33.6 MB, struck, against a for loop's 149
 * KB; then the page's read_lines with a print where it opens the file, which
 * prints "pipeline built" before "opening events.csv". Question 4: the page's
 * chunked read_csv (ten chunks of 100,000 rows, each folded into a Counter),
 * its totals identical to the whole read's, 7.5 MB against 54.2; and why a
 * sum folds and a mean does not.
 */
export const FileScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("file").from;
  const qAt = n.word("file", "Question three");
  const textAt = n.word("file", "How do you process a file");
  const dontAt = n.word("file-read", "Don't call read or read lines");
  const sameAt = n.word("file-read", "the same eight megabyte file");
  const textHoldsAt = n.word("file-read", "read holds the whole text");
  const seventeenAt = n.word("file-read", "seventeen megabytes");
  const linesAt = n.word("file-read", "Read lines holds every line");
  const thirtyAt = n.word("file-read", "thirty-four");
  const lazyAt = n.word("file-loop", "a lazy iterator over its lines");
  const loopAt = n.word("file-loop", "a plain for loop streams it");
  const kbAt = n.word("file-loop", "about a hundred fifty kilobytes");
  const chainAt = n.word("file-loop", "Chain generators on it");
  const nothingAt = n.word("file-loop", "nothing is read until the last one asks");
  const q4At = n.word("csv", "Question four");
  const q4TextAt = n.word("csv", "How do you process a large CSV");
  const sizeAt = n.word("csv-chunks", "Pass chunk size to read CSV");
  const iterAt = n.word("csv-chunks", "an iterator of data frames");
  const tenAt = n.word("csv-chunks", "ten chunks of a hundred thousand rows");
  const groupAt = n.word("csv-chunks", "Sum each chunk by group");
  const foldAt = n.word("csv-chunks", "fold it into a counter");
  const matchAt = n.word("csv-same", "The totals match the whole-file read exactly");
  const peaksAt = n.word("csv-same", "memory peaks at one chunk");
  const halfAt = n.word("csv-same", "seven and a half megabytes");
  const fiftyAt = n.word("csv-same", "not fifty-four");
  const sumsAt = n.word("csv-mean", "Sums add up across chunks");
  const meanAt = n.word("csv-mean", "A mean doesn't");
  const offAt = n.word("csv-mean", "is off");
  const carryAt = n.word("csv-mean", "Carry the sum and the count");
  const end = n.beat("iter-in").to;
  const out3 = q4At - 4;

  // ── Question 3: three reads, stacked ──
  const R = FILE.read.lines;
  const RL = FILE.readlines.lines;
  const S = FILE.stream.lines;
  const rTop = y(TOP);
  const rlTop = rTop + listingHeight(R.length, SIZE) + h(58);
  const sTop = rlTop + listingHeight(RL.length, SIZE) + h(58);
  const rd = bytes(FILE.read.peak);
  const rl = bytes(FILE.readlines.peak);
  const st = bytes(FILE.stream.peak);
  const LZ = FILE.lazy.lines;
  const lzTop = rTop;
  const lzH = listingHeight(LZ.length, 20);

  // ── Question 4 ──
  const C = FILE.chunks.lines;
  const cH = listingHeight(C.length, SIZE);
  const chunkH = h(30);
  const chunkTop = rTop + h(6);
  // Each chunk in turn is grouped and folded, one every 8 frames.
  const foldK = frame < foldAt ? -1 : Math.min(FILE.nChunks - 1, Math.floor((frame - foldAt) / 8));
  const T = { cols: ["name", "qty"], rows: FILE.totals };
  const tg = geoOf(T, TOTALS_X, chunkTop, h, { rowH: 46, bodySize: 24, headH: 44 });
  const totalsAt = foldAt + FILE.nChunks * 8;
  const pBarsY = rTop + cH + h(112);
  const wh = bytes(FILE.whole.peak);
  const ch = bytes(FILE.chunks.peak);
  const meanTop = chunkTop + FILE.nChunks * chunkH + h(70);

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={seventeenAt - 6} level={-36} />
      <Sfx name="el-whoosh" at={thirtyAt - 6} level={-36} />
      <Sfx name="el-pop" at={kbAt} level={-33} />
      <Sfx name="el-tap" at={nothingAt + 6} level={-34} />
      <Sfx name="el-sprinkle" at={tenAt} level={-37} />
      <Sfx name="el-pencil" at={totalsAt} level={-35} />
      <Sfx name="el-pop" at={halfAt - 2} level={-33} />
      <Sfx name="el-scratch" at={offAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} out={out3} size={60}>
          How do you process a file too big to fit in memory?
        </QuestionCard>
        <QuestionCard n={4} at={q4At} textAt={q4TextAt - 2} size={60}>
          How do you process a large CSV with pandas without loading it all?
        </QuestionCard>

        {/* ── 3. Three ways to read the same file ── */}
        <Note at={sameAt - 2} x={X0} y={rTop - h(40)} out={out3}>
          <span style={{ display: "flex", gap: 22, alignItems: "baseline", whiteSpace: "nowrap" }}>
            <Title>the same file</Title>
            <Source>events.csv, 1,000,000 lines, {(GEN.bytes1m / 1e6).toFixed(1)} MB</Source>
          </span>
        </Note>
        <Listing
          lines={R}
          x={X0}
          top={rTop}
          width={760}
          size={SIZE}
          at={dontAt}
          out={out3}
          dim={chainAt}
          marks={[{ line: lineOf(R, ".read()"), at: textHoldsAt + 4, color: MARK_BAD }]}
        />
        <Listing
          lines={RL}
          x={X0}
          top={rlTop}
          width={760}
          size={SIZE}
          at={dontAt + 6}
          out={out3}
          dim={chainAt}
          marks={[{ line: lineOf(RL, ".readlines()"), at: linesAt + 4, color: MARK_BAD }]}
        />
        <Listing
          lines={S}
          x={X0}
          top={sTop}
          width={740}
          size={SIZE}
          at={loopAt - 4}
          out={out3}
          marks={[{ line: lineOf(S, "for line in f"), at: loopAt + 4, color: MARK_OK }]}
        />

        {/* The for loop's peak stays beside it once the bars give way. */}
        <Note at={kbAt + 4} x={X0 + 766} y={sTop + listingHeight(S.length, SIZE) / 2 - h(18)} out={out3}>
          <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{st.num}</span> {st.unit}
          </span>
        </Note>
        <Note at={textHoldsAt} x={RIGHT_X + 120} y={rTop - h(40)} out={chainAt - 4}>
          <span style={{ display: "flex", gap: 22, alignItems: "baseline", whiteSpace: "nowrap" }}>
            <Title>peak memory</Title>
            <Source>tracemalloc, in Pyodide</Source>
          </span>
        </Note>
        <Bars
          x={RIGHT_X - 100}
          top={rTop + h(10)}
          width={520}
          rowH={h(66)}
          nameW={220}
          out={chainAt - 4}
          bars={[
            { name: <TitleCode>read()</TitleCode>, value: FILE.read.peak, ...rd, color: ACCENT, ink: ACCENT_INK, at: seventeenAt - 8 },
            { name: <TitleCode>readlines()</TitleCode>, value: FILE.readlines.peak, ...rl, color: ACCENT, ink: ACCENT_INK, at: thirtyAt - 8 },
            { name: <TitleCode>for line in f</TitleCode>, value: FILE.stream.peak, ...st, color: OK, ink: OK_INK, at: kbAt - 6 },
          ]}
        />
        <Note at={lazyAt} x={RIGHT_X - 100} y={rTop + h(230)} out={chainAt - 4}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            a file object is <Mark at={lazyAt + 6}>a lazy iterator over its lines</Mark>
          </span>
        </Note>

        {/* Chained generators: nothing is read until the last one asks. */}
        <Note at={chainAt - 2} x={RIGHT_X} y={lzTop - h(40)} out={out3}>
          <Title>the page&apos;s read_lines, with a print where it opens the file</Title>
        </Note>
        <Listing
          lines={LZ}
          x={RIGHT_X}
          top={lzTop}
          width={800}
          size={20}
          at={chainAt}
          out={out3}
          marks={[
            { line: lineOf(LZ, 'print("pipeline built")'), at: nothingAt - 2 },
            { line: lineOf(LZ, "next(rows)"), at: nothingAt + 10, color: MARK_OK },
          ]}
        />
        <Console
          lines={FILE.lazy.out}
          x={RIGHT_X}
          top={lzTop + lzH + h(18)}
          width={600}
          size={21}
          at={nothingAt - 4}
          out={out3}
          lineAt={[nothingAt, nothingAt + 14, nothingAt + 20]}
          marks={[{ line: 1, at: nothingAt + 18, color: MARK_OK }]}
        />

        {/* ── 4. pandas, a chunk at a time ── */}
        <Listing
          lines={C}
          x={X0}
          top={rTop}
          width={920}
          size={SIZE}
          at={sizeAt - 4}
          marks={[
            { line: lineOf(C, "chunksize="), at: sizeAt + 6 },
            { line: lineOf(C, "groupby("), at: groupAt, out: foldAt },
            { line: lineOf(C, "totals.update"), at: foldAt, color: MARK_OK },
          ]}
        />
        <Note at={iterAt} x={X0} y={rTop + cH + h(14)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>an iterator of data frames, one at a time</span>
        </Note>

        <Note at={tenAt - 4} x={CHUNK_X} y={chunkTop - h(46)}>
          <Title>{FILE.nChunks} chunks</Title>
        </Note>
        {Array.from({ length: FILE.nChunks }, (_, i) => {
          const p = ease(frame, tenAt + i * 2, 10);
          if (p <= 0) return null;
          const lit = i === foldK && frame < totalsAt;
          const done = foldK >= i && foldK >= 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: CHUNK_X,
                top: chunkTop + i * chunkH,
                width: 150,
                height: chunkH - 5,
                borderRadius: 3,
                background: lit ? OK : done ? `color-mix(in srgb, ${BAR} 30%, ${PAPER})` : BAR,
                opacity: p,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...note(19, lit ? PAPER : done ? BLUE_INK : PAPER),
                fontWeight: 650,
              }}
            >
              100,000 rows
            </div>
          );
        })}
        <TableName g={tg} at={foldAt}>
          <TitleCode>totals</TitleCode>
        </TableName>
        <DataTable
          g={tg}
          cols={colsOf(T, { qty: { ink: BLUE_INK, numeric: true } }).map((c, j) => (j === 0 ? { ...c, ink: INK } : c))}
          at={foldAt}
          rows={T.rows.map((cells, i) => ({ cells, at: totalsAt + i * 3 }))}
          marks={T.rows.map((_, row) => ({ row, col: 1, at: matchAt + 6 + row * 2, color: MARK_OK }))}
        />
        <Note at={matchAt + 4} x={TOTALS_X} y={tg.rowTop(T.rows.length) + h(14)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the same as the whole read</span>
        </Note>

        <Note at={peaksAt - 4} x={X0} y={pBarsY - h(42)}>
          <span style={{ display: "flex", gap: 22, alignItems: "baseline", whiteSpace: "nowrap" }}>
            <Title>peak memory</Title>
            <Source>tracemalloc, in Pyodide</Source>
          </span>
        </Note>
        <Bars
          x={X0}
          top={pBarsY}
          width={420}
          rowH={h(60)}
          nameW={400}
          bars={[
            { name: "read_csv, the whole file", value: FILE.whole.peak, ...wh, color: ACCENT, ink: ACCENT_INK, at: fiftyAt - 6 },
            { name: "chunksize=100_000", value: FILE.chunks.peak, ...ch, color: OK, ink: OK_INK, at: halfAt - 6 },
          ]}
        />

        {/* Why it folds: sums do, a mean does not. */}
        <Note at={sumsAt} x={CHUNK_X} y={meanTop}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>on the first 250,000 rows, chunks of 100,000:</span>
        </Note>
        <Note at={meanAt} x={CHUNK_X} y={meanTop + h(44)}>
          <span style={{ ...note(26, ACCENT_INK), whiteSpace: "nowrap", display: "flex", gap: 16 }}>
            <span>mean of the chunks&apos; means</span>
            <Strike at={offAt + 6}>
              <span style={{ fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>{FILE.meanOfMeans}</span>
            </Strike>
          </span>
        </Note>
        <Note at={carryAt} x={CHUNK_X} y={meanTop + h(90)}>
          <span style={{ ...note(26, OK_INK), whiteSpace: "nowrap", display: "flex", gap: 16 }}>
            <span>sum ÷ count, at the end</span>
            <Mark at={carryAt + 10} color={MARK_OK}>
              <span style={{ fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>{FILE.meanFolded}</span>
            </Mark>
            <span style={{ color: INK_SOFT }}>the true mean</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
