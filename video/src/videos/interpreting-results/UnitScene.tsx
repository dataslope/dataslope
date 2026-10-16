import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { DISTRICTS, signed } from "./data";
import { Count, DATA, DATA_INK, Drift, Headline, lerp, Marker, partial, Ring, STAT_INK, Svg } from "./parts";

const XD = [10, 86] as const;
const YD = [24, 94] as const;
const TOP = 350;
const BOTTOM = 800;
const AGG = { x0: 200, x1: 700 };
const IND = { x0: 1060, x1: 1560 };
/** Six districts, told apart by hue. */
const HUES = [ds("blue", 500), ds("green", 600), ds("orange", 500), ds("purple", 500), ds("teal", 500), ds("red", 500)];

/** Least squares inside one district, for its own line. */
const fit = (xs: readonly number[], ys: readonly number[]) => {
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
  const my = ys.reduce((s, v) => s + v, 0) / ys.length;
  let sxy = 0;
  let sxx = 0;
  xs.forEach((x, i) => {
    sxy += (x - mx) * (ys[i] - my);
    sxx += (x - mx) ** 2;
  });
  return { slope: sxy / sxx, mx, my };
};
const FITS = DISTRICTS.groups.map((g) => fit(g.x, g.y));

/**
 * The unit of analysis: six district averages that correlate at 0.93, and
 * the people inside them, who barely correlate at all.
 */
