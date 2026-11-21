import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { I, M, MathRun } from "../../editorial/math";
import { label, note } from "../../editorial/style";
import { NextLine, Num, OutlineBadge } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RAPID } from "./data";
import { ACCENT_INK, ART, artBox, BAR, Bars, BLUE_INK, Cell, Drift, Fade, Headline, INK, INK_SOFT, int, Kicker, Line, Mark, Mono, OK, OK_INK, Spot, Strike, X0 } from "./parts";

const R_X = 790;
const LIST_TOP = 360;
const ROW = 66;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 11. Hash maps ───────────────────────────────────────────────────────────

const Hash: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const uses = [
    { t: "counting", at: c.w("r-hash", "for counting") },
    { t: "grouping", at: c.w("r-hash", "grouping") },
    { t: "have I seen this?", at: c.w("r-hash", "have-I-seen-this") },
  ];
  const constAt = c.w("r-hash", "in constant time on average");
  const labelsAt = c.w("r-hash", "Counting labels gives the majority class");
  const baselineAt = c.w("r-hash", "the baseline any model has to beat");
  const catAt = c.w("r-hash", "here, cat, half the time");
  const total = RAPID.counts.reduce((s, [, v]) => s + v, 0);
  return (
    <>
      <div style={{ position: "absolute", left: R_X, top: c.y(340), display: "flex", gap: 16, fontSize: 24 }}>
        {uses.map((u) => (
          <span key={u.t} style={{ opacity: ease(frame, u.at - 2, 10) }}>
            <OutlineBadge tone="blue" size={24} style={{ fontFamily: SANS }}>
              {u.t}
            </OutlineBadge>
          </span>
        ))}
      </div>
      <Line at={constAt} x={R_X} y={c.y(340) + c.h(64)} size={24} color={INK_SOFT}>
        <M>O(1)</M> per lookup, on average
      </Line>
      <Line at={labelsAt} x={R_X} y={c.y(500)} size={24}>
        The page&apos;s <Num>{total}</Num> labels, counted
      </Line>
      <Bars
        x={R_X}
        top={c.y(548)}
        width={300}
        rowH={c.h(52)}
        nameW={110}
        max={total / 2}
        bars={RAPID.counts.map(([name, v], i) => ({
          name,
          value: v,
          color: i === 0 && frame >= catAt ? OK : BAR,
          at: labelsAt + 6 + i * 5,
          dur: 14,
          end: <span style={{ ...note(23, INK), fontWeight: 600 }}>{v}</span>,
        }))}
      />
      <Line at={baselineAt} x={R_X + 560} y={c.y(560)} size={24}>
        The baseline to beat:
      </Line>
      <Line at={catAt} x={R_X + 560} y={c.y(560) + c.h(44)} size={24} color={OK_INK} weight={600}>
        always {RAPID.majority}, {Math.round(RAPID.majorityShare * 100)}%
      </Line>
    </>
  );
};

// ── 12. Dedup, keeping order ────────────────────────────────────────────────

const Dedup: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const dedupAt = c.w("r-dedup", "To deduplicate a list and keep its order");
  const setAt = c.w("r-dedup", "check a set");
  const dictAt = c.w("r-dedup", "or use dict from keys");
  const linearAt = c.w("r-dedup", "Both are linear");
  const sortAt = c.w("r-dedup", "Sorting first is n log n");
  const losesAt = c.w("r-dedup", "and it loses the order");
  const items = RAPID.dedupIn;
  const scanStep = 9;
  const scan = (i: number) => setAt + 4 + i * scanStep;
  const seenBefore = (i: number) => items.slice(0, i).includes(items[i]);
  const cw = 76;
  const pitch = 92;
  return (
    <>
      <Line at={dedupAt} x={R_X} y={c.y(336)} size={23} color={INK_SOFT}>
        in
      </Line>
      {items.map((v, i) => {
        const dup = seenBefore(i);
        const lit = frame >= scan(i) && frame < scan(i) + scanStep;
        return (
          <React.Fragment key={i}>
            <Cell x={R_X + 70 + i * pitch} y={c.y(326)} w={cw} h={c.h(52)} size={26} radius={5} mono tone={dup && frame >= scan(i) ? "soft" : "ink"} band={lit ? 0.9 : 0} opacity={ease(frame, dedupAt + i * 2, 10) * (dup && frame >= scan(i) ? 0.7 : 1)}>
              {dup && frame >= scan(i) ? <Strike at={scan(i) + 2}>{v}</Strike> : v}
            </Cell>
          </React.Fragment>
        );
      })}
      <Line at={setAt} x={R_X} y={c.y(436)} size={23} color={INK_SOFT}>
        out
      </Line>
      {RAPID.dedup.map((v, i) => {
        const at = scan(items.indexOf(v)) + 4;
        return (
          <Cell key={v} x={R_X + 70 + i * pitch} y={c.y(426)} w={cw} h={c.h(52)} size={26} radius={5} mono tone="ok" opacity={ease(frame, at, 8)}>
            {v}
          </Cell>
        );
      })}
      <Line at={setAt} x={R_X} y={c.y(540)} size={24}>
        Check a set, append to a list
        <Fade at={dictAt}>
          , or <Mono>dict.fromkeys</Mono> in one line
        </Fade>
      </Line>
      <Line at={linearAt} x={R_X} y={c.y(540) + c.h(48)} size={24} color={OK_INK} weight={600}>
        Both <M>O(n)</M>
      </Line>
      <Line at={sortAt} x={R_X} y={c.y(540) + c.h(96)} size={24} color={ACCENT_INK}>
        Sorting first: <M>O(n log n)</M>
        <Fade at={losesAt}>, and the order is lost</Fade>
      </Line>
    </>
  );
};

