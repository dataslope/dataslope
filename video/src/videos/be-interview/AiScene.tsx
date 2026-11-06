import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { during, ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { KARAT, partOf } from "./data";
import { Chip, Drift, Flow, Headline, Kicker, Mark, Spot } from "./parts";

/** The fork: the coding round's band at the top centre, and the two
 *  columns it splits into, each centred under its head. Layout units for
 *  positions (through y()), px across. */
const ROOT_Y = 262;
const ROOT_W = 340;
const ROOT_H = 56;
const FORK_Y = 350;
const HEAD_Y = 392;
const CAPTION_Y = 434;
const COL_L = 120;
const COL_W = 760;
const COL_GAP = 160;
const colX = (c: number) => COL_L + c * (COL_W + COL_GAP);
const colCx = (c: number) => colX(c) + COL_W / 2;
/** The company cards under each head. */
const CARD_Y = 500;
const CARD_H = 92;
const CARD_STEP = 106;
/** The take-home and the survey, under the fork once the cards go. The
 *  envelope (1024 by 868) is the scene's one spot, 180 by 153, with the
 *  take-home's two lines a clear 90px to its right. */
const PANEL_Y = 500;
const ENVELOPE_W = 180;
const ENVELOPE_H = 153;
const TAKE_X = COL_L + ENVELOPE_W + 90;
const SURVEY_X = 1080;
const TRACK_W = 560;
/** Where the time went: three columns under the fork. */
const MOVED_W = 540;
const MOVED_GAP = 30;
const movedX = (c: number) => COL_L + c * (MOVED_W + MOVED_GAP);

type Company = { name: string; when: string; what: React.ReactNode; at: number };

/** One company's policy: its name and when on the first row, what changed
 *  under it. Neutral ink in both columns: neither kind of round is the right
 *  answer, so neither is green or red. */
const Card: React.FC<{ c: number; i: number; company: Company; out: number }> = ({ c, i, company, out }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const p = ease(frame, company.at - 2, 14) * (1 - ease(frame, out, 12));
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: colX(c),
        top: y(CARD_Y) + i * h(CARD_STEP),
        width: COL_W,
        height: h(CARD_H),
        boxSizing: "border-box",
        border: `1.5px solid ${HAIRLINE}`,
        borderRadius: 12,
        background: PAPER,
        padding: "12px 22px 0",
        opacity: p,
        transform: `translateY(${(1 - p) * 12}px)`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ ...note(28, INK), fontWeight: 650 }}>{company.name}</span>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>{company.when}</span>
      </div>
      <div style={{ ...note(23, INK_SOFT), marginTop: 4, whiteSpace: "nowrap" }}>{company.what}</div>
    </div>
  );
};

/** A bar of the survey: its claim on a line of its own, then a blue bar on a
 *  pale track (the whole 100%) with its percentage at the end. */
const SurveyBar: React.FC<{ top: number; pct: number; at: number; children: React.ReactNode }> = ({ top, pct, at, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at - 2, 12);
  const grow = ease(frame, at + 4, 22);
  if (p <= 0) return null;
  const w = (TRACK_W * pct) / 100;
  return (
    <div style={{ position: "absolute", left: SURVEY_X, top, opacity: p }}>
      <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>{children}</div>
      <div style={{ position: "relative", marginTop: 12, width: TRACK_W + 120, height: 36 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: TRACK_W, height: 36, borderRadius: 6, background: ds("gray", 100) }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: w * grow, height: 36, borderRadius: 6, background: BAR }} />
        <div
          style={{
            position: "absolute",
            left: w * grow + 14,
            top: -1,
            ...note(30, BLUE_INK),
            fontWeight: 700,
            lineHeight: "38px",
            whiteSpace: "nowrap",
            opacity: ease(frame, at + 16, 10),
          }}
        >
          <Num>{pct}</Num>%
        </div>
      </div>
    </div>
  );
};

/** One of the three places the time went: a card with its name and the
 *  part that answers it. */
const Moved: React.FC<{ c: number; at: number; title: string; part: React.ReactNode }> = ({ c, at, title, part }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const p = ease(frame, at - 2, 14);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: movedX(c), top: y(PANEL_Y) + 70, width: MOVED_W, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
      <div
        style={{
          boxSizing: "border-box",
          height: h(108),
          border: `1.5px solid ${HAIRLINE}`,
          borderRadius: 12,
          background: PAPER,
          padding: "20px 24px 0",
        }}
      >
        <div style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ ...label(22, BLUE_INK), marginTop: 12, whiteSpace: "nowrap", opacity: ease(frame, at + 12, 12) }}>{part}</div>
      </div>
    </div>
  );
};

