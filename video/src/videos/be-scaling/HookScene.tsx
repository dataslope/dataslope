import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { TRAFFIC } from "./data";
import { commas, Drift, Flow, Headline, Kicker, Mark, Node, roundTo, Spot, X0 } from "./parts";

const BH = 84;
const CLIENT = { x: X0, w: 170 };
const LB = { x: 370, w: 240 };
const APP = { x: 700, w: 240 };
const STORE = { x: 1040, w: 250 };
/** Box centres, in the layout's coordinates. */
const ROW = { mid: 470, upper: 400, lower: 540 };
const CHIP = 50;
const CHIP_GAP = 14;

/** A small red question mark on a box's corner: "every box has to answer". */
const Query: React.FC<{ x: number; y: number; at: number; dim: number }> = ({ x, y, at, dim }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 12);
  if (p <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 17,
        top: y - 17,
        width: 34,
        height: 34,
        borderRadius: 17,
        background: ACCENT,
        border: `3px solid ${PAPER}`,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...label(21, PAPER),
        fontWeight: 800,
        transform: `scale(${Math.min(1.2, p)})`,
        opacity: Math.min(1, p) * (1 - ease(frame, dim, 12) * 0.65),
      }}
    >
      ?
    </div>
  );
};

/**
 * The opening: Part 1's shortener drawn box by box as it is named, sized for
 * its peak; then ten times that, a question mark on every box, and the round
 * of twelve laid out as chips.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const shortAt = n.word("hook", "URL shortener");
  const lbAt = n.word("hook", "a load balancer");
  const appsAt = n.word("hook", "two stateless app servers");
  const cacheAt = n.word("hook", "a cache");
  const storeAt = n.word("hook", "a key-value store");
  const sizedAt = n.word("hook", "about thirty-five thousand");
  const tenAt = n.word("hook-10x", "ten times the traffic");
  const bigAt = n.word("hook-10x", "three hundred and fifty thousand");
  const everyAt = n.word("hook-10x", "every box");
  const twelveAt = n.word("plan", "Twelve questions");
  const nineAt = n.word("plan", "nine worked through");
  const quickAt = n.word("plan", "two quick ones");
  const feedAt = n.word("plan", "a news feed");
  const end = n.beat("plan").to;

  const mid = y(ROW.mid);
  const up = y(ROW.upper);
  const low = y(ROW.lower);
  const top = (c: number) => c - BH / 2;
  const dim = twelveAt - 2;
  const peak = roundTo(TRAFFIC.part1Peak, 2);
  const tenfold = roundTo(TRAFFIC.peak, 2);

  // The twelve chips: nine worked through, two quick, the news feed apart.
  const chipX = (i: number) => X0 - 12 + i * (CHIP + CHIP_GAP) + (i === 11 ? 50 : 0);
  const chipsTop = y(812);
  const chipAt = (i: number) => (i < 9 ? nineAt + i * 2 : i < 11 ? quickAt + (i - 9) * 3 : feedAt);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={lbAt} level={-31} />
      <Sfx name="el-tap" at={appsAt} level={-31} />
      <Sfx name="el-tap" at={cacheAt} level={-31} />
      <Sfx name="el-tap" at={storeAt} level={-31} />
      <Sfx name="el-pop" at={shortAt + 6} level={-30} />
      <Sfx name="el-pencil" at={bigAt} level={-34} />
      <Sfx name="el-sprinkle" at={everyAt} level={-31} />
      <Sfx name="el-sprinkle" at={nineAt} level={-32} />
      <Sfx name="el-tap" at={feedAt} level={-30} />

      <Drift from={0} to={end + 30}>
        <Kicker at={shortAt - 10}>Backend engineer interview questions · Scaling a design</Kicker>
        <Headline lead="A URL shortener that works," turn="at ten times the traffic" at={shortAt - 4} turnAt={tenAt} size={64} />

        {/* The diagram, box by box as named. */}
        <Node x={CLIENT.x} y={top(mid)} w={CLIENT.w} h={BH} at={shortAt + 4} tone="plain" title="client" dim={dim} />
        <Node x={LB.x} y={top(mid)} w={LB.w} h={BH} at={lbAt} tone="plain" title="load balancer" dim={dim} />
        <Flow points={[[CLIENT.x + CLIENT.w + 6, mid], [LB.x - 8, mid]]} at={lbAt + 4} color={BAR} dim={dim} />
        {[up, low].map((c, i) => (
          <React.Fragment key={i}>
            <Node x={APP.x} y={top(c)} w={APP.w} h={BH} at={appsAt + i * 6} tone="plain" title="app server" sub="stateless" dim={dim} />
            <Flow
              points={[
                [LB.x + LB.w + 6, mid + (i ? 14 : -14)],
                [LB.x + LB.w + 40, mid + (i ? 14 : -14)],
                [LB.x + LB.w + 40, c],
                [APP.x - 8, c],
              ]}
              at={appsAt + 4 + i * 6}
              color={BAR}
              dim={dim}
            />
          </React.Fragment>
        ))}
        <Node x={STORE.x} y={top(up)} w={STORE.w} h={BH} at={cacheAt} tone="data" title="cache" dim={dim} />
        <Node x={STORE.x} y={top(low)} w={STORE.w} h={BH} at={storeAt} tone="data" title="key-value store" dim={dim} />
        {/* Each app server reads the cache and the store. */}
        <Flow points={[[APP.x + APP.w + 6, up], [STORE.x - 8, up]]} at={cacheAt + 4} color={BAR} width={2.2} head={13} dim={dim} />
        <Flow points={[[APP.x + APP.w + 6, low - 18], [STORE.x - 8, up + 18]]} at={cacheAt + 8} color={BAR} width={2.2} head={13} dim={dim} />
        <Flow points={[[APP.x + APP.w + 6, low], [STORE.x - 8, low]]} at={storeAt + 4} color={BAR} width={2.2} head={13} dim={dim} />
        <Flow points={[[APP.x + APP.w + 6, up + 18], [STORE.x - 8, low - 18]]} at={storeAt + 8} color={BAR} width={2.2} head={13} dim={dim} />

        {/* Every box has to answer for it. */}
        {[
          [CLIENT.x + CLIENT.w, top(mid)],
          [LB.x + LB.w, top(mid)],
          [APP.x + APP.w, top(up)],
          [APP.x + APP.w, top(low)],
          [STORE.x + STORE.w, top(up)],
          [STORE.x + STORE.w, top(low)],
        ].map(([qx, qy], i) => (
          <Query key={i} x={qx - 4} y={qy + 4} at={everyAt + i * 3} dim={dim} />
        ))}

        <Spot id="bison" at={shortAt + 6} x={1400} y={y(372)} w={420} />

        {/* Its traffic, then ten times it. */}
        <Ink at={sizedAt} dur={16} style={{ left: X0, top: y(640), whiteSpace: "nowrap", opacity: 1 - ease(frame, dim, 12) * 0.5 }}>
          <span style={{ ...note(30, INK), fontWeight: 600 }}>
            Sized for about <b style={{ color: BLUE_INK }}><Num>{commas(peak)}</Num></b> redirects a second at peak
          </span>
        </Ink>
        <Ink at={tenAt} dur={16} style={{ left: X0, top: y(700), whiteSpace: "nowrap", opacity: 1 - ease(frame, dim, 12) * 0.5 }}>
          <span style={{ ...note(30, INK), fontWeight: 600 }}>
            Ten times the traffic:{" "}
            <Mark at={bigAt}>
              <b><Num>{commas(tenfold)}</Num></b> a second
            </Mark>
          </span>
        </Ink>

        {/* The round: twelve questions. */}
        <Ink at={twelveAt} dur={14} style={{ left: X0, top: y(770), whiteSpace: "nowrap" }}>
          <span style={{ ...label(24, INK), fontWeight: 700 }}>Twelve questions</span>
        </Ink>
        {/* The twelve as plain numerals: nine in the data blue, two quick ones
            in gray, and the news feed set apart, lit on its name. */}
        {Array.from({ length: 12 }, (_, i) => {
          const p = ease(frame, chipAt(i), 10);
          if (p <= 0) return null;
          const quick = i === 9 || i === 10;
          const feed = i === 11;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: chipX(i),
                top: chipsTop,
                width: CHIP,
                textAlign: "center",
                ...label(30, quick ? INK_SOFT : feed ? INK : BLUE_INK),
                fontWeight: 700,
                opacity: p,
                transform: `translateY(${(1 - p) * 10}px)`,
              }}
            >
              {feed ? (
                <Mark at={feedAt + 4}>
                  <Num>12</Num>
                </Mark>
              ) : (
                <Num>{i + 1}</Num>
              )}
            </div>
          );
        })}
        <Ink at={nineAt + 8} dur={14} style={{ left: X0, top: chipsTop + 50, whiteSpace: "nowrap" }}>
          <span style={{ ...note(21, INK_SOFT) }}>worked through on this diagram</span>
        </Ink>
        <Ink at={quickAt + 6} dur={14} style={{ left: chipX(9) + 6, top: chipsTop + 50, whiteSpace: "nowrap" }}>
          <span style={{ ...note(21, INK_SOFT) }}>quick</span>
        </Ink>
        <Ink at={feedAt + 4} dur={14} style={{ left: chipX(11) - 30, top: chipsTop + 50, whiteSpace: "nowrap" }}>
          <span style={{ ...note(21, INK), fontWeight: 650 }}>a news feed</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
