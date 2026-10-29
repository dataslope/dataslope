import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BANK } from "./data";
import { BAD, Chip, Clear, DATA, Drift, Headline, Kicker, Mark, MARK_BAD, OK_INK, Spot, Strike, X0 } from "./parts";

/** Where the answers go: right of the list. */
const R_X = 820;
const LIST_TOP = 320;
const ROW = 58;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 8. A thumbs-up rate ─────────────────────────────────────────────────────

const Thumbs: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const whyAt = c.w("r-thumbs", "Why is a thumbs-up rate");
  const reasons = [
    { text: "few people click", at: c.w("r-thumbs", "Few people click") },
    { text: "the ones who do aren't typical", at: c.w("r-thumbs", "the ones who do aren't typical") },
  ];
  const rewardsAt = c.w("r-thumbs", "it rewards a confident tone");
  const correctAt = c.w("r-thumbs", "over a correct answer");
  const nextAt = c.w("r-thumbs", "Track what people do next");
  const signs = [
    { text: "the ticket stays closed", at: c.w("r-thumbs", "the ticket stays closed") },
    { text: "the suggested code is still there a week later", at: c.w("r-thumbs", "the suggested code is still there") },
    { text: "nobody asks again", at: c.w("r-thumbs", "nobody asks again") },
  ];
  return (
    <>
      <Note at={whyAt - 2} x={R_X} y={c.y(330)}>
        <span style={{ ...note(28, INK), fontStyle: "italic", whiteSpace: "nowrap" }}>a weak primary metric, because:</span>
      </Note>
      {reasons.map((r, i) => (
        <Note key={r.text} at={r.at - 2} x={R_X + 30} y={c.y(390) + i * c.h(50)}>
          <span style={{ ...note(27, ACCENT_INK), whiteSpace: "nowrap" }}>{r.text}</span>
        </Note>
      ))}
      <Note at={rewardsAt - 2} x={R_X + 30} y={c.y(490)}>
        <span style={{ ...note(27, ACCENT_INK), whiteSpace: "nowrap" }}>
          it rewards <Mark at={rewardsAt + 8} color={MARK_BAD}>a confident tone</Mark>
          <span style={{ opacity: ease(frame, correctAt - 2, 10) }}>
            {" "}over <Strike at={correctAt + 8}>a correct answer</Strike>
          </span>
        </span>
      </Note>
      <Note at={nextAt - 2} x={R_X} y={c.y(570)}>
        <span style={{ ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>track what people do next:</span>
      </Note>
      {signs.map((s, i) => (
        <Chip key={s.text} x={R_X + 30} y={c.y(626) + i * c.h(62)} at={s.at - 2} size={24} ink={OK_INK}>
          {s.text}
        </Chip>
      ))}
    </>
  );
};

// ── 9. Benchmark contamination ──────────────────────────────────────────────

const Contamination: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const contamAt = c.w("r-contam", "benchmark contamination");
  const itemsAt = c.w("r-contam", "test items were in a model's training data");
  const memoryAt = c.w("r-contam", "measures memory");
  const skillAt = c.w("r-contam", "not skill");
  const actions = [
    { text: "don't pick a model on leaderboards alone", at: c.w("r-contam", "Don't pick a model") },
    { text: "keep your own eval set private", at: c.w("r-contam", "Keep your own eval set private") },
    { text: "refresh it with recent cases", at: c.w("r-contam", "refresh it with recent cases") },
    { text: "never train on it", at: c.w("r-contam", "never train on it") },
  ];
  const train = ease(frame, contamAt, 14);
  const bench = ease(frame, itemsAt, 14);
  const cx = R_X + 190;
  const cy = c.y(470);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <circle cx={cx} cy={cy} r={130 * train} fill={DATA} opacity={0.22} stroke={BLUE_INK} strokeWidth={2} />
        <circle cx={cx + 150} cy={cy} r={70 * bench} fill="none" stroke={INK} strokeWidth={2.4} />
        {bench > 0 ? (
          <clipPath id="contam-clip">
            <circle cx={cx} cy={cy} r={130} />
          </clipPath>
        ) : null}
        {bench > 0 ? <circle cx={cx + 150} cy={cy} r={70 * bench} fill={BAD} opacity={0.6 * ease(frame, memoryAt, 12)} clipPath="url(#contam-clip)" /> : null}
      </svg>
      <Note at={contamAt + 4} x={cx - 110} y={cy - c.h(170)}>
        <span style={{ ...label(20, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>a model&apos;s training data</span>
      </Note>
      <Note at={itemsAt + 4} x={cx + 120} y={cy + c.h(84)}>
        <span style={{ ...label(20, INK), fontWeight: 700, whiteSpace: "nowrap" }}>a benchmark&apos;s test items</span>
      </Note>
      <Note at={memoryAt} x={cx + 250} y={cy - c.h(20)}>
        <span style={{ ...note(28, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
          memory<span style={{ opacity: ease(frame, skillAt - 2, 10) }}>, not skill</span>
        </span>
      </Note>
      {actions.map((a, i) => (
        <Note key={a.text} at={a.at - 2} x={R_X} y={c.y(650) + i * c.h(52)}>
          <span style={{ ...note(26, i === 0 ? INK : OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>{a.text}</span>
        </Note>
      ))}
    </>
  );
};

/**
 * The quick round, questions 8 and 9, then the close of the whole series:
 * the question every round came back to, and the practice the track holds
 * (concept checks on every page, code to run on most, and the 110-question
 * bank), with the parrot back on the page.
 */
export const RapidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h };

  const from = n.beat("rapid-in").from;
  const twoAt = n.word("rapid-in", "Two more");
  const lookAt = n.word("rapid-in", "numbers that look better");
  const closeFrom = n.beat("close").from;
  const roundAt = n.word("close", "Every round on this track");
  const sureAt = n.word("close", "how sure are you");
  const knowAt = n.word("close", "how would you know");
  const practice = [
    { text: "concept checks on every page", at: n.word("close-practice", "concept checks to try") },
    { text: "code you can run on most", at: n.word("close-practice", "most have code you can run") },
    { text: `${BANK} multiple-choice questions`, at: n.word("close-practice", "a hundred and ten multiple-choice questions") },
  ];
  const workAt = n.word("close-practice", "the rounds that still need work");
  const end = n.beat("close-practice").to;

  const items: RapidItem[] = [
    { n: 8, label: "A thumbs-up rate", beat: "r-thumbs", body: <Thumbs c={c} /> },
    { n: 9, label: "Benchmark contamination", beat: "r-contam", body: <Contamination c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-pencil" at={sureAt} level={-36} />
      {practice.map((p) => (
        <Sfx key={p.text} name="el-tap" at={p.at} level={-36} />
      ))}
      <Sfx name="el-chime" at={workAt + 4} level={-34} />

      <Drift from={from} to={end + 40} scale={0.015}>
        {/* The close belongs to no question: it ends the series under the kicker it opened on. */}
        <Kicker at={from} out={roundAt - 6}>
          Questions 8 and 9
        </Kicker>
        <Kicker at={roundAt}>Data scientist interview prep</Kicker>
        <Headline lead="Two more," turn="numbers that look better than they are." at={twoAt - 4} turnAt={lookAt - 4} out={roundAt - 6} size={60} />
        <Headline lead="How sure are you," turn="and how would you know?" at={sureAt - 4} turnAt={knowAt - 4} size={60} />

        <Clear at={roundAt - 6}>
          <RapidFire items={items} x={X0} top={y(LIST_TOP) + h(40)} rowH={h(ROW)} width={620} at={lookAt} end={closeFrom} />
        </Clear>

        {/* The close: what every round came back to, and the practice. */}
        <Note at={roundAt} x={X0} y={y(330)}>
          <span style={{ ...note(30, INK_SOFT), whiteSpace: "nowrap" }}>every round on this track came back to one question</span>
        </Note>
        <Note at={practice[0].at - 6} x={X0} y={y(450)}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 700 }}>to practice</span>
        </Note>
        {practice.map((p, i) => (
          <Chip key={p.text} x={X0} y={y(500) + i * h(74)} at={p.at - 2} size={28} ink={i === 2 ? ACCENT_INK : BLUE_INK} lit={i === 2 ? workAt : undefined}>
            {p.text}
          </Chip>
        ))}
        <Note at={workAt - 2} x={X0} y={y(740)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap", opacity: 0.4 + 0.6 * ease(frame, workAt, 12) }}>
            so you can find the rounds that still need work
          </span>
        </Note>
        <Spot id="ds-llm-evaluation-parrot" at={roundAt + 6} left={1260} top={y(360)} width={520} height={480} />
      </Drift>
    </AbsoluteFill>
  );
};
