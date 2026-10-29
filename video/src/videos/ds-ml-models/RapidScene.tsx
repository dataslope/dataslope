import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import {
  ACCENT_INK,
  BAR,
  BLUE_INK,
  HAIRLINE,
  INK,
  INK_SOFT,
  TABULAR,
  label,
  note,
} from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ONEHOT, pct, RFE, SCALING } from "./data";
import {
  Drift,
  Headline,
  Kicker,
  Mark,
  OK,
  OK_INK,
  Spot,
  Svg,
  X0,
} from "./parts";

/** Where the answers go: right of the list. */
const R_X = 800;
const LIST_TOP = 350;
const ROW = 60;

type Ctx = {
  w: (beat: string, phrase: string) => number;
  y: Layout["y"];
  h: Layout["h"];
};

const Line: React.FC<{
  at: number;
  x?: number;
  top: number;
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: number;
}> = ({ at, x = R_X, top, children, size = 25, color = INK, weight = 500 }) => (
  <Note at={at} x={x} y={top}>
    <span
      style={{
        ...note(size, color),
        fontWeight: weight,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  </Note>
);

// ── 12. Generative or discriminative ────────────────────────────────────────
const Gen: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const bayesAt = c.w("r-gen", "then classifies with Bayes' theorem");
  const fewAt = c.w("r-gen", "copes better with few labels");
  return (
    <>
      <Line
        at={c.w("r-gen", "A discriminative model")}
        top={c.y(360)}
        size={28}
        weight={700}
      >
        Discriminative
      </Line>
      <Line
        at={c.w("r-gen", "the probability of the label given the input")}
        top={c.y(404)}
      >
        learns P(label | input)
      </Line>
      <Line
        at={c.w("r-gen", "like logistic regression")}
        top={c.y(442)}
        color={INK_SOFT}
        size={23}
      >
        e.g. logistic regression
      </Line>
      <Line
        at={c.w("r-gen", "A generative model")}
        top={c.y(520)}
        size={28}
        weight={700}
      >
        Generative
      </Line>
      <Line
        at={c.w("r-gen", "how the inputs are spread within each class")}
        top={c.y(564)}
      >
        learns P(input | class)
        <span style={{ opacity: ease(frame, bayesAt, 10) }}>
          , then Bayes&apos; theorem
        </span>
      </Line>
      <Line
        at={c.w("r-gen", "like naive Bayes")}
        top={c.y(602)}
        color={INK_SOFT}
        size={23}
      >
        e.g. naive Bayes
      </Line>
      <Line
        at={c.w("r-gen", "It can generate data")}
        top={c.y(660)}
        color={OK_INK}
      >
        can generate data
        <span style={{ opacity: ease(frame, fewAt, 10) }}>
          , copes better with few labels
        </span>
      </Line>
      <Line at={c.w("r-gen-more", "With plenty of labels")} top={c.y(700)}>
        with plenty of labels, discriminative usually wins
      </Line>
    </>
  );
};

// ── 13. Feature scaling ─────────────────────────────────────────────────────
const Scale13: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const wineAt = c.w("r-scale", "On the wine data");
  const stdAt = c.w("r-scale", "once the features are standardized");
  const treeAt = c.w("r-scale", "A tree scores eighty-nine");
  const bars = [
    { name: "KNN, raw", v: SCALING.knnRaw, at: wineAt + 4, color: ACCENT_INK },
    {
      name: "KNN, standardized",
      v: SCALING.knnScaled,
      at: stdAt,
      color: OK_INK,
    },
    { name: "tree, raw", v: SCALING.treeRaw, at: treeAt, color: BLUE_INK },
    {
      name: "tree, standardized",
      v: SCALING.treeScaled,
      at: treeAt + 6,
      color: BLUE_INK,
    },
  ];
  const W = 620;
  return (
    <>
      <Line at={c.w("r-scale", "Scale features")} top={c.y(360)}>
        needed for distances or gradient descent:
      </Line>
      <Line
        at={c.w("r-scale", "KNN, k-means")}
        top={c.y(400)}
        color={INK_SOFT}
        size={23}
      >
        KNN, k-means, support vector machines, linear models
      </Line>
      <Line at={wineAt} top={c.y(470)} size={21} color={INK_SOFT}>
        wine data, five-fold cross-validation
      </Line>
      {bars.map((b, i) => {
        const p = ease(frame, b.at, 16);
        const top = c.y(512) + i * c.h(58);
        return (
          <React.Fragment key={b.name}>
            <div
              style={{
                position: "absolute",
                left: R_X,
                top: top + c.h(8),
                opacity: p,
                ...note(22, INK),
                whiteSpace: "nowrap",
              }}
            >
              {b.name}
            </div>
            <div
              style={{
                position: "absolute",
                left: R_X + 230,
                top,
                width: W * b.v * p,
                height: c.h(40),
                background:
                  b.color === OK_INK
                    ? OK
                    : b.color === ACCENT_INK
                      ? `color-mix(in srgb, ${ACCENT_INK} 70%, white)`
                      : BAR,
                opacity: 0.85,
                borderRadius: 2,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: R_X + 240 + W * b.v * p,
                top: top + c.h(6),
                opacity: p,
                ...note(23, b.color),
                fontWeight: 700,
                ...TABULAR,
              }}
            >
              {pct(b.v)}
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

// ── 14. Encoding categories ─────────────────────────────────────────────────
const Encode: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const oneHotAt = c.w("r-encode", "One-hot encoding");
  const colW = 160;
  return (
    <>
      <Line at={oneHotAt} top={c.y(352)} size={25} weight={650}>
        one-hot: a column of 0s and 1s per category
      </Line>
      {[
        ["color", ...ONEHOT.columns],
        ...ONEHOT.colors.map((col, i) => [col, ...ONEHOT.rows[i].map(String)]),
      ].map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: R_X,
            top: c.y(404) + i * c.h(36),
            display: "flex",
            opacity: ease(frame, oneHotAt + 4 + i * 3, 10),
            borderBottom: i === 0 ? `1.5px solid ${HAIRLINE}` : undefined,
          }}
        >
          {r.map((cell, j) => (
            <div
              key={j}
              style={{
                width: j ? colW : 110,
                fontFamily: MONO,
                fontSize: i === 0 ? 19 : 20,
                fontWeight: i === 0 || cell === "1" ? 700 : 500,
                color: cell === "1" ? BLUE_INK : i === 0 ? INK : INK_SOFT,
                fontVariantLigatures: "none",
              }}
            >
              {cell}
            </div>
          ))}
        </div>
      ))}
      <Line at={c.w("r-encode", "Ordinal encoding")} top={c.y(610)}>
        ordinal: small, medium, large → 0, 1, 2
      </Line>
      <Line at={c.w("r-encode", "Target encoding")} top={c.y(656)}>
        target: each category → its mean outcome
      </Line>
      <Line
        at={c.w("r-encode", "which leaks")}
        top={c.y(696)}
        color={ACCENT_INK}
        size={23}
      >
        leaks, unless computed inside cross-validation
      </Line>
    </>
  );
};

// ── 15. Feature selection ───────────────────────────────────────────────────
const Select: React.FC<{ c: Ctx }> = ({ c }) => {
  const kinds = [
    {
      name: "Filter",
      text: "scores each feature on its own",
      at: c.w("r-select", "Filters score each feature"),
    },
    {
      name: "Wrapper",
      text: "tries subsets with a model: RFE",
      at: c.w("r-select", "Wrappers, like recursive feature elimination"),
    },
    {
      name: "Embedded",
      text: "selects while training: the lasso",
      at: c.w("r-select", "Embedded methods select while training"),
    },
  ];
  const keepsAt = c.w("r-select-rfe", "Asked for five");
  return (
    <>
      {kinds.map((k, i) => (
        <Note key={k.name} at={k.at} x={R_X} y={c.y(360) + i * c.h(52)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <b style={{ display: "inline-block", width: 150 }}>{k.name}</b>
            {k.text}
          </span>
        </Note>
      ))}
      <Line at={keepsAt} top={c.y(540)} weight={650}>
        RFE (recursive feature elimination), asked for {RFE.names.length} of{" "}
        {RFE.of}, keeps:
      </Line>
      {RFE.names.map((name, i) => (
        <Note
          key={name}
          at={keepsAt + 4 + i * 3}
          x={R_X + 20 + (i % 2) * 330}
          y={c.y(590) + Math.floor(i / 2) * c.h(40)}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 21,
              fontWeight: 600,
              color: BLUE_INK,
              whiteSpace: "nowrap",
              fontVariantLigatures: "none",
            }}
          >
            {name}
          </span>
        </Note>
      ))}
    </>
  );
};

