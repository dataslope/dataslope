import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Arrow, Chip, Disk, Drift, Elbow, Machine, OK, OK_INK } from "./parts";

const BOX_X = [300, 610, 920, 1230];
const BOX_W = 170;
const BOX_H = 70;
const STEPS = ["map", "reduce", "map", "reduce"];
const H_TOP = 360;
const S_TOP = 616;
const DISK_W = 56;
const NOTE_X = 1560;
/** How far above the Spark lane the iteration loop runs, and the cache() chip on it. */
const LOOP_RISE = 58;
const CHIP_W = 120;

/**
 * Question 2. The same four steps in two lanes, with what each really writes.
 * Hadoop MapReduce: a map's output goes to local disk for the shuffle, and a
 * reduce's output to HDFS, replicated, which the next map reads back. Spark:
 * the same shuffle to local disk, but a reduce hands the next map its data in
 * memory. Then a cache() chip, where the iteration loop over Spark's lane
 * comes back to on every pass. Then what else Spark adds: DataFrames, SQL,
 * streaming, whole-query optimization.
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
  const memAt = n.word("hadoop-spark", "passes data between steps in memory");
  const shuffleAt = n.word("hadoop-spark", "only a shuffle writes to local disk");
  const cacheAt = n.word("hadoop-spark", "Cache a dataset");
  const iterAt = n.word("hadoop-spark", "iterative work");
  const passAt = n.word("hadoop-spark", "on every pass");
  const addsAt = n.word("hadoop-api", "It also adds DataFrames");
  const sqlAt = n.word("hadoop-api", "sequel");
  const streamAt = n.word("hadoop-api", "streaming");
  const optAt = n.word("hadoop-api", "optimizes whole queries");
  const end = n.beat("hadoop-api").to;

  const hMid = y(H_TOP) + h(BOX_H) / 2;
  const sMid = y(S_TOP) + h(BOX_H) / 2;
  const gap = (i: number) => BOX_X[i] + BOX_W + (BOX_X[1] - BOX_X[0] - BOX_W) / 2;
  const red = ease(frame, everyAt, 12);
  /** After a map, the shuffle's local disk; after a reduce, HDFS. */
  const isHdfs = (i: number) => i % 2 === 1;
  const loopY = y(S_TOP) - h(LOOP_RISE);
  const chipX = BOX_X[0] + BOX_W / 2 - CHIP_W / 2;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={hadoopAt} level={-37} />
      {STEPS.map((_, i) => (
        <Sfx key={i} name="el-tap" at={diskAt + 6 + i * 6} level={-37} />
      ))}
      <Sfx name="el-whoosh" at={memAt} level={-36} />
      <Sfx name="el-tap" at={shuffleAt + 4} level={-37} />
      <Sfx name="el-pop" at={cacheAt} level={-36} />
      <Sfx name="el-pencil" at={iterAt} level={-37} />
      <Sfx name="el-pop" at={addsAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={60}>
          How is Spark different from classic Hadoop MapReduce?
        </QuestionCard>

        {/* ── Hadoop: local disk for the shuffle, HDFS after every reduce ── */}
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
          const hot = isHdfs(i) && red > 0.5;
          const ink = hot ? ACCENT : INK_SOFT;
          return (
            <React.Fragment key={i}>
              <Machine x={BOX_X[i]} top={y(H_TOP)} width={BOX_W} height={h(BOX_H)} at={boxAt} fill={`color-mix(in srgb, ${BAR} 8%, ${PAPER})`} />
              <Note at={boxAt + 4} x={BOX_X[i]} y={hMid - 15} width={BOX_W} style={{ textAlign: "center" }}>
                <span style={{ ...label(23, INK), fontWeight: 650 }}>{s}</span>
              </Note>
              <Arrow from={[BOX_X[i] + BOX_W + 4, hMid]} to={[dx - 6, hMid]} at={dAt - 4} dur={8} color={ink} width={1.8} head={10} />
              <Disk x={dx} top={hMid - 23} at={dAt} color={ink} />
              {nextX ? (
                <Arrow from={[dx + DISK_W + 4, hMid]} to={[nextX - 6, hMid]} at={dAt + 4} dur={8} color={ink} width={1.8} head={10} />
              ) : null}
              <Note at={dAt + 2} x={gap(i) - 100} y={hMid + h(34)} width={200} style={{ textAlign: "center" }}>
                <span style={{ ...label(20, isHdfs(i) ? (hot ? ACCENT_INK : INK_SOFT) : INK_SOFT), fontWeight: isHdfs(i) ? 650 : 500, whiteSpace: "nowrap" }}>
                  {isHdfs(i) ? (last ? "HDFS" : "HDFS, replicated") : "local disk"}
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={everyAt + 4} x={NOTE_X} y={hMid - h(44)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, display: "block", lineHeight: 1.3, whiteSpace: "nowrap" }}>
            every reduce:
            <br />
            HDFS, read back
            <br />
            by the next map
          </span>
        </Note>

        {/* ── Spark: the shuffle still on local disk, reduce to map in memory ── */}
        <Note at={sparkAt - 2} x={120} y={sMid - 16}>
          <span style={{ ...label(24, INK), fontWeight: 700 }}>Spark</span>
        </Note>
        {STEPS.map((s, i) => {
          const boxAt = sparkAt + 2 + i * 3;
          const last = i === STEPS.length - 1;
          const dx = gap(i) - DISK_W / 2;
          return (
            <React.Fragment key={i}>
              <Machine x={BOX_X[i]} top={y(S_TOP)} width={BOX_W} height={h(BOX_H)} at={boxAt} fill={`color-mix(in srgb, ${BAR} 8%, ${PAPER})`} />
              <Note at={boxAt + 4} x={BOX_X[i]} y={sMid - 15} width={BOX_W} style={{ textAlign: "center" }}>
                <span style={{ ...label(23, INK), fontWeight: 650 }}>{s}</span>
              </Note>
              {last ? null : isHdfs(i) ? (
                <Arrow from={[BOX_X[i] + BOX_W + 4, sMid]} to={[BOX_X[i + 1] - 6, sMid]} at={memAt + 4} dur={10} color={BAR} width={2.4} head={11} />
              ) : (
                <>
                  <Arrow from={[BOX_X[i] + BOX_W + 4, sMid]} to={[dx - 6, sMid]} at={shuffleAt + 2 + i * 3} dur={8} color={INK_SOFT} width={1.8} head={10} />
                  <Disk x={dx} top={sMid - 23} at={shuffleAt + 6 + i * 3} />
                  <Arrow from={[dx + DISK_W + 4, sMid]} to={[BOX_X[i + 1] - 6, sMid]} at={shuffleAt + 10 + i * 3} dur={8} color={INK_SOFT} width={1.8} head={10} />
                  <Note at={shuffleAt + 8 + i * 3} x={gap(i) - 100} y={sMid + h(34)} width={200} style={{ textAlign: "center" }}>
                    <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>local disk</span>
                  </Note>
                </>
              )}
            </React.Fragment>
          );
        })}
        <Note at={memAt + 6} x={gap(1) - 70} y={sMid - h(42)} width={140} style={{ textAlign: "center" }}>
          <span style={{ ...label(20, BLUE_INK), fontWeight: 650 }}>memory</span>
        </Note>
        <Note at={memAt + 8} x={NOTE_X} y={sMid - h(28)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 650, display: "block", lineHeight: 1.3, whiteSpace: "nowrap" }}>
            memory between steps,
            <br />
            <span style={{ opacity: ease(frame, shuffleAt, 10) }}>disk only at a shuffle</span>
          </span>
        </Note>

        {/* Iterative work: every pass comes back to the cached dataset. */}
        <Note at={cacheAt - 2} x={chipX} y={loopY - h(18)} width={CHIP_W} style={{ textAlign: "center" }}>
          <Chip mono size={22} tone="green">
            cache()
          </Chip>
        </Note>
        <Elbow
          points={[
            [BOX_X[3] + BOX_W / 2, y(S_TOP) - 4],
            [BOX_X[3] + BOX_W / 2, loopY],
            [chipX + CHIP_W + 8, loopY],
          ]}
          at={iterAt}
          dur={20}
          color={OK}
          width={2.4}
        />
        <Arrow from={[BOX_X[0] + BOX_W / 2, loopY + h(20)]} to={[BOX_X[0] + BOX_W / 2, y(S_TOP) - 6]} at={cacheAt + 4} dur={8} color={OK} width={2.4} head={10} />
        <Note at={iterAt + 10} x={(BOX_X[1] + BOX_X[2] + BOX_W) / 2 - 260} y={loopY - 38} width={520} style={{ textAlign: "center" }}>
          <span style={{ ...label(22, OK_INK), fontWeight: 650, background: PAPER, padding: "0 10px", whiteSpace: "nowrap" }}>
            iterate<span style={{ opacity: ease(frame, passAt - 2, 10) }}>: every pass reads the cache</span>
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
              <Chip tone="green">
                whole-query optimization
              </Chip>
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
