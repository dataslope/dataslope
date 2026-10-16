import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { TINY } from "./data";
import { DATA, DATA_INK, H0, Head, Label, Mark, pulse, RAW, STAT, STAT_INK, Strike } from "./parts";

const LEFT = 160;
const TABLE_X = 1010;
const COLS = [TABLE_X, TABLE_X + 210, TABLE_X + 360];
const BAR_X = TABLE_X + 520;
const BAR_W = 250;
const ROW_Y0 = 420;
const ROW_DY = 84;

/** A conditional probability set the way the lesson writes it. */
const Cond: React.FC<{ a: React.ReactNode; b: React.ReactNode; color: string }> = ({ a, b, color }) => (
  <span style={{ ...body(44, true), color, whiteSpace: "nowrap" }}>
    P( {a} <span style={{ color: INK_SOFT }}>|</span> {b} )
  </span>
);

/**
 * What a p-value is not: the chance the null is true (the swapped
 * conditional), and the size of an effect (a fixed 0.1 whose p-value
 * collapses as the sample grows, the lesson's seed-7 block).
 */
export const IsntScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const isntFrom = n.beat("isnt").from;
  const notAt = n.word("isnt", "NOT");
  const trueAt = n.word("isnt", "true");
  const assumingAt = n.word("isnt", "assuming");
  const dataAt = n.word("swap", "chance of the data");
  const givenAt = n.word("swap", "given");
  const nullGivenAt = n.word("swap", "chance of the null");
  const eightAt = n.word("collapse", "point eight three");
  const whichAt = n.word("hack-in", "Which");
  const swapAt = n.word("swap", "Swap");
  const fallacyAt = n.word("swap", "prosecutor's");
  const sizeAt = n.word("size", "size");
  const fixedAt = n.word("size", "fixed");
  const growAt = n.word("size", "grow");
  const twentyAt = n.word("collapse", "Twenty");
  const thousandAt = n.word("collapse", "A thousand");
  const hundredAt = n.word("collapse", "A hundred thousand");
  const zeroAt = n.word("collapse", "as zero");
  const neverAt = n.word("same", "never");
  const dataSeeAt = n.word("same", "how much data");
  const foolAt = n.word("hack-in", "fool");

  const rowAt = [twentyAt - 4, twentyAt + 22, thousandAt - 4, hundredAt - 18, hundredAt - 4];
  const spoken = [0, 2, 4];
  const shake = pulse(frame, swapAt, 18);
  const dim = 1 - 0.3 * ease(frame, whichAt - 4, 14) - 0.25 * ease(frame, foolAt - 4, 14);
  const firstGlow = pulse(frame, eightAt, 24);

  return (
    <AbsoluteFill>
      {/* ── Sound: the strike, the swap, each row of the table ── */}
      <Sfx name="el-scratch" at={notAt + 2} level={-30} />
      <Sfx name="el-whoosh" at={swapAt - 2} level={-33} />
      {rowAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={spoken.includes(i) ? -29 : -31} />
      ))}

      <Head a="What a p-value" b="isn't." at={isntFrom - 4} bAt={notAt - 4} />

      <div style={{ position: "absolute", inset: 0, opacity: dim }}>
        {/* ── Not the chance the null is true ── */}
        <Ink at={notAt - 2} dur={16} style={{ left: LEFT, top: y(310), whiteSpace: "nowrap" }}>
          <span style={{ ...body(44, true), color: INK }}>
            <Strike at={trueAt + 4}>
              P( <H0 /> is true )
            </Strike>
          </span>
        </Ink>
        <Ink at={assumingAt - 4} dur={16} style={{ left: LEFT, top: y(310) + 70, whiteSpace: "nowrap" }}>
          <Label size={24} color={INK_SOFT} weight={520}>
            It was computed by assuming <H0 />.
          </Label>
        </Ink>

        {/* ── The swapped conditional ── */}
        <Ink at={dataAt - 4} dur={16} style={{ left: LEFT, top: y(530), whiteSpace: "nowrap" }}>
          <Cond a="data" b={<H0 />} color={DATA_INK} />
          <span style={{ ...label(22, DATA_INK), marginLeft: 22, opacity: ease(frame, givenAt, 12) }}>the p-value</span>
        </Ink>
        <Ink
          at={nullGivenAt - 4}
          dur={16}
          style={{ left: LEFT, top: y(530) + 92, whiteSpace: "nowrap", transform: `translateX(${Math.sin(shake * Math.PI * 3) * 6}px)` }}
        >
          <Cond a={<H0 />} b="data" color={STAT_INK} />
          <span style={{ ...label(22, STAT_INK), marginLeft: 22 }}>not the p-value</span>
        </Ink>
        <Ink at={fallacyAt - 4} dur={18} style={{ left: LEFT, top: y(530) + 184, whiteSpace: "nowrap" }}>
          <span style={{ ...body(32, true), color: INK_SOFT }}>Swapping them: the prosecutor&apos;s fallacy</span>
        </Ink>

        {/* ── Fig. 7: a tiny fixed effect, a growing sample ── */}
        <FigLabel n="7" title={`A true effect of ${TINY.effect}, never changed`} at={sizeAt - 6} x={TABLE_X} y={y(310)} />
        {["Per group", "Effect", "p-value, as printed"].map((t, i) => (
          <div key={t} style={{ position: "absolute", left: COLS[i], top: y(365), opacity: ease(frame, fixedAt - 4, 12), ...label(21, INK_SOFT) }}>
            {t}
          </div>
        ))}
        <div
          style={{ position: "absolute", left: TABLE_X, top: y(365) + 36, width: 780 * ease(frame, fixedAt - 2, 16), height: 2, background: INK }}
        />
        {TINY.rows.map((r, i) => {
          const at = rowAt[i];
          const a = ease(frame, at, 12);
          const bar = ease(frame, at + 4, 16);
          const ry = y(ROW_Y0 + i * ROW_DY);
          const loud = spoken.includes(i);
          return (
            <React.Fragment key={r.n}>
              <div style={{ position: "absolute", left: COLS[0], top: ry, opacity: ease(frame, growAt - 4 + i * 3, 10), ...note(30, INK), fontWeight: 650 }}>
                {i === 4 ? <Mark at={dataSeeAt}>{fmt(r.n, 0)}</Mark> : fmt(r.n, 0)}
              </div>
              <div style={{ position: "absolute", left: COLS[1], top: ry, opacity: ease(frame, fixedAt - 2 + i * 2, 10), ...note(30, INK_SOFT) }}>
                {i === 2 ? <Mark at={neverAt}>{TINY.effect}</Mark> : TINY.effect}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: COLS[2],
                  top: ry,
                  opacity: a * (loud ? 1 : 0.7),
                  ...note(30, r.p < 0.05 ? STAT_INK : INK),
                  fontWeight: 700,
                  transform: i === 0 ? `scale(${1 + 0.12 * firstGlow})` : undefined,
                  transformOrigin: "0 50%",
                }}
              >
                {r.printed}
              </div>
              {a > 0 ? (
                <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                  <rect x={BAR_X} y={ry + 8} width={BAR_W} height={22} fill={RAW} opacity={0.35} />
                  <rect x={BAR_X} y={ry + 8} width={Math.max(2, BAR_W * r.p * bar)} height={22} fill={r.p < 0.05 ? STAT : DATA} />
                </svg>
              ) : null}
              <div
                style={{
                  position: "absolute",
                  left: TABLE_X,
                  top: ry + 58,
                  width: 780,
                  height: 1,
                  background: HAIRLINE,
                  opacity: 0.45 * a,
                }}
              />
            </React.Fragment>
          );
        })}
        <Ink at={zeroAt - 2} dur={14} style={{ left: BAR_X, top: y(ROW_Y0 + 5 * ROW_DY) - 4, whiteSpace: "nowrap" }}>
          <Label size={21} color={INK_SOFT} weight={520}>
            bar: p from 0 to 1
          </Label>
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
