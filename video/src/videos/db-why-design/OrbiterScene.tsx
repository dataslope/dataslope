import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, fmt, HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { LBF_S } from "./data";
import { Arrow, Drift, FIG_Y, Headline, LISTING_PAPER, Mark, pulse, Spot, X0 } from "./parts";

const CARD_W = 480;
const A_Y = 352;
/** The file sits midway between the two cards: equal arrows above and below. */
const FILE_Y = 484;
const B_Y = 604;
/** A column that says what its numbers mean: the unit in its name. */
const COLUMN = { name: "impulse_", unit: "n_s", type: "numeric" };

/**
 * Even a type is a rule: the Mars Climate Orbiter, after
 * design-and-data-quality and NASA's Mishap Investigation Board. One program
 * wrote pound-force seconds, another read newton-seconds, and the file
 * between them carried numbers with nothing to say which, so every value was
 * read about 4.45 times too small. The empty unit slot then becomes what the
 * lesson asks of a column: a type, and a name that carries the unit. Then
 * the bridge to Unit 2: naming the things the data is about.
 */
export const OrbiterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const orbFrom = n.beat("orbiter").from;
  const ruleAt = n.word("orbiter", "rule");
  const yearAt = n.word("orbiter", "nineteen");
  const marsAt = n.word("orbiter", "Mars");
  const wroteAt = n.word("orbiter", "wrote");
  const poundAt = n.word("orbiter", "pound-force");
  const readAt = n.word("orbiter", "read");
  const newtonAt = n.word("orbiter", "newton-seconds");
  const numbersAt = n.word("factor", "numbers", { nth: 1 });
  const justAt = n.word("factor", "just");
  const nothingAt = n.word("factor", "Nothing");
  const whichAt = n.word("factor", "which");
  const fourAt = n.word("unit", "four");
  const columnAt = n.word("unit", "column");
  const unitAt = n.word("unit", "unit");
  const whereAt = n.word("next", "where");
  const namingAt = n.word("next", "naming");
  const thingsAt = n.word("next", "things");
  const end = n.durationInFrames;

  const fileTop = y(FILE_Y);
  const fileH = h(84);
  const aBottom = y(A_Y) + h(96);
  const bTop = y(B_Y);
  const mid = X0 + CARD_W / 2;
  const settle = ease(frame, whereAt - 4, 22) * 0.55;
  const unknown = pulse(frame, whichAt, 22);

  const card = (top: number, at: number, who: string, unit: string, sym: string, wordAt: number) => (
    <Ink at={at} dur={16} style={{ left: X0, top, width: CARD_W }}>
      <div
        style={{
          height: h(96),
          boxSizing: "border-box",
          padding: "0 24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 6,
          borderRadius: 8,
          border: `2px solid ${INK}`,
          background: `color-mix(in srgb, ${ds("yellow", 50)} 55%, ${PAPER})`,
        }}
      >
        <div style={label(21, INK_SOFT)}>{who}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, whiteSpace: "nowrap" }}>
          <span style={{ ...note(30, INK), fontWeight: 650 }}>
            <Mark at={wordAt}>{unit}</Mark>
          </span>
          <span style={{ fontFamily: MONO, fontSize: 24, color: INK_SOFT }}>{sym}</span>
        </div>
      </div>
    </Ink>
  );

  return (
    <AbsoluteFill>
      {/* ── Sound: the spacecraft, the two programs, the file between them ── */}
      <Sfx name="el-pop" at={marsAt - 4} level={-30} />
      <Sfx name="el-tap" at={wroteAt - 4} level={-30} />
      <Sfx name="el-tap" at={readAt - 4} level={-30} />
      <Sfx name="el-pencil" at={numbersAt - 4} level={-34} />
      <Sfx name="el-tap" at={columnAt - 2} level={-31} />
      <Sfx name="el-pencil" at={namingAt - 6} level={-34} />
      <Sfx name="el-chime" at={n.beat("next").to + 8} level={-33} />

      <Headline lead="Even a type" turn="is a rule." at={orbFrom - 6} turnAt={ruleAt - 4} size={72} />

      <Spot id="db-why-design-orbiter" at={marsAt - 6} dim={whereAt} left={1030} top={y(380)} width={740} height={374} drift={-40} driftDur={end - marsAt} />

      <Drift from={orbFrom} to={end} amount={0.018} origin="20% 55%">
        <div style={{ position: "absolute", inset: 0, opacity: 1 - settle }}>
          <FigLabel n="7" title="The Mars Climate Orbiter, lost on 23 September 1999" at={yearAt - 4} x={X0} y={y(FIG_Y - 20)} />
          {card(y(A_Y), wroteAt - 6, "One program wrote", "pound-force seconds", "lbf·s", poundAt)}
          <Arrow from={[mid, aBottom + 6]} to={[mid, fileTop - 6]} at={readAt - 8} dur={10} />

          {/* The file between them: numbers, and no unit. */}
          <Ink at={readAt - 4} dur={16} style={{ left: X0, top: fileTop, width: CARD_W }}>
            <div
              style={{
                height: fileH,
                boxSizing: "border-box",
                padding: "0 24px",
                display: "flex",
                alignItems: "center",
                gap: 18,
                background: LISTING_PAPER,
                borderTop: `2px solid ${INK}`,
                borderBottom: `1px solid ${HAIRLINE}`,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 22, color: INK_SOFT }}>Small Forces file</span>
              <span style={{ ...body(30, true), color: INK, opacity: ease(frame, justAt - 2, 12) }}>just numbers</span>
            </div>
          </Ink>
          <Arrow from={[mid, fileTop + fileH + 6]} to={[mid, bTop - 6]} at={readAt + 2} dur={10} />
          {card(bTop, readAt, "Another read", "newton-seconds", "N·s", newtonAt)}

          {/* The unit nobody wrote down: an empty slot beside the file. */}
          <Note at={nothingAt - 2} x={X0 + CARD_W + 30} y={fileTop + fileH / 2 - 24} out={columnAt - 4}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                height: 48,
                padding: "0 16px",
                borderRadius: 6,
                border: `2px dashed ${ACCENT}`,
                whiteSpace: "nowrap",
                transform: `scale(${1 + unknown * 0.08})`,
                transformOrigin: "0 50%",
              }}
            >
              <span style={{ ...label(22, INK_SOFT) }}>unit</span>
              <span style={{ ...label(24, ACCENT_INK), fontWeight: 700 }}>none</span>
            </div>
          </Note>
          {/* ...and what a column would have said in its place: the unit, in its name. */}
          <Note at={columnAt + 2} x={X0 + CARD_W + 30} y={fileTop + fileH / 2 - 24}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                height: 48,
                padding: "0 16px",
                boxSizing: "border-box",
                borderRadius: 6,
                border: `2px solid ${INK}`,
                background: PAPER,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 22, color: INK, fontWeight: 600 }}>
                {COLUMN.name}
                <Mark at={unitAt}>{COLUMN.unit}</Mark>
              </span>
              <span style={{ fontFamily: MONO, fontSize: 20, color: INK_SOFT }}>{COLUMN.type}</span>
            </div>
          </Note>
          <Note at={fourAt - 4} x={X0} y={bTop + h(96) + 26}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              1 lbf·s = <span style={{ fontWeight: 700, color: ACCENT_INK }}>{fmt(LBF_S)}</span> N·s, so every value read about{" "}
              {fmt(LBF_S)} times too small
            </span>
          </Note>
        </div>
      </Drift>

      <NextLine at={namingAt - 2} x={X0} y={y(820)} width={760}>
        <Mark at={thingsAt + 4} dur={16}>
          the things your data is about.
        </Mark>
      </NextLine>
    </AbsoluteFill>
  );
};
