import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CHI } from "./data";
import { Count, DATA, DATA_INK, Greek, Head, Label, Mark, pulse, STAT, STAT_INK, Svg } from "./parts";

const LABEL_X = 160;
const COL_X = { stayed: 470, churned: 1130 };
const ROW_Y0 = 420;
const ROW_DY = 130;
/** px per user in a cell's bar. */
const PER = 2.0;

type Col = keyof typeof COL_X;
const CELLS = CHI.rows.flatMap((row) => (["stayed", "churned"] as Col[]).map((col) => ({ row, col })));

/**
 * Chi-square on the lesson's device-and-churn table: what each cell would
 * hold if device made no difference, what it does hold, and the statistic
 * that adds up the gaps.
 */
export const ChiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const chiFrom = n.beat("chi").from;
  const categoriesAt = n.word("chi", "categories");
  const countsAt = n.word("chi", "counts");
  const deviceAt = n.word("chi", "device");
  const sixAt = n.word("chi", "six hundred");
  const noDiffAt = n.word("expected", "no difference");
  const eightyAt = n.word("expected", "eighty-seven");
  const hundredAt = n.word("observed", "A hundred and three");
  const desktopAt = n.word("observed", "Desktop");
  const shareAt = n.word("observed", "share");
  const addsAt = n.word("related", "adds up");
  const straysAt = n.word("related", "strays");
  const twelveAt = n.word("related", "twelve");
  const pAt = n.word("related", "point zero zero three");
  const numbersAt = n.word("chi", "numbers");
  const churnedAt = n.word("expected", "churned");
  const expectedAt = n.word("related", "expected");
  const corrFrom = n.beat("corr-in").from;
  const bothNumbersAt = n.word("corr-in", "numbers");
  const whetherAt = n.word("corr-in", "whether");
  const mobileAt = n.word("expected", "mobile");
  const togetherAt = n.word("corr-in", "together");

  const rowY = (i: number) => y(ROW_Y0 + i * ROW_DY);
  /** When each cell's observed count arrives: the two spoken first, the rest on "adds up". */
  const obsAt = (row: string, col: Col) => {
    if (row === "mobile" && col === "churned") return hundredAt - 4;
    if (row === "desktop" && col === "churned") return desktopAt - 2;
    const rest = CELLS.filter((c) => !(c.col === "churned" && (c.row === "mobile" || c.row === "desktop")));
    const k = rest.findIndex((c) => c.row === row && c.col === col);
    return addsAt - 4 + k * 5;
  };
  const expIn = (k: number) => ease(frame, noDiffAt - 2 + k * 3, 12);
  const mobileGlow = pulse(frame, eightyAt - 2, 26);
  const total = ease(frame, twelveAt - 8, 20);
  const dim =
    1 -
    0.15 * ease(frame, corrFrom - 4, 14) -
    0.12 * ease(frame, bothNumbersAt - 4, 14) -
    0.12 * ease(frame, whetherAt - 4, 14) -
    0.15 * ease(frame, togetherAt - 4, 14);
  const mobileGlowRow = pulse(frame, mobileAt - 2, 26);
  const churnGlow = pulse(frame, churnedAt - 2, 24);
  const expGlow = pulse(frame, expectedAt - 2, 24);

  return (
    <AbsoluteFill>
      {/* ── Sound: the expected counts, the two spoken cells, the rest, the statistic ── */}
      <Sfx name="el-sprinkle" at={noDiffAt - 2} level={-34} />
      <Sfx name="el-tap" at={hundredAt - 4} level={-28} />
      <Sfx name="el-tap" at={desktopAt - 2} level={-29} />
      <Sfx name="el-sprinkle" at={addsAt - 4} level={-34} />
      <Sfx name="el-tap" at={twelveAt - 6} level={-28} />

      <Head a="Categories:" b="compare counts." at={chiFrom - 6} bAt={countsAt - 6} />

      <div style={{ position: "absolute", inset: 0, opacity: dim }}>
        <FigLabel n="18" title={`Device and churn for ${fmt(CHI.n, 0)} users`} at={categoriesAt} x={LABEL_X} y={y(290)} />
        <Ink at={sixAt - 4} dur={14} style={{ left: LABEL_X, top: y(290) + 40, whiteSpace: "nowrap" }}>
          <Label size={21} color={INK_SOFT} weight={520}>
            bars: users counted; ticks: what independence predicts
          </Label>
        </Ink>
        {(["stayed", "churned"] as Col[]).map((c) => (
          <div
            key={c}
            style={{
              position: "absolute",
              left: COL_X[c],
              top: y(372),
              opacity: ease(frame, numbersAt - 2, 12),
              ...label(24, c === "churned" && churnGlow > 0.1 ? STAT_INK : INK_SOFT),
              transform: c === "churned" ? `scale(${1 + 0.1 * churnGlow})` : undefined,
              transformOrigin: "0 50%",
            }}
          >
            {c === "stayed" ? "Stayed" : "Churned"}
          </div>
        ))}
        {CHI.rows.map((row, i) => (
          <React.Fragment key={row}>
            <Ink at={deviceAt + i * 4} dur={12} style={{ left: LABEL_X, top: rowY(i) + 14, whiteSpace: "nowrap" }}>
              <span
                style={{
                  ...body(38, true),
                  color: row === "mobile" && mobileGlowRow > 0.1 ? STAT_INK : INK,
                  display: "inline-block",
                  transform: row === "mobile" ? `scale(${1 + 0.08 * mobileGlowRow})` : undefined,
                  transformOrigin: "0 50%",
                }}
              >
                {row[0].toUpperCase() + row.slice(1)}
              </span>
            </Ink>
            <div
              style={{
                position: "absolute",
                left: LABEL_X,
                top: rowY(i) + h(ROW_DY) - 22,
                width: 1720 - LABEL_X,
                height: 1,
                background: HAIRLINE,
                opacity: 0.45 * ease(frame, deviceAt + i * 4, 12),
              }}
            />
          </React.Fragment>
        ))}

        {CELLS.map(({ row, col }, k) => {
          const i = CHI.rows.indexOf(row);
          const obs = CHI.observed[row as keyof typeof CHI.observed][col];
          const exp = CHI.expected[row as keyof typeof CHI.expected][col];
          const x0 = COL_X[col];
          const top = rowY(i) + 18;
          const barH = h(40);
          const at = obsAt(row, col);
          const g = ease(frame, at, 16);
          const e = expIn(k);
          const isMobile = row === "mobile" && col === "churned";
          const glow = isMobile ? mobileGlow : 0;
          const gap = obs - exp;
          const showGap = ease(frame, row === "mobile" && col === "churned" ? hundredAt + 8 : row === "desktop" && col === "churned" ? shareAt - 4 : straysAt - 4 + k * 2, 12);
          return (
            <React.Fragment key={`${row}-${col}`}>
              <Svg>
                {e > 0 ? (
                  <rect x={x0} y={top - 6} width={exp * PER * e} height={barH + 12} fill="none" stroke={INK_SOFT} strokeWidth={2} strokeDasharray="6 4" opacity={0.8} />
                ) : null}
                {e > 0 ? <rect x={x0} y={top - 6} width={exp * PER * e} height={barH + 12} fill={INK_SOFT} opacity={0.12 * e} /> : null}
                {g > 0 ? <rect x={x0} y={top} width={obs * PER * g} height={barH} fill={DATA} opacity={0.8} /> : null}
                {g > 0 && showGap > 0 ? (
                  <rect
                    x={x0 + Math.min(obs, exp) * PER}
                    y={top - 6}
                    width={Math.abs(gap) * PER * showGap}
                    height={barH + 12}
                    fill={STAT}
                    opacity={0.3}
                  />
                ) : null}
                {e > 0 ? (
                  <line x1={x0 + exp * PER} x2={x0 + exp * PER} y1={top - 12 - 4 * (glow + expGlow)} y2={top + barH + 12 + 4 * (glow + expGlow)} stroke={INK} strokeWidth={3 + 2 * (glow + expGlow)} opacity={e} />
                ) : null}
              </Svg>
              <div
                style={{
                  position: "absolute",
                  left: x0 + exp * PER + 10,
                  top: top + barH + 10,
                  opacity: e,
                  ...note(isMobile ? 22 : 20, isMobile && glow > 0.05 ? STAT_INK : INK_SOFT),
                  fontWeight: isMobile ? 650 : 500,
                  whiteSpace: "nowrap",
                }}
              >
                {isMobile ? <Mark at={eightyAt - 2}>expected {fmt(exp, 1)}</Mark> : `expected ${fmt(exp, 1)}`}
              </div>
              {g > 0 ? (
                <div
                  style={{
                    position: "absolute",
                    left: x0 + Math.max(obs, exp) * PER + 14,
                    top: top + 2,
                    ...note(28, DATA_INK),
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Count at={at} to={obs} dur={16} />
                  {showGap > 0 ? (
                    <span style={{ ...note(22, STAT_INK), fontWeight: 650, marginLeft: 12, opacity: showGap }}>
                      {gap > 0 ? "+" : "−"}
                      {fmt(Math.abs(gap), 1)}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </React.Fragment>
          );
        })}

        {/* The statistic: every gap, added up. */}
        <div style={{ position: "absolute", left: LABEL_X, top: y(830), opacity: total, whiteSpace: "nowrap" }}>
          <span style={{ ...note(38, STAT_INK), fontWeight: 700 }}>
            <Greek>χ</Greek>² = <Count at={twelveAt - 8} to={CHI.chi2} dur={20} format={(v) => fmt(v, 1)} />
          </span>
          <span style={{ ...note(30, STAT_INK), fontWeight: 650, marginLeft: 30, opacity: ease(frame, pAt - 4, 12) }}>p = {fmt(CHI.p, 3)}</span>
        </div>
        <Note at={pAt + 6} x={LABEL_X + 520} y={y(830) + 8}>
          <Label size={22} color={INK_SOFT} weight={520}>
            device and churn are related
          </Label>
        </Note>
      </div>
    </AbsoluteFill>
  );
};
