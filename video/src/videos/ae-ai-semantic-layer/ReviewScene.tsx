import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { READINGS, REVIEW } from "./data";
import { artBox, Chip, Clear, Cross, Drift, Listing, listingHeight, listingWidth, Mark, OK_INK, spanAt, Spot, X0 } from "./parts";

const SIZE = 20;
const R_X = 1190;

/** What the reviewed model adds to a line of the one the assistant wrote:
 *  the text after the longest common start, as long as the lines differ. */
const insertion = (from: string, to: string) => {
  let k = 0;
  while (k < from.length && from[k] === to[k]) k++;
  const text = to.slice(k, k + to.length - from.length);
  if (from.slice(0, k) + text + from.slice(k) !== to) throw new Error(`${JSON.stringify(to)} is not ${JSON.stringify(from)} with one insertion`);
  return { after: from.slice(0, k), text };
};

/** "Nov 3" from "2026-11-03". */
const day = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${d}`;
};
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** A run of order chips: one per row a table holds, the repeats in red. */
const Chips: React.FC<{ ids: readonly number[]; red: (i: number) => boolean; at: number; left: number; top: number }> = ({ ids, red, at, left, top }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left, top, display: "flex", gap: 6 }}>
      {ids.map((id, i) => {
        const p = ease(frame, at + i * 2, 8);
        const bad = red(i);
        return (
          <div
            key={i}
            style={{
              width: 34,
              height: 34,
              boxSizing: "border-box",
              borderRadius: 6,
              border: `2px solid ${bad ? ACCENT : BAR}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...label(20, bad ? ACCENT_INK : INK),
              ...TABULAR,
              opacity: p,
              transform: `translateY(${(1 - p) * -10}px)`,
            }}
          >
            {id}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Question 5. The checklist for a junior colleague, run over a model an
 * assistant wrote: no unique test, a hard-coded schema (source() instead),
 * an incremental filter with no lookback and no unique_key (both added).
 * Then why the two only work as a pair, on seven orders: the strict filter
 * misses the late one; the lookback catches it but re-reads three, appended
 * to 10 rows; merged on the key, 7. Last, the second revenue it is good at
 * writing, and the test that would fail without the change.
 */
