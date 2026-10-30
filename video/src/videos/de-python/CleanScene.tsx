import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CLEAN } from "./data";
import {
  colsOf,
  Console,
  consoleHeight,
  DataTable,
  Drift,
  geoOf,
  lineOf,
  Listing,
  listingHeight,
  Mark,
  MARK,
  MARK_BAD,
  MARK_OK,
  Mono,
  OK_INK,
  TableName,
  Title,
  X0,
} from "./parts";

const TOP = 330;
const SIZE = 19;
const RIGHT_X = 1000;

/**
 * Questions 13 and 14. The page's clean(): its four raw rows (whitespace kept
 * visible), the three records it returns, Bob's age None and "bad row"
 * dropped. A quoted name split by hand into four fields and by csv into
 * three; then the rejects kept with their reason. Question 14: to_numeric
 * with errors="coerce" on the video's own four amounts (two become NaN, and
 * are counted), and dates parsed with an explicit format, where a day-first
 * date and February 30 each raise ValueError.
 */
export const CleanScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("clean").from;
  const qAt = n.word("clean", "Question thirteen");
  const textAt = n.word("clean", "How do you clean messy");
  const asked = n.beat("clean").to;
  const stripAt = n.word("clean-page", "Strip whitespace");
  const countAt = n.word("clean-page", "check the field count");
  const convertAt = n.word("clean-page", "convert types");
  const bobAt = n.word("clean-page", "Bob's missing age becomes none");
  const droppedAt = n.word("clean-page", "bad row is dropped");
  const splitAt = n.word("clean-csv", "Split on commas yourself");
  const smithAt = n.word("clean-csv", "Smith comma Jo");
  const fourAt = n.word("clean-csv", "becomes four fields");
  const moduleAt = n.word("clean-csv", "The CSV module reads three");
  const silenceAt = n.word("clean-reject", "don't drop bad rows in silence");
  const rejectAt = n.word("clean-reject", "Send them to a reject list");
  const reasonAt = n.word("clean-reject", "with the reason");
  const countThemAt = n.word("clean-reject", "count them");
  const q14At = n.word("parse", "Question fourteen");
  const q14TextAt = n.word("parse", "How do you parse numbers");
  const coerceAt = n.word("parse-num", "to numeric with errors equals coerce");
  const nanAt = n.word("parse-num", "into not a number");
  const naAt = n.word("parse-num", "n slash a");
  const commaAt = n.word("parse-num", "twelve hundred with a comma");
  const countNumAt = n.word("parse-num", "Count them");
  const formatAt = n.word("parse-date", "parse with an explicit format");
  const catchAt = n.word("parse-date", "catch the value error");
  const dayAt = n.word("parse-date", "A day-first date fails");
  const febAt = n.word("parse-date", "February thirtieth");
  const end = n.beat("parse-date").to;
  const out13 = q14At - 4;

  // ── 13 ──
  const FN = CLEAN.fn;
  const fnTop = y(TOP);
  const rawLines = CLEAN.raw.map((r) => JSON.stringify(r));
  const rawTop = y(TOP);
  const outTop = rawTop + consoleHeight(rawLines.length, 21) + h(46);
  const PO = CLEAN.page.out;
  const Q = CLEAN.quoted.lines;
  const qTop = outTop + consoleHeight(PO.length, 20) + h(56);
  const QR = CLEAN.quarantine.lines;
  const qrH = listingHeight(QR.length, SIZE);

  // ── 14 ──
  const NU = CLEAN.numeric;
  const table = {
    cols: ["", "amounts", "to_numeric"],
    rows: NU.rows.map((r, i) => [r[0], JSON.stringify(NU.inputs[i]), r[1]]),
  };
  const tg = geoOf(table, RIGHT_X + 60, y(TOP), h, { rowH: 50, bodySize: 24 });
  const bad = table.rows.flatMap((r, i) => (r[2] === "NaN" ? [i] : []));
  const DT = CLEAN.dates.lines;
  const dtTop = y(TOP) + listingHeight(NU.lines.length, 21) + h(170);
  const DO = CLEAN.dates.out;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={countAt} level={-36} />
      <Sfx name="el-pop" at={bobAt + 4} level={-34} />
      <Sfx name="el-scratch" at={droppedAt + 4} level={-33} />
      <Sfx name="el-scratch" at={fourAt + 4} level={-34} />
      <Sfx name="el-pop" at={moduleAt + 4} level={-34} />
      <Sfx name="el-pencil" at={rejectAt + 4} level={-36} />
      <Sfx name="el-tap" at={naAt} level={-35} />
      <Sfx name="el-tap" at={commaAt} level={-35} />
      <Sfx name="el-scratch" at={dayAt + 6} level={-34} />
      <Sfx name="el-scratch" at={febAt + 6} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={13} at={qAt - 4} textAt={textAt - 4} out={out13} size={60}>
          How do you clean messy delimited records defensively?
        </QuestionCard>
        <QuestionCard n={14} at={q14At} textAt={q14TextAt - 2} size={60}>
          How do you parse numbers or dates that might be malformed?
        </QuestionCard>

        {/* ── 13. The page's clean() ── */}
        <Listing
          lines={FN}
          x={X0}
          top={fnTop}
          width={820}
          size={SIZE}
          at={stripAt - 4}
          out={silenceAt - 4}
          marks={[
            { line: lineOf(FN, "p.strip()"), at: stripAt + 2, out: countAt },
            { line: lineOf(FN, "len(parts) != 3"), at: countAt, out: convertAt },
            { line: lineOf(FN, '"id": int(rid)'), at: convertAt, out: bobAt },
            { line: lineOf(FN, "if age else None"), at: bobAt, color: MARK_OK },
          ]}
        />
        <Note at={asked - 6} x={RIGHT_X} y={rawTop - h(40)} out={out13}>
          <Title>raw</Title>
        </Note>
        <Console
          lines={rawLines}
          x={RIGHT_X}
          top={rawTop}
          width={420}
          size={21}
          at={asked - 4}
          out={out13}
          marks={[
            { line: lineOf(rawLines, "Bob"), at: bobAt, color: MARK },
            { line: lineOf(rawLines, "bad row"), at: droppedAt, color: MARK_BAD },
          ]}
        />
        <Note at={convertAt} x={RIGHT_X} y={outTop - h(40)} out={out13}>
          <Title>clean(raw)</Title>
        </Note>
        <Console
          lines={PO}
          x={RIGHT_X}
          top={outTop}
          width={560}
          size={20}
          at={convertAt + 4}
          out={out13}
          marks={[{ line: lineOf(PO, "Bob"), at: bobAt + 6, color: MARK_OK }]}
        />
        <Note at={droppedAt + 4} x={RIGHT_X + 580} y={outTop + h(4)} out={out13}>
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>
            <Mono>bad row</Mono>: gone
          </span>
        </Note>

        {/* A quoted comma, by hand and by csv. */}
        <Listing
          lines={Q}
          x={RIGHT_X}
          top={qTop}
          width={640}
          size={20}
          at={splitAt - 2}
          out={out13}
          marks={[
            { line: lineOf(Q, 'line.split(",")'), at: fourAt - 2, out: moduleAt, color: MARK_BAD },
            { line: lineOf(Q, "csv.reader"), at: moduleAt, color: MARK_OK },
          ]}
        />
        <Console
          lines={CLEAN.quoted.out}
          x={RIGHT_X}
          top={qTop + listingHeight(Q.length, 20) + h(14)}
          width={500}
          size={20}
          at={smithAt}
          out={out13}
          lineAt={[fourAt - 2, moduleAt + 2]}
          marks={[
            { line: 0, at: fourAt + 4, color: MARK_BAD },
            { line: 1, at: moduleAt + 8, color: MARK_OK },
          ]}
        />

        {/* Rejects, kept with their reason. */}
        <Listing
          lines={QR}
          x={X0}
          top={fnTop}
          width={820}
          size={SIZE}
          at={silenceAt}
          out={out13}
          marks={[
            { line: lineOf(QR, "except ValueError"), at: rejectAt, out: reasonAt },
            { line: lineOf(QR, "rejects.append"), at: reasonAt, color: MARK_OK },
          ]}
        />
        <Console
          lines={CLEAN.quarantine.out}
          x={X0}
          top={fnTop + qrH + h(16)}
          width={820}
          size={20}
          at={reasonAt + 4}
          out={out13}
          marks={[{ line: 0, at: countThemAt, color: MARK_OK }]}
        />

        {/* ── 14. Numbers ── */}
        <Listing
          lines={NU.lines}
          x={X0}
          top={y(TOP)}
          width={860}
          size={21}
          at={coerceAt - 4}
          marks={[{ line: lineOf(NU.lines, 'errors="coerce"'), at: coerceAt + 4, color: MARK_OK }]}
        />
        <TableName g={tg} at={coerceAt}>
          <Mono>amounts</Mono>, coerced
        </TableName>
        <DataTable
          g={tg}
          cols={colsOf(table, { to_numeric: { ink: BLUE_INK, numeric: true } })}
          at={coerceAt}
          rows={table.rows.map((cells, i) => ({ cells, at: coerceAt + 4 + i * 2 }))}
          marks={[
            { row: bad[0], col: 2, at: naAt, color: MARK_BAD },
            { row: bad[1], col: 2, at: commaAt, color: MARK_BAD },
          ]}
        />
        <Note at={nanAt} x={X0} y={y(TOP) + listingHeight(NU.lines.length, 21) + h(24)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>what won&apos;t parse becomes NaN, not an error</span>
        </Note>
        <Note at={countNumAt} x={X0} y={y(TOP) + listingHeight(NU.lines.length, 21) + h(70)}>
          <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={countNumAt + 4} color={MARK_OK}>
              count them: <span style={{ fontVariantNumeric: "tabular-nums" }}>{CLEAN.badCount}</span> didn&apos;t parse
            </Mark>
          </span>
        </Note>

        {/* ── 14. Dates ── */}
        <Listing
          lines={DT}
          x={X0}
          top={dtTop}
          width={820}
          size={20}
          at={formatAt - 4}
          marks={[
            { line: lineOf(DT, "strptime"), at: formatAt + 4, out: catchAt },
            { line: lineOf(DT, "except ValueError"), at: catchAt, color: MARK_OK },
          ]}
        />
        <Console
          lines={DO}
          x={X0}
          top={dtTop + listingHeight(DT.length, 20) + h(14)}
          width={900}
          size={20}
          at={formatAt + 6}
          lineAt={[formatAt + 10, dayAt, febAt]}
          marks={[
            { line: lineOf(DO, "30/10/2026"), at: dayAt + 4, color: MARK_BAD },
            { line: lineOf(DO, "day 30"), at: febAt + 4, color: MARK_BAD },
          ]}
        />
        <Note at={formatAt} x={X0 + 860} y={dtTop + h(4)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            one explicit format: <Mono>%Y-%m-%d</Mono>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
