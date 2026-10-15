import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { COLOR, COLOR_INK, COUNT, POSITIVES, PPV, PPV2, PREVALENCE, SENSITIVITY, SPECIFICITY, num, pct } from "./data";
import { BLOCK, BLOCK_RIGHT, Headline, RowBracket, useBlockXY } from "./parts";

/** Fig. 6: the chance you have it, 0 to 100%, across this span. */
const SCALE = { x0: 160, x1: 1700, top: 812 } as const;

/**
 * Again, again-result, answer and rule: the 110 positives tested a second
 * time. The real cases stay positive, all but one false alarm clears, and
 * the chance climbs from 9% to 91%.
 */
export const RetestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const blockXY = useBlockXY();
  const start = n.beat("again").from;
  const stripAt = n.word("again", "second, independent");
  const realAt = n.word("again-result", "test positive again");
  const clearAt = n.word("again-result", "only about one");
  const elevenAt = n.word("answer", "ten in eleven");
  const ninetyOneAt = n.word("answer", "ninety-one");
  const ruleAt = n.beat("rule").from;
  const rareAt = n.word("rule", "ask how rare");

  const sx = (p: number) => SCALE.x0 + (SCALE.x1 - SCALE.x0) * p;
  const line = y(SCALE.top);
  const cleared = COUNT.fp - COUNT.retestFp;
  const marks = [
    { at: stripAt + 10, p: PREVALENCE, color: INK_SOFT, ink: INK_SOFT, text: "Before any test", below: true },
    { at: stripAt + 18, p: PPV, color: COLOR.falseAlarm, ink: COLOR_INK.falseAlarm, text: "One positive", below: false },
    { at: ninetyOneAt, p: PPV2, color: COLOR.hasIt, ink: COLOR_INK.hasIt, text: "Two positives", below: false },
  ];
  const climb = ease(frame, ninetyOneAt - 12, 20);

  return (
    <AbsoluteFill>
      <Headline
        top={y(104)}
        first="Test the positives again."
        second={`Now ${num(COUNT.retestTp)} in ${num(COUNT.retestTp + COUNT.retestFp)} have it.`}
        firstAt={start - 6}
        secondAt={elevenAt - 2}
        out={ruleAt - 10}
        secondColor={COLOR_INK.hasIt}
      />
      <Headline
        top={y(104)}
        first="Before you trust a positive,"
        second="ask how rare the thing is."
        firstAt={ruleAt}
        secondAt={rareAt - 2}
      />
      <FigLabel
        n="5"
        title={`The ${num(COUNT.positives)} positives, given a second, independent test`}
        at={start + 2}
        x={120}
        y={y(196)}
      />

      <Ink at={start + 6} dur={22} style={{ left: 0, top: 0, width: 1920, height: 1080 }}>
        {/* In flow, not absolute: Ink's bleed padding puts its content box at 0,0. */}
        <svg width={1920} height={1080} style={{ display: "block", overflow: "visible" }}>
          {POSITIVES.map((p) => {
            const [x, cy] = blockXY(p.slot);
            const goes = p.retest ? 0 : ease(frame, clearAt + 2 + p.jitter * 0.6, 16);
            const pulse = p.retest ? ease(frame, (p.hasIt ? realAt : clearAt + 16) - 2 + p.jitter * 0.3, 22) : 0;
            const color = p.hasIt ? COLOR.hasIt : COLOR.falseAlarm;
            return (
              <g key={p.seat}>
                {pulse > 0 && pulse < 1 ? (
                  <circle cx={x} cy={cy} r={BLOCK.r + 2 + pulse * 16} fill="none" stroke={color} strokeWidth={2.4} opacity={1 - pulse} />
                ) : null}
                <circle cx={x} cy={cy} r={BLOCK.r} fill={color} opacity={1 - goes} />
                {goes > 0 ? (
                  <circle cx={x} cy={cy} r={BLOCK.r - 1} fill="none" stroke={COLOR.crowd} strokeWidth={2} opacity={goes} />
                ) : null}
              </g>
            );
          })}
        </svg>
      </Ink>

      <Note at={realAt} x={BLOCK_RIGHT + 30} y={y(BLOCK.top) + h(BLOCK.pitch / 2) - 15}>
        <span style={{ ...label(24, COLOR_INK.hasIt), whiteSpace: "nowrap" }}>
          {num(COUNT.retestTp)} positive again
        </span>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap", marginLeft: 14 }}>
          {pct(SENSITIVITY)} of {num(COUNT.tp)}, rounded
        </span>
      </Note>
      <RowBracket fromRow={1} toRow={10} at={clearAt} color={COLOR.falseAlarm} />
      <Note at={clearAt + 6} x={BLOCK_RIGHT + 30} y={y(BLOCK.top) + h(BLOCK.pitch * 6) - 30}>
        <div style={{ ...label(24, INK_SOFT), whiteSpace: "nowrap" }}>{num(cleared)} cleared</div>
        <div style={{ ...label(24, COLOR_INK.falseAlarm), whiteSpace: "nowrap", marginTop: 6 }}>
          {num(COUNT.retestFp)} still positive
          <span style={{ ...note(20, INK_SOFT), marginLeft: 14 }}>
            {pct(1 - SPECIFICITY)} of {num(COUNT.fp)}
          </span>
        </div>
      </Note>

      <Ink at={elevenAt - 4} dur={16} style={{ left: 1000, top: y(318) }}>
        <div style={label(24, INK_SOFT)}>Share who have it, of those positive twice</div>
      </Ink>
      <Ink at={elevenAt} dur={20} style={{ left: 994, top: y(362), ...headline(180), color: INK, whiteSpace: "nowrap" }}>
        {num(COUNT.retestTp)} in {num(COUNT.retestTp + COUNT.retestFp)}
      </Ink>
      <Ink at={elevenAt + 12} dur={16} style={{ left: 1000, top: y(590), whiteSpace: "nowrap" }}>
        <span style={{ ...headline(64, true), color: COLOR_INK.hasIt }}>about {pct(PPV2)}</span>
      </Ink>

      {/* Fig. 6: what each positive does to the chance. */}
      <FigLabel n="6" title="The chance you have it" at={stripAt} x={120} y={y(700)} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line
          x1={SCALE.x0}
          x2={SCALE.x0 + (SCALE.x1 - SCALE.x0) * ease(frame, stripAt + 2, 16)}
          y1={line}
          y2={line}
          stroke={INK}
          strokeWidth={1.6}
        />
        {/* The climb a second positive makes, drawn along the scale. */}
        <line
          x1={sx(PPV)}
          x2={sx(PPV) + (sx(PPV2) - sx(PPV)) * climb}
          y1={line}
          y2={line}
          stroke={COLOR.hasIt}
          strokeWidth={6}
          strokeLinecap="round"
          opacity={climb > 0 ? 1 : 0}
        />
        {marks.map((m) => {
          const p = ease(frame, m.at, 10);
          return p > 0 ? <circle key={m.text} cx={sx(m.p)} cy={line} r={9 * p} fill={m.color} /> : null;
        })}
      </svg>
      <Note at={stripAt + 10} x={SCALE.x1 + 14} y={line - 14}>
        <span style={note(20, INK_SOFT)}>100%</span>
      </Note>
      {marks.map((m) => (
        <Note
          key={m.text}
          at={m.at}
          x={m.below ? SCALE.x0 - 8 : sx(m.p) - 160}
          y={m.below ? line + 18 : line - 50}
          width={m.below ? undefined : 320}
          from="up"
          style={{ textAlign: m.below ? "left" : "center" }}
        >
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            {m.text}: <b style={{ color: m.ink }}>{pct(m.p, m.p < 0.01 ? 1 : 0)}</b>
          </span>
        </Note>
      ))}
    </AbsoluteFill>
  );
};
