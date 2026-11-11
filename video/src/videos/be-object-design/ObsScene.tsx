import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BAR, BLUE_INK, INK_SOFT } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { OBSERVER } from "./data";
import { ACCENT_INK, Box, Drift, Flow, Line, Mark, OK_INK, Pill, pulse, Strike, Svg, X0 } from "./parts";

/** "['email: confirm 1042', …]" → [["email", "confirm 1042"], …]. */
const heard = (printed: string) => [...printed.matchAll(/'([^']*)'/g)].map((m) => m[1].split(": ") as [string, string]);
const FIRST = heard(OBSERVER.first);
const SECOND = heard(OBSERVER.withFourth);
if (FIRST.length !== 3 || SECOND.length !== 4) throw new Error("the observer run changed shape");
/** The same four on one order, analytics broken: who heard before place()
 *  raised, and what it raised. */
const HEARD_BEFORE_FAILING = new Set(heard(OBSERVER.heardBeforeFailing).map(([who]) => who));
const FAILED = OBSERVER.failed.match(/^place\((\d+)\) raised: (.*)$/);
if (!FAILED || HEARD_BEFORE_FAILING.has("analytics") || HEARD_BEFORE_FAILING.has("loyalty") || HEARD_BEFORE_FAILING.size !== 2) {
  throw new Error(`the broken-listener run changed: ${OBSERVER.failed} ${OBSERVER.heardBeforeFailing}`);
}
const [, FAILED_ORDER, FAILED_WITH] = FAILED;

const NAMES: Record<string, string> = { email: "Email", stock: "Stock count", analytics: "Analytics", loyalty: "Loyalty points" };
const ORDER = { x: X0, w: 330, h: 124 };
const LIS = { x: 780, w: 340, h: 72 };
const LIS_TOPS = [380, 470, 560, 650];
const RES_X = 1180;

/**
 * Question 7. An order, the subject, with three listeners on lines: each
 * lights as order 1042 reaches it and shows what the run printed. A fourth,
 * loyalty points, subscribes without an edit to the order, and order 1043
 * reaches all four. Then where it is used, and its cost: a reader's path
 * through the checkout dead-ends at "notify". Last, the failure the simple
 * version shares with its listeners (the run): analytics breaks inside the
 * order's call, the order fails, and loyalty, after it, never hears; a
 * broker between them is publish-subscribe.
 */