export const UnitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();
  const from = n.beat("unit").from;

  // ── Cues ──
  const dependsAt = n.word("unit", "depends");
  const countingAt = n.word("unit", "counting");
  const sixAt = n.word("unit", "six districts");
  const incomeAt = n.word("unit", "average income");
  const nineAt = n.word("unit", "zero point nine three");
  const insideAt = n.word("people", "inside a district");
  const personAt = n.word("people", "person by person");
  const sevenAt = n.word("people", "zero point zero seven");
  const averagesAt = n.word("people", "averages");
  const bothAt = n.word("both-true", "Both");
  const districtsAt = n.word("both-true", "districts");
  const peopleAt = n.word("both-true", "people");
  const nameAt = n.word("both-true", "Name the unit");
  const quoteAt = n.word("both-true", "quote");
  const end = n.beat("both-true").to;

  const top = y(TOP);
  const bottom = y(BOTTOM);
  const px = (p: { x0: number; x1: number }, v: number) => p.x0 + ((v - XD[0]) / (XD[1] - XD[0])) * (p.x1 - p.x0);
  const py = (v: number) => bottom - ((v - YD[0]) / (YD[1] - YD[0])) * (bottom - top);
  const dotAt = (g: number) => lerp(sixAt - 2, incomeAt + 4, g / 5);
  const groupLine = ease(frame, nineAt - 8, 18);
  const means = DISTRICTS.groups.map((g) => [px(AGG, g.meanX), py(g.meanY)] as const);
  const burstAt = (g: number) => insideAt - 6 + g * 5;

  const panel = (p: { x0: number; x1: number }, at: number, title: React.ReactNode, color: string, xTitle: string) => (
    <>
      <Svg opacity={ease(frame, at, 14)}>
        <line x1={p.x0} x2={p.x1} y1={bottom + 0.5} y2={bottom + 0.5} stroke={INK} strokeWidth={1.6} />
        <line x1={p.x0} x2={p.x0} y1={top} y2={bottom} stroke={INK} strokeWidth={1.4} />
        {[40, 60, 80].map((v) => (
          <line key={v} x1={p.x0} x2={p.x1} y1={py(v)} y2={py(v)} stroke={HAIRLINE} strokeWidth={1} opacity={0.3} />
        ))}
      </Svg>
      <Ink at={at + 2} dur={12} style={{ left: p.x0, top: top - 46, whiteSpace: "nowrap" }}>
        <span style={label(24, color)}>{title}</span>
      </Ink>
      <Note at={at + 6} x={(p.x0 + p.x1) / 2} y={bottom + 14} from="up">
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>{xTitle}</span>
      </Note>
      {[40, 60, 80].map((v) => (
        <div key={v} style={{ position: "absolute", right: 1920 - p.x0 + 10, top: py(v) - 13, opacity: ease(frame, at + 4, 12), ...note(20, INK_SOFT) }}>
          {v}%
        </div>
      ))}
    </>
  );

  return (
    <AbsoluteFill>
      {/* ── Sound: each district, the line through them, the people, their lines ── */}
      {DISTRICTS.groups.map((_, g) => (
        <Sfx key={g} name="el-tap" at={dotAt(g)} level={-30} />
      ))}
      <Sfx name="el-pencil" at={nineAt - 8} level={-33} />
      <Sfx name="el-sprinkle" at={insideAt - 6} level={-33} />
      <Sfx name="el-pencil" at={personAt - 4} level={-35} />

      <Headline
        top={y(150)}
        out={nameAt - 8}
        parts={[
          { text: "Districts correlate.", at: nineAt - 6 },
          { text: "People barely do.", at: sevenAt - 6, italic: true },
        ]}
      />
      <Headline
        top={y(150)}
        parts={[
          { text: "Both true.", at: nameAt - 4 },
          { text: "Name the unit.", at: nameAt + 10, italic: true },
        ]}
      />

      <Drift from={nameAt} to={end + 40} amount={0.02} origin={[880, 580]}>
        <FigLabel n="12" title="Income and turnout in six districts" at={from - 4} x={160} y={y(262)} />
        {panel(
          AGG,
          dependsAt - 4,
          <>
            <Marker at={districtsAt - 2}>Districts</Marker>
            <span style={{ opacity: ease(frame, nineAt - 6, 8) }}>: r = {signed(DISTRICTS.rGroup)}</span>
          </>,
          DATA_INK,
          "average income, one dot per district",
        )}
        {panel(
          IND,
          insideAt - 10,
          <>
            <Marker at={peopleAt - 2}>People</Marker>, within a district
            <span style={{ opacity: ease(frame, sevenAt - 6, 8) }}>
              : r = <Count from={0} to={DISTRICTS.rWithin} at={sevenAt - 6} dur={16} format={(v) => signed(v)} />
            </span>
          </>,
          STAT_INK,
          "income, one dot per person",
        )}
        <Note at={countingAt - 2} x={AGG.x0 + 12} y={top + 6}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>average turnout</span>
        </Note>

        <Svg>
          {/* The districts' line, through their averages. */}
          {groupLine > 0 ? (
            <path
              d={partial(means, groupLine)}
              fill="none"
              stroke={DATA}
              strokeWidth={2.4}
              opacity={0.55}
            />
          ) : null}
          {DISTRICTS.groups.map((g, k) => {
            const a = pop(frame, dotAt(k), fps, 14);
            return a > 0.01 ? <circle key={k} cx={means[k][0]} cy={means[k][1]} r={20 * a} fill={HUES[k]} stroke={PAPER} strokeWidth={2} /> : null;
          })}
          {/* Each district bursts into its people, on the right. */}
          {DISTRICTS.groups.map((g, k) =>
            g.x.map((xv, i) => {
              const t = ease(frame, burstAt(k) + (i % 11) * 0.5, 16);
              if (t <= 0) return null;
              const x = lerp(means[k][0], px(IND, xv), t);
              const yy = lerp(means[k][1], py(g.y[i]), t);
              return <circle key={`${k}-${i}`} cx={x} cy={yy} r={4} fill={HUES[k]} opacity={lerp(0.2, 0.55, t)} />;
            }),
          )}
          {FITS.map((f, k) => {
            const p = ease(frame, personAt - 4 + k * 4, 14);
            if (p <= 0) return null;
            const x0 = f.mx - 8;
            const x1 = f.mx + 8;
            const xe = lerp(x0, x1, p);
            return (
              <line
                key={k}
                x1={px(IND, x0)}
                y1={py(f.my + f.slope * (x0 - f.mx))}
                x2={px(IND, xe)}
                y2={py(f.my + f.slope * (xe - f.mx))}
                stroke={HUES[k]}
                strokeWidth={4}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
        <Ring x={IND.x0 + 250} y={(top + bottom) / 2} at={averagesAt - 2} r0={40} r1={200} />
        {means.map(([mx, my], k) => (
          <Ring key={k} x={mx} y={my} at={dotAt(k) + 2} color={HUES[k]} r0={20} r1={64} />
        ))}
        {/* The panel the narration is not about steps back, one and then the other. */}
        {[
          { p: IND, dim: ease(frame, districtsAt - 6, 12) * (1 - ease(frame, peopleAt - 6, 12)) },
          { p: AGG, dim: ease(frame, peopleAt - 6, 12) * (1 - ease(frame, nameAt - 4, 12)) },
        ].map(({ p, dim }, k) =>
          dim > 0 ? (
            <div
              key={k}
              style={{ position: "absolute", left: p.x0 - 80, top: top - 56, width: p.x1 - p.x0 + 110, height: bottom - top + 110, background: PAPER, opacity: 0.6 * dim }}
            />
          ) : null,
        )}
        <Ring x={AGG.x0 + 230} y={top - 30} at={quoteAt - 2} color={DATA} r0={20} r1={90} />
        <Ring x={IND.x0 + 330} y={top - 30} at={quoteAt + 4} r0={20} r1={90} />
        <Note at={sevenAt + 4} x={IND.x1 + 24} y={top + 30}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>on average,</span>
          <div style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>across the six</div>
        </Note>
        <Note at={bothAt - 2} x={IND.x1 + 24} y={bottom - 80}>
          <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>same data,</span>
          <div style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>different unit</div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
