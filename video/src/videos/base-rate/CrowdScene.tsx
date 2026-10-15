import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import {
  COLOR,
  COLOR_INK,
  COUNT,
  FIELD_COLS,
  NEGATIVE_SEATS,
  ONE_IN,
  POSITIVES,
  PPV,
  num,
  pct,
} from "./data";
import { BLOCK, BLOCK_RIGHT, Dot, Headline, RowBracket, useBlockXY } from "./parts";

/** Fig. 1: ten thousand people, 125 to a row, 7px apart. */
const FIELD = { x0: 120, top: 258, pitch: 7, r: 2.4 } as const;
/** The tally beside the field. */
const TX = 1090;

/** Everyone who tests negative, as one path of round dots: a zero-length
 *  segment per person with a round cap, so 9,890 marks are one element. */
const Crowd: React.FC<{ top: number; py: number; opacity: number }> = ({ top, py, opacity }) => {
  const d = useMemo(
    () =>
      NEGATIVE_SEATS.map((seat) => {
        const x = FIELD.x0 + FIELD.pitch * ((seat % FIELD_COLS) + 0.5);
        const yy = top + py * (Math.floor(seat / FIELD_COLS) + 0.5);
        return `M${x.toFixed(1)} ${yy.toFixed(1)}h0`;
      }).join(""),
    [top, py],
  );
  if (opacity <= 0) return null;
  return (
    <path d={d} stroke={COLOR.crowd} strokeWidth={FIELD.r * 2} strokeLinecap="round" fill="none" opacity={opacity} />
  );
};

/** A colour partway from the crowd's grey to `to`. */
const toward = (to: string, t: number) =>
  t <= 0 ? COLOR.crowd : t >= 1 ? to : `color-mix(in srgb, ${to} ${(t * 100).toFixed(1)}%, ${COLOR.crowd})`;

/**
 * Crowd, sick, healthy, pull and share: ten thousand people, the ten who
 * have it, the hundred the test flags anyway, and then everyone who tested
 * positive pulled out into a block of eleven rows, one of them real.
 */
