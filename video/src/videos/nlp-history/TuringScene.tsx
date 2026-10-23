import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, headline, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Headline, Kicker, Spot, Strike, Svg, Tag, Tick } from "./parts";

const segLen = (a: readonly [number, number], b: readonly [number, number]) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Where along a polyline a fraction `t` of its length falls. */
const pointAt = (pts: readonly (readonly [number, number])[], t: number): [number, number] => {
  const total = pts.slice(1).reduce((s, q, i) => s + segLen(pts[i], q), 0);
  let left = total * Math.min(1, Math.max(0, t));
  for (let i = 1; i < pts.length; i++) {
    const s = segLen(pts[i - 1], pts[i]);
    if (left <= s) {
      const f = s ? left / s : 0;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
    }
    left -= s;
  }
  return [pts[pts.length - 1][0], pts[pts.length - 1][1]];
};

/** A typed slip travelling a wire, out and back, from `at` on. */
const Slip: React.FC<{ pts: readonly (readonly [number, number])[]; at: number; period: number; offset?: number; out?: number }> = ({
  pts,
  at,
  period,
  offset = 0,
  out,
}) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const phase = ((frame - at) / period + offset) % 2;
  const t = phase < 1 ? phase : 2 - phase;
  const [x, y] = pointAt(pts, t);
  return (
    <Svg opacity={ease(frame, at, 8) * (1 - o)}>
      <g transform={`translate(${x} ${y})`}>
        <rect x={-15} y={-11} width={30} height={22} rx={2} fill={PAPER} stroke={INK} strokeWidth={1.8} />
        <line x1={-8} x2={8} y1={-3} y2={-3} stroke={INK_SOFT} strokeWidth={1.6} />
        <line x1={-8} x2={4} y1={3} y2={3} stroke={INK_SOFT} strokeWidth={1.6} />
      </g>
    </Svg>
  );
};

/** The judge: a desk terminal drawn in ink, in a card. */
const Judge: React.FC<{ x: number; top: number; at: number }> = ({ x, top, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(1, pop(frame, at, fps, 15));
  if (p <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: x, top, width: 280, height: 230, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
      <svg width={280} height={180} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {/* screen */}
        <rect x={60} y={14} width={160} height={104} rx={10} fill={PAPER} stroke={INK} strokeWidth={3} />
        <line x1={84} x2={176} y1={46} y2={46} stroke={INK_SOFT} strokeWidth={3} strokeLinecap="round" />
        <line x1={84} x2={150} y1={66} y2={66} stroke={INK_SOFT} strokeWidth={3} strokeLinecap="round" />
        <line x1={84} x2={164} y1={86} y2={86} stroke={INK_SOFT} strokeWidth={3} strokeLinecap="round" />
        <line x1={140} x2={140} y1={118} y2={136} stroke={INK} strokeWidth={3} />
        {/* keyboard */}
        <path d="M44,148 L236,148 L254,172 L26,172 Z" fill={PAPER} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 190, textAlign: "center", ...label(26, INK) }}>the judge</div>
    </div>
  );
};

/**
 * Part 3, 1950: Turing asks whether machines can think, strikes the question,
 * and puts a test in its place. The imitation game (Fig. 6): a judge at a
 * terminal, typed slips going back and forth to two sealed booths, a person
 * in one and a machine in the other. If the judge cannot tell which is
 * which, the machine passes. Then its two names.
 */
