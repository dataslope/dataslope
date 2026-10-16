import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, halo, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DEPTS, type Group, POOLED } from "./data";
import { Drift, GROUP_COLOR, GROUP_INK, Headline, Kicker, Marker, Ring, STAT_INK, Svg } from "./parts";

const PX0 = 520;
const PX1 = 1420;
const px = (rate: number) => PX0 + (PX1 - PX0) * rate;
/** Rows: everyone pooled, then the two departments. */
const ROW_Y = [400, 590, 740];
/** Dot area grows with the number of applicants. */
const radius = (applied: number) => 5 + Math.sqrt(applied) * 1.15;
const GAP_X = 1530;
const NAME: Record<Group, string> = { men: "Men", women: "Women" };

/** "+5", "−22": women minus men, in points, with a real minus sign. */
const signed = (x: number) => {
  const v = Math.round(Math.abs(x) * 10) / 10;
  return `${x >= 0 ? "+" : "−"}${v % 1 ? v.toFixed(1) : v.toFixed(0)}`;
};
const pct = (x: number) => `${+(x * 100).toFixed(1)}%`;

/**
 * Part 2 opens: the lesson's two departments. Men lead overall; women lead in
 * each department; and the reason is where each group applied.
 */
export const AdmitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();
  const from = n.beat("admit").from;

  // ── Cues ──
  const famousAt = n.word("admit", "famous");
  const twoAt = n.word("admit", "two departments");
  const menAt = n.word("overall", "men");
  const womenAt = n.word("overall", "women");
  const splitAt = n.word("split", "split");
  const easyAt = n.word("split", "easy");
  const sixtyFiveAt = n.word("split", "sixty-five");
  const hardAt = n.word("hard", "hard");
  const againAt = n.word("hard", "twenty-seven");
  const bothAt = n.word("how", "both");
  const behindAt = n.word("how", "behind");
  const sevenAt = n.word("mix", "seven hundred women");
  const menMixAt = n.word("mix", "Six hundred of the men");
  const nameAt = n.word("name", "Simpson's paradox");
  const lurkAt = n.word("name", "lurking");
  const unevenAt = n.word("name", "unevenly");
  const totalAt = n.word("ask", "total");
  const overAt = n.word("ask", "averaging over");
  const slopeAt = n.word("confound-in", "slope");
  const end = n.beat("confound-in").to;

  const rowY = (i: number) => y(ROW_Y[i]);
  const rows = [
    { name: "Overall", sub: "both departments", cells: POOLED, at: { men: menAt, women: womenAt }, gapAt: behindAt },
    { name: "Easy", sub: "department", cells: DEPTS[0], at: { men: easyAt + 2, women: sixtyFiveAt - 4 }, gapAt: bothAt - 2 },
    { name: "Hard", sub: "department", cells: DEPTS[1], at: { men: hardAt + 2, women: againAt - 4 }, gapAt: bothAt + 4 },
  ];
  const grid = ease(frame, menAt - 10, 16);
  const mixLit = (g: Group) => ease(frame, g === "women" ? sevenAt - 6 : menMixAt - 6, 10) * (1 - ease(frame, nameAt - 6, 12) * 0.5);

  return (
    <AbsoluteFill>
      {/* ── Sound: each dot as it lands, the mix, the name ── */}
      {rows.flatMap((r) => (["men", "women"] as const).map((g) => <Sfx key={`${r.name}-${g}`} name="el-tap" at={r.at[g]} level={-29} />))}
      <Sfx name="el-pencil" at={overAt - 6} level={-34} />
      <Sfx name="el-chime" at={n.beat("ask").to + 6} level={-32} />

      <Kicker at={from - 10}>Simpson&apos;s paradox and confounding</Kicker>

      <Headline
        top={y(150)}
        out={nameAt - 8}
        parts={[
          { text: "Ahead in both,", at: bothAt - 6 },
          { text: "behind overall.", at: behindAt - 4, italic: true },
        ]}
      />
      <Headline
        top={y(150)}
        parts={[
          { text: "A lurking variable:", at: lurkAt - 4 },
          { text: "the department.", at: unevenAt - 10, italic: true },
        ]}
      />
      <Note at={from - 4} x={92} y={y(176)}>
        <span style={{ ...body(44, true), color: INK, whiteSpace: "nowrap", opacity: 1 - ease(frame, bothAt - 10, 8) }}>
          Who gets in?
          <span style={{ ...note(22, INK_SOFT), marginLeft: 20, opacity: ease(frame, famousAt - 2, 10) }}>
            the famous case: Berkeley, 1973
          </span>
        </span>
      </Note>

      <Drift from={totalAt} to={end + 30} amount={0.02} origin={[960, 600]}>
        <FigLabel n="6" title="Share admitted, in two departments" at={twoAt - 6} x={160} y={y(262)} />
        <Note at={twoAt} x={1760} y={y(262) + 2} align="right" from="right">
          <span style={{ ...note(21, INK_SOFT), display: "inline-flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
            {(["men", "women"] as const).map((g) => (
              <React.Fragment key={g}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", background: GROUP_COLOR[g], display: "inline-block" }} /> {NAME[g]}
                <span style={{ width: 12 }} />
              </React.Fragment>
            ))}
            dot area: applicants
          </span>
        </Note>

        {/* Gridlines at 0, 25, 50, 75 and 100%. */}
        <Svg opacity={grid}>
          {[0, 0.25, 0.5, 0.75, 1].map((s) => (
            <line
              key={s}
              x1={px(s)}
              x2={px(s)}
              y1={y(330)}
              y2={y(330) + (y(800) - y(330)) * grid}
              stroke={s === 0 ? INK : HAIRLINE}
              strokeWidth={s === 0 ? 1.6 : 1}
              strokeDasharray={s === 0 ? undefined : "2 5"}
            />
          ))}
          <line x1={140} x2={1780} y1={(rowY(0) + rowY(1)) / 2 + 6} y2={(rowY(0) + rowY(1)) / 2 + 6} stroke={HAIRLINE} strokeWidth={1} opacity={ease(frame, splitAt - 4, 12) * 0.6} />
        </Svg>
        {[0, 0.25, 0.5, 0.75, 1].map((s) => (
          <div key={s} style={{ position: "absolute", left: px(s), top: y(810), transform: "translateX(-50%)", opacity: grid, ...note(20, INK_SOFT) }}>
            {Math.round(s * 100)}%
          </div>
        ))}
        <Ink at={bothAt - 6} dur={12} style={{ left: GAP_X, top: y(330) - 30 }}>
          <span style={label(20, INK_SOFT)}>Women minus men</span>
        </Ink>

        {/* The total, drawn from the departments it averages over. */}
        <Svg opacity={ease(frame, overAt - 4, 14) * 0.7}>
          {(["men", "women"] as const).flatMap((g) =>
            DEPTS.map((d, k) => {
              const share = d[g].applied / POOLED[g].applied;
              return (
                <line
                  key={`${g}-${k}`}
                  x1={px(POOLED[g].rate)}
                  y1={rowY(0)}
                  x2={px(d[g].rate)}
                  y2={rowY(k + 1)}
                  stroke={GROUP_COLOR[g]}
                  strokeWidth={1 + share * 9}
                  strokeLinecap="round"
                />
              );
            }),
          )}
        </Svg>

        {rows.map((r, i) => {
          const cy = rowY(i);
          const rowIn = ease(frame, Math.min(r.at.men, r.at.women) - 8, 12);
          const lead: Group = r.cells.women.rate > r.cells.men.rate ? "women" : "men";
          const gap = (r.cells.women.rate - r.cells.men.rate) * 100;
          const order: Group[] = r.cells.men.applied >= r.cells.women.applied ? ["men", "women"] : ["women", "men"];
          return (
            <React.Fragment key={r.name}>
              <Ink at={Math.min(r.at.men, r.at.women) - 10} dur={12} style={{ left: 160, top: cy - 34, whiteSpace: "nowrap" }}>
                <div style={{ ...body(38, true), color: INK }}>
                  {i === 0 ? <Marker at={totalAt - 4}>{r.name}</Marker> : r.name}
                </div>
                <div style={note(20, INK_SOFT)}>{r.sub}</div>
              </Ink>
              {/* Where each group's applications went: the big dots. */}
              {i > 0
                ? (["men", "women"] as const).map((g) =>
                    r.cells[g].applied > 300 ? (
                      <div
                        key={g}
                        style={{
                          position: "absolute",
                          left: px(r.cells[g].rate) - radius(r.cells[g].applied) - 14,
                          top: cy - radius(r.cells[g].applied) - 14,
                          width: 2 * radius(r.cells[g].applied) + 28,
                          height: 2 * radius(r.cells[g].applied) + 28,
                          borderRadius: "50%",
                          background: HIGHLIGHT,
                          opacity: 0.8 * mixLit(g),
                        }}
                      />
                    ) : null,
                  )
                : null}
              <Svg opacity={rowIn}>
                <line x1={px(Math.min(r.cells.men.rate, r.cells.women.rate))} x2={px(Math.max(r.cells.men.rate, r.cells.women.rate))} y1={cy} y2={cy} stroke={INK} strokeWidth={2} />
                {order.map((g) => (
                  <circle
                    key={g}
                    cx={px(r.cells[g].rate)}
                    cy={cy}
                    r={radius(r.cells[g].applied) * pop(frame, r.at[g] - 4, fps, 14)}
                    fill={GROUP_COLOR[g]}
                    stroke={PAPER}
                    strokeWidth={2}
                    opacity={0.92}
                  />
                ))}
              </Svg>
              {(["men", "women"] as const).map((g) => {
                const right = g === lead;
                const rr = radius(r.cells[g].applied);
                return (
                  <Note
                    key={g}
                    at={r.at[g] + 2}
                    x={right ? px(r.cells[g].rate) + rr + 10 : px(r.cells[g].rate) - rr - 10}
                    y={cy - 15}
                    align={right ? "left" : "right"}
                  >
                    <span style={{ ...note(22, GROUP_INK[g]), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>{pct(r.cells[g].rate)}</span>
                  </Note>
                );
              })}
              <Note at={r.gapAt} x={GAP_X} y={cy - 19}>
                <span
                  style={{
                    ...note(28, GROUP_INK[lead]),
                    fontWeight: 650,
                    padding: "0 8px",
                    marginLeft: -8,
                    background: lead === "women" ? HIGHLIGHT : "transparent",
                  }}
                >
                  {signed(gap)}
                </span>
                <span style={{ ...note(20, INK_SOFT), marginLeft: 8 }}>points</span>
              </Note>
              {i > 0 ? <Ring x={px(r.cells.women.rate)} y={cy} at={r.gapAt - 2} color={GROUP_COLOR.women} r0={radius(r.cells.women.applied)} r1={radius(r.cells.women.applied) + 40} /> : null}
              {i === 0 ? <Ring x={px(POOLED.women.rate)} y={cy} at={behindAt} color={GROUP_COLOR.women} r0={radius(POOLED.women.applied)} r1={radius(POOLED.women.applied) + 40} /> : null}
            </React.Fragment>
          );
        })}

        {/* Where each group applied. */}
        <Note at={sevenAt - 2} x={px(DEPTS[1].women.rate) + radius(600) + 76} y={rowY(2) + 26}>
          <span style={{ ...note(22, GROUP_INK.women), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>
            {DEPTS[1].women.applied} of {POOLED.women.applied} women applied here
          </span>
        </Note>
        <Note at={menMixAt - 2} x={px(DEPTS[0].men.rate) - radius(600) - 24} y={rowY(1) + 34} align="right">
          <span style={{ ...note(22, GROUP_INK.men), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>
            {DEPTS[0].men.applied} of {POOLED.men.applied} men applied here
          </span>
        </Note>
        <Note at={slopeAt - 4} x={GAP_X} y={y(860)}>
          <span style={{ ...note(22, STAT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>and slopes?</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