export const CrowdScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const blockXY = useBlockXY();

  const start = n.beat("crowd").from;
  const splitAt = n.word("crowd", "One in a thousand");
  const tenAt = n.word("crowd", "about ten");
  const positiveAt = n.word("sick", "test positive");
  const flagAt = n.word("healthy", "flags");
  const hundredAt = n.word("healthy", "hundred false alarms");
  const pullAt = n.word("pull", "pull out");
  const allAt = n.word("pull", "a hundred and ten");
  const onlyAt = n.word("pull", "only ten");
  const elevenAt = n.word("share", "One in eleven");
  const nineAt = n.word("share", "nine percent");

  const fieldTop = y(FIELD.top);
  const py = h(FIELD.pitch);
  const crowdFade = 1 - ease(frame, pullAt + 8, 30);

  return (
    <AbsoluteFill>
      <Headline
        top={y(104)}
        first="Ten thousand people."
        second="Ten of them have it."
        firstAt={start - 6}
        secondAt={tenAt - 2}
        out={pullAt - 10}
        secondColor={COLOR_INK.hasIt}
      />
      <Headline
        top={y(104)}
        first="Pull out the positives:"
        second={`only 1 in ${ONE_IN} has it.`}
        firstAt={pullAt}
        secondAt={elevenAt - 2}
        secondColor={COLOR_INK.hasIt}
      />

      <FigLabel n="1" title="Ten thousand people, one mark each" at={start} x={120} y={y(196)} out={pullAt - 6} />
      <FigLabel
        n="2"
        title={`The ${num(COUNT.positives)} people who tested positive`}
        at={allAt - 4}
        x={120}
        y={y(196)}
      />

      <Ink at={start + 2} dur={30} style={{ left: 0, top: 0, width: 1920, height: 1080 }}>
        {/* In flow, not absolute: Ink's bleed padding puts its content box at 0,0. */}
        <svg width={1920} height={1080} style={{ display: "block", overflow: "visible" }}>
          <Crowd top={fieldTop} py={py} opacity={crowdFade} />
          {POSITIVES.map((p) => {
            const fx = FIELD.x0 + FIELD.pitch * (p.col + 0.5);
            const fy = fieldTop + py * (p.row + 0.5);
            const [bx, by] = blockXY(p.slot);
            const lit = p.hasIt
              ? pop(frame, tenAt - 2 + p.jitter * 0.4, fps, 12)
              : pop(frame, flagAt + 4 + p.jitter * 1.4, fps, 14);
            const move = ease(frame, pullAt + 4 + p.slot * 0.16 + p.jitter * 0.5, 28);
            const color = toward(p.hasIt ? COLOR.hasIt : COLOR.falseAlarm, Math.min(1, lit));
            const litR = FIELD.r + lit * (p.hasIt ? 3.4 : 2.2);
            const r = interpolate(move, [0, 1], [litR, BLOCK.r]);
            const ring = p.hasIt ? ease(frame, positiveAt - 2 + p.jitter * 0.3, 22) : 0;
            return (
              <g key={p.seat}>
                {ring > 0 && ring < 1 ? (
                  <circle
                    cx={fx}
                    cy={fy}
                    r={6 + ring * 18}
                    fill="none"
                    stroke={COLOR.hasIt}
                    strokeWidth={2.4}
                    opacity={1 - ring}
                  />
                ) : null}
                <circle cx={fx + (bx - fx) * move} cy={fy + (by - fy) * move} r={r} fill={color} />
              </g>
            );
          })}
        </svg>
      </Ink>

      <Note at={hundredAt + 12} x={FIELD.x0} y={y(838)} out={pullAt - 4}>
        <span style={note(20, INK_SOFT)}>Expected counts, rounded to whole people.</span>
      </Note>

      {/* The tally: the population split by the condition, then by the test. */}
      <Ink at={splitAt} dur={16} out={pullAt - 4} style={{ left: TX, top: y(262) }}>
        <div style={label(22, COLOR_INK.hasIt)}>Have it</div>
      </Ink>
      <Ink at={tenAt} dur={16} out={pullAt - 4} style={{ left: TX - 4, top: y(296), ...headline(72) }}>
        {num(COUNT.sick)}
      </Ink>
      <Note at={positiveAt} x={TX} y={y(398)} out={pullAt - 4}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap", ...note(22, INK) }}>
          <Dot color={COLOR.hasIt} />
          <span>
            <b>{num(COUNT.tp)}</b> test positive
          </span>
          <span style={{ width: 28 }} />
          <Dot color={INK_SOFT} hollow />
          <span style={{ color: INK_SOFT }}>
            <b>{num(COUNT.fn)}</b> missed
          </span>
        </div>
      </Note>

      <Ink at={splitAt + 6} dur={16} out={pullAt - 4} style={{ left: TX, top: y(500) }}>
        <div style={label(22, INK_SOFT)}>Don&apos;t have it</div>
      </Ink>
      <Ink at={tenAt + 4} dur={16} out={pullAt - 4} style={{ left: TX - 4, top: y(534), ...headline(72) }}>
        {num(COUNT.healthy)}
      </Ink>
      <Note at={hundredAt} x={TX} y={y(636)} out={pullAt - 4}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap", ...note(22, INK) }}>
          <Dot color={COLOR.falseAlarm} />
          <span>
            <b style={{ color: COLOR_INK.falseAlarm }}>{num(COUNT.fp)}</b> flagged by mistake
          </span>
          <span style={{ width: 28 }} />
          <Dot color={COLOR.crowd} />
          <span style={{ color: INK_SOFT }}>
            <b>{num(COUNT.tn)}</b> cleared
          </span>
        </div>
      </Note>

      {/* The block: one row that has it, ten that don't. */}
      <Note at={onlyAt} x={BLOCK_RIGHT + 30} y={y(BLOCK.top) + h(BLOCK.pitch / 2) - 15}>
        <span style={{ ...label(24, COLOR_INK.hasIt), whiteSpace: "nowrap" }}>{num(COUNT.tp)} have it</span>
      </Note>
      <RowBracket fromRow={1} toRow={10} at={onlyAt + 8} color={COLOR.falseAlarm} />
      <Note at={onlyAt + 14} x={BLOCK_RIGHT + 30} y={y(BLOCK.top) + h(BLOCK.pitch * 6) - 15}>
        <span style={{ ...label(24, COLOR_INK.falseAlarm), whiteSpace: "nowrap" }}>
          {num(COUNT.fp)} false alarms
        </span>
      </Note>

      <Ink at={elevenAt - 4} dur={16} style={{ left: 1000, top: y(318) }}>
        <div style={label(24, INK_SOFT)}>Share of the positives who have it</div>
      </Ink>
      <Ink at={elevenAt} dur={20} style={{ left: 994, top: y(362), ...headline(180), color: INK, whiteSpace: "nowrap" }}>
        1 in {ONE_IN}
      </Ink>
      <Ink at={nineAt - 2} dur={16} style={{ left: 1000, top: y(590), whiteSpace: "nowrap" }}>
        <span style={{ ...headline(64, true), color: COLOR_INK.falseAlarm }}>about {pct(PPV)}</span>
        <span style={{ ...note(22, INK_SOFT), marginLeft: 18 }}>
          {num(COUNT.tp)} of {num(COUNT.positives)}
        </span>
      </Ink>
    </AbsoluteFill>
  );
};
