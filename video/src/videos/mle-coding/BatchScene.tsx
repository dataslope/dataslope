import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { label } from "../../editorial/style";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BATCHES } from "./data";
import { ACCENT_INK, Cell, Drift, Fade, HIGHLIGHT, INK, INK_SOFT, Line, MARK, OK_INK, X0 } from "./parts";

const ROW_X = 250;
const CW = 84;
const PITCH = 96;
/** The extra space that opens between two batches. */
const SPLIT = 46;

/** Where row `r` sits in a dealt order of batches, as a slot and a batch. */
const placeOf = (batches: readonly (readonly number[])[], r: number) => {
  let slot = 0;
  for (let b = 0; b < batches.length; b++) {
    const k = batches[b].indexOf(r);
    if (k >= 0) return { slot: slot + k, batch: b };
    slot += batches[b].length;
  }
  throw new Error(`row ${r} is in no batch`);
};

/**
 * Question 8. The page's ten rows, features over labels, shuffled once into
 * the page's order (BATCHES.epoch1: 4 6 2 7 | 3 5 9 0 | 8 1) with each label
 * moving under its row, then split into batches of four, four and two; the
 * short last batch gets no color, since it is normal. Then the reseeding
 * generator deals epoch 2 in the same order again, and one generator passed
 * through the run deals a new one (BATCHES.epoch2Shared).
 */
