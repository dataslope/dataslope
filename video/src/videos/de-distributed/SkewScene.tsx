import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds, inkOf } from "../../theme/brand";
import { at as atScale, Axes, type Scale } from "../da-statistics-communication/parts";
import { count, SKEW } from "./data";
import { Chip, Drift, OK, OK_INK, Svg } from "./parts";

const X0 = 210;
const BAR_W = 74;
const GAP = 24;
const R_X = 1090;
const HOT = ds("orange", 500);
const HOT_INK = inkOf.orange;

/** Rows per partition that are not the guest's: the same before and after salting. */
const NORMAL = SKEW.before.map((v, i) => v - (i === SKEW.guestPartition ? SKEW.guestRows : 0));
/** The guest's rows in each partition, before and after. */
const GUEST_BEFORE = SKEW.before.map((_, i) => (i === SKEW.guestPartition ? SKEW.guestRows : 0));
const GUEST_AFTER = SKEW.after.map((v, i) => v - NORMAL[i]);
const MAX_AFTER = SKEW.after.indexOf(SKEW.maxAfter);

/**
 * Question 9, on the video's own model: a million rows in eight partitions
 * by hash of the key, a "guest" key on 30% of them. Its partition holds
 * 387,836 rows, 3.1 times the 125,000 average. Salted with a suffix 0 to 7,
 * the guest's rows spread over all eight, and the largest holds about the
 * average, which never moved. Then the two-step count, and the other fixes.
 */
