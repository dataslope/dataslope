import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, useEntityLayout } from "../../editorial/erd";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NF1, NF2, NF3, type Result } from "./data";
import { colsOf, DataTable, Drift, geoOf, KEY_INK, MARK, MARK_BAD, MARK_KEY, Mono, OK_INK, X0 } from "./parts";

const TABLE_X = 600;
const ROWS_Y = [292, 462, 664] as const;
const OPTS = { headH: 42, rowH: 46, bodySize: 23, headSize: 20 } as const;
const STAR_X = 1460;

/** A phrase of the oath, underlined on `underlineAt`: db-normalization's
 *  OathScene Phrase, copied and set smaller. */
const Phrase: React.FC<{ at: number; underlineAt: number; color: string; children: React.ReactNode }> = ({
  at,
  underlineAt,
  color,
  children,
}) => {
  const frame = useCurrentFrame();
  const u = ease(frame, underlineAt - 2, 16);
  return (
    <Ink at={at} dur={18} style={{ position: "relative", whiteSpace: "nowrap" }}>
      <span style={{ position: "relative", display: "inline-block", ...headline(44) }}>
        {children}
        <span
          style={{
            position: "absolute",
            left: 0,
            // Below the descenders, not through them.
            top: "1.2em",
            width: `${u * 100}%`,
            height: "0.07em",
            borderRadius: 3,
            background: color,
            opacity: u > 0 ? 1 : 0,
          }}
        />
      </span>
    </Ink>
  );
};

/** One normal form: its name, the oath's phrase for it, and the table that breaks it. */
const Form: React.FC<{ top: number; at: number; underlineAt: number; color: string; name: string; phrase: string; table: string }> = ({
  top,
  at,
  underlineAt,
  color,
  name,
  phrase,
  table,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: X0, top, width: 450 }}>
      <div style={{ ...label(23, color), fontWeight: 700, opacity: ease(frame, at - 4, 10), whiteSpace: "nowrap" }}>{name}</div>
      <div style={{ position: "relative", height: 62, marginTop: 6 }}>
        <Phrase at={at} underlineAt={underlineAt} color={color}>
          {phrase}
        </Phrase>
      </div>
      <div style={{ ...note(21, INK_SOFT), marginTop: 12, opacity: ease(frame, at + 8, 10), whiteSpace: "nowrap" }}>
        breaks it: <Mono>{table}</Mono>
      </div>
    </div>
  );
};

/**
 * Question 6, after Unit 7 (db-normalization): its three tables, each the
 * form it breaks, under Kent's "one value per cell, the whole key, and
 * nothing but the key" (its OathScene, copied and re-cued). Then the
 * warehouse twist: a star's product dimension breaks third normal form on
 * purpose, and snowflaking puts it back.
 */
