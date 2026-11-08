import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { TABULAR, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HASH, sharedChance } from "./data";
import { ACCENT, ACCENT_INK, BAR, BLUE_FILL, BLUE_INK, Cell, Drift, HBar, HIGHLIGHT, INK, INK_SOFT, Line, Mark, Mono, OK_INK, Svg, int, VRule } from "./parts";

const AX = 140;
const PITCH_X = 84;
const MAP_X = 560;
/** The thousand buckets: 50 by 20. */
const BX = 1010;
const COLS = 50;
const BP = 12;

/** Where each key lands, for the drawing: a seeded scatter of distinct
 *  buckets (mulberry32). Only the chance beside it is a claim. */
const landings = (() => {
  let a = 20261106;
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: number[] = [];
  while (out.length < HASH.evenMoneyKeys) {
    const b = Math.floor(rand() * HASH.buckets);
    if (!out.includes(b)) out.push(b);
  }
  return out;
})();

/**
 * Question 2, with the hash set's complexity answered inside it. When a map
 * earns its place (lookups by key, on average constant), then Two Sum on the
 * challenge's [2, 7, 11, 15]: one pass, asking the map for target minus each
 * number, [0, 1]. Then "average": a thousand buckets filling key by key, the
 * chance that two share one passing even money at the 38th. Then the worst
 * case counted, __eq__ calls with one shared hash against none, and the hash
 * set's answer in one line.
 */
