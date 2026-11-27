import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, M, MathRun } from "../../editorial/math";
import { label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COSINE } from "./data";
import { ACCENT, ACCENT_INK, Arrow, BAR, BLUE_INK, Cell, Drift, Fade, INK, INK_SOFT, Line, Mark, MARK_BAD, OK, OK_INK, X0 } from "./parts";

/** The vectors' origin and scale, in page pixels (y through the layout). */
const OX = 1250;
const SCALE = 330;
/** Two places, rounding a half up as it is written (0.045 → 0.05). */
const fmt2 = (v: number) => (Math.round(v * 100 + 1e-9) / 100).toFixed(2);
/** Where each item's score is written, beside its tip. */
const TIP_LABEL: Record<number, { dx: number; dy: number; align: "left" | "right" }> = {
  0: { dx: 16, dy: -2, align: "left" },
  1: { dx: 14, dy: -26, align: "left" },
  2: { dx: -12, dy: -34, align: "right" },
  3: { dx: 16, dy: -14, align: "left" },
  5: { dx: -14, dy: -30, align: "right" },
};

/**
 * Question 2. The formula, the page's: the dot product over both lengths.
 * Six catalog items as arrows from one origin (COSINE.items), the user's in
 * blue, each score at its tip as "one matrix product" is said. Then the
 * forgotten guard: a new item of all zeros sits at the origin, its score is
 * nan, NumPy sorts nan after every number, and the page's own top-three
 * idiom ranks the empty item first (COSINE.pageTop). The page's 1e-12 in the
 * denominator scores it 0 and the list re-ranks (COSINE.guardedTop).
 */
