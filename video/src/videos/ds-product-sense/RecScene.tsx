import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { num, pct, SAMPLE } from "./data";
import { Chip, Clear, DATA, Drift, lerp, Mark, OK, OK_INK, Strike, Svg, X0 } from "./parts";

const ARMS = { top: 470, w: 300, h: 190, gap: 60 };
const RIGHT_X = 900;
const SIZE = { top: 590, w: 560, h: 40, gap: 70 };
const WEEKS = { top: 780, cell: 34, gap: 6 };
/** Question 9's alternatives, far enough left that each can carry what it does. */
const ALT_X = 880;

/**
 * Questions 8 and 9. The recommendation test as a design: twenty users
 * dealt at random into the old algorithm and the new one; the primary
 * metric, the guardrails, and the unit, the user, not the session; then its
 * size from DA Part 7's own formula (about fifteen thousand a group for 10%
 * to 11%, nearly four times that for half the lift) and two whole weeks with
 * their weekends lit. Then when a test can't run, and what runs instead,
 * each alternative with a line on what it does.
 */
export const RecScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("rec").from;
  const qAt = n.word("rec", "Question");
  const textAt = n.word("rec", "How would you design");
  const abAt = n.word("rec", "Make it an A B test");
  // The users queue up, one by one, as the question names who the algorithm serves.
  const queueAt = n.word("rec", "a new recommendation algorithm");
  const splitAt = n.word("rec", "users split at random");
  const algosAt = n.word("rec", "the old algorithm and the new one");
  const primaryAt = n.word("rec", "State one primary metric");
  const shareAt = n.word("rec", "the share of users who cook");
  const guardsAt = n.word("rec", "guardrails like latency and variety");
  const unitAt = n.word("rec", "split by user, not by session");
  const indepAt = n.word("rec", "sessions aren't independent");
  const sizeAt = n.word("rec-size", "Size it before launch");
  const baseAt = n.word("rec-size", "At a ten percent baseline");
  const fifteenAt = n.word("rec-size", "about fifteen thousand users per group");
  const halfAt = n.word("rec-size", "Half that lift");
  const fourAt = n.word("rec-size", "nearly four times as many");
  const weeksAt = n.word("rec-size", "run whole weeks");
  const weekendsAt = n.word("rec-size", "so the weekends count");
  const q9At = n.word("cant", "Question nine");
  const q9TextAt = n.word("cant", "When can't you run");
  const reasons = [
    { text: "the change is global", eg: "a redesign", at: n.word("cant", "When the change is global"), egAt: n.word("cant", "like a redesign") },
    { text: "users affect each other", eg: "a marketplace", at: n.word("cant", "When users affect each other"), egAt: n.word("cant", "as in a marketplace") },
    { text: "too few users", eg: "", at: n.word("cant", "too few of them"), egAt: 0 },
    { text: "it would be unethical", eg: "", at: n.word("cant", "when it would be unethical"), egAt: 0 },
  ];
  const switchAt = n.word("cant-instead", "randomize whole regions");
  const slotsAt = n.word("cant-instead", "switch the change on and off");
  const baselineAt = n.word("cant-instead", "compare against a baseline");
  // Each alternative with what it does, said as it is named.
  const methods = [
    {
      text: "difference-in-differences",
      at: n.word("cant-instead", "Difference-in-differences"),
      gloss: "treated regions' change − untreated regions'",
      glossAt: n.word("cant-instead", "how much the treated regions moved"),
    },
    {
      text: "a synthetic control",
      at: n.word("cant-instead", "A synthetic control"),
      gloss: "untreated regions weighted into a stand-in",
      glossAt: n.word("cant-instead", "weights untreated regions"),
    },
    {
      text: "an interrupted time series",
      at: n.word("cant-instead", "An interrupted time series"),
      gloss: "a break in the trend at the change",
      glossAt: n.word("cant-instead", "looks for a break in the trend"),
    },
  ];
  const tradesAt = n.word("cant-trade", "Each trades some rigor");
  const runAt = n.word("cant-trade", "something you can actually run");
  const numbersAt = n.word("size-in", "the numbers you build");
  const spotAt = n.word("size-in", "on the spot");
  const end = n.beat("size-in").to;

  const out8 = q9At - 4;

  // Twenty users, dealt alternately here for the picture: each slides from
  // the queue into its arm.
  const users = Array.from({ length: 20 }, (_, i) => {
    const arm = i % 2;
    const slot = Math.floor(i / 2);
    return {
      arm,
      x0: X0 + 20 + i * 34,
      y0: y(390),
      x1: X0 + arm * (ARMS.w + ARMS.gap) + 40 + (slot % 5) * 52,
      y1: y(ARMS.top) + h(96) + Math.floor(slot / 5) * h(46),
    };
  });
  const usersIn = ease(frame, queueAt, 14);
  const longest = Math.max(SAMPLE.perArm, SAMPLE.perArmHalf);

  return (
    <AbsoluteFill>
      <Sfx name="riffle" at={splitAt} level={-34} />
      <Sfx name="el-pencil" at={shareAt} level={-34} />
      <Sfx name="el-scratch" at={unitAt + 8} level={-32} />
      <Sfx name="slide" at={fifteenAt} level={-32} />
      <Sfx name="slide" at={fourAt} level={-32} />
      <Sfx name="el-sprinkle" at={weeksAt} level={-36} />
      {reasons.map((r) => (
        <Sfx key={r.text} name="el-tap" at={r.at} level={-34} />
      ))}
      {methods.map((m) => (
        <Sfx key={m.text} name="el-tap" at={m.at} level={-36} />
      ))}

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} out={out8} size={56}>
          How would you design an experiment for a new recommendation algorithm?
        </QuestionCard>

        {/* ── Question 8: the split ── */}
        <Note at={abAt} x={X0} y={y(330)} out={out8}>
          <span style={{ ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>an A/B test: users split at random</span>
        </Note>
        <Svg opacity={usersIn * (1 - ease(frame, out8, 10))}>
          {users.map((u, i) => {
            const t = ease(frame, splitAt + 4 + i * 1.2, 14);
            return (
              <circle key={i} cx={lerp(u.x0, u.x1, t)} cy={lerp(u.y0, u.y1, t)} r={13} fill={u.arm ? OK : DATA} opacity={ease(frame, queueAt + i * 2, 8)} />
            );
          })}
        </Svg>
        {[0, 1].map((arm) => (
          <Note key={arm} at={algosAt + arm * 6} x={X0 + arm * (ARMS.w + ARMS.gap)} y={y(ARMS.top)} out={out8}>
            <div
              style={{
                width: ARMS.w,
                height: h(ARMS.h),
                boxSizing: "border-box",
                border: `2.2px solid ${arm ? OK_INK : BLUE_INK}`,
                borderRadius: 12,
                padding: "14px 18px",
                ...note(26, arm ? OK_INK : BLUE_INK),
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {arm ? "B: the new algorithm" : "A: the old algorithm"}
            </div>
          </Note>
        ))}

        {/* The design: one primary metric, guardrails, the unit. */}
        <Note at={primaryAt} x={RIGHT_X} y={y(330)} out={out8}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>primary</b>
            <span style={{ opacity: ease(frame, shareAt, 12) }}>: share of users who cook a recommended recipe</span>
          </span>
        </Note>
        <Note at={guardsAt} x={RIGHT_X} y={y(384)} out={out8}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            <b>guardrails</b>: latency, variety
          </span>
        </Note>
        <Note at={unitAt} x={RIGHT_X} y={y(438)} out={out8}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            <b>unit</b>: the user, not the <Strike at={unitAt + 8}>session</Strike>
          </span>
        </Note>
        <Note at={indepAt} x={RIGHT_X + 24} y={y(482)} out={out8}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>one person&apos;s sessions aren&apos;t independent</span>
        </Note>

        {/* The size, before launch: DA Part 7's formula. */}
        <Note at={sizeAt} x={RIGHT_X} y={y(SIZE.top) - h(56)} out={out8}>
          <span style={{ ...note(27, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            users per group <span style={{ ...label(20, INK_SOFT), fontWeight: 500 }}>(80% power, 5% two-sided)</span>
          </span>
        </Note>
        {[
          { at: fifteenAt, n: SAMPLE.perArm, text: `${pct(SAMPLE.base)} → ${pct(SAMPLE.lift)}`, ink: BLUE_INK, fill: DATA },
          { at: halfAt, n: SAMPLE.perArmHalf, text: `${pct(SAMPLE.base)} → ${pct(SAMPLE.halfLift, 1)}`, ink: BLUE_INK, fill: DATA },
        ].map((b, i) => {
          const p = ease(frame, (i === 0 ? fifteenAt : fourAt) - 4, 18);
          const top = y(SIZE.top) + i * h(SIZE.gap);
          return (
            <React.Fragment key={i}>
              <Note at={i === 0 ? baseAt : halfAt} x={RIGHT_X} y={top + h(4)} out={out8}>
                <span style={{ ...label(22, INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>{b.text}</span>
              </Note>
              <Svg opacity={1 - ease(frame, out8, 10)}>
                <rect x={RIGHT_X + 170} y={top} width={(SIZE.w * b.n * p) / longest} height={h(SIZE.h)} fill={b.fill} opacity={0.85} rx={3} />
              </Svg>
              <Note at={(i === 0 ? fifteenAt : fourAt) + 8} x={RIGHT_X + 170 + (SIZE.w * b.n) / longest + 14} y={top + h(4)} out={out8}>
                <span style={{ ...label(22, b.ink), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>
                  {num(b.n)}
                  {i === 1 ? (
                    <>
                      {" "}
                      <Mark at={fourAt + 10}>({SAMPLE.ratio.toFixed(1)}×)</Mark>
                    </>
                  ) : null}
                </span>
              </Note>
            </React.Fragment>
          );
        })}

        {/* Whole weeks, weekends included. */}
        <Note at={weeksAt} x={X0} y={y(WEEKS.top) - h(44)} out={out8}>
          <span style={{ ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap" }}>run whole weeks</span>
        </Note>
        <Svg opacity={1 - ease(frame, out8, 10)}>
          {Array.from({ length: 14 }, (_, i) => {
            const p = ease(frame, weeksAt + i * 0.8, 8);
            const weekend = i % 7 >= 5;
            const lit = weekend ? ease(frame, weekendsAt, 12) : 0;
            return (
              <rect
                key={i}
                x={X0 + 300 + i * (WEEKS.cell + WEEKS.gap) + (i >= 7 ? 16 : 0)}
                y={y(WEEKS.top) - h(40)}
                width={WEEKS.cell * p}
                height={WEEKS.cell * p}
                rx={5}
                fill={`color-mix(in srgb, ${HIGHLIGHT} ${lit * 100}%, ${PAPER})`}
                stroke={INK_SOFT}
                strokeWidth={1.6}
              />
            );
          })}
        </Svg>

        {/* ── Question 9: when you can't, and what runs instead ── */}
        <Clear at={spotAt}>
          <QuestionCard n={9} at={q9At} textAt={q9TextAt - 2} size={56}>
            When can&apos;t you run an A/B test, and what do you do instead?
          </QuestionCard>
          {reasons.map((r, i) => (
            <Note key={r.text} at={r.at - 2} x={X0} y={y(340) + i * h(70)}>
              <span style={{ ...note(29, INK), whiteSpace: "nowrap" }}>
                <span style={{ color: ACCENT_INK, fontWeight: 700 }}>✕</span> {r.text}
                {r.eg ? <span style={{ color: INK_SOFT, opacity: ease(frame, r.egAt, 10) }}> ({r.eg})</span> : null}
              </span>
            </Note>
          ))}
          <Note at={switchAt - 2} x={ALT_X} y={y(340)}>
            <span style={{ ...note(29, INK), fontWeight: 650, whiteSpace: "nowrap" }}>instead:</span>
          </Note>
          <Chip x={ALT_X} y={y(396)} at={switchAt} size={25} ink={BLUE_INK}>
            randomize whole regions
          </Chip>
          <Chip x={ALT_X + 370} y={y(396)} at={slotsAt} size={25} ink={BLUE_INK}>
            or switch by time slot
          </Chip>
          <Note at={baselineAt} x={ALT_X} y={y(478)}>
            <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>or compare against a baseline:</span>
          </Note>
          {methods.map((m, i) => (
            <React.Fragment key={m.text}>
              <Chip x={ALT_X} y={y(526) + i * h(62)} at={m.at - 2} size={25} ink={BLUE_INK}>
                {m.text}
              </Chip>
              <Note at={m.glossAt} x={ALT_X + 386} y={y(526) + i * h(62) + h(9)}>
                <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>{m.gloss}</span>
              </Note>
            </React.Fragment>
          ))}
          <Note at={tradesAt} x={ALT_X} y={y(730)}>
            <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
              less rigor,{" "}
              <span style={{ opacity: ease(frame, runAt, 10) }}>
                <Mark at={numbersAt} color={`color-mix(in srgb, ${OK} 24%, transparent)`}>
                  but you can actually run it
                </Mark>
              </span>
            </span>
          </Note>
        </Clear>
      </Drift>
    </AbsoluteFill>
  );
};
