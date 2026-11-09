import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BAR, INK, INK_SOFT, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { LOYALTY, NOTIFIERS } from "./data";
import { ArtSpot, Box, Drift, Flow, Line, Mark, MARK_BAD, OK, OK_INK, Pill, pulse, Svg, Value, VRule, X0 } from "./parts";

type P = readonly [number, number];
const along = (pts: readonly P[], t: number): P => {
  const segs = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  let d = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i]) {
      const k = segs[i] ? d / segs[i] : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    d -= segs[i];
  }
  return pts[pts.length - 1];
};

/** The three items, in the cart's colors. */
const ITEM_FILL = [ds("yellow", 500), ds("red", 400), ds("blue", 300)];

const CART = { x: X0, w: 800, top: 432, h: 182 };
const CHIP_H = 52;
const ADD_ALL = { x: 150, w: 170 };
const ADD = { x: 400, w: 120 };
const ITEMS = { x: 600, w: 290 };
const CHILD = { x: X0, w: 400, top: 668, h: 86 };
const COUNTER_X = 580;

const RIGHT_X = 1010;
const COUNTER_BOX = { w: 430, top: 432, h: 86 };
const HELD = { top: 610, h: 70 };

const CELL = { w: 200, h: 50 };
const GRID_X = 250;
const GRID_TOP = 490;
const GRID_PITCH = 64;
const PARTS_X = [1010, 1250];
const PART_W = [190, 220];

/**
 * Question 2. The fragile base class on the shop's own cart: a loyalty cart
 * that extends the cart and counts in add counts three items as three, until
 * the cart's add-all stops calling add and the count drops to zero (the run),
 * with the loyalty code untouched. A counter that holds a cart counts three
 * before and after. Then the combinations: a subclass per channel and timing
 * is nine, then twelve; parts are six, then seven, and a customer swaps one
 * at runtime.
 */
