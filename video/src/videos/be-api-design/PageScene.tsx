import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PAGE, PAGE_SIZE, thousands } from "./data";
import { Drift, Mark, MARK_BAD, MARK_OK, METHOD_INK, OK, OK_INK, Strike, X0, VRule } from "./parts";

/** The chart: rows read for one page of twenty, on a log scale. */
const BAR_X0 = 300;
const BAR_X1 = 790;
const DECADES = 5;
const barW = (rows: number) => (Math.log10(rows) / DECADES) * (BAR_X1 - BAR_X0);
const BAR_H = 22;

/** The three lists on the right. */
const LIST_X = [990, 1270, 1550];
const LIST_SIZE = 24;

/** The request's parts, with what each one says. */
const QUERY = [
  { t: "GET", method: true },
  { t: " /articles?" },
  { t: `limit=${PAGE_SIZE}`, says: `take ${PAGE_SIZE}` },
  { t: "&" },
  { t: "offset=40", says: "skip 40" },
];
const Q_SIZE = 30;

/**
 * Question 6. Offset and limit, read as the page's breakdown; what it costs in
 * Postgres at pages 1, 500 and 5,000 (the Index Scan's actual rows, on a log
 * scale); the row page two repeats once an article is published; the cursor
 * and what it decodes to, page two by cursor, and the cursor's flat bars;
 * then what a cursor gives up.
 */
