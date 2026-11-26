import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, note, TABULAR } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SVM } from "./data";
import { ACCENT_INK, at, type Box, CLASS, Contours, DATA, DATA_FILL, Dots, Drift, Fade, int, Line, Mark, OK_INK, PanelTitle, POINT, Q_SIZE, Regions, scales, Svg, X0 } from "./parts";

const SIDE = 440;

/** A share drawn as a bar: the whole (rows) as a pale track, the part
 *  (support vectors) filled over it, each label on its own line above. */
const ShareBar: React.FC<{ x: number; y: number; w: number; part: number; whole: number; at: number; name: React.ReactNode; value: React.ReactNode; lit?: number }> = ({
  x,
  y,
  w,
  part,
  whole,
  at: from,
  name,
  value,
  lit,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 18);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: Math.min(1, p * 2) }}>
      <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>{name}</div>
      <div style={{ position: "relative", height: 26, marginTop: 12, width: w }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: w * p, height: 26, background: DATA_FILL, borderRadius: 4 }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: w * (part / whole) * p, height: 26, background: DATA, borderRadius: 4 }} />
        <div style={{ position: "absolute", left: w + 18, top: 13, transform: "translateY(-50%)", ...note(24, INK), ...TABULAR, whiteSpace: "nowrap" }}>
          {lit !== undefined ? <Mark at={lit}>{value}</Mark> : value}
        </div>
      </div>
    </div>
  );
};

/**
 * Question 8, on two noisy rings: the RBF kernel's boundary with its support
 * vectors ringed, then a straight boundary beside it, each scored on the
 * held-out half. Then the follow-up, cost: support vectors against rows,
 * and how the fit time grew each time the rows doubled.
 */
