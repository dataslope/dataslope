import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { HURT, OPENING, thousands } from "./data";
import { Bar, ColumnRule, Drift, Listing, listingHeight, Node, PlanBox, SmallMono, X0 } from "./parts";

const HELPS_Y = 300;
const L_TOP = 392;
const R_X = 1000;
const BAR_W = 520;
const CELLS = 20;

/** Megabytes as pg_size_pretty counts them (2^20 bytes): whole above ten,
 *  one decimal below. */
const mb = (bytes: number) => {
  const v = bytes / 2 ** 20;
  return v >= 10 ? `${Math.round(v)}` : v.toFixed(1);
};

/**
 * Question 3. The four selective reads an index helps, as green pills. Left:
 * the half-true column, every other user active, and the plan Postgres chose
 * with an index on it sitting unused: a Seq Scan of all the rows. Right, the
 * costs: write-ahead log records for 10,000 inserts with no index and with
 * three, then the users table on disk against its three indexes stacked.
 * Last, the rule, in the right answer's green.
 */
export const HurtScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hurt").from;
  const qAt = n.word("hurt", "Question three");
  const textAt = n.word("hurt", "When does an index help");
  const helpsAt = n.word("hurt", "It helps selective reads");
  const eqAt = n.word("hurt", "equality");
  const rangesAt = n.word("hurt", "ranges");
  const joinsAt = n.word("hurt", "joins");
  const sortsAt = n.word("hurt", "sorts on the column");
  const nothingAt = n.word("hurt-half", "It does nothing");
  const halfAt = n.word("hurt-half", "Half the users are active");
  const indexAt = n.word("hurt-half", "even with an index on that column");
  const scansAt = n.word("hurt-half", "Postgres scans the table");
  const passAt = n.word("hurt-half", "one pass beats");
  const costsAt = n.word("hurt-writes", "every index costs writes");
  const noneAt = n.word("hurt-writes", "ten thousand log records");
  const threeAt = n.word("hurt-writes", "forty thousand with three");
  const eachAt = n.word("hurt-writes", "each insert updates every index");
  const spaceAt = n.word("hurt-space", "They take space as well");
  const biggerAt = n.word("hurt-space", "bigger than the table itself");
  const ruleAt = n.word("hurt-rule", "index the columns you filter");
  const end = n.beat("hurt-rule").to;

  const lTop = y(L_TOP);
  const cellsTop = lTop + h(38);
  const listTop = cellsTop + h(70);
  const planTop = listTop + listingHeight(HURT.activeQuery.length, 21) + h(22);
  const indexTotal = HURT.indexesBytes;
  const reds = [ds("red", 500), ds("red", 400), ds("red", 300)];
  const maxSpace = Math.max(HURT.table.bytes, indexTotal);

  return (
    <AbsoluteFill>
      {[eqAt, rangesAt, joinsAt, sortsAt].map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-34} />
      ))}
      <Sfx name="el-sprinkle" at={halfAt + 2} level={-34} />
      <Sfx name="el-whoosh" at={scansAt} level={-35} />
      <Sfx name="el-pop" at={noneAt} level={-32} />
      <Sfx name="el-pop" at={threeAt} level={-31} />
      <Sfx name="el-tap" at={spaceAt + 4} level={-33} />
      <Sfx name="el-pop" at={biggerAt} level={-31} />
      <Sfx name="el-chime" at={ruleAt + 6} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={58}>
          When does an index help, and when does it hurt?
        </QuestionCard>

        {/* ── It helps selective reads ── */}
        <Note at={helpsAt} x={X0} y={y(HELPS_Y) + 6}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap" }}>Helps selective reads:</span>
        </Note>
        <div style={{ position: "absolute", left: 410, top: y(HELPS_Y) + 6, display: "flex", alignItems: "baseline", gap: "0.5em", fontSize: 23, whiteSpace: "nowrap" }}>
          {[
            { at: eqAt, text: "equality" },
            { at: rangesAt, text: "ranges" },
            { at: joinsAt, text: "joins" },
            { at: sortsAt, text: "sorts on the column" },
          ].map((p, i) => (
            <span key={p.text} style={{ ...note(23, OK_INK), fontWeight: 650, opacity: ease(frame, p.at, 10) }}>
              {i > 0 ? <span style={{ color: INK_SOFT, fontWeight: 500, marginRight: "0.5em" }}>·</span> : null}
              {p.text}
            </span>
          ))}
        </div>

        {/* ── Left: most rows match, and the index sits unused ── */}
        <Note at={nothingAt} x={X0} y={lTop}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <SmallMono>is_active</SmallMono>: true for <b>{thousands(HURT.active)}</b> of <Num>{thousands(OPENING.users)}</Num> users
          </span>
        </Note>
        {Array.from({ length: CELLS }, (_, i) => {
          const on = i % 2 === 1;
          const p = ease(frame, halfAt + i * 1.2, 8);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: X0 + i * 32,
                top: cellsTop,
                width: 28,
                height: h(30),
                borderRadius: 4,
                boxSizing: "border-box",
                border: `2px solid ${BAR}`,
                background: on ? `color-mix(in srgb, ${BAR} 75%, ${PAPER})` : PAPER,
                opacity: p,
              }}
            />
          );
        })}
        <Listing lines={HURT.activeQuery} x={X0} top={listTop} width={400} size={21} at={indexAt - 6} />
        <Node
          x={X0 + 440}
          y={listTop + h(8)}
          w={300}
          h={h(76)}
          at={indexAt}
          tone="off"
          bare
          title={<SmallMono>users_active_idx</SmallMono>}
          sub={<span style={{ opacity: ease(frame, scansAt + 6, 10) }}>exists, unused</span>}
          size={22}
        />
        <PlanBox lines={HURT.activePlan} x={X0} top={planTop} width={780} size={20} at={scansAt - 6} marks={[{ line: "Seq Scan", text: "Seq Scan", at: scansAt + 2 }]} />
        <Note at={passAt} x={X0} y={planTop + h(150)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            One pass over the table beats <b>half a million</b> jumps from the index.
          </span>
        </Note>

        {/* ── Right: what every index costs ── */}
        <ColumnRule x={950} top={lTop} bottom={lTop + h(440)} at={costsAt} />
        <Note at={costsAt} x={R_X} y={lTop}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <Num>10,000</Num> inserts: write-ahead log records
          </span>
        </Note>
        <Bar
          x={R_X}
          y={lTop + h(36)}
          width={BAR_W}
          max={HURT.walThree}
          at={noneAt - 4}
          label="no index"
          shown={thousands(HURT.walNone)}
          segments={[{ value: HURT.walNone, color: BAR }]}
        />
        <Bar
          x={R_X}
          y={lTop + h(114)}
          width={BAR_W}
          max={HURT.walThree}
          at={threeAt - 4}
          label="three indexes"
          shown={thousands(HURT.walThree)}
          segments={[{ value: HURT.walThree, color: ds("red", 500) }]}
          ink={ACCENT_INK}
        />
        <Note at={eachAt} x={R_X} y={lTop + h(196)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>each insert also writes into every index</span>
        </Note>

        <Note at={spaceAt} x={R_X} y={lTop + h(250)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>On disk</span>
        </Note>
        <Bar
          x={R_X}
          y={lTop + h(284)}
          width={BAR_W}
          max={maxSpace}
          at={spaceAt + 4}
          label="the users table"
          shown={`${mb(HURT.table.bytes)} MB`}
          segments={[{ value: HURT.table.bytes, color: BAR }]}
          ink={BLUE_INK}
        />
        <Bar
          x={R_X}
          y={lTop + h(362)}
          width={BAR_W}
          max={maxSpace}
          at={spaceAt + 10}
          label={
            <>
              its three indexes:{" "}
              <span style={{ color: INK_SOFT }}>
                {HURT.indexes.map((ix) => mb(ix.bytes)).join(" + ")} MB
              </span>
            </>
          }
          shown={`${mb(indexTotal)} MB`}
          segments={HURT.indexes.map((ix, i) => ({ value: ix.bytes, color: reds[i], at: spaceAt + 10 + i * 6 }))}
          ink={ACCENT_INK}
        />
        <Note at={biggerAt} x={R_X + BAR_W + 120} y={lTop + h(392)}>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>bigger</span>
        </Note>

        {/* ── The rule ── */}
        <Note at={ruleAt - 2} x={X0} y={y(866)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>Index the columns you filter and join on,</b> not every column.
          </span>
        </Note>
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(866) - h(14),
            width: 900,
            height: 2,
            background: OK,
            opacity: ease(frame, ruleAt, 12) * 0.5,
          }}
        />
      </Drift>
    </AbsoluteFill>
  );
};