// ── 13. Decoding a probability matrix ───────────────────────────────────────

const Argmax: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const decodeAt = c.w("r-argmax", "To decode classes from a probability matrix");
  const nkAt = c.w("r-argmax", "n rows by k classes");
  const axis1At = c.w("r-argmax", "take argmax along axis one");
  const perRowAt = c.w("r-argmax", "one class per row");
  const axis0At = c.w("r-argmax", "Along axis zero");
  const kAnsAt = c.w("r-argmax", "you get k answers instead");
  const checkAt = c.w("r-argmax", "so check the shape");
  const P = RAPID.probs;
  const cw = 96;
  const pitch = 106;
  const top = c.y(372);
  const rh = c.h(52);
  const rp = c.h(60);
  const mx = R_X + 90;
  const rowsOn = ease(frame, axis1At + 4, 8);
  const colsOn = ease(frame, axis0At + 4, 8);
  return (
    <>
      <Line at={nkAt} x={mx} y={top - c.h(44)} size={21} color={INK_SOFT}>
        class 0, 1, 2 across; one row per example
      </Line>
      {P.map((row, r) =>
        row.map((v, k) => {
          const rowMax = RAPID.argmax1[r] === k;
          const colMax = RAPID.argmax0[k] === r;
          const tone = colsOn > 0.5 && colMax ? "bad" : rowsOn > 0.5 && rowMax ? "ok" : "ink";
          return (
            <Cell key={`${r}${k}`} x={mx + k * pitch} y={top + r * rp} w={cw} h={rh} size={24} radius={5} tone={tone} opacity={ease(frame, decodeAt + r * 2, 10)}>
              {v.toFixed(1)}
            </Cell>
          );
        }),
      )}
      {/* axis 1: one class per row, read off to the right */}
      {RAPID.argmax1.map((k, r) => (
        <div key={r} style={{ position: "absolute", left: mx + 3 * pitch + 24, top: top + r * rp + rh / 2 - 16, ...note(24, OK_INK), fontWeight: 600, opacity: ease(frame, perRowAt + r * 2, 8) * (1 - 0.5 * colsOn) }}>
          → {k}
        </div>
      ))}
      {/* axis 0: one answer per class, under the columns */}
      {RAPID.argmax0.map((r, k) => (
        <div key={k} style={{ position: "absolute", left: mx + k * pitch, width: cw, textAlign: "center", top: top + 4 * rp + c.h(4), ...note(24, ACCENT_INK), fontWeight: 600, opacity: ease(frame, kAnsAt + k * 2, 8) }}>
          ↓ {r}
        </div>
      ))}
      <div style={{ position: "absolute", left: mx + 3 * pitch + 120, top: top + c.h(20), display: "flex", flexDirection: "column", gap: c.h(16), fontSize: 24 }}>
        <span style={{ ...note(24, OK_INK), fontWeight: 600, whiteSpace: "nowrap", opacity: ease(frame, axis1At, 10) }}>
          <Mono>axis=1</Mono>: shape <Mono>({RAPID.shapes.axis1.join(",")},)</Mono>
        </span>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, perRowAt, 10) }}>one class per row</span>
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap", opacity: ease(frame, axis0At, 10), marginTop: c.h(20) }}>
          <Mono>axis=0</Mono>: shape <Mono>({RAPID.shapes.axis0.join(",")},)</Mono>
        </span>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, kAnsAt, 10) }}>one answer per class</span>
      </div>
      <Line at={checkAt} x={mx} y={top + 4 * rp + c.h(62)} size={25} weight={600}>
        <Mark at={checkAt + 4}>Check the shape</Mark>
      </Line>
    </>
  );
};

