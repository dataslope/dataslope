import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { FUNNEL } from "./data";
import { commas, Drift, Fade, Line, LIT_LINE, Mark, MiniMap, OK, OK_INK, Q_SIZE, Q_W, seeded, Spot, Svg, Tag, X0 } from "./parts";

/** The funnel's centre line and its stages' widths, top to bottom. */
const FX = 420;
const WIDTHS = [600, 430, 270, 130];
const STAGE_H = 66;
const STAGE_GAP = 14;
const TEXT_X = 790;
/** The interaction grid: past users by items, a new user and a new item. */
const GRID = { x: 290, users: 8, items: 10, cell: 34, step: 41 };
const RIGHT_X = 860;

/**
 * Questions 10 and 11. A recommender is a funnel: retrieval narrows millions
 * of items to a few hundred candidates with a light model over embeddings,
 * a heavier ranker scores those, re-ranking applies business rules, and the
 * ranker's versions meet in A B tests. Why two stages: ten million items is
 * twenty thousand times the work of five hundred (the video's round numbers
 * for the page's millions and hundreds). Then cold start: a new user's row
 * and a new item's column, empty; content and popularity fill in, a hybrid
 * learns the blend; and a new item never shown never earns a click until it
 * is shown on purpose.
 */
export const RecScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q10").from;
  const qAt = n.word("q10", "Questions ten and eleven");
  const textAt = n.word("q10", "Sketch a recommendation or ranking system");
  const q11At = n.word("q10", "And how do you handle the cold-start problem");
  const funnelAt = n.word("q10", "The standard design is a funnel");
  const retrievalAt = n.word("q10-retrieve", "Retrieval");
  const lightAt = n.word("q10-retrieve", "a light model searching embeddings");
  const millionsAt = n.word("q10-retrieve", "narrows millions of items");
  const hundredAt = n.word("q10-retrieve", "a few hundred candidates");
  const rankingAt = n.word("q10-rank", "Ranking, a heavier model");
  const scoresAt = n.word("q10-rank", "scores each candidate's chance");
  const rerankAt = n.word("q10-rank", "Re-ranking applies business rules");
  const abAt = n.word("q10-rank", "Versions of the ranker are compared");
  const costAt = n.word("q10-why", "cost grows with every item it scores");
  const tenAt = n.word("q10-why", "Ten million items");
  const timesAt = n.word("q10-why", "twenty thousand times the work");
  const candAt = n.word("q10-why", "the work of five hundred");
  const onlyAt = n.word("q10-why", "it only ever sees the five hundred");
  const coldAt = n.word("q10-cold", "Cold start is a new user or item");
  const itemAt = n.word("q10-cold", "or item with no history");
  const nothingAt = n.word("q10-cold", "nothing to embed");
  const contentAt = n.word("q10-cold", "Fall back to content");
  const metaAt = n.word("q10-cold", "item metadata");
  const prefAt = n.word("q10-cold", "preferences asked for at sign-up");
  const popularAt = n.word("q10-cold", "what's popular");
  const hybridAt = n.word("q10-cold", "A hybrid blends both signals");
  const neverAt = n.word("q10-loop", "a new item that's never shown");
  const loopAt = n.word("q10-loop", "question eight's loop again");
  const purposeAt = n.word("q10-loop", "some exposure on purpose");
  const end = n.beat("q10-loop").to;

  // ── The funnel ──
  const stageTop = (i: number) => y(370) + i * (h(STAGE_H) + STAGE_GAP);
  const stageAt = [lightAt, rankingAt, rerankAt];
  const stageLit = (i: number) =>
    i === 1 ? Math.max(Math.min(ease(frame, rankingAt, 10), 1 - ease(frame, rerankAt, 10)), Math.min(ease(frame, costAt, 10), 1 - ease(frame, coldAt, 10))) : i === 0 ? Math.min(ease(frame, lightAt, 10), 1 - ease(frame, rankingAt, 10)) : Math.min(ease(frame, rerankAt, 10), 1 - ease(frame, abAt, 10));
  const trapezoid = (i: number) => {
    const t = stageTop(i);
    const b = t + h(STAGE_H);
    const w0 = WIDTHS[i] / 2;
    const w1 = WIDTHS[i + 1] / 2;
    return `M${FX - w0},${t} L${FX + w0},${t} L${FX + w1},${b} L${FX - w1},${b} Z`;
  };

  // ── The grid ──
  const cells = React.useMemo(() => {
    const u = seeded(31);
    return Array.from({ length: GRID.users * GRID.items }, () => u());
  }, []);
  const gx = (c: number) => GRID.x + c * GRID.step;
  const gy = (r: number) => y(372) + r * GRID.step;
  const newUser = GRID.users - 1;
  const newItem = GRID.items - 1;
  const userLit = Math.min(ease(frame, coldAt, 10), 1 - ease(frame, itemAt + 20, 12) * 0.5);
  const itemLit = ease(frame, itemAt, 10) * (1 - ease(frame, hybridAt, 12) * 0.5);
  // Interactions keep arriving for the shown items while the new one waits.
  const more = ease(frame, neverAt, 60);
  const cellState = (r: number, c: number): "none" | "past" | "guess" | "shown" => {
    const v = cells[r * GRID.items + c];
    if (r === newUser && c === newItem) return ease(frame, popularAt + 8, 8) > 0.5 && v < 0.5 ? "guess" : "none";
    if (c === newItem) {
      if (ease(frame, purposeAt + 6 + r * 3, 8) > 0.5 && v < 0.55) return "shown";
      return ease(frame, metaAt + 4 + r * 2, 8) > 0.5 && v < 0.35 ? "guess" : "none";
    }
    if (r === newUser) {
      if (ease(frame, prefAt + 4 + c * 2, 8) > 0.5 && v < 0.3) return "guess";
      if (ease(frame, popularAt + 4 + c, 8) > 0.5 && c < 3) return "guess";
      return "none";
    }
    return v < 0.38 + 0.2 * more * (v > 0.38 ? 1 : 0) ? "past" : "none";
  };
  const fill = { none: ds("gray", 100), past: BAR, guess: ds("blue", 200), shown: OK };
  const gridOn = ease(frame, coldAt - 6, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={funnelAt} level={-30} />
      <Sfx name="el-tap" at={retrievalAt} level={-31} />
      <Sfx name="el-tap" at={hundredAt} level={-31} />
      <Sfx name="el-tap" at={rankingAt} level={-31} />
      <Sfx name="el-tap" at={rerankAt} level={-31} />
      <Sfx name="el-tap" at={abAt} level={-32} />
      <Sfx name="el-whoosh" at={tenAt} level={-36} />
      <Sfx name="el-tap" at={timesAt} level={-30} />
      <Sfx name="el-sprinkle" at={coldAt} level={-33} />
      <Sfx name="el-tap" at={metaAt} level={-31} />
      <Sfx name="el-tap" at={prefAt} level={-31} />
      <Sfx name="el-tap" at={popularAt} level={-31} />
      <Sfx name="el-chime" at={hybridAt + 20} level={-33} />
      <Sfx name="el-scratch" at={loopAt} level={-34} />
      <Sfx name="el-sprinkle" at={purposeAt + 6} level={-32} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={10} kicker="Questions 10 and 11" at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          Sketch a recommendation / ranking system.{" "}
          <span style={{ opacity: ease(frame, q11At, 14) }}>And how do you handle the cold-start problem?</span>
        </QuestionCard>
        <MiniMap
          at={qAt}
          store
          lit={[
            ["model", qAt + 10],
            ["features", coldAt],
            ["labels", neverAt],
          ]}
        />

        {/* ── The funnel ── */}
        <Fade out={coldAt - 4}>
          <Line at={millionsAt} x={FX} y={stageTop(0) - h(46)} size={22} color={BLUE_INK} align="center" width={400}>
            Millions of items
          </Line>
          <Svg>
            {[0, 1, 2].map((i) => {
              const p = ease(frame, stageAt[i], 14);
              if (p <= 0) return null;
              const lit = stageLit(i);
              return (
                <path
                  key={i}
                  d={trapezoid(i)}
                  fill={HIGHLIGHT}
                  fillOpacity={lit}
                  stroke={`color-mix(in srgb, ${LIT_LINE} ${lit * 100}%, ${INK})`}
                  strokeWidth={2 + lit * 1.5}
                  strokeLinejoin="round"
                  opacity={p}
                />
              );
            })}
          </Svg>
          {[
            { t: "Retrieval", at: retrievalAt },
            { t: "Ranking", at: rankingAt },
            { t: "Re-ranking", at: rerankAt },
          ].map((s, i) => (
            <Line key={s.t} at={s.at} x={FX} y={stageTop(i) + h(STAGE_H) / 2 - 15} size={22} align="center" width={240}>
              {s.t}
            </Line>
          ))}
          <Line at={rerankAt + 14} x={FX} y={stageTop(3) + 4} size={22} align="center" width={240}>
            Final list
          </Line>
          {/* What each stage is. */}
          <Line at={lightAt} x={TEXT_X} y={stageTop(0) + 2} size={21}>
            A light model: nearest neighbors over embeddings
          </Line>
          <Line at={hundredAt} x={TEXT_X} y={stageTop(0) + 36} size={21} color={BLUE_INK}>
            Down to a few hundred candidates
          </Line>
          <Line at={rankingAt} x={TEXT_X} y={stageTop(1) + 2} size={21}>
            A heavier model, rich cross features
          </Line>
          <Line at={scoresAt} x={TEXT_X} y={stageTop(1) + 36} size={21} color={INK_SOFT}>
            Scores each one&apos;s chance of a click or a purchase
          </Line>
          <Line at={rerankAt + 6} x={TEXT_X} y={stageTop(2) + 2} size={21}>
            Business rules: diversity, freshness, promotions
          </Line>
          <Line at={abAt} x={TEXT_X} y={stageTop(2) + 36} size={21} color={INK_SOFT}>
            Ranker versions compared in A/B tests on revenue or engagement
          </Line>
          <Spot id="funnel" at={funnelAt} x={1600} y={y(330)} w={160} />

          {/* Why two stages: the heavy model's work grows with every item. */}
          <Line at={tenAt} x={X0} y={y(732)} size={22}>
            <Num>{commas(FUNNEL.items)}</Num> items
          </Line>
          <div style={{ position: "absolute", left: X0, top: y(732) + 36, width: 2000 * ease(frame, tenAt, 26), height: 26, background: BAR, borderRadius: 4 }} />
          <Line at={candAt} x={X0} y={y(732) + h(84)} size={22} color={ease(frame, onlyAt, 10) > 0.5 ? BLUE_INK : INK}>
            <Num>{FUNNEL.candidates}</Num> candidates
          </Line>
          <div style={{ position: "absolute", left: X0, top: y(732) + h(84) + 36, width: 4 * ease(frame, candAt, 8), height: 26, background: BAR, borderRadius: 2 }} />
          <Ink at={timesAt} dur={12} style={{ left: X0 + 240, top: y(732) + h(84), whiteSpace: "nowrap" }}>
            <span style={{ ...note(22, INK), fontWeight: 500 }}>
              <Mark at={timesAt + 4}>
                <Num>{commas(FUNNEL.ratio)}</Num>× less work for the heavy model
              </Mark>
            </span>
          </Ink>
          <Line at={timesAt + 16} x={X0} y={y(732) + h(84) + 76} size={20} color={INK_SOFT}>
            Round numbers for the page&apos;s millions and hundreds
          </Line>
        </Fade>

        {/* ── Cold start: a new user's row, a new item's column ── */}
        <Fade at={coldAt - 6}>
          <Line at={coldAt - 4} x={GRID.x} y={gy(0) - h(48)} size={21} color={INK_SOFT}>
            Users by items: past clicks and purchases
          </Line>
          <div
            style={{
              position: "absolute",
              left: GRID.x - 8,
              top: gy(newUser) - 6,
              width: GRID.items * GRID.step + 8,
              height: GRID.cell + 12,
              borderRadius: 6,
              background: HIGHLIGHT,
              opacity: userLit * gridOn,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: gx(newItem) - 6,
              top: gy(0) - 8,
              width: GRID.cell + 12,
              height: GRID.users * GRID.step + 8,
              borderRadius: 6,
              background: HIGHLIGHT,
              opacity: itemLit * gridOn,
            }}
          />
          {Array.from({ length: GRID.users }, (_, r) =>
            Array.from({ length: GRID.items }, (_, c) => {
              const st = cellState(r, c);
              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    position: "absolute",
                    left: gx(c),
                    top: gy(r),
                    width: GRID.cell,
                    height: GRID.cell,
                    borderRadius: 4,
                    background: fill[st],
                    opacity: ease(frame, coldAt - 4 + (r + c) * 0.7, 10),
                  }}
                />
              );
            }),
          )}
          <Line at={coldAt + 2} x={GRID.x - 24} y={gy(newUser) + 2} size={21} align="right" width={160}>
            new user
          </Line>
          <Line at={itemAt} x={gx(newItem) + GRID.cell / 2} y={gy(GRID.users - 1) + GRID.step + 10} size={21} align="center" width={160}>
            new item
          </Line>

          <Line at={nothingAt} x={RIGHT_X} y={y(360)} size={24}>
            No history
          </Line>
          <Line at={nothingAt + 4} x={RIGHT_X} y={y(360) + h(40)} size={21} color={INK_SOFT}>
            Collaborative filtering has nothing to embed
          </Line>
          <Line at={contentAt} x={RIGHT_X} y={y(470)} size={22}>
            Fall back to content, or to what&apos;s popular
          </Line>
          <Ink at={metaAt} dur={10} style={{ left: RIGHT_X, top: y(470) + h(46), whiteSpace: "nowrap", display: "flex", gap: 14, fontSize: 21 }}>
            <Tag size={21}>item metadata</Tag>
            <span style={{ opacity: ease(frame, prefAt, 10) }}>
              <Tag size={21}>sign-up preferences</Tag>
            </span>
            <span style={{ opacity: ease(frame, popularAt, 10) }}>
              <Tag size={21}>popular</Tag>
            </span>
          </Ink>
          <Ink at={hybridAt} dur={12} style={{ left: RIGHT_X, top: y(470) + h(110), whiteSpace: "nowrap" }}>
            <span style={{ ...note(22, OK_INK), fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 22 }}>
              <Tick at={hybridAt + 4} size={24} color={OK} />
              Hybrid: both signals, blended with learned weights
            </span>
          </Ink>
          <Line at={neverAt} x={RIGHT_X} y={y(700)} size={22} color={ACCENT_INK}>
            Never shown, so never clicked, so never shown
          </Line>
          <Line at={loopAt} x={RIGHT_X} y={y(700) + h(40)} size={21} color={INK_SOFT}>
            Question 8&apos;s loop again
          </Line>
          <Ink at={purposeAt} dur={12} style={{ left: RIGHT_X, top: y(700) + h(96), whiteSpace: "nowrap" }}>
            <span style={{ ...note(22, OK_INK), fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 10, fontSize: 22 }}>
              <Tick at={purposeAt + 4} size={24} color={OK} />
              Give new items exposure on purpose
            </span>
          </Ink>
          {/* The key to the grid's colors. */}
          <Ink at={metaAt + 10} dur={12} style={{ left: GRID.x, top: gy(GRID.users) + h(56), whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 10, fontSize: 20 }}>
            <span style={{ width: 20, height: 20, borderRadius: 4, background: BAR, display: "inline-block" }} />
            <span style={{ ...label(20, INK_SOFT), marginRight: 18 }}>interaction</span>
            <span style={{ width: 20, height: 20, borderRadius: 4, background: ds("blue", 200), display: "inline-block" }} />
            <span style={{ ...label(20, INK_SOFT) }}>fallback guess</span>
            <span style={{ width: 20, height: 20, borderRadius: 4, background: OK, display: "inline-block", marginLeft: 18, opacity: ease(frame, purposeAt, 10) }} />
            <span style={{ ...label(20, INK_SOFT), opacity: ease(frame, purposeAt, 10) }}>shown on purpose</span>
          </Ink>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
