import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { BLOCK, FRESH } from "./data";
import { Console, Drift, lineOf, Listing, listingHeight, Mark, MARK_BAD, OK_INK, X0 } from "./parts";

const LIST_SIZE = 20;
const TABLE_X = 1230;
const COLS = [{ w: 130, t: "chunk id" }, { w: 104, t: "indexed" }, { w: 84, t: "now" }, { w: 230, t: "" }];
const ROW_H = 64;

/**
 * Question 4. The page's block on the left, run as written (check.mjs), with
 * what it printed; on the right, the two maps it compares, one row per chunk
 * id. Each row is lit as the narration reaches it, and its action written
 * beside it: doc1#1 changed and doc3#0 is new (embed), doc2#0 is gone
 * (delete), doc1#0 unchanged (nothing to pay). Then the trap of skipping the
 * deletes, in red.
 */
export const FreshScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("fresh").from;
  const qAt = n.word("fresh", "Question");
  const textAt = n.word("fresh", "How do you keep embeddings fresh");
  const loadAt = n.word("fresh", "an incremental load");
  const idAt = n.word("fresh", "a stable id and a content hash");
  const compareAt = n.word("fresh", "compare with what's indexed");
  const exampleAt = n.word("fresh-run", "In the page's example");
  const changedAt = n.word("fresh-run", "doc one, chunk one changed");
  const newAt = n.word("fresh-run", "doc three is new");
  const embedAt = n.word("fresh-run", "embed those two");
  const goneAt = n.word("fresh-run", "Doc two is gone");
  const deleteAt = n.word("fresh-run", "delete it");
  const zeroAt = n.word("fresh-run", "Doc one, chunk zero");
  const nothingAt = n.word("fresh-run", "costs nothing");
  const skipAt = n.word("fresh-leak", "Skip the deletes");
  const keepsAt = n.word("fresh-leak", "keeps answering questions");
  const leakAt = n.word("fresh-leak", "a data leak at worst");
  const end = n.beat("fresh-leak").to;

  const listTop = y(340);
  const listH = listingHeight(BLOCK.length, LIST_SIZE);
  const consoleTop = listTop + listH + 24;

  // One row per chunk id, in the order the narration takes them.
  const ids = ["doc1#0", "doc1#1", "doc2#0", "doc3#0"];
  const idx = FRESH.indexed as Record<string, string>;
  const cur = FRESH.current as Record<string, string>;
  const action = (id: string) =>
    FRESH.toEmbed.includes(id)
      ? { text: "embed", ink: BLUE_INK, at: embedAt, lit: id === "doc1#1" ? changedAt : newAt, litOut: goneAt }
      : FRESH.toDelete.includes(id)
        ? { text: "delete", ink: INK, at: deleteAt, lit: goneAt, litOut: zeroAt }
        : { text: "nothing to pay", ink: OK_INK, at: nothingAt, lit: zeroAt, litOut: skipAt };
  const tableTop = y(340);
  const colX = (j: number) => TABLE_X + COLS.slice(0, j).reduce((a, c) => a + c.w, 0);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={idAt + 4} level={-36} />
      <Sfx name="el-tap" at={changedAt + 2} level={-35} />
      <Sfx name="el-tap" at={newAt + 2} level={-35} />
      <Sfx name="el-pop" at={embedAt + 4} level={-34} />
      <Sfx name="el-tap" at={goneAt + 2} level={-35} />
      <Sfx name="el-scratch" at={deleteAt + 4} level={-34} />
      <Sfx name="el-chime" at={nothingAt + 4} level={-36} />
      <Sfx name="el-scratch" at={leakAt + 4} level={-33} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={58}>
          How do you keep embeddings fresh without re-embedding everything?
        </QuestionCard>

        {/* The page's block and what it printed. */}
        <Note at={loadAt - 2} x={X0} y={listTop - 40}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>
            an incremental load, keyed by content: the page&apos;s block, run in Pyodide
          </span>
        </Note>
        <Listing
          lines={BLOCK}
          x={X0}
          top={listTop}
          width={1040}
          size={LIST_SIZE}
          at={loadAt}
          marks={[
            { line: lineOf(BLOCK, "chunk id -> content hash"), at: idAt + 4, out: compareAt },
            { line: lineOf(BLOCK, "indexed = {"), at: compareAt + 2, out: exampleAt },
            { line: lineOf(BLOCK, "current = {"), at: compareAt + 6, out: exampleAt },
            { line: lineOf(BLOCK, "to_embed ="), at: embedAt, out: goneAt },
            { line: lineOf(BLOCK, "to_delete ="), at: deleteAt, out: zeroAt },
          ]}
        />
        <Console
          lines={FRESH.printed}
          x={X0}
          top={consoleTop}
          width={560}
          size={21}
          at={embedAt + 2}
          lineAt={[embedAt + 2, deleteAt + 2]}
        />

        {/* The two maps, compared row by row. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, compareAt, 12) }}>
          <line x1={TABLE_X} x2={colX(4)} y1={tableTop} y2={tableTop} stroke={INK} strokeWidth={2} />
          <line x1={TABLE_X} x2={colX(3)} y1={tableTop + 40} y2={tableTop + 40} stroke={HAIRLINE} strokeWidth={1} />
          <line x1={TABLE_X} x2={colX(4)} y1={tableTop + 40 + ids.length * ROW_H} y2={tableTop + 40 + ids.length * ROW_H} stroke={HAIRLINE} strokeWidth={1} />
        </svg>
        {COLS.slice(0, 3).map((c, j) => (
          <Note key={c.t} at={compareAt + j * 3} x={colX(j) + 10} y={tableTop + 8}>
            <span style={{ ...label(20, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>{c.t}</span>
          </Note>
        ))}
        {ids.map((id, i) => {
          const a = action(id);
          const top = tableTop + 40 + i * ROW_H;
          const lit = ease(frame, a.lit, 10) * (1 - ease(frame, a.litOut, 12));
          const gone = id in idx && !(id in cur);
          return (
            <React.Fragment key={id}>
              <div
                style={{
                  position: "absolute",
                  left: TABLE_X - 6,
                  top: top + 6,
                  width: colX(3) - TABLE_X + 12,
                  height: ROW_H - 12,
                  borderRadius: 6,
                  background: `color-mix(in srgb, ${HIGHLIGHT} ${100 * lit}%, transparent)`,
                  opacity: ease(frame, compareAt + 6 + i * 3, 10),
                }}
              />
              {[id, idx[id] ?? "—", cur[id] ?? "—"].map((v, j) => (
                <div
                  key={j}
                  style={{
                    position: "absolute",
                    left: colX(j) + 10,
                    top: top + 14,
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: j === 0 ? 600 : 500,
                    color: v === "—" ? INK_SOFT : INK,
                    fontVariantLigatures: "none",
                    whiteSpace: "nowrap",
                    opacity: ease(frame, compareAt + 6 + i * 3, 10),
                  }}
                >
                  {v}
                </div>
              ))}
              <Note at={a.at} x={colX(3) + 16} y={top + 12}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 12px 3px",
                    borderRadius: 8,
                    border: `2px ${gone ? "dashed" : "solid"} ${a.ink}`,
                    background: PAPER,
                    ...note(23, a.ink),
                    fontWeight: 650,
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.text}
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={exampleAt} x={TABLE_X} y={tableTop + 40 + ids.length * ROW_H + 18}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>chunk id → hash, in the index and in the sources now</span>
        </Note>

        {/* The trap. */}
        <Note at={skipAt} x={X0} y={y(870)}>
          <span style={{ ...note(28, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={skipAt + 4} color={MARK_BAD}>skip the deletes</Mark>
            <span style={{ opacity: ease(frame, keepsAt - 2, 10) }}>, and a removed document keeps answering</span>
            <span style={{ opacity: ease(frame, leakAt - 2, 10), color: INK }}>: wrong at best, a data leak at worst</span>
          </span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {/* The deleted row's warning: a red edge on it while the trap is said. */}
          <rect
            x={TABLE_X - 6}
            y={tableTop + 40 + 2 * ROW_H + 6}
            width={colX(4) - TABLE_X + 12}
            height={ROW_H - 12}
            rx={6}
            fill="none"
            stroke={ACCENT}
            strokeWidth={2.4}
            opacity={ease(frame, skipAt + 4, 10)}
          />
        </svg>
      </Drift>
    </AbsoluteFill>
  );
};
