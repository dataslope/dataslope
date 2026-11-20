import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, Tick, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { Box, Drift, Flow, Headline, Kicker, OK, OK_INK, Spot, X0 } from "./parts";

const LIST_TOP = 346;
const ROW = 64;
const LIST_W = 720;
const R_X = 900;
const R_TOP = 344;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

/** One line of a list on the right, inking in on its words. */
const Item: React.FC<{ x: number; top: number; at: number; color?: string; children: React.ReactNode }> = ({ x, top, at, color = INK, children }) => (
  <Note at={at} x={x} y={top}>
    <span style={{ ...note(22, color), whiteSpace: "nowrap" }}>{children}</span>
  </Note>
);

// ── 11. Controlling cost ────────────────────────────────────────────────────

const Cost: React.FC<{ c: Ctx }> = ({ c }) => {
  const scanAt = c.w("r-cost", "Scan less");
  const pruneAt = c.w("r-cost", "prune");
  const nameAt = c.w("r-cost", "name columns");
  const tablesAt = c.w("r-cost", "store expensive repeated logic as tables");
  const incAt = c.w("r-cost", "build big append-only tables incrementally");
  const computeAt = c.w("r-cost", "Compute less");
  const sizeAt = c.w("r-cost", "right-size");
  const suspendAt = c.w("r-cost", "suspend when idle");
  const adhocAt = c.w("r-cost", "keep ad hoc queries off the production warehouse");
  const starveAt = c.w("r-cost", "so they can't starve the pipelines");
  const top = c.y(R_TOP);
  const step = c.h(48);
  const X2 = 1390;
  return (
    <>
      <ColumnRule x={1357} top={top} height={step * 5} at={computeAt} />
      <Item x={R_X} top={top} at={scanAt}>
        <b>Scan less</b>
      </Item>
      <Item x={R_X} top={top + step} at={pruneAt}>
        Prune
      </Item>
      <Item x={R_X} top={top + step * 2} at={nameAt}>
        Name the columns
      </Item>
      <Item x={R_X} top={top + step * 3} at={tablesAt}>
        Tables, not views, for repeated logic
      </Item>
      <Item x={R_X} top={top + step * 4} at={incAt}>
        Big append-only tables, incrementally
      </Item>
      <Item x={X2} top={top} at={computeAt}>
        <b>Compute less</b>
      </Item>
      <Item x={X2} top={top + step} at={sizeAt}>
        Right-size
      </Item>
      <Item x={X2} top={top + step * 2} at={suspendAt}>
        Suspend when idle
      </Item>
      <Item x={X2} top={top + step * 3} at={adhocAt}>
        Ad hoc queries off production
      </Item>
      <Item x={X2} top={top + step * 4} at={starveAt} color={INK_SOFT}>
        So they can&rsquo;t starve the pipelines
      </Item>
    </>
  );
};

// ── 12. The result cache ────────────────────────────────────────────────────

const Cache: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const storedAt = c.w("r-cache", "returns a stored result");
  const sameAt = c.w("r-cache", "the exact same query");
  const unchangedAt = c.w("r-cache", "over unchanged data");
  const instantAt = c.w("r-cache", "instantly");
  const freeAt = c.w("r-cache", "often for free");
  const rewardsAt = c.w("r-cache", "rewards queries that don't vary");
  const changeAt = c.w("r-cache", "any change to an underlying table");
  const invalidAt = c.w("r-cache", "invalidates it");
  const top = c.y(R_TOP);
  const boxH = c.h(58);
  const cacheX = 1420;
  const cacheW = 300;
  const cacheTop = top + c.h(10);
  const cacheH = c.h(130);
  const changed = changeAt + 2;
  return (
    <>
      <Box x={R_X} y={top} w={380} h={boxH} at={sameAt - 2} title="The same query text" size={22} />
      <Box
        x={R_X}
        y={top + c.h(84)}
        w={380}
        h={boxH}
        at={unchangedAt}
        title={
          <span style={{ display: "grid" }}>
            <span style={{ gridArea: "1 / 1", opacity: 1 - ease(frame, changed, 8) }}>Its tables, unchanged</span>
            <span style={{ gridArea: "1 / 1", opacity: ease(frame, changed, 8) }}>A table changed</span>
          </span>
        }
        size={22}
        tones={[{ at: changed, tone: "bad" }]}
      />
      <Flow points={[[R_X + 392, top + boxH / 2], [cacheX - 14, cacheTop + cacheH * 0.3]]} at={sameAt + 4} width={2.4} head={12} />
      <Flow points={[[R_X + 392, top + c.h(84) + boxH / 2], [cacheX - 14, cacheTop + cacheH * 0.7]]} at={unchangedAt + 4} width={2.4} head={12} />
      <Box x={cacheX} y={cacheTop} w={cacheW} h={cacheH} at={storedAt} title="Result cache" sub="a stored result" size={24} tones={[{ at: instantAt, tone: "ok" }, { at: invalidAt, tone: "bad" }]} />
      <div style={{ opacity: 1 - ease(frame, invalidAt, 10) }}>
        <Item x={R_X} top={top + c.h(196)} at={instantAt} color={OK_INK}>
          <b>Returned at once</b>
          <span style={{ opacity: ease(frame, freeAt, 10) }}>, often for free</span>
        </Item>
      </div>
      <Item x={R_X} top={top + c.h(244)} at={rewardsAt}>
        It rewards queries that don&rsquo;t vary
      </Item>
      <Item x={R_X} top={top + c.h(292)} at={changeAt + 4} color={ACCENT_INK}>
        <b>A table changes:</b>
        <span style={{ opacity: ease(frame, invalidAt, 10) }}> the cached result is invalidated</span>
      </Item>
    </>
  );
};