export const ReviewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("review").from;
  const qAt = n.word("review", "Question five");
  const textAt = n.word("review", "How do you review");
  const checklistAt = n.word("review", "the checklist");
  const wrongAt = n.word("review", "tend to get wrong");
  const grainAt = n.word("review-grain", "Grain");
  const uniqueAt = n.word("review-grain", "a unique test proving it");
  const refsAt = n.word("review-refs", "References");
  const hardAt = n.word("review-refs", "a hard-coded schema name");
  const lineageAt = n.word("review-refs", "hides the lineage");
  const incrAt = n.word("review-incr", "Incremental logic");
  const lookbackAt = n.word("review-incr", "a lookback window");
  const keyAt = n.word("review-incr", "a unique key");
  const pairFrom = n.beat("review-pair").from;
  const pairAt = n.word("review-pair", "only work as a pair");
  const hereAt = n.word("review-pair", "Here,");
  const lateAt = n.word("review-pair", "one order arrives late");
  const twoDaysAt = n.word("review-pair", "two days before the newest row loaded");
  const strictAt = n.word("review-strict", "A filter for dates after");
  const missesAt = n.word("review-strict", "misses it");
  const lookAt = n.word("review-look", "A three-day lookback catches it");
  const catchesAt = n.word("review-look", "catches it");
  const rereadAt = n.word("review-look", "reads three orders it already loaded");
  const appendsAt = n.word("review-look", "appends them a second time");
  const tenAt = n.word("review-look", "ten rows for seven orders");
  const withKeyAt = n.word("review-look", "With the key, seven");
  const dupFrom = n.beat("review-dup").from;
  const dupAt = n.word("review-dup", "Duplication");
  const nameAt = n.word("review-dup", "under another name");
  const secondAt = n.word("review-dup", "a second, slightly different revenue");
  const ninetyAt = n.word("review-dup", "eleven hundred ninety");
  const governedAt = n.word("review-dup", "the governed four hundred forty");
  const testsAt = n.word("review-tests", "tests and docs");
  const failAt = n.word("review-tests", "a test that would fail without the change");
  const end = n.beat("review-tests").to;

  // The model, and the edits the review makes to it.
  const lines = REVIEW.asWritten;
  const top = y(296);
  const width = listingWidth(REVIEW.reviewed, SIZE);
  const configAt = lineOf2(lines, "config(");
  const whereAt = lineOf2(lines, "where ");
  const fromLine = lineOf2(lines, "from ");
  const selectLine = lineOf2(lines, "select order_id");
  const configIns = insertion(lines[configAt], REVIEW.reviewed[lineOf2(REVIEW.reviewed, "config(")]);
  const whereIns = insertion(lines[whereAt], REVIEW.reviewed[lineOf2(REVIEW.reviewed, "where ")]);
  const sourceCall = REVIEW.reviewed[lineOf2(REVIEW.reviewed, "from ")].replace(/^from /, "");
  const hard = lines[fromLine].replace(/^from /, "");
  const hardSpan = spanAt(lines, lines[fromLine], hard, X0, top, SIZE);
  const magnifier = artBox("ae-ai-semantic-layer-magnifier", 190);

  // The checklist, beside it.
  const ITEMS = [
    { t: "Grain", why: "no unique test", at: grainAt, markAt: uniqueAt },
    { t: "References", why: "a hard-coded schema", at: refsAt, markAt: hardAt },
    { t: "Incremental logic", why: "no lookback, no key", at: incrAt, markAt: incrAt + 10 },
    { t: "Duplication", why: "does it exist already?", at: dupAt, markAt: undefined },
    { t: "Tests and docs", why: "", at: testsAt, markAt: undefined },
  ];
  const itemTop = top + h(46);
  const itemPitch = h(48);

  // Seven orders on a strip of days.
  const days = Array.from({ length: 6 }, (_, i) => addDays(REVIEW.orders[0].date, i));
  const dayX = (iso: string) => X0 + 80 + days.indexOf(iso) * 160;
  const axisY = y(830);
  const dotR = 17;
  const dotRow = (k: number) => axisY - h(40) - k * h(46);
  const firstIds = REVIEW.orders.slice(0, REVIEW.firstBuilt).map((o) => o.id);
  const stack = (id: number) => REVIEW.orders.filter((o) => o.id < id && o.date === REVIEW.orders.find((x) => x.id === id)!.date).length;
  const lookbackFrom = addDays(REVIEW.newestLoaded, -REVIEW.lookbackDays);
  const boundary = (iso: string) => dayX(iso) + 80;
  const winTop = y(716);
  const winBottom = axisY - 4;
  const newIdAt = (id: number) => (id === REVIEW.lateId ? lateAt : hereAt);
  const appendIds = [...firstIds, ...REVIEW.append.selected];
  const mergedIds = REVIEW.orders.map((o) => o.id).sort((a, b) => a - b);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={checklistAt} level={-30} />
      {ITEMS.map((it) => (it.markAt !== undefined ? <Sfx key={it.t} name="el-pencil" at={it.markAt} level={-35} /> : null))}
      <Sfx name="el-pencil" at={hardAt + 6} level={-35} />
      <Sfx name="el-tap" at={lineageAt + 6} level={-32} />
      <Sfx name="el-tap" at={lookbackAt + 4} level={-32} />
      <Sfx name="el-tap" at={keyAt + 4} level={-32} />
      <Sfx name="el-sprinkle" at={pairAt + 6} level={-34} />
      <Sfx name="el-tap" at={hereAt + 6} level={-32} />
      <Sfx name="el-tap" at={lateAt + 6} level={-31} />
      <Sfx name="el-whoosh" at={strictAt} level={-37} />
      <Sfx name="el-whoosh" at={lookAt} level={-37} />
      <Sfx name="el-sprinkle" at={appendsAt} level={-34} />
      <Sfx name="el-chime" at={withKeyAt + 6} level={-33} />
      <Sfx name="el-tap" at={secondAt} level={-31} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you review a dbt model an assistant wrote?
        </QuestionCard>

        {/* The model as the assistant wrote it, and the review's edits. */}
        <Ink at={checklistAt - 6} dur={12} style={{ left: X0, top: top - h(42) }}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
            The model an assistant wrote<span style={{ color: OK_INK, opacity: ease(frame, lookbackAt, 10) }}> · reviewed</span>
          </span>
        </Ink>
        {/* The grain: one row per order_id, and nothing proving it. */}
        <Clear at={pairFrom}>
          <Ink at={uniqueAt} dur={12} style={{ left: X0, top: top + listingHeight(lines.length, SIZE) + h(24) }}>
            <span style={{ ...line24, color: ACCENT_INK }}>
              No unique test on <span style={CODE}>order_id</span>
            </span>
          </Ink>
        </Clear>
        <Listing
          lines={lines}
          x={X0}
          top={top}
          width={width}
          size={SIZE}
          lang="dbt"
          at={checklistAt - 4}
          step={2}
          marks={[
            { line: lines[selectLine], text: "order_id", at: grainAt + 6, out: refsAt },
            { line: lines[fromLine], text: hard, at: hardAt + 6, kind: "under" },
            { line: lines[whereAt], at: incrAt, out: lookbackAt },
          ]}
          inserts={[
            { line: lines[whereAt], after: whereIns.after, text: whereIns.text, at: lookbackAt + 4 },
            { line: lines[configAt], after: configIns.after, text: configIns.text, at: keyAt + 4 },
          ]}
        />
        <Ink at={lineageAt + 6} dur={14} style={{ left: hardSpan.x1 + 24, top: hardSpan.mid - SIZE * 0.9, display: "flex", alignItems: "center", gap: 12, height: SIZE * 1.8 }}>
          <span style={{ fontFamily: MONO, fontSize: SIZE, color: INK_SOFT }}>→</span>
          <span style={{ fontFamily: MONO, fontSize: SIZE, color: OK_INK, whiteSpace: "pre", fontVariantLigatures: "none", fontWeight: 500 }}>{sourceCall}</span>
        </Ink>
        <Clear at={pairFrom}>
          <Spot id="ae-ai-semantic-layer-magnifier" at={checklistAt} left={560} top={y(650)} {...magnifier} />
        </Clear>

        {/* The checklist, ticked off as it is read. */}
        <Ink at={checklistAt} dur={12} style={{ left: R_X, top: top - h(42) }}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
            The checklist <span style={{ opacity: ease(frame, wrongAt, 10) }}>· what assistants get wrong</span>
          </span>
        </Ink>
        {ITEMS.map((it, i) => (
          <React.Fragment key={it.t}>
            <div style={{ position: "absolute", left: R_X, top: itemTop + i * itemPitch + 6 }}>
              {it.markAt !== undefined && frame >= it.markAt ? <Cross at={it.markAt} size={24} /> : null}
            </div>
            <Ink at={it.at} dur={12} style={{ left: R_X + 40, top: itemTop + i * itemPitch }}>
              <span style={{ ...line24, fontWeight: 500, color: INK }}>
                {it.t}
                {it.why ? <span style={{ fontWeight: 400, color: INK_SOFT, opacity: it.markAt === undefined ? 1 : ease(frame, it.markAt, 10) }}> · {it.why}</span> : null}
              </span>
            </Ink>
          </React.Fragment>
        ))}
        <Ink at={failAt} dur={14} style={{ left: R_X + 40, top: itemTop + 5 * itemPitch + h(10) }}>
          <span style={{ ...line24, fontWeight: 500, color: INK }}>
            <Mark at={failAt + 8}>A test that fails without the change</Mark>
          </span>
        </Ink>

        {/* The pair, on seven orders. */}
        <Clear at={dupFrom + 40}>
          <Ink at={pairAt} dur={12} style={{ left: X0, top: y(598) }}>
            <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
              Loaded through <span style={{ color: BAR }}>{day(REVIEW.newestLoaded)}</span>, then two more arrive
            </span>
          </Ink>
          <Window x0={boundary(REVIEW.newestLoaded)} x1={dayX(days[5]) + 70} y0={winTop} y1={winBottom} at={strictAt} out={lookAt}>
            After {day(REVIEW.newestLoaded)}
          </Window>
          <Window x0={boundary(lookbackFrom)} x1={dayX(days[5]) + 70} y0={winTop} y1={winBottom} at={lookAt}>
            After {day(lookbackFrom)}: a {REVIEW.lookbackDays}-day lookback
          </Window>
          <div style={{ position: "absolute", left: X0 + 10, top: axisY, width: ease(frame, pairAt, 16) * (dayX(days[5]) + 70 - X0 - 10), height: 2, background: INK }} />
          {days.map((d) => (
            <Ink key={d} at={pairAt + 2} dur={12} style={{ left: dayX(d) - 40, width: 80, top: axisY + h(10), textAlign: "center" }}>
              <span style={{ ...label(21, d === REVIEW.newestLoaded ? INK : INK_SOFT), whiteSpace: "nowrap" }}>{day(d)}</span>
            </Ink>
          ))}
          {REVIEW.orders.map((o) => {
            const loaded = firstIds.includes(o.id);
            const at = loaded ? pairAt + 4 + o.id * 3 : newIdAt(o.id) + 4;
            const p = pop(frame, at, fps, 14);
            if (frame < at) return null;
            const cx = dayX(o.date);
            const cy = dotRow(stack(o.id));
            const missed = REVIEW.strict.missing.includes(o.id) && frame >= missesAt && frame < catchesAt + 6;
            const reread = REVIEW.append.repeats.includes(o.id) && frame >= rereadAt;
            const late = o.id === REVIEW.lateId;
            const ring = missed ? ACCENT : reread ? ds("yellow", 600) : late && frame >= twoDaysAt ? INK : null;
            return (
              <React.Fragment key={o.id}>
                {ring ? <div style={{ position: "absolute", left: cx - dotR - 7, top: cy - dotR - 7, width: 2 * dotR + 14, height: 2 * dotR + 14, borderRadius: "50%", border: `2.5px solid ${ring}`, boxSizing: "border-box" }} /> : null}
                <div
                  style={{
                    position: "absolute",
                    left: cx - dotR,
                    top: cy - dotR - (1 - Math.min(1, p)) * 50,
                    width: 2 * dotR,
                    height: 2 * dotR,
                    borderRadius: "50%",
                    background: loaded ? BAR : PAPER,
                    border: `2.5px solid ${BAR}`,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...label(19, loaded ? PAPER : INK),
                    ...TABULAR,
                    opacity: Math.min(1, p),
                  }}
                >
                  {o.id}
                </div>
              </React.Fragment>
            );
          })}
          <Ink at={missesAt} dur={12} style={{ left: dayX(REVIEW.lateDate) + 32, top: dotRow(1) - 16 }}>
            <span style={{ ...label(21, ACCENT_INK), whiteSpace: "nowrap", opacity: 1 - ease(frame, catchesAt, 10) }}>missed</span>
          </Ink>
          <Ink at={catchesAt + 6} dur={12} style={{ left: dayX(REVIEW.lateDate) + 32, top: dotRow(1) - 16 }}>
            <span style={{ ...label(21, OK_INK), whiteSpace: "nowrap" }}>caught</span>
          </Ink>
          <Ink at={twoDaysAt} dur={12} style={{ left: X0, top: y(598) + h(38) }}>
            <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
              Order {REVIEW.lateId} is dated {day(REVIEW.lateDate)}, {REVIEW.daysLate} days before {day(REVIEW.newestLoaded)}
            </span>
          </Ink>

          {/* What each load leaves in the table. */}
          <Ink at={appendsAt} dur={12} style={{ left: R_X, top: y(640) }}>
            <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Appended, no unique key</span>
          </Ink>
          <Chips ids={appendIds} red={(i) => i >= firstIds.length && REVIEW.append.repeats.includes(appendIds[i])} at={appendsAt + 4} left={R_X} top={y(640) + h(40)} />
          <Ink at={tenAt} dur={12} style={{ left: R_X, top: y(640) + h(86) }}>
            <span style={{ ...note(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
              {REVIEW.append.rows} rows, {REVIEW.append.orders} orders
            </span>
          </Ink>
          <Ink at={withKeyAt} dur={12} style={{ left: R_X, top: y(774) }}>
            <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
              Merged on <span style={CODE}>order_id</span>
            </span>
          </Ink>
          <Chips ids={mergedIds} red={() => false} at={withKeyAt + 4} left={R_X} top={y(774) + h(40)} />
          <Ink at={withKeyAt + 10} dur={12} style={{ left: R_X + mergedIds.length * 40 + 16, top: y(774) + h(40) + 2 }}>
            <span style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>{REVIEW.merge.rows} rows</span>
          </Ink>
        </Clear>

        {/* The second revenue: an example, not a defect of the model above. */}
        <Ink at={nameAt} dur={12} style={{ left: X0, top: y(700) - h(46) }}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>For example</span>
        </Ink>
        <div style={{ position: "absolute", left: X0, top: y(700), display: "flex", alignItems: "center", gap: 28, fontSize: 26, opacity: ease(frame, nameAt, 12) }}>
          <MetricChip name="net_revenue" value={READINGS.governed.toFixed(2)} tone="green" note="governed" show={ease(frame, nameAt, 12)} noteShow={ease(frame, governedAt, 10)} />
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, secondAt, 10) }}>already exists</span>
          <MetricChip name="revenue" value={READINGS.completed.toFixed(2)} tone="red" note="the assistant's" show={ease(frame, ninetyAt, 12)} noteShow={ease(frame, ninetyAt + 8, 10)} />
        </div>
      </Drift>
    </AbsoluteFill>
  );
};

