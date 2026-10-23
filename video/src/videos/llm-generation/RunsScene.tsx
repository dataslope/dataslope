import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { pct, RUN_PROBS, RUN_TOKENS, RUNS } from "./data";
import { Arrow, Drift, Headline, Kicker, pulse, Svg, tint, X0 } from "./kit";

/** The three tokens of the lesson's block take the non-semantic accent hues:
 *  they are a different example from cat, dog, bird and rock. */
const HUE = [ds("teal", 500), ds("purple", 500), ds("orange", 500)] as const;
const HUE_INK = [inkOf.teal, inkOf.purple, inkOf.orange] as const;

/** Fig. 5: five rows of eight tiles. */
const ROW_Y = (k: number) => 372 + k * 90;
const TILE = 58;
const PITCH = 68;
const TX = 270;
/** Fig. 6: a shared stretch of picks, then two that split. */
const FX = 1010;
const FPITCH = 66;
const FTILE = 48;
const TRUNK = 5;
const BRANCH = 6;
const TRUNK_Y = 560;
const SPLIT = 150;

/**
 * Runs, compound, hall-in: the lesson's "Watch randomness accumulate" block
 * (seed 0), five runs of eight draws from the same three close scores, and a
 * schematic of what that does over a real answer, where each pick becomes
 * context for the next.
 */
