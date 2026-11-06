import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ESTIMATE } from "./data";
import { artH, Drift, int, Line, Mark, OK_INK, pulse, sig, Spot, X0 } from "./parts";

const ST_X = 1060;
const BW_X = 1520;
const E = ESTIMATE;
const A = E.assumptions;

/** An assumption, as said: gray italics, "assume" first. */
const assume = (text: React.ReactNode) => (
  <span style={{ fontStyle: "italic", color: INK_SOFT }}>
    assume <span style={{ fontStyle: "italic" }}>{text}</span>
  </span>
);

/**
 * Question 2, the estimate: product scale turned into load, on the video's
 * own assumptions, each said as one. The rule that does most of the work (a
 * million a day is about twelve a second), then writes, reads at a hundred to
 * one, and the peak at three times; storage and bandwidth beside it, both
 * small. What decides this system is its read traffic, and the cache.
 */
export const EstimateScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("q2").from;
  const qAt = n.word("q2", "Question two");
  const textAt = n.word("q2", "What back-of-the-envelope numbers");
  const envAt = n.word("q2", "back-of-the-envelope");
  const qpsHead = n.word("q2", "requests per second");
  const qpsAt = n.word("q2", "or QPS");
  const stHead = n.word("q2", "then storage");
  const bwHead = n.word("q2", "and bandwidth");
  const trickAt = n.word("q2-trick", "A million requests a day");
  const twelveAt = n.word("q2-trick", "about twelve a second");
  const linksAt = n.word("q2-writes", "assume ten million new links a day");
  const writesAt = n.word("q2-writes", "about a hundred and twenty writes a second");
  const ratioAt = n.word("q2-reads", "a hundred to one or more");
  const perLinkAt = n.word("q2-reads", "assume a hundred redirects per link");
  const billionAt = n.word("q2-reads", "a billion a day");
  const readsAt = n.word("q2-reads", "about twelve thousand a second");
  const peakAt = n.word("q2-peak", "Size for the peak");
  const threeAt = n.word("q2-peak", "so take three");
  const peakQpsAt = n.word("q2-peak", "about thirty-five thousand redirects a second");
  const bytesAt = n.word("q2-storage", "say five hundred");
  const gbAt = n.word("q2-storage", "five gigabytes a day");
  const tbAt = n.word("q2-storage", "about nine terabytes");
  const halfKbAt = n.word("q2-band", "say half a kilobyte per redirect");
  const mbAt = n.word("q2-band", "about seventeen megabytes a second");
  const neitherAt = n.word("q2-verdict", "Neither is hard");
  const decidedAt = n.word("q2-verdict", "decided by its read traffic");
  const cacheAt = n.word("q2-verdict", "a cache can answer");
  const end = n.beat("q2-verdict").to;

  const headY = y(296);
  const ruleY = y(360);
  const pair = (i: number) => y(456) + i * 140;
  const small = ease(frame, neitherAt, 14) * 0.55;
  const lit = pulse(frame, decidedAt, 30);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={qpsHead} level={-36} />
      <Sfx name="el-tap" at={stHead} level={-36} />
      <Sfx name="el-tap" at={bwHead} level={-36} />
      <Sfx name="el-pencil" at={trickAt} level={-36} />
      <Sfx name="el-tap" at={twelveAt} level={-34} />
      <Sfx name="el-tap" at={writesAt} level={-34} />
      <Sfx name="el-tap" at={readsAt} level={-34} />
      <Sfx name="el-pencil" at={peakQpsAt} level={-35} />
      <Sfx name="el-tap" at={gbAt} level={-35} />
      <Sfx name="el-tap" at={tbAt} level={-35} />
      <Sfx name="el-tap" at={mbAt} level={-35} />
      <Sfx name="el-chime" at={cacheAt + 4} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={58}>
          What back-of-the-envelope numbers should you estimate?
        </QuestionCard>
        <Spot id="envelope" at={envAt} left={1520} top={y(690)} width={200} height={artH("envelope", 200)} />

        {/* Three slots, filled as the beats go. */}
        <Line x={X0} y={headY} at={qpsHead} size={29} weight={700}>
          Requests per second<span style={{ color: BLUE_INK, opacity: ease(frame, qpsAt, 10) }}> (QPS)</span>
        </Line>
        <Line x={ST_X} y={headY} at={stHead} size={29} weight={700} dim={neitherAt}>
          Storage
        </Line>
        <Line x={BW_X} y={headY} at={bwHead} size={29} weight={700} dim={neitherAt}>
          Bandwidth
        </Line>

        {/* The rule. */}
        <div
          style={{
            position: "absolute",
            left: X0,
            top: ruleY - 2,
            display: "flex",
            alignItems: "center",
            opacity: ease(frame, trickAt, 12),
          }}
        >
          <span style={{ ...note(27, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            <Num>1,000,000</Num> a day ÷ <Num>86,400</Num> s
            <span style={{ color: BLUE_INK, fontWeight: 700, opacity: ease(frame, twelveAt, 10) }}>
              {" "}
              ≈ <Num>{sig(E.millionPerDayQps)}</Num> a second
            </span>
          </span>
        </div>

        {/* Writes, reads, the peak. */}
        <Line x={X0} y={pair(0)} at={linksAt} size={25}>
          {assume(
            <>
              <Num>{int(A.newLinksPerDay)}</Num> new links a day
            </>,
          )}
        </Line>
        <Line x={X0} y={pair(0) + 40} at={writesAt} size={28} weight={700} color={BLUE_INK}>
          ≈ <Num>{int(sig(E.writeQps))}</Num> writes a second
        </Line>
        <Line x={X0} y={pair(1)} at={ratioAt} size={25}>
          <span style={{ fontStyle: "italic", color: INK_SOFT }}>read-heavy, 100 : 1 or more, so</span>
          <span style={{ opacity: ease(frame, perLinkAt, 10) }}>
            {" "}
            {assume(
              <>
                <Num>{A.readsPerWrite}</Num> redirects per link
              </>,
            )}
          </span>
        </Line>
        <Line x={X0} y={pair(1) + 40} at={billionAt} size={28} weight={700} color={BLUE_INK}>
          <Num>{int(E.readsPerDay)}</Num> a day
          <span style={{ opacity: ease(frame, readsAt, 10) }}>
            {" "}
            ≈ <Num>{int(sig(E.readQps))}</Num> a second
          </span>
        </Line>
        <Line x={X0} y={pair(2)} at={peakAt} size={25}>
          <span style={{ fontStyle: "italic", color: INK_SOFT }}>peaks run 2 to 3 times the average, so</span>
          <span style={{ opacity: ease(frame, threeAt, 10) }}>
            {" "}
            {assume(
              <>
                <Num>{A.peakFactor}</Num> times
              </>,
            )}
          </span>
        </Line>
        <Line x={X0} y={pair(2) + 40} at={peakQpsAt} size={28} weight={700} color={BLUE_INK} style={{ transform: `scale(${1 + 0.06 * lit})`, transformOrigin: "0 50%" }}>
          <Mark at={peakQpsAt + 6} color={HIGHLIGHT}>
            ≈ <Num>{int(sig(E.peakReadQps))}</Num> redirects a second
          </Mark>
        </Line>
        <Line x={X0 + 450} y={pair(2) + 40} at={cacheAt} size={28} weight={700} color={OK_INK}>
          and a cache
        </Line>

        {/* Storage. */}
        <Line x={ST_X} y={ruleY} at={bytesAt} size={25} dim={neitherAt}>
          {assume(
            <>
              <Num>{A.bytesPerLink}</Num> bytes a link
            </>,
          )}
        </Line>
        <Line x={ST_X} y={ruleY + 60} at={gbAt - 4} size={27} dim={neitherAt}>
          × <Num>{int(A.newLinksPerDay)}</Num> a day
        </Line>
        <Line x={ST_X} y={ruleY + 120} at={gbAt} size={27} weight={700} color={BLUE_INK} dim={neitherAt}>
          = <Num>{Math.round(E.storagePerDayBytes / 1e9)}</Num> GB a day
        </Line>
        <Line x={ST_X} y={ruleY + 180} at={tbAt} size={27} weight={700} color={BLUE_INK} dim={neitherAt}>
          ≈ <Num>{Math.round(E.storageTotalBytes / 1e12)}</Num> TB in <Num>{A.years}</Num> years
        </Line>

        {/* Bandwidth. */}
        <Line x={BW_X} y={ruleY} at={halfKbAt} size={25} dim={neitherAt}>
          {assume(
            <>
              <Num>{A.bytesPerRedirect}</Num> B a redirect
            </>,
          )}
        </Line>
        <Line x={BW_X} y={ruleY + 60} at={mbAt - 6} size={27} dim={neitherAt}>
          × <Num>{int(sig(E.peakReadQps))}</Num> a second
        </Line>
        <Line x={BW_X} y={ruleY + 120} at={mbAt} size={27} weight={700} color={BLUE_INK} dim={neitherAt}>
          ≈ <Num>{Math.round(E.peakBandwidthBytesPerSecond / 1e6)}</Num> MB/s at peak
        </Line>
        <div
          style={{
            position: "absolute",
            left: ST_X - 30,
            top: headY - 6,
            width: 1.5,
            height: ruleY + 226 - headY,
            background: HAIRLINE,
            opacity: ease(frame, stHead, 12) * (1 - small),
          }}
        />
      </Drift>
    </AbsoluteFill>
  );
};