export const CosineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q2").from;
  const qAt = n.word("q2", "Question two");
  const textAt = n.word("q2", "How do you compute cosine");
  const dotAt = n.word("q2", "The dot product");
  const lengthsAt = n.word("q2", "divided by both lengths");
  const angleAt = n.word("q2", "it measures the angle");
  const magAt = n.word("q2", "ignores magnitude");
  const catalogAt = n.word("q2", "For a catalog");
  const scaleAt = n.word("q2", "scale every row to length one once");
  const productAt = n.word("q2", "one matrix product gives every similarity");
  const guardAt = n.word("q2-zero", "The guard on the denominator");
  const newAt = n.word("q2-zero", "Say a new item");
  const zerosAt = n.word("q2-zero", "an embedding of all zeros");
  const zeroOverAt = n.word("q2-zero", "zero over zero");
  const nanAt = n.word("q2-zero", "not a number");
  const sortsAt = n.word("q2-zero", "NumPy sorts that after every real number");
  const topAt = n.word("q2-zero", "a descending top three");
  const firstAt = n.word("q2-zero", "puts the empty item first");
  const everyAt = n.word("q2-zero", "for every single user");
  const tinyAt = n.word("q2-guard", "Add a tiny constant to the denominator");
  const zeroAt = n.word("q2-guard", "it scores zero instead");
  const end = n.beat("q2-guard").to;

  const oy = y(704);
  const tip = ([a, b]: readonly [number, number]): [number, number] => [OX + a * SCALE, oy - b * SCALE];
  const guard = ease(frame, tinyAt + 4, 16);
  const fixed = frame >= zeroAt;
  const reRank = ease(frame, zeroAt + 10, 16);
  const empty = COSINE.empty;

  // The top three, by the page's idiom, then by the guarded scores.
  const rowY = (i: number) => y(736) + i * h(46);
  const before = COSINE.pageTop;
  const after = COSINE.guardedTop;
  const scoreText = (i: number) => (COSINE.scores[i] === null ? "nan" : fmt2(COSINE.scores[i] as number));
  const all = [...new Set([...before, ...after])];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={dotAt} level={-36} />
      <Sfx name="el-pencil" at={lengthsAt} level={-37} />
      <Sfx name="el-whoosh" at={catalogAt} level={-37} />
      <Sfx name="el-tap" at={productAt + 4} level={-33} />
      <Sfx name="el-tap" at={nanAt} level={-30} />
      <Sfx name="el-pop" at={firstAt} level={-30} />
      <Sfx name="el-pencil" at={tinyAt + 4} level={-35} />
      <Sfx name="el-whoosh" at={zeroAt + 4} level={-36} />
      <Sfx name="el-chime" at={zeroAt + 22} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you compute cosine similarity in NumPy?
        </QuestionCard>

        {/* ── The formula: the dot product over both lengths ── */}
        <div style={{ position: "absolute", left: X0, top: y(282), display: "flex", alignItems: "center", gap: 22, fontSize: 44, color: INK, opacity: ease(frame, dotAt - 2, 12) }}>
          <MathRun>
            cos(<I>a</I>, <I>b</I>) =
          </MathRun>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <MathRun>
              <I>a</I> · <I>b</I>
            </MathRun>
            <div style={{ height: 2.5, alignSelf: "stretch", background: INK, margin: "8px -6px", transform: `scaleX(${ease(frame, lengthsAt - 2, 12)})`, transformOrigin: "0 50%" }} />
            <div style={{ display: "flex", alignItems: "baseline", opacity: ease(frame, lengthsAt, 12), whiteSpace: "nowrap" }}>
              <Mark at={guardAt} out={tinyAt}>
                <MathRun>
                  ‖<I>a</I>‖ ‖<I>b</I>‖
                </MathRun>
              </Mark>
              <span style={{ display: "inline-block", overflow: "hidden", maxWidth: `${5 * guard}em`, opacity: guard, whiteSpace: "nowrap", color: OK_INK }}>
                <M style={{ marginLeft: "0.3em" }}>{"+ 10^{-12}"}</M>
              </span>
            </div>
          </div>
        </div>
        <Line at={angleAt} x={X0} y={y(452)} size={24}>
          Measures the angle<Fade at={magAt}>, ignores the length</Fade>
        </Line>
        <Line at={catalogAt} x={X0} y={y(452) + h(46)} size={24} color={INK_SOFT}>
          For a catalog<Fade at={scaleAt}>: every row scaled to length 1, once</Fade>
        </Line>
        <Line at={productAt} x={X0} y={y(452) + h(92)} size={24} color={INK_SOFT}>
          then one matrix product scores every item
        </Line>

        {/* ── The arrows: the user and the six items ── */}
        {COSINE.items.map((it, i) => {
          if (i === empty) return null;
          const [tx, ty] = tip(it);
          const L = TIP_LABEL[i];
          const sc = fixed ? COSINE.guardedScores[i] : (COSINE.scores[i] as number);
          return (
            <React.Fragment key={i}>
              <Arrow points={[[OX, oy], [tx, ty]]} at={catalogAt + 4 + i * 3} dur={14} color={INK} width={2.2} head={13} />
              <div
                style={{
                  position: "absolute",
                  left: L.align === "left" ? tx + L.dx : undefined,
                  right: L.align === "right" ? 1920 - (tx + L.dx) : undefined,
                  top: ty + L.dy,
                  ...note(23, INK),
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums lining-nums",
                  opacity: ease(frame, productAt + 4 + i * 2, 10),
                  whiteSpace: "nowrap",
                }}
              >
                {fmt2(sc)}
              </div>
            </React.Fragment>
          );
        })}
        <Arrow points={[[OX, oy], tip(COSINE.user)]} at={catalogAt} dur={16} color={BAR} width={4.5} head={18} />
        <div style={{ position: "absolute", left: tip(COSINE.user)[0] + 18, top: tip(COSINE.user)[1] - 18, ...label(23, BLUE_INK), opacity: ease(frame, catalogAt + 8, 10), whiteSpace: "nowrap" }}>
          user
        </div>
        {/* The new item, all zeros: a dot at the origin. */}
        <div
          style={{
            position: "absolute",
            left: OX - 8,
            top: oy - 8,
            width: 16,
            height: 16,
            borderRadius: 8,
            background: frame >= nanAt - 2 && !fixed ? ACCENT : fixed ? OK : INK,
            opacity: ease(frame, catalogAt + 4, 10),
          }}
        />
        <div style={{ position: "absolute", right: 1920 - (OX - 22), top: oy + 10, textAlign: "right", opacity: ease(frame, newAt, 12), whiteSpace: "nowrap", ...note(23, INK), fontWeight: 500 }}>
          new item<Fade at={zerosAt}>: all zeros</Fade>
        </div>
        {/* The new item's score: 0 / 0 is nan; with the guard the
            denominator is 0 + 10^-12, never 0 / 0 (review 2026-11-26). */}
        <div style={{ position: "absolute", right: 1920 - (OX - 22), top: oy + 10 + h(36), textAlign: "right", whiteSpace: "nowrap", fontSize: 23, opacity: ease(frame, zeroOverAt, 10) }}>
          {fixed ? (
            <span style={{ ...note(23, INK_SOFT) }}>
              0 / (0 <span style={{ color: OK_INK }}>+ <M>{"10^{-12}"}</M></span>) ={" "}
            </span>
          ) : (
            <span style={{ ...note(23, INK_SOFT) }}>0 / 0 = </span>
          )}
          <span style={{ ...note(23, fixed ? OK_INK : ACCENT_INK), fontWeight: 600, opacity: ease(frame, nanAt, 8) }}>{fixed ? "0" : "nan"}</span>
        </div>

        {/* ── nan sorts last, so a descending top three puts it first ── */}
        <div style={{ position: "absolute", left: X0, top: y(612), display: "flex", alignItems: "center", gap: 14, fontSize: 23, opacity: ease(frame, sortsAt, 12) }}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", marginRight: 6 }}>Sorted by NumPy:</span>
          {COSINE.sortedWithNan.map((v, i) => (
            <div key={i} style={{ position: "relative", width: 76, height: h(44) }}>
              <Cell x={0} y={0} w={76} h={h(44)} size={22} radius={5} tone={v === null ? "bad" : "ink"} opacity={ease(frame, sortsAt + 2 + i * 3, 8)}>
                {v === null ? "nan" : v.toFixed(1)}
              </Cell>
            </div>
          ))}
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap", marginLeft: 6, opacity: ease(frame, sortsAt + 16, 10) }}>last of all</span>
        </div>

        <Line at={topAt} x={X0} y={y(736) - h(48)} size={23} color={INK}>
          Top 3, descending
        </Line>
        {all.map((i) => {
          const r0 = before.indexOf(i);
          const r1 = after.indexOf(i);
          if (r0 < 0 && reRank <= 0) return null;
          // The empty item leaves first; then the rest move up and the new
          // third arrives, so no two rows ever share a line.
          const leave = ease(frame, zeroAt, 8);
          const yy = r0 < 0 ? rowY(r1) : r1 < 0 ? rowY(r0) : rowY(r0) + (rowY(r1) - rowY(r0)) * reRank;
          const o = r0 < 0 ? reRank : r1 < 0 ? 1 - leave : 1;
          const isEmpty = i === empty;
          const shown = ease(frame, topAt + 4 + (r0 < 0 ? 0 : r0) * 3, 10);
          const ink = isEmpty && !fixed ? (frame >= firstAt ? ACCENT_INK : INK) : reRank > 0.5 ? OK_INK : INK;
          return (
            <div key={i} style={{ position: "absolute", left: X0, top: yy, display: "flex", alignItems: "baseline", gap: 18, fontSize: 24, opacity: shown * o, whiteSpace: "nowrap" }}>
              <span style={{ ...note(24, INK_SOFT), width: 22, fontVariantNumeric: "tabular-nums lining-nums" }}>{(r0 < 0 ? r1 : r1 < 0 ? r0 : reRank > 0.5 ? r1 : r0) + 1}</span>
              {isEmpty && !fixed && frame >= firstAt ? (
                <Mark at={firstAt} color={MARK_BAD}>
                  <span style={{ ...note(24, ink), fontWeight: 600 }}>nan</span>
                </Mark>
              ) : (
                <span style={{ ...note(24, ink), fontWeight: 600, fontVariantNumeric: "tabular-nums lining-nums" }}>{isEmpty ? (fixed ? "0" : "nan") : scoreText(i)}</span>
              )}
              <span style={{ ...note(23, isEmpty && !fixed ? ACCENT_INK : INK_SOFT) }}>{isEmpty ? "the new item" : ""}</span>
            </div>
          );
        })}
        <Line at={everyAt} x={X0 + 340} y={rowY(0)} size={24} color={ACCENT_INK} out={zeroAt}>
          for every single user
        </Line>
        <Line at={zeroAt + 6} x={X0 + 340} y={rowY(1)} size={24} color={OK_INK} weight={600}>
          With the guard, it scores 0
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
