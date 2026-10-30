import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { type Dept, DEPT_INK, MR, ROWS } from "./data";
import { Arrow, Curve, Drift, fly, Machine, PairCard, RowCard, Svg } from "./parts";

/** Layout rows: a box's name line, then its cards at a fixed pitch. */
const RH = 48;
const CARD_H = 40;
const BOX_TOPS = [350, 546, 694];
const NAME_H = 34;
const slotTop = (box: number, slot: number) => BOX_TOPS[box] + NAME_H + slot * RH;
const boxHeight = (cards: number) => NAME_H + cards * RH + 4;

const SPLIT_X = 104;
const ROW_X = 116;
const ROW_W = 280;
const PAIR_X = 500;
const PAIR_W = 190;
const RED_BOX_X = 990;
const RED_X = 1002;
const SUM_X = 1330;
const SUM_W = 220;
const LABEL_Y = 304;

/**
 * Question 1. PandasGroupby's seven salaries on three machines (input
 * splits); map turns each row into a (department, salary) pair; the shuffle
 * sends each pair to the machine that owns its key, the lines between them
 * crossing; reduce sums each key: 388, 172 and 205, PandasGroupby's own
 * answer. Then why it scales, and what it costs: the shuffle's lines turn red.
 */
export const MapReduceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("mr").from;
  const qAt = n.word("mr", "Question one");
  const textAt = n.word("mr", "What is the MapReduce");
  const phasesAt = n.word("mr", "two phases");
  const shuffleWordAt = n.word("mr", "a shuffle between them");
  const manyAt = n.word("mr", "a model for running one job");
  const takeAt = n.word("mr", "Take seven salaries");
  const machinesAt = n.word("mr", "three machines");
  const mapAt = n.word("mr-map", "Map runs on every split");
  const pairAt = n.word("mr-map", "a key and a value");
  const deptAt = n.word("mr-map", "the department and the salary");
  const sendAt = n.word("mr-shuffle", "sends every pair");
  const engAt = n.word("mr-shuffle", "all of engineering");
  const reduceAt = n.word("mr-reduce", "Reduce adds up");
  const sums: Record<Dept, number> = {
    Eng: n.word("mr-reduce", "three hundred eighty-eight"),
    Ops: n.word("mr-reduce", "a hundred seventy-two"),
    Sales: n.word("mr-reduce", "two hundred five"),
  };
  const groupbyAt = n.word("mr-reduce", "It's a group by");
  const scalesAt = n.word("mr-why", "map tasks are independent");
  const failAt = n.word("mr-why", "handles failures");
  const costAt = n.word("mr-why", "Its cost is the shuffle");
  const networkAt = n.word("mr-why", "across the network");
  const end = n.beat("mr-why").to;

  const cardH = h(CARD_H);
  const rowOf = (index: number) => {
    const s = MR.splits.findIndex((sp) => sp.includes(index));
    return { split: s, slot: MR.splits[s].indexOf(index) };
  };
  // Where each pair lands: its group (reducer) and its place in it, in the
  // order the shuffle collected them (split order, then index order).
  const order = MR.splits.flat();
  const landing = new Map<number, { group: number; slot: number }>();
  MR.groups.forEach((g, gi) => {
    let k = 0;
    for (const i of order) {
      if (ROWS[i].dept === g.dept) landing.set(i, { group: gi, slot: k++ });
    }
  });

  const flown = (i: number) => ease(frame, sendAt + 2 + order.indexOf(i) * 4, 24);
  const red = ease(frame, costAt, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={takeAt + 4} level={-37} />
      <Sfx name="el-pencil" at={pairAt} level={-37} />
      <Sfx name="el-whoosh" at={sendAt + 4} level={-35} />
      {MR.groups.map((g) => (
        <Sfx key={g.dept} name="el-tap" at={sums[g.dept]} level={-35} />
      ))}
      <Sfx name="el-scratch" at={costAt + 2} level={-37} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is the MapReduce mental model?
        </QuestionCard>

        {/* The phases, as column heads. */}
        <Note at={machinesAt - 2} x={ROW_X} y={y(LABEL_Y)}>
          <span style={{ ...label(25, INK_SOFT), whiteSpace: "nowrap" }}>Input splits</span>
        </Note>
        <Note at={phasesAt} x={PAIR_X} y={y(LABEL_Y)}>
          <span style={{ ...label(26, INK), fontWeight: 700, whiteSpace: "nowrap" }}>1 Map</span>
        </Note>
        <Note at={shuffleWordAt} x={760} y={y(LABEL_Y)}>
          <span style={{ ...label(26, red > 0.5 ? ACCENT_INK : INK), fontWeight: 700, whiteSpace: "nowrap" }}>Shuffle</span>
        </Note>
        <Note at={phasesAt + 6} x={RED_X} y={y(LABEL_Y)}>
          <span style={{ ...label(26, INK), fontWeight: 700, whiteSpace: "nowrap" }}>2 Reduce</span>
        </Note>

        {/* Three machines, each with its split of the frame. */}
        {MR.splits.map((sp, s) => (
          <React.Fragment key={s}>
            <Machine
              x={SPLIT_X}
              top={y(BOX_TOPS[s])}
              width={ROW_W + 24 + 290}
              height={h(boxHeight(sp.length))}
              at={manyAt + s * 4}
              name={`machine ${s + 1}`}
              tone="ok"
              toneAt={scalesAt}
            />
          </React.Fragment>
        ))}
        {/* Map: each row turns into a pair on its own machine. */}
        {ROWS.map((r) => {
          const { split, slot } = rowOf(r.index);
          const mid = y(slotTop(split, slot)) + cardH / 2;
          return <Arrow key={r.index} from={[ROW_X + ROW_W + 10, mid]} to={[PAIR_X - 12, mid]} at={mapAt + 4 + r.index * 3} dur={10} width={1.6} head={10} out={sendAt + 2 + order.indexOf(r.index) * 4} />;
        })}

        {ROWS.map((r) => {
          const { split, slot } = rowOf(r.index);
          const p = ease(frame, takeAt + 2 + r.index * 2, 12);
          return (
            <RowCard
              key={r.index}
              row={r}
              width={ROW_W}
              height={cardH}
              pose={{ x: ROW_X - (1 - p) * 14, top: y(slotTop(split, slot)), opacity: p * (1 - 0.45 * ease(frame, pairAt + 20, 12)) }}
            />
          );
        })}

        {/* The shuffle's lines, from where each pair was made to where it lands. */}
        {order.map((i, k) => {
          const { split, slot } = rowOf(i);
          const land = landing.get(i)!;
          const a: [number, number] = [PAIR_X + PAIR_W + 8, y(slotTop(split, slot)) + cardH / 2];
          const b: [number, number] = [RED_X - 10, y(slotTop(land.group, land.slot)) + cardH / 2];
          return (
            <React.Fragment key={i}>
              <Curve from={a} to={b} at={sendAt + 2 + k * 4} dur={20} color={INK_SOFT} width={1.6} head={10} opacity={0.75} />
              <Curve from={a} to={b} at={costAt + k * 2} dur={12} color={ACCENT} width={2.4} head={10} />
            </React.Fragment>
          );
        })}

        {/* Reducers: one machine per key. */}
        {MR.groups.map((g, gi) => (
          <Machine
            key={g.dept}
            x={RED_BOX_X}
            top={y(BOX_TOPS[gi])}
            width={PAIR_W + 24}
            height={h(boxHeight(g.values.length))}
            at={sendAt - 4 + gi * 3}
            name={<span style={{ color: DEPT_INK[g.dept] }}>owns {g.dept}</span>}
            dash
          />
        ))}

        {/* Map's pairs, which then fly to their reducer. */}
        {ROWS.map((r) => {
          const { split, slot } = rowOf(r.index);
          const p = ease(frame, pairAt + r.index * 3, 12);
          if (p <= 0) return null;
          const go = flown(r.index);
          const land = landing.get(r.index)!;
          const a: [number, number] = [PAIR_X, y(slotTop(split, slot))];
          const b: [number, number] = [RED_X, y(slotTop(land.group, land.slot))];
          const pose = go > 0 ? fly(go, a, b, 28) : { x: a[0] - (1 - p) * 16, top: a[1], opacity: p };
          const engMark = r.dept === "Eng" ? ease(frame, engAt, 10) * (1 - ease(frame, reduceAt, 10)) : 0;
          return (
            <React.Fragment key={r.index}>
              {engMark > 0 && go >= 1 ? (
                <div
                  style={{
                    position: "absolute",
                    left: b[0] - 8,
                    top: b[1] - 5,
                    width: (PAIR_W + 16) * engMark,
                    height: cardH + 10,
                    background: HIGHLIGHT,
                    borderRadius: 4,
                  }}
                />
              ) : null}
              <PairCard dept={r.dept} value={r.salary} width={PAIR_W} height={cardH} pose={pose} />
            </React.Fragment>
          );
        })}
        {/* What the pair is made of, under the first one. */}
        <Note at={deptAt} x={PAIR_X} y={y(slotTop(0, 0)) - h(30)} out={sendAt}>
          <span style={{ ...label(19, INK_SOFT), whiteSpace: "nowrap" }}>key · value</span>
        </Note>

        {/* Reduce: a bracket on each group, and its sum. */}
        {MR.groups.map((g, gi) => {
          const at = reduceAt + 4 + gi * 4;
          const b = ease(frame, at, 12);
          const top = y(slotTop(gi, 0)) + 2;
          const bottom = y(slotTop(gi, g.values.length - 1)) + cardH - 2;
          const mid = (top + bottom) / 2;
          const bx = RED_X + PAIR_W + 30;
          const sumP = ease(frame, sums[g.dept] - 2, 12);
          const mark = ease(frame, sums[g.dept], 10) * (1 - ease(frame, groupbyAt, 12));
          return (
            <React.Fragment key={g.dept}>
              <Svg>
                <path
                  d={`M${bx - 10},${top} L${bx},${top} L${bx},${bottom} L${bx - 10},${bottom} M${bx},${mid} L${SUM_X - 18},${mid}`}
                  fill="none"
                  stroke={INK}
                  strokeWidth={2}
                  pathLength={1}
                  strokeDasharray={`${b} 1`}
                />
              </Svg>
              {mark > 0 ? (
                <div style={{ position: "absolute", left: SUM_X - 8, top: mid - cardH / 2 - 6, width: (SUM_W + 16) * mark, height: cardH + 12, background: HIGHLIGHT, borderRadius: 4 }} />
              ) : null}
              {sumP > 0 ? (
                <PairCard
                  dept={g.dept}
                  value={MR.reduced[gi].salary}
                  strong
                  width={SUM_W}
                  height={cardH}
                  pose={{ x: SUM_X - (1 - sumP) * 16, top: mid - cardH / 2, opacity: sumP }}
                />
              ) : null}
            </React.Fragment>
          );
        })}
        <Note at={reduceAt} x={SUM_X} y={y(LABEL_Y)}>
          <span style={{ ...label(25, INK_SOFT), whiteSpace: "nowrap" }}>sum per key</span>
        </Note>
        <Note at={groupbyAt - 2} x={SUM_X} y={y(842)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            a <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 600 }}>groupby</span>, across machines
          </span>
        </Note>

        {/* Why it scales, and what it costs. */}
        <Note at={scalesAt} x={ROW_X} y={y(842)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            independent map tasks<span style={{ opacity: ease(frame, failAt, 10) }}> · the framework handles failures</span>
          </span>
        </Note>
        <Note at={costAt + 4} x={770} y={y(842)}>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            the cost<span style={{ opacity: ease(frame, networkAt, 10) }}>: data across the network</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
