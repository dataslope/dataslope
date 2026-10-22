import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, fmt, label, note } from "../../editorial/style";
import { Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CURSE, PCA, pct } from "./data";
import { at, Axes, type Box, C0, CLASS, Curve, Drift, Frame, Mark, OK_INK, Points, type Scale, scales, Svg, X0 } from "./parts";

const SCREE = { left: X0 + 20, width: 620, top: 380, height: 400 };
const PROJ = { left: 900, width: 860, top: 340, height: 480 };
const PX: [number, number] = [-3.3, 3.8];
const PY: [number, number] = [-3.1, 3.1];
const SPECIES = ["setosa", "versicolor", "virginica"];
const CURVE_BOX = { left: 240, width: 860, top: 360, height: 430 };
const COL = 1220;

/**
 * Questions 9 and 10. The page's scaled iris: its four components' shares of
 * the variance as bars, the first two adding to 96%, and the flowers
 * projected onto those two, the species separating once their inks come in.
 * Then the curse: the nearest neighbor's distance over the farthest one's,
 * from 0.017 in two dimensions to 0.89 in a thousand.
 */
export const PcaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("pca").from;
  const qAt = n.word("pca", "Question nine");
  const textAt = n.word("pca", "What is P C A");
  const asked = n.word("pca", "Principal component analysis finds");
  const mostAt = n.word("pca", "varies most");
  const rightAt = n.word("pca", "at right angles");
  const projectAt = n.word("pca", "projects the data");
  const irisAt = n.word("pca", "the four iris measurements");
  const oneAt = n.word("pca", "one component holds");
  const twoAt = n.word("pca", "two hold ninety-six");
  const fourAt = n.word("pca", "Four columns become two");
  const separateAt = n.word("pca", "the species still separate");
  const centeredAt = n.word("pca", "It needs centered data");
  const straightAt = n.word("pca", "straight-line structure");
  const q10At = n.word("curse", "Question ten");
  const q10TextAt = n.word("curse", "What is the curse of dimensionality");
  const emptyAt = n.word("curse", "space empties out");
  const scatterAt = n.word("curse", "Scatter a thousand random points");
  const twoDAt = n.word("curse", "In two dimensions");
  const sixtyAt = n.word("curse", "about sixty times closer");
  const thousandAt = n.word("curse", "In a thousand dimensions");
  const almostAt = n.word("curse", "almost as far as the farthest");
  const apartAt = n.word("curse", "Distances stop telling points apart");
  const sufferAt = n.word("curse", "suffer first");
  const fixesAt = n.word("curse", "The fixes");
  const regAt = n.word("curse", "and regularization");
  const lastAt = n.word("shap-in", "The last deep dive");
  const end = n.beat("shap-in").to;
  const out9 = q10At - 4;

  // ── 9: the scree bars ──
  const sb = { left: SCREE.left, top: y(SCREE.top), width: SCREE.width, height: h(SCREE.height) };
  const bw = 110;
  const barX = (i: number) => sb.left + 40 + i * 150;
  const barY: Scale = { lo: 0, hi: 1, a: sb.top + sb.height, b: sb.top };
  const barAt = [oneAt, twoAt, twoAt + 6, twoAt + 10];
  const cum2 = PCA.cumulative[1];

  // ── 9: the projection ──
  const pb: Box = { left: PROJ.left, top: y(PROJ.top), width: PROJ.width, height: h(PROJ.height) };
  const { x: px, y: py } = scales(pb, PX, PY);
  const ox = at(px, 0);
  const oy = at(py, 0);

  // ── 10: nearest over farthest ──
  const cb: Box = { left: CURVE_BOX.left, top: y(CURVE_BOX.top), width: CURVE_BOX.width, height: h(CURVE_BOX.height) };
  const lx: Scale = { lo: 0, hi: 3, a: cb.left, b: cb.left + cb.width };
  const ly: Scale = { lo: 0, hi: 1, a: cb.top + cb.height, b: cb.top };
  const ratio = CURSE.ratio.map(([d, r]) => [Math.log10(d), r] as const);
  const r2 = CURSE.ratio.find(([d]) => d === 2)?.[1] ?? 0;
  const r1000 = CURSE.ratio.find(([d]) => d === 1000)?.[1] ?? 0;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={asked} level={-36} />
      <Sfx name="el-pencil" at={mostAt} level={-35} />
      <Sfx name="el-pop" at={oneAt + 2} level={-33} />
      <Sfx name="el-pop" at={twoAt + 2} level={-34} />
      <Sfx name="el-chime" at={separateAt} level={-36} />
      <Sfx name="el-tap" at={twoDAt + 2} level={-34} />
      <Sfx name="el-whoosh" at={thousandAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} out={out9} size={60}>
          What is PCA?
        </QuestionCard>
        <QuestionCard n={10} at={q10At} textAt={q10TextAt - 2} size={60}>
          What is the curse of dimensionality?
        </QuestionCard>

        {/* ── 9: the projection ── */}
        <Frame box={pb} at={asked - 4} out={out9} />
        <Points xs={PCA.x} ys={PCA.y} sx={px} sy={py} at={projectAt} spread={14} r={5.5} color={INK_SOFT} opacity={0.6} out={out9} />
        <Points xs={PCA.x} ys={PCA.y} labels={PCA.species} sx={px} sy={py} at={separateAt - 2} spread={10} r={5.5} out={out9} />
        <Svg opacity={1 - ease(frame, out9, 10)}>
          <line x1={pb.left + 20} x2={pb.left + 20 + (pb.width - 40) * ease(frame, mostAt, 18)} y1={oy} y2={oy} stroke={INK} strokeWidth={2.2} />
          <line x1={ox} x2={ox} y1={pb.top + pb.height - 20} y2={pb.top + pb.height - 20 - (pb.height - 40) * ease(frame, rightAt, 18)} stroke={INK} strokeWidth={2.2} />
        </Svg>
        <Note at={mostAt + 6} x={pb.left + pb.width - 20} y={oy + h(8)} align="right" from="right" out={out9}>
          <span style={{ ...label(20, INK), fontWeight: 650, whiteSpace: "nowrap", background: PAPER, padding: "0 4px" }}>component 1: most variance</span>
        </Note>
        <Note at={rightAt + 6} x={ox + 12} y={pb.top + h(10)} out={out9}>
          <span style={{ ...label(20, INK), fontWeight: 650, whiteSpace: "nowrap", background: PAPER, padding: "0 4px" }}>component 2: at right angles</span>
        </Note>
        <Note at={separateAt} x={pb.left + 16} y={pb.top + pb.height - h(40)} out={out9}>
          <span style={{ ...label(20, INK), whiteSpace: "nowrap", display: "flex", gap: 18, alignItems: "center", background: PAPER, padding: "0 6px" }}>
            {SPECIES.map((s, i) => (
              <span key={s} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <svg width={14} height={14}>
                  <circle cx={7} cy={7} r={6} fill={CLASS[i]} />
                </svg>
                {s}
              </span>
            ))}
          </span>
        </Note>

        {/* ── 9: the scree ── */}
        <Note at={irisAt} x={sb.left} y={sb.top - h(54)} out={out9}>
          <span style={{ ...label(22, INK), fontWeight: 650, whiteSpace: "nowrap" }}>4 iris measurements, scaled: share of variance</span>
        </Note>
        <Svg opacity={(1 - ease(frame, out9, 10)) * ease(frame, irisAt, 10)}>
          <line x1={sb.left} x2={sb.left + sb.width} y1={sb.top + sb.height} y2={sb.top + sb.height} stroke={INK} strokeWidth={1.6} />
        </Svg>
        {PCA.ratio.map((r, i) => {
          const p = ease(frame, barAt[i], 16) * (1 - ease(frame, out9, 10));
          const top = at(barY, r * p);
          return (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: barX(i), top, width: bw, height: at(barY, 0) - top, background: C0, opacity: i < 2 ? 0.9 : 0.5, borderRadius: 2 }} />
              <div style={{ position: "absolute", left: barX(i) - 20, width: bw + 40, textAlign: "center", top: top - h(36), opacity: p, ...note(24, BLUE_INK), fontWeight: 700, ...TABULAR }}>
                {pct(r)}
              </div>
              <div style={{ position: "absolute", left: barX(i), width: bw, textAlign: "center", top: at(barY, 0) + 8, opacity: ease(frame, irisAt, 10) * (1 - ease(frame, out9, 10)), ...label(19, INK_SOFT), ...TABULAR }}>
                {i + 1}
              </div>
            </React.Fragment>
          );
        })}
        <Svg opacity={ease(frame, twoAt + 4, 12) * (1 - ease(frame, out9, 10))}>
          <path
            d={`M${barX(0)},${at(barY, PCA.ratio[0]) - h(52)} L${barX(0)},${at(barY, PCA.ratio[0]) - h(62)} L${barX(1) + bw},${at(barY, PCA.ratio[0]) - h(62)} L${barX(1) + bw},${at(barY, PCA.ratio[0]) - h(52)}`}
            fill="none"
            stroke={OK_INK}
            strokeWidth={2.2}
          />
        </Svg>
        <Note at={twoAt + 6} x={barX(0)} y={at(barY, PCA.ratio[0]) - h(104)} out={out9}>
          <span style={{ ...note(25, OK_INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>{pct(cum2)} in two</span>
        </Note>
        <Note at={fourAt} x={barX(2) - 10} y={at(barY, PCA.ratio[0]) - h(20)} out={out9}>
          <span style={{ ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={fourAt + 2}>4 columns → 2</Mark>
          </span>
        </Note>
        <Note at={centeredAt} x={sb.left} y={sb.top + sb.height + h(44)} out={out9}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            needs centered data<span style={{ opacity: ease(frame, straightAt, 10) }}>, finds only straight-line structure</span>
          </span>
        </Note>

        {/* ── 10: nearest over farthest ── */}
        <Axes
          x={lx}
          y={ly}
          xTicks={[0, 1, 2, 3]}
          xFormat={(v) => (10 ** v).toLocaleString("en-US")}
          yTicks={[0, 0.5, 1]}
          yFormat={(v) => String(v)}
          xTitle="dimensions"
          yTitle="nearest neighbor's distance ÷ farthest's"
          at={emptyAt}
        />
        <Note at={scatterAt} x={cb.left + 20} y={cb.top + h(4)}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>{CURSE.points.toLocaleString("en-US")} random points, uniform in a cube</span>
        </Note>
        <Curve points={ratio.filter(([d]) => d <= Math.log10(2))} x={lx} y={ly} at={twoDAt} dur={12} color={C0} width={3.4} />
        <Curve points={ratio.filter(([d]) => d >= Math.log10(2) - 0.001)} x={lx} y={ly} at={thousandAt} dur={30} color={C0} width={3.4} />
        <Svg>
          <circle cx={at(lx, Math.log10(2))} cy={at(ly, r2)} r={8 * ease(frame, twoDAt + 6, 10)} fill={C0} />
          <circle cx={at(lx, 3)} cy={at(ly, r1000)} r={9 * ease(frame, almostAt, 10)} fill={ACCENT_INK} />
        </Svg>
        <Leader points={[[cb.left + 70, at(ly, 0.52)], [at(lx, Math.log10(2)), at(ly, r2) - 10]]} at={sixtyAt + 4} color={BLUE_INK} dot={false} />
        <Note at={sixtyAt} x={cb.left + 30} y={at(ly, 0.62)}>
          <span style={{ ...note(24, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
            2 dimensions: {fmt(r2, 3)}, about 1/{Math.round(1 / r2 / 10) * 10}
          </span>
        </Note>
        <Leader points={[[at(lx, 2.85), at(ly, 0.6)], [at(lx, 3) - 6, at(ly, r1000) + 10]]} at={almostAt + 4} color={ACCENT_INK} dot={false} />
        <Note at={almostAt} x={at(lx, 3) - 16} y={at(ly, 0.6)} align="right" from="right">
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>1,000 dimensions: {fmt(r1000, 2)}</span>
        </Note>

        <Note at={apartAt} x={COL} y={y(380)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>distances stop telling points apart</span>
        </Note>
        <Note at={sufferAt} x={COL} y={y(430)}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>KNN and k-means suffer first</span>
        </Note>
        <Note at={fixesAt} x={COL} y={y(530)}>
          <span style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>the fixes:</span>
        </Note>
        <Note at={fixesAt + 6} x={COL} y={y(576)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>fewer dimensions: PCA, feature selection</span>
        </Note>
        <Note at={regAt} x={COL} y={y(616)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mark at={lastAt}>regularization</Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
