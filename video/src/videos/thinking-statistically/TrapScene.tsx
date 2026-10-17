import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, headline, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { ZIPS } from "./data";
import { Mark, STAT_INK, Strike } from "./parts";

const COL = [160, 520];
const COL_W = 300;
const HEAD_Y = 346;
const DTYPE_Y = 392;
const ROW_Y0 = 456;
const ROW_STEP = 58;
const MEAN_Y = 712;
const TEST_X = 1080;

const mono = (size: number, color: string = INK, weight = 500): React.CSSProperties => ({
  fontFamily: MONO,
  fontSize: size,
  fontWeight: weight,
  color,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});

/** A dtype as pandas prints it, in a pill. */
const Dtype: React.FC<{ children: React.ReactNode; lit?: number }> = ({ children, lit = 0 }) => (
  <span
    style={{
      ...mono(21, INK_SOFT),
      display: "inline-block",
      padding: "2px 12px",
      border: `1.5px solid ${HAIRLINE}`,
      borderRadius: 14,
      background: `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(lit * 100)}%, transparent)`,
    }}
  >
    {children}
  </span>
);

/**
 * Part 3: the lesson's zip codes, stored as int64 and averaged without a
 * word, and the doubling test that tells a label from a quantity.
 */
export const TrapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const trapFrom = n.beat("trap").from;
  const columnsAt = n.word("trap", "columns");
  const arentAt = n.word("trap", "aren't");
  const zipAt = n.word("trap", "zip codes");
  const integersAt = n.word("pandas", "integers");
  const averagesAt = n.word("pandas", "averages");
  const fortyAt = n.word("pandas", "Forty-eight");
  const placeAt = n.word("place", "place");
  const labelsAt = n.word("place", "labels");
  const testAt = n.word("double", "test");
  const doublingAt = n.word("double", "doubling");
  const priceAt = n.word("double", "price");
  const costsAt = n.word("double", "costs");
  const twiceAt = n.word("double", "twice");
  const zipCodeAt = n.word("double", "zip code");
  const getAt = n.word("double", "get");
  const nonsenseAt = n.word("double", "nonsense");
  const typeAt = n.word("dtype", "data type");
  const saysAt = n.word("dtype", "says");
  const storedAt = n.word("dtype", "stored");
  const meansAt = n.word("dtype", "What it means");
  const callAt = n.word("dtype", "call");

  const rowY = (i: number) => y(ROW_Y0 + i * ROW_STEP);
  const lit = ease(frame, typeAt - 4, 12);
  const storedLit = ease(frame, storedAt - 2, 12);
  // The average, counted up as it is read out: "forty-eight thousand" comes
  // fast, "seven hundred and fifty-five" settles.
  const counted = ZIPS.zipMean * ease(frame, fortyAt - 4, 66);
  const priceIn = ease(frame, priceAt - 8, 14);
  const columns = [
    { name: "zip_code", dtype: ZIPS.dtypes.zip_code, values: ZIPS.zips.map(String), at: zipAt - 6, step: 4 },
    { name: "price_usd", dtype: ZIPS.dtypes.price_usd, values: ZIPS.prices.map((v) => fmt(v)), at: priceAt - 8, step: 2 },
  ];
  // The two values the test doubles, lit in the table as it does.
  const zipRow = ZIPS.zips.indexOf(ZIPS.zip);
  const priceRow = ZIPS.prices.indexOf(ZIPS.price);

  return (
    <AbsoluteFill>
      {/* ── Sound: the table, the zip codes' average, struck out, the doublings ── */}
      <Sfx name="el-whoosh" at={zipAt - 8} level={-34} />
      <Sfx name="el-tap" at={fortyAt - 4} level={-27} />
      <Sfx name="el-scratch" at={placeAt - 2} level={-30} />
      <Sfx name="el-pop" at={priceAt - 2} level={-30} />
      <Sfx name="el-pop" at={zipCodeAt - 6} level={-30} />

      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
        <Ink at={trapFrom - 4} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Numbers
        </Ink>
        <Ink at={arentAt - 6} dur={18} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          that aren&apos;t quantities.
        </Ink>
      </div>

      <FigLabel n="7" title="The lesson's table, as pandas stores it" at={columnsAt - 4} x={160} y={y(276)} />

      {/* ── The table ── */}
      {columns.map((c, ci) => {
        const a = ease(frame, c.at, 14);
        if (a <= 0) return null;
        return (
          <div key={c.name} style={{ position: "absolute", left: COL[ci], top: 0, width: COL_W, opacity: a }}>
            <div style={{ position: "absolute", top: y(HEAD_Y), ...mono(26, INK, 700) }}>{c.name}</div>
            <div style={{ position: "absolute", top: y(DTYPE_Y), opacity: ci === 0 ? ease(frame, integersAt - 4, 12) : 1 }}>
              <Dtype lit={ci === 0 ? lit : storedLit}>{c.dtype}</Dtype>
            </div>
            <div style={{ position: "absolute", top: y(DTYPE_Y + 46), width: COL_W - 40, height: 2, background: INK }} />
            {c.values.map((v, i) => {
              const hot =
                ci === 0 && i === zipRow
                  ? ease(frame, zipCodeAt - 6, 10)
                  : ci === 1 && i === priceRow
                    ? ease(frame, priceAt - 2, 10)
                    : 0;
              return (
                <React.Fragment key={i}>
                  <div
                    style={{
                      position: "absolute",
                      top: rowY(i),
                      left: -8,
                      padding: "0 8px",
                      borderRadius: 4,
                      background: `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(hot * 100)}%, transparent)`,
                      opacity: ease(frame, c.at + 2 + i * c.step, 10),
                      ...mono(30),
                    }}
                  >
                    {/* "averages them": each zip code read into the mean, in turn. */}
                    {ci === 0 ? (
                      <Mark at={averagesAt - 2 + i * 4} out={fortyAt - 4}>
                        {v}
                      </Mark>
                    ) : (
                      v
                    )}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      top: rowY(i) + 46,
                      width: COL_W - 40,
                      height: 1,
                      background: HAIRLINE,
                      opacity: 0.45,
                    }}
                  />
                </React.Fragment>
              );
            })}
          </div>
        );
      })}

      {/* The zip codes' mean. */}
      <Ink at={averagesAt - 4} dur={14} style={{ left: COL[0], top: y(MEAN_Y), whiteSpace: "nowrap" }}>
        <span style={mono(22, INK_SOFT)}>.mean()</span>
      </Ink>
      <Ink at={fortyAt - 4} dur={16} style={{ left: COL[0], top: y(MEAN_Y + 40), whiteSpace: "nowrap" }}>
        <span style={mono(40, STAT_INK, 700)}>
          <Strike at={placeAt - 2} top="0.62em">
            {counted.toFixed(2)}
          </Strike>
        </span>
      </Ink>
      <Note at={placeAt} x={COL[0]} y={y(MEAN_Y + 108)}>
        <span style={{ ...body(30, true), color: INK, whiteSpace: "nowrap" }}>
          Not a place
          <span style={{ opacity: ease(frame, labelsAt - 2, 10) }}>: the average of four labels.</span>
        </span>
      </Note>

      {/* ── The doubling test ── */}
      <Ink at={testAt - 4} dur={14} style={{ left: TEST_X, top: y(HEAD_Y - 58), whiteSpace: "nowrap" }}>
        <span style={label(22, INK_SOFT)}>The doubling test</span>
      </Ink>
      <Ink at={doublingAt - 6} dur={16} style={{ left: TEST_X, top: y(HEAD_Y - 8), whiteSpace: "nowrap" }}>
        <span style={{ ...body(40, true), color: INK }}>Would doubling it mean anything?</span>
      </Ink>
      <div style={{ position: "absolute", left: TEST_X, top: y(DTYPE_Y + 60), opacity: priceIn }}>
        <div style={mono(32)}>
          ${fmt(ZIPS.price)} × 2<span style={{ opacity: ease(frame, costsAt - 4, 10) }}> = ${fmt(ZIPS.priceDoubled)}</span>
        </div>
        <div style={{ ...note(25, INK), marginTop: 12, opacity: ease(frame, twiceAt - 4, 10) }}>
          <b>Yes.</b> Twice the price.
        </div>
      </div>
      <div style={{ position: "absolute", left: TEST_X, top: y(DTYPE_Y + 220), opacity: ease(frame, zipCodeAt - 6, 14) }}>
        <div style={mono(32)}>
          {ZIPS.zip} × 2<span style={{ opacity: ease(frame, getAt - 4, 10) }}> = {ZIPS.zipDoubled}</span>
        </div>
        <div style={{ ...note(25, STAT_INK), marginTop: 12, opacity: ease(frame, nonsenseAt - 4, 10) }}>
          <b>No.</b> That&apos;s nonsense, so it&apos;s a label.
        </div>
      </div>

      {/* Storage, not meaning. */}
      <Note at={typeAt - 2} x={TEST_X} y={y(MEAN_Y + 40)} width={680}>
        <div style={{ ...label(21, INK_SOFT) }}>
          <Dtype lit={lit}>{ZIPS.dtypes.zip_code}</Dtype>
        </div>
        <div style={{ ...body(32, true), color: INK, marginTop: 14, lineHeight: 1.3 }}>
          <span style={{ opacity: ease(frame, saysAt - 4, 10) }}>says how it&apos;s stored.</span>
          <span style={{ opacity: ease(frame, meansAt - 4, 10) }}> What it means</span>
          <span style={{ opacity: ease(frame, callAt - 6, 10) }}> is your call.</span>
        </div>
      </Note>
    </AbsoluteFill>
  );
};
