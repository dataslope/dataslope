import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BAR, INK, INK_SOFT, label, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ArtSpot, Box, Drift, Flow, Gauge, Line, lerp, Mark, OK, OK_INK, pulse, toneAt, X0 } from "./parts";

/** The god class's five jobs, and what makes each one change. */
const JOBS = [
  { job: "prices the cart", why: "pricing rules" },
  { job: "charges the card", why: "payment provider" },
  { job: "writes the invoice", why: "invoice layout" },
  { job: "sends the email", why: "email template" },
  { job: "updates the stock", why: "stock system" },
];
const EMAIL = 3;

const WHY = { x: X0, w: 250, h: 46 };
const GOD = { x: 480, w: 430, top: 432, title: 62, row: 54, rowH: 44 };
/** Where each piece sits once the class is split: further apart. */
const SPLIT_PITCH = 70;
const CHECKOUT = { x: 1270, w: 230, h: 72 };
const GAUGE = { r: 78, cy: 318, xs: [1440, 1700] };

/**
 * Question 1. Cohesion and coupling as two gauges, then the anti-pattern:
 * one order manager doing five jobs, each with its own reason to change, and
 * checkout depending on all five, so a new email template means retesting
 * checkout. Split into five focused pieces, each with a narrow line to
 * checkout, and the gauges swing to high cohesion, low coupling.
 */
