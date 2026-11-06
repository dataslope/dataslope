import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BAR, BLUE_INK, INK_SOFT } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { OBSERVER } from "./data";
import { ACCENT_INK, Box, Drift, Flow, Line, Mark, Pill, pulse, Svg, X0 } from "./parts";

/** "['email: confirm 1042', …]" → [["email", "confirm 1042"], …]. */
const heard = (printed: string) => [...printed.matchAll(/'([^']*)'/g)].map((m) => m[1].split(": ") as [string, string]);
const FIRST = heard(OBSERVER.first);
const SECOND = heard(OBSERVER.withFourth);
if (FIRST.length !== 3 || SECOND.length !== 4) throw new Error("the observer run changed shape");

const NAMES: Record<string, string> = { email: "Email", stock: "Stock count", analytics: "Analytics", loyalty: "Loyalty points" };
const ORDER = { x: X0, w: 300, h: 110 };
const LIS = { x: 760, w: 290, h: 62 };
const LIS_TOPS = [384, 466, 548, 630];
const RES_X = 1110;

/**
 * Question 7. An order, the subject, with three listeners on lines: each
 * lights as order 1042 reaches it and shows what the run printed. A fourth,
 * loyalty points, subscribes without an edit to the order, and order 1043
 * reaches all four. Then where it is used, and its cost: a reader's path
 * through the checkout dead-ends at "notify".
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
  const end = n.beat("obs-cost").to;

  const lisTop = (i: number) => y(LIS_TOPS[i]);
  const lisMid = (i: number) => lisTop(i) + LIS.h / 2;
  const orderTop = (lisTop(0) + lisTop(3) + LIS.h) / 2 - ORDER.h / 2;
  const orderMid = orderTop + ORDER.h / 2;
  const src: readonly [number, number] = [ORDER.x + ORDER.w + 6, orderMid];
  const second = withoutAt + 10;
  const dotAt = (i: number) => (i < 3 ? hearsAt + i * 5 : second + i * 4);
  const resultAt = (i: number) => dotAt(i) + 16;
  const pathTop = y(744);
  const costDim = costAt - 4;

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
          at={placedAt}
          tone="data"
          title="Order"
          sub={<span style={{ color: BLUE_INK, fontWeight: 650 }}>{frame >= second ? "1043" : "1042"} placed</span>}
          lit={pulse(frame, placedAt + 4, 20) + pulse(frame, second, 20)}
          dim={costDim}
        />
        <Line x={ORDER.x} y={orderTop + ORDER.h + 22} at={typesAt} size={21} color={INK_SOFT} weight={600} dim={costDim}>
          knows only: notify each one
        </Line>
        <Pill x={ORDER.x} y={orderTop + ORDER.h + 64} at={withoutAt} tone="ok" size={21} dim={costDim}>
          ✓ not edited
        </Pill>
        {[0, 1, 2, 3].map((i) => {
          const [who] = SECOND[i];
          const at = i < 3 ? subAt + i * 5 : fourthAt;
          const lit = pulse(frame, resultAt(i) - 4, 18) + (i < 3 ? pulse(frame, second + 16, 18) : 0);
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
              <Flow points={line} at={at + 2} dur={12} width={2.2} head={12} dim={costDim} />
              <Box x={LIS.x} y={lisTop(i)} w={LIS.w} h={LIS.h} at={at} title={NAMES[who]} size={23} tone={i === 3 ? "ok" : "plain"} lit={lit} />
              <Svg opacity={1 - ease(frame, costDim, 10)}>
                {i < 3 ? dot(t) : null}
                {dot(t2)}
              </Svg>
              {result ? (
                <Line x={RES_X} y={lisMid(i) - 16} at={i < 3 ? resultAt(i) : second + 16 + 4 * i} size={24} weight={600} color={BLUE_INK} dim={costDim}>
                  {result}
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
            width: RES_X + 300 - LIS.x + 40,
            height: lisTop(3) + LIS.h + 36 - lisTop(0),
            boxSizing: "border-box",
            border: `2.5px dashed ${ACCENT}`,
            borderRadius: 16,
            opacity: ease(frame, findAt, 12),
          }}
        />

        {/* Where it is used. */}
        {[
          { at: useAt, x: X0 + 0, t: "event systems" },
          { at: uiAt, x: X0 + 230, t: "UI data binding" },
          { at: pubAt, x: X0 + 490, t: "publish-subscribe" },
        ].map((p) => (
          <Pill key={p.t} x={p.x} y={pathTop + 10} at={p.at} tone="plain" size={22} out={costAt}>
            {p.t}
          </Pill>
        ))}

        {/* The cost: a reader's path through the checkout stops at notify. */}
        {["cart", "pay", "notify"].map((s, i) => (
          <React.Fragment key={s}>
            <Box x={X0 + i * 200} y={pathTop} w={150} h={60} at={readingAt + i * 5} title={s} size={23} tone={i === 2 ? "bad" : "plain"} />
            {i > 0 ? <Flow points={[[X0 + i * 200 - 44, pathTop + 30], [X0 + i * 200 - 8, pathTop + 30]]} at={readingAt + i * 5 - 2} dur={6} width={2.2} head={11} /> : null}
          </React.Fragment>
        ))}
        <Line x={X0 + 600} y={pathTop + 14} at={afterAt} size={25} weight={650} color={ACCENT_INK}>
          and then? Go and find who subscribed.
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