// ── 14. Metrics from scratch ────────────────────────────────────────────────

/** A picture of six labels and two models' predictions: the second predicts
 *  no positives. Only "nan" and "0" (RAPID) are measured. */
const TRUE = [1, 0, 1, 0, 0, 1];
const PRED = [1, 0, 0, 0, 1, 1];

const Metrics: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const metricsAt = c.w("r-metrics", "Accuracy, precision and recall from scratch");
  const masksAt = c.w("r-metrics", "are boolean masks, summed");
  const noLoopAt = c.w("r-metrics", "with no loop");
  const emptyAt = c.w("r-metrics", "Handle the empty case");
  const noPosAt = c.w("r-metrics", "a model that predicts no positives");
  const zeroAt = c.w("r-metrics", "zero over zero");
  const numpyAt = c.w("r-metrics", "NumPy returns not a number");
  const sklearnAt = c.w("r-metrics", "scikit-learn reports zero");
  const allZero = ease(frame, noPosAt + 2, 12);
  const cx = R_X + 150;
  const cw = 62;
  const pitch = 74;
  const top = c.y(352);
  const rp = c.h(62);
  return (
    <>
      {["true", "predicted"].map((name, r) => (
        <div key={name} style={{ position: "absolute", left: R_X, top: top + r * rp + 10, ...label(22, INK_SOFT), opacity: ease(frame, metricsAt, 10) }}>
          {name}
        </div>
      ))}
      {TRUE.map((t, i) => {
        const p = allZero > 0.5 ? 0 : PRED[i];
        const tp = t === 1 && p === 1;
        const band = ease(frame, masksAt + 4, 10) * (tp ? 0.9 : 0);
        return (
          <React.Fragment key={i}>
            <Cell x={cx + i * pitch} y={top} w={cw} h={c.h(48)} size={24} radius={5} mono band={band} opacity={ease(frame, metricsAt + i, 10)}>
              {t}
            </Cell>
            <Cell x={cx + i * pitch} y={top + rp} w={cw} h={c.h(48)} size={24} radius={5} mono band={band} tone={allZero > 0.5 ? "bad" : "ink"} opacity={ease(frame, metricsAt + 3 + i, 10)}>
              {p}
            </Cell>
          </React.Fragment>
        );
      })}
      <Line at={masksAt + 4} x={cx + 6 * pitch + 24} y={top + rp / 2 + 8} size={23} color={INK_SOFT} out={noPosAt}>
        true positives: both 1
      </Line>
      <div style={{ position: "absolute", left: R_X, top: c.y(512), display: "flex", flexDirection: "column", gap: c.h(14), fontSize: 24, opacity: ease(frame, masksAt + 8, 10) * (1 - 0.5 * ease(frame, emptyAt, 12)) }}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          precision <M>TP / (TP + FP)</M>, recall <M>TP / (TP + FN)</M>
        </span>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, noLoopAt, 10) }}>each count a mask, summed: no loop</span>
      </div>
      <Line at={noPosAt + 8} x={R_X} y={c.y(640)} size={24}>
        Predicts no positives: precision <M>0 / 0</M>
        <Fade at={zeroAt}> </Fade>
      </Line>
      <div style={{ position: "absolute", left: R_X, top: c.y(640) + c.h(54), display: "flex", gap: 48, fontSize: 24, whiteSpace: "nowrap" }}>
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 600, opacity: ease(frame, numpyAt, 10) }}>NumPy: {RAPID.precisionNumpy}</span>
        <span style={{ ...note(24, INK), fontWeight: 600, opacity: ease(frame, sklearnAt, 10) }}>scikit-learn: {RAPID.precisionSklearn}, with a warning</span>
      </div>
    </>
  );
};

// ── 15. k-NN, naively and with a heap ───────────────────────────────────────

