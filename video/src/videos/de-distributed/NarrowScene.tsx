import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { type Dept, DEPT_COLOR, MR, ROWS } from "./data";
import { Arrow, Chip, Curve, Drift, Machine, PairCard } from "./parts";

const CARD_W = 170;
const CARD_H = 36;
const PITCH = 42;
const PAD = 12;
const BLOCK_W = CARD_W + 2 * PAD;
const TOPS = [410, 572, 692];
/** The narrow example: keep salaries over 100. */
const KEEP = 100;

const blockH = (cards: number) => cards * PITCH + 2 * PAD - (PITCH - CARD_H);

/**
 * Question 6, on the seven salaries' three partitions. Narrow: a filter
 * (salary over 100) keeps each row where it is, one parent partition to one
 * child. Wide: grouping by key needs rows from every parent, so the lines
 * cross from every partition to every key's: a shuffle.
 */
export const NarrowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("narrow").from;
  const qAt = n.word("narrow", "Question six");
  const textAt = n.word("narrow", "What is the difference between narrow");
  const narrowAt = n.word("narrow", "In a narrow one");
  const opsAt = n.word("narrow", "like map, filter or union");
  const feedsAt = n.word("narrow", "feeds at most one child");
  const stayAt = n.word("narrow", "rows stay put");
  const backAt = n.word("narrow", "steps run back to back");
  const wideAt = n.word("narrow-wide", "In a wide one");
  const manyAt = n.word("narrow-wide", "needs rows from many parents");
  const opsWAt = n.word("narrow-wide", "as in group by key");
  const forcesAt = n.word("narrow-wide", "That forces a shuffle");
  const end = n.beat("narrow-wide").to;

  const cardH = h(CARD_H);
  const slotY = (block: number, slot: number) => y(TOPS[block]) + h(PAD) + slot * h(PITCH);
  const parents = MR.splits.map((idx) => idx.map((i) => ROWS[i]));

  // ── Narrow: parents at P_X, children at C_X ──
  const P_X = 120;
  const C_X = 520;
  // ── Wide: parents at WP_X, children at WC_X ──
  const WP_X = 1000;
  const WC_X = 1460;
  const keys = MR.groups.map((g) => g.dept as Dept);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={narrowAt + 2} level={-37} />
      <Sfx name="el-pencil" at={feedsAt} level={-37} />
      <Sfx name="el-sprinkle" at={wideAt + 2} level={-37} />
      <Sfx name="el-whoosh" at={manyAt + 2} level={-36} />
      <Sfx name="el-tap" at={forcesAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is the difference between narrow and wide dependencies?
        </QuestionCard>

        {/* ── Narrow ── */}
        <Note at={narrowAt - 2} x={P_X} y={y(318)}>
          <span style={{ display: "flex", alignItems: "center", gap: 14, whiteSpace: "nowrap" }}>
            <span style={{ ...label(28, INK), fontWeight: 700 }}>Narrow</span>
            <span style={{ opacity: ease(frame, opsAt, 10), display: "flex", gap: 8 }}>
              <Chip mono size={21}>map</Chip>
              <Chip mono size={21}>filter</Chip>
              <Chip mono size={21}>union</Chip>
            </span>
          </span>
        </Note>
        <Note at={feedsAt - 2} x={C_X} y={y(366)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
            after a filter, salary &gt; {KEEP}
          </span>
        </Note>
        {parents.map((rows, b) => (
          <React.Fragment key={b}>
            <Machine x={P_X} top={y(TOPS[b])} width={BLOCK_W} height={h(blockH(rows.length))} at={narrowAt + b * 3} />
            <Machine x={C_X} top={y(TOPS[b])} width={BLOCK_W} height={h(blockH(rows.length))} at={feedsAt + b * 3} />
            <Arrow
              from={[P_X + BLOCK_W + 8, y(TOPS[b]) + h(blockH(rows.length)) / 2]}
              to={[C_X - 10, y(TOPS[b]) + h(blockH(rows.length)) / 2]}
              at={feedsAt + 4 + b * 3}
              dur={12}
              color={INK}
              width={2}
            />
            {rows.map((r, s) => {
              const p = ease(frame, narrowAt + 4 + b * 3 + s * 2, 10);
              const kept = r.salary > KEEP;
              const c = ease(frame, feedsAt + 10 + b * 3 + s * 2, 10);
              return (
                <React.Fragment key={r.index}>
                  <PairCard dept={r.dept} value={r.salary} width={CARD_W} height={cardH} pose={{ x: P_X + PAD, top: slotY(b, s), opacity: p }} />
                  {kept && c > 0 ? (
                    <PairCard dept={r.dept} value={r.salary} width={CARD_W} height={cardH} pose={{ x: C_X + PAD - (1 - c) * 14, top: slotY(b, s), opacity: c }} />
                  ) : null}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        ))}
        <Note at={stayAt - 2} x={P_X} y={y(842)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            rows stay put<span style={{ opacity: ease(frame, backAt, 10) }}> · steps run back to back</span>
          </span>
        </Note>

        {/* ── Wide ── */}
        <Note at={wideAt - 2} x={WP_X} y={y(318)}>
          <span style={{ display: "flex", alignItems: "center", gap: 14, whiteSpace: "nowrap" }}>
            <span style={{ ...label(28, INK), fontWeight: 700 }}>Wide</span>
            <span style={{ opacity: ease(frame, opsWAt, 10), display: "flex", gap: 8 }}>
              <Chip mono size={21}>groupByKey</Chip>
              <Chip mono size={21}>join</Chip>
              <Chip mono size={21}>distinct</Chip>
            </span>
          </span>
        </Note>
        {parents.map((rows, b) => (
          <React.Fragment key={b}>
            <Machine x={WP_X} top={y(TOPS[b])} width={BLOCK_W} height={h(blockH(rows.length))} at={wideAt + b * 3} />
            {rows.map((r, s) => (
              <PairCard
                key={r.index}
                dept={r.dept}
                value={r.salary}
                width={CARD_W}
                height={cardH}
                pose={{ x: WP_X + PAD, top: slotY(b, s), opacity: ease(frame, wideAt + 4 + b * 3 + s * 2, 10) }}
              />
            ))}
          </React.Fragment>
        ))}
        {/* Each child, one key's partition, draws on every parent that holds it. */}
        {keys.map((k, c) => {
          const g = MR.groups[c];
          return (
            <React.Fragment key={k}>
              <Machine x={WC_X} top={y(TOPS[c])} width={BLOCK_W} height={h(blockH(g.values.length))} at={manyAt + c * 3} />
              {MR.splits.flatMap((idx, b) =>
                idx
                  .filter((i) => ROWS[i].dept === k)
                  .map((i) => {
                    const s = idx.indexOf(i);
                    const landing = MR.splits.flat().filter((j) => ROWS[j].dept === k).indexOf(i);
                    const at = manyAt + 4 + c * 6 + b * 2;
                    const go = ease(frame, at + 12, 10);
                    return (
                      <React.Fragment key={i}>
                        <Curve
                          from={[WP_X + BLOCK_W + 8, slotY(b, s) + cardH / 2]}
                          to={[WC_X - 10, slotY(c, landing) + cardH / 2]}
                          at={at}
                          dur={16}
                          color={DEPT_COLOR[k]}
                          width={2}
                          head={10}
                        />
                        {go > 0 ? (
                          <PairCard dept={k} value={ROWS[i].salary} width={CARD_W} height={cardH} pose={{ x: WC_X + PAD - (1 - go) * 14, top: slotY(c, landing), opacity: go }} />
                        ) : null}
                      </React.Fragment>
                    );
                  }),
              )}
            </React.Fragment>
          );
        })}
        <Note at={forcesAt} x={WP_X} y={y(842)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>a child needs many parents: a shuffle</span>
        </Note>
        <Note at={manyAt + 6} x={(WP_X + BLOCK_W + WC_X) / 2 - 80} y={y(372)} width={160} style={{ textAlign: "center" }}>
          <span style={{ ...label(21, ACCENT_INK), opacity: ease(frame, forcesAt, 10) }}>shuffle</span>
        </Note>
        {/* A hairline between the two panels. */}
        <div style={{ position: "absolute", left: 900, top: y(330), width: 1.5, height: y(860) - y(330), background: `color-mix(in srgb, ${INK_SOFT} 30%, transparent)`, opacity: ease(frame, wideAt - 6, 12) }} />
      </Drift>
    </AbsoluteFill>
  );
};
