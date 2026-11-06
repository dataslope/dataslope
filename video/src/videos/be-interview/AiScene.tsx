import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { during, ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { KARAT, partOf } from "./data";
import { Drift, Flow, Headline, Kicker, Mark, Spot } from "./parts";

/** The fork: the coding round's heading at the top centre, and the two
 *  columns it splits into, each centred under its head. Layout units for
 *  positions (through y()), px across. Every group on this page is plain
 *  text held together by spacing: no cards, boxes or pills. */
const ROOT_Y = 262;
/** The heading's line, in px: the fork starts under it. */
const ROOT_LINE = 42;
const FORK_Y = 350;
const HEAD_Y = 392;
const CAPTION_Y = 434;
const COL_L = 120;
const COL_W = 760;
const COL_GAP = 160;
const colX = (c: number) => COL_L + c * (COL_W + COL_GAP);
const colCx = (c: number) => colX(c) + COL_W / 2;
/** The formats under each head, one centred line each. */
const ROWS_Y = 500;
const ROW_STEP = 64;
/** The take-home and the survey, under the fork once the cards go. The
 *  envelope (1024 by 868) is the scene's one spot, 180 by 153, with the
 *  take-home's two lines a clear 90px to its right. */
const PANEL_Y = 500;
const ENVELOPE_W = 180;
const ENVELOPE_H = 153;
const TAKE_X = COL_L + ENVELOPE_W + 90;
/** The take-home's lines run about 450px at 26px. The survey's block, its
 *  source to its second bar, in px: the caveat sits 10px under the title,
 *  each stat 40px under what comes before it, each label 12px over its own
 *  bar, so the space between groups is clearly larger than inside one. */
const TAKE_W = 450;
const SURVEY_X = 1080;
const STAT_1 = 146;
const STAT_2 = 266;
const SURVEY_H = 344;
const TRACK_W = 560;
/** Where the time went: three columns of text under the fork, spread
 *  across the page's width with a hairline centred in each gap. */
const MOVED_R = 1800;
/** How far the three blocks, and the LLM row under them, sit below the
 *  sentence that introduces them, in px. */
const MOVED_DROP = 76;
const LLM_DROP = 196;

type Format = { text: string; at: number };

/** One kind of round, as a centred line of text under its column's head.
 *  Formats, not companies, so the video does not date. Neutral ink in both
 *  columns: neither kind of round is the right answer, so neither is green
 *  or red. */
const FormatRow: React.FC<{ c: number; i: number; format: Format; out: number }> = ({ c, i, format, out }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const p = ease(frame, format.at - 2, 14) * (1 - ease(frame, out, 12));
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: colX(c),
        top: y(ROWS_Y) + i * h(ROW_STEP),
        width: COL_W,
        textAlign: "center",
        ...note(28, INK),
        whiteSpace: "nowrap",
        opacity: p,
        transform: `translateY(${(1 - p) * 12}px)`,
      }}
    >
      {format.text}
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

/** One of the three places the time went: its name and the part that
 *  answers it, as a block of text in the row's flow. It holds its place
 *  before it inks, so the row never reflows. */
const Moved: React.FC<{ at: number; title: string; part: React.ReactNode }> = ({ at, title, part }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at - 2, 14);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
      <div style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>{title}</div>
      <div style={{ ...label(22, BLUE_INK), marginTop: 10, whiteSpace: "nowrap", opacity: ease(frame, at + 12, 12) }}>{part}</div>
    </div>
  );
};

/** A vertical hairline between two side-by-side columns, as tall as their
 *  text, inking in with the column to its right. */
const Divider: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  return <div style={{ width: 1, alignSelf: "stretch", background: HAIRLINE, opacity: ease(frame, at - 2, 14) }} />;
};

