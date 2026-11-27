import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { during, ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK_SOFT, note } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import {
  Arrow,
  BAD_INK,
  Box,
  Cross,
  DATA,
  Disc,
  Drift,
  Fade,
  GOOD_INK,
  Line,
  Mark,
  MARK_OK,
  type Rect,
  Tag,
  X0,
} from "./parts";

/** The ladder: each rung's centre (layout units, through y()), cheapest at
 *  the bottom. */
const RUNG = [790, 680, 570, 460, 350] as const;
const DISC_X = 150;
const TITLE_X = 222;
/** Where a rung's chips and notes go, right of the titles. */
const DET = 760;
/** Question 1's scoring chips, on rung 2's row. */
const CHIP_W = 330;
const CHIP_X = [DET + CHIP_W / 2, DET + CHIP_W * 1.5 + 30, DET + CHIP_W * 2.5 + 60] as const;
/** The return arrow's corner, right of the longest title. */
const BACK_X = 790;

/**
 * Question 1. The answer is a ladder of five layers, cheap at the bottom and
 * expensive at the top, drawn empty on "in layers" and filled rung by rung
 * as each is said. Only the rung being said keeps its notes: the eval set
 * and where it grows from; the three ways of scoring (and the assistant's
 * own two outputs, led to the one that grades each); human review, pointing
 * at the judge; CI, with a regression blocked; online tests and their
 * guardrails. The judge chip stays, because the next two rungs check it and
 * the next question is about it. Then the agreement the layers owe each
 * other, as an arrow from the top rung back to the bottom, and public
 * benchmarks set apart, in grey.
 */