const Knn: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const knnAt = c.w("r-knn", "And k-nearest neighbors");
  const distAt = c.w("r-knn", "The n distances cost n times d");
  const fullAt = c.w("r-knn", "Then a full sort costs n log n");
  const heapAt = c.w("r-knn", "or a heap of size k");
  const eitherAt = c.w("r-knn", "Either way, computing the distances costs more");
  const indexAt = c.w("r-knn", "so repeated queries need an index");
  const idx = [
    { t: "KD-tree", at: c.w("r-knn", "a KD-tree") },
    { t: "ball tree", at: c.w("r-knn", "a ball tree") },
    { t: "HNSW", at: c.w("r-knn", "an approximate one like HNSW") },
  ];
  const K = RAPID.knn;
  return (
    <>
      <Line at={knnAt} x={R_X} y={c.y(332)} size={23} color={INK_SOFT}>
        One query against <Num>{int(K.n)}</Num> rows of <Num>{K.d}</Num>, timed once
      </Line>
      <Bars
        x={R_X}
        top={c.y(372)}
        width={560}
        rowH={c.h(58)}
        nameW={220}
        max={K.ms.distances}
        bars={[
          {
            name: (
              <>
                the <MathRun><I>n</I></MathRun> distances
              </>
            ),
            value: K.ms.distances,
            color: BAR,
            at: distAt,
            end: (
              <MathRun>
                <I>O</I>(<I>n</I>
                <I>d</I>)
              </MathRun>
            ),
          },
          { name: "a full sort", value: K.ms.sort, color: BAR, at: fullAt, end: <M>O(n log n)</M> },
          { name: "argpartition", value: K.ms.partition, color: BAR, at: heapAt - 4, end: <M>O(n)</M> },
        ]}
        size={23}
      />
      <Line at={heapAt} x={R_X + 220} y={c.y(372) + 3 * c.h(58) + c.h(12)} size={23} color={INK_SOFT}>
        or a heap of size <M>k</M>: <M>O(n log k)</M>
      </Line>
      <Line at={eitherAt} x={R_X} y={c.y(636)} size={24} weight={600}>
        <Mark at={eitherAt + 4}>The distances cost more than choosing among them</Mark>
      </Line>
      <Line at={indexAt} x={R_X} y={c.y(636) + c.h(56)} size={24}>
        Repeated queries need an index:
      </Line>
      <div style={{ position: "absolute", left: R_X, top: c.y(636) + c.h(106), display: "flex", gap: 16, fontSize: 24 }}>
        {idx.map((it) => (
          <span key={it.t} style={{ opacity: ease(frame, it.at, 10) }}>
            <OutlineBadge tone="ink" size={24} style={{ fontFamily: SANS }}>
              {it.t}
            </OutlineBadge>
          </span>
        ))}
      </div>
    </>
  );
};

/**
 * The quick round: five questions down the left, each answer on the right
 * while it is read, every one from a run (RAPID). Then the bridge: the tree
 * frog comes back, and the next part's line.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const quickAt = n.word("rapid-in", "Five quick ones");
  const codeAt = n.word("next", "Code gives you a number");
  const statsAt = n.word("next", "Statistics says how far to trust it");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").from - 4;
  const frog = artBox(ART.frog, 440);

  const items: RapidItem[] = [
    { n: 11, label: "Hash maps", at: n.word("r-hash", "Reach for a hash map"), body: <Hash c={c} /> },
    { n: 12, label: "Dedup, keeping order", at: n.word("r-dedup", "To deduplicate a list"), body: <Dedup c={c} /> },
    { n: 13, label: "Decoding a probability matrix", at: n.word("r-argmax", "To decode classes"), body: <Argmax c={c} /> },
    { n: 14, label: "Metrics from scratch", at: n.word("r-metrics", "Accuracy, precision and recall"), body: <Metrics c={c} /> },
    { n: 15, label: "k-NN, naive or with a heap", at: n.word("r-knn", "And k-nearest neighbors"), body: <Knn c={c} /> },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={quickAt} level={-33} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-32} />
      ))}
      <Sfx name="el-pop" at={codeAt} level={-30} />
      <Sfx name="el-pencil" at={nextAt} level={-35} />

      <Drift from={from} to={n.durationInFrames}>
        <Kicker at={quickAt}>Quick round</Kicker>
        <Headline lead="Five quick ones." at={quickAt} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={560} at={quickAt + 6} end={end} />

        {/* ── The bridge ── */}
        <Line at={codeAt} x={R_X} y={y(420)} size={30} weight={500}>
          Code gives you a number.
        </Line>
        <Line at={statsAt} x={R_X} y={y(420) + h(54)} size={30} weight={500} color={BLUE_INK}>
          Statistics says how far to trust it.
        </Line>
        <Spot id={ART.frog.id} at={codeAt} left={1360} top={y(500)} {...frog} />
        <NextLine at={nextAt} x={R_X} y={y(640)} width={440}>
          statistics and probability
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
