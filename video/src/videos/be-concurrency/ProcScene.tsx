import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Band, Drift, Flow, Node, OK, OK_INK, pulse, THREAD, ThreadName, tint, X0 } from "./parts";

/** The left panel: one process, its threads sharing its memory. */
const L = { x: X0, w: 720, top: 352, h: 384 };
const CELLS = 6;
const CELL_W = 96;
const CELL_GAP = 12;
const CELL_TOP = 414;
const CELL_H = 70;
const THREAD_TOP = 642;
const THREAD_W = 170;
const THREAD_H = 60;
/** The right panel: three processes, each with its own. */
const R_X = 980;
const P_W = 248;
const P_GAP = 38;
const P_TOP = 352;
const P_H = 280;

/**
 * Question 2. Threads share one process's memory: one writes a cell, another
 * reads it, cheaply; two writing the same cell corrupt it. Processes each
 * get their own: one crashes and the others run on, in parallel, but what
 * passes between them is serialized through a pipe, and each one's memory is
 * its own copy.
 */
export const ProcScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("proc").from;
  const qAt = n.word("proc", "Question two");
  const textAt = n.word("proc", "Processes versus threads");
  const threadsAt = n.word("proc", "Threads live inside one process");
  const shareAt = n.word("proc", "share its memory");
  const cheapAt = n.word("proc", "talking is cheap");
  const writesAt = n.word("proc", "one thread writes a value");
  const readsAt = n.word("proc", "another reads it");
  const dangerAt = n.word("proc-risk", "That sharing is also the danger");
  const corruptAt = n.word("proc-risk", "corrupt the same state");
  const ownAt = n.word("proc-iso", "Processes each get their own memory");
  const crashAt = n.word("proc-iso", "A crash in one");
  const parallelAt = n.word("proc-iso", "they run truly in parallel");
  const priceAt = n.word("proc-iso", "The price is talking");
  const serialAt = n.word("proc-iso", "serialized through pipes or queues");
  const memAt = n.word("proc-iso", "every process costs more memory");
  const end = n.beat("proc-iso").to;

  const cellX = (k: number) => L.x + 40 + k * (CELL_W + CELL_GAP);
  const cellTop = y(CELL_TOP);
  const cellH = h(CELL_H);
  const threadTop = y(THREAD_TOP);
  const threadH = h(THREAD_H);
  const threadX = (i: number) => L.x + 40 + i * 236;
  const WRITE = 1;
  const CLASH = 4;
  // The written value lands in its cell; then the clash turns another red.
  const written = ease(frame, writesAt + 12, 8);
  const clash = ease(frame, corruptAt, 10);
  const pX = (j: number) => R_X + j * (P_W + P_GAP);
  const pTop = y(P_TOP);
  const pH = h(P_H);
  const crashed = ease(frame, crashAt + 4, 10);
  const run = ease(frame, parallelAt, 50);
  // The message through the pipe: packed, then carried from process 1 to 3.
  const pipeY = y(716);
  const pipeX0 = pX(0) + P_W / 2;
  const pipeX1 = pX(2) + P_W / 2;
  // Messages keep going through it, packed small, one after another.
  const carryT = frame - (serialAt + 6);
  const carry = carryT < 0 ? -1 : (carryT % 48) / 48;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={threadsAt} level={-35} />
      <Sfx name="el-tap" at={writesAt + 12} level={-30} />
      <Sfx name="el-scratch" at={corruptAt} level={-31} />
      <Sfx name="el-pencil" at={ownAt} level={-35} />
      <Sfx name="el-scratch" at={crashAt + 4} level={-31} />
      <Sfx name="el-whoosh" at={serialAt + 6} level={-35} />
      <Sfx name="el-chime" at={memAt + 10} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={58}>
          Processes vs threads, how do they differ?
        </QuestionCard>

        {/* Threads: one process, one memory. */}
        <Note at={threadsAt} x={L.x} y={y(292)}>
          <span style={{ ...note(26, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Threads: <span style={{ fontWeight: 500 }}>inside one process, sharing its memory</span>
          </span>
        </Note>
        <Node x={L.x} y={y(L.top)} w={L.w} h={h(L.h)} at={threadsAt + 2} tone="plain" fill="transparent" line={HAIRLINE} stroke={1.5} />
        <Ink at={threadsAt + 6} dur={12} style={{ left: L.x + 40, top: y(L.top) + h(18) }}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>
            one process<span style={{ opacity: ease(frame, shareAt, 10) }}>: its memory, shared</span>
          </span>
        </Ink>
        {Array.from({ length: CELLS }, (_, k) => {
          const at = shareAt + k * 2;
          const red = k === CLASH ? clash : 0;
          const lit = k === WRITE ? written : 0;
          return (
            <Node
              key={k}
              x={cellX(k)}
              y={cellTop}
              w={CELL_W}
              h={cellH}
              at={at}
              tone={red > 0.5 ? "bad" : "data"}
              fill={red > 0 ? tint(ACCENT, 10 + 16 * red) : tint(BAR, 8 + 20 * lit)}
              size={26}
              title={k === WRITE && written > 0 ? <Num>42</Num> : k === CLASH && red > 0 ? "?" : ""}
            />
          );
        })}
        {[0, 1, 2].map((i) => (
          <ThreadName key={i} t={i} x={threadX(i) + THREAD_W / 2} y={threadTop + threadH / 2 - 14} at={threadsAt + 8 + i * 4} center />
        ))}
        {/* One writes, another reads. */}
        <Flow points={[[threadX(0) + 60, threadTop - 8], [cellX(WRITE) + CELL_W / 2 - 14, cellTop + cellH + 8]]} at={writesAt} color={THREAD[0].fill} width={3} />
        <Flow points={[[cellX(WRITE) + CELL_W / 2 + 14, cellTop + cellH + 8], [threadX(1) + 30, threadTop - 8]]} at={readsAt} color={THREAD[1].fill} width={3} />
        <Note at={writesAt + 4} x={threadX(0) - 6} y={y(540)}>
          <span style={{ ...label(20, THREAD[0].ink), fontWeight: 500 }}>write</span>
        </Note>
        <Note at={readsAt + 4} x={threadX(1) + 50} y={y(540)}>
          <span style={{ ...label(20, THREAD[1].ink), fontWeight: 500 }}>read</span>
        </Note>
        {/* Two write the same cell. */}
        <Flow points={[[threadX(1) + 140, threadTop - 8], [cellX(CLASH) + 18, cellTop + cellH + 8]]} at={dangerAt + 6} color={ACCENT} width={3} />
        <Flow points={[[threadX(2) + 85, threadTop - 8], [cellX(CLASH) + CELL_W - 18, cellTop + cellH + 8]]} at={dangerAt + 10} color={ACCENT} width={3} />
        <Note at={cheapAt} x={L.x} y={y(L.top + L.h + 24)} out={dangerAt - 2}>
          <span style={{ ...note(24, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Talking is cheap: just memory</span>
        </Note>
        <Note at={corruptAt + 4} x={L.x} y={y(L.top + L.h + 24)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Two threads, one cell: corrupted state</span>
        </Note>

        {/* Processes: each its own memory. */}
        <Note at={ownAt} x={R_X} y={y(292)}>
          <span style={{ ...note(26, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            Processes: <span style={{ fontWeight: 500 }}>each with its own memory</span>
          </span>
        </Note>
        {[0, 1, 2].map((j) => {
          const at = ownAt + 4 + j * 5;
          const dead = j === 1 ? crashed : 0;
          return (
            <React.Fragment key={j}>
              <Node x={pX(j)} y={pTop} w={P_W} h={pH} at={at} tone="plain" fill="transparent" line={dead > 0.5 ? ACCENT : HAIRLINE} stroke={dead > 0.5 ? 2.5 : 1.5} lit={j === 1 ? pulse(frame, crashAt + 4, 20) : 0} />
              <Ink at={at + 4} dur={12} style={{ left: pX(j) + 20, top: pTop + h(16) }}>
                <span style={{ ...label(21, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>process {j + 1}</span>
              </Ink>
              {[0, 1].map((k) => (
                <Node
                  key={k}
                  x={pX(j) + 20 + k * 108}
                  y={pTop + h(62)}
                  w={98}
                  h={h(54)}
                  at={at + 6 + k * 2}
                  tone="data"
                  fill={tint(BAR, 8 + 18 * ease(frame, memAt + j * 4, 12) * (1 - ease(frame, memAt + 40, 20)))}
                  dim={j === 1 ? crashAt + 4 : undefined}
                />
              ))}
              <ThreadName t={j} x={pX(j) + 20} y={pTop + h(152)} at={at + 10} ink={j === 1 && crashed > 0.5 ? ACCENT_INK : undefined}>
                {j === 1 && crashed > 0.5 ? "thread 2: crashed" : `thread ${j + 1}`}
              </ThreadName>
              {/* Running: a bar under each thread that fills, all at once. */}
              {j !== 1 ? (
                <div style={{ position: "absolute", left: pX(j) + 20, top: pTop + h(208), width: (P_W - 40) * run, height: 8, borderRadius: 4, background: OK, opacity: run > 0 ? 1 : 0 }} />
              ) : null}
            </React.Fragment>
          );
        })}
        {/* The crash: one goes down, the others run on. */}
        <Note at={crashAt + 10} x={pX(0)} y={pTop + pH + h(14)}>
          <span style={{ ...label(21, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            runs on<span style={{ opacity: ease(frame, parallelAt, 10) }}>, in parallel</span>
          </span>
        </Note>
        <Note at={crashAt + 10} x={pX(1)} y={pTop + pH + h(14)}>
          <span style={{ ...label(21, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>crashed alone</span>
        </Note>
        <Note at={crashAt + 10} x={pX(2)} y={pTop + pH + h(14)}>
          <span style={{ ...label(21, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            runs on<span style={{ opacity: ease(frame, parallelAt, 10) }}>, in parallel</span>
          </span>
        </Note>

        {/* The price: a pipe, with the message packed into bytes. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, priceAt, 12) }}>
          {/* A tube: a wide stroke with a narrower one in the page's color inside it. */}
          <path d={`M${pipeX0},${pTop + pH + h(54)} V${pipeY} H${pipeX1} V${pTop + pH + h(54)}`} fill="none" stroke={INK_SOFT} strokeWidth={22} strokeLinejoin="round" strokeOpacity={0.55} />
          <path d={`M${pipeX0},${pTop + pH + h(54)} V${pipeY} H${pipeX1} V${pTop + pH + h(54)}`} fill="none" stroke={PAPER} strokeWidth={16} strokeLinejoin="round" />
        </svg>
        {carry >= 0 ? (
          <div
            style={{
              position: "absolute",
              left: pipeX0 + (pipeX1 - pipeX0) * carry - 15,
              top: pipeY - 7,
              width: 30,
              height: 14,
              borderRadius: 3,
              background: BAR,
              border: `2px solid ${PAPER}`,
            }}
          />
        ) : null}
        <Note at={serialAt} x={R_X} y={pipeY + h(30)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            Data between them is <Band at={serialAt + 4}>serialized</Band>, through a pipe or a queue
          </span>
        </Note>
        <Note at={memAt} x={R_X} y={pipeY + h(84)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            and each process costs <b style={{ color: BLUE_INK }}>more memory</b>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
