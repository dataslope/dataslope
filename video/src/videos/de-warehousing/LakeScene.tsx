import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { during, ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, headline, label, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { COLUMN_TINT, Drift, OK, OK_INK, READ, X0 } from "./parts";

const TOP = 296;
const PANEL_W = 520;
const PANEL_GAP = 60;
const BOX_Y = 396;
const BOX_H = 196;
const NOTES_Y = 614;

/** A file in a bucket. */
const FileChip: React.FC<{ x: number; y: number; name: string; at: number; lit?: number; ring?: number; gone?: number }> = ({
  x,
  y,
  name,
  at,
  lit = 0,
  ring = 0,
  gone = 0,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        padding: "4px 10px",
        borderRadius: 5,
        background: lit > 0 ? `color-mix(in srgb, ${READ} ${lit * 100}%, ${COLUMN_TINT.sale_id})` : COLUMN_TINT.sale_id,
        boxShadow: `inset 0 0 0 ${1.5 + 1.5 * ring}px ${ring > 0 ? OK : `color-mix(in srgb, ${INK} 35%, transparent)`}`,
        fontFamily: MONO,
        fontSize: 19,
        color: INK,
        whiteSpace: "nowrap",
        opacity: p * (1 - 0.6 * gone),
      }}
    >
      {name}
    </div>
  );
};

/**
 * Question 9 (and the Pipelines page's lakehouse question). Three panels: a
 * warehouse (its own managed storage, tuned for SQL), a lake (open files in
 * a bucket, with no transactions or schema enforcement), and a lakehouse:
 * the same kind of bucket under a transaction log, whose commits say which
 * files make up each version of the table, so a reader sees one version, an
 * upsert is one commit, and time travel reads an older one. The bridge into
 * Part 10 closes it.
 */