// ── 13. Distribution and sort keys ──────────────────────────────────────────

const NODE_W = 196;
const NODE_GAP = 32;
const KEYS = [
  { k: "c1", node: 0 },
  { k: "c2", node: 1 },
  { k: "c3", node: 2 },
  { k: "c4", node: 3 },
];

const Dist: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const decidesAt = c.w("r-dist", "decides which node holds each row");
  const joinAt = c.w("r-dist", "distribute on the join key");
  const meetAt = c.w("r-dist", "matching rows meet without a shuffle");
  const sortAt = c.w("r-dist", "A sort key orders rows on disk");
  const rangeAt = c.w("r-dist", "range filters skip blocks");
  const dominatesAt = c.w("r-dist", "a key one value dominates");
  const mostAt = c.w("r-dist", "one node does most of the work");
  const skewAt = c.w("r-dist", "skew");
  const top = c.y(R_TOP);
  const nodeH = c.h(150);
  const nodeX = (i: number) => R_X + i * (NODE_W + NODE_GAP);
  const skew = ease(frame, dominatesAt + 4, 16);
  const SQ = 24;
  // Each node's rows: orders (filled) and its customer (outlined), by key.
  const chip = (node: number, slot: number, filled: boolean, at: number, color: string, keyText?: string) => {
    const p = ease(frame, at, 8);
    if (p <= 0) return null;
    const col = slot % 5;
    const row = Math.floor(slot / 5);
    return (
      <div
        key={`${node}-${slot}-${filled}`}
        style={{
          position: "absolute",
          left: nodeX(node) + 18 + col * (SQ + 9),
          top: top + c.h(56) + row * (SQ + 8),
          width: SQ,
          height: SQ,
          borderRadius: 4,
          boxSizing: "border-box",
          border: `2px solid ${color}`,
          background: filled ? color : "transparent",
          opacity: p,
          transform: `scale(${0.6 + 0.4 * p})`,
          ...label(19, INK),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {keyText ?? null}
      </div>
    );
  };
  return (
    <>
      {KEYS.map((key, i) => (
        <Box
          key={key.k}
          x={nodeX(i)}
          y={top}
          w={NODE_W}
          h={nodeH}
          at={decidesAt - 4 + i * 3}
          title={`Node ${i + 1}`}
          titleTop
          size={22}
          tones={i === 0 ? [{ at: mostAt, tone: "bad" }] : [{ at: dominatesAt + 10, tone: "off" }]}
        />
      ))}
      {/* The join key: each node holds a customer and that customer's orders. */}
      {KEYS.map((key, i) => (
        <React.Fragment key={key.k}>
          <div style={{ opacity: 1 - (i === 0 ? 0 : skew) }}>
            {chip(i, 0, false, joinAt + i * 3, BAR)}
            {chip(i, 1, true, joinAt + 4 + i * 3, BAR)}
            {chip(i, 2, true, joinAt + 6 + i * 3, BAR)}
          </div>
        </React.Fragment>
      ))}
      {/* Skew: one value fills the first node. */}
      {Array.from({ length: 12 }, (_, k) => chip(0, 3 + k, true, dominatesAt + 6 + k * 1.5, ACCENT))}
      <div style={{ opacity: 1 - ease(frame, dominatesAt, 10) }}>
        <Item x={R_X} top={top + nodeH + c.h(16)} at={meetAt} color={OK_INK}>
          <b>Distributed on the join key:</b> matching rows meet, no shuffle
        </Item>
      </div>
      <Item x={R_X} top={top + nodeH + c.h(16)} at={mostAt + 2} color={ACCENT_INK}>
        <b>Skew:</b>
        <span style={{ opacity: ease(frame, skewAt, 10) }}> one value dominates, one node does most of the work</span>
      </Item>
      <Note at={joinAt + 14} x={R_X} y={top + nodeH + c.h(58)} out={dominatesAt}>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.5em", fontSize: 20 }}>
          <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: 3, border: `2px solid ${BAR}` }} /> a customer
          <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: 3, background: BAR, marginLeft: "0.8em" }} /> its orders
        </span>
      </Note>

      {/* The sort key: blocks in order, a range filter reads two. */}
      <Note at={sortAt} x={R_X} y={top + c.h(262)}>
        <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Sort key: blocks in date order</span>
      </Note>
      {Array.from({ length: 12 }, (_, i) => {
        const p = ease(frame, sortAt + 4 + i * 1.5, 10);
        if (p <= 0) return null;
        const hit = i === 4 || i === 5;
        const r = ease(frame, rangeAt + 4, 10);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: R_X + i * 74,
              top: top + c.h(306),
              width: 64,
              height: c.h(40),
              borderRadius: 4,
              background: hit ? `color-mix(in srgb, ${OK} ${Math.round(70 * r)}%, ${ds("blue", 200)})` : ds("blue", 200),
              opacity: p * (hit ? 1 : 1 - 0.6 * r),
              boxShadow: hit && r > 0.5 ? `0 0 0 3px ${HIGHLIGHT}` : undefined,
            }}
          />
        );
      })}
      <Item x={R_X} top={top + c.h(362)} at={rangeAt + 4} color={OK_INK}>
        <b>A range filter reads 2 of 12</b>
        <span style={{ color: INK_SOFT }}>, skipping the rest</span>
      </Item>
    </>
  );
};