export const RunsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("runs").from;
  const drawAt = n.word("runs", "draw");
  const fiveAt = n.word("runs", "Five runs");
  const closeAt = n.word("runs", "close scores");
  const differentAt = n.word("runs", "different strings");
  const contextAt = n.word("compound", "context");
  const agreeAt = n.word("compound", "agree");
  const splitAt = n.word("compound", "split completely");
  const alwaysAt = n.word("hall-in", "always picks");
  const nothingAt = n.word("hall-in", "nothing true");

  const tileAt = (k: number, j: number) => fiveAt + k * 8 + j * 1.6;
  const trunkY = y(TRUNK_Y);
  const fy = (branch: number, j: number) => {
    // Picks after the trunk fan away from it, further with every pick.
    if (j < TRUNK) return trunkY;
    const off = Math.min(1, (j - TRUNK + 1) / 4) * h(SPLIT) * ease(frame, splitAt - 4 + (j - TRUNK) * 3, 14);
    return trunkY + (branch === 0 ? -off : off);
  };
  // A thread through each branch's picks, from the last shared one.
  const thread = (branch: number) =>
    Array.from({ length: BRANCH + 1 }, (_, k) => {
      const j = TRUNK - 1 + k;
      return `${k ? "L" : "M"}${fxAt(j) + FTILE / 2},${fy(branch, j) + h(FTILE) / 2}`;
    }).join(" ");
  const fxAt = (j: number) => FX + j * FPITCH;

  return (
    <AbsoluteFill>
      {RUNS.map((_, k) => (
        <Sfx key={k} name="el-sprinkle" at={tileAt(k, 0)} level={-36} />
      ))}
      <Sfx name="el-pencil" at={contextAt - 2} level={-36} />
      <Sfx name="el-whoosh" at={splitAt - 4} level={-34} />

      <Drift from={start} to={n.beat("plausible").from} amount={0.012} origin="45% 60%">
      <Kicker at={start - 6}>Sampling</Kicker>
      <Headline lead="Every pick is a draw." at={start - 4} out={alwaysAt - 8} />
      <Headline lead="It always picks something," turn="true or not." at={alwaysAt - 4} turnAt={nothingAt - 2} />

      <FigLabel n="5" title="Five runs of eight picks (the lesson's block, seed 0)" at={drawAt - 6} x={X0} y={y(236)} />
      {/* The three close scores every pick draws from. */}
      <Note at={closeAt - 4} x={X0} y={y(296)}>
        <span style={{ display: "inline-flex", gap: 26, alignItems: "baseline", whiteSpace: "nowrap" }}>
          {RUN_TOKENS.map((t, i) => (
            <span key={t} style={{ ...note(22, HUE_INK[i]), fontWeight: 650 }}>
              <span style={{ fontFamily: MONO }}>{t}</span> {pct(RUN_PROBS[i])}
            </span>
          ))}
          <span style={note(21, INK_SOFT)}>every pick, every run</span>
        </span>
      </Note>
      {RUNS.map((run, k) => {
        const top = y(ROW_Y(k));
        return (
          <React.Fragment key={k}>
            <Ink at={tileAt(k, 0) - 6} dur={12} style={{ left: X0, top: top + h(TILE) / 2 - 15 }}>
              <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>Run {k + 1}</span>
            </Ink>
            {[...run].map((ch, j) => {
              const tok = RUN_TOKENS.indexOf(ch);
              const s = pop(frame, tileAt(k, j), fps, 16);
              if (s <= 0.001) return null;
              const swell = pulse(frame, differentAt + k * 3, 16);
              return (
                <div
                  key={j}
                  style={{
                    position: "absolute",
                    left: TX + j * PITCH,
                    top,
                    width: TILE,
                    height: h(TILE),
                    boxSizing: "border-box",
                    background: tint(HUE[tok], 26),
                    borderBottom: `4px solid ${HUE[tok]}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: Math.min(1, s),
                    transform: `scale(${(0.6 + 0.4 * s) * (1 + swell * 0.06)})`,
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 650,
                    color: HUE_INK[tok],
                  }}
                >
                  {ch}
                </div>
              );
            })}
            <Note at={differentAt + k * 3} x={TX + 8 * PITCH + 20} y={top + h(TILE) / 2 - 16}>
              <span style={{ fontFamily: MONO, fontSize: 24, color: INK, whiteSpace: "nowrap" }}>{run}</span>
            </Note>
          </React.Fragment>
        );
      })}

      {/* Fig. 6: each pick is context for the next, so one difference carries on. */}
      <FigLabel n="6" title="Why it compounds (schematic)" at={contextAt - 8} x={FX} y={y(236)} />
      <Svg opacity={ease(frame, agreeAt - 4, 10)}>
        <rect
          x={fxAt(0) - 10}
          y={trunkY - 12}
          width={fxAt(TRUNK - 1) + FTILE - fxAt(0) + 20}
          height={h(FTILE) + 24}
          fill="none"
          stroke={HAIRLINE}
          strokeWidth={1.4}
          strokeDasharray="4 5"
        />
      </Svg>
      <Note at={agreeAt - 2} x={fxAt(0) - 10} y={trunkY + h(FTILE) + 22}>
        <span style={note(21, INK_SOFT)}>the same so far</span>
      </Note>
      {[0, 1].map((branch) => (
        <Svg key={branch} opacity={ease(frame, splitAt - 4, 10)}>
          <path d={thread(branch)} fill="none" stroke={branch === 0 ? HUE[0] : HUE[1]} strokeWidth={2} strokeDasharray="3 5" />
        </Svg>
      ))}
      {[0, 1].map((branch) =>
        Array.from({ length: TRUNK + BRANCH }, (_, j) => {
          if (branch === 1 && j < TRUNK) return null;
          const inAt = j < TRUNK ? contextAt - 6 + j * 4 : splitAt - 4 + (j - TRUNK) * 3;
          const p = ease(frame, inAt, 10);
          if (p <= 0) return null;
          const color = j < TRUNK ? ds("gray", 500) : branch === 0 ? HUE[0] : HUE[1];
          return (
            <div
              key={`${branch}-${j}`}
              style={{
                position: "absolute",
                left: fxAt(j),
                top: fy(branch, j),
                width: FTILE,
                height: h(FTILE),
                boxSizing: "border-box",
                background: tint(color, 24),
                borderBottom: `4px solid ${color}`,
                opacity: p,
              }}
            />
          );
        }),
      )}
      {/* Each pick feeds the next: short arrows along the shared stretch. */}
      {Array.from({ length: TRUNK - 1 }, (_, j) => (
        <Arrow
          key={j}
          from={[fxAt(j) + FTILE / 2, trunkY - 30]}
          to={[fxAt(j + 1) + FTILE / 2 - 4, trunkY - 30]}
          at={contextAt + j * 4}
          dur={8}
          width={2.2}
          head={12}
          color={INK_SOFT}
        />
      ))}
      <Note at={splitAt + 10} x={fxAt(TRUNK + BRANCH - 1) + FTILE} y={trunkY - h(SPLIT) - 40} align="right">
        <span style={{ ...note(21, HUE_INK[0]), fontWeight: 650 }}>one answer</span>
      </Note>
      <Note at={splitAt + 14} x={fxAt(TRUNK + BRANCH - 1) + FTILE} y={trunkY + h(SPLIT) + h(FTILE) + 14} align="right">
        <span style={{ ...note(21, HUE_INK[1]), fontWeight: 650 }}>another</span>
      </Note>
      </Drift>
    </AbsoluteFill>
  );
};