export const NfScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("nf").from;
  const qAt = n.word("nf", "Question six");
  const textAt = n.word("nf", "What is first, second, and third normal form");
  const firstAt = n.word("nf", "First: one value per cell");
  const cellAt = n.word("nf", "one value per cell");
  const twoAt = n.word("nf", "Two phone numbers in one cell");
  const secondAt = n.word("nf-2", "Second:");
  const wholeAt = n.word("nf-2", "the whole key");
  const keyByAt = n.word("nf-2", "Key order lines by order and product");
  const halfAt = n.word("nf-2", "depends on only half of it");
  const thirdAt = n.word("nf-3", "Third:");
  const butAt = n.word("nf-3", "nothing but the key");
  const cityAt = n.word("nf-3", "A customer's city");
  const notOrderAt = n.word("nf-3", "not the order");
  const transAt = n.word("nf-3", "transitive dependency");
  const appAt = n.word("nf-star", "App databases");
  const purposeAt = n.word("nf-star", "breaks it on purpose");
  const deptAt = n.word("nf-star", "department depends on category");
  const backAt = n.word("nf-star", "Snowflaking puts it back");
  const end = n.beat("nf-star").to;

  const g1 = geoOf(NF1, TABLE_X, y(ROWS_Y[0]), h, OPTS);
  const g2 = geoOf(NF2, TABLE_X, y(ROWS_Y[1]), h, OPTS);
  const g3 = geoOf(NF3, TABLE_X, y(ROWS_Y[2]), h, OPTS);
  const col = (t: Result, c: string) => t.cols.indexOf(c);
  const all = (t: Result, c: string, at: number, color: string, step = 3) => t.rows.map((_, i) => ({ row: i, col: col(t, c), at: at + i * step, color }));
  const star = useEntityLayout({
    x: STAR_X,
    y: y(400),
    width: 360,
    name: "dim_product",
    columns: [{ name: "product_key", key: "PK" }, { name: "product_name" }, { name: "category" }, { name: "department" }],
  });
  const dimAll = appAt;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={cellAt + 4} level={-35} />
      <Sfx name="el-scratch" at={twoAt + 4} level={-35} />
      <Sfx name="el-pencil" at={wholeAt + 2} level={-35} />
      <Sfx name="el-tap" at={halfAt + 2} level={-34} />
      <Sfx name="el-pencil" at={butAt + 2} level={-35} />
      <Sfx name="el-tap" at={transAt} level={-34} />
      <Sfx name="el-pop" at={purposeAt} level={-33} />
      <Sfx name="el-chime" at={backAt} level={-37} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is 1NF, 2NF, and 3NF?
        </QuestionCard>

        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, dimAll, 16) * 0.45 }}>
          {/* ── First normal form ── */}
          <Form top={y(ROWS_Y[0])} at={firstAt} underlineAt={twoAt} color={BLUE_INK} name="First normal form, 1NF" phrase="One value per cell." table="students" />
          <DataTable
            g={g1}
            cols={colsOf(NF1)}
            at={firstAt + 4}
            rows={NF1.rows.map((cells, i) => ({ cells, at: firstAt + 8 + i * 3 }))}
            marks={[{ row: 0, col: col(NF1, "phones"), at: twoAt + 4, color: MARK_BAD }]}
          />
          <Note at={twoAt + 10} x={g1.right + 24} y={g1.rowTop(0) + 6}>
            <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>← two values, one cell</span>
          </Note>

          {/* ── Second normal form ── */}
          <Form top={y(ROWS_Y[1])} at={secondAt} underlineAt={wholeAt} color={BLUE_INK} name="Second normal form, 2NF" phrase="The whole key." table="order_items" />
          <DataTable
            g={g2}
            cols={colsOf(NF2, {
              order_id: { ink: KEY_INK, tag: { text: "PK", at: keyByAt } },
              product_id: { ink: KEY_INK, tag: { text: "PK", at: keyByAt + 4 } },
            })}
            at={secondAt + 4}
            rows={NF2.rows.map((cells, i) => ({ cells, at: secondAt + 8 + i * 3 }))}
            marks={[...all(NF2, "product_id", halfAt, MARK_KEY), ...all(NF2, "product_name", halfAt + 4, MARK)]}
          />
          <Note at={halfAt + 8} x={g2.right + 24} y={g2.rowTop(0) + 4}>
            <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
              ← half the key
            </span>
          </Note>

          {/* ── Third normal form ── */}
          <Form top={y(ROWS_Y[2])} at={thirdAt} underlineAt={butAt} color={ACCENT_INK} name="Third normal form, 3NF" phrase="Nothing but the key." table="orders_bad" />
          <DataTable
            g={g3}
            cols={colsOf(NF3, { order_id: { ink: KEY_INK, tag: { text: "PK", at: thirdAt + 6 } } })}
            at={thirdAt + 4}
            rows={NF3.rows.map((cells, i) => ({ cells, at: thirdAt + 8 + i * 3 }))}
            marks={[...all(NF3, "customer_id", notOrderAt, MARK_KEY), ...all(NF3, "customer_city", cityAt + 4, MARK)]}
          />
          <Note at={transAt - 2} x={TABLE_X} y={g3.rowTop(NF3.rows.length) + h(14)}>
            <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
              <Mono>order_id</Mono> → <Mono>customer_id</Mono> → <Mono>customer_city</Mono>
              <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, marginLeft: 16 }}>a transitive dependency</span>
            </span>
          </Note>
        </div>

        {/* ── The warehouse: third normal form broken on purpose ── */}
        <Note at={appAt} x={STAR_X} y={y(292)} width={360}>
          <span style={{ ...note(24, INK) }}>
            App databases: <b style={{ color: OK_INK }}>third normal form</b>
          </span>
        </Note>
        <Entity
          layout={star}
          at={purposeAt - 4}
          marks={{
            product_key: { at: deptAt + 4, tone: "key" },
            category: { at: deptAt + 10, tone: "note" },
            department: { at: purposeAt + 8, tone: "warn" },
          }}
        />
        <Note at={purposeAt + 4} x={STAR_X} y={star.top - 40}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>a star&apos;s dimension</span>
        </Note>
        <Note at={deptAt} x={STAR_X} y={star.bottom + h(18)} width={360}>
          <span style={{ ...note(23, INK) }}>
            <Mono>department</Mono> depends on <Mono>category</Mono>, not on the key:
            <span style={{ color: ACCENT_INK, fontWeight: 650 }}> not 3NF, on purpose</span>
          </span>
        </Note>
        <Note at={backAt} x={STAR_X} y={star.bottom + h(118)} width={360}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700 }}>Snowflaking puts it back.</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
