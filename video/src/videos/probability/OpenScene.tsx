import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, headline, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COIN, num } from "./data";
import { Arrow, Bracket, Coin, Count, DATA, Headline, Kicker, lerp, Spot, STAT, STAT_INK, Strike, Svg, Sweep } from "./parts";

/** The two little panels of the bridge: data you have, data you haven't. */
const SHAPE = [0.18, 0.42, 0.74, 1, 0.86, 0.62, 0.4, 0.22, 0.1];
const PANEL = { w: 640, base: 700, tall: 330, x: [160, 1000] } as const;
/** The strip of the first flips. */
const STRIP = { x0: 186, y: 712, pitch: 56, r: 22, count: 24 } as const;

/**
 * Part 1 opens on Unit 2's bridge (a summary describes the data you have;
 * reasoning about data you haven't seen takes probability), then asks what
 * "one half" can mean for a single flip, answers with the long run, and runs
 * the lesson's 100,000 flips.
 */
export const OpenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const summaryAt = n.word("hook", "summary");
  const plotAt = n.word("hook", "plot");
  const haveAt = n.word("hook", "already have");
  const seenAt = n.word("hook", "haven't seen");
  const needAt = n.word("hook", "probability");
  const meansAt = n.word("hook", "even means");
  const reasonAt = n.word("hook", "reason");
  const startingAt = n.word("hook", "starting");
  const halfFrom = n.beat("half").from;
  const coinAt = n.word("half", "coin");
  const oneHalfAt = n.word("half", "one half");
  const singleAt = n.word("half", "single flip");
  const tailsAt = n.word("half", "tails");
  const noHalfAt = n.word("half", "no half");
  const longRunAt = n.word("longrun", "long run");
  const frequentistAt = n.word("longrun", "frequentist");
  const fractionAt = n.word("longrun", "fraction");
  const repeatAt = n.word("longrun", "repeat");
  const overAt = n.word("longrun", "over and over");
  const codeAt = n.word("flips", "code");
  const hundredAt = n.word("flips", "a hundred thousand");
  const fiftyAt = n.word("flips", "fifty thousand");
  const comeUpAt = n.word("flips", "come up heads");
  const evenAt = n.word("share", "even though");
  const pointAt = n.word("share", "Point");
  const closeAt = n.word("share", "Close");
  const sevenAt = n.word("share", "first seven");
  const headsAt = n.word("share", "all heads");
  const llnInFrom = n.beat("lln-in").from;
  const longAt = n.word("lln-in", "long run");

  const panelsOut = ease(frame, halfFrom - 8, 14);
  const stripAt = (i: number) => lerp(repeatAt - 4, codeAt + 6, i / (STRIP.count - 1));
  const streakLit = ease(frame, sevenAt - 2, 10);
  const othersBack = ease(frame, evenAt - 2, 12);
  // Every head in the strip flashes as the count of heads lands.
  const headsFlash = ease(frame, comeUpAt - 2, 6) * (1 - ease(frame, comeUpAt + 8, 12));
  // The one-flip row sets back once the frequentist answer arrives.
  const defDim = ease(frame, frequentistAt - 2, 14);
  // The bridge's panels set back as the question takes over.
  const panelsBack = ease(frame, startingAt - 4, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: the plot's bars, the coin, the strip of flips, the count,
           the streak ── */}
      <Sfx name="el-pop" at={plotAt - 2} level={-30} />
      <Sfx name="el-pencil" at={seenAt - 2} level={-34} />
      <Sfx name="el-pop" at={coinAt - 2} level={-30} />
      <Sfx name="el-scratch" at={noHalfAt + 4} level={-31} />
      <Sfx name="el-sprinkle" at={stripAt(0)} level={-34} />
      <Sfx name="el-tap" at={fiftyAt - 2} level={-28} />
      <Sfx name="el-pencil" at={sevenAt - 2} level={-34} />

      <Kicker at={hookFrom - 10}>What a probability means</Kicker>

      {/* ── Headlines ── */}
      <Headline
        top={y(150)}
        first="What does a probability"
        second="even mean?"
        firstAt={startingAt - 2}
        secondAt={meansAt - 4}
        out={llnInFrom - 6}
      />
      <Headline top={y(150)} first="How long is" second="the long run?" firstAt={llnInFrom - 2} secondAt={longAt - 4} />

      {/* ── The bridge: what you have, what you haven't seen ── */}
      {PANEL.x.map((x0, k) => {
        const seen = k === 0;
        const at = seen ? plotAt - 4 : seenAt - 4;
        const barW = PANEL.w / SHAPE.length;
        return (
          <React.Fragment key={k}>
            <Ink at={seen ? haveAt - 4 : seenAt - 2} dur={14} out={halfFrom - 8} style={{ left: x0, top: y(300), whiteSpace: "nowrap" }}>
              <span style={label(24, seen ? INK : INK_SOFT)}>{seen ? "The data you have" : "Data you haven't seen"}</span>
            </Ink>
            <Svg opacity={(1 - panelsOut) * (1 - panelsBack * 0.45)}>
              {SHAPE.map((s, i) => {
                const g = ease(frame, at + i * 4, 14);
                if (g <= 0) return null;
                const bh = h(PANEL.tall * s) * g;
                return seen ? (
                  <rect key={i} x={x0 + i * barW + 2} y={y(PANEL.base) - bh} width={barW - 4} height={bh} fill={DATA} opacity={0.8} />
                ) : (
                  <rect
                    key={i}
                    x={x0 + i * barW + 3}
                    y={y(PANEL.base) - bh}
                    width={barW - 6}
                    height={bh}
                    fill="none"
                    stroke={INK_SOFT}
                    strokeWidth={2}
                    strokeDasharray="6 6"
                  />
                );
              })}
              <line x1={x0} x2={x0 + PANEL.w * ease(frame, at, 14)} y1={y(PANEL.base) + 1} y2={y(PANEL.base) + 1} stroke={INK} strokeWidth={1.6} />
              {seen ? (
                <line
                  x1={x0 + PANEL.w * 0.44}
                  x2={x0 + PANEL.w * 0.44}
                  y1={y(PANEL.base) + 6}
                  y2={y(PANEL.base) - h(PANEL.tall + 26) * ease(frame, summaryAt - 4, 14)}
                  stroke={STAT}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              ) : null}
            </Svg>
            {seen ? (
              <Note at={summaryAt} x={x0 + PANEL.w * 0.44 + 14} y={y(PANEL.base - PANEL.tall - 40)} out={halfFrom - 8}>
                <span style={{ ...note(21, STAT_INK), fontWeight: 650 }}>a summary</span>
              </Note>
            ) : (
              <div
                style={{
                  position: "absolute",
                  left: x0 + PANEL.w / 2,
                  top: y(PANEL.base - PANEL.tall * 0.55),
                  transform: `translate(-50%, -50%) scale(${lerp(0.7, 1, ease(frame, needAt - 2, 14))})`,
                  opacity: ease(frame, needAt - 2, 14) * (1 - panelsOut),
                  ...headline(120, true),
                  color: STAT_INK,
                }}
              >
                ?
              </div>
            )}
          </React.Fragment>
        );
      })}
      {/* From what you have to what you haven't seen. */}
      <Arrow from={[PANEL.x[0] + PANEL.w + 30, y(PANEL.base - PANEL.tall * 0.5)]} to={[PANEL.x[1] - 40, y(PANEL.base - PANEL.tall * 0.5)]} at={reasonAt - 4} dur={14} out={halfFrom - 8} color={INK_SOFT} width={3} />
      <Note at={needAt - 2} x={PANEL.x[1]} y={y(PANEL.base + 24)} out={halfFrom - 8}>
        <span style={{ ...body(30, true), color: INK, whiteSpace: "nowrap" }}>Reasoning about it takes probability.</span>
      </Note>

      {/* ── One half, for one flip ── */}
      <Ink at={oneHalfAt - 4} dur={18} style={{ left: 160, top: y(290), whiteSpace: "nowrap", opacity: 1 - defDim * 0.4 }}>
        <span style={{ ...note(24, INK_SOFT), display: "block", marginBottom: 8 }}>Probability of heads</span>
        <span style={{ ...headline(128), color: INK }}>½</span>
      </Ink>
      <Ink at={singleAt - 4} dur={14} style={{ left: 640, top: y(300), whiteSpace: "nowrap", opacity: 1 - defDim * 0.4 }}>
        <span style={note(24, INK_SOFT)}>One flip</span>
      </Ink>
      <div style={{ opacity: 1 - defDim * 0.4 }}>
        <Coin x={680} y={y(420)} heads at={singleAt} r={38} />
        <Ink at={tailsAt - 8} dur={12} style={{ left: 742, top: y(420) - 20, whiteSpace: "nowrap" }}>
          <span style={note(26, INK_SOFT)}>or</span>
        </Ink>
        <Coin x={826} y={y(420)} heads={false} at={tailsAt - 2} r={38} />
        {/* Half a coin: the thing a single flip can't give you. */}
        <Svg opacity={ease(frame, noHalfAt - 2, 12)}>
          <path d={`M1000,${y(420) - 38} A38,38 0 0,0 1000,${y(420) + 38} Z`} fill={DATA} opacity={0.75} />
          <line x1={1000} x2={1000} y1={y(420) - 38} y2={y(420) + 38} stroke={INK} strokeWidth={1.5} strokeDasharray="4 4" />
        </Svg>
        <Note at={noHalfAt + 2} x={1060} y={y(420) - 18}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Strike at={noHalfAt + 6}>half a head</Strike>
          </span>
        </Note>
      </div>
      <Spot id="probability-coin" at={coinAt - 4} left={1480} top={y(232)} width={280} height={420} />

      {/* ── The long run ── */}
      <Ink at={longRunAt - 6} dur={20} style={{ left: 160, top: y(560), whiteSpace: "nowrap" }}>
        <span style={{ ...body(40), color: INK, opacity: 1 - defDim * 0.45 }}>
          A probability is the{" "}
          <Sweep at={fractionAt - 2} dur={14}>
            fraction of times
          </Sweep>{" "}
          something happens, in the <Sweep at={longRunAt}>long run</Sweep>.
        </span>
      </Ink>

      {/* The first flips of the lesson's hundred thousand. */}
      {COIN.first.slice(0, STRIP.count).map((f, i) => (
        <Coin
          key={i}
          x={STRIP.x0 + i * STRIP.pitch}
          y={y(STRIP.y)}
          heads={f === 1}
          at={stripAt(i)}
          r={STRIP.r}
          lit={Math.max(i < COIN.streak ? streakLit : 0, f === 1 ? headsFlash : 0)}
          dim={i >= COIN.streak ? othersBack : 0}
        />
      ))}
      <Bracket
        x0={STRIP.x0 - STRIP.r}
        x1={STRIP.x0 + (COIN.streak - 1) * STRIP.pitch + STRIP.r}
        y={y(STRIP.y) - STRIP.r - 14}
        at={sevenAt}
        color={STAT}
      />
      <Note at={headsAt - 2} x={STRIP.x0 - STRIP.r} y={y(STRIP.y) - STRIP.r - 56}>
        <span style={{ ...note(22, STAT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the first {COIN.streak}: all heads</span>
      </Note>
      <Note at={overAt + 4} x={STRIP.x0 + STRIP.count * STRIP.pitch} y={y(STRIP.y) - 16}>
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>…</span>
      </Note>

      {/* ── The count: a hundred thousand flips in code ── */}
      <div style={{ position: "absolute", left: 160, top: y(808), display: "flex", alignItems: "baseline", gap: 56 }}>
        <Ink at={hundredAt - 4} dur={14} style={{ position: "relative", whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, INK_SOFT), marginRight: 14 }}>Flips</span>
          <Count at={hundredAt - 2} dur={28} to={COIN.flips} format={num} style={{ ...note(40, INK), fontWeight: 650 }} />
        </Ink>
        <Ink at={fiftyAt - 6} dur={14} style={{ position: "relative", whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, DATA), fontWeight: 650, marginRight: 14 }}>Heads</span>
          <Count at={fiftyAt - 4} dur={30} to={COIN.heads} format={num} style={{ ...note(40, INK), fontWeight: 650 }} />
        </Ink>
        <Ink at={pointAt - 4} dur={16} style={{ position: "relative", whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, INK_SOFT), marginRight: 14 }}>Share</span>
          <span style={{ ...headline(64, true), color: STAT_INK }}>{fmt(COIN.pHeads, 4)}</span>
        </Ink>
        <Ink at={closeAt - 2} dur={14} style={{ position: "relative", whiteSpace: "nowrap" }}>
          <span style={note(22, INK_SOFT)}>close to the true 0.5, not on it</span>
        </Ink>
      </div>
      {/* A hairline under the count, drawn as the share lands. */}
      <div
        style={{
          position: "absolute",
          left: 160,
          top: y(808) + 70,
          width: 1560 * ease(frame, pointAt, 18),
          height: 1,
          background: HAIRLINE,
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
};
