import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, TABULAR, body, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { DIFFS, LINES, LOUD } from "./data";
import {
  Card,
  Code,
  Cross,
  DiffListing,
  diffWidth,
  Drift,
  FileTab,
  Mark,
  MARK_BAD,
  OK_INK,
  pulse,
  Source,
  Spot,
  Tick,
  X0,
} from "./parts";

const CARD_W = 370;
const CARD_H = 230;
const COL = 430;
const ROW_GAP = 28;
const SIZE = 20;

/** The survey's two numbers, as the page words them (its footnote: Stack
 *  Overflow, 2025 Developer Survey, AI section). */
const SURVEY = [
  { pct: 66, text: "named AI solutions that are almost right, but not quite, their top frustration" },
  { pct: 45, text: "said debugging AI-generated code takes longer than expected" },
];

/** A row of a card: words at the card's own size, set as running text.
 *  `icon` puts a tick or a cross before it. */
const Line: React.FC<{ at: number; children: React.ReactNode; color?: string; size?: number; icon?: React.ReactNode }> = ({
  at,
  children,
  color = INK,
  size = 21,
  icon,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ ...note(size, color), whiteSpace: "nowrap", opacity: ease(frame, at, 10), display: "flex", alignItems: "center", gap: 12, fontSize: size }}>
      {icon ? <span style={{ width: 24, display: "flex", justifyContent: "center", flex: "none" }}>{icon}</span> : null}
      <span>{children}</span>
    </div>
  );
};

/** An operator in the mono face, in its verdict's ink. */
const Op: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <span style={{ fontFamily: MONO, fontWeight: 500, color, fontVariantLigatures: "none" }}>{children}</span>
);

/** The rule between two columns of text: 1px, centred in the gap, drawn
 *  down on `at` (with the column to its right), gone on `out`. */
const ColumnRule: React.FC<{ x: number; top: number; height: number; at: number; out?: number }> = ({ x, top, height, at, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return <div style={{ position: "absolute", left: x, top, width: 1, height: height * p, background: HAIRLINE, opacity: 1 - o }} />;
};

/** One assumption ("sorted?"), plain, after a middle dot unless it leads. */
const Assumed: React.FC<{ at: number; first?: boolean; children: React.ReactNode }> = ({ at, first, children }) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ opacity: ease(frame, at, 10) }}>
      {first ? null : <span style={{ color: INK_SOFT }}> · </span>}
      {children}
    </span>
  );
};

/** One line the diff adds: its sign, then what the line does, the asked-for
 *  change in green and what slipped in beside it in red. */
const DiffRow: React.FC<{ at: number; add: boolean; children: React.ReactNode }> = ({ at, add, children }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: ease(frame, at, 10), whiteSpace: "nowrap", fontSize: 22 }}>
      <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 500, color: add ? OK_INK : ACCENT_INK }}>+</span>
      <span style={note(22, add ? INK : ACCENT_INK)}>{children}</span>
    </div>
  );
};

/**
 * Question 1: the bugs assistants characteristically write. Code that is
 * almost right, with the survey's two numbers; then the seven kinds as cards,
 * each with a few tokens of code (an invented parameter really run, and the
 * TypeError it really raised). Which make a noise: the invented API's card
 * lights, the six quiet ones go gray, and the three that are in our diff
 * (boundaries, assumptions, tests that agree) lift out above it.
 */
