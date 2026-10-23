import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useLayout } from "../../editorial/layout";
import { headline, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { int, NAME, REQUEST, usd } from "./data";
import {
  Bracket,
  COST,
  FIG_Y,
  Hairline,
  HBar,
  Headline,
  INPUT,
  INPUT_INK,
  Kicker,
  Marked,
  OUTPUT,
  OUTPUT_INK,
  POINT,
  POINT_INK,
  pulse,
  RULE,
  X0,
} from "./parts";

const TOKENS_Y = 350;
const PX_PER_TOKEN = 0.3;
const HEAD_Y = 432;
const ROW_Y0 = 486;
const ROW_DY = 90;
const PER_R = 760;
const BAR_X = 830;
const BAR_MAX = 770;

/**
 * Part 2 opens on one support-bot request priced on the four tiers: next to
 * nothing per request, and a hundredfold apart once there are a hundred
 * thousand of them.
 */
export const RequestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const requestFrom = n.beat("request").from;
  const supportAt = n.word("request", "support-bot");
  const inAt = n.word("request", "twelve hundred");
  const outAt = n.word("request", "three hundred");
  const sonnetAt = n.word("nothing", "Sonnet");
  const halfAt = n.word("nothing", "half a cent");
  const nothingAt = n.word("nothing", "nothing");
  const hundredAt = n.word("volume", "hundred thousand");
  const haikuAt = n.word("volume", "Twenty-seven dollars");
  const fableAt = n.word("volume", "twenty-seven hundred");
  const apartAt = n.word("apart", "apart");
  const sameTaskAt = n.word("apart", "Same task");
  const sameTokensAt = n.word("apart", "same tokens");
  const tokPulse = pulse(frame, sameTokensAt - 2, 22);
  const timesAt = n.word("apart", "hundred times");

  const tiers = REQUEST.tiers;
  const maxV = Math.max(...tiers.map((t) => t.perVolume));
  const minV = Math.min(...tiers.map((t) => t.perVolume));
  const barW = (v: number) => Math.max(3, (v / maxV) * BAR_MAX);
  const rowY = (i: number) => y(ROW_Y0 + i * ROW_DY);
  const growAt = (i: number) => hundredAt + 2 + i * 5;
  const valueAt: Record<string, number> = { haiku: haikuAt, fable: fableAt };
  const haikuRow = tiers.findIndex((t) => t.perVolume === minV);
  const fableRow = tiers.findIndex((t) => t.perVolume === maxV);

  return (
    <AbsoluteFill>
      {/* ── Sound: the request, the per-request column, the bars, the bracket ── */}
      <Sfx name="el-pop" at={requestFrom} level={-31} />
      <Sfx name="el-tap" at={inAt - 2} level={-28} />
      <Sfx name="el-tap" at={outAt - 2} level={-29} />
      <Sfx name="el-whoosh" at={hundredAt} level={-34} />
      <Sfx name="el-tap" at={haikuAt - 2} level={-28} />
      <Sfx name="el-tap" at={fableAt - 2} level={-27} />
      <Sfx name="el-pencil" at={timesAt - 4} level={-35} />

      <Kicker at={requestFrom - 10}>Estimating</Kicker>
      <Headline at={requestFrom - 6} second={hundredAt - 4} italic="a hundred thousand times.">
        One request,
      </Headline>

      <FigLabel n="7" title="One support-bot request, on four tiers" at={supportAt - 6} x={X0} y={y(FIG_Y)} />

      {/* The request itself. */}
      <HBar
        x={X0}
        y={y(TOKENS_Y)}
        w={REQUEST.in * PX_PER_TOKEN}
        h={h(30)}
        at={inAt - 4}
        dur={14}
        fill={INPUT}
        style={{ transform: `scaleY(${1 + tokPulse * 0.4})` }}
      />
      <Note at={inAt} x={X0 + REQUEST.in * PX_PER_TOKEN + 14} y={y(TOKENS_Y) + h(15) - 16}>
        <span style={{ ...note(25, INPUT_INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>{int(REQUEST.in)} in</span>
      </Note>
      <HBar
        x={640}
        y={y(TOKENS_Y)}
        w={REQUEST.out * PX_PER_TOKEN}
        h={h(30)}
        at={outAt - 4}
        dur={12}
        fill={OUTPUT}
        style={{ transform: `scaleY(${1 + tokPulse * 0.4})` }}
      />
      <Note at={outAt} x={640 + REQUEST.out * PX_PER_TOKEN + 14} y={y(TOKENS_Y) + h(15) - 16}>
        <span style={{ ...note(25, OUTPUT_INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>{int(REQUEST.out)} out</span>
      </Note>

      {/* The table. */}
      {[
        ["Model", X0, "left", supportAt],
        ["Per request", PER_R, "right", sonnetAt - 6],
        [`Per ${int(REQUEST.volume)} requests`, BAR_X, "left", hundredAt - 6],
      ].map(([t, x, a, at]) => (
        <Note key={t as string} at={at as number} x={x as number} y={y(HEAD_Y)} align={a as "left" | "right"} from="up">
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>{t}</span>
        </Note>
      ))}
      <Hairline x={X0} y={y(HEAD_Y) + 36} w={1800 - X0} at={supportAt + 2} color={INK_SOFT} />

      {tiers.map((t, i) => {
        const ry = rowY(i);
        const isSonnet = t.model === "sonnet";
        const lit = pulse(frame, (valueAt[t.model] ?? -100) - 2, 26);
        return (
          <React.Fragment key={t.model}>
            <Note at={supportAt + 4 + i * 4} x={X0} y={ry}>
              {/* The same task on every tier: the names swell in turn as it is said. */}
              <span
                style={{
                  ...note(28, INK),
                  whiteSpace: "nowrap",
                  display: "inline-block",
                  transformOrigin: "0 60%",
                  transform: `scale(${1 + pulse(frame, sameTaskAt - 2 + i * 4, 18) * 0.07})`,
                }}
              >
                <Marked at={sameTaskAt - 2 + i * 4} out={sameTaskAt + 14 + i * 4}>
                  {NAME[t.model]}
                </Marked>
              </span>
            </Note>
            <Note at={sonnetAt - 4 + i * 3} x={PER_R} y={ry} align="right">
              <span style={{ ...note(28, INK), ...TABULAR, whiteSpace: "nowrap" }}>
                {isSonnet ? <Marked at={halfAt - 2}>{usd(t.per, 6)}</Marked> : usd(t.per, 6)}
              </span>
            </Note>
            <HBar
              x={BAR_X}
              y={ry + 2}
              w={barW(t.perVolume)}
              h={h(32)}
              at={growAt(i)}
              dur={20}
              fill={COST}
              style={{ transform: `scaleY(${1 + lit * 0.3})` }}
            />
            <Note at={valueAt[t.model] !== undefined ? valueAt[t.model] - 4 : growAt(i) + 14} x={BAR_X + barW(t.perVolume) + 16} y={ry}>
              <span style={{ ...note(28, INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>{usd(t.perVolume)}</span>
            </Note>
            <Hairline x={X0} y={ry + h(ROW_DY) - 22} w={1800 - X0} at={supportAt + 6 + i * 4} color={RULE} />
          </React.Fragment>
        );
      })}
      <Note at={nothingAt - 2} x={PER_R} y={rowY(tiers.length) - 18} align="right">
        <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>basically nothing</span>
      </Note>

      {/* A hundred times apart: Haiku's bar against Fable's. */}
      <Bracket
        x0={BAR_X}
        x1={BAR_X + barW(maxV)}
        y={rowY(tiers.length) - 22}
        at={timesAt - 4}
        color={POINT}
        up
      />
      <Ink at={apartAt - 6} dur={16} style={{ left: BAR_X + 220, top: rowY(tiers.length) - 6, whiteSpace: "nowrap" }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ ...headline(54), color: POINT_INK }}>{Math.round(maxV / minV)}x</span>
          <span style={{ ...note(25, INK) }}>
            {NAME[tiers[haikuRow].model]} to {NAME[tiers[fableRow].model]}
          </span>
        </span>
      </Ink>
    </AbsoluteFill>
  );
};