export const CohScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("coh").from;
  const qAt = n.word("coh", "Question one");
  const textAt = n.word("coh", "What are cohesion and coupling?");
  const cohAt = n.word("coh", "Cohesion is how focused a class is");
  const purposeAt = n.word("coh", "one clear purpose");
  const coupAt = n.word("coh", "Coupling is how much modules depend");
  const lowAt = n.word("coh", "Low coupling means");
  const antiAt = n.word("coh-god", "Here's the anti-pattern");
  const managerAt = n.word("coh-god", "One order manager");
  const jobAt = [
    n.word("coh-god", "prices the cart"),
    n.word("coh-god", "charges the card"),
    n.word("coh-god", "writes the invoice"),
    n.word("coh-god", "sends the email"),
    n.word("coh-god", "updates the stock"),
  ];
  const godAt = n.word("coh-god", "It's a god class");
  const knifeAt = n.word("coh-god", "a pocketknife");
  const fiveAt = n.word("coh-cost", "That's five reasons to change");
  const touchesAt = n.word("coh-cost", "everything that touches an order");
  const templateAt = n.word("coh-cost", "A new email template");
  const retestAt = n.word("coh-cost", "retesting checkout");
  const splitAt = n.word("coh-split", "Split it into five focused pieces");
  const narrowAt = n.word("coh-split", "a narrow connection to the rest");
  const highAt = n.word("coh-split", "high cohesion, low coupling");
  const solidAt = n.word("coh-split", "Most of SOLID pushes this way");
  const spotAt = n.word("coh-spot", "To spot one in a review");
  const reasonsAt = n.word("coh-spot", "count a class's reasons to change");
  const withAt = n.word("coh-spot", "count what has to change with it");
  const end = n.beat("coh-spot").to;

  const T = y(GOD.top);
  const split = ease(frame, splitAt, 26);
  const rowTop = (i: number) => lerp(T + GOD.title + i * GOD.row, T + 8 + i * SPLIT_PITCH, split);
  const rowMid = (i: number) => rowTop(i) + GOD.rowH / 2;
  const godH = GOD.title + 5 * GOD.row + 8;
  const godMid = T + godH / 2;
  const ckTop = godMid - CHECKOUT.h / 2;
  const ckMid = godMid;
  const emailRed = ease(frame, templateAt, 12) * (1 - ease(frame, splitAt + 20, 14));
  const redFlow = ease(frame, retestAt - 6, 12) * (1 - split);
  const gaugeY = y(GAUGE.cy);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={cohAt} level={-35} />
      {jobAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-33} />
      ))}
      <Sfx name="el-pop" at={knifeAt} level={-30} />
      <Sfx name="el-pencil" at={fiveAt} level={-35} />
      <Sfx name="el-scratch" at={retestAt} level={-32} />
      <Sfx name="el-whoosh" at={splitAt} level={-34} />
      <Sfx name="el-tap" at={highAt} level={-30} />
      <Sfx name="el-pencil" at={reasonsAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4}>
          What are cohesion and coupling?
        </QuestionCard>

        {/* The two definitions, and a gauge for each. */}
        <Line x={X0} y={y(270)} at={cohAt} size={26}>
          <b>Cohesion</b>: how focused a class is, its methods and data serving <Mark at={purposeAt}>one purpose</Mark>
        </Line>
        <Line x={X0} y={y(316)} at={coupAt} size={26}>
          <b>Coupling</b>: how much modules depend on each other
          <span style={{ color: INK_SOFT, opacity: ease(frame, lowAt, 10) }}>; low, and a change rarely spreads</span>
        </Line>
        {(["cohesion", "coupling"] as const).map((name, i) => {
          const cx = GAUGE.xs[i];
          const good = name === "cohesion" ? 1 : 0;
          return (
            <React.Fragment key={name}>
              <Gauge
                cx={cx}
                cy={gaugeY}
                r={GAUGE.r}
                at={i === 0 ? cohAt + 6 : coupAt + 6}
                steps={[
                  { at: godAt, value: good ? 0.14 : 0.86, tone: "bad" },
                  { at: highAt, value: good ? 0.86 : 0.14, tone: "ok" },
                ]}
              />
              <Line x={cx} y={gaugeY + 18} at={i === 0 ? cohAt + 8 : coupAt + 8} size={22} weight={700} align="center" width={220}>
                {name}
              </Line>
              <Line x={cx} y={gaugeY + 50} at={i === 0 ? purposeAt : lowAt} size={20} color={INK_SOFT} weight={600} align="center" width={220}>
                {good ? "high is good" : "low is good"}
              </Line>
            </React.Fragment>
          );
        })}

        {/* The order manager: five jobs in one class. */}
        <div
          style={{
            position: "absolute",
            left: GOD.x,
            top: T,
            width: GOD.w,
            height: godH,
            boxSizing: "border-box",
            border: `${2.5 + 2 * pulse(frame, godAt + 4, 24)}px solid ${ACCENT}`,
            borderRadius: 14,
            background: `color-mix(in srgb, ${ACCENT} 6%, transparent)`,
            opacity: ease(frame, managerAt, 12) * (1 - split),
          }}
        />
        <Line x={GOD.x + 22} y={T + 14} at={managerAt} size={25} weight={750} out={splitAt}>
          <span style={{ color: ACCENT }}>Order manager</span>
          <span style={{ color: INK_SOFT, fontWeight: 600, opacity: ease(frame, godAt, 10) }}> · a god class</span>
        </Line>
        {JOBS.map((j, i) => {
          const top = rowTop(i);
          const p = ease(frame, jobAt[i], 12);
          if (p <= 0) return null;
          const c = toneAt(frame, "plain", [
            [splitAt + 8 + i * 3, "ok"],
            ...(i === EMAIL ? ([[templateAt, "look"], [splitAt + 20, "ok"]] as const) : []),
          ]);
          return (
            <div
              key={j.job}
              style={{
                position: "absolute",
                left: GOD.x + 24,
                top,
                width: GOD.w - 48,
                height: GOD.rowH,
                boxSizing: "border-box",
                borderRadius: 10,
                border: `2.5px solid color-mix(in srgb, ${c.line} ${Math.round(Math.max(split, i === EMAIL ? emailRed : 0) * 100)}%, transparent)`,
                background: `color-mix(in srgb, ${c.fill} ${Math.round(Math.max(split, i === EMAIL ? emailRed : 0) * 100)}%, transparent)`,
                borderBottom: split < 0.5 && i < 4 && !(i === EMAIL && emailRed > 0.5) ? `1px solid color-mix(in srgb, ${INK} 25%, transparent)` : undefined,
                display: "flex",
                alignItems: "center",
                paddingLeft: 16,
                opacity: p,
                transform: `translateX(${(1 - p) * -10}px)`,
              }}
            >
              <span style={{ ...note(23, split > 0.5 ? OK_INK : INK), fontWeight: 600, whiteSpace: "nowrap" }}>{j.job}</span>
            </div>
          );
        })}

        {/* Five reasons to change, one into each job. */}
        {JOBS.map((j, i) => {
          const at = fiveAt + i * 5;
          const red = i === EMAIL ? emailRed : 0;
          const mid = rowMid(i);
          return (
            <React.Fragment key={j.why}>
              <Box x={WHY.x} y={mid - WHY.h / 2} w={WHY.w} h={WHY.h} at={at} title={j.why} size={21} tone="plain" tones={i === EMAIL ? [[templateAt, "bad"], [splitAt + 20, "plain"]] : []} />
              <Flow points={[[WHY.x + WHY.w + 6, mid], [GOD.x + 16, mid]]} at={at + 4} dur={8} color={red > 0.5 ? ACCENT : INK} width={2.2} head={12} />
            </React.Fragment>
          );
        })}

        {/* Checkout depends on the whole manager, then on five narrow pieces. */}
        <Box
          x={CHECKOUT.x}
          y={ckTop}
          w={CHECKOUT.w}
          h={CHECKOUT.h}
          at={touchesAt}
          title="checkout"
          sub={<span style={{ color: redFlow > 0.5 ? ACCENT : OK_INK, opacity: Math.max(redFlow, ease(frame, narrowAt + 20, 12)) }}>{split > 0.5 ? "untouched" : "retest"}</span>}
          tones={[
            [retestAt - 4, "bad"],
            [splitAt + 24, "plain"],
          ]}
        />
        <Flow points={[[CHECKOUT.x - 8, ckMid], [GOD.x + GOD.w + 8, ckMid]]} at={touchesAt + 4} color={redFlow > 0.5 ? ACCENT : INK} out={splitAt} />
        <Line x={GOD.x + GOD.w + 40} y={ckMid - 46} at={touchesAt + 8} size={20} color={INK_SOFT} weight={600} out={splitAt}>
          depends on all five
        </Line>
        {JOBS.map((j, i) => (
          <Flow
            key={`n${j.job}`}
            points={[[GOD.x + GOD.w - 16, rowMid(i)], [CHECKOUT.x - 8, ckMid + (i - 2) * 10]]}
            at={narrowAt + i * 3}
            dur={12}
            color={i === EMAIL ? INK : INK_SOFT}
            width={1.4}
            head={0}
          />
        ))}

        <ArtSpot id="multitool" at={knifeAt} out={splitAt - 10} left={1590} top={ckMid - 75} h={150} />

        {/* How to spot one. */}
        <Line x={CHECKOUT.x} y={y(752)} at={spotAt} size={22} weight={700}>
          In a review, count
        </Line>
        {[
          { at: reasonsAt, text: "its reasons to change" },
          { at: withAt, text: "what has to change with it" },
        ].map((r, i) => (
          <React.Fragment key={r.text}>
            <div style={{ position: "absolute", left: CHECKOUT.x, top: y(800) + i * h(46), opacity: ease(frame, r.at, 10) }}>
              <Tick at={r.at + 6} size={26} color={OK} />
            </div>
            <Line x={CHECKOUT.x + 40} y={y(796) + i * h(46)} at={r.at} size={24}>
              {r.text}
            </Line>
          </React.Fragment>
        ))}
        <Line x={CHECKOUT.x} y={y(270) + 2000} at={solidAt} size={20} color={BAR}>
          {" "}
        </Line>
        <span style={{ display: "none", ...label(20, INK) }} />
      </Drift>
    </AbsoluteFill>
  );
};
