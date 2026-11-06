import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CACHE } from "./data";
import { commas, Drift, Flow, Line, Mark, MiniMap, Node, OK, OK_INK, pct, Q_SIZE, Q_W, X0 } from "./parts";

const STEP_H = 66;
/** The read path's four steps and the write path's two, left to right. */
const READ = [
  { x: X0, w: 250, t: "check the cache" },
  { x: 430, w: 130, t: "miss" },
  { x: 620, w: 450, t: "read the database, write the cache" },
  { x: 1130, w: 190, t: "return it" },
];
const WRITE = [
  { x: X0, w: 300, t: "update the database" },
  { x: 480, w: 360, t: "invalidate the cached copy" },
];
const BAR_X = 450;
const BAR_W = 620;
const SIZE_NAME = ["a thousandth of the links", "a hundredth", "a tenth"];
/** The dead-cache diagram, at the right. */
const D = { app: { x: 1380, w: 140 }, box: { x: 1640, w: 180 } };

/**
 * Question 3: cache-aside as the read path's four steps and the write path's
 * two, each lit as said, and what follows from it. Then the simulation: an
 * LRU cache of three sizes under Zipf clicks, the share of redirects each
 * answers, and what each one's loss does to the database.
 */
export const CacheScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q3").from;
  const qAt = n.word("q3", "Question three");
  const textAt = n.word("q3", "Explain the cache-aside pattern");
  const onReadAt = n.word("q3", "On a read");
  const checksAt = n.word("q3", "checks the cache");
  const missAt = n.word("q3", "On a miss");
  const readsAt = n.word("q3", "reads the database");
  const returnsAt = n.word("q3", "returns it");
  const writeAt = n.word("q3", "A write updates the database");
  const invalAt = n.word("q3", "invalidates the cached copy");
  const onlyAt = n.word("q3-props", "Only what's asked for gets cached");
  const failAt = n.word("q3-props", "a cache failure falls through");
  const firstAt = n.word("q3-props", "every key's first request pays the miss");
  const simAt = n.word("q3-sim", "Simulate two million redirects");
  const fewAt = n.word("q3-sim", "a few links get most of the clicks");
  const sizeAt = [n.word("q3-sim", "a thousandth of the links"), n.word("q3-sim", "A hundredth, fifty-eight"), n.word("q3-sim", "A tenth, seventy-seven")];
  const betterAt = n.word("q3-loss", "the better it works");
  const deadAt = n.word("q3-loss", "a dead cache");
  const lossAt = [0, n.word("q3-loss", "by two point four"), n.word("q3-loss", "more than four at seventy-seven")];
  const replicaAt = n.word("q3-loss", "the cache needs replicas too");
  const end = n.beat("q3-loss").to;

  const readY = y(410) - STEP_H / 2;
  const writeY = y(574) - STEP_H / 2;
  const readStepAt = [checksAt, missAt, readsAt, returnsAt];
  const lit = (at: number, until: number) => (frame >= at - 2 && frame < until ? 1 : 0);
  const readUntil = [missAt, readsAt, returnsAt, writeAt];
  const dimA = simAt - 4;
  const rowY = (i: number) => y(700) + i * h(62);
  const dead = ease(frame, deadAt, 10);
  const replica = ease(frame, replicaAt, 14);
  const appMid = y(752);
  const cacheMid = y(684);
  const storeMid = y(820);

  return (
    <AbsoluteFill>
      {readStepAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-32} />
      ))}
      <Sfx name="el-tap" at={writeAt} level={-32} />
      <Sfx name="el-scratch" at={invalAt + 4} level={-34} />
      <Sfx name="el-pencil" at={firstAt + 4} level={-35} />
      {sizeAt.map((at, i) => (
        <Sfx key={i} name="el-whoosh" at={at} level={-37} />
      ))}
      <Sfx name="el-scratch" at={deadAt} level={-32} />
      <Sfx name="el-tap" at={lossAt[1]} level={-30} />
      <Sfx name="el-tap" at={lossAt[2]} level={-30} />
      <Sfx name="el-chime" at={replicaAt + 8} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          Explain the cache-aside pattern.
        </QuestionCard>
        <MiniMap at={qAt} stage={1} lit="cache" grow={{ replica: replicaAt }} />

        {/* ── The read path ── */}
        <Line at={onReadAt} x={X0} y={y(338)} size={22} weight={700} color={INK_SOFT} dim={dimA}>
          On a read
        </Line>
        {READ.map((s, i) => (
          <React.Fragment key={i}>
            <Node
              x={s.x}
              y={readY}
              w={s.w}
              h={STEP_H}
              at={readStepAt[i] - 2}
              tone={lit(readStepAt[i], readUntil[i]) ? "lit" : i === 1 ? "plain" : "data"}
              title={s.t}
              size={22}
              dim={dimA}
            />
            {i > 0 ? (
              <Flow points={[[READ[i - 1].x + READ[i - 1].w + 6, readY + STEP_H / 2], [s.x - 8, readY + STEP_H / 2]]} at={readStepAt[i] - 6} color={BAR} dim={dimA} />
            ) : null}
          </React.Fragment>
        ))}
        <Line at={firstAt} x={READ[1].x - 40} y={readY + STEP_H + h(18)} size={21} weight={650} dim={dimA}>
          <Mark at={firstAt + 2}>every key&apos;s first request pays it</Mark>
        </Line>

        {/* ── The write path ── */}
        <Line at={writeAt - 4} x={X0} y={writeY - h(44)} size={22} weight={700} color={INK_SOFT} dim={dimA}>
          On a write
        </Line>
        {WRITE.map((s, i) => (
          <React.Fragment key={i}>
            <Node
              x={s.x}
              y={writeY}
              w={s.w}
              h={STEP_H}
              at={i ? invalAt - 2 : writeAt}
              tone={i === 1 && frame >= invalAt + 2 && frame < onlyAt ? "lit" : "data"}
              title={s.t}
              size={22}
              dim={dimA}
            />
            {i > 0 ? <Flow points={[[WRITE[0].x + WRITE[0].w + 6, writeY + STEP_H / 2], [s.x - 8, writeY + STEP_H / 2]]} at={invalAt - 6} color={BAR} dim={dimA} /> : null}
          </React.Fragment>
        ))}

        {/* ── What follows ── */}
        <Line at={onlyAt} x={1400} y={y(338)} size={22} dim={dimA}>
          only what&apos;s asked for is cached
        </Line>
        <Line at={failAt} x={1400} y={y(388)} size={22} dim={dimA}>
          a failure falls through to the database
        </Line>

        {/* ── The simulation ── */}
        <Line at={simAt} x={X0} y={y(640)} size={22} weight={650}>
          Simulation: <Num>{commas(CACHE.redirects)}</Num> redirects over <Num>{commas(CACHE.links)}</Num> links
          <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, fewAt, 10) }}>, a few links get most clicks</span>
        </Line>
        {CACHE.sizes.map((s, i) => {
          const at = sizeAt[i];
          const p = ease(frame, at + 4, 22);
          const o = ease(frame, at, 10);
          if (o <= 0) return null;
          const w = BAR_W * s.hitRate * p;
          const loss = i > 0 ? ease(frame, lossAt[i], 10) : 0;
          return (
            <div key={i} style={{ position: "absolute", left: X0, top: rowY(i), height: 40, display: "flex", alignItems: "center", opacity: o }}>
              <span style={{ ...note(22, INK), width: BAR_X - X0 - 20, whiteSpace: "nowrap" }}>
                cache holds <b>{SIZE_NAME[i]}</b>
              </span>
              <span style={{ width: w, height: 34, background: BAR, borderRadius: 4, marginLeft: 0 }} />
              <span style={{ ...note(24, BLUE_INK), fontWeight: 700, marginLeft: 16, whiteSpace: "nowrap" }}>
                <Num>{pct(s.hitRate * p)}</Num>
              </span>
              {i > 0 ? (
                <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, marginLeft: 24, whiteSpace: "nowrap", opacity: loss }}>
                  ×<Num>{(Math.round(s.lossMultiplier * 10) / 10).toFixed(1)}</Num>
                </span>
              ) : null}
            </div>
          );
        })}
        <Line at={sizeAt[0] + 10} x={BAR_X} y={rowY(3) - h(4)} size={20} color={INK_SOFT}>
          share of redirects the cache answers
          <span style={{ color: ACCENT_INK, opacity: ease(frame, lossAt[1], 10) }}>, and the database&apos;s reads if it dies</span>
        </Line>

        {/* ── A dead cache sends every read to the store. ── */}
        <Node x={D.app.x} y={appMid - 30} w={D.app.w} h={60} at={betterAt} tone="plain" title="app" size={22} />
        <Node x={D.box.x} y={cacheMid - 30} w={D.box.w} h={60} at={betterAt + 4} tone={dead > 0.5 ? "bad" : "data"} title={dead > 0.5 ? "cache ✕" : "cache"} size={22} out={replicaAt} />
        <Node x={D.box.x} y={cacheMid - 30} w={D.box.w} h={60} at={replicaAt} tone="ok" title="cache replica" size={21} />
        <Node x={D.box.x} y={storeMid - 30} w={D.box.w} h={60} at={betterAt + 8} tone={dead > 0.5 && replica < 0.5 ? "bad" : "data"} title="database" size={22} />
        <Flow points={[[D.app.x + D.app.w + 6, appMid - 14], [D.box.x - 60, appMid - 14], [D.box.x - 60, cacheMid], [D.box.x - 8, cacheMid]]} at={betterAt + 8} color={BAR} width={2.4} head={12} out={deadAt} />
        <Flow points={[[D.app.x + D.app.w + 6, appMid - 14], [D.box.x - 60, appMid - 14], [D.box.x - 60, cacheMid], [D.box.x - 8, cacheMid]]} at={replicaAt + 4} color={OK} width={2.4} head={12} />
        <Flow
          points={[[D.app.x + D.app.w + 6, appMid + 14], [D.box.x - 60, appMid + 14], [D.box.x - 60, storeMid], [D.box.x - 8, storeMid]]}
          at={betterAt + 12}
          color={dead > 0.5 && replica < 0.5 ? ACCENT : BAR}
          width={2.4 + 3 * dead * (1 - replica)}
          head={12 + 4 * dead * (1 - replica)}
        />
        <Ink at={deadAt + 6} dur={12} out={replicaAt} style={{ left: D.app.x, top: storeMid + 44, whiteSpace: "nowrap" }}>
          <span style={{ ...label(21, ACCENT_INK), fontWeight: 700 }}>every read reaches the database</span>
        </Ink>
        <Ink at={replicaAt + 8} dur={12} style={{ left: D.app.x, top: storeMid + 44, whiteSpace: "nowrap" }}>
          <span style={{ ...label(21, OK_INK), fontWeight: 700 }}>so the cache needs replicas too</span>
        </Ink>
        <Line at={betterAt} x={D.app.x} y={y(640)} size={21} weight={650} color={INK_SOFT}>
          the better it works, the harder losing it lands
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
