import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Edge, OK, OK_INK, Pill, TaskBox, X0 } from "./parts";

const LEFT = X0;
const RIGHT_X = 1000;
const ROW_Y = 474;

/**
 * Question 2. The same three steps drawn both ways, as the page puts them:
 * Airflow's tasks (what to run), wired by hand with load(transform(extract())),
 * the call the Pipelines page shows; Dagster's assets (what data exists),
 * whose edges are worked out from what each one reads. Then what the asset
 * model makes first-class: lineage and freshness, and stronger typing and
 * testing primitives.
 */
export const DagsterScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("dagster").from;
  const qAt = n.word("dagster", "Question two");
  const textAt = n.word("dagster", "How does Dagster model");
  const airAt = n.word("dagster", "Airflow is task-centric");
  const stepsAt = n.word("dagster", "you write the steps to run");
  const wireAt = n.word("dagster", "wire them in order");
  const dagAt = n.word("dagster", "Dagster is asset-centric");
  const declareAt = n.word("dagster", "you declare the data each function produces");
  const fileAt = n.word("dagster", "a table or a file");
  const readsAt = n.word("dagster", "from what each one reads");
  const linAt = n.word("dagster-why", "lineage");
  const freshAt = n.word("dagster-why", "freshness come built in");
  const knowsAt = n.word("dagster-why", "every asset knows what produced it");
  const whenAt = n.word("dagster-why", "and when");
  const typingAt = n.word("dagster-why", "stronger typing");
  const testingAt = n.word("dagster-why", "testing primitives");
  const end = n.beat("dagster-why").to;

  const cy = y(ROW_Y);
  const taskH = h(58);
  const assetH = h(78);
  const TASKS = [
    { name: "extract", cx: LEFT + 110 },
    { name: "transform", cx: LEFT + 380 },
    { name: "load", cx: LEFT + 650 },
  ];
  const ASSETS = [
    { name: "raw_orders", cx: RIGHT_X + 120, reads: "" },
    { name: "clean_orders", cx: RIGHT_X + 405, reads: "raw_orders" },
    { name: "daily_revenue", cx: RIGHT_X + 690, reads: "clean_orders" },
  ];
  const assetW = 236;
  
  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={wireAt} level={-36} />
      {ASSETS.map((a, i) => (
        <Sfx key={a.name} name="el-tap" at={declareAt + 4 + i * 5} level={-37} />
      ))}
      <Sfx name="el-pencil" at={readsAt + 10} level={-36} />
      <Sfx name="el-pop" at={linAt + 2} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={56}>
          How does Dagster model pipelines differently from Airflow?
        </QuestionCard>

        {/* Airflow: tasks, wired by hand. */}
        <Note at={airAt} x={LEFT} y={y(286)}>
          <span style={{ ...note(30, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            Airflow <span style={{ color: INK_SOFT, fontWeight: 500 }}>· task-centric</span>
          </span>
        </Note>
        <Note at={airAt + 8} x={LEFT} y={y(334)}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>what to run, and when</span>
        </Note>
        {TASKS.map((t, i) => (
          <TaskBox key={t.name} cx={t.cx} cy={cy} w={200} h={taskH} at={stepsAt + i * 4} size={25}>
            {t.name}
          </TaskBox>
        ))}
        {TASKS.slice(1).map((t, i) => (
          <Edge
            key={t.name}
            points={[
              [TASKS[i].cx + 102, cy],
              [t.cx - 104, cy],
            ]}
            at={wireAt + i * 5}
            dur={10}
          />
        ))}
        <Note at={wireAt + 8} x={LEFT} y={cy + h(62)}>
          <span style={{ fontFamily: MONO, fontSize: 25, fontWeight: 600, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>
            load(transform(extract()))
          </span>
        </Note>
        <Note at={wireAt + 16} x={LEFT} y={cy + h(112)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>the order, written by hand</span>
        </Note>

        {/* Dagster: assets, the graph worked out from what each reads. */}
        <Note at={dagAt} x={RIGHT_X} y={y(286)}>
          <span style={{ ...note(30, INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            Dagster <span style={{ color: INK_SOFT, fontWeight: 500 }}>· asset-centric</span>
          </span>
        </Note>
        <Note at={dagAt + 8} x={RIGHT_X} y={y(334)}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>what data exists, and how it was made</span>
        </Note>
        {ASSETS.map((a, i) => (
          <TaskBox
            key={a.name}
            cx={a.cx}
            cy={cy}
            w={assetW}
            h={assetH}
            at={declareAt + 4 + i * 5}
            shape="asset"
            mono
            size={23}
            tones={[
              { at: declareAt + 4 + i * 5, tone: "data" },
              { at: linAt + (2 - i) * 5, tone: "lit" },
              { at: freshAt + 10, tone: "data" },
            ]}
          >
            {a.name}
          </TaskBox>
        ))}
        <Note at={fileAt} x={RIGHT_X} y={cy - assetH / 2 - h(46)}>
          <span style={{ ...label(20, BLUE_INK), whiteSpace: "nowrap" }}>each one a table or a file</span>
        </Note>
        {ASSETS.map((a) =>
          a.reads ? (
            <div
              key={a.name}
              style={{
                position: "absolute",
                left: a.cx - assetW / 2,
                width: assetW,
                top: cy + assetH / 2 + h(12),
                textAlign: "center",
                ...label(20, INK_SOFT),
                whiteSpace: "nowrap",
                opacity: ease(frame, readsAt, 10),
              }}
            >
              reads <QMono>{a.reads}</QMono>
            </div>
          ) : null,
        )}
        {ASSETS.slice(1).map((a, i) => (
          <React.Fragment key={a.name}>
            <Edge
              points={[
                [ASSETS[i].cx + assetW / 2 + 2, cy],
                [a.cx - assetW / 2 - 3, cy],
              ]}
              at={readsAt + 6 + i * 4}
              dur={10}
              color={BAR}
              dash="6 5"
              out={readsAt + 22}
            />
            <Edge
              points={[
                [ASSETS[i].cx + assetW / 2 + 2, cy],
                [a.cx - assetW / 2 - 3, cy],
              ]}
              at={readsAt + 18 + i * 2}
              dur={6}
              color={BAR}
            />
          </React.Fragment>
        ))}
        <Note at={readsAt + 16} x={RIGHT_X} y={cy + h(96)}>
          <span style={{ ...label(21, BLUE_INK), whiteSpace: "nowrap" }}>the order, worked out from the data</span>
        </Note>

        {/* What the asset model gives you for free: each asset fresh, and when. */}
        {ASSETS.map((a, i) => {
          const p = ease(frame, freshAt + 4 + i * 3, 10);
          return (
            <div
              key={a.name}
              style={{
                position: "absolute",
                left: a.cx + assetW / 2 - 16,
                top: cy - assetH / 2 - 10,
                width: 26,
                height: 26,
                borderRadius: 13,
                background: OK,
                border: `3px solid ${PAPER}`,
                transform: `scale(${p})`,
              }}
            />
          );
        })}
        <Pill x={RIGHT_X} y={y(660)} at={linAt} ink={OK_INK} size={23}>
          lineage, built in
        </Pill>
        <Pill x={RIGHT_X + 260} y={y(660)} at={freshAt + 6} ink={OK_INK} size={23}>
          freshness, built in
        </Pill>
        <Note at={knowsAt} x={RIGHT_X} y={y(728)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            every asset knows what produced it<span style={{ opacity: ease(frame, whenAt, 10) }}>, and when</span>
          </span>
        </Note>
        <Pill x={RIGHT_X} y={y(790)} at={typingAt} ink={BLUE_INK} size={22}>
          stronger typing
        </Pill>
        <Pill x={RIGHT_X + 236} y={y(790)} at={testingAt - 4} ink={BLUE_INK} size={22}>
          testing primitives
        </Pill>
      </Drift>
    </AbsoluteFill>
  );
};
