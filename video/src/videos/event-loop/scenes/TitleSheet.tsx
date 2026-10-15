import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../../components/Illustration";
import { bob, ease, pop } from "../../../components/motion";
import { Pattern } from "../../../components/Pattern";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { CodeListing, codeGeom, type CodeBox } from "../Code";
import { DELAY_DIGIT, LABEL_DIGIT, stringSpan } from "../data";
import { DraftBox, Ink, Layer, Leader, Letter, circle, pulse, rrect } from "../draw";
import { HAND } from "../fonts";
import { BP, VIDEO, mix } from "../theme";

const BOX: CodeBox = { x: 84, y: 252, w: 740, font: 26, lh: 37 };
const G = codeGeom(BOX);
const CELL = { x: 330, y: 778, size: 86, gap: 22 };
const cellX = (i: number) => CELL.x + i * (CELL.size + CELL.gap);

/** Lines of each `console.log`, in source order. */
const LOG_LINES = [0, 3, 7, 10];

/**
 * The hook, as the first view on the sheet: the lesson's snippet, four empty
 * answer cells, and the draftsperson marmot. The answer fills in one number
 * per word, each boxed where its label sits in the code, then the two
 * scheduled calls are bracketed: the timer set first, the promise second.
 */
export const TitleSheet: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();

  const fourAt = n.word("hook", "Four");
  const askAt = n.word("hook", "In what order");
  const printAt = n.word("hook", "print");
  const labelAt = n.word("answer", "label");
  const numAt = [
    n.word("answer", "one"),
    n.word("answer", "two"),
    n.word("answer", "three"),
    n.word("answer", "four"),
  ];
  const timerAt = n.word("surprise", "timer");
  const firstAt = n.word("surprise", "first");
  const zeroAt = n.word("surprise", "zero");
  const yetAt = n.word("surprise", "yet");
  const lastAt = n.word("surprise", "last");
  const promiseAt = n.word("surprise", "promise");

  const band = ease(frame, 0, 22);
  const head = ease(frame, 4, 20);
  const code = ease(frame, 2, 16);
  const typed = ease(frame, 8, 34);
  const art = pop(frame, 14, fps, 18);

  // Per-line highlight: the four logs flash in turn on "Four logs", then the
  // two scheduled blocks hold their glow through the surprise.
  const glow = Array.from({ length: 11 }, (_, i) => {
    const k = LOG_LINES.indexOf(i);
    const flash = k >= 0 ? pulse(frame, fourAt + k * 5, 20) * 0.9 : 0;
    const timerBlock = i >= 2 && i <= 4 ? ease(frame, timerAt, 10) * (1 - ease(frame, promiseAt, 10) * 0.6) : 0;
    const promiseBlock = i >= 6 && i <= 8 ? ease(frame, promiseAt, 10) : 0;
    return Math.max(flash, timerBlock * 0.8, promiseBlock * 0.8);
  });

  /** A rounded box around a log's whole label, where its number sits. */
  const labelBox = (k: 1 | 2 | 3 | 4) => {
    const [line] = LABEL_DIGIT[k];
    const [c0, c1] = stringSpan(line);
    const x = G.colX(c0) - 5;
    return rrect(x, G.lineTop(line) + 3, G.colX(c1) - x + 5, BOX.lh - 6, 9);
  };
  const zero = [G.colX(DELAY_DIGIT[1]) + BOX.font * 0.3, G.lineMid(DELAY_DIGIT[0])] as const;
  const bracket = (l0: number, l1: number, p: number) => {
    const x = BOX.x + BOX.w + 16;
    const y0 = G.lineTop(l0) + 4;
    const y1 = G.lineTop(l1) + BOX.lh - 4;
    return <Ink d={`M ${x} ${y0} H ${x + 12} V ${y1} H ${x}`} p={p} color={BP.cyan} width={2.5} />;
  };

  const cellsIn = ease(frame, askAt, 14);
  const qOut = ease(frame, labelAt, 10);
  const surprised = ease(frame, yetAt, 8);

  return (
    <Scene from={from} to={to} fade={6}>
      <Pattern
        video={VIDEO}
        name="sheet-border"
        style={{
          position: "absolute",
          left: 36,
          top: 36,
          width: 1848,
          height: 72,
          clipPath: `inset(0 ${(1 - band) * 100}% 0 0)`,
          opacity: 0.85,
        }}
      />
      <Layer>
        <Ink d={`M 36 108 H 1884`} p={band} color={BP.line2} width={1.5} />
      </Layer>

      <Letter x={84} y={124} p={head} size={68} color={BP.white}>
        The ordering puzzle
      </Letter>
      <Letter x={88} y={204} p={ease(frame, fourAt, 14)} size={24} color={BP.line2}>
        Four logs. Predict the output before running.
      </Letter>

      <CodeListing box={BOX} title="Listing · main.js" p={code} reveal={typed} glow={glow} />

      {/* Answer cells. */}
      <Letter x={84} y={804} p={cellsIn} size={26} color={BP.line}>
        Output order
      </Letter>
      <Layer>
        {[0, 1, 2, 3].map((i) => {
          const hot =
            i === 3 ? ease(frame, lastAt, 8) : i === 2 ? ease(frame, promiseAt, 8) * 0.8 : 0;
          return (
            <g key={i}>
              {hot > 0 ? (
                <rect
                  x={cellX(i) - 6}
                  y={CELL.y - 6}
                  width={CELL.size + 12}
                  height={CELL.size + 12}
                  fill="none"
                  stroke={BP.mark}
                  strokeWidth={3}
                  opacity={hot}
                />
              ) : null}
              <DraftBox
                x={cellX(i)}
                y={CELL.y}
                w={CELL.size}
                h={CELL.size}
                p={ease(frame, askAt + i * 3, 12)}
                color={BP.line}
                fill={BP.wash}
              />
            </g>
          );
        })}
        {/* Each number boxed where its label sits in the code. */}
        {([1, 2, 3, 4] as const).map((k) => (
          <Ink key={k} d={labelBox(k)} p={ease(frame, numAt[k - 1] - 2, 12)} color={BP.mark} width={2.5} />
        ))}
        {/* The delay. */}
        <Ink d={circle(zero[0], zero[1], BOX.font * 0.6)} p={ease(frame, zeroAt - 2, 10)} color={BP.mark} width={2.5} />
        <Leader
          from={[zero[0] + BOX.font * 0.66, zero[1]]}
          elbow={[zero[0] + 70, zero[1]]}
          to={[zero[0] + 100, zero[1]]}
          p={ease(frame, zeroAt + 4, 10)}
          color={BP.mark}
        />
        {bracket(2, 4, ease(frame, firstAt - 2, 10))}
        {bracket(6, 8, ease(frame, promiseAt - 2, 10))}
      </Layer>
      <Letter x={zero[0] + 108} y={zero[1] - 16} p={ease(frame, zeroAt + 8, 10)} size={26} color={BP.mark}>
        0 ms delay
      </Letter>
      <Letter
        x={BOX.x + BOX.w + 38}
        y={(G.lineTop(2) + G.lineTop(5)) / 2 - 16}
        p={ease(frame, firstAt + 2, 10)}
        size={26}
        color={BP.cyan}
      >
        Set first
      </Letter>
      <Letter
        x={BOX.x + BOX.w + 38}
        y={(G.lineTop(6) + G.lineTop(9)) / 2 - 16}
        p={ease(frame, promiseAt + 2, 10)}
        size={26}
        color={BP.cyan}
      >
        Set second
      </Letter>
      {[0, 1, 2, 3].map((i) => {
        const filled = pop(frame, numAt[i], fps, 13);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cellX(i),
              top: CELL.y,
              width: CELL.size,
              height: CELL.size,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: HAND,
              fontSize: 56,
              color: frame >= numAt[i] ? BP.white : BP.faint,
              opacity: frame >= numAt[i] ? 1 : cellsIn * (1 - qOut * 0.5),
              transform: `scale(${frame >= numAt[i] ? 0.6 + 0.4 * filled : 1})`,
            }}
          >
            {frame >= numAt[i] ? i + 1 : "?"}
          </div>
        );
      })}
      <Letter x={cellX(3) + CELL.size / 2} y={CELL.y + CELL.size + 2} p={ease(frame, lastAt + 2, 10)} size={20} color={BP.mark} align="center">
        Last
      </Letter>

      {/* The draftsperson, and a callout bubble that asks, then reacts. */}
      <Illustration
        video={VIDEO}
        id="el-marmot"
        style={{
          position: "absolute",
          left: 1010,
          // 463 tall: its 926 pixels cover a 4K render without stretching.
          top: 248,
          width: 840,
          height: 463,
          opacity: art,
          clipPath: `inset(0 0 ${(1 - ease(frame, 10, 30)) * 100}% 0)`,
          transform: `translateY(${bob(frame, 5, 110)}px)`,
        }}
      />
      <Layer>
        <path
          d={rrect(1180, 150, 150, 104, 18)}
          fill={mix(BP.paperDeep, 85)}
          opacity={ease(frame, printAt - 4, 8)}
        />
        <Ink d={rrect(1180, 150, 150, 104, 18)} p={ease(frame, printAt - 4, 12)} color={surprised > 0.5 ? BP.mark : BP.line} width={2.5} />
        <Leader
          from={[1520, 280]}
          elbow={[1380, 220]}
          to={[1330, 220]}
          p={ease(frame, printAt, 12)}
          color={surprised > 0.5 ? BP.mark : BP.line2}
          head={false}
        />
      </Layer>
      <div
        style={{
          position: "absolute",
          left: 1180,
          top: 150,
          width: 150,
          height: 104,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: HAND,
          fontSize: 72,
          color: surprised > 0.5 ? BP.mark : BP.white,
          opacity: ease(frame, printAt, 10),
          transform: `scale(${1 + pulse(frame, yetAt, 14) * 0.25}) rotate(${surprised > 0.5 ? -6 : 0}deg)`,
        }}
      >
        {surprised > 0.5 ? "!" : "?"}
      </div>
    </Scene>
  );
};
