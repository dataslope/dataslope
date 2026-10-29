import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HAIRLINE, INK, INK_SOFT, TABULAR, fmt, label } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CHI } from "./data";
import { Drift, Mark, MARK_BAD, MARK_OK, noteText, OK_INK, X0 } from "./parts";

const TABLE_TOP = 470;
const HEAD_H = 52;
const ROW_H = 92;
const COL_W = [230, 230, 230];
const SIDE_X = 1060;

/**
 * Question 13 on the Statistics course's device and churn table (seed 5, the
 * run Stats-7 TestingHypotheses shows): the observed counts, then beside
 * each the count independence would predict. Mobile churned 103 times
 * against 86.7 expected; the squared gaps over the expected counts sum to
 * 11.9, p = 0.0026. Every expected count clears five.
 */
export const ChiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("chi").from;
  const qAt = n.word("chi", "Question");
  const textAt = n.word("chi", "What is the chi-square test");
  const countsAt = n.word("chi", "Counts in categories");
  const compareAt = n.word("chi", "It compares observed counts");
  const mixAt = n.word("chi", "against a claimed mix");
  const fitAt = n.word("chi", "goodness of fit");
  const twoAt = n.word("chi", "between two categorical variables");
  const indepAt = n.word("chi", "which is independence");
  const tableAt = n.word("chi", "Device and churn");
  const mobileAt = n.word("chi", "a hundred and three mobile users churned");
  const expectAt = n.word("chi", "about eighty-seven");
  const sumAt = n.word("chi", "Square each gap");
  const chiAt = n.word("chi", "eleven point nine");
  const pAt = n.word("chi", "p is point oh oh two six");
  const fiveAt = n.word("chi-five", "One condition");
  const atLeastAt = n.word("chi-five", "at least five");
  const end = n.beat("chi-five").to;

  const top = y(TABLE_TOP);
  const colX = COL_W.map((_, i) => X0 + COL_W.slice(0, i).reduce((a, b) => a + b, 0));
  const width = COL_W.reduce((a, b) => a + b, 0);
  const rowY = (r: number) => top + h(HEAD_H) + r * h(ROW_H);
  const mobile = CHI.devices.indexOf("mobile");
  // The smallest expected count, for "at least five".
  const flat = CHI.expected.flatMap((r, i) => r.map((v, j) => ({ v, i, j })));
  const smallest = flat.reduce((a, b) => (b.v < a.v ? b : a));
  const tableP = ease(frame, tableAt, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={tableAt + 2} level={-34} />
      <Sfx name="el-tap" at={mobileAt + 6} level={-32} />
      <Sfx name="el-sprinkle" at={expectAt} level={-34} />
      <Sfx name="el-pop" at={chiAt} level={-30} />
      <Sfx name="el-tap" at={atLeastAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={13} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is the chi-square test used for?
        </QuestionCard>

        <Note at={countsAt} x={X0} y={y(290)}>
          <span style={{ ...noteText(28, INK) }}>
            <Mark at={countsAt + 4}>counts in categories</Mark>
            <span style={{ opacity: ease(frame, compareAt, 10) }}>: observed against expected</span>
          </span>
        </Note>
        <Note at={mixAt} x={X0} y={y(350)}>
          <span style={{ ...noteText(24, INK_SOFT) }}>
            one variable against a claimed mix:{" "}
            <b style={{ color: INK, opacity: ease(frame, fitAt - 2, 10) }}>goodness of fit</b>
          </span>
        </Note>
        <Note at={twoAt} x={X0} y={y(394)}>
          <span style={{ ...noteText(24, INK_SOFT) }}>
            two categorical variables:{" "}
            <b style={{ color: INK, opacity: ease(frame, indepAt - 2, 10) }}>independence</b>
          </span>
        </Note>

        {/* ── Device and churn ── */}
        <div style={{ position: "absolute", left: X0, top, width, opacity: tableP, transform: `translateY(${(1 - tableP) * 10}px)` }}>
          <div style={{ position: "absolute", left: 0, top: h(HEAD_H) - 1, width, height: 1.5, background: INK }} />
          {["device", "stayed", "churned"].map((c, j) => (
            <div key={c} style={{ position: "absolute", left: colX[j] - X0 + 14, top: h(12), ...label(22, INK_SOFT), fontWeight: 650 }}>
              {c}
            </div>
          ))}
          {CHI.devices.map((d, i) => (
            <React.Fragment key={d}>
              <div style={{ position: "absolute", left: 0, top: rowY(i) - top + h(ROW_H) - 1, width, height: 1, background: HAIRLINE, opacity: 0.6 }} />
              <div style={{ position: "absolute", left: 14, top: rowY(i) - top + h(22), ...noteText(28, INK) }}>{d}</div>
            </React.Fragment>
          ))}
        </div>
        {CHI.devices.map((_, i) =>
          CHI.observed[i].map((obs, j) => {
            const hot = i === mobile && j === 1;
            const small = i === smallest.i && j === smallest.j;
            const x = colX[j + 1] + 14;
            return (
              <React.Fragment key={`${i}-${j}`}>
                <Note at={tableAt + 4 + (i * 2 + j) * 2} x={x} y={rowY(i) + h(10)}>
                  <span style={{ fontFamily: MONO, fontSize: 32, fontWeight: 600, color: hot ? ACCENT_INK : BLUE_INK, ...TABULAR }}>
                    {hot ? <Mark at={mobileAt + 6} color={MARK_BAD}>{obs}</Mark> : obs}
                  </span>
                </Note>
                <Note at={expectAt + 2 + (i * 2 + j) * 2} x={x} y={rowY(i) + h(54)}>
                  <span style={{ ...label(20, hot ? INK : INK_SOFT), ...TABULAR }}>
                    expected{" "}
                    {hot ? (
                      <Mark at={expectAt + 8}>{fmt(CHI.expected[i][j], 1)}</Mark>
                    ) : small ? (
                      <Mark at={atLeastAt + 2} color={MARK_OK}>
                        {fmt(CHI.expected[i][j], 1)}
                      </Mark>
                    ) : (
                      fmt(CHI.expected[i][j], 1)
                    )}
                  </span>
                </Note>
              </React.Fragment>
            );
          }),
        )}

        <Note at={sumAt} x={SIDE_X} y={y(500)}>
          <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 600, color: INK, whiteSpace: "nowrap", ...TABULAR }}>
            χ² = Σ (O − E)² / E
          </div>
        </Note>
        <Note at={chiAt - 2} x={SIDE_X} y={y(566)}>
          <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 600, color: BLUE_INK, whiteSpace: "nowrap", ...TABULAR }}>
            &nbsp;&nbsp;= <Mark at={chiAt + 2}>{fmt(CHI.chi2, 1)}</Mark>
          </div>
        </Note>
        <Note at={pAt} x={SIDE_X} y={y(640)}>
          <span style={{ ...noteText(30, INK), ...TABULAR }}>
            p = <b>{fmt(CHI.p, 4)}</b>
          </span>
        </Note>
        <Note at={fiveAt} x={SIDE_X} y={y(740)}>
          <span style={{ ...noteText(26, OK_INK) }}>
            one condition: expected counts of <Mark at={atLeastAt + 2} color={MARK_OK}>at least 5</Mark> in most cells
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
