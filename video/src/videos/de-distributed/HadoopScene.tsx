import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { Arrow, Chip, Disk, Drift, Elbow, Machine, OK, OK_INK } from "./parts";

const BOX_X = [300, 610, 920, 1230];
const BOX_W = 170;
const BOX_H = 70;
const STEPS = ["map", "reduce", "map", "reduce"];
const H_TOP = 360;
const S_TOP = 616;
const DISK_W = 56;
const NOTE_X = 1560;

/**
 * Question 2. The same four steps in two lanes. Hadoop MapReduce writes to
 * disk and reads it back between every step; Spark passes results on in
 * memory, with a dashed disk for the spill under pressure, and an iteration
 * loop over its lane for the work that gains most. Then what else Spark
 * adds: DataFrames, SQL, streaming, whole-query optimization.
 */
export const HadoopScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hadoop").from;
  const qAt = n.word("hadoop", "Question two");
  const textAt = n.word("hadoop", "How is Spark different");
  const hadoopAt = n.word("hadoop", "the open-source MapReduce system");
  const diskAt = n.word("hadoop", "writes its results to disk");
  const everyAt = n.word("hadoop", "between every map and reduce");
  const sparkAt = n.word("hadoop-spark", "Spark, a newer cluster engine");
  const memAt = n.word("hadoop-spark", "in memory");
  const spillAt = n.word("hadoop-spark", "spilling to disk");
  const pressureAt = n.word("hadoop-spark", "under pressure");
  const iterAt = n.word("hadoop-spark", "Multi-step and iterative work");
  const fasterAt = n.word("hadoop-spark", "much faster");
  const addsAt = n.word("hadoop-api", "It also adds DataFrames");
  const sqlAt = n.word("hadoop-api", "sequel");
  const streamAt = n.word("hadoop-api", "streaming");
  const optAt = n.word("hadoop-api", "optimizes whole queries");
  const end = n.beat("hadoop-api").to;

  const hMid = y(H_TOP) + h(BOX_H) / 2;
  const sMid = y(S_TOP) + h(BOX_H) / 2;
  const gap = (i: number) => BOX_X[i] + BOX_W + (BOX_X[1] - BOX_X[0] - BOX_W) / 2;
  const red = ease(frame, everyAt, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={hadoopAt} level={-37} />
      {STEPS.map((_, i) => (
        <Sfx key={i} name="el-tap" at={diskAt + 6 + i * 6} level={-37} />
      ))}
      <Sfx name="el-whoosh" at={memAt} level={-36} />
      <Sfx name="el-pencil" at={iterAt} level={-37} />
      <Sfx name="el-pop" at={addsAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={60}>
          How is Spark different from classic Hadoop MapReduce?
        </QuestionCard>

        {/* ── Hadoop: disk between every step ── */}
        <Note at={hadoopAt - 2} x={120} y={hMid - h(30)}>
          <span style={{ ...label(24, INK), fontWeight: 700, display: "block", lineHeight: 1.25 }}>
            Hadoop
            <br />
            MapReduce
          </span>
        </Note>
        {STEPS.map((s, i) => {
          const boxAt = hadoopAt + i * 3;
          const dAt = diskAt + 6 + i * 6;
          const dx = gap(i) - DISK_W / 2;
          const last = i === STEPS.length - 1;
          const nextX = last ? undefined : BOX_X[i + 1];
          return (
            <React.Fragment key={i}>
              <Machine x={BOX_X[i]} top={y(H_TOP)} width={BOX_W} height={h(BOX_H)} at={boxAt} fill={`color-mix(in srgb, ${BAR} 8%, ${PAPER})`} />
              <Note at={boxAt + 4} x={BOX_X[i]} y={hMid - 15} width={BOX_W} style={{ textAlign: "center" }}>
                <span style={{ ...label(23, INK), fontWeight: 650 }}>{s}</span>
              </Note>
              <Arrow from={[BOX_X[i] + BOX_W + 4, hMid]} to={[dx - 6, hMid]} at={dAt - 4} dur={8} color={red > 0.5 ? ACCENT : INK_SOFT} width={1.8} head={10} />
              <Disk x={dx} top={hMid - 23} at={dAt} color={red > 0.5 ? ACCENT : INK_SOFT} />
              {nextX ? (
                <Arrow from={[dx + DISK_W + 4, hMid]} to={[nextX - 6, hMid]} at={dAt + 4} dur={8} color={red > 0.5 ? ACCENT : INK_SOFT} width={1.8} head={10} />
              ) : null}
            </React.Fragment>
          );
        })}
        <Note at={diskAt + 6} x={gap(0) - 60} y={hMid + h(40)} width={120} style={{ textAlign: "center" }}>
          <span style={{ ...label(20, red > 0.5 ? ACCENT_INK : INK_SOFT) }}>disk</span>
        </Note>
        <Note at={everyAt + 4} x={NOTE_X} y={hMid - h(28)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, display: "block", lineHeight: 1.3 }}>
            written and read
            <br />
            back, every step
          </span>
        </Note>

        {/* ── Spark: memory across steps ── */}
        <Note at={sparkAt - 2} x={120} y={sMid - 16}>
          <span style={{ ...label(24, INK), fontWeight: 700 }}>Spark</span>
        </Note>
        {STEPS.map((s, i) => {
          const boxAt = sparkAt + 2 + i * 3;
          const last = i === STEPS.length - 1;
          return (
            <React.Fragment key={i}>
              <Machine x={BOX_X[i]} top={y(S_TOP)} width={BOX_W} height={h(BOX_H)} at={boxAt} fill={`color-mix(in srgb, ${BAR} 8%, ${PAPER})`} />
              <Note at={boxAt + 4} x={BOX_X[i]} y={sMid - 15} width={BOX_W} style={{ textAlign: "center" }}>
                <span style={{ ...label(23, INK), fontWeight: 650 }}>{s}</span>
              </Note>
              {last ? null : (
                <Arrow from={[BOX_X[i] + BOX_W + 4, sMid]} to={[BOX_X[i + 1] - 6, sMid]} at={memAt + i * 4} dur={10} color={BAR} width={2.4} head={11} />
              )}
            </React.Fragment>
          );
        })}
        <Note at={memAt + 4} x={gap(0) - 70} y={sMid - h(44)} width={140} style={{ textAlign: "center" }}>
          <span style={{ ...label(20, BLUE_INK) }}>memory</span>
        </Note>
        <Note at={memAt + 6} x={NOTE_X} y={sMid - h(28)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 650, display: "block", lineHeight: 1.3 }}>
            in memory,
            <br />
            across steps
          </span>
        </Note>
        {/* The spill, only under pressure. */}
        <Arrow from={[gap(1), sMid + 8]} to={[gap(1), y(S_TOP) + h(BOX_H) + h(46)]} at={spillAt} dur={10} color={INK_SOFT} width={1.5} head={9} />
        <Disk x={gap(1) - DISK_W / 2} top={y(S_TOP) + h(BOX_H) + h(52)} at={spillAt + 6} dash />
        <Note at={pressureAt - 2} x={gap(1) + 44} y={y(S_TOP) + h(BOX_H) + h(60)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>spills to disk only under pressure</span>
        </Note>

        {/* Iterative work: the loop that gains most. */}
        <Elbow
          points={[
            [BOX_X[3] + BOX_W / 2, y(S_TOP) - 4],
            [BOX_X[3] + BOX_W / 2, y(S_TOP) - h(40)],
            [BOX_X[0] + BOX_W / 2, y(S_TOP) - h(40)],
            [BOX_X[0] + BOX_W / 2, y(S_TOP) - 6],
          ]}
          at={iterAt}
          dur={20}
          color={OK}
          width={2.4}
        />
        <Note at={iterAt + 10} x={(BOX_X[1] + BOX_X[2] + BOX_W) / 2 - 220} y={y(S_TOP) - h(40) - 38} width={440} style={{ textAlign: "center" }}>
          <span style={{ ...label(22, OK_INK), fontWeight: 650, background: PAPER, padding: "0 10px", whiteSpace: "nowrap" }}>
            iterate<span style={{ opacity: ease(frame, fasterAt - 2, 10) }}>: much faster</span>
          </span>
        </Note>

        {/* What else Spark adds. */}
        <Note at={addsAt} x={120} y={y(850)}>
          <span style={{ display: "flex", gap: 14, alignItems: "center", whiteSpace: "nowrap" }}>
            <span style={{ ...label(22, INK_SOFT) }}>Spark also adds</span>
            <Chip>DataFrames</Chip>
            <span style={{ opacity: ease(frame, sqlAt - 2, 10) }}>
              <Chip>SQL</Chip>
            </span>
            <span style={{ opacity: ease(frame, streamAt - 2, 10) }}>
              <Chip>streaming</Chip>
            </span>
            <span style={{ opacity: ease(frame, optAt - 2, 10) }}>
              <Chip color={ds("green", 600)} ink={OK_INK}>
                whole-query optimization
              </Chip>
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