export const LakeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("lake").from;
  const qAt = n.word("lake", "Question nine");
  const qTextAt = n.word("lake", "What is a data lake");
  const whAt = n.word("lake", "A warehouse stores structured");
  const formatAt = n.word("lake", "in its own format");
  const sqlAt = n.word("lake", "tuned for sequel");
  const lakeAt = n.word("lake-lake", "A data lake keeps raw files");
  const filesAt = n.word("lake-lake", "like Parquet and Avro");
  const cheapAt = n.word("lake-lake", "on cheap object storage");
  const openAt = n.word("lake-lake", "open and flexible");
  const noTxAt = n.word("lake-lake", "no transactions and no schema enforcement");
  const houseAt = n.word("lake-log", "A lakehouse puts a transaction log");
  const tfAt = n.word("lake-log", "Delta Lake, Iceberg or Hudi");
  const commitAt = n.word("lake-log", "Each commit records");
  const versionAt = n.word("lake-log", "every reader sees one consistent version");
  const acidAt = n.word("lake-gives", "ACID transactions");
  const schemasAt = n.word("lake-gives", "enforced schemas");
  const upsertAt = n.word("lake-gives", "upserts");
  const travelAt = n.word("lake-gives", "time travel to older versions");
  const reliableAt = n.word("lake-gives", "warehouse reliability");
  const nextFrom = n.beat("next").from;
  const landsAt = n.word("next", "the data lands on time");
  const nextAt = n.word("next", "Next:", { nth: 2 });
  const end = n.beat("next").to;

  const px = (i: number) => X0 + i * (PANEL_W + PANEL_GAP);
  const boxY = y(BOX_Y);
  const boxH = h(BOX_H);
  const dimAll = ease(frame, nextFrom, 16) * 0.55;

  // The lakehouse's log: three commits, the third an upsert of one file.
  const LOG = [
    { v: "v1", text: "add file 1, file 2" },
    { v: "v2", text: "add file 3" },
    { v: "v3", text: "remove file 1, add file 4" },
  ];
  const FILES_IN = [
    { name: "file 1", v3: false, v1: true },
    { name: "file 2", v3: true, v1: true },
    { name: "file 3", v3: true, v1: false },
    { name: "file 4", v3: true, v1: false },
  ];
  const current = during(frame, versionAt, travelAt, 10);
  const travel = ease(frame, travelAt, 10);

  const title = (i: number, at: number, text: string, sub: React.ReactNode, subAt: number) => (
    <div style={{ position: "absolute", left: px(i), top: y(TOP), opacity: ease(frame, at, 12) }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: PANEL_W, height: 2, background: INK }} />
      <div style={{ position: "absolute", left: 0, top: 12, ...headline(42), whiteSpace: "nowrap" }}>{text}</div>
      <div style={{ position: "absolute", left: 0, top: 64, ...label(20, BLUE_INK), whiteSpace: "nowrap", opacity: ease(frame, subAt, 10) }}>{sub}</div>
    </div>
  );

  const bucket = (i: number, at: number) => (
    <div
      style={{
        position: "absolute",
        left: px(i),
        top: boxY,
        width: PANEL_W - 40,
        height: boxH,
        borderRadius: "6px 6px 28px 28px",
        border: `2px solid ${INK}`,
        borderTop: `2px dashed ${INK}`,
        boxSizing: "border-box",
        background: PAPER,
        opacity: ease(frame, at, 12),
      }}
    >
      <div style={{ position: "absolute", left: 16, bottom: 12, ...label(19, INK_SOFT), whiteSpace: "nowrap" }}>object storage</div>
    </div>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={whAt} level={-35} />
      <Sfx name="el-pop" at={lakeAt} level={-35} />
      <Sfx name="el-sprinkle" at={filesAt} level={-35} />
      <Sfx name="el-pop" at={houseAt} level={-35} />
      <Sfx name="el-pencil" at={commitAt + 4} level={-35} />
      <Sfx name="el-tap" at={versionAt + 2} level={-36} />
      <Sfx name="el-tap" at={travelAt + 2} level={-36} />
      <Sfx name="el-chime" at={nextAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          What is a data lake vs a warehouse vs a lakehouse?
        </QuestionCard>

        <div style={{ position: "absolute", inset: 0, opacity: 1 - dimAll }}>
          {/* ── The warehouse ── */}
          {title(0, whAt, "Warehouse", "structured, cleaned data", whAt + 10)}
          <div
            style={{
              position: "absolute",
              left: px(0),
              top: boxY,
              width: PANEL_W - 40,
              height: boxH,
              borderRadius: 8,
              background: ds("gray", 50),
              border: `2px solid ${INK}`,
              boxSizing: "border-box",
              opacity: ease(frame, whAt + 4, 12),
            }}
          >
            {["sales", "customers", "products"].map((t, k) => (
              <div
                key={t}
                style={{
                  position: "absolute",
                  left: 22 + k * 150,
                  top: 26,
                  width: 132,
                  height: boxH - 90,
                  borderTop: `2px solid ${INK}`,
                  background: `repeating-linear-gradient(180deg, ${COLUMN_TINT.sale_id} 0 18px, ${PAPER} 18px 22px)`,
                  opacity: ease(frame, whAt + 8 + k * 3, 10),
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 19, color: INK, background: PAPER, padding: "2px 4px" }}>{t}</div>
              </div>
            ))}
            <div style={{ position: "absolute", left: 22, bottom: 12, ...label(19, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, formatAt, 10) }}>
              its own managed storage and format
            </div>
          </div>
          <Note at={sqlAt} x={px(0)} y={y(NOTES_Y)}>
            <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>tuned for SQL</span>
          </Note>

          {/* ── The lake ── */}
          {title(1, lakeAt, "Data lake", "raw files, open formats", filesAt)}
          {bucket(1, cheapAt - 6)}
          {["sales.parquet", "events.avro", "clicks.parquet", "users.csv"].map((f, k) => (
            <FileChip key={f} x={px(1) + 24 + (k % 2) * 220} y={boxY + h(26) + Math.floor(k / 2) * h(52)} name={f} at={filesAt + k * 3} />
          ))}
          <Note at={openAt} x={px(1)} y={y(NOTES_Y)}>
            <span style={{ ...note(23, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>open, cheap, flexible</span>
          </Note>
          <Note at={noTxAt} x={px(1)} y={y(NOTES_Y) + h(40)}>
            <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>no transactions, no schema enforcement</span>
          </Note>

          {/* ── The lakehouse: a log over the files ── */}
          {title(2, houseAt, "Lakehouse", "Delta Lake, Iceberg, Hudi", tfAt)}
          {bucket(2, houseAt + 4)}
          {FILES_IN.map((f, k) => (
            <FileChip
              key={f.name}
              x={px(2) + 24 + k * 116}
              y={boxY + boxH - h(70)}
              name={f.name}
              at={houseAt + 6 + k * 3}
              lit={Math.max(f.v3 ? current : 0, f.v1 ? travel : 0)}
              ring={f.v1 ? travel : 0}
              gone={!f.v3 && !f.v1 ? 0 : !f.v3 ? current : 0}
            />
          ))}
          {/* The transaction log, one commit a line. */}
          <div
            style={{
              position: "absolute",
              left: px(2) + 24,
              top: boxY + h(16),
              width: PANEL_W - 88,
              padding: "6px 12px",
              background: ds("gray", 50),
              borderTop: `2px solid ${INK}`,
              boxSizing: "border-box",
              opacity: ease(frame, houseAt + 8, 12),
            }}
          >
            <div style={{ ...label(19, INK_SOFT), marginBottom: 2 }}>transaction log</div>
            {LOG.map((c, k) => {
              const at = commitAt + 4 + k * 6;
              const mark = c.v === "v3" ? current : c.v === "v1" ? travel : 0;
              return (
                <div key={c.v} style={{ position: "relative", fontFamily: MONO, fontSize: 19, color: INK, whiteSpace: "nowrap", lineHeight: 1.45, opacity: ease(frame, at, 10) }}>
                  <span style={{ position: "absolute", left: -6, right: -6, top: 2, bottom: 2, background: READ, opacity: mark, borderRadius: 3 }} />
                  <span style={{ position: "relative" }}>
                    <b>{c.v}</b> {c.text}
                    {c.v === "v3" ? (
                      <span style={{ ...label(19, OK_INK), opacity: ease(frame, upsertAt, 10) }}> · an upsert</span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
          <Note at={versionAt + 4} x={px(2)} y={y(NOTES_Y)} out={travelAt}>
            <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
              a reader sees <b>v3</b>: files 2, 3 and 4
            </span>
          </Note>
          <Note at={travelAt + 4} x={px(2)} y={y(NOTES_Y)}>
            <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
              time travel: read <b>v1</b>, files 1 and 2
            </span>
          </Note>

          {/* ── What the log gives ── */}
          <div style={{ position: "absolute", left: X0, top: y(700), display: "flex", gap: 34, alignItems: "center", ...note(25, INK), whiteSpace: "nowrap" }}>
            {[
              { at: acidAt, text: "ACID transactions" },
              { at: schemasAt, text: "enforced schemas" },
              { at: upsertAt, text: "upserts" },
              { at: travelAt, text: "time travel" },
            ].map((g) => (
              <span key={g.text} style={{ display: "inline-flex", alignItems: "center", gap: 10, opacity: ease(frame, g.at, 10) }}>
                <Tick at={g.at + 4} size={24} color={OK} />
                {g.text}
              </span>
            ))}
          </div>
          <Note at={acidAt + 8} x={X0} y={y(746)}>
            <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>atomic, consistent, isolated, durable</span>
          </Note>
          <Note at={reliableAt} x={X0} y={y(790)}>
            <span style={{ ...note(27, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>a warehouse&apos;s reliability, on the lake&apos;s open, cheaper storage</span>
          </Note>
        </div>

        {/* ── The bridge into Part 10 ── */}
        <Note at={landsAt} x={X0} y={y(852)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>All of it assumes the data lands on time, every day.</span>
        </Note>
        <NextLine at={nextAt} x={1000} y={y(842)} width={720}>
          orchestration and reliability
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