export const HashScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("hash").from;
  const qAt = n.word("hash", "Question two");
  const textAt = n.word("hash", "When do you reach for a hash map");
  const lookupsAt = n.word("hash", "When you need lookups and inserts");
  const uses = [
    { text: "counting", at: n.word("hash", "counting") },
    { text: "grouping", at: n.word("hash", "grouping") },
    { text: "have I seen this?", at: n.word("hash", "have I seen this") },
  ];
  const twoSumAt = n.word("hash-twosum", "It turns Two Sum's double loop");
  const eachAt = n.word("hash-twosum", "at each number");
  const askAt = n.word("hash-twosum", "ask the map for target minus it");
  const storeAt = n.word("hash-twosum", "then store the number");
  const linearAt = n.word("hash-twosum", "Linear time");
  const averageAt = n.word("hash-collide", "Average is the key word");
  const bucketsAt = n.word("hash-collide", "With a thousand buckets");
  const evenAt = n.word("hash-collide", "by the thirty-eighth key");
  const worstAt = n.word("hash-worst", "The follow-up is the worst case");
  const sameAt = n.word("hash-worst", "Give a thousand keys the same hash");
  const nearlyAt = n.word("hash-worst", "nearly six hundred thousand");
  const noneAt = n.word("hash-worst", "With distinct hashes, none");
  const setAt = n.word("hash-set", "That's a hash set");
  const avgAt = n.word("hash-set", "constant on average");
  const spaceAt = n.word("hash-set", "linear space");
  const atWorstAt = n.word("hash-set", "linear per operation at worst");
  const end = n.beat("hash-set").to;

  const aTop = y(426);
  const nums = HASH.twoSum.nums;
  const target = HASH.twoSum.target;
  // The pass: index 0, then index 1, where the answer is found.
  const at1 = storeAt + 16;
  const cur = frame < at1 ? 0 : 1;
  const ask = [
    { at: askAt, text: <>{target} − {nums[0]} = {target - nums[0]}: not in the map</>, ok: false },
    { at: at1 + 8, text: <>{target} − {nums[1]} = {target - nums[1]}: in the map, at index 0</>, ok: true },
  ];
  // Keys landing in the buckets, one by one, across the beat.
  const dropFrom = bucketsAt + 6;
  const dropStep = Math.max(1.2, (evenAt + 6 - dropFrom) / HASH.evenMoneyKeys);
  const landed = Math.max(0, Math.min(HASH.evenMoneyKeys, Math.floor((frame - dropFrom) / dropStep) + 1));
  const bTop = y(426);
  const last = ease(frame, evenAt + 8, 10);
  const chance = landed >= HASH.evenMoneyKeys ? HASH.pAtEvenMoney : sharedChance(landed, HASH.buckets);

  return (
    <AbsoluteFill>
      {uses.map((u) => (
        <Sfx key={u.text} name="el-tap" at={u.at} level={-33} />
      ))}
      <Sfx name="el-pop" at={twoSumAt} level={-31} />
      <Sfx name="el-tap" at={storeAt} level={-32} />
      <Sfx name="el-pop" at={linearAt - 6} level={-30} />
      <Sfx name="el-sprinkle" at={dropFrom} level={-32} />
      <Sfx name="el-tap" at={evenAt + 8} level={-31} />
      <Sfx name="el-whoosh" at={sameAt + 4} level={-34} />
      <Sfx name="el-chime" at={atWorstAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={62}>
          When do you reach for a hash map?
        </QuestionCard>
        <Line at={lookupsAt} x={96} y={y(262)} size={24} color={INK_SOFT}>
          Lookups and inserts by key, in O(1) on average:
        </Line>
        <div style={{ position: "absolute", left: 670, top: y(262), display: "flex", gap: 14, fontSize: 24, whiteSpace: "nowrap" }}>
          {uses.map((u, i) => (
            <span key={u.text} style={{ ...note(24, BLUE_INK), fontWeight: 500, opacity: ease(frame, u.at - 2, 10) }}>
              {i ? <span style={{ color: INK_SOFT, fontWeight: 500, marginRight: 14 }}>·</span> : null}
              {u.text}
            </span>
          ))}
        </div>

        {/* Two Sum: one pass with a map. */}
        <Line at={twoSumAt} x={AX} y={aTop - 50} size={22} weight={500}>
          Two Sum, target <Num>{target}</Num>: one pass
        </Line>
        {nums.map((v, i) => (
          <React.Fragment key={i}>
            <Cell x={AX + i * PITCH_X} y={aTop} at={twoSumAt + 4 + i * 3} value={v} tone={frame >= eachAt - 2 && i === cur ? "look" : "data"} />
            <div style={{ position: "absolute", left: AX + i * PITCH_X, width: 64, top: aTop + 74, textAlign: "center", ...label(24, INK_SOFT), ...TABULAR, opacity: ease(frame, twoSumAt + 8, 10) }}>
              {i}
            </div>
          </React.Fragment>
        ))}
        {ask.map((a, i) => (
          <Line key={i} at={a.at} x={AX} y={aTop + 124 + i * 40} size={24} color={a.ok ? OK_INK : INK} weight={a.ok ? 700 : 500}>
            {a.text}
          </Line>
        ))}
        {/* The map, filling as the pass moves. */}
        <Line at={twoSumAt + 6} x={MAP_X} y={aTop - 50} size={22} weight={500} color={INK_SOFT}>
          map: number → index
        </Line>
        <div style={{ position: "absolute", left: MAP_X, top: aTop, width: 190, height: 64, boxSizing: "border-box", borderRadius: 8, background: BLUE_FILL, opacity: ease(frame, twoSumAt + 6, 10) }} />
        <div style={{ position: "absolute", left: MAP_X, width: 190, top: aTop + 14, textAlign: "center", fontFamily: MONO, fontSize: 28, fontWeight: 500, color: INK, opacity: ease(frame, storeAt + 2, 10) }}>
          {nums[0]} → 0
        </div>
        <div style={{ position: "absolute", left: MAP_X, top: aTop + 92, opacity: ease(frame, linearAt - 6, 10), display: "flex", alignItems: "center", gap: 12, fontSize: 28 }}>
          <span style={{ ...note(28, INK_SOFT), whiteSpace: "nowrap" }}>returns</span>
          <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 500, color: OK_INK }}>{HASH.twoSum.answer}</span>
        </div>
        <Line at={linearAt} x={AX} y={aTop + 214} size={24} weight={500}>
          O(n) time, at the cost of O(n) memory
        </Line>

        <VRule x={945} top={aTop - 50} bottom={y(800) + 60} at={averageAt} />

        {/* Average: a thousand buckets, filling key by key. */}
        <Line at={averageAt} x={BX} y={bTop - 50} size={22} weight={500}>
          <Mark at={averageAt + 4}>Average</Mark> case: <Num>{int(HASH.buckets)}</Num> buckets, keys hashed at random
        </Line>
        <Svg opacity={ease(frame, bucketsAt - 4, 12)}>
          {Array.from({ length: HASH.buckets }, (_, b) => (
            <rect key={b} x={BX + (b % COLS) * BP} y={bTop + Math.floor(b / COLS) * BP} width={BP - 3} height={BP - 3} rx={2} fill={BLUE_FILL} />
          ))}
          {landings.slice(0, landed).map((b, k) => {
            const p = ease(frame, dropFrom + k * dropStep, 6);
            const lastOne = k === HASH.evenMoneyKeys - 1;
            return (
              <rect
                key={b}
                x={BX + (b % COLS) * BP - 1}
                y={bTop + Math.floor(b / COLS) * BP - 1}
                width={BP - 1}
                height={BP - 1}
                rx={2}
                fill={lastOne && last > 0 ? HIGHLIGHT : BAR}
                stroke={lastOne && last > 0 ? INK : "none"}
                strokeWidth={1.2}
                opacity={p}
              />
            );
          })}
        </Svg>
        <div style={{ position: "absolute", left: BX, top: bTop + 20 * BP + 24, ...note(24, INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, bucketsAt, 10) }}>
          <span style={TABULAR}>{landed}</span> keys: chance two share a bucket{" "}
          <Mark at={evenAt + 8}>
            <b style={TABULAR}>{(chance * 100).toFixed(1)}%</b>
          </Mark>
          <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, evenAt + 10, 10) }}>, more likely than not</span>
        </div>

        {/* The worst case, counted. */}
        <Line at={worstAt} x={AX} y={y(684)} size={22} weight={500}>
          Worst case: <Mono>__eq__</Mono> calls filling a Python set with <Num>{int(HASH.keys)}</Num> keys
        </Line>
        <HBar x={AX} y={y(724)} w={640} max={HASH.eqSame} value={HASH.eqSpread} at={noneAt - 2} color={BAR} label="Distinct hashes" valueText={<Num>{int(HASH.eqSpread)}</Num>} size={22} barH={22} />
        <HBar
          x={AX}
          y={y(800)}
          w={640}
          max={HASH.eqSame}
          value={HASH.eqSame}
          at={sameAt + 4}
          dur={Math.max(18, nearlyAt - sameAt)}
          color={ACCENT}
          ink={ACCENT_INK}
          label="One shared hash"
          valueText={<Num>{int(HASH.eqSame)}</Num>}
          size={22}
          barH={22}
        />

        {/* The hash set, answered. */}
        <div style={{ position: "absolute", left: BX, top: y(708), opacity: ease(frame, setAt, 12) }}>
          <div style={{ ...label(24, INK), fontWeight: 500 }}>A hash set</div>
          {[
            { at: avgAt, k: "time, on average", v: "O(1)", c: OK_INK },
            { at: spaceAt, k: "space", v: "O(n)", c: INK },
            { at: atWorstAt, k: "time per operation, at worst", v: "O(n)", c: ACCENT_INK },
          ].map((r) => (
            <div key={r.k} style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 24, opacity: ease(frame, r.at - 2, 10), whiteSpace: "nowrap" }}>
              <span style={{ ...note(24, r.c), fontWeight: 500, width: 70 }}>{r.v}</span>
              <span style={note(24, INK)}>{r.k}</span>
            </div>
          ))}
        </div>
      </Drift>
    </AbsoluteFill>
  );
};