export const SkewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("skew").from;
  const qAt = n.word("skew", "Question nine");
  const textAt = n.word("skew", "What is data skew");
  const fewAt = n.word("skew", "a few partitions holding far more");
  const keyAt = n.word("skew", "one key is common");
  const causes = [
    { text: "a null", at: n.word("skew", "a null") },
    { text: "a guest user", at: n.word("skew", "a guest user") },
    { text: "one huge customer", at: n.word("skew", "one huge customer") },
  ];
  const modelAt = n.word("skew-model", "a million rows in eight partitions");
  const thirtyAt = n.word("skew-model", "guest key on thirty percent");
  const avgAt = n.word("skew-model", "The average partition holds");
  const guestsAt = n.word("skew-model", "The guest's holds");
  const timesAt = n.word("skew-model", "three point one times as many");
  const waitAt = n.word("skew-model", "every core waits for it");
  const saltAt = n.word("skew-salt", "The fix is salting");
  const suffixAt = n.word("skew-salt", "add a random suffix");
  const spreadAt = n.word("skew-salt", "spreads over all eight partitions");
  const largestAt = n.word("skew-salt", "Now the largest holds about the average");
  const neverAt = n.word("skew-salt", "which never moved");
  const stageAt = n.word("skew-salt", "The stage waits for the largest");
  const twoAt = n.word("skew-steps", "aggregate in two steps");
  const saltedAt = n.word("skew-steps", "by the salted key");
  const thenAt = n.word("skew-steps", "and then by the key");
  const nullsAt = n.word("skew-steps", "handle nulls and stand-in keys separately");
  const aqeAt = n.word("skew-steps", "adaptive query execution");
  const end = n.beat("skew-steps").to;

  const sx = (i: number) => X0 + i * (BAR_W + GAP);
  const sy: Scale = { lo: 0, hi: 400_000, a: y(872), b: y(372) };
  const yOf = (v: number) => atScale(sy, v);
  const grow = (i: number) => ease(frame, modelAt + 4 + i * 2, 14);
  const hotIn = ease(frame, thirtyAt, 16);
  const spread = (i: number) => ease(frame, spreadAt + 2 + i * 3, 18);
  const meanY = yOf(SKEW.mean);

  return (
    <AbsoluteFill>
      {causes.map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at} level={-37} />
      ))}
      <Sfx name="el-sprinkle" at={modelAt + 4} level={-37} />
      <Sfx name="el-pop" at={thirtyAt + 4} level={-35} />
      <Sfx name="el-pencil" at={avgAt} level={-37} />
      <Sfx name="el-tap" at={timesAt} level={-35} />
      <Sfx name="el-whoosh" at={spreadAt + 2} level={-35} />
      <Sfx name="el-chime" at={largestAt + 6} level={-36} />
      <Sfx name="el-tap" at={saltedAt} level={-37} />
      <Sfx name="el-tap" at={thenAt} level={-37} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is data skew, and how do you fix it?
        </QuestionCard>

        {/* ── The model's eight partitions ── */}
        <Note at={modelAt - 2} x={120} y={y(316)}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap" }}>
            A model: rows per partition, <Num>{count(SKEW.rows)}</Num> rows in <Num>{SKEW.partitions}</Num>
          </span>
        </Note>
        <Axes
          x={{ lo: 0, hi: 1, a: X0 - 24, b: sx(SKEW.partitions - 1) + BAR_W + 24 }}
          y={sy}
          xTicks={[]}
          yTicks={[0, 100_000, 200_000, 300_000, 400_000]}
          yFormat={(v) => (v === 0 ? "0" : `${v / 1000}k`)}
          at={modelAt}
          size={19}
        />
        <Svg>
          {SKEW.before.map((_, i) => {
            const g = grow(i);
            const normalTop = yOf(NORMAL[i] * g);
            const guest = GUEST_BEFORE[i] * hotIn + (GUEST_AFTER[i] - GUEST_BEFORE[i]) * spread(i);
            const guestTop = yOf(NORMAL[i] * g + guest);
            const isHot = i === SKEW.guestPartition;
            const before = ease(frame, timesAt, 10) * (1 - spread(i));
            return (
              <g key={i}>
                <rect x={sx(i)} y={normalTop} width={BAR_W} height={Math.max(0, sy.a - normalTop)} fill={`color-mix(in srgb, ${BAR} 50%, ${PAPER})`} />
                {guest > 0 ? <rect x={sx(i)} y={guestTop} width={BAR_W} height={Math.max(0, normalTop - guestTop)} fill={`color-mix(in srgb, ${HOT} 62%, ${PAPER})`} /> : null}
                {isHot && before > 0 ? (
                  <rect x={sx(i) - 3} y={guestTop - 3} width={BAR_W + 6} height={sy.a - guestTop + 3} fill="none" stroke={ACCENT} strokeWidth={3} opacity={before} />
                ) : null}
                {i === MAX_AFTER ? (
                  <rect x={sx(i) - 3} y={yOf(SKEW.after[i]) - 3} width={BAR_W + 6} height={sy.a - yOf(SKEW.after[i]) + 3} fill="none" stroke={OK} strokeWidth={3} opacity={ease(frame, largestAt + 4, 10)} />
                ) : null}
              </g>
            );
          })}
          {/* The average: the same line before and after. */}
          <line x1={X0 - 24} x2={sx(SKEW.partitions - 1) + BAR_W + 24} y1={meanY} y2={meanY} stroke={INK} strokeWidth={2} strokeDasharray="7 6" opacity={ease(frame, avgAt, 12)} />
        </Svg>
        {SKEW.before.map((_, i) => (
          <div key={i} style={{ position: "absolute", left: sx(i), width: BAR_W, top: sy.a + 8, textAlign: "center", ...label(19, INK_SOFT), opacity: grow(i) }}>
            {i + 1}
          </div>
        ))}
        <Note at={avgAt + 2} x={sx(2)} y={meanY - h(36)}>
          <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            average <Num>{count(SKEW.mean)}</Num>
            <span style={{ opacity: ease(frame, neverAt, 10), color: INK_SOFT }}>, never moves</span>
          </span>
        </Note>
        <Note at={guestsAt} x={sx(1) - 4} y={yOf(SKEW.maxBefore) - h(8)} out={spreadAt + 6}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            <Num>{count(SKEW.maxBefore)}</Num>
            <span style={{ opacity: ease(frame, timesAt, 10) }}>
              , <Num>{SKEW.ratioBefore}</Num> × the average
            </span>
          </span>
        </Note>
        <Note at={largestAt + 4} x={sx(MAX_AFTER) + BAR_W / 2 - 110} y={meanY - h(78)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            largest <Num>{count(SKEW.maxAfter)}</Num>
          </span>
        </Note>

        {/* ── What causes it, and the fix ── */}
        <Note at={keyAt - 2} x={R_X} y={y(334)}>
          <span style={{ display: "flex", gap: 10, alignItems: "center", whiteSpace: "nowrap" }}>
            <span style={{ ...note(23, INK_SOFT) }}>one common key:</span>
            {causes.map((c) => (
              <span key={c.text} style={{ opacity: ease(frame, c.at - 2, 10) }}>
                <Chip color={HOT} ink={HOT_INK} size={21}>
                  {c.text}
                </Chip>
              </span>
            ))}
          </span>
        </Note>
        <Note at={fewAt} x={R_X} y={y(398)} out={keyAt - 4}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>a few partitions hold far more than the rest</span>
        </Note>
        <Note at={thirtyAt + 2} x={R_X} y={y(410)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Chip color={HOT} ink={HOT_INK} size={21}>
              guest
            </Chip>{" "}
            on <Num>{Math.round(SKEW.hotShare * 100)}</Num>% of the rows
          </span>
        </Note>
        <Note at={waitAt - 2} x={R_X} y={y(470)} out={saltAt}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>every core waits for it</span>
        </Note>
        <Note at={suffixAt} x={R_X} y={y(470)}>
          <span style={{ display: "flex", gap: 10, alignItems: "center", whiteSpace: "nowrap", ...note(24, INK) }}>
            <b>salt it:</b>
            <Chip color={HOT} ink={HOT_INK} size={21} mono>
              guest
            </Chip>
            <span>→</span>
            <span style={{ opacity: ease(frame, suffixAt + 8, 10) }}>
              <Chip color={HOT} ink={HOT_INK} size={21} mono>
                guest#0
              </Chip>{" "}
              …{" "}
              <Chip color={HOT} ink={HOT_INK} size={21} mono>
                guest#7
              </Chip>
            </span>
          </span>
        </Note>
        <Note at={stageAt - 2} x={R_X} y={y(536)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>the stage waits for the largest</span>
        </Note>
        <Note at={twoAt - 2} x={R_X} y={y(616)}>
          <span style={{ ...note(24, INK), fontWeight: 700, whiteSpace: "nowrap" }}>then count in two steps</span>
        </Note>
        <Note at={saltedAt} x={R_X} y={y(660)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>1</b> by salted key: <Num>{SKEW.salts}</Num> partials of about <Num>{count(Math.round(SKEW.total / SKEW.salts / 100) * 100)}</Num>
          </span>
        </Note>
        <Note at={thenAt} x={R_X} y={y(700)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>2</b> by key: guest <Num>{count(SKEW.total)}</Num>
          </span>
        </Note>
        <Note at={nullsAt - 2} x={R_X} y={y(780)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            or: handle nulls and stand-in keys separately
          </span>
        </Note>
        <Note at={aqeAt - 2} x={R_X} y={y(820)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>or: adaptive query execution splits skewed partitions</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
