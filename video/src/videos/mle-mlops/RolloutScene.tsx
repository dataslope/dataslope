import { ScrollText, Users } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BAR, BLUE_INK, INK, INK_SOFT, label, svgText } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BadgeRow, Box, CornerLoop, Drift, Flow, lerp, Line, Mark, OK_INK, Phase, Q_SIZE, Q_W, Spot, Svg, X0 } from "./parts";

const USERS = { x: X0, w: 170 };
const ROUTER = { x: 380, w: 190 };
const MODEL = { x: 700, w: 250 };
const OUT_X = 1040;
const LOG = { x: 1040, w: 150 };
const BOX_H = 72;

/** A guardrail's gauge: a half circle and a needle; `t` from 0 (safe) to 1 (breached). */
const Gauge: React.FC<{ cx: number; cy: number; r: number; t: number; at: number }> = ({ cx, cy, r, t, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const a = Math.PI * (1 - lerp(0.3, 0.92, t));
  const breach = t > 0.6;
  return (
    <Svg opacity={p}>
      <path d={`M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`} fill="none" stroke={INK_SOFT} strokeWidth={2.4} />
      <path d={`M${cx + r * Math.cos(Math.PI * 0.25)},${cy - r * Math.sin(Math.PI * 0.25)} A${r},${r} 0 0 1 ${cx + r},${cy}`} fill="none" stroke={ACCENT} strokeWidth={5} />
      <line x1={cx} y1={cy} x2={cx + Math.cos(a) * r * 0.85} y2={cy - Math.sin(a) * r * 0.85} stroke={breach ? ACCENT : INK} strokeWidth={3.2} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill={breach ? ACCENT : INK} />
    </Svg>
  );
};

/**
 * Question 11: rolling out in stages, with a way back from each. Traffic as
 * a band through a router: in shadow, a mirrored copy goes to the new model,
 * whose predictions go to a log and never back; in a canary, a thin slice
 * (1 to 5%) goes to it, watched by two guardrails, widening while they hold
 * and snapping back when one breaks. The rollback is a config change: the
 * previous artifact and its config wait in the registry, and the traffic
 * weights flip back (the lever). What doesn't flip back is state.
 */
export const RolloutScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q11").from;
  const qAt = n.word("q11", "Question eleven");
  const textAt = n.word("q11", "How do you roll out");
  const stagesAt = n.word("q11", "In stages");
  const backAt = n.word("q11", "with a way back from each");
  const shadowAt = n.word("q11-shadow", "First, shadow");
  const mirrorAt = n.word("q11-shadow", "mirror live traffic");
  const logAt = n.word("q11-shadow", "log its predictions");
  const noneAt = n.word("q11-shadow", "return none of them");
  const compareAt = n.word("q11-shadow", "You compare outputs");
  const loadAt = n.word("q11-shadow", "under real load");
  const exposedAt = n.word("q11-shadow", "with no user exposed");
  const canaryAt = n.word("q11-canary", "Then a canary");
  const sliceAt = n.word("q11-canary", "send one to five percent");
  const guardAt = n.word("q11-canary", "watch the business and model guardrails");
  const rampAt = n.word("q11-canary", "Ramp up while they hold");
  const straightAt = n.word("q11-canary", "send traffic straight back");
  const momentAt = n.word("q11-canary", "the moment they don't");
  const rollAt = n.word("q11-rollback", "That's the rollback");
  const configAt = n.word("q11-rollback", "a config change, not a redeploy");
  const prevAt = n.word("q11-rollback", "the previous artifact");
  const registryAt = n.word("q11-rollback", "stay in the registry");
  const flipAt = n.word("q11-rollback", "the traffic weights flip back");
  const stateAt = n.word("q11-rollback", "The catch is state");
  const storeAt = n.word("q11-rollback", "Feature store writes");
  const abAt = n.word("q11-rollback", "A B assignment logs");
  const cachesAt = n.word("q11-rollback", "and caches");
  const dontAt = n.word("q11-rollback", "don't flip back with it");
  const rehearseAt = n.word("q11-rollback", "so rehearse it");
  const end = n.beat("q11-rollback").to;

  const mid = y(460);
  const curMid = y(380);
  const newMid = y(540);
  const box = (c: number) => c - BOX_H / 2;

  // The new model's share of live traffic: a mirrored copy in shadow, then a
  // thin slice, widening, then nothing.
  const canary = ease(frame, sliceAt, 14);
  const ramp = ease(frame, rampAt + 4, 30);
  const snap = ease(frame, straightAt + 4, 8);
  const share = canary * lerp(lerp(0.05, 0.45, ramp), 0, snap);
  const mirrored = ease(frame, mirrorAt, 12) * (1 - canary);
  const breach = ease(frame, straightAt - 8, 10);
  const routerX = ROUTER.x + ROUTER.w;
  const reg = { top: y(700), w: 210, h: h(80) };
  const shelfY = reg.top + reg.h + 10;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={stagesAt} level={-32} />
      <Sfx name="el-whoosh" at={mirrorAt} level={-37} />
      <Sfx name="el-tap" at={logAt} level={-32} />
      <Sfx name="el-tap" at={sliceAt} level={-31} />
      <Sfx name="el-whoosh" at={rampAt + 4} level={-37} />
      <Sfx name="el-scratch" at={straightAt + 4} level={-34} />
      <Sfx name="el-tap" at={registryAt} level={-31} />
      <Sfx name="el-pop" at={flipAt} level={-30} />
      {[storeAt, abAt, cachesAt].map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-32} />
      ))}
      <Sfx name="el-chime" at={rehearseAt + 16} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          How do you roll out a new model version safely?
        </QuestionCard>
        <CornerLoop at={qAt} lit="ship" />
        <Line at={stagesAt - 2} x={X0} y={y(250)} size={24} color={INK}>
          In stages:
        </Line>
        <BadgeRow
          x={X0 + 124}
          y={y(250) - 5}
          size={22}
          gap={34}
          items={[
            { text: "shadow", at: stagesAt + 2, lit: shadowAt, litOut: canaryAt },
            { text: "canary", at: stagesAt + 6, lit: canaryAt, litOut: rollAt },
            { text: "full", at: stagesAt + 10 },
          ]}
        />
        <Line at={backAt - 2} x={X0 + 500} y={y(250)} size={24} color={OK_INK}>
          each with a way back
        </Line>

        {/* ── Traffic through the router ── */}
        <Box x={USERS.x} y={box(mid)} w={USERS.w} h={BOX_H} at={shadowAt - 4} title="Users" icon={Users} size={24} />
        <Box x={ROUTER.x} y={box(mid)} w={ROUTER.w} h={BOX_H + 18} at={shadowAt} title="Router" sub="traffic weights" size={24} lit={flipAt} litOut={stateAt} />
        <Box x={MODEL.x} y={box(curMid)} w={MODEL.w} h={BOX_H} at={shadowAt + 4} title="Current Model" size={24} />
        <Box x={MODEL.x} y={box(newMid)} w={MODEL.w} h={BOX_H} at={mirrorAt} title="New Model" size={24} dashed={canary < 0.5} />
        <Flow points={[[USERS.x + USERS.w + 4, mid], [ROUTER.x - 3, mid]]} at={shadowAt} color={BAR} width={12} head={20} />
        <Flow
          points={[[routerX + 4, mid - 12], [routerX + 60, mid - 12], [routerX + 60, curMid], [MODEL.x - 3, curMid]]}
          at={shadowAt + 4}
          color={BAR}
          width={2 + 10 * (1 - share)}
          head={18}
        />
        <Flow points={[[routerX + 4, mid + 12], [routerX + 60, mid + 12], [routerX + 60, newMid], [MODEL.x - 3, newMid]]} at={mirrorAt} color={BAR} width={6} head={16} dash="10 7" opacity={mirrored} />
        {share > 0.002 ? (
          <Flow points={[[routerX + 4, mid + 12], [routerX + 60, mid + 12], [routerX + 60, newMid], [MODEL.x - 3, newMid]]} at={sliceAt} color={BAR} width={2 + 10 * share} head={14 + 6 * share} />
        ) : null}
        {/* What the branch to the new model carries, under the router. */}
        <Line at={mirrorAt + 6} x={routerX + 44} width={360} align="right" y={newMid - 4} size={21} color={BLUE_INK}>
          {snap > 0.5 ? "back to 0%" : ramp > 0.5 ? "ramping up" : canary > 0.5 ? "1–5% of traffic" : "a mirrored copy"}
        </Line>
        {/* Where the predictions go. */}
        <Flow points={[[MODEL.x + MODEL.w + 4, curMid], [OUT_X - 8, curMid]]} at={shadowAt + 8} color={BAR} head={14} />
        <Line at={shadowAt + 10} x={OUT_X} y={curMid - 16} size={24} color={INK}>
          Returned to users
        </Line>
        <Flow points={[[MODEL.x + MODEL.w + 4, newMid], [LOG.x - 3, newMid]]} at={logAt} color={BAR} head={14} opacity={1 - canary * 0.6} />
        <Box x={LOG.x} y={box(newMid)} w={LOG.w} h={BOX_H} at={logAt} title="Log" icon={ScrollText} size={24} dim={canaryAt} />
        <Line at={noneAt} x={LOG.x} y={newMid + BOX_H / 2 + 12} size={21} color={INK_SOFT} dim={canaryAt}>
          never returned
        </Line>
        {/* In a canary, its slice does reach users. */}
        <Flow points={[[MODEL.x + MODEL.w + 4, newMid - 16], [MODEL.x + MODEL.w + 44, newMid - 16], [MODEL.x + MODEL.w + 44, curMid + 26], [OUT_X - 8, curMid + 26]]} at={sliceAt + 6} color={BAR} width={2 + 4 * share} head={12} out={momentAt + 6} radius={12} />
        {/* The shadow's claim leaves with the shadow: a canary does expose
            users, so "no user exposed" must not sit beside it. */}
        <Line at={compareAt - 2} out={canaryAt} x={LOG.x + LOG.w + 50} y={newMid - 36} size={23} color={INK}>
          Compare outputs, latency, errors
        </Line>
        <Line at={loadAt - 2} out={canaryAt} x={LOG.x + LOG.w + 50} y={newMid - 2} size={23} color={INK}>
          under real load<span style={{ color: OK_INK, opacity: ease(frame, exposedAt - 2, 10) }}>, no user exposed</span>
        </Line>

        {/* The guardrails. */}
        <Phase from={guardAt - 4}>
          <Gauge cx={1430} cy={y(336)} r={42} t={breach} at={guardAt} />
          <Gauge cx={1640} cy={y(336)} r={42} t={breach * 0.4} at={guardAt + 6} />
          <Svg>
            <text x={1430} y={y(336) + 30} textAnchor="middle" style={svgText(label(21, INK))}>
              business
            </text>
            <text x={1640} y={y(336) + 30} textAnchor="middle" style={svgText(label(21, INK))}>
              model health
            </text>
          </Svg>
        </Phase>

        {/* ── The rollback: a config change ── */}
        <Line at={rollAt - 2} x={X0} y={reg.top - h(46)} size={24} color={INK}>
          Rollback: the registry
        </Line>
        <Box x={X0} y={reg.top} w={reg.w} h={reg.h} at={prevAt - 2} title="Previous" sub="artifact + config" size={23} tone="plain" to="ok" toAt={flipAt} />
        <Box x={X0 + reg.w + 24} y={reg.top} w={reg.w} h={reg.h} at={registryAt - 2} title="New" sub="artifact + config" size={23} />
        <Svg opacity={ease(frame, registryAt, 10)}>
          <line x1={X0 - 10} x2={X0 + 2 * reg.w + 34} y1={shelfY} y2={shelfY} stroke={INK} strokeWidth={3} strokeLinecap="round" />
        </Svg>
        <Line at={configAt - 2} x={X0} y={shelfY + h(24)} size={23} color={OK_INK}>
          A config change, not a redeploy
        </Line>

        <Line at={stateAt - 2} x={960} y={reg.top - h(46)} size={24} color={INK}>
          The catch is state<span style={{ opacity: ease(frame, dontAt - 2, 10) }}>: these don&apos;t flip back</span>
        </Line>
        <Box x={960} y={reg.top} w={260} h={h(64)} at={storeAt - 2} title="Feature store writes" size={22} tone="lit" />
        <Box x={1240} y={reg.top} w={260} h={h(64)} at={abAt - 2} title="A/B assignment logs" size={22} tone="lit" />
        <Box x={1520} y={reg.top} w={150} h={h(64)} at={cachesAt - 2} title="Caches" size={22} tone="lit" />
        <Line at={rehearseAt - 2} x={960} y={reg.top + h(64) + h(32)} size={25} color={OK_INK}>
          <Mark at={rehearseAt + 4}>So rehearse it</Mark>
        </Line>
      </Drift>

      <Spot id="lever" at={flipAt} x={700} y={y(668)} w={150} />
    </AbsoluteFill>
  );
};
