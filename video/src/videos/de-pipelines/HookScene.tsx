import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Flow, Headline, HERO, Kicker, Node, OK_INK, Pill, Spot, X0 } from "./parts";

/** The row the pipeline runs along, and its stages. */
const ROW = 430;
const BOX_H = 92;
const SRC = { x: X0, w: 230 };
const JOB = { x: 440, w: 300 };
const OUT = { x: 830, w: 250 };
const FAN_X = 1190;
const FAN_W = 250;
const FAN_H = 62;
/** What reads the pipeline's output: three tables and a dashboard. */
const READERS = ["daily_revenue", "customer_ltv", "returns", "dashboard"];

/**
 * The opening: one script that cleans yesterday's orders, run every night,
 * with three tables and a dashboard pointed at what it writes, which makes it
 * a pipeline. Then the three things a pipeline has to survive, each pinned to
 * the part of the drawing it hits, and the round: eleven questions.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const scriptAt = n.word("hook", "A script that cleans");
  const nightAt = n.word("hook", "Run it every night");
  const pointAt = n.word("hook", "point three tables");
  const dashAt = n.word("hook", "and a dashboard");
  const writesAt = n.word("hook", "at what it writes");
  const pipeAt = n.word("hook", "it's a pipeline");
  const rerunAt = n.word("hook", "survive a rerun");
  const columnsAt = n.word("hook", "a source that changes its columns");
  const arrivingAt = n.word("hook", "data that never stops arriving");
  const elevenAt = n.word("plan", "Eleven questions");
  const eightAt = n.word("plan", "Eight get a figure each");
  const threeAt = n.word("plan", "three go quickly");
  const end = n.beat("plan").to;

  const top = y(ROW);
  const mid = top + BOX_H / 2;
  const dim = elevenAt - 4;
  // Seven nights of runs, ticking along above the job.
  const nights = Array.from({ length: 7 }, (_, i) => nightAt + 4 + i * 4);
  // Data that never stops arriving: dots flowing into the source.
  const flowIn = ease(frame, arrivingAt, 10);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={scriptAt + 2} level={-30} />
      <Sfx name="el-sprinkle" at={nightAt + 4} level={-31} />
      <Sfx name="el-pencil" at={pointAt} level={-34} />
      {[rerunAt, columnsAt, arrivingAt].map((at) => (
        <Sfx key={at} name="el-tap" at={at + 2} level={-31} />
      ))}
      <Sfx name="el-chime" at={elevenAt} level={-32} />

      <Drift from={0} to={end + 20}>
        <Kicker at={scriptAt}>Data engineer interview prep · Pipelines and systems</Kicker>
        <Headline lead="A script, run every night," turn="is a pipeline." at={nightAt} turnAt={pipeAt} size={66} />

        {/* The script, then its source and its output. */}
        <Node x={JOB.x} y={top} w={JOB.w} h={BOX_H} at={scriptAt} tone="plain" title="clean_orders.py" sub="a script" dim={dim} />
        <Node x={SRC.x} y={top} w={SRC.w} h={BOX_H} at={scriptAt + 10} title="orders" sub="the source" dim={dim} />
        <Flow points={[[SRC.x + SRC.w + 6, mid], [JOB.x - 8, mid]]} at={scriptAt + 14} dim={dim} color={BAR} />
        <Node x={OUT.x} y={top} w={OUT.w} h={BOX_H} at={scriptAt + 18} title="orders_clean" sub="what it writes" dim={dim} />
        <Flow points={[[JOB.x + JOB.w + 6, mid], [OUT.x - 8, mid]]} at={scriptAt + 22} dim={dim} color={BAR} />

        {/* Every night: seven runs tick in above the job. */}
        <div style={{ position: "absolute", left: JOB.x, top: top - h(64), width: JOB.w, display: "flex", justifyContent: "space-between", opacity: 1 - ease(frame, dim, 12) * 0.6 }}>
          {nights.map((at, i) => {
            const p = ease(frame, at, 8);
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: p }}>
                <span style={{ width: 18, height: 18, borderRadius: 9, background: BAR, transform: `scale(${0.4 + 0.6 * p})` }} />
              </div>
            );
          })}
        </div>
        <Note at={nightAt + 6} x={JOB.x} y={top - h(112)} dim={dim}>
          <span style={{ ...label(21, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>every night</span>
        </Note>

        {/* Three tables and a dashboard read what it writes. */}
        {READERS.map((name, i) => {
          const at = (i < 3 ? pointAt + 4 + i * 5 : dashAt + 2);
          const rowTop = top + BOX_H / 2 - (READERS.length * (FAN_H + 16) - 16) / 2 + i * (FAN_H + 16);
          return (
            <React.Fragment key={name}>
              <Flow
                points={[
                  [OUT.x + OUT.w + 6, mid],
                  [OUT.x + OUT.w + 50, mid],
                  [OUT.x + OUT.w + 50, rowTop + FAN_H / 2],
                  [FAN_X - 8, rowTop + FAN_H / 2],
                ]}
                at={Math.max(at, writesAt - 6)}
                color={BAR}
                width={2.2}
                head={13}
                dim={dim}
              />
              <Node
                x={FAN_X}
                y={rowTop}
                w={FAN_W}
                h={FAN_H}
                at={at}
                tone={i < 3 ? "data" : "plain"}
                title={name}
                size={i < 3 ? 22 : 23}
                dim={dim}
              />
            </React.Fragment>
          );
        })}

        {/* What it has to survive, each where it hits. */}
        <Pill x={JOB.x + 30} y={top + BOX_H + h(26)} at={rerunAt} tone="bad" dim={dim}>
          ↻ a rerun
        </Pill>
        <Pill x={SRC.x} y={top + BOX_H + h(26)} at={columnsAt} tone="bad" dim={dim}>
          new columns
        </Pill>
        <Pill x={SRC.x} y={top + BOX_H + h(84)} at={arrivingAt} tone="bad" dim={dim}>
          data that never stops
        </Pill>
        {/* The arrivals: a stream of dots falling into the source from above. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: flowIn * (1 - ease(frame, dim, 12) * 0.6) }}>
          {Array.from({ length: 4 }, (_, i) => {
            const t = (((frame - arrivingAt) / 26 + i / 4) % 1 + 1) % 1;
            return <circle key={i} cx={SRC.x + SRC.w / 2} cy={top - h(90) + t * h(84)} r={7} fill={BAR} opacity={Math.sin(t * Math.PI)} />;
          })}
        </svg>

        <Spot id={HERO.id} at={scriptAt + 16} left={1460} top={y(640)} width={380} height={206} />

        {/* The round. */}
        <Note at={elevenAt - 2} x={X0} y={y(760)}>
          <span style={{ ...note(34, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            Pipelines and the systems around them: <span style={{ color: BLUE_INK }}><Num>11</Num> questions</span>
          </span>
        </Note>
        <Note at={eightAt - 2} x={X0} y={y(830)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>
              <Num>8</Num>
            </b>{" "}
            with a figure each
          </span>
        </Note>
        <Note at={threeAt - 2} x={X0 + 380} y={y(830)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>
              <Num>3</Num>
            </b>{" "}
            quick ones at the end
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