export const SvmScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("svm").from;
  const qAt = n.word("svm", "Question eight");
  const textAt = n.word("svm", "How does a support vector machine");
  const widestAt = n.word("svm", "the boundary with the widest margin");
  const marginAt = n.word("svm", "widest margin");
  const onAt = n.word("svm", "The points on or inside the margin");
  const svAt = n.word("svm", "are the support vectors");
  const aloneAt = n.word("svm", "they alone fix it");
  const kernelAt = n.word("svm-kernel", "The kernel trick bends that boundary");
  const withoutAt = n.word("svm-kernel", "without building new features");
  const ringsAt = n.word("svm-kernel", "On two noisy rings");
  const straightAt = n.word("svm-kernel", "a straight boundary scores fifty-four percent");
  const rbfAt = n.word("svm-kernel", "a radial basis function kernel");
  const costFrom = n.beat("svm-cost").from;
  const overlapAt = n.word("svm-cost", "Where classes overlap");
  const manyAt = n.word("svm-cost", "many rows become support vectors");
  const fiveAt = n.word("svm-cost", "five thousand three hundred of twenty thousand");
  const checksAt = n.word("svm-cost", "every prediction checks them all");
  const doublingAt = n.word("svm-cost", "Doubling the rows");
  const tripledAt = n.word("svm-cost", "more than tripled the fit time");
  const measuredAt = n.word("svm-cost", "measured once");
  const end = n.beat("scale-in").to;

  const top = y(400);
  const panels = [
    // The first panel is named for its kernel only once the kernel is.
    { key: "rbf", left: X0 + 40, grid: SVM.gridRbf, f: SVM.decisionRbf, title: "Radial basis function kernel", at: from + 8, titleAt: kernelAt - 2, score: SVM.rbf, scoreAt: rbfAt, ink: OK_INK },
    { key: "lin", left: X0 + 40 + SIDE + 110, grid: SVM.gridLinear, f: SVM.decisionLinear, title: "Straight boundary", at: straightAt - 4, titleAt: straightAt - 4, score: SVM.linear, scoreAt: straightAt + 10, ink: ACCENT_INK },
  ];
  const sv = new Set(SVM.support);
  const R = 1290;
  /** The middle column, where the straight boundary later goes. */
  const M = panels[1].left;
  const out = costFrom - 6;
  const svs = [
    { rows: 200, k: "200" as const },
    { rows: 2000, k: "2000" as const },
    { rows: 20000, k: "20000" as const },
  ];
  const fits = [
    { rows: 4000, k: "4000" as const, ratio: null as number | null },
    { rows: 8000, k: "8000" as const, ratio: SVM.doubling[0] },
    { rows: 16000, k: "16000" as const, ratio: SVM.doubling[1] },
  ];
  const fitMax = SVM.fitSeconds["16000"];

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={from + 10} level={-35} />
      <Sfx name="el-pencil" at={widestAt} level={-35} />
      <Sfx name="el-sprinkle" at={svAt} level={-33} />
      <Sfx name="el-whoosh" at={straightAt - 4} level={-36} />
      <Sfx name="el-pop" at={straightAt + 10} level={-32} />
      <Sfx name="el-pop" at={rbfAt} level={-32} />
      {svs.map((s, i) => (
        <Sfx key={s.k} name="el-tap" at={manyAt + i * 6} level={-32} />
      ))}
      {fits.map((f, i) => (
        <Sfx key={f.k} name="el-tap" at={doublingAt + i * 8} level={-32} />
      ))}

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          How does a support vector machine (SVM) work?
        </QuestionCard>

        <Fade at={from} out={out}>
          <Line at={widestAt - 2} x={X0} y={y(300)} size={28}>
            The boundary with the widest margin between the classes
          </Line>
          {panels.map((p) => {
            const box: Box = { left: p.left, top, width: SIDE, height: h(SIDE / 1.14) };
            const { x: sx, y: sy } = scales(box, SVM.range, SVM.range);
            const dots = SVM.x.map((v, i) => ({ x: at(sx, v), y: at(sy, SVM.y[i]), at: p.at + 4 + (i / SVM.x.length) * 16, color: CLASS[SVM.label[i]] }));
            return (
              <React.Fragment key={p.key}>
                <PanelTitle x={box.left} y={box.top - h(46)} at={p.titleAt}>
                  {p.title}
                </PanelTitle>
                <Regions grid={p.grid} box={box} at={p.key === "rbf" ? widestAt : p.at + 4} dur={20} />
                {/* The boundary is the decision function's zero contour, drawn
                    smooth; the margin its contours at −1 and +1, dashed. */}
                <Contours
                  f={p.f}
                  box={box}
                  lines={
                    p.key === "rbf"
                      ? [
                          { level: 0, color: INK, width: 2.6, at: widestAt },
                          { level: -1, color: INK, width: 2, dash: "7 7", at: marginAt + 6 },
                          { level: 1, color: INK, width: 2, dash: "7 7", at: marginAt + 6 },
                        ]
                      : [{ level: 0, color: INK, width: 2.6, at: p.at + 4 }]
                  }
                />
                <Dots dots={dots} r={4} opacity={0.85} />
                {p.key === "rbf" ? (
                  <Svg opacity={ease(frame, svAt - 2, 12)}>
                    {SVM.x.map((v, i) =>
                      sv.has(i) ? <circle key={i} cx={at(sx, v)} cy={at(sy, SVM.y[i])} r={7.5} fill="none" stroke={POINT} strokeWidth={2.2} /> : null,
                    )}
                  </Svg>
                ) : null}
                <Line at={p.scoreAt - 2} x={box.left} y={box.top + box.height + h(18)} size={28} color={p.ink}>
                  {Math.round(p.score * 100)}% <span style={{ color: INK_SOFT }}>held out</span>
                </Line>
              </React.Fragment>
            );
          })}
          <Line at={svAt - 2} x={M} y={top + h(40)} size={28} out={straightAt - 8}>
            <Mark at={svAt}>Support vectors</Mark>
          </Line>
          <Line at={onAt} x={M} y={top + h(92)} size={26} color={INK_SOFT} out={straightAt - 8}>
            On or inside the margin, dashed
          </Line>
          <Line at={aloneAt - 2} x={M} y={top + h(140)} size={26} out={straightAt - 8}>
            They alone fix the boundary
          </Line>
          <Line at={kernelAt - 2} x={R} y={top + h(40)} size={26}>
            The kernel trick bends the boundary
          </Line>
          <Line at={withoutAt - 2} x={R} y={top + h(86)} size={24} color={INK_SOFT}>
            without building new features
          </Line>
          <Line at={ringsAt - 2} x={R} y={top + h(170)} size={24} color={INK_SOFT}>
            Two noisy rings, half held out
          </Line>
        </Fade>

        {/* ── The follow-up: cost ── */}
        <Fade at={costFrom - 4}>
          <Line at={overlapAt} x={X0} y={y(330)} size={26}>
            Support vectors, as a share of the rows
          </Line>
          {svs.map((s, i) => (
            <ShareBar
              key={s.k}
              x={X0}
              y={y(400) + i * h(100)}
              w={460}
              part={SVM.supportVectors[s.k]}
              whole={s.rows}
              at={manyAt + i * 6}
              name={`${int(s.rows)} rows`}
              value={int(SVM.supportVectors[s.k])}
              lit={i === 2 ? fiveAt : undefined}
            />
          ))}
          <Line at={checksAt - 2} x={X0} y={y(720)} size={26} color={ACCENT_INK}>
            Every prediction checks them all
          </Line>

          <Line at={doublingAt - 2} x={1000} y={y(330)} size={26}>
            Fit time as the rows double
          </Line>
          {fits.map((f, i) => (
            <div key={f.k}>
              <FitBar x={1000} y={y(400) + i * h(100)} w={560} frac={SVM.fitSeconds[f.k] / fitMax} at={doublingAt + i * 8} name={`${int(f.rows)} rows`} ratio={f.ratio} ratioAt={tripledAt} />
            </div>
          ))}
          <Line at={measuredAt - 2} x={1000} y={y(720)} size={22} color={INK_SOFT}>
            Measured once, in the browser&apos;s Python
          </Line>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};

/** A fit time as a bar, with the growth over the bar above it. */
const FitBar: React.FC<{ x: number; y: number; w: number; frac: number; at: number; name: string; ratio: number | null; ratioAt: number }> = ({
  x,
  y,
  w,
  frac,
  at: from,
  name,
  ratio,
  ratioAt,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 18);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: Math.min(1, p * 2) }}>
      <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>{name}</div>
      <div style={{ position: "relative", height: 26, marginTop: 12 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: Math.max(3, w * frac * p), height: 26, background: DATA, borderRadius: 4 }} />
        {ratio !== null ? (
          <div
            style={{
              position: "absolute",
              left: Math.max(3, w * frac) + 18,
              top: 13,
              transform: "translateY(-50%)",
              ...note(24, ACCENT_INK),
              ...TABULAR,
              whiteSpace: "nowrap",
              opacity: ease(frame, ratioAt, 10),
            }}
          >
            × {ratio.toFixed(1)}
          </div>
        ) : null}
      </div>
    </div>
  );
};
