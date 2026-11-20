import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { label, note } from "../../editorial/style";
import { badgeStyle } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { VECTOR } from "./data";
import { ART, Arrow, artBox, BAR, BLUE_INK, Drift, Fade, Headline, INK, INK_SOFT, int, Kicker, Line, Listing, listingHeight, Mark, MARK_BAD, seeded, Spot, X0 } from "./parts";

/** The column of items: a few rows stand for the hundred thousand. */
const ROWS = 40;
const COL_X = 400;
const COL_W = 260;
const SEGS = 13;
const TOP_X = 760;
const TOP_K = 10;
const SHADES = [100, 200, 300, 400, 500] as const;

/** Each row's embedding (a strip of shades) and its score, seeded: the
 *  drawing is a picture of "score every item, keep the ten closest", and no
 *  number on it is a claim. */
const ROWS_DRAWN = (() => {
  const r = seeded(20261120);
  return Array.from({ length: ROWS }, () => ({
    shades: Array.from({ length: SEGS }, () => SHADES[Math.floor(r() * SHADES.length)]),
    score: 0.12 + 0.86 * r() ** 1.6,
  }));
})();
/** The ten best rows, in rank order. */
const TOP = ROWS_DRAWN.map((row, i) => ({ i, s: row.score }))
  .sort((a, b) => b.s - a.s)
  .slice(0, TOP_K)
  .map((t) => t.i);

const LINES = ["E /= np.linalg.norm(E, axis=1, keepdims=True)", "s = E @ (u / np.linalg.norm(u))", "top = np.argpartition(s, -10)[-10:]"];

