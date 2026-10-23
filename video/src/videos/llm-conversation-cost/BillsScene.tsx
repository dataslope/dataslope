import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { billFor, DOUBLINGS, NAME, times, usd } from "./data";
import {
  Arrow,
  FIG_Y,
  Headline,
  INK,
  INK_SOFT,
  Key,
  LINE,
  LINE_EDGE,
  POINT,
  POINT_INK,
  pulse,
  Svg,
  TRI,
  TRI_FILL,
  TRI_INK,
  X0,
} from "./kit";

const BX = 300;
/** px per dollar: the 40-turn bill fills 1060 px. */
const PX = 1060 / billFor(40).plain;
const ROWS = [10, 20, 40] as const;
const ROW_Y = [372, 462, 552];
const ROW_H = 52;
const ARROW_X = 1660;
/** The doubling scale: x2 at NX0, x4 at NX1. */
const NX0 = 380;
const NX1 = 1560;
const NY = 806;
const nx = (r: number) => NX0 + ((r - 2) / 2) * (NX1 - NX0);

/**
 * The bills, split the way the area split: 10, 20 and 40 turns on Sonnet, the
 * straight-line part (the rectangle, and the replies) doubling each time, the
 * triangle's part quadrupling. Then what each doubling does to the whole
 * bill, on a scale from twice (all rectangle) to four times (all triangle):
 * 2.8, 3.2, 3.5, closing in on four.
 */
