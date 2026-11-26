import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { SNAPSHOT } from "./data";
import { Arrow, Band, Box, colsOf, DataTable, Drift, geoOf, lineOf, Listing, listingWidth, OK_INK, QMono, Spot, TableName, VMark, X0 } from "./parts";

const SIZE = 20;
const ROWS = { headH: 42, rowH: 48, bodySize: 22, headSize: 20 } as const;

/** The snapshot's own rows, drawn: dbt does not run here, so no times. With
 *  the listing's timestamp strategy, dbt stamps a version with the source
 *  row's updated_at, and closes the old one at the new one's: the run only
 *  finds the change (review 2026-11-20; the run's own time is what the check
 *  strategy, and a hard-delete invalidation, stamp). */
const SNAP = {
  cols: ["customer_id", "region", "dbt_valid_from", "dbt_valid_to"],
  rows: [
    ["42", "East", "East’s updated_at", "West’s updated_at"],
    ["42", "West", "West’s updated_at", "null"],
  ],
};

/** A flow box's lines, started at one height rather than centred on each
 *  box's own line count, so the three titles share a line (review
 *  2026-11-26). */
const Top: React.FC<{ pad: number; children: React.ReactNode }> = ({ pad, children }) => (
  <div style={{ alignSelf: "stretch", flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: pad }}>{children}</div>
);

/**
 * Question 4. The page's snap_customers beside the table it keeps: run 1
 * records East; run 2 compares the source with it, closes that version and
 * inserts West, each stamped with the source's updated_at. The two strategies,
 * with the listing's own strategy lines marked. Then what a snapshot cannot
 * see: three source values and two runs, West changed and changed again in
 * between, never recorded. Then why it is precious, as a flow: the source
 * holds only now, the snapshot holds what it saw, and the dimension model
 * downstream reads its two timestamps as each version's window, the
 * current version's null closed at 9999-12-31.
 */