/**
 * What AI has changed, answering the AI page's "How have coding interviews
 * changed since AI assistants became standard?". The coding round as one
 * band that forks into two columns, AI allowed and AI banned, each filling
 * with the companies the page names as they are said, and Part 9 under the
 * allowed column. Then, under the fork, why: a take-home an assistant
 * finishes unseen, its envelope (the scene's one spot) fading, beside
 * Karat's two figures with its caveat; then where the time went, three live
 * rounds with the parts that answer them, and the four LLM topics system
 * design now takes in. "Ask the recruiter" is written
 * across the fork at the end, and algorithm practice under the banned head.
 */
export const AiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("ai").from;
  const roundAt = n.word("ai", "the coding round");
  const sinceAt = n.word("ai", "Since 2025");
  const splitAt = n.word("ai", "split in two");
  const someAt = n.word("ai-allowed", "Some rounds hand you");
  const gradeAt = n.word("ai-allowed", "grade how you drive");
  const othersAt = n.word("ai-banned", "Others ban assistants");
  const allowedEnd = n.beat("ai-allowed-who").to;
  const whyFrom = n.beat("ai-why").from;
  const finishAt = n.word("ai-why", "an assistant can finish");
  const takeAt = n.word("ai-why", "a take-home");
  const unseenAt = n.word("ai-why", "nobody sees how");
  const karatAt = n.word("ai-survey", "Karat");
  const sellsAt = n.word("ai-survey", "which sells interviewing services");
  const leadersAt = n.word("ai-survey", "four hundred engineering leaders");
  const vendorAt = n.word("ai-survey", "one vendor's");
  const harderAt = n.word("ai-survey-data", "Seventy-one percent");
  const bannedAt = n.word("ai-survey-data", "Sixty-two percent");
  const movedFrom = n.beat("ai-moved").from;
  const movedAt = n.word("ai-moved", "the time has moved");
  const watchAt = n.word("ai-moved", "watches you reason");
  const extendAt = n.word("ai-moved", "extending a multi-file project");
  const readAt = n.word("ai-moved", "reading and debugging unfamiliar code");
  const designAt = n.word("ai-moved", "design discussions with follow-ups");
  const llmAt = n.word("ai-llm", "system design now takes in");
  const llmChips = [
    { text: "streaming", at: n.word("ai-llm", "streaming") },
    { text: "retries", at: n.word("ai-llm", "retries") },
    { text: "cost in tokens", at: n.word("ai-llm", "cost measured in tokens") },
    { text: "prompt injection", at: n.word("ai-llm", "prompt injection") },
  ];
  const askAt = n.word("ai-ask", "Ask the recruiter");
  const roundByRoundAt = n.word("ai-ask", "round by round");
  const practiceAt = n.word("ai-ask", "Algorithm practice still matters");
  const end = n.beat("ai-ask").to;

  const allowed: Company[] = [
    { name: "Canva", when: "June 2025", what: "an AI-assisted coding round", at: n.word("ai-allowed-who", "Canva's does") },
    {
      name: "Meta",
      when: "piloted from October 2025",
      what: (
        <>
          one of two onsite coding rounds, now <Mark at={n.word("ai-allowed-who", "sixty-minute") + 2}>60 minutes</Mark> with AI
        </>
      ),
      at: n.word("ai-allowed-who", "Meta made"),
    },
    { name: "Google, a pilot", when: "second half of 2026", what: "a round for reading and debugging code", at: n.word("ai-allowed-who", "Google is piloting") },
  ];
  const banned: Company[] = [
    { name: "Amazon", when: "2025", what: "unapproved AI can disqualify a candidate", at: n.word("ai-banned", "Amazon can disqualify") },
    { name: "Anthropic", when: "2025", what: "none in interviews unless the interviewer says so", at: n.word("ai-banned", "Anthropic allows none") },
    { name: "Google", when: "2025", what: "a round brought back in person", at: n.word("ai-banned", "Google has brought back") },
  ];

  // The cards give way to the take-home and the survey, and those to where
  // the time went, each in the pause before its beat.
  const cardsOut = whyFrom - 10;
  const panel = during(frame, finishAt - 4, movedFrom - 6, 10);

  const rootTop = y(ROOT_Y);
  const rootBottom = rootTop + h(ROOT_H);
  const forkY = y(FORK_Y);
  const headTop = y(HEAD_Y);
  const fork = (c: number): [number, number][] => [
    [960, rootBottom + 4],
    [960, forkY],
    [colCx(c), forkY],
    [colCx(c), headTop - 4],
  ];
  const headIn = (at: number) => ease(frame, at - 2, 12);
  const moved = ease(frame, movedAt - 2, 12);
  const surveyTop = y(PANEL_Y);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={roundAt} level={-31} />
      <Sfx name="el-pencil" at={splitAt} level={-35} />
      {[...allowed, ...banned].map((c) => (
        <Sfx key={`${c.name}-${c.at}`} name="el-tap" at={c.at} level={-33} />
      ))}
      <Sfx name="el-pop" at={takeAt} level={-30} />
      <Sfx name="el-tap" at={karatAt} level={-33} />
      <Sfx name="el-whoosh" at={harderAt + 4} level={-36} />
      <Sfx name="el-whoosh" at={bannedAt + 4} level={-36} />
      {[extendAt, readAt, designAt].map((at) => (
        <Sfx key={at} name="el-tap" at={at} level={-32} />
      ))}
      {llmChips.map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at} level={-35} />
      ))}
      <Sfx name="el-pencil" at={roundByRoundAt} level={-35} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <Kicker at={from}>How AI has changed the interview</Kicker>
        <Headline lead="Since 2025," turn="it has split in two." at={sinceAt} turnAt={splitAt} size={62} />

        {/* The coding round, then the fork into its two kinds. */}
        <div
          style={{
            position: "absolute",
            left: 960 - ROOT_W / 2,
            top: rootTop,
            width: ROOT_W,
            height: h(ROOT_H),
            boxSizing: "border-box",
            border: `1.5px solid ${HAIRLINE}`,
            borderRadius: 12,
            background: PAPER,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...note(30, INK),
            fontWeight: 650,
            opacity: ease(frame, roundAt - 2, 12),
          }}
        >
          Coding round
        </div>
        <Flow points={fork(0)} at={splitAt} dur={16} color={INK_SOFT} width={2} />
        <Flow points={fork(1)} at={splitAt} dur={16} color={INK_SOFT} width={2} />
        {[
          { c: 0, text: "AI allowed", at: someAt },
          { c: 1, text: "AI banned", at: othersAt },
        ].map((head) => (
          <div
            key={head.text}
            style={{
              position: "absolute",
              left: colX(head.c),
              width: COL_W,
              top: headTop,
              textAlign: "center",
              ...note(30, INK),
              fontWeight: 650,
              opacity: headIn(head.at),
              transform: `translateY(${(1 - headIn(head.at)) * 8}px)`,
            }}
          >
            {head.text}
          </div>
        ))}
        <div
          style={{
            position: "absolute",
            left: colX(0),
            width: COL_W,
            top: y(CAPTION_Y),
            textAlign: "center",
            ...note(22, INK_SOFT),
            opacity: ease(frame, gradeAt - 2, 12),
          }}
        >
          graded on how you drive and check it
        </div>
        <div
          style={{
            position: "absolute",
            left: colX(1),
            width: COL_W,
            top: y(CAPTION_Y),
            textAlign: "center",
            ...note(22, INK_SOFT),
            opacity: ease(frame, practiceAt - 2, 12),
          }}
        >
          algorithm practice still matters: <span style={label(22, BLUE_INK)}>Part {partOf("be-algorithms")}</span>
        </div>
        {allowed.map((c, i) => (
          <Card key={c.name} c={0} i={i} company={c} out={cardsOut} />
        ))}
        {banned.map((c, i) => (
          <Card key={c.name} c={1} i={i} company={c} out={cardsOut} />
        ))}
        <div
          style={{
            position: "absolute",
            left: colX(0) + 22,
            top: y(CARD_Y) + 3 * h(CARD_STEP) + 4,
            ...label(22, BLUE_INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, allowedEnd - 10, 12) * (1 - ease(frame, cardsOut, 12)),
          }}
        >
          Part {partOf("be-ai-round")}: the AI-allowed round
        </div>

        {/* Why: the take-home an assistant finishes unseen, its envelope
            fading as "nobody sees how" is said, and gone before the time
            moves in under the fork. */}
        <Spot
          id="be-interview-envelope"
          at={takeAt}
          out={movedFrom - 18}
          dim={unseenAt}
          dimBy={0.5}
          left={COL_L}
          top={surveyTop + 76}
          width={ENVELOPE_W}
          height={ENVELOPE_H}
          phase={20}
          amp={3}
        />
        <div style={{ position: "absolute", left: TAKE_X, top: surveyTop + 102, opacity: panel }}>
          <div style={{ ...note(26, INK), whiteSpace: "nowrap", opacity: ease(frame, finishAt - 2, 12) }}>An assistant can finish a take-home,</div>
          <div style={{ ...note(26, INK), marginTop: 10, whiteSpace: "nowrap", opacity: ease(frame, unseenAt - 2, 12) }}>
            and <Mark at={unseenAt + 2}>nobody sees how.</Mark>
          </div>
        </div>

        {/* Karat's survey, sourced, with the page's caveat. */}
        <div style={{ position: "absolute", left: SURVEY_X, top: surveyTop, opacity: panel }}>
          <div style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap", opacity: ease(frame, karatAt - 2, 12) }}>
            Karat, <i>Engineering Interview Trends {KARAT.year}</i>
          </div>
          <div style={{ ...note(22, INK_SOFT), marginTop: 10, whiteSpace: "nowrap" }}>
            <span style={{ opacity: ease(frame, leadersAt - 2, 12) }}>
              <Num>{KARAT.leaders}</Num> engineering leaders.
            </span>{" "}
            <span style={{ opacity: ease(frame, sellsAt - 2, 12) }}>Karat sells interviewing services,</span>
          </div>
          <div style={{ ...note(22, INK_SOFT), marginTop: 4, whiteSpace: "nowrap", opacity: ease(frame, vendorAt - 2, 12) }}>
            so read these as <Mark at={vendorAt + 2}>one vendor&apos;s survey</Mark>
          </div>
        </div>
        <div style={{ opacity: panel }}>
          <SurveyBar top={surveyTop + 128} pct={KARAT.harderToAssess} at={harderAt}>
            say AI makes technical skills harder to assess
          </SurveyBar>
          <SurveyBar top={surveyTop + 228} pct={KARAT.stillProhibit} at={bannedAt}>
            of organizations still banned AI in technical interviews
          </SurveyBar>
        </div>

        {/* Where the time went: live rounds, three of them, each with the
            part that answers it, and the LLM topics design now takes in. */}
        <div style={{ position: "absolute", left: COL_L, top: surveyTop, ...note(28, INK), whiteSpace: "nowrap", opacity: moved }}>
          The time moved to live rounds, where the interviewer <Mark at={watchAt + 2}>watches you reason</Mark>
        </div>
        <Moved c={0} at={extendAt} title="Extend a multi-file project" part={<>Part {partOf("be-ai-round")}</>} />
        <Moved c={1} at={readAt} title="Read and debug unfamiliar code" part={<>Part {partOf("be-code-review")}</>} />
        <Moved
          c={2}
          at={designAt}
          title="Design discussion, with follow-ups"
          part={
            <>
              Parts {partOf("be-system-design")} and {partOf("be-scaling")}
            </>
          }
        />
        {/* What system design now takes in: one row under the three cards,
            its words, its chips and its part all at one size. */}
        <div
          style={{
            position: "absolute",
            left: COL_L,
            top: y(PANEL_Y) + 70 + h(108) + 44,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 24,
            whiteSpace: "nowrap",
            opacity: ease(frame, llmAt - 2, 12),
          }}
        >
          <span style={{ ...note(24, INK), marginRight: 6 }}>System design now takes in features that call an LLM:</span>
          {llmChips.map((c) => (frame >= c.at - 2 ? <Chip key={c.text} at={c.at} size={24}>{c.text}</Chip> : null))}
          <span style={{ ...label(24, BLUE_INK), marginLeft: 10, opacity: ease(frame, llmChips[3].at + 12, 12) }}>
            Part {partOf("be-ai-round")}
          </span>
        </div>

        {/* The advice, across the fork, between its two heads. */}
        <div
          style={{
            position: "absolute",
            left: 960 - 300,
            width: 600,
            top: headTop,
            textAlign: "center",
            ...note(28, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, askAt - 2, 12),
          }}
        >
          <Mark at={roundByRoundAt}>Ask the recruiter, for every round</Mark>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
