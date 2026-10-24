import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { CACHE_LEVER, int, NAME, OUTPUT_WORTH, PRICES, ROUTE, THINKING, usd } from "./data";
import {
  Arrow,
  CACHED,
  CACHED_INK,
  COST,
  FIG_Y,
  HBar,
  Headline,
  INPUT,
  Kicker,
  Marked,
  OUTPUT,
  POINT,
  POINT_INK,
  pulse,
  Spot,
  THINK_FILL,
  X0,
} from "./parts";

const LIST_Y0 = 362;
const LIST_DY = 72;
const TEXT_X = X0 + 58;
const RX = 1090;
const F12_ROW_Y0 = 356;
const F12_DY = 60;
const F12_BAR_X = 1310;
const F12_MAX = 316;
const F13_Y = 668;
const F13_BAR_X = 1240;
const F13_MAX = 420;
const F9_MAX = 460;

/**
 * Part 3: the lesson's six levers, in its order, each arriving on its
 * ordinal. The first two carry their numbers beside the list (routing the
 * lesson's classification workload, and caching the 40-turn chat); the rest
 * are said as the list builds. "Passes" is marked where it is said twice,
 * and the bridge to Unit 5 picks it up.
 */
export const LeversScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const leversFrom = n.beat("levers").from;
  const sixAt = n.word("levers", "Six levers");
  const orderAt = n.word("levers", "order");
  const firstAt = n.word("route", "First");
  const cheapestAt = n.word("route", "cheapest model");
  const fiftyAt = n.word("route-cost", "Fifty thousand");
  const fourThousandAt = n.word("route-cost", "four thousand");
  const hundredOneAt = n.word("route-cost", "a hundred and one");
  const haikuAt = n.word("route-cost", "Haiku");
  const secondAt = n.word("cache", "Second");
  const neverAt = n.word("cache", "never changes");
  const stableAt = n.word("cache", "stable prefix");
  const fortyAt = n.word("cache", "forty-turn chat");
  const dollarAt = n.word("cache", "dollar nineteen");
  const twentySixAt = n.word("cache", "twenty-six cents");
  const thirdAt = n.word("output", "Third");
  const fiveAt = n.word("output", "five input");
  const fourthAt = n.word("effort", "Fourth");
  const effortWordAt = n.word("effort", "reasoning effort");
  const budgetAt = n.word("effort", "thinking budget");
  const lowestAt = n.word("effort", "lowest level");
  const resendAt = n.word("cache-resend", "resend");
  const readsAt = n.word("cache-resend", "reads it back");
  const allAt = n.word("cache-resend", "all");
  const recognizesAt = n.word("cache-resend", "recognizes");
  const fifthAt = n.word("batch", "Fifth");
  const nobodyAt = n.word("batch", "nobody's");
  const halfAt = n.word("batch", "half off");
  const thenAt = n.word("prompt", "only then");
  const twiceAt = n.word("passes", "twice");
  const passesAt = n.word("passes", "passes");
  const unlessAt = n.word("retrieval", "Unless");
  const documentAt = n.word("retrieval", "whole document");
  const everyTurnAt = n.word("retrieval", "every turn");
  const threeAt = n.word("retrieval", "three paragraphs");
  const retrievalAt = n.word("retrieval", "retrieval problem");
  const topAt = n.word("retrieval", "top");
  const passesFrom = n.beat("passes").from;
  const whatAt = n.word("next", "Passes what");
  const testAt = n.word("next", "test");
  const nextAt = n.word("next", "next");

  const ordinalAt = [firstAt, secondAt, thirdAt, fourthAt, fifthAt, thenAt];
  const levers: React.ReactNode[] = [
    <>
      Route to the cheapest model that <Marked at={passesAt - 2}>passes</Marked>
    </>,
    <>
      Cache the <Marked at={stableAt - 2}>stable prefix</Marked>
    </>,
    <>Cut output, not input</>,
    <>
      Lower reasoning effort, to the lowest level that <Marked at={passesAt + 4}>passes</Marked>
    </>,
    <>
      Batch anything <Marked at={nobodyAt - 2}>not interactive</Marked>
    </>,
    <>Then optimize the prompt</>,
  ];
  const listY = (i: number) => y(LIST_Y0 + i * LIST_DY);
  const active = ordinalAt.reduce((acc, at, i) => (frame >= at - 4 ? i : acc), -1);
  const figsOut = thirdAt - 6;

  // Fig. 12: the routing workload on each tier.
  const maxRoute = Math.max(...ROUTE.tiers.map((t) => t.month));
  const opusRow = ROUTE.tiers.findIndex((t) => t.model === "opus");
  const haikuRow = ROUTE.tiers.findIndex((t) => t.model === "haiku");
  const f12Y = (i: number) => y(F12_ROW_Y0 + i * F12_DY);
  const markAt: Record<string, number> = { opus: fourThousandAt - 2, haiku: hundredOneAt - 2 };

  return (
    <AbsoluteFill>
      {/* ── Sound: each lever, the routing bars, the cache bars, the bridge ── */}
      <Sfx name="el-pop" at={sixAt - 6} level={-31} />
      {ordinalAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at - 4} level={-28} />
      ))}
      <Sfx name="el-whoosh" at={fiftyAt - 2} level={-35} />
      <Sfx name="el-pencil" at={haikuAt - 4} level={-35} />
      <Sfx name="el-tap" at={twentySixAt - 2} level={-29} />
      <Sfx name="el-pop" at={thirdAt - 4} level={-32} />
      <Sfx name="el-pop" at={documentAt - 6} level={-32} />
      <Sfx name="el-whoosh" at={threeAt + 6} level={-35} />
      <Sfx name="el-pencil" at={topAt - 4} level={-35} />
      <Sfx name="el-pencil" at={passesAt - 4} level={-35} />
      <Sfx name="el-pencil" at={nextAt - 8} level={-36} />

      <Kicker at={leversFrom - 10}>Controlling it</Kicker>
      <Headline at={leversFrom - 6} second={orderAt - 4} italic="biggest first.">
        Six levers,
      </Headline>

      {/* ── Fig. 11: the list ── */}
      <FigLabel n="11" title="The six levers, in order of what they usually save" at={sixAt - 4} x={X0} y={y(FIG_Y)} />
      {levers.map((text, i) => {
        const ry = listY(i);
        const at = ordinalAt[i];
        // Slots wait faintly from "Six levers", each inks fully on its ordinal.
        const slot = ease(frame, sixAt + i * 3, 10);
        const lit = i === active ? 1 : 0;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: X0 - 26,
                top: ry + 4,
                width: 6,
                height: 34,
                borderRadius: 3,
                background: POINT,
                // The active lever, and the two that end on "passes" when the word comes back.
                opacity: Math.max(ease(frame, at - 4, 8) * lit, i === 0 || i === 3 ? pulse(frame, twiceAt - 2, 40) : 0),
              }}
            />
            <div style={{ position: "absolute", left: X0, top: ry, opacity: slot * 0.25 * (1 - ease(frame, at - 6, 8)) }}>
              <span style={{ ...label(32, INK_SOFT), fontWeight: 700 }}>{i + 1}</span>
            </div>
            <Ink at={at - 6} dur={14} style={{ left: X0, top: ry, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 24 }}>
              <span style={{ ...label(32, POINT_INK), fontWeight: 700, width: 34 }}>{i + 1}</span>
              <span style={{ ...body(32), color: INK }}>{text}</span>
            </Ink>
          </React.Fragment>
        );
      })}
      {/* Lever 3: one output token is worth five input ones. */}
      <Note at={fiveAt - 4} x={TEXT_X + 360} y={listY(2) + 6}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Square color={OUTPUT} glow={pulse(frame, fiveAt + 8, 20)} />
          <span style={{ ...note(26, INK_SOFT), margin: "0 8px" }}>=</span>
          {Array.from({ length: OUTPUT_WORTH }, (_, k) => (
            <Square key={k} color={INPUT} glow={pulse(frame, fiveAt + 4 + k * 3, 16)} />
          ))}
        </span>
      </Note>
      {/* Lever 6's exception: a whole document pasted every turn is a retrieval problem. */}
      <Arrow from={[TEXT_X + 392, listY(5) + 36]} to={[TEXT_X + 392, listY(5) + 4]} at={topAt - 4} dur={10} color={POINT_INK} width={2.6} />
      <Note at={topAt - 2} x={TEXT_X + 410} y={listY(5) + 6}>
        <span style={{ ...note(25, POINT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>retrieval goes to the top</span>
      </Note>
      {/* Fig. 14 makes way at "passes", and the levers come back for the close. */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, passesFrom + 4, 12) }}>
        <RetrievalFig
          at={unlessAt - 4}
          documentAt={documentAt}
          everyTurnAt={everyTurnAt}
          threeAt={threeAt}
          retrievalAt={retrievalAt}
          x={RX}
        />
      </div>
      <Spot id="levers" at={passesFrom + 18} left={1130} top={y(318)} width={600} height={433} />

      {/* Lever 5: about half off. */}
      <Note at={halfAt - 4} x={TEXT_X + 460} y={listY(4) + 8}>
        <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>about half off</span>
      </Note>

      {/* ── The art, while no figure needs the right half ── */}
      <Spot id="levers" at={sixAt - 6} out={firstAt - 6} left={1130} top={y(318)} width={600} height={433} />
      <Spot id="levers" at={figsOut + 12} out={effortWordAt - 8} left={1130} top={y(318)} width={600} height={433} />

      {/* ── Fig. 9 again, for lever 4: the thinking budget turned down ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, unlessAt - 8, 10) }}>
        <FigLabel n="9" title={`Cost of one request on ${NAME.sonnet}`} at={effortWordAt - 4} x={RX} y={y(FIG_Y)} />
        {[
          { row: THINKING.rows[THINKING.rows.length - 1], at: budgetAt - 4, y: 400, dim: lowestAt + 6 },
          { row: THINKING.rows[0], at: lowestAt - 2, y: 540, dim: undefined },
        ].map(({ row, at, y: ly, dim }) => {
          const ry = y(ly);
          const sonnet = PRICES.sonnet;
          const inC = (THINKING.in / 1e6) * sonnet.in;
          const ansC = (THINKING.visible / 1e6) * sonnet.out;
          const thinkC = (row.thinking / 1e6) * sonnet.out;
          const maxC = THINKING.rows[THINKING.rows.length - 1].cost;
          const px = (v: number) => (v / maxC) * F9_MAX;
          const fade = dim === undefined ? 1 : 1 - ease(frame, dim, 14) * 0.6;
          return (
            <div key={row.thinking} style={{ position: "absolute", inset: 0, opacity: fade }}>
              <Note at={at} x={RX} y={ry - 40}>
                <span style={{ ...note(25, INK), ...TABULAR, whiteSpace: "nowrap" }}>{int(row.thinking)} thinking tokens</span>
              </Note>
              <HBar x={RX} y={ry} w={px(inC)} h={h(40)} at={at} dur={6} fill={INPUT} radius={2} />
              <HBar x={RX + px(inC)} y={ry} w={px(ansC)} h={h(40)} at={at + 2} dur={6} fill={OUTPUT} radius={2} />
              {row.thinking > 0 ? (
                <HBar x={RX + px(inC + ansC)} y={ry} w={px(thinkC)} h={h(40)} at={at + 4} dur={16} fill={THINK_FILL} radius={2} />
              ) : null}
              <Note at={at + 12} x={RX + px(inC + ansC + thinkC) + 14} y={ry + h(20) - 19}>
                <span style={{ display: "flex", alignItems: "baseline", gap: 12, whiteSpace: "nowrap" }}>
                  <span style={{ ...note(23, INK_SOFT), ...TABULAR }}>{usd(row.cost, 5)}</span>
                  <span style={{ ...note(28, INK), fontWeight: 700, ...TABULAR }}>{row.times.toFixed(1)}x</span>
                </span>
              </Note>
            </div>
          );
        })}
        <Arrow from={[RX - 22, y(400) + 8]} to={[RX - 22, y(540) + 40]} at={lowestAt - 4} dur={14} color={POINT_INK} width={2.6} />
      </div>

      {/* ── Fig. 12: one workload routed ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, figsOut, 12) }}>
        <FigLabel n="12" title={`${int(ROUTE.perDay)} classifications a day, per month`} at={cheapestAt - 2} x={RX} y={y(FIG_Y)} />
        {ROUTE.tiers.map((t, i) => {
          const ry = f12Y(i);
          const w = Math.max(3, (t.month / maxRoute) * F12_MAX);
          const at = fiftyAt + i * 4;
          return (
            <React.Fragment key={t.model}>
              <Note at={cheapestAt + 2 + i * 3} x={RX} y={ry}>
                <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>{NAME[t.model]}</span>
              </Note>
              <HBar x={F12_BAR_X} y={ry + 4} w={w} h={h(24)} at={at} dur={18} fill={COST} />
              <Note at={at + 10} x={F12_BAR_X + w + 12} y={ry}>
                <span style={{ ...note(23, markAt[t.model] ? POINT_INK : INK), fontWeight: markAt[t.model] ? 700 : 500, ...TABULAR, whiteSpace: "nowrap" }}>
                  {markAt[t.model] ? <Marked at={markAt[t.model]}>{usd(t.month)}</Marked> : usd(t.month)}
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        <Arrow
          from={[RX - 22, f12Y(opusRow) + 16]}
          to={[RX - 22, f12Y(haikuRow) + 20]}
          at={haikuAt - 4}
          dur={14}
          color={POINT_INK}
          width={2.6}
        />
        <Note at={haikuAt + 6} x={RX} y={f12Y(ROUTE.tiers.length) - 4}>
          <span style={{ ...note(25, POINT_INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>
            Routed to {NAME.haiku}: {usd(ROUTE.saving)} a month saved
          </span>
        </Note>

        {/* Still resent in full: the provider recognises the prefix and reads it back. */}
        <Note at={resendAt - 4} x={RX} y={y(F13_Y + 168)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            every turn still sent in full
            <span style={{ opacity: ease(frame, readsAt - 6, 12), color: CACHED_INK }}>, the prefix read back</span>
          </span>
        </Note>

        {/* ── Fig. 13: the 40-turn chat, cached ── */}
        <FigLabel n="13" title={`The ${CACHE_LEVER.turns}-turn chat, ${NAME.sonnet}`} at={fortyAt - 6} x={RX} y={y(F13_Y)} />
        {[
          { name: "no cache", value: CACHE_LEVER.plain, fill: COST, ink: INK, at: dollarAt - 4 },
          { name: "cached", value: CACHE_LEVER.cached, fill: CACHED, ink: CACHED_INK, at: twentySixAt - 4 },
        ].map((r, i) => {
          const ry = y(F13_Y + 60 + i * 54);
          const w = (r.value / CACHE_LEVER.plain) * F13_MAX;
          return (
            <React.Fragment key={r.name}>
              <Note at={r.at - 4} x={RX} y={ry}>
                <span style={{ ...note(23, r.ink), fontWeight: 650, whiteSpace: "nowrap" }}>{r.name}</span>
              </Note>
              {/* "Resend it all" swells the full bar; "recognizes" swells the cached one. */}
              <HBar
                x={F13_BAR_X}
                y={ry + 4}
                w={w}
                h={h(24)}
                at={r.at}
                dur={16}
                fill={r.fill}
                style={{ transform: `scaleY(${1 + pulse(frame, (i === 0 ? allAt : recognizesAt) - 2, 24) * 0.45})` }}
              />
              <Note at={r.at + 6} x={F13_BAR_X + w + 12} y={ry}>
                <span style={{ ...note(24, INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>
                  {usd(r.value)}
                  {i === 1 ? <span style={{ color: CACHED_INK, marginLeft: 14 }}>{Math.round(CACHE_LEVER.saved * 100)}% less</span> : null}
                </span>
              </Note>
            </React.Fragment>
          );
        })}
      </div>

      {/* The stable part first: a reminder, on lever 2, of what that means. */}
      <Note at={neverAt - 2} x={TEXT_X + 380} y={listY(1) + 8} out={figsOut}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>stable content first</span>
      </Note>

      {/* "Passes what?" */}
      <Note at={whatAt - 2} x={TEXT_X} y={listY(6) - 6}>
        <span style={{ ...body(30, true), color: POINT_INK }}>
          Passes what? <span style={{ opacity: ease(frame, testAt - 4, 12) }}>A test.</span>
        </span>
      </Note>
      <NextLine at={nextAt - 4} x={X0} y={y(LIST_Y0 + 6 * LIST_DY + 52)} width={980}>
        measuring whether a model is good enough
      </NextLine>
    </AbsoluteFill>
  );
};

/** One token, drawn as a small square in its side's color. */
const Square: React.FC<{ color: string; glow?: number }> = ({ color, glow = 0 }) => (
  <span
    style={{
      display: "inline-block",
      width: 26,
      height: 26,
      borderRadius: 4,
      background: `color-mix(in srgb, ${color} ${Math.round(80 + glow * 20)}%, ${PAPER})`,
      transform: `scale(${1 + glow * 0.15})`,
    }}
  />
);

/** Paragraph widths in Fig. 14's document, as shares of the card: drawn, not
 *  measured (the lesson gives the document no size). */
const PARAS = [0.94, 0.82, 0.9, 0.7, 0.88, 0.96, 0.76, 0.86, 0.66, 0.92, 0.8, 0.9, 0.72, 0.84];
/** The three paragraphs the question needs. */
const NEEDED = [3, 4, 9];

/**
 * Fig. 14: a whole document pasted into every prompt, when three of its
 * paragraphs would do. The paragraphs ink in as the document is named, the
 * card swells on "every turn", the three needed light up while the rest fall
 * back, and move to a card of their own, labelled as retrieval.
 */
const RetrievalFig: React.FC<{
  at: number;
  documentAt: number;
  everyTurnAt: number;
  threeAt: number;
  retrievalAt: number;
  x: number;
}> = ({ at, documentAt, everyTurnAt, threeAt, retrievalAt, x }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const cardW = 300;
  const top = y(352);
  const paraH = h(15);
  const gap = h(13);
  const pad = 18;
  const cardH = pad * 2 + PARAS.length * paraH + (PARAS.length - 1) * gap;
  const inner = cardW - pad * 2;
  const paraY = (i: number) => top + pad + i * (paraH + gap);
  const lit = ease(frame, threeAt - 2, 12);
  const swell = pulse(frame, everyTurnAt - 2, 24);
  const smallX = x + cardW + 110;
  const smallW = 270;
  const smallH = pad * 2 + NEEDED.length * paraH + (NEEDED.length - 1) * gap;
  const smallTop = paraY(NEEDED[0]) - pad - h(10);
  const moved = ease(frame, threeAt + 8, 16);
  return (
    <>
      <FigLabel n="14" title="A whole document, pasted into every prompt" at={at} x={x} y={y(FIG_Y)} />
      <div
        style={{
          position: "absolute",
          left: x,
          top,
          width: cardW,
          height: cardH,
          boxSizing: "border-box",
          borderRadius: 8,
          border: `2px solid color-mix(in srgb, ${INK} 45%, transparent)`,
          background: PAPER,
          opacity: ease(frame, documentAt - 6, 10),
          transform: `scale(${1 + swell * 0.03})`,
          transformOrigin: "50% 50%",
        }}
      />
      {PARAS.map((w, i) => {
        const needed = NEEDED.includes(i);
        const p = ease(frame, documentAt - 2 + i, 6);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + pad,
              top: paraY(i),
              width: inner * w * p,
              height: paraH,
              borderRadius: 3,
              background: needed
                ? `color-mix(in srgb, ${ds("yellow", 500)} ${Math.round(lit * 100)}%, color-mix(in srgb, ${INK} 30%, ${PAPER}))`
                : `color-mix(in srgb, ${INK} ${Math.round(30 - lit * 18)}%, ${PAPER})`,
            }}
          />
        );
      })}
      <Note at={documentAt + 6} x={x} y={top + cardH + 14}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
          the whole document
          <span style={{ color: INK, fontWeight: 600, opacity: ease(frame, everyTurnAt - 4, 12) }}>, sent every turn</span>
        </span>
      </Note>
      {/* The three it needs, on a card of their own. */}
      <Arrow
        from={[x + cardW + 14, smallTop + smallH / 2]}
        to={[smallX - 14, smallTop + smallH / 2]}
        at={threeAt + 6}
        dur={12}
        color={INK}
        width={2.4}
      />
      <div
        style={{
          position: "absolute",
          left: smallX,
          top: smallTop,
          width: smallW,
          height: smallH,
          boxSizing: "border-box",
          borderRadius: 8,
          border: `2px solid ${POINT}`,
          background: PAPER,
          opacity: moved,
        }}
      />
      {NEEDED.map((i, k) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: smallX + pad,
            top: smallTop + pad + k * (paraH + gap),
            width: (smallW - pad * 2) * PARAS[i] * moved,
            height: paraH,
            borderRadius: 3,
            background: ds("yellow", 500),
          }}
        />
      ))}
      <Note at={threeAt + 10} x={smallX} y={smallTop + smallH + 14}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>three paragraphs would do</span>
      </Note>
      <Note at={retrievalAt - 2} x={smallX} y={smallTop - 42}>
        <span style={{ ...note(24, POINT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>retrieval: send only these</span>
      </Note>
    </>
  );
};