export const PageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("page").from;
  const qAt = n.word("page", "Question six");
  const textAt = n.word("page", "How do you paginate");
  const simpleAt = n.word("page", "The simple way is offset and limit");
  const skipAt = n.word("page", "skip forty");
  const takeAt = n.word("page", "take twenty");
  const jumpAt = n.word("page", "It can jump to any page");
  const walksAt = n.word("page", "the database walks every row it skips");
  const runAt = n.word("page-cost", "Run it in Postgres");
  const articlesAt = n.word("page-cost", "on a hundred thousand articles");
  const p1At = n.word("page-cost", "Page one reads twenty rows");
  const p500At = n.word("page-cost", "Page five hundred reads ten thousand");
  const p5000At = n.word("page-cost", "page five thousand reads all");
  const repeatAt = n.word("page-drift", "It can also repeat rows");
  const takesAt = n.word("page-drift", "A reader takes page one");
  const publishedAt = n.word("page-drift", "a new article is published");
  const startsAt = n.word("page-drift", "page two starts with the article");
  const endedAt = n.word("page-drift", "page one ended on");
  const cursorAt = n.word("page-cursor", "Cursor pagination hands back");
  const stoppedAt = n.word("page-cursor", "marking where the page stopped");
  const idAt = n.word("page-cursor", "the last article's ID");
  const afterAt = n.word("page-cursor", "asks for what comes after it");
  const depthAt = n.word("page-cursor", "twenty rows read at any depth");
  const shiftAt = n.word("page-cursor", "nothing shifts");
  const costsAt = n.word("page-cost-two", "It costs two things");
  const noJumpAt = n.word("page-cost-two", "no jumping straight");
  const orderAt = n.word("page-cost-two", "an order that's unique and never changes");
  const tieAt = n.word("page-cost-two", "adds the ID as a tiebreaker");
  const end = n.beat("page-cost-two").to;

  // ── The request, broken into its parts ──
  const qTop = y(300);
  const ch = Q_SIZE * 0.6;
  let cx = X0;
  const parts = QUERY.map((p) => {
    const x = cx;
    cx += p.t.length * ch;
    return { ...p, x, w: p.t.length * ch };
  });
  const partAt = (p: (typeof QUERY)[number]) => (p.says === `take ${PAGE_SIZE}` ? takeAt : p.says ? skipAt : simpleAt);

  // ── The chart ──
  const chartTop = y(480);
  const rowY = (i: number) => chartTop + h(64) + i * h(86);
  const offsetAt = [p1At, p500At, p5000At];
  const axisY = rowY(2) + h(70);

  // ── The lists ──
  const listTop = y(330);
  const rowTop = (i: number) => listTop + h(46) + i * h(40);
  const p1 = PAGE.page1;
  const shown = (ids: readonly number[]) => [ids[0], ids[1], null, ids[ids.length - 1]];
  const lists = [
    { title: "page 1", ids: shown(p1), at: takesAt },
    { title: "page 2, by offset", ids: shown(PAGE.page2Offset), at: startsAt, tone: "bad" as const },
    { title: "page 2, by cursor", ids: shown(PAGE.page2Cursor), at: afterAt + 6, tone: "ok" as const },
  ];
  const cursorTop = y(600);
  const page500 = PAGE.offset.find((o) => o.page === 500)!;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={skipAt} level={-34} />
      <Sfx name="el-pencil" at={takeAt} level={-34} />
      {offsetAt.map((at, i) => (
        <Sfx key={i} name="el-pop" at={at + 4} level={-31} />
      ))}
      <Sfx name="el-tap" at={publishedAt + 4} level={-30} />
      <Sfx name="el-tap" at={startsAt + 6} level={-29} />
      <Sfx name="el-tap" at={idAt + 4} level={-31} />
      <Sfx name="el-sprinkle" at={depthAt + 2} level={-32} />
      <Sfx name="el-scratch" at={noJumpAt + 8} level={-32} />
      <Sfx name="el-pencil" at={tieAt} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4}>
          How do you paginate a large collection?
        </QuestionCard>

        {/* ?limit=20&offset=40, read part by part. */}
        <div style={{ position: "absolute", left: X0, top: qTop, height: Q_SIZE * 1.4, fontSize: Q_SIZE, opacity: ease(frame, simpleAt - 4, 12) }}>
          {parts.map((p, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                left: p.x - X0,
                fontFamily: MONO,
                fontSize: Q_SIZE,
                fontWeight: p.method ? 500 : 500,
                color: p.method ? METHOD_INK : p.says ? INK : INK_SOFT,
                whiteSpace: "pre",
                fontVariantLigatures: "none",
              }}
            >
              {p.t}
            </span>
          ))}
        </div>
        {parts
          .filter((p) => p.says)
          .map((p) => {
            const at = partAt(p);
            const bTop = qTop + Q_SIZE * 1.45;
            return (
              <React.Fragment key={p.t}>
                <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, at, 10) }}>
                  <path d={`M${p.x + 2},${bTop} v8 H${p.x + p.w - 2} v-8`} fill="none" stroke={BAR} strokeWidth={2} />
                </svg>
                <Note at={at + 2} x={p.x} y={bTop + 14} width={p.w} style={{ textAlign: "center" }}>
                  <span style={{ ...label(21, BLUE_INK), whiteSpace: "nowrap" }}>{p.says}</span>
                </Note>
              </React.Fragment>
            );
          })}
        <Note at={jumpAt} x={X0} y={qTop + h(104)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Jumps to any page,{" "}
            <span style={{ color: ACCENT_INK, opacity: ease(frame, walksAt, 10) }}>but the database walks every row it skips.</span>
          </span>
        </Note>

        {/* What it costs: rows the index scan read, for twenty returned. */}
        <Note at={runAt} x={X0} y={chartTop}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>
            Rows read for one page of <Num>{PAGE_SIZE}</Num>
            <span style={{ color: INK_SOFT, opacity: ease(frame, articlesAt, 10) }}>
              {" "}· PostgreSQL, <Num>{thousands(PAGE.articles)}</Num> articles, newest first
            </span>
          </span>
        </Note>
        <Note at={p1At} x={X0} y={chartTop + h(32)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
            <span style={{ color: BLUE_INK }}>■ by offset</span>
            <span style={{ color: OK_INK, opacity: ease(frame, depthAt, 10) }}>{"   "}■ by cursor</span>
          </span>
        </Note>
        {PAGE.offset.map((o, i) => {
          const cur = PAGE.cursor.find((c) => c.page === o.page)!;
          const grow = ease(frame, offsetAt[i], 22);
          const curGrow = ease(frame, depthAt + 4 + i * 4, 16);
          const top = rowY(i);
          return (
            <React.Fragment key={o.page}>
              <Note at={offsetAt[i] - 4} x={X0} y={top + 6}>
                <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
                  page <Num>{thousands(o.page)}</Num>
                </span>
              </Note>
              <div style={{ position: "absolute", left: BAR_X0, top: top + 4, width: barW(o.read) * grow, height: BAR_H, background: BAR, borderRadius: 3, opacity: grow > 0 ? 1 : 0 }} />
              <Note at={offsetAt[i] + 14} x={BAR_X0 + barW(o.read) + 12} y={top}>
                <span style={{ ...note(23, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
                  <Num>{thousands(o.read)}</Num>
                </span>
              </Note>
              <div style={{ position: "absolute", left: BAR_X0, top: top + 4 + BAR_H + 10, width: barW(cur.read) * curGrow, height: BAR_H, background: OK, borderRadius: 3, opacity: curGrow > 0 ? 1 : 0 }} />
              <Note at={depthAt + 10 + i * 4} x={BAR_X0 + barW(cur.read) + 12} y={top + BAR_H + 10}>
                <span style={{ ...note(23, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
                  <Num>{thousands(cur.read)}</Num>
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        {/* The log axis, a tick per decade. */}
        <div style={{ position: "absolute", left: BAR_X0, top: axisY, width: BAR_X1 - BAR_X0, height: 1, background: HAIRLINE, opacity: ease(frame, p1At, 12) }} />
        {Array.from({ length: DECADES + 1 }, (_, d) => (
          <Note key={d} at={p1At + d} x={BAR_X0 + (d / DECADES) * (BAR_X1 - BAR_X0) - 40} y={axisY + 8} width={80} style={{ textAlign: "center" }}>
            <span style={{ ...note(19, INK_SOFT), whiteSpace: "nowrap" }}>
              <Num>{thousands(10 ** d)}</Num>
            </span>
          </Note>
        ))}
        <Note at={p1At + 8} x={BAR_X1 + 50} y={axisY + 8}>
          <span style={{ ...note(19, INK_SOFT), whiteSpace: "nowrap" }}>log scale</span>
        </Note>

        {/* Page 500 as Postgres ran it: the scan reads what OFFSET skips. */}
        <Note at={p500At} x={LIST_X[0]} y={listTop} out={repeatAt - 6}>
          <span style={{ ...label(21, INK), fontWeight: 500, whiteSpace: "nowrap" }}>Page 500, as Postgres ran it</span>
        </Note>
        {page500.query.map((l, i) => (
          <Note key={l} at={p500At + 4 + i * 4} x={LIST_X[0]} y={listTop + h(46) + i * h(38)} out={repeatAt - 6}>
            <span style={{ fontFamily: MONO, fontSize: 23, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>
              {l.includes("OFFSET") ? <Mark at={p500At + 20}>{l}</Mark> : l}
            </span>
          </Note>
        ))}
        <Note at={p500At + 24} x={LIST_X[0]} y={listTop + h(56) + page500.query.length * h(38)} out={repeatAt - 6}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            the index scan reads <b style={{ color: BLUE_INK }}><Num>{thousands(page500.read)}</Num> rows</b>, and LIMIT keeps <Num>{PAGE_SIZE}</Num>
          </span>
        </Note>

        {/* Drift: a new article, and page two by offset repeats one. */}
        {lists.map((l, li) => (
          <React.Fragment key={l.title}>
            <Note at={li === 0 ? repeatAt : l.at} x={LIST_X[li]} y={listTop}>
              <span style={{ ...label(21, li === 0 ? INK : l.tone === "bad" ? ACCENT_INK : OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>{l.title}</span>
            </Note>
            {l.ids.map((id, i) => {
              const first = i === 0 && li > 0;
              const last = i === 3 && li === 0;
              const text = id === null ? "⋮" : `article ${thousands(id)}`;
              const body =
                first || last ? (
                  <Mark at={li === 0 ? endedAt : li === 1 ? startsAt + 10 : afterAt + 14} color={li === 2 ? MARK_OK : li === 1 ? MARK_BAD : undefined}>
                    {text}
                  </Mark>
                ) : (
                  text
                );
              return (
                <Note key={i} at={l.at + 4 + i * 3} x={LIST_X[li]} y={rowTop(i)}>
                  <span style={{ fontFamily: MONO, fontSize: LIST_SIZE, color: id === null ? INK_SOFT : INK, whiteSpace: "nowrap", fontWeight: first || last ? 500 : 400 }}>{body}</span>
                </Note>
              );
            })}
          </React.Fragment>
        ))}
        <Note at={publishedAt} x={LIST_X[1]} y={listTop - h(46)}>
          <span style={{ ...note(23, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            + article {thousands(PAGE.published)} published
          </span>
        </Note>
        <Note at={startsAt + 14} x={LIST_X[1]} y={rowTop(4)}>
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>shown twice</span>
        </Note>
        <Note at={shiftAt} x={LIST_X[2]} y={rowTop(4)}>
          <span style={{ ...note(22, OK_INK), whiteSpace: "nowrap" }}>nothing shifts</span>
        </Note>

        {/* The cursor, and what it decodes to. */}
        <Note at={cursorAt} x={LIST_X[0]} y={cursorTop}>
          <span style={{ fontFamily: MONO, fontSize: 24, color: INK, whiteSpace: "nowrap" }}>
            <span style={{ color: INK_SOFT }}>next_cursor: </span>
            <Mark at={stoppedAt + 8}>{PAGE.cursorToken}</Mark>
          </span>
        </Note>
        <Note at={idAt} x={LIST_X[0]} y={cursorTop + h(46)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            decodes to{" "}
            <span style={{ fontFamily: MONO, fontSize: 24, color: INK, fontWeight: 500 }}>{JSON.stringify(PAGE.cursorDecoded).replace(":", ": ")}</span>
            , page 1's last ID
          </span>
        </Note>
        <Note at={afterAt} x={LIST_X[0]} y={cursorTop + h(92)}>
          <span style={{ fontFamily: MONO, fontSize: 22, color: INK, whiteSpace: "nowrap" }}>
            <span style={{ color: METHOD_INK, fontWeight: 500 }}>GET</span> /articles?limit={PAGE_SIZE}&after={PAGE.cursorToken}
          </span>
        </Note>

        {/* What a cursor costs. */}
        <Note at={costsAt} x={LIST_X[0]} y={y(770)}>
          <span style={{ ...label(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>What a cursor costs</span>
        </Note>
        <Note at={noJumpAt} x={LIST_X[0]} y={y(770) + h(44)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            no jump to <Strike at={noJumpAt + 10}>page 500</Strike>
          </span>
        </Note>
        <Note at={orderAt} x={LIST_X[0]} y={y(770) + h(88)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            a unique, unchanging order:{" "}
            <span style={{ fontFamily: MONO, fontSize: 23, fontWeight: 500 }}>
              (created_at, <Mark at={tieAt + 4}>id</Mark>)
            </span>
          </span>
        </Note>

        {/* Hairlines: the chart against the right column, and between the three lists. */}
        <VRule x={953} top={qTop} bottom={y(770) + h(88) + 30} at={p500At} />
        {[1238, 1520].map((x, i) => (
          <VRule key={x} x={x} top={listTop} bottom={rowTop(4) + 30} at={i === 0 ? startsAt : afterAt + 6} />
        ))}
      </Drift>
    </AbsoluteFill>
  );
};