export const BillsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("bills").from;
  const rowAt = [n.word("bills", "ten turns"), n.word("bills", "Twenty"), n.word("bills", "Forty")];
  const valueAt = [n.word("bills", "thirteen cents"), n.word("bills", "thirty-seven"), n.word("bills", "dollar nineteen")];
  const ratiosFrom = n.beat("ratios").from;
  const ratioAt = [n.word("ratios", "two point eight"), n.word("ratios", "three point two"), n.word("ratios", "three and a half")];
  const triangleAt = n.word("toward", "triangle");
  const towardAt = n.word("toward", "toward");
  const creepsAt = n.word("toward", "creeps");

  const rowTop = (k: number) => y(ROW_Y[k]);
  const rowH = h(ROW_H);

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      {rowAt.map((at, k) => (
        <Sfx key={`b${k}`} name="el-whoosh" at={at - 4} level={-36} />
      ))}
      {valueAt.map((at, k) => (
        <Sfx key={`v${k}`} name="el-tap" at={at - 2} level={-25} />
      ))}
      {ratioAt.map((at, k) => (
        <Sfx key={`r${k}`} name="el-pop" at={at - 2} level={-30} />
      ))}
      <Sfx name="el-pencil" at={creepsAt - 2} level={-35} />

      <Headline at={from - 6} second={towardAt - 4} italic="Toward four times.">
        Each doubling costs more.
      </Headline>

      {/* ── Fig. 4: the three bills, split ── */}
      <FigLabel n="4" title={`Each bill on ${NAME}, split the same way`} at={from - 2} x={X0} y={y(FIG_Y)} />
      <div style={{ position: "absolute", right: 1920 - 1800, top: y(FIG_Y) + 2, display: "flex", gap: 30, alignItems: "center" }}>
        <Key at={rowAt[0] - 4} swatch={LINE} edge={LINE_EDGE}>
          rectangle and replies
        </Key>
        <Key at={rowAt[0]} swatch={TRI_FILL} edge={TRI}>
          triangle
        </Key>
      </div>

      {ROWS.map((turns, k) => {
        const b = billFor(turns);
        const lineW = b.line * PX;
        const triW = b.triangle * PX;
        const p = ease(frame, rowAt[k] - 4, k === 2 ? 26 : 16);
        const shown = (lineW + triW) * p;
        const glow = pulse(frame, triangleAt + k * 4, 22);
        return (
          <React.Fragment key={turns}>
            <Note at={rowAt[k] - 6} x={X0} y={rowTop(k) + rowH / 2 - 18}>
              <span style={{ ...note(28, INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>{turns} turns</span>
            </Note>
            {p > 0 ? (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: BX,
                    top: rowTop(k),
                    width: Math.min(shown, lineW),
                    height: rowH,
                    background: LINE,
                    borderRadius: "3px 0 0 3px",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: BX + lineW,
                    top: rowTop(k) - glow * 4,
                    width: Math.max(0, shown - lineW),
                    height: rowH + glow * 8,
                    background: TRI_FILL,
                    boxShadow: `inset 0 0 0 2px ${TRI}`,
                    borderRadius: "0 3px 3px 0",
                  }}
                />
              </>
            ) : null}
            <Note at={valueAt[k] - 4} x={BX + lineW + triW + 18} y={rowTop(k) + rowH / 2 - 19}>
              <span style={{ ...note(30, INK), fontWeight: 700, ...TABULAR }}>{usd(b.plain)}</span>
            </Note>
          </React.Fragment>
        );
      })}

      {/* Each doubling's ratio, between the rows. */}
      {[0, 1].map((k) => {
        const d = DOUBLINGS[k];
        const yA = rowTop(k) + rowH / 2 + 8;
        const yB = rowTop(k + 1) + rowH / 2 - 8;
        return (
          <React.Fragment key={k}>
            <Arrow from={[ARROW_X, yA]} to={[ARROW_X, yB]} at={ratioAt[k] - 4} dur={12} color={POINT} width={2.4} />
            <Note at={ratioAt[k] - 2} x={ARROW_X + 18} y={(yA + yB) / 2 - 20}>
              <span style={{ ...note(30, POINT_INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>{times(d.times)}</span>
            </Note>
          </React.Fragment>
        );
      })}

      {/* ── Fig. 5: what each doubling does ── */}
      <FigLabel n="5" title="What doubling the turns does to the bill" at={ratiosFrom - 2} x={X0} y={y(670)} />
      <Svg opacity={ease(frame, ratiosFrom, 14)}>
        <line x1={NX0} x2={NX1} y1={y(NY)} y2={y(NY)} stroke={INK} strokeWidth={2} />
        {[2, 2.5, 3, 3.5, 4].map((r) => (
          <line key={r} x1={nx(r)} x2={nx(r)} y1={y(NY) - 8} y2={y(NY) + 8} stroke={INK} strokeWidth={2} />
        ))}
      </Svg>
      {[2, 3, 4].map((r) => (
        <Note key={r} at={ratiosFrom + 2} x={nx(r) - 30} y={y(NY) + 16} width={60} style={{ textAlign: "center" }}>
          <span style={{ ...label(22, INK_SOFT), ...TABULAR }}>{`×${r}`}</span>
        </Note>
      ))}
      <Note at={triangleAt - 4} x={nx(2) - 100} y={y(NY) + 52} width={200} style={{ textAlign: "center" }}>
        <span style={{ ...note(22, LINE_EDGE), fontWeight: 600, whiteSpace: "nowrap" }}>all rectangle</span>
      </Note>
      <Note at={triangleAt} x={nx(4) - 100} y={y(NY) + 52} width={200} style={{ textAlign: "center" }}>
        <span style={{ ...note(22, TRI_INK), fontWeight: 600, whiteSpace: "nowrap" }}>all triangle</span>
      </Note>
      {DOUBLINGS.map((d, k) => {
        const p = ease(frame, ratioAt[k] - 2, 10);
        if (p <= 0) return null;
        return (
          <React.Fragment key={k}>
            <Svg>
              <circle cx={nx(d.times)} cy={y(NY)} r={10 * p} fill={POINT} />
            </Svg>
            <Note at={ratioAt[k]} x={nx(d.times) - 90} y={y(NY) - 92} width={180} from="up" style={{ textAlign: "center" }}>
              <span style={{ display: "block", ...note(21, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>
                {d.from} to {d.to} turns
              </span>
              <span style={{ display: "block", ...note(28, POINT_INK), fontWeight: 700, ...TABULAR }}>{times(d.times)}</span>
            </Note>
          </React.Fragment>
        );
      })}
      <Arrow
        from={[nx(DOUBLINGS[2].times) + 14, y(NY)]}
        to={[nx(3.86), y(NY)]}
        at={creepsAt - 2}
        dur={22}
        color={POINT}
        width={3.2}
      />
    </AbsoluteFill>
  );
};