export const SnapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("snap").from;
  const qAt = n.word("snap", "Question four");
  const textAt = n.word("snap", "What is dbt snapshot");
  const typeAt = n.word("snap", "Type two");
  const runAt = n.word("snap", "On each run of dbt");
  const toolAt = n.word("snap", "the tool that builds these models");
  const comparesAt = n.word("snap", "compares the source with what it recorded");
  const closesAt = n.word("snap", "it closes the old version");
  const insertsAt = n.word("snap", "inserts a new one");
  const fromAt = n.word("snap", "stamped with dbt valid from");
  const toAt = n.word("snap", "and dbt valid to");
  const tsAt = n.word("snap-strategy", "The timestamp strategy");
  const updAt = n.word("snap-strategy", "an updated at column");
  const checkAt = n.word("snap-strategy", "The check strategy");
  const noTsAt = n.word("snap-strategy", "for sources with no timestamp to trust");
  const seesAt = n.word("snap-gap", "it only sees what's there when it runs");
  const twiceAt = n.word("snap-gap", "Change a row twice between runs");
  const neverAt = n.word("snap-gap", "the middle value is never recorded");
  const deletedAt = n.word("snap-delete", "A row deleted at the source");
  const ignoredAt = n.word("snap-delete", "is ignored by default");
  const invalidateAt = n.word("snap-delete", "set hard deletes to invalidate");
  const closesLastAt = n.word("snap-delete", "the snapshot closes its last version");
  const presentAt = n.word("snap-keep", "the source keeps only the present");
  const onlyAt = n.word("snap-keep", "the snapshot is the only copy");
  const rebuildAt = n.word("snap-keep", "It can't be rebuilt from the source");
  const protectAt = n.word("snap-keep", "protect it like source data");
  const readsAt = n.word("snap-model", "the dimension model reads the snapshot");
  const becomeAt = n.word("snap-model", "become each version's window");
  const end = n.beat("snap-model").to;

  // ── Phase 1: the listing and the table it keeps ──
  const L = SNAPSHOT.lines;
  const listTop = y(330);
  const listW = listingWidth(L, SIZE);
  const TX = 780;
  const gs = geoOf(SNAP, TX, y(420), h, ROWS);
  const col = (c: string) => SNAP.cols.indexOf(c);
  const one = SNAP.rows[0].map((v, j) => (j === col("dbt_valid_to") ? "null" : v));
  const p1Out = seesAt - 4;
  const strategyTop = gs.rowTop(2) + h(70);
  const camera = { left: 1660, width: 160 };

  // ── Phase 2: three source values, two runs ──
  const gapTop = y(350);
  const bandH = h(52);
  const states = [
    { name: "East", x0: 160, x1: 700, at: seesAt },
    { name: "West", x0: 704, x1: 1120, at: twiceAt },
    { name: "North", x0: 1124, x1: 1760, at: twiceAt + 8 },
  ];
  /** Where North ends once the row is deleted at the source. */
  const deletedX = 1480;
  const runs = [
    { name: "Run 1", x: 430, at: seesAt + 8 },
    { name: "Run 2", x: 1290, at: twiceAt + 18 },
    { name: "Run 3", x: 1690, at: ignoredAt },
  ];
  const recTop = gapTop + bandH + h(40);
  const recH = h(50);

  // ── Phase 3: source, snapshot, model ──
  const flowTop = y(600);
  const boxH = h(180);
  const B = [
    { x: X0, w: 400 },
    { x: 640, w: 470 },
    { x: 1250, w: 560 },
  ];
  const mid = flowTop + boxH / 2;
  const topPad = h(26);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={typeAt + 4} level={-31} />
      <Sfx name="el-tap" at={runAt + 4} level={-35} />
      <Sfx name="el-pencil" at={closesAt + 2} level={-36} />
      <Sfx name="el-whoosh" at={insertsAt + 2} level={-36} />
      <Sfx name="el-pencil" at={tsAt} level={-36} />
      <Sfx name="el-pencil" at={checkAt} level={-36} />
      <Sfx name="el-tap" at={seesAt + 8} level={-35} />
      <Sfx name="el-tap" at={twiceAt + 18} level={-35} />
      <Sfx name="el-scratch" at={neverAt + 2} level={-35} />
      <Sfx name="el-scratch" at={deletedAt + 2} level={-35} />
      <Sfx name="el-tap" at={invalidateAt + 4} level={-35} />
      <Sfx name="el-pop" at={presentAt} level={-35} />
      <Sfx name="el-pop" at={onlyAt} level={-35} />
      <Sfx name="el-whoosh" at={readsAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is <QMono>dbt snapshot</QMono>, and what SCD type does it implement?
        </QuestionCard>

        {/* ── Phase 1 ── */}
        <Listing
          lines={L}
          x={X0}
          top={listTop}
          width={listW}
          size={SIZE}
          at={runAt}
          out={p1Out}
          title={SNAPSHOT.file}
          marks={[
            { line: lineOf(L, "strategy:"), at: tsAt + 2 },
            { line: lineOf(L, "updated_at:"), at: updAt + 2 },
          ]}
        />
        <Note at={typeAt} x={TX} y={y(296)} out={p1Out}>
          <span style={{ ...note(30, OK_INK), whiteSpace: "nowrap" }}>
            SCD Type 2<span style={{ color: INK_SOFT, opacity: ease(frame, toolAt, 10) }}>, built by dbt on each run</span>
          </span>
        </Note>
        <TableName g={gs} at={runAt + 4} out={p1Out}>
          snap_customers
        </TableName>
        <DataTable
          g={gs}
          cols={colsOf(SNAP)}
          at={runAt + 4}
          out={p1Out}
          rows={[
            { cells: one, at: runAt + 8 },
            { cells: SNAP.rows[1], at: insertsAt + 2, grow: true },
          ]}
          swaps={[{ row: 0, col: col("dbt_valid_to"), at: closesAt + 4, value: SNAP.rows[0][col("dbt_valid_to")] }]}
          marks={[
            { row: 0, col: col("region"), at: comparesAt + 6, out: closesAt },
            { row: 0, col: col("dbt_valid_to"), at: closesAt + 2, out: fromAt },
            { row: 1, col: col("dbt_valid_from"), at: fromAt + 2, out: tsAt },
            { row: 0, col: col("dbt_valid_from"), at: fromAt + 6, out: tsAt },
            { row: 0, col: col("dbt_valid_to"), at: toAt + 2, out: tsAt },
          ]}
        />
        <Note at={comparesAt} x={TX} y={gs.rowTop(2) + h(16)} out={tsAt - 2}>
          {/* "Next run", not "Run 2": the gap figure below has its own run 2,
              which sees North (review 2026-11-26). */}
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>Next run: the source now says West</span>
        </Note>
        <Spot art="camera" at={runAt} out={p1Out} left={camera.left} top={gs.top - h(6)} width={camera.width} />
        {/* The two strategies, side by side. */}
        <Note at={tsAt} x={TX} y={strategyTop} out={p1Out}>
          <div style={{ fontFamily: MONO, fontSize: 23, fontWeight: 500, color: INK, whiteSpace: "nowrap" }}>timestamp</div>
          <div style={{ ...note(23, INK), whiteSpace: "nowrap", marginTop: 14 }}>
            Trusts <QMono>updated_at</QMono>
          </div>
        </Note>
        {ease(frame, p1Out, 10) < 1 ? <ColumnRule x={TX + 300} top={strategyTop} height={h(80)} at={checkAt} dim={p1Out} /> : null}
        <Note at={checkAt} x={TX + 340} y={strategyTop} out={p1Out}>
          <div style={{ fontFamily: MONO, fontSize: 23, fontWeight: 500, color: INK, whiteSpace: "nowrap" }}>check</div>
          <div style={{ ...note(23, INK), whiteSpace: "nowrap", marginTop: 14 }}>Compares the columns you list</div>
          <div style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", marginTop: 6, opacity: ease(frame, noTsAt, 10) }}>No timestamp to trust</div>
        </Note>

        {/* ── Phase 2: what it never sees ── */}
        <Note at={seesAt} x={states[0].x0} y={gapTop - h(70)}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>Customer 42 in the source, moving twice between runs</span>
        </Note>
        {states.map((s, i) =>
          i === 1 ? (
            <React.Fragment key={s.name}>
              <Band x0={s.x0} x1={s.x1} top={gapTop} h={bandH} at={s.at} out={neverAt} label={s.name} />
              <Band x0={s.x0} x1={s.x1} top={gapTop} h={bandH} at={neverAt} label={s.name} tone="off" dashed />
            </React.Fragment>
          ) : (
            <Band key={s.name} x0={s.x0} x1={s.x1} top={gapTop} h={bandH} at={s.at} label={s.name} ends={i === 2 ? [{ at: deletedAt + 4, x1: deletedX }] : []} />
          ),
        )}
        {runs.map((r) => (
          <React.Fragment key={r.name}>
            <VMark x={r.x} top={gapTop - h(26)} bottom={gapTop + bandH + h(14)} at={r.at} solid width={3} />
            <Note at={r.at + 2} x={r.x + 12} y={gapTop - h(40)}>
              <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>{r.name}</span>
            </Note>
          </React.Fragment>
        ))}
        {/* What each run wrote to the snapshot, under its tick. */}
        {runs.slice(0, 2).map((r, i) => (
          <Box key={r.name} x={r.x - 120} y={recTop} w={240} h={recH} at={r.at + 10} size={22}>
            Recorded: {states[i === 0 ? 0 : 2].name}
          </Box>
        ))}
        {/* The row deleted at the source: run 3 finds nothing, and by
            default leaves North open; with hard_deletes: invalidate it
            closes it. */}
        <VMark x={deletedX + 4} top={gapTop - h(10)} bottom={gapTop + bandH + h(10)} at={deletedAt + 4} color={ACCENT} />
        <Note at={deletedAt + 8} x={deletedX + 20} y={gapTop + bandH / 2 - 16}>
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>Deleted</span>
        </Note>
        <Box x={runs[2].x - 120} y={recTop} w={240} h={recH} at={ignoredAt + 10} size={22} tone="off" dashed out={invalidateAt + 2}>
          North stays open
        </Box>
        <Box x={runs[2].x - 120} y={recTop} w={240} h={recH} at={closesLastAt - 2} size={22} tone="ok">
          North closed
        </Box>
        <Note at={invalidateAt} x={runs[2].x + 120} y={recTop + recH + h(16)} align="right" from="right">
          <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 500, color: INK, whiteSpace: "nowrap" }}>hard_deletes: invalidate</span>
        </Note>
        <Note at={neverAt + 4} x={states[1].x0 + 16} y={gapTop + bandH + h(50)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>Never recorded</span>
        </Note>

        {/* ── Phase 3: the source, the snapshot, the model ── */}
        <Box x={B[0].x} y={flowTop} w={B[0].w} h={boxH} at={presentAt} align="left">
          <Top pad={topPad}>
            <span style={{ ...label(22, INK_SOFT) }}>Source: customers</span>
            <span style={{ ...note(23, INK) }}>No row for 42 now</span>
          </Top>
        </Box>
        <Note at={presentAt + 6} x={B[0].x} y={flowTop + boxH + h(22)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>Only the present</span>
        </Note>
        <Arrow points={[[B[0].x + B[0].w + 12, mid], [B[1].x - 12, mid]]} at={onlyAt - 4} />
        <Box x={B[1].x} y={flowTop} w={B[1].w} h={boxH} at={onlyAt} align="left">
          <Top pad={topPad}>
            <span style={{ ...label(22, INK_SOFT) }}>Snapshot: snap_customers</span>
            <span style={{ fontFamily: MONO, fontSize: 23 }}>42 · East · closed by North</span>
            <span style={{ fontFamily: MONO, fontSize: 23 }}>42 · North · closed at run 3</span>
          </Top>
        </Box>
        <Note at={onlyAt + 6} x={B[1].x} y={flowTop + boxH + h(22)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>The only copy of this history</span>
        </Note>
        <Note at={rebuildAt} x={B[1].x} y={flowTop + boxH + h(66)}>
          <span style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap" }}>Can&rsquo;t be rebuilt from the source</span>
        </Note>
        <Note at={protectAt} x={B[1].x} y={flowTop + boxH + h(110)}>
          <span style={{ ...note(23, OK_INK), whiteSpace: "nowrap" }}>Protect it like source data</span>
        </Note>
        <Arrow points={[[B[1].x + B[1].w + 12, mid], [B[2].x - 12, mid]]} at={readsAt} />
        <Box x={B[2].x} y={flowTop} w={B[2].w} h={boxH} at={readsAt + 6} align="left">
          <Top pad={topPad}>
            <span style={{ ...label(22, INK_SOFT) }}>Model: dim_customer</span>
            <span style={{ fontFamily: MONO, fontSize: 23, opacity: ease(frame, becomeAt, 10) }}>dbt_valid_from → valid_from</span>
            <span style={{ fontFamily: MONO, fontSize: 23, opacity: ease(frame, becomeAt + 6, 10) }}>dbt_valid_to → valid_to</span>
            {/* The current version's null, closed off as Question 2 argued,
                so one BETWEEN still covers every version (review 2026-11-20). */}
            <span style={{ fontFamily: MONO, fontSize: 23, opacity: ease(frame, becomeAt + 12, 10) }}>null → 9999-12-31</span>
          </Top>
        </Box>
        <Note at={becomeAt + 10} x={B[2].x} y={flowTop + boxH + h(22)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>Each version&rsquo;s window</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