const line24: React.CSSProperties = { ...note(24, INK), whiteSpace: "nowrap" };
/** Code in a note: the mono face at 0.92em, as the listing above sets it. */
const CODE: React.CSSProperties = { fontFamily: MONO, fontSize: "0.92em", fontVariantLigatures: "none" };

/** The index of the first line that holds `text` (lineOf for lines that are
 *  not marks: the model's config, filter and from lines). */
const lineOf2 = (lines: readonly string[], text: string) => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no line holds ${JSON.stringify(text)}`);
  return i;
};

/** A date window on the strip: a wash from x0 to x1 with its rule as its
 *  label says, drawn left to right. */
const Window: React.FC<{ x0: number; x1: number; y0: number; y1: number; at: number; out?: number; children: React.ReactNode }> = ({ x0, x1, y0, y1, at, out, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (p <= 0 || o >= 1) return null;
  return (
    <>
      <div style={{ position: "absolute", left: x0, top: y0, width: (x1 - x0) * p, height: y1 - y0, background: HIGHLIGHT, borderLeft: `2px solid ${ds("yellow", 600)}`, opacity: 1 - o }} />
      <div style={{ position: "absolute", left: x0 + 2, top: y0 - 34, opacity: ease(frame, at + 8, 10) * (1 - o), ...label(21, INK), whiteSpace: "nowrap" }}>
        {children}
      </div>
    </>
  );
};

/** A metric as a chip: its name in the mono face and its value, on the
 *  badge's tint, with a note under it. */
const MetricChip: React.FC<{ name: string; value: string; tone: "green" | "red"; note: string; show: number; noteShow: number }> = ({ name, value, tone, note: sub, show, noteShow }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14, opacity: show }}>
    <Chip tone={tone} size={26}>
      <span style={{ fontFamily: MONO, fontSize: 25 }}>{name}</span> {value}
    </Chip>
    <span style={{ ...note(21, tone === "green" ? OK_INK : ACCENT_INK), whiteSpace: "nowrap", opacity: noteShow }}>{sub}</span>
  </div>
);

