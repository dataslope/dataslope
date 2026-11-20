import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT } from "../../editorial/style";
import { NextLine, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { KV } from "./data";
import { CACHE, DATA, Drift, Headline, Kicker, Line, MarkAt, Spot, Svg, X0 } from "./parts";

/** The node's bar, drawn small: 640 GB across 1,000 px. */
const PX_PER_GB = 1000 / 640;

/**
 * The close: the node from question 2, small, with the two things every
 * lever came down to lit as they are said (the weights each step reads, the
 * cache each request holds), the kingfisher back, and the bridge into Part
 * 10.
 */
export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("close").from;
  const bytesAt = n.word("close", "come down to bytes");
  const weightsAt = n.word("close", "the weights each step reads");
  const cacheAt = n.word("close", "the cache each request holds");
  const butAt = n.word("next", "fast and cheap isn't enough");
  const goodAt = n.word("next", "whether the answers are good");
  const nextAt = n.word("next", "Next");
  const end = n.durationInFrames;

  const top = y(420);
  const barH = h(70);
  const wPx = KV.weightsGB * PX_PER_GB;
  const freePx = KV.freeGB * PX_PER_GB;
  const cells = KV.fit8k;
  const perRow = Math.ceil(cells / 2);
  const cw = freePx / perRow;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={weightsAt} level={-31} />
      <Sfx name="el-tap" at={cacheAt} level={-31} />
      <Sfx name="el-pop" at={from + 6} level={-31} />
      <Sfx name="el-chime" at={nextAt + 4} level={-33} />

      <Drift from={from} to={end + 30}>
        <Kicker at={from}>Machine learning engineer interview questions · Serving LLMs</Kicker>
        <Headline lead="Most of it comes down to bytes" at={bytesAt - 6} size={64} />

        <Line at={from + 4} x={X0} y={top - h(46)} size={24} color={INK_SOFT}>
          The node: <Num>{KV.gpus}</Num> × <Num>{KV.gpuGB}</Num> GB
        </Line>
        <Svg>
          <rect x={X0 + 3} y={top + 3} width={(wPx - 4) * ease(frame, from + 6, 16)} height={barH - 6} rx={4} fill={DATA} />
          {Array.from({ length: cells }, (_, k) => {
            const r = Math.floor(k / perRow);
            const c = k % perRow;
            const p = ease(frame, from + 10 + (c / perRow) * 16, 6);
            if (p <= 0) return null;
            const rowH = (barH - 10 - 4) / 2;
            return <rect key={k} x={X0 + wPx + 2 + c * cw} y={top + 5 + r * (rowH + 4)} width={Math.max(1, cw - 1.6)} height={rowH * p} rx={1.5} fill={CACHE} />;
          })}
          <rect x={X0} y={top} width={KV.nodeGB * PX_PER_GB} height={barH} rx={8} fill="none" stroke={INK} strokeWidth={2} opacity={ease(frame, from + 2, 12)} />
        </Svg>
        <Line at={weightsAt} x={X0} y={top + barH + h(16)} size={26} color={INK}>
          <MarkAt amount={ease(frame, weightsAt + 4, 12)}>Weights read per step</MarkAt>
        </Line>
        <Line at={cacheAt} x={X0 + wPx + 220} y={top + barH + h(16)} size={26} color={INK}>
          <MarkAt amount={ease(frame, cacheAt + 4, 12)}>Cache held per request</MarkAt>
        </Line>

        <Line at={butAt} x={X0} y={y(660)} size={30} color={INK}>
          Fast and cheap
          <span style={{ opacity: ease(frame, goodAt - 4, 12) }}>, but are the answers good?</span>
        </Line>
        <NextLine at={nextAt} x={X0} y={y(760)} width={1000}>
          evaluating LLM systems
        </NextLine>

        <Spot id="kingfisher" at={from + 6} x={1400} y={y(300)} w={380} />
      </Drift>
    </AbsoluteFill>
  );
};