export const BatchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q8").from;
  const qAt = n.word("q8", "Question eight");
  const textAt = n.word("q8", "How do you implement mini-batching");
  const shuffleAt = n.word("q8", "Shuffle the row indices once per epoch");
  const sliceAt = n.word("q8", "slice them in fixed steps");
  const indexAt = n.word("q8", "index features and labels with the same slice");
  const tenAt = n.word("q8", "Ten rows in batches of four");
  const giveAt = n.word("q8", "give four, four and two");
  const shortAt = n.word("q8", "The last batch is short");
  const dontAt = n.word("q8-seed", "But don't reseed on every call");
  const genAt = n.word("q8-seed", "A generator that seeds itself the same way each time");
  const sameAt = n.word("q8-seed", "deals every epoch in the same order");
  const passAt = n.word("q8-seed", "Pass one random generator through the whole run");
  const newAt = n.word("q8-seed", "each epoch gets a new order");
  const end = n.beat("q8-seed").to;

  const E1 = BATCHES.epoch1;
  const E2 = BATCHES.epoch2;
  const E2s = BATCHES.epoch2Shared;
  const rows = E1.flat().length;
  const xTop = y(334);
  const yTop = xTop + h(66);
  const cellH = h(54);
  const labelH = h(42);
  const shuffled = ease(frame, shuffleAt + 6, 24);
  const split = ease(frame, sliceAt + 2, 16);
  const slotX = (slot: number, batch: number, s: number) => ROW_X + slot * PITCH + batch * SPLIT * s;
  const batchW = (b: number) => E1[b].length * PITCH - (PITCH - CW);
  const batchX = (b: number) => slotX(E1.slice(0, b).flat().length, b, 1);
  const sliceBand = ease(frame, indexAt, 12) * (1 - ease(frame, tenAt, 12));

  // Epoch 2: the reseeding generator deals the same order; one shared
  // generator deals a new one.
  const e2Top = y(640);
  const e2On = ease(frame, sameAt - 4, 12);
  const reshuffle = ease(frame, newAt + 2, 22);
  const sameBand = ease(frame, sameAt + 6, 12) * (1 - ease(frame, passAt, 12));

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={shuffleAt - 2} level={-32} />
      <Sfx name="el-whoosh" at={shuffleAt + 6} level={-35} />
      <Sfx name="el-whoosh" at={sliceAt + 2} level={-36} />
      <Sfx name="el-tap" at={giveAt} level={-32} />
      <Sfx name="el-pop" at={sameAt - 2} level={-31} />
      <Sfx name="el-tap" at={sameAt + 8} level={-31} />
      <Sfx name="el-whoosh" at={newAt + 2} level={-35} />
      <Sfx name="el-chime" at={newAt + 30} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you implement mini-batching for training?
        </QuestionCard>

        <Line at={shuffleAt} x={X0} y={y(266)} size={24} color={INK_SOFT}>
          Epoch 1: shuffle the row indices<Fade at={sliceAt}>, slice in fixed steps</Fade>
          <Fade at={indexAt}>, index both with the same slice</Fade>
        </Line>
        <div style={{ position: "absolute", left: X0, top: xTop + cellH / 2 - 16, fontFamily: MONO, fontSize: 26, fontWeight: 600, color: INK, opacity: ease(frame, shuffleAt - 4, 10) }}>X</div>
        <div style={{ position: "absolute", left: X0, top: yTop + labelH / 2 - 16, fontFamily: MONO, fontSize: 26, fontWeight: 600, color: INK_SOFT, opacity: ease(frame, shuffleAt - 4, 10) }}>y</div>

        {/* The same slice of both: a band behind the first batch. */}
        <div
          style={{
            position: "absolute",
            left: batchX(0) - 12,
            top: xTop - 10,
            width: batchW(0) + 24,
            height: yTop + labelH - xTop + 20,
            borderRadius: 8,
            background: HIGHLIGHT,
            opacity: sliceBand,
          }}
        />
        {Array.from({ length: rows }, (_, r) => {
          const p = placeOf(E1, r);
          const x0 = slotX(r, 0, 0);
          const x1 = slotX(p.slot, p.batch, split);
          // Rows travel in an arc so they pass over one another.
          const x = x0 + (x1 - x0) * shuffled;
          const lift = Math.sin(Math.PI * shuffled) * h(26) * (r % 2 ? 1 : -1);
          const shown = ease(frame, shuffleAt - 4 + r, 8);
          return (
            <React.Fragment key={r}>
              <Cell x={x} y={xTop + lift} w={CW} h={cellH} size={26} radius={5} opacity={shown}>
                {r}
              </Cell>
              <Cell x={x} y={yTop + lift} w={CW} h={labelH} size={22} radius={5} tone="soft" opacity={shown} style={{ color: INK_SOFT }}>
                y{r}
              </Cell>
            </React.Fragment>
          );
        })}
        {E1.map((b, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: batchX(i),
              width: batchW(i),
              top: yTop + labelH + h(16),
              textAlign: "center",
              ...label(23, INK),
              opacity: ease(frame, giveAt + i * 6, 10),
              whiteSpace: "nowrap",
            }}
          >
            {b.length} rows
          </div>
        ))}
        <Line at={shortAt} x={batchX(2) + batchW(2) + 40} y={yTop + labelH / 2 - 16} size={23} color={INK_SOFT}>
          The last batch is short, and that&apos;s fine
        </Line>

        {/* ── Epoch 2 ── */}
        <Line at={dontAt} x={X0} y={y(574)} size={24} color={INK_SOFT}>
          Epoch 2
          <Fade at={genAt} out={passAt - 4}>
            , from a generator that seeds itself on every call
          </Fade>
        </Line>
        <div
          style={{
            position: "absolute",
            left: batchX(0) - 12,
            top: e2Top - 10,
            width: batchX(2) + batchW(2) - batchX(0) + 24,
            height: cellH + 20,
            borderRadius: 8,
            background: MARK,
            opacity: sameBand * e2On,
          }}
        />
        {Array.from({ length: rows }, (_, r) => {
          const a = placeOf(E2, r);
          const b = placeOf(E2s, r);
          const xa = slotX(a.slot, a.batch, 1);
          const xb = slotX(b.slot, b.batch, 1);
          const x = xa + (xb - xa) * reshuffle;
          const lift = Math.sin(Math.PI * reshuffle) * h(24) * (r % 2 ? 1 : -1);
          return (
            <Cell key={r} x={x} y={e2Top + lift} w={CW} h={cellH} size={26} radius={5} opacity={e2On * ease(frame, sameAt - 4 + a.slot, 8)}>
              {r}
            </Cell>
          );
        })}
        <Line at={sameAt + 8} x={X0} y={e2Top + cellH + h(24)} size={24} color={ACCENT_INK} out={passAt}>
          The same order as epoch 1: no shuffle at all
        </Line>
        <Line at={passAt} x={X0} y={e2Top + cellH + h(24)} size={25} color={OK_INK} weight={600}>
          One generator for the whole run<Fade at={newAt}>: a new order every epoch</Fade>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