export const CompScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("comp").from;
  const qAt = n.word("comp", "Question two");
  const textAt = n.word("comp", "Why favor composition over inheritance?");
  const tiesAt = n.word("comp", "Inheritance ties a subclass");
  const breakUpAt = n.word("comp", "a change upstream can break it");
  const fragileAt = n.word("comp", "the fragile base class problem");
  const extendsAt = n.word("comp-cart", "The shop's loyalty program extends");
  const cartAt = n.word("comp-cart", "the shopping cart");
  const countsAt = n.word("comp-cart", "counts each item as it's added");
  const oneAtATimeAt = n.word("comp-cart", "adds them one at a time");
  const threeAt = n.word("comp-cart", "three items count three");
  const speedsAt = n.word("comp-break", "Then the cart team speeds add-all up");
  const stopsAt = n.word("comp-break", "it stops adding them one at a time");
  const zeroAt = n.word("comp-break", "drops to zero");
  const nobodyAt = n.word("comp-break", "nobody touched the loyalty code");
  const holdsAt = n.word("comp-hold", "Composition holds a cart");
  const ownAt = n.word("comp-hold", "counting in its own methods");
  const promisesAt = n.word("comp-hold", "what the cart promises");
  const beforeAt = n.word("comp-hold", "three before the change");
  const afterAt = n.word("comp-hold", "three after");
  const mixAt = n.word("comp-mix", "It also combines freely");
  const channelsAt = n.word("comp-mix", "email, text or push");
  const timingsAt = n.word("comp-mix", "at one of three timings");
  const nineAt = n.word("comp-mix", "A subclass per pair is nine");
  const fourthAt = n.word("comp-mix", "a fourth channel makes twelve");
  const twelveAt = n.word("comp-mix", "twelve");
  const partsAt = n.word("comp-mix", "Composition gives each notifier");
  const sixAt = n.word("comp-mix", "six parts");
  const sevenAt = n.word("comp-mix", "then seven");
  const customerAt = n.word("comp-mix", "A customer who switches");
  const digestAt = n.word("comp-mix", "to the daily digest");
  const swapsAt = n.word("comp-mix", "swaps one part");
  const runtimeAt = n.word("comp-mix", "at runtime");
  const keepAt = n.word("comp-when", "Keep inheritance for a genuine subtype");
  const genuineAt = n.word("comp-when", "a genuine subtype");
  const end = n.beat("comp-when").to;

  // ── Part A: the cart ──
  const cartTop = y(CART.top);
  const chipTop = cartTop + 72;
  const chipMid = chipTop + CHIP_H / 2;
  const childTop = y(CHILD.top);
  const aOut = mixAt - 6;
  const run1 = [0, 1, 2].map((i) => oneAtATimeAt + 4 + i * 12);
  const path1: P[] = [
    [ADD_ALL.x + ADD_ALL.w / 2, chipMid],
    [ADD.x + ADD.w / 2, chipMid],
    [ITEMS.x + 40 + 0 * 34, chipMid],
  ];
  const DOT_T = 16;
  const passed1 = run1.filter((at) => frame >= at + DOT_T * 0.5).length;
  const landed1 = run1.filter((at) => frame >= at + DOT_T).length;
  // Under the chips, clear of the cart's name: add-all straight into the list.
  const bypassY = chipTop + CHIP_H + 36;
  const path2: P[] = [
    [ADD_ALL.x + ADD_ALL.w / 2, chipTop + CHIP_H + 6],
    [ADD_ALL.x + ADD_ALL.w / 2, bypassY],
    [ITEMS.x + ITEMS.w / 2, bypassY],
    [ITEMS.x + ITEMS.w / 2, chipTop + CHIP_H + 8],
  ];
  const run2 = stopsAt + 6;
  const landed2 = frame >= run2 + 22 ? LOYALTY.inheritsAfter[0] : 0;
  const inCart = frame < speedsAt + 14 ? Math.min(landed1, LOYALTY.inheritsBefore[0]) : landed2;
  const counted = frame < speedsAt + 14 ? Math.min(passed1, LOYALTY.inheritsBefore[1]) : LOYALTY.inheritsAfter[1];
  const counterTone = frame >= zeroAt - 2 && frame >= speedsAt + 14 ? "bad" : "data";

  // ── Part B: the combinations ──
  const channels = [...NOTIFIERS.channels, NOTIFIERS.added];
  const timings = NOTIFIERS.timings;
  const cellX = (j: number) => GRID_X + j * (CELL.w + 14);
  const rowY = (i: number) => y(GRID_TOP + i * GRID_PITCH);
  const subclasses = frame >= twelveAt ? NOTIFIERS.inheritance[1] : NOTIFIERS.inheritance[0];
  const parts = frame >= sevenAt ? NOTIFIERS.composition[1] : NOTIFIERS.composition[0];
  const swap = ease(frame, swapsAt, 16);
  const digest = timings.indexOf("daily digest");
  if (digest < 0) throw new Error("no daily digest timing in results.json");

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={fragileAt} level={-35} />
      <Sfx name="el-tap" at={extendsAt} level={-32} />
      <Sfx name="el-pop" at={cartAt} level={-30} />
      {run1.map((at) => (
        <Sfx key={at} name="el-tap" at={at + DOT_T * 0.5} level={-33} />
      ))}
      <Sfx name="el-whoosh" at={run2} level={-35} />
      <Sfx name="el-scratch" at={zeroAt} level={-31} />
      <Sfx name="el-pencil" at={holdsAt} level={-35} />
      <Sfx name="el-tap" at={afterAt} level={-30} />
      <Sfx name="el-sprinkle" at={nineAt} level={-33} />
      <Sfx name="el-sprinkle" at={fourthAt + 8} level={-33} />
      <Sfx name="el-tap" at={sevenAt} level={-31} />
      <Sfx name="el-whoosh" at={swapsAt} level={-35} />
      <Sfx name="el-chime" at={genuineAt + 6} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4}>
          Why favor composition over inheritance?
        </QuestionCard>
        <Line x={X0} y={y(270)} at={tiesAt} size={26}>
          Inheritance ties a subclass to its parent&apos;s implementation
          <span style={{ opacity: ease(frame, breakUpAt, 10) }}>, so a change upstream can break it</span>
        </Line>
        <Line x={X0} y={y(316)} at={fragileAt - 2} size={26} out={aOut}>
          That&apos;s the <Mark at={fragileAt + 4} color={MARK_BAD}>fragile base class</Mark> problem.
        </Line>

        {/* Part A, left: the loyalty cart extends the cart. */}
        <Line x={X0} y={cartTop - 44} at={extendsAt} size={21} color={INK_SOFT} weight={500} out={aOut}>
          Inheritance: the loyalty cart extends the cart
        </Line>
        <Box x={CART.x} y={cartTop} w={CART.w} h={CART.h} at={tiesAt} out={aOut} align="left" lit={pulse(frame, breakUpAt, 24)}>
          <span />
        </Box>
        <Line x={CART.x + 22} y={cartTop + 16} at={tiesAt + 4} size={24} weight={500} color={INK_SOFT} out={extendsAt}>
          Parent class
        </Line>
        <Line x={CART.x + 22} y={cartTop + 16} at={extendsAt + 6} size={24} weight={500} out={aOut}>
          Shopping cart
        </Line>
        <Box x={ADD_ALL.x} y={chipTop} w={ADD_ALL.w} h={CHIP_H} at={oneAtATimeAt - 8} title="add-all" size={22} out={aOut} lit={pulse(frame, speedsAt, 20)} />
        <Box x={ADD.x} y={chipTop} w={ADD.w} h={CHIP_H} at={countsAt} title="add" size={22} out={aOut} />
        <Flow points={[[ADD_ALL.x + ADD_ALL.w + 6, chipMid], [ADD.x - 8, chipMid]]} at={oneAtATimeAt - 4} dur={8} width={2.2} head={12} out={speedsAt + 4} />
        <Flow points={[[ADD.x + ADD.w + 6, chipMid], [ITEMS.x - 8, chipMid]]} at={oneAtATimeAt - 2} dur={8} width={2.2} head={12} out={aOut} />
        <Box x={ITEMS.x} y={chipTop} w={ITEMS.w} h={CHIP_H} at={countsAt + 4} tone="data" out={aOut} align="left">
          <span style={{ ...note(21, BAR), display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 22, height: 22, borderRadius: 5, background: i < inCart ? ITEM_FILL[i] : "transparent", border: `2px solid ${i < inCart ? ITEM_FILL[i] : ds("blue", 200)}` }} />
            ))}
            <span style={{ marginLeft: 8, fontWeight: 500, color: BAR, fontVariantNumeric: "tabular-nums" }}>{inCart} in the cart</span>
          </span>
        </Box>
        {/* After the speed-up: add-all fills the list itself, skipping add. */}
        <Flow points={path2} at={speedsAt + 6} dur={14} color={INK} width={2.4} head={10} out={aOut} />
        <Svg opacity={1 - ease(frame, aOut, 8)}>
          {run1.map((at, i) => {
            const t = (frame - at) / DOT_T;
            if (t < 0 || t > 1 || frame >= speedsAt + 10) return null;
            const [cx, cy] = along(path1, t);
            return <rect key={i} x={cx - 11} y={cy - 11} width={22} height={22} rx={5} fill={ITEM_FILL[i]} />;
          })}
          {[0, 1, 2].map((i) => {
            const t = (frame - run2 - i * 3) / 20;
            if (t < 0 || t > 1) return null;
            const [cx, cy] = along(path2, t);
            return <rect key={`b${i}`} x={cx - 11} y={cy - 11} width={22} height={22} rx={5} fill={ITEM_FILL[i]} />;
          })}
        </Svg>

        {/* The rigid bar: the subclass hangs off the cart's implementation. */}
        <div
          style={{
            position: "absolute",
            left: CHILD.x + 120,
            top: cartTop + CART.h,
            width: 8,
            height: childTop - cartTop - CART.h,
            background: `color-mix(in srgb, ${ACCENT} ${Math.round(pulse(frame, breakUpAt + 6, 30) * 100)}%, ${INK})`,
            transformOrigin: "50% 0",
            transform: `scaleY(${ease(frame, tiesAt + 6, 12)})`,
            opacity: 1 - ease(frame, aOut, 8),
          }}
        />
        <Line x={CHILD.x + 146} y={(cartTop + CART.h + childTop) / 2 - 16} at={tiesAt + 8} size={21} color={INK_SOFT} weight={500} out={aOut}>
          extends
        </Line>
        <Box
          x={CHILD.x}
          y={childTop}
          w={CHILD.w}
          h={y(CHILD.top + CHILD.h) - childTop}
          at={tiesAt + 10}
          title={frame < extendsAt + 6 ? "Subclass" : "Loyalty cart"}
          sub={frame < extendsAt + 6 ? "tied to the parent's code" : "counts in add"}
          lit={pulse(frame, extendsAt + 6, 20)}
          out={aOut}
          tones={[[zeroAt, "bad"]]}
        />
        <Line x={COUNTER_X} y={childTop - 2} at={countsAt + 2} size={20} color={INK_SOFT} weight={500} out={aOut}>
          counted
        </Line>
        <Value x={COUNTER_X} y={childTop + 30} at={countsAt + 2} tone={counterTone} out={aOut} lit={pulse(frame, zeroAt + 4, 22) + pulse(frame, threeAt, 22)}>
          {counted}
        </Value>
        <Pill x={CHILD.x} y={y(CHILD.top + CHILD.h) + 12} at={nobodyAt} tone="plain" size={21} out={aOut}>
          loyalty code not edited
        </Pill>

        <ArtSpot id="shopping-cart" at={cartAt} out={holdsAt - 12} left={1330} top={y(470)} h={190} />

        <VRule x={(CART.x + CART.w + RIGHT_X) / 2} top={cartTop - 44} bottom={y(CHILD.top + CHILD.h)} at={holdsAt} out={aOut} />

        {/* Part A, right: a counter that holds a cart. */}
        <Line x={RIGHT_X} y={cartTop - 44} at={holdsAt} size={21} color={OK_INK} weight={500} out={aOut}>
          Composition: the counter has a cart
        </Line>
        <Box x={RIGHT_X} y={cartTop} w={COUNTER_BOX.w} h={COUNTER_BOX.h} at={holdsAt + 2} tone="ok" title="Loyalty counter" sub={<span style={{ opacity: ease(frame, ownAt, 10) }}>counts in its own methods</span>} out={aOut} />
        <Svg opacity={ease(frame, holdsAt + 8, 12) * (1 - ease(frame, aOut, 8))}>
          <line x1={RIGHT_X + 120} y1={cartTop + COUNTER_BOX.h + 14} x2={RIGHT_X + 120} y2={y(HELD.top) - 4} stroke={OK} strokeWidth={2.6} />
          <path
            d={`M${RIGHT_X + 120},${cartTop + COUNTER_BOX.h + 2} l9,12 l-9,12 l-9,-12 Z`}
            fill={OK}
          />
        </Svg>
        <Line x={RIGHT_X + 146} y={(cartTop + COUNTER_BOX.h + y(HELD.top)) / 2 - 14} at={holdsAt + 10} size={21} color={OK_INK} weight={500} out={aOut}>
          has a
        </Line>
        <Box x={RIGHT_X} y={y(HELD.top)} w={COUNTER_BOX.w} h={HELD.h} at={holdsAt + 12} title="Shopping cart" sub={<span style={{ opacity: ease(frame, promisesAt, 10) }}>only what it promises</span>} out={aOut} />
        {[
          { at: beforeAt, x: RIGHT_X + COUNTER_BOX.w + 60, label: "before", v: LOYALTY.composesBefore[1] },
          { at: afterAt, x: RIGHT_X + COUNTER_BOX.w + 200, label: "after", v: LOYALTY.composesAfter[1] },
        ].map((c) => (
          <React.Fragment key={c.label}>
            <Line x={c.x} y={cartTop - 2} at={c.at} size={20} color={INK_SOFT} weight={500} out={aOut}>
              {c.label}
            </Line>
            <Value x={c.x} y={cartTop + 30} at={c.at} tone={c.label === "after" ? "ok" : "data"} out={aOut}>
              {c.v}
            </Value>
          </React.Fragment>
        ))}

        {/* Part B: a subclass per pair, or one part per choice. */}
        <Line x={X0} y={y(GRID_TOP - 96)} at={channelsAt} size={22} weight={500}>
          A subclass per pair
        </Line>
        {timings.map((t, j) => (
          <Line key={t} x={cellX(j) + CELL.w / 2} y={y(GRID_TOP - 48)} at={timingsAt + j * 4} size={20} color={INK_SOFT} weight={500} align="center" width={CELL.w}>
            {t}
          </Line>
        ))}
        {channels.map((c, i) => (
          <React.Fragment key={c}>
            <Line x={X0} y={rowY(i) + 12} at={i < 3 ? channelsAt + i * 5 : fourthAt} size={21} weight={500}>
              {c}
            </Line>
            {timings.map((t, j) => (
              <Box
                key={t}
                x={cellX(j)}
                y={rowY(i)}
                w={CELL.w}
                h={CELL.h}
                at={(i < 3 ? nineAt : fourthAt + 6) + (i % 3) * 4 + j * 2}
                title="subclass"
                size={20}
                tone={i < 3 ? "plain" : "bad"}
              />
            ))}
          </React.Fragment>
        ))}
        <Line x={X0} y={rowY(4) + 10} at={nineAt + 10} size={26} weight={500}>
          <span style={{ color: subclasses > NOTIFIERS.inheritance[0] ? ACCENT : INK, fontVariantNumeric: "tabular-nums" }}>{subclasses}</span> subclasses
        </Line>

        <Line x={PARTS_X[0]} y={y(GRID_TOP - 96)} at={partsAt} size={22} weight={500}>
          <span style={{ color: OK_INK }}>Composition:</span> one part per choice
        </Line>
        {channels.map((c, i) => (
          <Box key={c} x={PARTS_X[0]} y={rowY(i)} w={PART_W[0]} h={CELL.h} at={i < 3 ? partsAt + 4 + i * 3 : sevenAt - 4} title={c} size={21} tone={i < 3 ? "plain" : "ok"} />
        ))}
        {timings.map((t, j) => (
          <Box key={t} x={PARTS_X[1]} y={rowY(j)} w={PART_W[1]} h={CELL.h} at={partsAt + 14 + j * 3} title={t} size={21} lit={j === digest ? pulse(frame, digestAt, 24) : 0} />
        ))}
        <Line x={PARTS_X[0]} y={rowY(4) + 10} at={sixAt} size={26} weight={500}>
          <span style={{ color: parts > NOTIFIERS.composition[0] ? OK_INK : INK, fontVariantNumeric: "tabular-nums" }}>{parts}</span> parts
        </Line>

        <VRule x={(cellX(2) + CELL.w + PARTS_X[0]) / 2} top={y(GRID_TOP - 96)} bottom={rowY(4) + 46} at={partsAt} />
        <VRule x={(PARTS_X[1] + PART_W[1] + 1520) / 2} top={rowY(0) - 4} bottom={rowY(2) + 66} at={customerAt} />

        {/* One customer's notifier swaps its timing part. */}
        <Line x={1520} y={rowY(0) - 4} at={customerAt} size={20} color={INK_SOFT} weight={500}>
          one customer
        </Line>
        <Box x={1520} y={rowY(0) + 28} w={110} h={CELL.h} at={customerAt + 2} title="text" size={21} />
        <Box x={1520} y={rowY(1) + 28} w={220} h={CELL.h} at={customerAt + 6} tone="ok" size={21}>
          <span style={{ position: "relative", display: "block", width: 190, height: 30, overflow: "hidden" }}>
            {[
              { text: "now", k: 1 - swap },
              { text: "daily digest", k: swap },
            ].map((s) => (
              <span
                key={s.text}
                style={{
                  position: "absolute",
                  inset: 0,
                  textAlign: "center",
                  ...label(21, OK_INK),
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  opacity: s.k,
                  transform: `translateY(${(s.text === "now" ? -1 : 1) * (1 - s.k) * 18}px)`,
                }}
              >
                {s.text}
              </span>
            ))}
          </span>
        </Box>
        <Line x={1520} y={rowY(2) + 34} at={runtimeAt} size={21} color={OK_INK} weight={500}>
          swapped at runtime
        </Line>
        <Line x={X0} y={rowY(5) + 10} at={keepAt} size={26}>
          Keep inheritance for <Mark at={genuineAt}>a genuine subtype</Mark>.
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