/**
 * Questions 12 to 15 as a rapid-fire list down the left, each answer on the
 * right while it is current: two kinds of model, a scaling result on the wine
 * data, the page's one-hot colors, and the three kinds of feature selection.
 * Then the bridge: the three parts every model here is built from, and the
 * next video.
 */
export const RapidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const fourAt = n.word("rapid-in", "The last four are quicker");
  const inputsAt = n.word("rapid-in", "about the inputs");
  const nextFrom = n.beat("next").from;
  const lineAt = n.word("next", "a line");
  const cutAt = n.word("next", "a cut");
  const distAt = n.word("next", "a distance");
  const learnsAt = n.word("next", "A neural network learns its own");
  const nextAt = n.word("next", "Next: deep learning");
  const end = n.beat("next").to;

  const items: RapidItem[] = [
    {
      n: 12,
      label: "Generative or discriminative",
      at: n.beat("r-gen").from,
      body: <Gen c={c} />,
    },
    {
      n: 13,
      label: "Feature scaling",
      at: n.beat("r-scale").from,
      body: <Scale13 c={c} />,
    },
    {
      n: 14,
      label: "Encoding categories",
      at: n.beat("r-encode").from,
      body: <Encode c={c} />,
    },
    {
      n: 15,
      label: "Feature selection",
      at: n.beat("r-select").from,
      body: <Select c={c} />,
    },
  ];

  // The bridge's three parts, drawn as they are named.
  const gx = R_X;
  const gy = y(740);
  const draw = (at: number) => ease(frame, at, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={fourAt} level={-36} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-35} />
      ))}
      <Sfx name="el-pencil" at={lineAt} level={-36} />
      <Sfx name="el-chime" at={nextAt} level={-35} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Questions 12 to 15</Kicker>
        <Headline
          lead="Four more,"
          turn="mostly about the inputs."
          at={fourAt - 4}
          turnAt={inputsAt - 4}
          size={64}
        />
        <Spot
          id="da-sql-stopwatch"
          video="da-sql"
          at={from + 6}
          left={1640}
          top={y(112)}
          width={130}
          height={140}
        />

        <RapidFire
          items={items}
          x={X0}
          top={y(LIST_TOP)}
          rowH={h(ROW)}
          width={560}
          at={fourAt}
          end={nextFrom}
        />

        {/* ── The bridge: a line, a cut, a distance ── */}
        <Svg>
          {draw(lineAt) > 0 ? (
            <line
              x1={gx}
              y1={gy + 40}
              x2={gx + 120 * draw(lineAt)}
              y2={gy + 40 - 50 * draw(lineAt)}
              stroke={BAR}
              strokeWidth={4}
              strokeLinecap="round"
            />
          ) : null}
          <path
            d={`M${gx + 200},${gy + 40} L${gx + 240},${gy + 40} L${gx + 240},${gy} L${gx + 300},${gy} L${gx + 300},${gy - 16} L${gx + 330},${gy - 16}`}
            fill="none"
            stroke={BAR}
            strokeWidth={4}
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={`${draw(cutAt)} 1`}
          />
          <circle
            cx={gx + 450}
            cy={gy + 14}
            r={34 * draw(distAt)}
            fill="none"
            stroke={BAR}
            strokeWidth={3}
            strokeDasharray="5 6"
          />
          <circle cx={gx + 450} cy={gy + 14} r={6 * draw(distAt)} fill={INK} />
          <line
            x1={gx + 450}
            y1={gy + 14}
            x2={gx + 450 + 34 * draw(distAt + 6)}
            y2={gy + 14}
            stroke={INK}
            strokeWidth={2}
          />
        </Svg>
        <Note at={nextFrom} x={gx} y={gy - h(70)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
            every model here, built from parts you can point to
          </span>
        </Note>
        <Note at={learnsAt} x={gx + 560} y={gy - h(4)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            <Mark at={learnsAt + 4}>a neural network learns its own</Mark>
          </span>
        </Note>
        <NextLine at={nextAt} x={X0} y={y(818)} width={900}>
          deep learning
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