export const BugsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("bugs").from;
  const qAt = n.word("bugs", "Question one");
  const textAt = n.word("bugs", "What kinds of bugs");
  const almostAt = n.word("bugs", "Code that is almost right");
  const sixtyAt = n.word("bugs-survey", "sixty-six percent");
  const fortyAt = n.word("bugs-survey", "Forty-five percent");
  const suspectsAt = n.word("bugs-edge", "The usual suspects");
  const boundAt = n.word("bugs-edge", "Boundaries");
  const offAt = n.word("bugs-edge", "an off-by-one");
  const ltAt = n.word("bugs-edge", "a less-than where");
  const emptyAt = n.word("bugs-edge", "the empty input");
  const windowAt = n.word("bugs-edge", "the exact edge of a window");
  const assumeAt = n.word("bugs-assume", "Unstated assumptions");
  const sortedAt = n.word("bugs-assume", "sorted");
  const uniqueAt = n.word("bugs-assume", "unique");
  const nullAt = n.word("bugs-assume", "never null");
  const asciiAt = n.word("bugs-assume", "plain ASCII");
  const apiAt = n.word("bugs-api", "Invented APIs");
  const paramAt = n.word("bugs-api", "a parameter");
  const sigAt = n.word("bugs-api", "called with the wrong signature");
  const packageAt = n.word("bugs-api", "An invented package name");
  const registerAt = n.word("bugs-api", "an attacker can register it");
  const swallowAt = n.word("bugs-errors", "Swallowed errors");
  const broadAt = n.word("bugs-errors", "a broad except");
  const hidesAt = n.word("bugs-errors", "hides the failure");
  const secAt = n.word("bugs-errors", "And security");
  const sqlAt = n.word("bugs-errors", "SQL built by string formatting");
  const secretsAt = n.word("bugs-errors", "secrets pasted into the code");
  const authAt = n.word("bugs-errors", "a missing authorization check");
  const agreeAt = n.word("bugs-tests", "Tests that agree with the bug");
  const assertAt = n.word("bugs-tests", "assert what the code does");
  const proveAt = n.word("bugs-tests", "prove nothing");
  const creepAt = n.word("bugs-tests", "And scope creep");
  const renamedAt = n.word("bugs-tests", "renamed variables");
  const reformatAt = n.word("bugs-tests", "reformatted files");
  const unrelatedAt = n.word("bugs-tests", "unrelated edits");
  const failsAt = n.word("bugs-past", "An invented API fails");
  const registeredAt = n.word("bugs-past", "unless someone has registered the package");
  const quietAt = n.word("bugs-past", "The other six run quietly");
  const diffAt = n.word("bugs-past", "Three of them are in our diff");
  const end = n.beat("bugs-past").to;

  const R1 = y(330);
  const R2 = R1 + CARD_H + ROW_GAP;
  const cx = (i: number) => X0 + i * COL;
  /** The rule left of column i, centred in the gap before it. */
  const rule = (i: number) => Math.round(cx(i) - (COL - CARD_W) / 2);
  const ruleH = CARD_H - 44;

  // The survey, gone when the cards arrive.
  const surveyOut = suspectsAt - 8;
  const barScale = 12;

  // What happens to the cards at the end: the loud one lights, the quiet six
  // go gray, and the three in our diff lift out above it.
  const gone = diffAt - 6;
  const lift = diffAt + 2;

  const [kind, ...rest] = (LOUD.error ?? "").split(": ");
  const message = rest.join(": ");
  const glow = pulse(frame, failsAt + 4, 24);

  const fn = DIFFS.arrived["intervals.py"];
  const tests = DIFFS.arrived["test_intervals.py"];
  const fnW = diffWidth(fn, SIZE);
  const diffTop = R2 + 44;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={textAt + 6} level={-30} />
      <Sfx name="el-pencil" at={sixtyAt} level={-34} />
      <Sfx name="el-pencil" at={fortyAt} level={-34} />
      {[boundAt, assumeAt, apiAt, swallowAt, secAt, agreeAt, creepAt].map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-34} />
      ))}
      <Sfx name="el-scratch" at={sigAt + 4} level={-34} />
      <Sfx name="el-tap" at={failsAt + 4} level={-28} />
      <Sfx name="el-whoosh" at={quietAt} level={-38} />
      <Sfx name="el-whoosh" at={lift} level={-36} />
      <Sfx name="el-pencil" at={lift + 14} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={60} width={1300}>
          What kinds of bugs do AI assistants characteristically introduce?
        </QuestionCard>
        <Spot id="be-code-review-beetle" at={textAt + 6} left={1590} top={120} width={140} height={150} />

        {/* ── Code that is almost right: the survey ── */}
        <Ink at={almostAt - 2} dur={18} out={surveyOut} style={{ left: 96, top: y(318), ...body(38, true), color: INK, whiteSpace: "nowrap" }}>
          Code that is almost right.
        </Ink>
        {SURVEY.map((s, i) => {
          const at = i === 0 ? sixtyAt : fortyAt;
          const top = y(400 + i * 150);
          const w = s.pct * barScale * ease(frame, at, 22);
          return (
            <React.Fragment key={i}>
              <Note at={at - 4} x={X0} y={top} out={surveyOut}>
                <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>{s.text}</span>
              </Note>
              <div
                style={{
                  position: "absolute",
                  left: X0,
                  top: top + 46,
                  width: w,
                  height: 48,
                  background: BAR,
                  borderRadius: 3,
                  opacity: 1 - ease(frame, surveyOut, 10),
                }}
              />
              <Note at={at + 14} x={X0 + w + 22} y={top + 44} out={surveyOut}>
                <span style={{ ...note(38, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>
                  <span style={TABULAR}>{s.pct}</span>%
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={fortyAt + 20} x={X0} y={y(720)} out={surveyOut}>
          <Source>Stack Overflow, 2025 Developer Survey, AI section</Source>
        </Note>

        {/* ── Seven kinds ── */}
        <Card x={cx(0)} y={R1} w={CARD_W} h={CARD_H} at={boundAt - 4} title="Boundaries" dim={quietAt} undim={lift - 4}>
          <Line at={ltAt} size={26} color={INK_SOFT}>
            <Op color={ACCENT_INK}>&lt;</Op> where <Op color={OK_INK}>&lt;=</Op> belongs
          </Line>
          <Line at={offAt}>
            an off-by-one<span style={{ opacity: ease(frame, emptyAt, 10) }}>, the empty input</span>
          </Line>
          <Line at={windowAt}>the exact edge of a window</Line>
        </Card>

        <Card x={cx(1)} y={R1} w={CARD_W} h={CARD_H} at={assumeAt - 4} title="Unstated assumptions" dim={quietAt} undim={lift - 4}>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Assumed at={sortedAt} first>
              sorted?
            </Assumed>
            <Assumed at={uniqueAt}>unique?</Assumed>
          </div>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Assumed at={nullAt} first>
              not null?
            </Assumed>
            <Assumed at={asciiAt}>ASCII?</Assumed>
          </div>
        </Card>

        <Card x={cx(2)} y={R1} w={COL + CARD_W} h={CARD_H} at={apiAt - 4} title="Invented APIs" dim={quietAt} undim={failsAt} alarm={failsAt + 2} out={gone}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, opacity: ease(frame, paramAt - 4, 10) }}>
            {LOUD.code.map((l, i) => (
              <div key={i} style={{ fontSize: 21, whiteSpace: "pre" }}>
                {l.includes("inplace") ? (
                  <>
                    <Code line={l.slice(0, l.indexOf("inplace"))} size={21} />
                    <Mark at={paramAt + 4} color={MARK_BAD}>
                      <Code line="inplace=True" size={21} />
                    </Mark>
                    <Code line={l.slice(l.indexOf("inplace") + "inplace=True".length)} size={21} />
                  </>
                ) : (
                  <Code line={l} size={21} />
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              borderLeft: `4px solid ${ACCENT}`,
              background: `color-mix(in srgb, ${ACCENT} ${9 + 14 * glow}%, ${PAPER})`,
              padding: "6px 14px 8px",
              fontFamily: MONO,
              fontSize: 19,
              color: INK,
              whiteSpace: "nowrap",
              fontVariantLigatures: "none",
              opacity: ease(frame, sigAt + 4, 10),
            }}
          >
            <span style={{ color: ACCENT_INK, fontWeight: 500 }}>{kind}:</span> {message}
          </div>
          <Line at={packageAt} color={ACCENT_INK}>
            an invented package name:{" "}
            <span style={{ opacity: ease(frame, registerAt - 2, 10) }}>
              <Mark at={registeredAt} color={MARK_BAD}>
                an attacker can register it
              </Mark>
            </span>
          </Line>
        </Card>

        <Card x={cx(0)} y={R2} w={CARD_W} h={CARD_H} at={swallowAt - 4} title="Swallowed errors" dim={quietAt} out={gone}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, opacity: ease(frame, broadAt - 2, 10) }}>
            <Code line="except Exception:" size={21} />
            <Code line="    pass" size={21} />
          </div>
          <Line at={hidesAt} color={ACCENT_INK}>
            hides the failure from the caller
          </Line>
        </Card>

        <Card x={cx(1)} y={R2} w={CARD_W} h={CARD_H} at={secAt - 4} title="Security" dim={quietAt} out={gone}>
          <div style={{ opacity: ease(frame, sqlAt - 2, 10), fontSize: 20 }}>
            <Code line={'f"... WHERE id = {user_id}"'} size={20} />
          </div>
          <Line at={secretsAt}>a secret pasted into the code</Line>
          <Line at={authAt}>a missing authorization check</Line>
        </Card>

        <Card
          x={cx(2)}
          y={R2}
          w={CARD_W}
          h={CARD_H}
          at={agreeAt - 4}
          title="Tests that agree with the bug"
          dim={quietAt}
          undim={lift - 4}
          to={{ x: cx(2), y: R1, at: lift }}
        >
          <Line at={assertAt} color={ACCENT_INK} icon={<Cross at={assertAt + 4} size={20} />}>
            asserts what the code does
          </Line>
          <Line at={proveAt - 10} color={OK_INK} icon={<Tick at={proveAt - 6} size={22} />}>
            passes, <Mark at={proveAt}>and proves nothing</Mark>
          </Line>
        </Card>

        <Card x={cx(3)} y={R2} w={CARD_W} h={CARD_H} at={creepAt - 4} title="Scope creep" dim={quietAt} out={gone}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <DiffRow at={creepAt + 4} add>
              the change asked for
            </DiffRow>
            <DiffRow at={renamedAt} add={false}>
              renamed variables
            </DiffRow>
            <DiffRow at={reformatAt} add={false}>
              reformatted files
            </DiffRow>
            <DiffRow at={unrelatedAt} add={false}>
              unrelated edits
            </DiffRow>
          </div>
        </Card>

        {/* ── Rules between the columns, each with the column to its right ── */}
        <ColumnRule x={rule(1)} top={R1 + 14} height={ruleH} at={assumeAt - 4} />
        <ColumnRule x={rule(2)} top={R1 + 14} height={ruleH} at={apiAt - 4} />
        <ColumnRule x={rule(1)} top={R2 + 14} height={ruleH} at={secAt - 4} out={gone} />
        <ColumnRule x={rule(2)} top={R2 + 14} height={ruleH} at={agreeAt - 4} out={gone} />
        <ColumnRule x={rule(3)} top={R2 + 14} height={ruleH} at={creepAt - 4} out={gone} />

        {/* ── Three of them are in our diff ── */}
        <FileTab x={X0} top={diffTop - 44} at={lift + 10} name="intervals.py">
          +{LINES} lines
        </FileTab>
        <DiffListing lines={fn} x={X0} top={diffTop} width={fnW} size={SIZE} at={lift + 10} />
        <FileTab x={X0 + fnW + 48} top={diffTop - 44} at={lift + 16} name="test_intervals.py">
          +{tests.length} lines
        </FileTab>
        <DiffListing lines={tests} x={X0 + fnW + 48} top={diffTop} width={diffWidth(tests, SIZE)} size={SIZE} at={lift + 16} />
      </Drift>
    </AbsoluteFill>
  );
};