/**
 * The quick round: three questions down the left, each read aloud and its
 * answer drawn on the right while it is read, then the bridge into testing
 * with the camel back on the page.
 */
export const RapidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const threeAt = n.word("rapid-in", "Three quick ones");
  const closeAt = n.word("rapid-in", "to close");
  const end = n.beat("next").from - 4;
  const leverAt = n.word("next", "Every lever here makes a model cheaper");
  const rightAt = n.word("next", "None of them makes it right");
  const wrongAt = n.word("next", "a cheap model that's wrong");
  const scanAt = n.word("next", "costs more than any scan");
  const nextAt = n.word("next", "Next:");

  const items: RapidItem[] = [
    { n: 11, label: "How do you control warehouse cost in practice?", at: n.word("r-cost", "Question eleven"), body: <Cost c={c} /> },
    { n: 12, label: "What is a result cache, and how does it help?", at: n.word("r-cache", "Question twelve"), body: <Cache c={c} /> },
    { n: 13, label: "What are distribution and sort keys in Redshift?", at: n.word("r-dist", "Question thirteen"), body: <Dist c={c} /> },
  ];
  const listBottom = y(LIST_TOP) + items.length * h(ROW);

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={threeAt} level={-32} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-32} />
      ))}
      <Sfx name="el-pop" at={leverAt + 4} level={-30} />
      <Sfx name="el-scratch" at={wrongAt + 4} level={-35} />
      <Sfx name="el-pencil" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40}>
        <Kicker at={threeAt}>Quick round</Kicker>
        <Headline lead="Three quick ones" turn="to close." at={threeAt} turnAt={closeAt - 2} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={LIST_W} at={threeAt + 6} end={end} />

        {/* ── The bridge ── */}
        <Spot art="camel" at={leverAt + 4} left={1310} top={y(330)} width={460} />
        <div style={{ position: "absolute", left: X0, top: listBottom + h(60), display: "flex", alignItems: "center", gap: 12, ...note(26, INK), whiteSpace: "nowrap", opacity: ease(frame, leverAt - 2, 12) }}>
          <Tick at={leverAt + 6} size={26} color={OK} />
          <span>Every lever here makes a model cheaper</span>
        </div>
        <Note at={rightAt} x={X0} y={listBottom + h(110)}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>None of them makes it right</span>
        </Note>
        <Note at={wrongAt} x={X0} y={listBottom + h(156)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            A cheap model that&rsquo;s wrong<span style={{ opacity: ease(frame, scanAt, 10) }}> costs more than any scan</span>
          </span>
        </Note>
        <NextLine at={nextAt} x={X0} y={y(800)} width={900}>
          testing and data quality
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
