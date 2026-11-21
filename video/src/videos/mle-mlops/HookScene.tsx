import { Lock } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Box, Drift, Flow, Headline, Kicker, Line, Loop, loopWidth, Mark, RIGHT, Spot, Svg, X0 } from "./parts";

/** The model box, and the chart of its accuracy beside it. */
const MODEL = { x: 500, w: 290, top: 362, bottom: 520 };
const CHART = { left: 880, right: 1230, top: 360, bottom: 520 };
/** A schematic sag over four quarters: no numbers, so no scale. */
const SAG = [0.93, 0.915, 0.865, 0.79];
const LOOP_SIZE = 22;

/**
 * The opening: a model whose code is frozen, its accuracy sagging quarter by
 * quarter as the world it learned from moves (new customers, new tactics, a
 * sensor in new units arriving at its inputs); the walrus at the right. Then
 * the round: twelve questions worked through and five quick ones, and a
 * model's life after training drawn as a loop, its stages inking in as the
 * plan names them.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const freezeAt = n.word("hook", "Freeze");
  const worseAt = n.word("hook", "still gets worse");
  const repoAt = n.word("hook", "Nothing in the repository moved");
  const worldAt = n.word("hook", "The world it learned from did");
  const inputsAt = [n.word("hook", "new customers"), n.word("hook", "new tactics"), n.word("hook", "a sensor")];
  const afterAt = n.word("plan", "everything after training");
  const versionAt = n.word("plan", "versioning");
  const testAt = n.word("plan", "testing");
  const shipAt = n.word("plan", "shipping");
  const watchAt = n.word("plan", "watching");
  const twelveAt = n.word("plan", "Twelve questions");
  const fiveAt = n.word("plan", "five go quickly");
  const end = n.beat("plan").to;

  const dim = twelveAt - 6;
  const modelTop = y(MODEL.top);
  const modelH = h(MODEL.bottom - MODEL.top);
  const modelMid = modelTop + modelH / 2;
  const rows = [-1, 0, 1].map((k) => modelMid + k * h(56));
  const INPUTS = ["new customers", "new tactics", "a sensor in new units"];
  const LABEL_RIGHT = 400;

  // The chart: four quarters across, accuracy up the side, no scale.
  const qx = (i: number) => CHART.left + 40 + (i * (CHART.right - CHART.left - 60)) / 3;
  const vy = (v: number) => y(CHART.bottom) - ((v - 0.74) / (0.96 - 0.74)) * h(CHART.bottom - CHART.top);
  const draw = ease(frame, worseAt, 36);
  const pts = SAG.map((v, i) => [qx(i), vy(v)] as const);
  const shown = pts.slice(0, 1 + Math.floor(draw * 3));
  const seg = draw * 3 - Math.floor(draw * 3);
  const k = Math.min(3, Math.floor(draw * 3));
  const tip = k < 3 ? [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * seg, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * seg] : pts[3];
  const path = [...shown, tip].map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ");
  const chartIn = ease(frame, freezeAt + 10, 14);

  // The round, as numerals: twelve in the data blue, five quick in gray.
  const CHIP = 46;
  const STEP = 56;
  const chipX = (i: number) => X0 + i * STEP + (i >= 12 ? 44 : 0);
  const chipsTop = y(712);
  const loopX = RIGHT - loopWidth(LOOP_SIZE);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={freezeAt + 14} level={-30} />
      <Sfx name="el-tap" at={freezeAt + 6} level={-31} />
      <Sfx name="el-pencil" at={worseAt} level={-35} />
      {inputsAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-31} />
      ))}
      <Sfx name="el-whoosh" at={afterAt} level={-37} />
      {[versionAt, testAt, shipAt, watchAt].map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-33} />
      ))}
      <Sfx name="el-sprinkle" at={twelveAt} level={-32} />
      <Sfx name="el-sprinkle" at={fiveAt} level={-33} />

      <Drift from={from} to={end + 30}>
        <Kicker at={from - 6}>Machine learning engineer interview questions · Shipping and monitoring models</Kicker>
        <Headline lead="Freeze a model's code," turn="and it still gets worse." at={freezeAt - 4} turnAt={worseAt - 4} size={62} />

        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, dim, 14) * 0.45 }}>
          {/* The model, its code locked. */}
          <Box x={MODEL.x} y={modelTop} w={MODEL.w} h={modelH} at={freezeAt + 6} title="Model" size={30}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.35em", fontSize: 22, ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
              <Lock size={21} strokeWidth={2.2} color={INK_SOFT} style={{ flex: "none" }} />
              code frozen
            </span>
          </Box>
          <Line at={repoAt} x={MODEL.x + MODEL.w / 2} width={360} align="center" y={y(MODEL.bottom) + h(22)} size={21} color={INK_SOFT}>
            Nothing in the repository moved
          </Line>

          {/* What arrives at its inputs: the world it learned from, moving. */}
          {INPUTS.map((t, i) => (
            <React.Fragment key={t}>
              <Line at={inputsAt[i] - 2} x={LABEL_RIGHT} width={300} align="right" y={rows[i] - 16} size={24} color={BLUE_INK}>
                {t}
              </Line>
              <Flow points={[[LABEL_RIGHT + 14, rows[i]], [MODEL.x - 3, rows[i]]]} at={inputsAt[i] + 2} color={BAR} head={13} />
            </React.Fragment>
          ))}
          <Line at={worldAt} x={X0} y={rows[0] - h(64)} size={21} color={INK_SOFT}>
            The world it learned from
          </Line>

          {/* Its accuracy, quarter by quarter, sagging as said. */}
          <Flow points={[[MODEL.x + MODEL.w + 6, modelMid], [CHART.left - 3, modelMid]]} at={freezeAt + 12} head={13} />
          <Svg opacity={chartIn}>
            <line x1={CHART.left} x2={CHART.right} y1={y(CHART.bottom)} y2={y(CHART.bottom)} stroke={INK_SOFT} strokeWidth={1.4} />
            <line x1={CHART.left} x2={CHART.left} y1={y(CHART.top)} y2={y(CHART.bottom)} stroke={INK_SOFT} strokeWidth={1.4} />
            {[0, 1, 2, 3].map((i) => (
              <text key={i} x={qx(i)} y={y(CHART.bottom) + 32} textAnchor="middle" style={svgText(label(21, INK_SOFT))}>
                {`Q${i + 1}`}
              </text>
            ))}
            {draw > 0 ? <path d={path} fill="none" stroke={ACCENT} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /> : null}
            {pts.map(([px, py], i) => (i <= draw * 3 + 0.001 ? <circle key={i} cx={px} cy={py} r={6} fill={ACCENT} /> : null))}
          </Svg>
          <Line at={freezeAt + 12} x={CHART.left} y={y(CHART.top) - h(44)} size={21} color={INK_SOFT}>
            accuracy
          </Line>
          <Line at={worseAt + 30} x={qx(3) + 18} y={vy(SAG[3]) - 14} size={22} color={ACCENT_INK}>
            worse
          </Line>
        </div>

        {/* ── The round ── */}
        <Line at={twelveAt - 2} x={X0} y={y(656)} size={23} color={INK}>
          <Num>12</Num> worked through
        </Line>
        <Line at={fiveAt - 2} x={chipX(12)} y={y(656)} size={23} color={INK_SOFT}>
          <Num>5</Num> quick
        </Line>
        {Array.from({ length: 17 }, (_, i) => {
          const at = i < 12 ? twelveAt + i * 2 : fiveAt + (i - 12) * 3;
          const p = ease(frame, at, 10);
          if (p <= 0) return null;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: chipX(i),
                top: chipsTop,
                width: CHIP,
                textAlign: "center",
                ...label(30, i < 12 ? BLUE_INK : INK_SOFT),
                fontWeight: 500,
                opacity: p,
                transform: `translateY(${(1 - p) * 10}px)`,
              }}
            >
              <Num>{i + 1}</Num>
            </div>
          );
        })}

        {/* ── After training: the loop ── */}
        <Line at={afterAt} x={loopX} y={y(656)} size={23} color={INK}>
          <Mark at={afterAt + 4}>Everything after training</Mark>
        </Line>
        <Loop
          x={loopX}
          y={y(712)}
          at={versionAt - 2}
          size={LOOP_SIZE}
          inkAt={{ version: versionAt - 2, gate: testAt - 2, ship: shipAt - 2, watch: watchAt - 2, retrain: watchAt + 14 }}
          lit={[
            ["version", versionAt, testAt],
            ["gate", testAt, shipAt],
            ["ship", shipAt, watchAt],
            ["watch", watchAt, twelveAt],
          ]}
        />
      </Drift>

      <Spot id="walrus" at={freezeAt + 14} x={1408} y={y(330)} w={400} />
    </AbsoluteFill>
  );
};