export const TuringScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("turing").from;
  const askedAt = n.word("turing", "asked");
  const swappedAt = n.word("turing", "swapped");
  const testAt = n.word("turing", "test");
  const judgeAt = n.word("game", "judge", { nth: 1 });
  const typedAt = n.word("game", "typed messages");
  const personAt = n.word("game", "hidden person");
  const machineAt = n.word("game", "hidden machine");
  const whichAt = n.word("game", "which is which");
  const passesAt = n.word("game", "passes");
  const imitationAt = n.word("name", "imitation game");
  const turingTestAt = n.word("name", "Turing test");
  const chatbotAt = n.word("name", "every chatbot");
  const fourAt = n.word("turing-out", "Four years later");

  // ── The figure ──
  // Two booths standing apart (nlp-history-booths, 1303x879): no channel
  // between them, so the judge's two lines are the only ones.
  const BX = 1110;
  const BW = 620;
  const BH = Math.round((BW * 879) / 1303);
  const BTOP = y(350);
  const doorA: [number, number] = [BX + 0.2 * BW, BTOP + BH * 0.97];
  const doorB: [number, number] = [BX + 0.8 * BW, BTOP + BH * 0.97];
  const JX = 300;
  const JTOP = y(470);
  const jOut: [number, number] = [JX + 270, JTOP + 70];
  const floor = BTOP + BH + 34;
  // A runs straight to the person's booth; B runs under it to the machine's.
  const wireA = [jOut, [BX + 0.03 * BW, jOut[1]]] as const;
  const wireB = [
    [JX + 258, JTOP + 160],
    [JX + 330, JTOP + 160],
    [JX + 330, floor],
    [doorB[0], floor],
    doorB,
  ] as const;
  const wires = ease(frame, typedAt - 4, 18);
  const settle = ease(frame, fourAt - 2, 30);

  const pathOf = (pts: readonly (readonly [number, number])[]) => pts.map(([x, v], i) => `${i ? "L" : "M"}${x},${v}`).join(" ");

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-pop" at={from} level={-30} />
      <Sfx name="el-scratch" at={swappedAt} level={-33} />
      <Sfx name="el-pop" at={judgeAt - 2} level={-30} />
      <Sfx name="el-pencil" at={typedAt - 4} level={-34} />
      <Sfx name="el-tap" at={whichAt} level={-29} />
      <Sfx name="el-pencil" at={passesAt} level={-34} />
      <Sfx name="el-tap" at={turingTestAt} level={-28} />

      <Kicker at={from - 6}>1950: Alan Turing</Kicker>
      <Headline
        at={askedAt - 2}
        lead={<Strike at={swappedAt}>&ldquo;Can machines think?&rdquo;</Strike>}
        turn="Try a test instead."
        turnAt={testAt - 6}
        out={imitationAt - 6}
      />
      <Headline at={imitationAt - 2} lead="The imitation game," turn="now the Turing test." turnAt={turingTestAt - 4} />

      <FigLabel n="6" title="Turing's imitation game" at={testAt - 4} x={96} y={y(290)} />
      <div style={{ opacity: 1 - settle * 0.3 }}>
        <Spot id="booths" at={from + 2} left={BX} top={BTOP} width={BW} height={BH} />
        <Judge x={JX} top={JTOP} at={judgeAt - 4} />
        <Svg opacity={wires}>
          {[wireA, wireB].map((w, i) => (
            <path key={i} d={pathOf(w)} fill="none" stroke={INK_SOFT} strokeWidth={2} strokeDasharray="7 7" strokeLinejoin="round" />
          ))}
        </Svg>
        <Slip pts={wireA} at={typedAt + 6} period={46} />
        <Slip pts={wireB} at={typedAt + 14} period={52} offset={0.6} />
        <Tag x={doorA[0]} y={floor + 18} at={personAt} align="center" size={25} color={INK} weight={650}>
          a hidden person
        </Tag>
        <Tag x={doorB[0]} y={floor + 18} at={machineAt} align="center" size={25} color={INK} weight={650}>
          a hidden machine
        </Tag>
        {[doorA, doorB].map(([x], i) => (
          <Ink key={i} at={whichAt + i * 4} style={{ left: x - 24, top: BTOP - 72, width: 48, textAlign: "center" }}>
            <span style={{ ...headline(76), color: ACCENT_INK }}>?</span>
          </Ink>
        ))}
        <Tick x={doorB[0] + 150} y={floor + 34} at={passesAt} />
      </div>
      <div style={{ position: "absolute", left: 96, top: y(820), display: "flex", gap: "0.3em", ...headline(38, true), whiteSpace: "nowrap" }}>
        <Ink at={chatbotAt - 2} style={{ position: "relative" }}>
          Every chatbot since has been
        </Ink>
        <Ink at={chatbotAt + 10} style={{ position: "relative", color: ACCENT_INK }}>
          chasing it.
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
