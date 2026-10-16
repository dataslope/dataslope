import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, headline, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { FLAVORS, ZIPS } from "./data";
import { STAT_INK } from "./parts";

const COLS = [160, 640, 1180];
const HEAD_Y = 292;
const ROW_Y0 = 340;
const ROW_STEP = 104;
const TEST_Y = 690;

/**
 * The close: the type decides which summary a column allows, and later which
 * test, each with an example from the video; then the bridge to the mean
 * against the median.
 */
export const DecideScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const decidesFrom = n.beat("decides").from;
  const allowedAt = n.word("decides", "allowed");
  const labelsAt = n.word("decides", "Labels");
  const ranksAt = n.word("decides", "Ranks");
  const quantitiesAt = n.word("decides", "Quantities");
  const testAt = n.word("tests", "test");
  const chiAt = n.word("tests", "chi-square");
  const tAt = n.word("tests", "t-test");
  const skewAt = n.word("next", "skew");

  const ROWS = [
    { kind: "Labels", scale: "nominal", summary: "Counts, the most common value", example: `flavor: ${FLAVORS.mode}`, at: labelsAt },
    { kind: "Ranks", scale: "ordinal", summary: "A median", example: `a 1 to 5 rating: median ${fmt(ZIPS.ratingMedian, 1)}`, at: ranksAt },
    { kind: "Quantities", scale: "numerical", summary: "A mean", example: `price: mean $${fmt(ZIPS.priceMean)}`, at: quantitiesAt },
  ];
  const TESTS = [
    { when: "Two categorical columns", test: "a chi-square test", at: chiAt },
    { when: "A number across two groups", test: "a t-test", at: tAt },
  ];
  const rowY = (i: number) => y(ROW_Y0 + i * ROW_STEP);
  const heads = ease(frame, labelsAt - 10, 12);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={decidesFrom - 4} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          The type decides
        </Ink>
        <Ink at={allowedAt - 6} dur={18} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          what&apos;s allowed.
        </Ink>
      </div>

      {/* ── Summaries ── */}
      {["The column holds", "Its honest summary", "For example"].map((t, i) => (
        <div key={t} style={{ position: "absolute", left: COLS[i], top: y(HEAD_Y), opacity: heads, ...label(21, INK_SOFT) }}>
          {t}
        </div>
      ))}
      <div style={{ position: "absolute", left: COLS[0], top: y(HEAD_Y + 36), width: 1600 * heads, height: 2, background: INK }} />
      {ROWS.map((r, i) => (
        <React.Fragment key={r.kind}>
          <Ink at={r.at - 4} dur={14} style={{ left: COLS[0], top: rowY(i) + 8, whiteSpace: "nowrap" }}>
            <span style={{ ...body(40, true), color: INK }}>{r.kind}</span>
            <span style={{ ...note(22, INK_SOFT), marginLeft: 14 }}>{r.scale}</span>
          </Ink>
          <Ink at={r.at + 2} dur={14} style={{ left: COLS[1], top: rowY(i) + 14, whiteSpace: "nowrap" }}>
            <span style={{ ...note(28, INK), fontWeight: 600 }}>{r.summary}</span>
          </Ink>
          <Ink at={r.at + 8} dur={14} style={{ left: COLS[2], top: rowY(i) + 14, whiteSpace: "nowrap" }}>
            <span style={{ ...note(28, STAT_INK), fontWeight: 650 }}>{r.example}</span>
          </Ink>
          <div
            style={{
              position: "absolute",
              left: COLS[0],
              top: rowY(i) + 84,
              width: 1600,
              height: 1,
              background: HAIRLINE,
              opacity: 0.5 * ease(frame, r.at, 12),
            }}
          />
        </React.Fragment>
      ))}

      {/* ── Tests ── */}
      <Ink at={testAt - 4} dur={14} style={{ left: COLS[0], top: y(TEST_Y), whiteSpace: "nowrap" }}>
        <span style={label(21, INK_SOFT)}>And later, the test</span>
      </Ink>
      {TESTS.map((t, i) => (
        <Ink key={t.test} at={t.at - 6} dur={14} style={{ left: COLS[0], top: y(TEST_Y + 44 + i * 56), whiteSpace: "nowrap" }}>
          <span style={{ ...note(28, INK) }}>{t.when}: </span>
          <span style={{ ...body(32, true), color: INK }}>{t.test}</span>
        </Ink>
      ))}

      <NextLine at={skewAt - 6} x={COLS[2]} y={y(TEST_Y + 30)} width={580}>
        where skew pulls the center.
      </NextLine>
    </AbsoluteFill>
  );
};
