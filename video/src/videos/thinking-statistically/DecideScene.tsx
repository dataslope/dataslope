import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, headline, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FLAVORS, ZIPS } from "./data";
import { Mark, STAT_INK } from "./parts";

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
  const countsAt = n.word("decides", "counts");
  const commonAt = n.word("decides", "most common value");
  const medianAt = n.word("decides", "median");
  const meanAt = n.word("decides", "mean");
  const testAt = n.word("tests", "test", { nth: 1 });
  const twoCatAt = n.word("tests", "Two categorical");
  const chiAt = n.word("tests", "chi-square");
  const aNumberAt = n.word("tests", "A number");
  const tAt = n.word("tests", "t-test");
  const realAt = n.word("next", "real quantity");
  const averageAt = n.word("next", "average");
  const notAlwaysAt = n.word("next", "Not always");
  const skewAt = n.word("next", "skew");
  const centerAt = n.word("next", "center");

  // Each row's summary arrives on the word that names it, its example just after.
  const ROWS = [
    {
      kind: "Labels",
      scale: "nominal",
      summary: "Counts, the most common value",
      example: `flavor: ${FLAVORS.mode}`,
      at: labelsAt,
      sumAt: countsAt - 4,
      exAt: commonAt,
    },
    {
      kind: "Ranks",
      scale: "ordinal",
      summary: "A median",
      example: `a 1 to 5 rating: median ${fmt(ZIPS.ratingMedian, 1)}`,
      at: ranksAt,
      sumAt: medianAt - 4,
      exAt: medianAt + 6,
    },
    {
      kind: "Quantities",
      scale: "numerical",
      summary: "A mean",
      example: `price: mean $${fmt(ZIPS.priceMean)}`,
      at: quantitiesAt,
      sumAt: meanAt - 4,
      exAt: meanAt + 6,
    },
  ];
  // Each test lights the kind of column it is for (in the rows above).
  const TESTS = [
    { when: "Two categorical columns", test: "a chi-square test", whenAt: twoCatAt, at: chiAt },
    { when: "A number across two groups", test: "a t-test", whenAt: aNumberAt, at: tAt },
  ];
  const rowY = (i: number) => y(ROW_Y0 + i * ROW_STEP);
  const heads = ease(frame, labelsAt - 10, 12);
  // "even a real quantity": the other rows and the tests step back; on
  // "center" the whole table does, leaving the line to what comes next.
  const focus = ease(frame, realAt - 2, 18) * 0.6;
  const close = 1 - ease(frame, centerAt - 2, 30) * 0.6;
  const rowOp = (i: number) => (i === 2 ? 1 : 1 - focus) * close;

  return (
    <AbsoluteFill>
      {/* ── Sound: one tap per kind of column, and the line to the next video ── */}
      {ROWS.map((r) => (
        <Sfx key={r.at} name="el-tap" at={r.at - 4} level={-30} />
      ))}
      <Sfx name="el-pencil" at={skewAt - 10} level={-34} />

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
        <div key={t} style={{ position: "absolute", left: COLS[i], top: y(HEAD_Y), opacity: heads * close, ...label(21, INK_SOFT) }}>
          {t}
        </div>
      ))}
      <div style={{ position: "absolute", left: COLS[0], top: y(HEAD_Y + 36), width: 1600 * heads, height: 2, background: INK, opacity: close }} />
      {ROWS.map((r, i) => (
        <div key={r.kind} style={{ position: "absolute", inset: 0, opacity: rowOp(i) }}>
          <Ink at={r.at - 4} dur={14} style={{ left: COLS[0], top: rowY(i) + 8, whiteSpace: "nowrap" }}>
            <span style={{ ...body(40, true), color: INK }}>
              {i === 2 ? (
                <Mark at={aNumberAt - 2} out={tAt + 24}>
                  <Mark at={realAt - 2} out={centerAt - 2}>
                    {r.kind}
                  </Mark>
                </Mark>
              ) : i === 0 ? (
                <Mark at={twoCatAt} out={chiAt + 24}>
                  {r.kind}
                </Mark>
              ) : (
                r.kind
              )}
            </span>
            <span style={{ ...note(22, INK_SOFT), marginLeft: 14 }}>{r.scale}</span>
          </Ink>
          <Ink at={r.sumAt} dur={14} style={{ left: COLS[1], top: rowY(i) + 14, whiteSpace: "nowrap" }}>
            <span style={{ ...note(28, INK), fontWeight: 600 }}>
              {i === 2 ? (
                <>
                  {/* "Is its average the typical value? Not always." */}
                  <Mark at={averageAt - 2} out={notAlwaysAt}>
                    {r.summary}
                  </Mark>
                  <span style={{ color: STAT_INK, opacity: ease(frame, notAlwaysAt - 2, 10) }}>?</span>
                </>
              ) : (
                r.summary
              )}
            </span>
          </Ink>
          <Ink at={r.exAt} dur={14} style={{ left: COLS[2], top: rowY(i) + 14, whiteSpace: "nowrap" }}>
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
        </div>
      ))}

      {/* ── Tests ── */}
      <div style={{ position: "absolute", inset: 0, opacity: (1 - focus) * close }}>
        <Ink at={testAt - 4} dur={14} style={{ left: COLS[0], top: y(TEST_Y), whiteSpace: "nowrap" }}>
          <span style={label(21, INK_SOFT)}>And later, the test</span>
        </Ink>
        {TESTS.map((t, i) => (
          <div
            key={t.test}
            style={{ position: "absolute", left: COLS[0], top: y(TEST_Y + 44 + i * 56), display: "flex", alignItems: "baseline", whiteSpace: "nowrap" }}
          >
            <Ink at={t.whenAt - 4} dur={14} style={{ position: "relative" }}>
              <span style={{ ...note(28, INK) }}>{t.when}:&nbsp;</span>
            </Ink>
            <Ink at={t.at - 6} dur={14} style={{ position: "relative" }}>
              <span style={{ ...body(32, true), color: INK }}>{t.test}</span>
            </Ink>
          </div>
        ))}
      </div>

      <NextLine at={skewAt - 6} x={COLS[2]} y={y(TEST_Y + 30)} width={580}>
        where skew pulls the center.
      </NextLine>
    </AbsoluteFill>
  );
};