/**
 * The opening: one user's vector beside a column of items (rows standing for
 * the hundred thousand), each an embedding. Every row is scored, and the ten
 * closest lift out to the right. The few lines of NumPy that do it ink in,
 * with what the round asks of them. Then the round in one line: fifteen
 * questions, ten worked through and five quick. The tree frog sits at the
 * right throughout.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const userAt = n.word("hook", "One user");
  const itemsAt = n.word("hook", "a hundred thousand items");
  const embAt = n.word("hook", "an embedding for each");
  const scoreAt = n.word("hook", "Score every item");
  const closestAt = n.word("hook", "the ten closest");
  const linesAt = n.word("hook", "a few lines");
  const costAt = n.word("hook", "what those lines cost");
  const breakAt = n.word("hook", "where they break");
  const normalAt = n.word("plan", "It's a normal data-structures interview");
  const fifteenAt = n.word("plan", "Fifteen questions");
  const tenAt = n.word("plan", "ten worked through");
  const fiveAt = n.word("plan", "five quick ones");
  const end = n.beat("plan").to;

  const colTop = y(320);
  const pitch = h(9);
  const rowH = h(6);
  const segW = COL_W / SEGS;
  const sweepFrom = scoreAt + 4;
  const sweepStep = 0.7;
  const lift = (k: number) => ease(frame, closestAt + 2 + k * 2, 18);
  const topTop = y(372);
  const topPitch = h(24);
  const lifted = ease(frame, closestAt + 2, 12);
  const listTop = y(326);
  const listBottom = listTop + listingHeight(LINES.length, 24);
  const frog = artBox(ART.frog, 420);
  const discTop = y(828);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={from + 6} level={-30} />
      <Sfx name="el-sprinkle" at={itemsAt + 2} level={-36} />
      <Sfx name="el-whoosh" at={sweepFrom} level={-37} />
      <Sfx name="el-whoosh" at={closestAt + 4} level={-35} />
      <Sfx name="el-pencil" at={linesAt} level={-36} />
      <Sfx name="el-tap" at={fifteenAt} level={-32} />
      <Sfx name="el-tap" at={tenAt} level={-34} />
      <Sfx name="el-tap" at={fiveAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Machine learning engineer interview questions</Kicker>
        <Headline lead={`One user, ${int(VECTOR.items)} items,`} turn="the ten closest." at={userAt - 4} turnAt={closestAt - 4} size={64} />

        {/* ── The user's vector ── */}
        <Line at={userAt} x={X0} y={y(436)} size={23} color={BLUE_INK}>
          1 user
        </Line>
        <Arrow points={[[X0 + 4, y(520)], [X0 + 170, y(486)]]} at={userAt + 2} dur={14} color={BAR} width={5} head={20} />
        <div style={{ position: "absolute", left: X0 - 1, top: y(520) - 5, width: 10, height: 10, borderRadius: 5, background: BAR, opacity: ease(frame, userAt, 8) }} />

        {/* ── The items: embeddings, then scores, then the ten closest ── */}
        {ROWS_DRAWN.map((row, r) => {
          const shown = ease(frame, itemsAt + r * 0.6, 8);
          if (shown <= 0) return null;
          const m = ease(frame, sweepFrom + r * sweepStep, 8);
          const rank = TOP.indexOf(r);
          const l = rank >= 0 ? lift(rank) : 0;
          const top0 = colTop + r * pitch;
          const x = COL_X + (TOP_X - COL_X) * l;
          const yy = top0 + (rank >= 0 ? (topTop + rank * topPitch - top0) * l : 0);
          const rest = rank < 0 ? 1 - 0.55 * lifted : 1;
          return (
            <React.Fragment key={r}>
              {m < 1 ? (
                <div style={{ position: "absolute", left: COL_X, top: top0, display: "flex", gap: 2, opacity: shown * (1 - m) }}>
                  {row.shades.map((s, k) => (
                    <div key={k} style={{ width: segW - 2, height: rowH, background: ds("blue", s), borderRadius: 1 }} />
                  ))}
                </div>
              ) : null}
              {m > 0 ? (
                <div
                  style={{
                    position: "absolute",
                    left: x,
                    top: yy,
                    width: row.score * COL_W * m,
                    height: rowH + 2 * l,
                    background: rank >= 0 && l > 0.5 ? BAR : ds("blue", 300),
                    borderRadius: 2,
                    opacity: m * rest,
                  }}
                />
              ) : null}
            </React.Fragment>
          );
        })}
        {/* The sweep: the user's vector scored against row after row. */}
        {frame >= sweepFrom && frame < sweepFrom + ROWS * sweepStep + 14 ? (
          <div
            style={{
              position: "absolute",
              left: COL_X - 10,
              top: colTop + Math.min(ROWS - 1, (frame - sweepFrom) / sweepStep) * pitch - 4,
              width: COL_W + 20,
              height: rowH + 8,
              borderRadius: 3,
              background: `color-mix(in srgb, ${ds("yellow", 400)} 70%, transparent)`,
              opacity: 1 - ease(frame, sweepFrom + ROWS * sweepStep, 12),
            }}
          />
        ) : null}
        <Line at={itemsAt} x={COL_X} y={colTop + ROWS * pitch + h(16)} size={23}>
          <span style={{ color: BLUE_INK }}>{int(VECTOR.items)} items</span>
          <Fade at={embAt}>, an embedding each</Fade>
        </Line>
        <Line at={scoreAt + 6} x={COL_X} y={colTop - h(46)} size={23} color={INK_SOFT}>
          scored against the user
        </Line>
        <Line at={closestAt + 6} x={TOP_X} y={topTop - h(46)} size={23} color={BLUE_INK}>
          ten closest
        </Line>

        {/* ── A few lines of NumPy, and what the round asks of them ── */}
        <Listing lines={LINES} x={1050} top={listTop} size={24} at={linesAt} lineAt={LINES.map((_, i) => linesAt + 2 + i * 5)} />
        <Line at={costAt - 2} x={1050} y={listBottom + h(28)} size={25}>
          What they <Mark at={costAt + 4}>cost</Mark>, and where they <Mark at={breakAt} color={MARK_BAD}>break</Mark>
        </Line>

        {/* ── The round in one line ── */}
        <Line at={normalAt} x={X0} y={y(760)} size={26}>
          A normal data-structures interview, pointed at machine learning
        </Line>
        <div style={{ position: "absolute", left: X0, top: discTop, display: "flex", gap: 12 }}>
          {Array.from({ length: 15 }, (_, i) => {
            const worked = i < 10;
            const shown = ease(frame, fifteenAt + i * 1.5, 8);
            const tone = worked && frame >= tenAt + i ? "blue" : "gray";
            const b = badgeStyle(tone, 20);
            return (
              <div
                key={i}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: b.background,
                  color: b.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  ...label(20, b.color as string),
                  fontWeight: 600,
                  opacity: shown,
                  transform: `scale(${0.7 + 0.3 * shown})`,
                }}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: X0, top: discTop + h(58), width: 10 * 52 - 12, textAlign: "center", ...note(22, INK), opacity: ease(frame, tenAt + 4, 10) }}>
          worked through
        </div>
        <div style={{ position: "absolute", left: X0 + 10 * 52, top: discTop + h(58), width: 5 * 52 - 12, textAlign: "center", ...note(22, INK_SOFT), opacity: ease(frame, fiveAt + 2, 10) }}>
          quick
        </div>

        <Spot id={ART.frog.id} at={from + 6} left={1380} top={y(600)} {...frog} />
      </Drift>
    </AbsoluteFill>
  );
};
