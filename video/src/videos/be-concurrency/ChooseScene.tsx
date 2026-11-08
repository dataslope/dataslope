import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Band, Drift, Flow, OK_INK, X0 } from "./parts";

const ROOT = { cx: 960, y: 330, w: 600, h: 78 };
const SPLIT = 470;
const LEAF_Y = 586;
const LEAF_W = 420;
const LEAVES = [
  { x: X0, title: "async", when: "waiting, on many connections", why: "one thread, the lowest overhead", branch: 0 },
  { x: 580, title: "threads, in a pool", when: "waiting, through blocking libraries", why: "they release the GIL while they wait", branch: 0 },
  { x: 1240, title: "multiprocessing", when: "burning CPU", why: "sidesteps the GIL: true parallelism", branch: 1 },
];
const BRANCHES = [
  { cx: (X0 + LEAF_W / 2 + 580 + LEAF_W / 2) / 2, text: "waiting on I/O" },
  { cx: 1240 + LEAF_W / 2, text: "burning CPU" },
];

/**
 * Question 9. The page's rule as a fork: waiting on I/O, or burning CPU?
 * Waiting splits by how you wait (many connections: async; blocking
 * libraries: threads in a pool); burning CPU takes processes. Then the mix a
 * real service runs: an async server handing its heavy work to a process
 * pool.
 */
export const ChooseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("choose").from;
  const qAt = n.word("choose", "Question nine");
  const textAt = n.word("choose", "When do you choose threads");
  const matchAt = n.word("choose", "Match the tool to the bottleneck");
  const decidingAt = n.word("choose", "The deciding question");
  const waitingAt = n.word("choose", "waiting on IO");
  const burningAt = n.word("choose", "or burning CPU");
  const leafAt = [n.word("choose-async", "async"), n.word("choose-threads", "threads"), n.word("choose-proc", "multiprocessing")];
  const whenAt = [n.word("choose-async", "Waiting, on many connections"), n.word("choose-threads", "Waiting, but through blocking libraries"), n.word("choose-proc", "Burning CPU")];
  const whyAt = [n.word("choose-async", "the lowest overhead"), n.word("choose-threads", "release the GIL"), n.word("choose-proc", "sidestep the GIL")];
  const capAt = n.word("choose-threads", "in a pool that caps how many run");
  const mixAt = n.word("choose-mix", "real services mix them");
  const serverAt = n.word("choose-mix", "an async server");
  const heavyAt = n.word("choose-mix", "hands its heavy computation");
  const poolAt = n.word("choose-mix", "a process pool");
  const end = n.beat("choose-mix").to;

  const rootTop = y(ROOT.y);
  const rootH = h(ROOT.h);
  const splitY = y(SPLIT);
  const leafY = y(LEAF_Y);
  const branchAt = [waitingAt, burningAt];
  // Which branch the narration is on: lit while its leaves are read.
  const onBranch = (b: number) => (b === 0 ? Math.max(ease(frame, whenAt[0], 10) * (1 - ease(frame, whenAt[2], 10)), 0) : ease(frame, whenAt[2], 10) * (1 - ease(frame, mixAt, 10)));
  const mixY = y(806);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={decidingAt} level={-35} />
      {[...leafAt, poolAt].map((at) => (
        <Sfx key={at} name="el-tap" at={at} level={-30} />
      ))}
      <Sfx name="el-chime" at={poolAt + 10} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={58}>
          When do you choose threads vs multiprocessing vs async?
        </QuestionCard>
        <Note at={matchAt} x={X0} y={y(268)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>Match the tool to the bottleneck</span>
        </Note>

        {/* The deciding question. */}
        <Note at={decidingAt} x={ROOT.cx - ROOT.w / 2} y={rootTop + rootH / 2 - 20} width={ROOT.w} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...note(30, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            <Band at={decidingAt + 6}>Waiting on I/O, or burning CPU?</Band>
          </span>
        </Note>
        {BRANCHES.map((b, i) => {
          const lit = onBranch(i);
          return (
            <React.Fragment key={b.text}>
              <Flow points={[[ROOT.cx + (i ? 120 : -120), rootTop + rootH + 4], [ROOT.cx + (i ? 120 : -120), splitY - h(34)], [b.cx, splitY - h(34)], [b.cx, splitY - 8]]} at={branchAt[i]} color={lit > 0.5 ? INK : INK_SOFT} width={2.4} head={13} />
              <Note at={branchAt[i] + 8} x={b.cx - 150} y={splitY + h(25) - 16} width={300} from="up" style={{ textAlign: "center" }}>
                <span style={{ ...label(24, BLUE_INK), fontWeight: lit > 0.5 ? 500 : 500, whiteSpace: "nowrap" }}>{b.text}</span>
              </Note>
            </React.Fragment>
          );
        })}
        {LEAVES.map((l, i) => {
          const b = BRANCHES[l.branch];
          const cx = l.x + LEAF_W / 2;
          const named = ease(frame, leafAt[i], 10);
          return (
            <React.Fragment key={l.title}>
              <Flow
                points={
                  l.branch === 0
                    ? [
                        [b.cx + (i === 0 ? -40 : 40), splitY + h(50) + 4],
                        [b.cx + (i === 0 ? -40 : 40), leafY - h(26)],
                        [cx, leafY - h(26)],
                        [cx, leafY - 8],
                      ]
                    : [
                        [cx, splitY + h(50) + 4],
                        [cx, leafY - 8],
                      ]
                }
                at={whenAt[i]}
                color={INK_SOFT}
                width={2.4}
                head={13}
              />
              <Note at={whenAt[i] + 6} x={l.x} y={leafY + h(6)} width={LEAF_W} from="up" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ ...label(30, OK_INK), fontWeight: 500, whiteSpace: "nowrap", opacity: named }}>
                  {i === 1 ? (
                    <>
                      threads, <Band at={capAt}>in a pool</Band>
                    </>
                  ) : (
                    l.title
                  )}
                </span>
                <span style={{ ...note(21, INK), whiteSpace: "nowrap" }}>{l.when}</span>
                <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, whyAt[i], 10) }}>{l.why}</span>
              </Note>
            </React.Fragment>
          );
        })}

        {/* What real services run. */}
        <Note at={mixAt} x={X0} y={mixY + h(14)}>
          <span style={{ ...note(25, INK), fontWeight: 500, whiteSpace: "nowrap" }}>Real services mix them:</span>
        </Note>
        <Note at={serverAt} x={480} y={mixY + h(32) - 16} width={300} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...label(25, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>async server</span>
        </Note>
        <Flow points={[[792, mixY + h(32)], [1092, mixY + h(32)]]} at={heavyAt} color={BAR} width={2.8} />
        <Note at={heavyAt + 4} x={820} y={mixY - h(30)}>
          <span style={{ ...label(21, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>heavy computation</span>
        </Note>
        <Note at={poolAt} x={1104} y={mixY + h(32) - 16} width={300} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...label(25, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>process pool</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