export const ObsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("obs").from;
  const qAt = n.word("obs", "Question seven");
  const textAt = n.word("obs", "What is the Observer pattern?");
  const oneAt = n.word("obs", "A one-to-many dependency");
  const notifiesAt = n.word("obs", "it notifies every observer that registered");
  const placedAt = n.word("obs-order", "An order is placed");
  const subAt = n.word("obs-order", "have each subscribed");
  const hearsAt = n.word("obs-order", "each one hears about it");
  const typesAt = n.word("obs-order", "The order doesn't know their types");
  const fourthAt = n.word("obs-order", "a fourth, for loyalty points, joins");
  const withoutAt = n.word("obs-order", "without an edit to the order");
  const useAt = n.word("obs-use", "It underpins event systems");
  const uiAt = n.word("obs-use", "UI data binding");
  const pubAt = n.word("obs-use", "publish-subscribe");
  const costAt = n.word("obs-cost", "The cost is indirection");
  const readingAt = n.word("obs-cost", "Reading the checkout");
  const afterAt = n.word("obs-cost", "what happens after an order");
  const findAt = n.word("obs-cost", "go and find who subscribed");
  const simpleAt = n.word("obs-fail", "And in the simple version");
  const insideAt = n.word("obs-fail", "run inside the order's own call");
  const breaksAt = n.word("obs-fail", "If analytics breaks");
  const failsAt = n.word("obs-fail", "the order fails with it");
  const neverAt = n.word("obs-fail", "loyalty never hears");
  const brokerAt = n.word("obs-fail", "So backends often put a broker between them");
  const pubsubAt = n.word("obs-fail", "publish-subscribe");
  const end = n.beat("obs-fail").to;

  const lisTop = (i: number) => y(LIS_TOPS[i]);
  const lisMid = (i: number) => lisTop(i) + LIS.h / 2;
  const orderTop = (lisTop(0) + lisTop(3) + LIS.h) / 2 - ORDER.h / 2;
  const orderMid = orderTop + ORDER.h / 2;
  const src: readonly [number, number] = [ORDER.x + ORDER.w + 6, orderMid];
  const second = withoutAt + 10;
  const dotAt = (i: number) => (i < 3 ? hearsAt + i * 5 : second + i * 4);
  const resultAt = (i: number) => dotAt(i) + 16;
  const pathTop = y(772);
  const costDim = costAt - 4;
  // Over "the simple version" the figure comes back to full strength: the
  // failure is drawn on it.
  const back = ease(frame, simpleAt, 14);
  const setBack = 1 - 0.62 * Math.max(0, ease(frame, costDim, 12) - back);
  const failIdx = SECOND.findIndex(([who]) => who === "analytics");
  const tBack = (frame - breaksAt - 8) / 16;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={placedAt} level={-32} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="el-tap" at={resultAt(i)} level={-32} />
      ))}
      <Sfx name="el-pop" at={fourthAt} level={-31} />
      <Sfx name="el-sprinkle" at={second + 10} level={-33} />
      {[useAt, uiAt, pubAt].map((at) => (
        <Sfx key={at} name="el-tap" at={at} level={-34} />
      ))}
      <Sfx name="el-pencil" at={readingAt} level={-35} />
      <Sfx name="el-scratch" at={afterAt + 4} level={-32} />
      <Sfx name="el-scratch" at={breaksAt + 4} level={-32} />
      <Sfx name="el-tap" at={failsAt} level={-31} />
      <Sfx name="el-chime" at={pubsubAt} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4}>
          What is the Observer pattern?
        </QuestionCard>
        <Line x={X0} y={y(270)} at={oneAt} size={26}>
          One-to-many: when a subject changes state, it <Mark at={notifiesAt}>notifies every observer</Mark> that registered.
        </Line>

        {/* The order and whoever subscribed. */}
        <Box
          x={ORDER.x}
          y={orderTop}
          w={ORDER.w}
          h={ORDER.h}
          at={oneAt + 4}
          tone="data"
          tones={[[failsAt, "bad"]]}
          title="Order"
          size={27}
          subSize={22}
          sub={
            frame >= failsAt ? (
              <span style={{ color: ACCENT_INK, fontWeight: 500 }}>{FAILED_ORDER} failed</span>
            ) : (
              <span style={{ color: BLUE_INK, fontWeight: 500 }}>{frame < placedAt ? "the subject" : `${frame >= second ? "1043" : "1042"} placed`}</span>
            )
          }
          lit={pulse(frame, placedAt + 4, 20) + pulse(frame, second, 20) + pulse(frame, failsAt, 20)}
          dim={costDim}
          undim={simpleAt}
        />
        <Line x={ORDER.x} y={orderTop - 44} at={second} size={21} color={BLUE_INK} weight={500} out={costDim}>
          the next order
        </Line>
        <Line x={ORDER.x} y={orderTop + ORDER.h + 22} at={typesAt} size={22} color={INK_SOFT} weight={500} dim={costDim} out={simpleAt}>
          knows only: notify each one
        </Line>
        <Line x={ORDER.x} y={orderTop + ORDER.h + 22} at={insideAt} size={22} color={INK_SOFT} weight={500}>
          calls each one, in turn
        </Line>
        <Pill x={ORDER.x} y={orderTop + ORDER.h + 70} at={withoutAt} tone="ok" size={22} dim={costDim} out={simpleAt}>
          ✓ not edited
        </Pill>
        {[0, 1, 2, 3].map((i) => {
          const [who] = SECOND[i];
          const at = i < 3 ? notifiesAt + 4 + i * 5 : fourthAt;
          const lit = pulse(frame, resultAt(i) - 4, 18) + (i < 3 ? pulse(frame, second + 16, 18) + pulse(frame, subAt + i * 5, 18) : 0);
          const line = [src, [src[0] + 120, orderMid], [src[0] + 120, lisMid(i)], [LIS.x - 8, lisMid(i)]] as const;
          const t = (frame - dotAt(i)) / 16;
          const t2 = (frame - second - 2) / 16;
          const dot = (k: number) => {
            if (k < 0 || k > 1) return null;
            const ys = [orderMid, lisMid(i)];
            const x0 = src[0];
            const len1 = 120;
            const len2 = Math.abs(ys[1] - ys[0]);
            const len3 = LIS.x - 8 - (x0 + 120);
            let d = k * (len1 + len2 + len3);
            let cx = x0;
            let cy = ys[0];
            if (d <= len1) cx += d;
            else if ((d -= len1) <= len2) {
              cx += len1;
              cy += Math.sign(ys[1] - ys[0]) * d;
            } else {
              d -= len2;
              cx += len1 + d;
              cy = ys[1];
            }
            return <circle cx={cx} cy={cy} r={8} fill={BAR} />;
          };
          const result = frame >= second + 16 ? SECOND[i][1] : FIRST[i]?.[1];
          return (
            <React.Fragment key={who}>
              <Flow points={line} at={at + 2} dur={12} width={2.2} head={12} opacity={setBack} />
              <Box
                x={LIS.x}
                y={lisTop(i)}
                w={LIS.w}
                h={LIS.h}
                at={at}
                title={NAMES[who]}
                size={26}
                tone={i === 3 ? "ok" : "plain"}
                tones={i === failIdx ? [[breaksAt, "bad"]] : []}
                lit={lit + (i === failIdx ? pulse(frame, breaksAt, 20) : 0)}
              />
              <Svg opacity={1 - ease(frame, costDim, 10)}>
                {i < 3 ? dot(t) : null}
                {dot(t2)}
              </Svg>
              {i === failIdx ? (
                <Svg>
                  {(() => {
                    const d = dot(1 - tBack);
                    return d ? React.cloneElement(d, { fill: ACCENT }) : null;
                  })()}
                </Svg>
              ) : null}
              {result ? (
                <div style={{ opacity: setBack }}>
                  <Line x={RES_X} y={lisMid(i) - 17} at={i < 3 ? resultAt(i) : second + 16 + 4 * i} size={27} weight={500} color={BLUE_INK} out={i === failIdx ? breaksAt : undefined}>
                    {HEARD_BEFORE_FAILING.has(who) || i === failIdx ? result : <Strike at={neverAt + 4}>{result}</Strike>}
                  </Line>
                </div>
              ) : null}
              {i === failIdx ? (
                <Line x={RES_X} y={lisMid(i) - 17} at={breaksAt + 6} size={27} weight={500} color={ACCENT_INK}>
                  raised: {FAILED_WITH}
                </Line>
              ) : null}
              {i === 3 ? (
                <Line x={RES_X + 240} y={lisMid(i) - 17} at={neverAt + 8} size={27} weight={500} color={ACCENT_INK}>
                  never heard
                </Line>
              ) : null}
            </React.Fragment>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: LIS.x - 20,
            top: lisTop(0) - 18,
            width: RES_X + 330 - LIS.x + 40,
            height: lisTop(3) + LIS.h + 36 - lisTop(0),
            boxSizing: "border-box",
            border: `2.5px dashed ${ACCENT}`,
            borderRadius: 16,
            opacity: ease(frame, findAt, 12) * (1 - ease(frame, simpleAt, 12)),
          }}
        />

        {/* Where it is used. */}
        <Line x={X0} y={pathTop + 14} at={useAt} size={24} weight={500} out={costAt}>
          event systems
          <span style={{ opacity: ease(frame, uiAt, 10) }}> · UI data binding</span>
          <span style={{ opacity: ease(frame, pubAt, 10) }}> · publish-subscribe</span>
        </Line>

        {/* The cost: a reader's path through the checkout stops at notify. */}
        {["cart", "pay", "notify"].map((s, i) => (
          <React.Fragment key={s}>
            <Box x={X0 + i * 200} y={pathTop} w={150} h={60} at={readingAt + i * 5} title={s} size={23} tone={i === 2 ? "bad" : "plain"} dim={simpleAt} />
            {i > 0 ? <Flow points={[[X0 + i * 200 - 44, pathTop + 30], [X0 + i * 200 - 8, pathTop + 30]]} at={readingAt + i * 5 - 2} dur={6} width={2.2} head={11} dim={simpleAt} /> : null}
          </React.Fragment>
        ))}
        <Line x={X0 + 600} y={pathTop + 14} at={afterAt} size={25} weight={500} color={ACCENT_INK} dim={simpleAt}>
          and then? Go and find who subscribed.
        </Line>

        {/* The fix the backend version reaches for. */}
        <Line x={X0} y={pathTop + 96} at={brokerAt} size={26} weight={500}>
          A broker between the order and its listeners
          <span style={{ opacity: ease(frame, pubsubAt, 10) }}>
            : <span style={{ color: OK_INK }}>publish-subscribe</span>
          </span>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