/**
 * What AI has changed, answering the AI page's "How have coding interviews
 * changed since AI assistants became standard?". The coding round as one
 * heading that forks into two columns, AI allowed and AI banned, each filling
 * with the two formats the page's table describes as they are said (formats,
 * not companies, so the video does not date), and Part 9 under the allowed
 * column. Then, under the fork, why: a take-home an assistant
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
  const llmTopics = [
    { text: "streaming", at: n.word("ai-llm", "streaming") },
    { text: "retries", at: n.word("ai-llm", "retries") },
    { text: "cost in tokens", at: n.word("ai-llm", "cost measured in tokens") },
    { text: "prompt injection", at: n.word("ai-llm", "prompt injection") },
  ];
  const askAt = n.word("ai-ask", "Ask the recruiter");
  const roundByRoundAt = n.word("ai-ask", "round by round");
  const practiceAt = n.word("ai-ask", "Algorithm practice still matters");
  const end = n.beat("ai-ask").to;

  const allowed: Format[] = [
    { text: "Extend a multi-file project, assistant built in", at: n.word("ai-allowed-who", "an hour extending a multi-file project") },
    { text: "Read, debug and speed up unfamiliar code", at: n.word("ai-allowed-who", "unfamiliar code to read, debug and speed up") },
  ];
  const banned: Format[] = [
    { text: "Unapproved AI can disqualify you", at: n.word("ai-banned", "Using one without permission") },
    { text: "Some rounds back in person", at: n.word("ai-banned", "some rounds are back in person") },
  ];

  // The formats give way to the take-home and the survey, and those to where
  // the time went, each in the pause before its beat.
  const cardsOut = whyFrom - 10;
  const panel = during(frame, finishAt - 4, movedFrom - 6, 10);

  const rootTop = y(ROOT_Y);
  const rootBottom = rootTop + ROOT_LINE;
  const forkY = y(FORK_Y);
  const headTop = y(HEAD_Y);
  const fork = (c: number): [number, number][] => [
    [960, rootBottom + 8],
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
      {[...allowed, ...banned].map((f) => (
        <Sfx key={f.text} name="el-tap" at={f.at} level={-33} />
      ))}
      <Sfx name="el-pop" at={takeAt} level={-30} />
      <Sfx name="el-tap" at={karatAt} level={-33} />
      <Sfx name="el-whoosh" at={harderAt + 4} level={-36} />
      <Sfx name="el-whoosh" at={bannedAt + 4} level={-36} />
      {[extendAt, readAt, designAt].map((at) => (
        <Sfx key={at} name="el-tap" at={at} level={-32} />
      ))}
      {llmTopics.map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at} level={-35} />
      ))}
      <Sfx name="el-pencil" at={roundByRoundAt} level={-35} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <Kicker at={from}>How AI has changed the interview</Kicker>
        <Headline lead="Since 2025," turn="it has split in two." at={sinceAt} turnAt={splitAt} size={62} />

        {/* The coding round, a plain heading, then the fork into its two
            kinds. */}
        <div
          style={{
            position: "absolute",
            left: 960 - 300,
            width: 600,
            top: rootTop,
            height: ROOT_LINE,
            textAlign: "center",
            ...note(32, INK),
            fontWeight: 650,
            lineHeight: `${ROOT_LINE}px`,
            opacity: ease(frame, roundAt - 2, 12),
          }}
        >
          Coding round
        </div>
        <Flow points={fork(0)} at={splitAt} dur={16} color={INK_SOFT} width={2} />
        <Flow points={fork(1)} at={splitAt} dur={16} color={INK_SOFT} width={2} />
        {/* Both kinds are named as the round splits, where the two arrows
            land, so neither arrow points at an empty page while the first
            column fills. */}
        {[
          { c: 0, text: "AI allowed", at: splitAt + 14, read: during(frame, someAt - 2, othersAt - 4, 10) },
          { c: 1, text: "AI banned", at: splitAt + 18, read: during(frame, othersAt - 2, cardsOut, 10) },
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
            {/* The kind being read carries the highlighter, its words given
                back as margin so the page does not shift. */}
            <span
              style={{
                padding: "2px 12px 3px",
                margin: "0 -12px",
                borderRadius: 8,
                background: `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(head.read * 100)}%, transparent)`,
              }}
            >
              {head.text}
            </span>
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
        {allowed.map((f, i) => (
          <FormatRow key={f.text} c={0} i={i} format={f} out={cardsOut} />
        ))}
        {banned.map((f, i) => (
          <FormatRow key={f.text} c={1} i={i} format={f} out={cardsOut} />
        ))}
        <div
          style={{
            position: "absolute",
            left: colX(0),
            width: COL_W,
            textAlign: "center",
            top: y(ROWS_Y) + 2 * h(ROW_STEP) + 18,
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
          top={surveyTop + 96}
          width={ENVELOPE_W}
          height={ENVELOPE_H}
          phase={20}
          amp={3}
        />
        {/* Level with the middle of the survey beside it. */}
        <div style={{ position: "absolute", left: TAKE_X, top: surveyTop + 136, opacity: panel }}>
          <div style={{ ...note(26, INK), whiteSpace: "nowrap", opacity: ease(frame, finishAt - 2, 12) }}>An assistant can finish a take-home,</div>
          <div style={{ ...note(26, INK), marginTop: 10, whiteSpace: "nowrap", opacity: ease(frame, unseenAt - 2, 12) }}>
            and <Mark at={unseenAt + 2}>nobody sees how.</Mark>
          </div>
        </div>

        {/* A hairline between the take-home and the survey, as tall as the
            survey, centred in the gap between the two, inking in with the
            survey on its right. */}
        <div
          style={{
            position: "absolute",
            left: (TAKE_X + TAKE_W + SURVEY_X) / 2,
            top: surveyTop + 4,
            width: 1,
            height: SURVEY_H,
            background: HAIRLINE,
            opacity: panel * ease(frame, karatAt - 2, 14),
          }}
        />

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
          <SurveyBar top={surveyTop + STAT_1} pct={KARAT.harderToAssess} at={harderAt}>
            say AI makes technical skills harder to assess
          </SurveyBar>
          <SurveyBar top={surveyTop + STAT_2} pct={KARAT.stillProhibit} at={bannedAt}>
            of organizations still banned AI in technical interviews
          </SurveyBar>
        </div>

        {/* Where the time went: live rounds, three of them, each with the
            part that answers it, and the LLM topics design now takes in. */}
        <div style={{ position: "absolute", left: COL_L, top: surveyTop, ...note(28, INK), whiteSpace: "nowrap", opacity: moved }}>
          The time moved to live rounds, where the interviewer <Mark at={watchAt + 2}>watches you reason</Mark>
        </div>
        {/* The three spread across the page, so each hairline sits centred
            between the text either side of it (about 120px from each). */}
        <div
          style={{
            position: "absolute",
            left: COL_L,
            width: MOVED_R - COL_L,
            top: y(PANEL_Y) + MOVED_DROP,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "stretch",
          }}
        >
          <Moved at={extendAt} title="Extend a multi-file project" part={<>Part {partOf("be-ai-round")}</>} />
          <Divider at={readAt} />
          <Moved at={readAt} title="Read and debug unfamiliar code" part={<>Part {partOf("be-code-review")}</>} />
          <Divider at={designAt} />
          <Moved
            at={designAt}
            title="Design discussion, with follow-ups"
            part={
              <>
                Parts {partOf("be-system-design")} and {partOf("be-scaling")}
              </>
            }
          />
        </div>
        {/* What system design now takes in: one line of words under the
            three blocks, its topics joined by middle dots, all at one size. */}
        <div
          style={{
            position: "absolute",
            left: COL_L,
            top: y(PANEL_Y) + LLM_DROP,
            ...note(24, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, llmAt - 2, 12),
          }}
        >
          System design now takes in features that call an LLM:{" "}
          {llmTopics.map((t, k) => (
            <span key={t.text} style={{ fontWeight: 650, opacity: ease(frame, t.at - 2, 10) }}>
              {k ? <span style={{ fontWeight: 500, color: INK_SOFT }}> · </span> : null}
              {t.text}
            </span>
          ))}
          <span style={{ ...label(24, BLUE_INK), marginLeft: 22, opacity: ease(frame, llmTopics[3].at + 12, 12) }}>
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
