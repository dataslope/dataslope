import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BERKSON, signed } from "./data";
import { Count, DATA_INK, Dashed, DOT, Drift, Headline, lerp, Marker, RAW, Spot, STAT, STAT_INK, Svg } from "./parts";

const DOM = [12, 88] as const;
const TOP = 350;
const BOTTOM = 790;
const ALL = { x0: 180, x1: 640 };
const IN = { x0: 1100, x1: 1560 };

/**
 * Selection that manufactures a relationship: two independent scores, a rule
 * that admits on their sum, and a strong negative correlation among the
 * admitted that nothing caused.
 */
export const BerksonScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const from = n.beat("berkson").from;

  // ── Cues ──
  const populationAt = n.word("berkson", "population");
  const abilityAt = n.word("berkson", "ability");
  const unrelatedAt = n.word("berkson", "unrelated");
  const admitAt = n.word("rule", "admit");
  const barAt = n.word("rule", "bar");
  const getInAt = n.word("inside", "get in");
  const correlationAt = n.word("inside", "correlation");
  const minusAt = n.word("inside", "minus");
  const nothingAt = n.word("why-in", "Nothing");
  const weakAt = n.word("why-in", "weak interview");
  const abilityInAt = n.word("why-in", "on ability");
  const customersAt = n.word("why-in", "among our customers");
  const dataAt = n.word("why-in", "got them in");
  const end = n.beat("why-in").to;

  const top = y(TOP);
  const bottom = y(BOTTOM);
  const px = (p: { x0: number; x1: number }, v: number) => p.x0 + ((v - DOM[0]) / (DOM[1] - DOM[0])) * (p.x1 - p.x0);
  const py = (v: number) => bottom - ((v - DOM[0]) / (DOM[1] - DOM[0])) * (bottom - top);
  const pick = ease(frame, barAt + 4, 12);
  const admittedAbility = BERKSON.admitted.map((i) => BERKSON.ability[i]);
  const fx0 = Math.min(...admittedAbility);
  const fx1 = Math.max(...admittedAbility);
  const fitP = ease(frame, correlationAt - 4, 18);
  const [slope, icept] = BERKSON.fitIn;
  // The cut: ability + interview = 112, clipped to the panel.
  const cutPts = (p: { x0: number; x1: number }) => [
    [px(p, BERKSON.bar - DOM[1]), py(DOM[1])],
    [px(p, DOM[1]), py(BERKSON.bar - DOM[1])],
  ] as const;
  const [c0, c1] = cutPts(ALL);
  const [d0, d1] = cutPts(IN);
  const weak = ease(frame, weakAt - 4, 12) * (1 - ease(frame, customersAt - 4, 12) * 0.6);

  const axes = (p: { x0: number; x1: number }, at: number, title: string, color: string, rAt: number, r: React.ReactNode) => (
    <>
      <Svg opacity={ease(frame, at, 14)}>
        <rect x={p.x0} y={top} width={p.x1 - p.x0} height={bottom - top} fill="none" stroke={INK} strokeWidth={1.4} opacity={0.6} />
      </Svg>
      <Ink at={rAt} dur={12} style={{ left: p.x0, top: top - 46, whiteSpace: "nowrap" }}>
        <span style={label(24, color)}>
          {title}: {r}
        </span>
      </Ink>
      <Note at={abilityAt} x={(p.x0 + p.x1) / 2} y={bottom + 14} from="up">
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>ability</span>
      </Note>
      <Note at={abilityAt + 6} x={p.x0 - 14} y={(top + bottom) / 2 - 14} align="right">
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>interview</span>
      </Note>
    </>
  );

  return (
    <AbsoluteFill>
      {/* ── Sound: the applicants, the bar, the admitted crossing over, the line ── */}
      <Sfx name="el-sprinkle" at={populationAt - 6} level={-33} />
      <Sfx name="el-pop" at={admitAt - 6} level={-30} />
      <Sfx name="el-pencil" at={barAt - 6} level={-33} />
      <Sfx name="el-whoosh" at={getInAt - 8} level={-33} />
      <Sfx name="el-pencil" at={correlationAt - 4} level={-34} />
      <Sfx name="el-tap" at={minusAt - 2} level={-29} />

      <Headline
        top={y(150)}
        out={nothingAt - 8}
        parts={[
          { text: "Unrelated,", at: unrelatedAt - 6 },
          { text: "until you select.", at: getInAt - 8, italic: true },
        ]}
      />
      <Headline
        top={y(150)}
        parts={[
          { text: "Ask what got", at: nothingAt - 4 },
          { text: "someone into the data.", at: customersAt - 6, italic: true },
        ]}
      />

      <Drift from={customersAt} to={end + 30} amount={0.02} origin={[870, 580]}>
        <FigLabel n="11" title="Applicants' ability and interview scores" at={from - 4} x={160} y={y(262)} />
        {axes(ALL, populationAt - 6, "Everyone", DATA_INK, unrelatedAt - 4, <>r = {signed(BERKSON.rAll)}</>)}
        {axes(
          IN,
          getInAt - 10,
          "Admitted only",
          STAT_INK,
          getInAt - 4,
          <Count from={BERKSON.rAll} to={BERKSON.rIn} at={minusAt - 6} dur={18} format={(v) => `r = ${signed(v)}`} />,
        )}
        <Spot id="interpreting-results-rope" at={admitAt - 6} left={700} top={y(490)} width={340} height={194} />

        {/* The bar: ability plus interview of 112 or more gets in. */}
        <Dashed x0={c0[0]} y0={c0[1]} x1={c1[0]} y1={c1[1]} at={barAt - 6} dur={16} color={INK} width={2.4} />
        <Dashed x0={d0[0]} y0={d0[1]} x1={d1[0]} y1={d1[1]} at={getInAt - 6} dur={12} color={INK_SOFT} width={1.6} />
        <Note at={barAt} x={c1[0] - 10} y={c1[1] + 18} align="right">
          <span style={{ ...note(20, INK), fontWeight: 600, whiteSpace: "nowrap", background: PAPER, padding: "0 4px" }}>sum ≥ {BERKSON.bar}</span>
        </Note>

        {/* Weak interview, strong ability: the corner that remains. */}
        {weak > 0 ? (
          <Svg opacity={weak}>
            <ellipse cx={px(IN, 72)} cy={py(36)} rx={90} ry={52} fill={HIGHLIGHT} opacity={0.6} />
          </Svg>
        ) : null}

        <Svg>
          {BERKSON.ability.map((a, i) => {
            const b = BERKSON.interview[i];
            const appear = ease(frame, populationAt - 6 + (i % 60) * 0.4, 8);
            if (appear <= 0) return null;
            const inside = BERKSON.admittedSet.has(i);
            const order = inside ? BERKSON.admitted.indexOf(i) : 0;
            const fly = inside ? ease(frame, getInAt - 8 + order * 0.25, 18) : 0;
            const x = lerp(px(ALL, a), px(IN, a), fly);
            const yy = py(b) - Math.sin(fly * Math.PI) * 60;
            return (
              <g key={i}>
                {inside && fly > 0 ? <circle cx={px(ALL, a)} cy={py(b)} r={4.2} fill={STAT} opacity={0.35} /> : null}
                <circle
                  cx={x}
                  cy={yy}
                  r={4.6 * appear}
                  fill={inside ? STAT : pick > 0 ? RAW : DOT}
                  opacity={inside ? lerp(0.6, 0.9, pick) : lerp(0.75, 0.5, pick)}
                  stroke={inside && pick > 0 ? PAPER : undefined}
                  strokeWidth={0.8}
                />
              </g>
            );
          })}
          {fitP > 0 ? (
            <line
              x1={px(IN, fx0)}
              y1={py(icept + slope * fx0)}
              x2={px(IN, lerp(fx0, fx1, fitP))}
              y2={py(icept + slope * lerp(fx0, fx1, fitP))}
              stroke={STAT}
              strokeWidth={4}
              strokeLinecap="round"
            />
          ) : null}
        </Svg>
        <Note at={getInAt} x={IN.x1 + 20} y={top + 6}>
          <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            {BERKSON.admitted.length} of {BERKSON.n} get in
          </span>
        </Note>
        <Note at={abilityInAt - 4} x={IN.x1 + 20} y={py(36) - 16}>
          <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>weak interview,</span>
          <div style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>so strong ability</div>
        </Note>
        <Note at={barAt + 8} x={ALL.x0 + 14} y={py(20) - 6}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>turned away</span>
        </Note>
        <Note at={customersAt - 2} x={160} y={bottom + 64}>
          <span style={{ ...body(32, true), color: INK, whiteSpace: "nowrap" }}>
            among our customers, among patients, among people who replied:{" "}
            <Marker at={dataAt - 4}>who got in?</Marker>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