export const LayersScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("q1").from;
  const qAt = n.word("q1", "Question one");
  const textAt = n.word("q1", "How do you evaluate");
  const layersAt = n.word("q1", "In layers");
  const cheapAt = n.word("q1", "from cheap");
  const expAt = n.word("q1", "to expensive");

  const setAt = n.word("q1-set", "an offline eval set");
  const realAt = n.word("q1-set", "realistic inputs");
  const refAt = n.word("q1-set", "a reference answer");
  const fewAt = n.word("q1-set", "A hundred or two");
  const thousandsAt = n.word("q1-set", "beat thousands");
  const growsAt = n.word("q1-set", "the set grows");
  const failAt = n.word("q1-set", "real production failures");

  const scoreAt = n.word("q1-score", "scoring matched");
  const exactAt = n.word("q1-score", "exact match");
  const retrAt = n.word("q1-score", "retrieval metrics");
  const judgeAt = n.word("q1-score", "a rubric-driven LLM judge");

  const ticketAt = n.word("q1-ours", "whether a ticket was filed");
  const exactlyAt = n.word("q1-ours", "checked exactly");
  const policyAt = n.word("q1-ours", "explained a policy");
  const needsAt = n.word("q1-ours", "needs the judge");

  const humanAt = n.word("q1-human", "human review");
  const missAt = n.word("q1-human", "what the metrics miss");
  const checkAt = n.word("q1-human", "check the judge");

  const ciAt = n.word("q1-ci", "evals as CI");
  const changes = [
    { text: "prompt", at: n.word("q1-ci", "prompt"), ok: true },
    { text: "model", at: n.word("q1-ci", "model"), ok: false },
    { text: "retrieval", at: n.word("q1-ci", "retrieval change"), ok: true },
  ];
  const blockAt = n.word("q1-ci", "block regressions");

  const onlineAt = n.word("q1-online", "online");
  const guardAt = n.word("q1-online", "guardrails");
  const guards = [
    { text: "latency", at: n.word("q1-online", "latency") },
    { text: "cost", at: n.word("q1-online", "cost") },
    { text: "refusal rate", at: n.word("q1-online", "refusal rate") },
  ];

  const agreeAt = n.word("q1-agree", "have to agree");
  const winsAt = n.word("q1-agree-fix", "wins offline");
  /** The condition: an online loss on latency or cost is not the eval
   *  set's fault, so the guardrails have to have held. */
  const heldAt = n.word("q1-agree-fix", "the guardrails held");
  const fixAt = n.word("q1-agree-fix", "fix the eval set");
  const caresAt = n.word("q1-agree-fix", "users don't care about");

  const benchAt = n.word("q1-bench", "public benchmarks");
  const weakAt = n.word("q1-bench", "a weak guide");
  const satAt = n.word("q1-bench", "saturated");
  const leakAt = n.word("q1-bench", "leaked into training");
  const leanAt = n.word("q2-in", "lean on an LLM judge");
  const end = n.beat("q2-in").to;

  const ry = (i: number) => y(RUNG[i]);
  // Each rung is current from its first word to the next one's.
  const starts = [setAt, scoreAt, humanAt, ciAt, onlineAt, agreeAt];
  const titles = [
    "Offline eval set",
    "Scoring matched to the task",
    "Human review of a sample",
    "Evals as CI",
    "Online A/B tests on user outcomes",
  ];

  // Rung 2's chips, in screen pixels.
  const chip = (k: number): Rect => ({ cx: CHIP_X[k], cy: ry(1), w: CHIP_W, h: 86 });
  const exact = chip(0);
  const retr = chip(1);
  const judge = chip(2);
  const itemY = ry(0) - 15;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={layersAt} level={-36} />
      {starts.slice(0, 5).map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-30} />
      ))}
      <Sfx name="el-pencil" at={failAt + 4} level={-36} />
      {[exactAt, retrAt, judgeAt].map((t, i) => (
        <Sfx key={i} name="el-pop" at={t + 2} level={-32} />
      ))}
      <Sfx name="el-pencil" at={checkAt + 2} level={-36} />
      <Sfx name="el-scratch" at={blockAt + 4} level={-34} />
      {guards.map((g) => (
        <Sfx key={g.text} name="el-tap" at={g.at} level={-33} />
      ))}
      <Sfx name="el-pencil" at={agreeAt + 4} level={-35} />
      <Sfx name="el-tap" at={heldAt + 2} level={-33} />
      <Sfx name="el-chime" at={caresAt + 10} level={-33} />
      <Sfx name="el-pop" at={benchAt + 2} level={-32} />
      <Sfx name="el-pop" at={leanAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you evaluate an LLM application?
        </QuestionCard>

        {/* The empty ladder: five numbered rungs, cheap to expensive. */}
        <Arrow points={[[X0 - 18, ry(0) + 20], [X0 - 18, ry(4) - 20]]} at={cheapAt} dur={24} width={2} head={11} />
        <Line x={X0 - 30} y={ry(0) + 34} at={cheapAt} size={21} color={INK_SOFT}>
          cheap
        </Line>
        <Line x={X0 - 30} y={ry(4) - 70} at={expAt} size={21} color={INK_SOFT}>
          expensive
        </Line>
        {RUNG.map((_, i) => {
          const lit = during(frame, starts[i] - 4, starts[i + 1] - 4, 8);
          return (
            <div key={i} style={{ position: "absolute", left: DISC_X - 1, top: ry(i) - 23, opacity: ease(frame, layersAt + 4 + i * 3, 10) }}>
              <Disc n={i + 1} size={46} text={26} lit={lit} />
            </div>
          );
        })}
        {titles.map((t, i) => (
          <Line key={t} x={TITLE_X} y={ry(i) - 19} at={starts[i]} size={28}>
            {t}
          </Line>
        ))}

        {/* Rung 1: the eval set, and where it grows from. */}
        <Line x={DET} y={y(560)} at={realAt} out={scoreAt - 4} size={26}>
          Realistic inputs, <Fade at={refAt}>each with a reference answer or a rubric</Fade>
        </Line>
        <Line x={DET} y={y(560) + 56} at={fewAt} out={scoreAt - 4} size={26}>
          <Mark at={fewAt + 6} color={MARK_OK}>
            100–200 well-chosen cases
          </Mark>{" "}
          <Fade at={thousandsAt}>beat thousands of synthetic ones</Fade>
        </Line>
        <Box r={{ cx: DET + 110, cy: ry(0), w: 220, h: 64 }} at={growsAt} out={scoreAt - 4} title="Eval set" tone="data" size={24} />
        <Box r={{ cx: DET + 580, cy: ry(0), w: 220, h: 64 }} at={failAt - 4} out={scoreAt - 4} title="Production" size={24} />
        <Arrow points={[[DET + 470 - 8, ry(0)], [DET + 220 + 8, ry(0)]]} at={failAt + 4} out={scoreAt - 4} color={DATA} />
        <Line x={DET + 345} width={240} align="center" y={ry(0) - 48} at={failAt + 6} out={scoreAt - 4} size={21} color={BAD_INK}>
          real failures
        </Line>

        {/* Rung 2: scoring matched to the task. The judge chip stays through
            rung 3, which checks it, then leaves with rung 3's notes and comes
            back lit on "lean on an LLM judge", the turn to question 2. */}
        <Box
          r={exact}
          at={exactAt}
          out={humanAt - 4}
          title="Exact match or execution"
          sub="JSON, SQL, code"
          size={24}
          tones={[{ at: exactlyAt, tone: "lit" }]}
        />
        <Box r={retr} at={retrAt} out={humanAt - 4} title="Retrieval metrics" sub="search" size={24} />
        <Box
          r={judge}
          at={judgeAt}
          out={ciAt - 4}
          title="Rubric LLM judge"
          sub="open-ended text"
          size={24}
          tones={[
            { at: needsAt, tone: "lit" },
            { at: humanAt - 4, tone: "plain" },
            { at: checkAt, tone: "lit" },
          ]}
        />
        <Box r={judge} at={leanAt - 2} title="Rubric LLM judge" sub="open-ended text" size={24} tone="lit" />
        {/* The assistant's two outputs, each led to what grades it. */}
        <Line x={exact.cx} width={420} align="center" y={itemY} at={ticketAt} out={humanAt - 4} size={24}>
          Ticket filed with the right fields
        </Line>
        <Arrow points={[[exact.cx, itemY - 8], [exact.cx, exact.cy + exact.h / 2 + 8]]} at={exactlyAt - 4} out={humanAt - 4} />
        <Line x={judge.cx} width={420} align="center" y={itemY} at={policyAt} out={humanAt - 4} size={24}>
          Policy explained correctly
        </Line>
        <Arrow points={[[judge.cx, itemY - 8], [judge.cx, judge.cy + judge.h / 2 + 8]]} at={needsAt - 4} out={humanAt - 4} />

        {/* Rung 3: human review, which checks the judge. */}
        <Line x={DET} y={ry(2) - 17} at={missAt} out={ciAt - 4} size={26}>
          Catches what the metrics miss
        </Line>
        <Line x={judge.cx} width={360} align="center" y={ry(2) - 17} at={checkAt} out={ciAt - 4} size={26}>
          Checks the judge
        </Line>
        <Arrow points={[[judge.cx, ry(2) + 22], [judge.cx, judge.cy - judge.h / 2 - 8]]} at={checkAt + 4} out={ciAt - 4} />

        {/* Rung 4: rerun the suite on every change; a regression is blocked. */}
        <div style={{ position: "absolute", left: DET, top: ry(3) - 22, display: "flex", alignItems: "center", gap: 14, fontSize: 24 }}>
          {changes.map((c) => {
            const p = ease(frame, c.at - 2, 10);
            const o = ease(frame, onlineAt - 4, 10);
            if (p <= 0 || o >= 1) return null;
            return (
              <span key={c.text} style={{ display: "flex", alignItems: "center", gap: 10, opacity: p * (1 - o), marginRight: 22 }}>
                <Tag at={c.at - 2} tone={!c.ok && frame >= blockAt ? "red" : "ink"} size={24}>
                  {c.text} change
                </Tag>
                {c.ok ? <Tick at={c.at + 8} size={24} /> : <Cross at={c.at + 8} size={22} />}
              </span>
            );
          })}
          <Tag at={blockAt + 4} out={onlineAt - 4} tone="red" tinted size={24}>
            blocked
          </Tag>
        </div>

        {/* Rung 5: online tests, with guardrails. */}
        <div style={{ position: "absolute", left: DET, top: ry(4) - 22, display: "flex", alignItems: "center", gap: 14, fontSize: 24 }}>
          <span style={{ ...note(24, INK_SOFT), opacity: ease(frame, guardAt - 2, 10) * (1 - ease(frame, agreeAt - 4, 10)) }}>Guardrails</span>
          {guards.map((g) => (
            <Tag key={g.text} at={g.at - 2} out={agreeAt - 4} size={24}>
              {g.text}
            </Tag>
          ))}
        </div>

        {/* The layers have to agree: top back to bottom. */}
        <Arrow
          points={[
            [TITLE_X + 520, ry(4)],
            [BACK_X, ry(4)],
            [BACK_X, ry(0)],
            [TITLE_X + 270, ry(0)],
          ]}
          at={winsAt}
          dur={22}
        />
        <Line x={BACK_X + 36} y={ry(4) - 17} at={winsAt + 6} size={26} color={BAD_INK}>
          Wins offline, loses online
        </Line>
        <Line x={BACK_X + 36} y={ry(4) + 25} at={heldAt} size={22} color={INK_SOFT} weight={500}>
          Guardrails held
        </Line>
        <Line x={BACK_X + 36} y={ry(0) - 17} at={fixAt} size={26} color={GOOD_INK}>
          Fix the eval set
        </Line>
        <Line x={BACK_X + 36} y={ry(0) + 25} at={caresAt - 6} size={22} color={INK_SOFT} weight={500}>
          it&apos;s measuring something users don&apos;t care about
        </Line>

        {/* Public benchmarks, set apart, in grey. */}
        <Box r={{ cx: 1560, cy: y(452), w: 300, h: 68 }} at={benchAt} title="Public benchmarks" tone="quiet" dashed size={24} />
        <Line x={1560} width={520} align="center" y={y(452) + 54} at={weakAt} size={22} color={INK_SOFT}>
          A weak guide to your task:
        </Line>
        <Line x={1560} width={520} align="center" y={y(452) + 90} at={satAt} size={22} color={INK_SOFT}>
          saturated, <Fade at={leakAt}>maybe leaked into training</Fade>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
