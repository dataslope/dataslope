import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { count, MR, REDUCE, ROWS } from "./data";
import { Chip, Drift, Machine, OK, OK_INK, PairCard } from "./parts";

const RH = 48;
const CARD_H = 40;
const NAME_H = 34;
const BOX_TOPS = [356, 548, 694];
const slotTop = (box: number, slot: number) => BOX_TOPS[box] + NAME_H + slot * RH;
const boxHeight = (cards: number) => NAME_H + cards * RH + 4;
const M_X = 120;
const CARD_W = 196;
const A_X = 430;
const B_X = 700;
const R_X = 1060;
const BAR_X = 1060;
const BAR_W = 700;

/**
 * Question 12. The seven salaries on their three machines again. groupByKey
 * sends every pair across: seven. reduceByKey adds within each machine first,
 * so machine 1's two engineering salaries leave as one sum: six. Then the
 * model at scale (a million clicks over a thousand products in four
 * partitions): a million values against four thousand partial counts, drawn
 * to one scale, where the second bar is a sliver.
 */
export const ReduceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("reduce").from;
  const qAt = n.word("reduce", "Question twelve");
  const textAt = n.word("reduce", "What is group by key versus");
  const backAt = n.word("reduce", "Back to the seven salaries");
  const allAt = n.word("reduce", "shuffles all seven pairs");
  const afterAt = n.word("reduce", "adds them up after");
  const rbkAt = n.word("reduce-combine", "Reduce by key combines on each partition first");
  const engAt = n.word("reduce-combine", "adds its two engineering salaries");
  const movesAt = n.word("reduce-combine", "before anything moves");
  const sixAt = n.word("reduce-combine", "six sums cross");
  const smallAt = n.word("reduce-model", "On seven rows that's small");
  const modelAt = n.word("reduce-model", "Model a million clicks");
  const millionAt = n.word("reduce-model", "shuffles a million values");
  const fourAt = n.word("reduce-model", "reduce by key four thousand");
  const fewerAt = n.word("reduce-model", "two hundred fifty times fewer");
  const hotAt = n.word("reduce-prefer", "piles every value of a hot key");
  const preferAt = n.word("reduce-prefer", "Prefer reduce by key");
  const dfAt = n.word("reduce-prefer", "a DataFrame group by");
  const assocAt = n.word("reduce-prefer", "whenever the aggregation is associative");
  const end = n.beat("reduce-prefer").to;

  const cardH = h(CARD_H);
  const engMark = ease(frame, engAt, 10) * (1 - ease(frame, smallAt, 12));
  const big = ease(frame, millionAt, 18);
  const small = ease(frame, fourAt, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={backAt + 2} level={-37} />
      <Sfx name="el-whoosh" at={allAt + 2} level={-36} />
      <Sfx name="el-pencil" at={engAt + 4} level={-37} />
      <Sfx name="el-tap" at={sixAt} level={-35} />
      <Sfx name="el-pencil" at={millionAt} level={-37} />
      <Sfx name="el-tap" at={fourAt + 2} level={-35} />
      <Sfx name="el-chime" at={fewerAt + 4} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={12} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is <QMono>groupByKey</QMono> vs <QMono>reduceByKey</QMono>, and why does it matter?
        </QuestionCard>

        {/* The seven salaries, as map left them. */}
        {MR.splits.map((sp, s) => (
          <Machine key={s} x={M_X - 12} top={y(BOX_TOPS[s])} width={CARD_W + 24} height={h(boxHeight(sp.length))} at={backAt + s * 3} name={`machine ${s + 1}`} />
        ))}
        {MR.splits.map((sp, s) =>
          sp.map((i, slot) => {
            const r = ROWS[i];
            const p = ease(frame, backAt + 4 + i * 2, 10);
            const isEng1 = s === 0 && r.dept === "Eng";
            return (
              <React.Fragment key={i}>
                {isEng1 && engMark > 0 ? (
                  <div style={{ position: "absolute", left: M_X - 6, top: y(slotTop(s, slot)) - 4, width: (CARD_W + 12) * engMark, height: cardH + 8, background: HIGHLIGHT, borderRadius: 4 }} />
                ) : null}
                <PairCard dept={r.dept} value={r.salary} width={CARD_W} height={cardH} pose={{ x: M_X, top: y(slotTop(s, slot)), opacity: p }} />
              </React.Fragment>
            );
          }),
        )}

        {/* What groupByKey sends: every pair. */}
        <Note at={allAt - 2} x={A_X} y={y(312)}>
          <span style={{ display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
            <Chip mono size={21} color={ACCENT} ink={ACCENT_INK}>
              groupByKey
            </Chip>
            <span style={{ ...label(20, INK_SOFT) }}>sends</span>
          </span>
        </Note>
        {MR.splits.map((sp, s) =>
          sp.map((i, slot) => {
            const r = ROWS[i];
            const go = ease(frame, allAt + 2 + MR.splits.flat().indexOf(i) * 3, 14);
            return go > 0 ? (
              <PairCard key={i} dept={r.dept} value={r.salary} width={CARD_W} height={cardH} pose={{ x: M_X + (A_X - M_X) * go, top: y(slotTop(s, slot)), opacity: go, lift: Math.sin(Math.PI * go) }} />
            ) : null;
          }),
        )}
        <Note at={afterAt - 2} x={A_X} y={y(856)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Num>{MR.shuffled}</Num> pairs cross
          </span>
        </Note>

        {/* What reduceByKey sends: each machine's sums. */}
        <Note at={rbkAt - 2} x={B_X} y={y(312)}>
          <span style={{ display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
            <Chip mono size={21} color={OK} ink={OK_INK}>
              reduceByKey
            </Chip>
            <span style={{ ...label(20, INK_SOFT) }}>sends</span>
          </span>
        </Note>
        {MR.combined.map((parts, s) =>
          parts.map((pt, slot) => {
            const at = (s === 0 && pt.dept === "Eng" ? movesAt : rbkAt + 8) + s * 4 + slot * 2;
            const p = ease(frame, at, 12);
            const summed = s === 0 && pt.dept === "Eng";
            return p > 0 ? (
              <React.Fragment key={`${s}-${slot}`}>
                <PairCard dept={pt.dept} value={pt.salary} strong={summed} width={CARD_W} height={cardH} pose={{ x: B_X - (1 - p) * 16, top: y(slotTop(s, slot)), opacity: p }} />
                {summed ? (
                  <div style={{ position: "absolute", left: B_X + CARD_W + 10, top: y(slotTop(s, slot)) + cardH / 2 - 13, ...label(20, OK_INK), whiteSpace: "nowrap", opacity: p }}>
                    120 + 140
                  </div>
                ) : null}
              </React.Fragment>
            ) : null;
          }),
        )}
        <Note at={sixAt - 2} x={B_X} y={y(856)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Num>{MR.combinedShuffled}</Num> sums cross
          </span>
        </Note>

        {/* At scale. */}
        <div style={{ position: "absolute", left: 1010, top: y(330), width: 1.5, height: y(860) - y(330), background: `color-mix(in srgb, ${INK_SOFT} 30%, transparent)`, opacity: ease(frame, modelAt - 6, 12) }} />
        <Note at={modelAt - 2} x={R_X} y={y(316)}>
          <span style={{ ...label(23, INK), display: "block", lineHeight: 1.35, whiteSpace: "nowrap" }}>
            A model: <Num>{count(REDUCE.events)}</Num> clicks,
            <br />
            <Num>{count(REDUCE.keys)}</Num> products, <Num>{REDUCE.partitions}</Num> partitions
          </span>
        </Note>
        <Note at={millionAt - 2} x={BAR_X} y={y(420)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 600 }}>groupByKey</span> shuffles <b style={{ color: ACCENT_INK }}><Num>{count(REDUCE.groupByKey)}</Num> values</b>
          </span>
        </Note>
        <div style={{ position: "absolute", left: BAR_X, top: y(462), width: BAR_W * big, height: h(34), background: `color-mix(in srgb, ${ACCENT} 55%, ${PAPER})`, borderRadius: 3 }} />
        <Note at={fourAt - 2} x={BAR_X} y={y(530)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 600 }}>reduceByKey</span> shuffles <b style={{ color: OK_INK }}><Num>{count(REDUCE.reduceByKey)}</Num> partial counts</b>
          </span>
        </Note>
        <div
          style={{
            position: "absolute",
            left: BAR_X,
            top: y(572),
            width: Math.max(4, (BAR_W * REDUCE.reduceByKey) / REDUCE.groupByKey) * small,
            height: h(34),
            background: OK,
            borderRadius: 2,
          }}
        />
        <Note at={fewerAt - 2} x={BAR_X + 30} y={y(574)}>
          <span style={{ ...note(26, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Num>{REDUCE.ratio}</Num> × fewer
          </span>
        </Note>
        {/* Why else, and what to use. */}
        <Note at={hotAt - 2} x={R_X} y={y(660)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, display: "block", lineHeight: 1.3, whiteSpace: "nowrap" }}>
            groupByKey: a hot key&apos;s every value
            <br />
            in one task&apos;s memory
          </span>
        </Note>
        <Note at={preferAt - 2} x={R_X} y={y(752)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            prefer <span style={{ fontFamily: MONO, fontSize: 21 }}>reduceByKey</span>
            <span style={{ opacity: ease(frame, dfAt, 10) }}>
              , or <span style={{ fontFamily: MONO, fontSize: 21 }}>groupBy().agg()</span>
            </span>
          </span>
        </Note>
        <Note at={assocAt - 2} x={R_X} y={y(796)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>when the aggregation is associative</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
