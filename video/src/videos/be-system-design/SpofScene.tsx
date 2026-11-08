import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, label } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { at, COL_A, COL_B, diagramBoxes, SIDE_A, SIDE_B, sideRoute } from "./diagram";
import { Arrow, between, Box, Cross, Drift, lerp, Line, OK, OK_INK, Ring, X0 } from "./parts";

const RX = 1490;
const LEFT_W = 350;

/**
 * Question 4. Question three's diagram again, and its three single points of
 * failure ringed as they are named: one load balancer, one store, one cache.
 * Losing the cache sends every read to the store. Then each is removed with
 * redundancy (system-design.mdx): the balancer moves into a pair with a
 * standby, the store and the cache each gain a replica, and everything sorts
 * into two availability zones, one column each. The goal: no single
 * machine's death causes an outage.
 */
export const SpofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const B = diagramBoxes(y);

  const from = n.beat("q4").from;
  const qAt = n.word("q4", "Question four");
  const textAt = n.word("q4", "What is a single point of failure");
  const anyAt = n.word("q4", "It's any component");
  const threeAt = n.word("q4", "This diagram has three");
  const lbAt = n.word("q4", "one load balancer");
  const storeAt = n.word("q4", "one store");
  const cacheAt = n.word("q4", "and one cache");
  const loseAt = n.word("q4", "Lose the cache");
  const everyAt = n.word("q4", "every read lands on the store at once");
  const redundAt = n.word("q4-fix", "Remove each with redundancy");
  const pairAt = n.word("q4-fix", "active-passive pair");
  const standbyAt = n.word("q4-fix", "a standby takes over");
  const replAt = n.word("q4-fix", "Replicate the store");
  const failoverAt = n.word("q4-fix", "with failover to a replica");
  const cacheReplAt = n.word("q4-fix", "give the cache replicas too");
  const zonesAt = n.word("q4-fix", "spread it all across availability zones");
  const dcAt = n.word("q4-fix", "separate data centers in one region");
  const goalAt = n.word("q4-goal", "The goal");
  const noneAt = n.word("q4-goal", "no single machine's death causes an outage");
  const end = n.beat("q4-goal").to;

  // Where each primary stands: the centre column, then column A.
  const lb = at(B.lb, lerp(B.lb.cx, COL_A, ease(frame, pairAt, 20)));
  const store = at(B.store, lerp(B.store.cx, COL_A, ease(frame, replAt, 20)));
  const cache = at(B.cache, lerp(B.cache.cx, COL_A, ease(frame, cacheReplAt, 20)));
  const lbB = at(B.lb, COL_B);
  const storeB = at(B.store, COL_B);
  const cacheB = at(B.cache, COL_B);

  // The diagram returns as the question is read.
  const d0 = qAt + 4;
  const lost = ease(frame, loseAt, 10) * (1 - ease(frame, redundAt, 12));
  const flood = ease(frame, everyAt, 10) * (1 - ease(frame, redundAt, 12));
  const storeLine = flood > 0 ? `color-mix(in srgb, ${ACCENT} ${Math.round(flood * 100)}%, ${INK})` : INK;
  const ringsOut = zonesAt;

  // The zones: one column each.
  const zoneTop = B.lb.cy - B.lb.h / 2 - 30;
  const zoneBot = B.store.cy + B.store.h / 2 + 30;
  const zones = [
    { x0: SIDE_A - 40, x1: COL_A + 125 + 40, name: "zone A" },
    { x0: COL_B - 125 - 40, x1: SIDE_B + 40, name: "zone B" },
  ];
  const zoneP = ease(frame, zonesAt, 18);

  const fixes = [
    { at: pairAt, text: "an active-passive pair" },
    { at: failoverAt, text: "a replica, with failover" },
    { at: cacheReplAt, text: "cache replicas" },
    { at: zonesAt, text: "two availability zones" },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={lbAt} level={-35} />
      <Sfx name="el-pencil" at={storeAt} level={-35} />
      <Sfx name="el-pencil" at={cacheAt} level={-35} />
      <Sfx name="el-scratch" at={loseAt + 4} level={-34} />
      <Sfx name="el-sprinkle" at={everyAt} level={-33} />
      <Sfx name="el-whoosh" at={pairAt} level={-37} />
      <Sfx name="el-pop" at={standbyAt} level={-34} />
      <Sfx name="el-whoosh" at={replAt} level={-37} />
      <Sfx name="el-pop" at={failoverAt} level={-34} />
      <Sfx name="el-whoosh" at={cacheReplAt} level={-37} />
      <Sfx name="el-pop" at={cacheReplAt + 10} level={-34} />
      <Sfx name="el-pencil" at={zonesAt} level={-35} />
      <Sfx name="el-chime" at={noneAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={54}>
          What is a single point of failure, and how do you remove one?
        </QuestionCard>

        {/* The zones, behind everything. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: zoneP }}>
          {zones.map((z) => (
            <rect key={z.name} x={z.x0} y={zoneTop} width={z.x1 - z.x0} height={zoneBot - zoneTop} rx={22} fill="none" stroke={INK_SOFT} strokeWidth={2} strokeDasharray="9 7" />
          ))}
        </svg>
        {zones.map((z, i) => (
          <Line key={z.name} x={z.x0 + 4} y={zoneBot + 14} at={zonesAt + 8 + i * 4} size={22} weight={500} color={INK_SOFT}>
            {z.name}
          </Line>
        ))}

        {/* The diagram. */}
        <Box r={B.client} at={d0} title="Client" tone="quiet" />
        <Arrow points={between(B.client, lb)} at={d0 + 4} dur={10} />
        <Box r={lb} at={d0 + 4} title="Load balancer" sub={frame >= pairAt + 8 ? <span style={{ opacity: ease(frame, pairAt + 8, 10) }}>active</span> : undefined} />
        <Box r={B.app1} at={d0 + 6} title="App server" />
        <Box r={B.app2} at={d0 + 8} title="App server" />
        <Arrow points={between(lb, B.app1)} at={d0 + 8} />
        <Arrow points={between(lb, B.app2)} at={d0 + 10} />
        <Box
          r={cache}
          at={d0 + 10}
          title="Cache"
          tone="data"
          tones={[
            { at: loseAt, tone: "quiet" },
            { at: redundAt, tone: "data" },
          ]}
        />
        <Box r={store} at={d0 + 12} title="Key-value store" tone="data" tones={[{ at: everyAt, tone: "bad" }, { at: redundAt, tone: "data" }]} />
        <div style={{ position: "absolute", inset: 0, opacity: 1 - 0.85 * lost }}>
          <Arrow points={between(B.app1, cache)} at={d0 + 14} />
          <Arrow points={between(B.app2, cache)} at={d0 + 16} out={cacheReplAt} />
        </div>
        <Arrow points={sideRoute(B.app1, store, SIDE_A)} at={d0 + 14} dur={16} color={storeLine} width={2.4 + 1.6 * flood} />
        <Arrow points={sideRoute(B.app2, store, SIDE_B)} at={d0 + 16} dur={16} color={storeLine} width={2.4 + 1.6 * flood} out={replAt} />
        {lost > 0 ? (
          <div style={{ position: "absolute", left: cache.cx + cache.w / 2 + 22, top: cache.cy - 14, opacity: lost }}>
            <Cross at={loseAt + 4} size={28} />
          </div>
        ) : null}

        {/* Three single points of failure, then each answered. */}
        <Ring r={lb} at={lbAt} tones={[{ at: standbyAt, color: OK }]} out={ringsOut} />
        <Ring r={store} at={storeAt} tones={[{ at: failoverAt + 6, color: OK }]} out={ringsOut} />
        <Ring r={cache} at={cacheAt} tones={[{ at: cacheReplAt + 14, color: OK }]} out={ringsOut} />

        {/* The redundancy. */}
        <Box r={lbB} at={standbyAt} title="Load balancer" sub="standby" tone="quiet" dashed />
        <Arrow points={between(B.client, lbB)} at={standbyAt + 6} dash="7 6" color={INK_SOFT} />
        <Box r={storeB} at={failoverAt} title="Key-value store" sub="replica" tone="data" />
        <Arrow points={between(store, storeB)} at={failoverAt + 6} color={BAR} />
        <Line x={(COL_A + COL_B) / 2} y={B.store.cy - 54} at={failoverAt + 10} size={21} weight={500} color={INK_SOFT} align="center" width={200}>
          failover
        </Line>
        <Arrow points={sideRoute(B.app2, storeB, SIDE_B)} at={failoverAt + 8} dur={16} />
        <Box r={cacheB} at={cacheReplAt + 10} title="Cache" sub="replica" tone="data" />
        <Arrow points={between(cache, cacheB)} at={cacheReplAt + 16} color={BAR} />
        <Arrow points={between(B.app2, cacheB)} at={cacheReplAt + 16} />

        {/* What a single point of failure is. */}
        <Line x={X0} y={y(300)} at={anyAt} size={26} weight={500}>
          Single point of failure
        </Line>
        <Line x={X0} y={y(300) + 56} at={anyAt + 6} size={24} color={INK_SOFT} width={LEFT_W}>
          any component whose failure takes the system down
        </Line>
        <Line x={X0} y={y(300) + 160} at={threeAt} size={26} weight={500} color={ACCENT_INK}>
          <Num>3</Num> in this diagram
        </Line>
        <Line x={X0} y={y(716)} at={everyAt} size={24} weight={500} color={ACCENT_INK} width={340} out={redundAt}>
          every read lands on the store at once
        </Line>

        {/* The fixes, ticked as they are said. */}
        <Line x={RX} y={y(300)} at={redundAt} size={26} weight={500} width={330}>
          Remove each with redundancy
        </Line>
        {fixes.map((f, i) => (
          <div key={f.text} style={{ position: "absolute", left: RX, top: y(300) + 112 + i * 54, display: "flex", alignItems: "center", gap: 12, fontSize: 24, opacity: ease(frame, f.at, 10) }}>
            {frame >= f.at ? <Tick at={f.at + 4} size={22} /> : <span style={{ width: 22 }} />}
            <span style={{ ...label(24, INK), fontWeight: 500, whiteSpace: "nowrap" }}>{f.text}</span>
          </div>
        ))}
        <Line x={RX} y={y(300) + 112 + 4 * 54 + 4} at={dcAt} size={21} color={INK_SOFT} width={330}>
          separate data centers in one region
        </Line>
        <Line x={RX} y={y(700)} at={noneAt} size={28} weight={500} color={OK_INK} width={330}>
          No single machine&apos;s death causes an outage.
        </Line>
        <Line x={RX} y={y(700) - 44} at={goalAt} size={24} weight={500} color={INK_SOFT}>
          The goal
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
