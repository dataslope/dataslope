import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { arrowHead, type Cubic, cubicPath, type Pt, sampleCubic } from "../../components/arrow";
import { during, ease } from "../../components/motion";
import { OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HAIRLINE, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { DEADLOCK } from "./data";
import { ColumnRule, Drift, PgError, Svg, X0 } from "./parts";

const LANE_1 = 352;
const LANE_2 = 512;
const T0 = 420;
const T1 = 1760;
const BELOW = 626;
/** The two accounts, told apart by hue only (teal is non-semantic). */
const ACC = { 1: BAR, 2: ds("teal", 500) } as const;
const ACC_INK = { 1: inkOf.blue, 2: inkOf.teal } as const;

/** A lock held along a lane: a band from `x0` to `x1`, its account above. */
const Hold: React.FC<{ x0: number; x1: number; y: number; account: 1 | 2; at: number; out: number; labelAbove?: boolean; fail?: number }> = ({ x0, x1, y, account, at, out, labelAbove = true, fail = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = ease(frame, out, 8);
  if (p <= 0 || o >= 1) return null;
  return (
    <g opacity={1 - o}>
      <rect x={x0} y={y - 7} width={(x1 - x0) * p} height={14} rx={7} fill={fail > 0 ? `color-mix(in srgb, ${ACCENT} ${fail * 100}%, ${ACC[account]})` : ACC[account]} opacity={0.85} />
      <text x={x0} y={labelAbove ? y - 20 : y + 38} style={svgText({ ...label(20, ACC_INK[account]), fontWeight: 700 })} opacity={ease(frame, at + 4, 10)}>
        locks account {account}
      </text>
    </g>
  );
};

/** A wait: a curve from one lane to the other, dashed, with its head. */
const Wait: React.FC<{ c: Cubic; at: number; out: number; color: string; glow?: number }> = ({ c, at, out, color, glow = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = ease(frame, out, 8);
  if (p <= 0 || o >= 1) return null;
  const line: Pt[] = sampleCubic(c);
  return (
    <g opacity={1 - o}>
      {glow > 0 ? <path d={cubicPath(c)} fill="none" stroke={inkOf.yellow} strokeWidth={10} opacity={0.35 * glow} strokeLinecap="round" /> : null}
      <path d={cubicPath(c)} fill="none" stroke={color} strokeWidth={2.8} strokeDasharray="8 6" style={{ clipPath: `inset(-40px ${(1 - p) * 100}% -40px -40px)` }} />
      <path d={arrowHead(line, 14, 7.5, { filled: true })} fill={color} opacity={ease(frame, at + 12, 5)} />
    </g>
  );
};

/** A point event on a lane: a dot and a word. */
const Mark: React.FC<{ x: number; y: number; at: number; out: number; text: string; color: string; below?: boolean }> = ({ x, y, at, out, text, color, below }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10) * (1 - ease(frame, out, 8));
  if (p <= 0) return null;
  return (
    <g opacity={p}>
      <circle cx={x} cy={y} r={8} fill={color} />
      <text x={x} y={below ? y + 36 : y - 20} textAnchor="middle" style={svgText({ fontFamily: MONO, fontSize: 20, fontWeight: 700, color })}>
        {text}
      </text>
    </g>
  );
};

/**
 * Question 11, from the database's side, drawn (PGlite is one connection).
 * Two transfers as two lanes: the first locks account 1, the second account
 * 2, then each reaches for the other's, two dashed waits that close a
 * loop between the lanes. Postgres waits deadlock_timeout (1s, from SHOW),
 * finds the cycle and aborts the second, "deadlock detected"; the first
 * commits, and the victim is retried. Then the same two transfers taking
 * account 1 first: the second waits on one lock, no loop forms, and both
 * finish; the other two habits under it.
 */
export const DeadlockScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("deadlock").from;
  const qAt = n.word("deadlock", "Question eleven");
  const textAt = n.word("deadlock", "What is a deadlock");
  const cycleAt = n.word("deadlock", "A cycle of transactions");
  const holdingAt = n.word("deadlock", "each holding a lock");
  const twoAt = n.word("deadlock-cycle", "Two transfers start together");
  const oneLocksAt = n.word("deadlock-cycle", "One locks account one");
  const wants2At = n.word("deadlock-cycle", "then wants account two");
  const otherLocksAt = n.word("deadlock-cycle", "The other locks account two");
  const wants1At = n.word("deadlock-cycle", "then wants account one");
  const neitherAt = n.word("deadlock-cycle", "Neither can go on");
  const waitsAt = n.word("deadlock-detect", "Postgres waits one second");
  const looksAt = n.word("deadlock-detect", "then looks for a cycle");
  const findsAt = n.word("deadlock-detect", "It finds this one");
  const abortsAt = n.word("deadlock-detect", "aborts a transaction");
  const errorAt = n.word("deadlock-detect", "with a deadlock error");
  const finishesAt = n.word("deadlock-detect", "The other finishes");
  const retriesAt = n.word("deadlock-detect", "the application retries the victim");
  const avoidAt = n.word("deadlock-order", "To avoid it");
  const lowestAt = n.word("deadlock-order", "the lowest account ID first");
  const simplyAt = n.word("deadlock-order", "simply waits");
  const noCycleAt = n.word("deadlock-order", "no cycle forms");
  const shortAt = n.word("deadlock-order", "Keep transactions short");
  const isoAt = n.word("deadlock-order", "the lowest isolation level");
  const end = n.beat("deadlock-order").to;

  const l1 = y(LANE_1);
  const l2 = y(LANE_2);
  const tx = (t: number) => T0 + t * (T1 - T0);
  const lanesIn = ease(frame, holdingAt - 6, 16);
  const cycOut = avoidAt - 4;
  const below = y(BELOW);

  // The loop: the first transfer's wait down the right, the second's up the left.
  const cx = tx(0.5);
  const waitDown: Cubic = [
    [cx + 34, l1 + 12],
    [cx + 150, l1 + 30],
    [cx + 34, l2 - 90],
    [cx + 34, l2 - 14],
  ];
  const waitUp: Cubic = [
    [cx - 34, l2 - 12],
    [cx - 150, l2 - 30],
    [cx - 34, l1 + 90],
    [cx - 34, l1 + 14],
  ];
  const found = during(frame, findsAt, abortsAt + 10, 8);
  const victim = ease(frame, abortsAt + 2, 10);
  // The watch: a ring that fills over one second, from deadlock_timeout.
  const second = Number(DEADLOCK.timeout.replace(/s$/, ""));
  const watch = ease(frame, waitsAt + 2, 30 * second);
  const watchC: Pt = [X0 + 44, below + h(46)];

  // Ordered: both lock account 1 first.
  const ordIn = avoidAt;
  // An S from the second lane up to the first: it leaves and arrives
  // vertically, so the head sits on a straight end.
  const wait1: Cubic = [
    [tx(0.16), l2 - 12],
    [tx(0.16), l2 - 90],
    [tx(0.24), l1 + 100],
    [tx(0.24), l1 + 12],
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={twoAt} level={-35} />
      <Sfx name="el-tap" at={oneLocksAt + 2} level={-33} />
      <Sfx name="el-tap" at={otherLocksAt + 2} level={-33} />
      <Sfx name="el-pencil" at={wants2At + 2} level={-35} />
      <Sfx name="el-pencil" at={wants1At + 2} level={-35} />
      <Sfx name="el-tap" at={waitsAt + 2 + 30 * second} level={-33} />
      <Sfx name="el-pop" at={findsAt} level={-31} />
      <Sfx name="el-scratch" at={abortsAt + 2} level={-32} />
      <Sfx name="el-tap" at={finishesAt + 2} level={-33} />
      <Sfx name="el-pencil" at={retriesAt + 4} level={-35} />
      <Sfx name="el-whoosh" at={avoidAt - 2} level={-36} />
      <Sfx name="el-pencil" at={simplyAt} level={-35} />
      <Sfx name="el-chime" at={noCycleAt + 2} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is a deadlock, and how do you avoid it?
        </QuestionCard>
        <Note at={cycleAt} x={X0} y={y(250) + h(4)}>
          <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>
            A cycle of transactions, each holding a lock another one needs.
          </span>
        </Note>

        <Note at={twoAt} x={1800} y={y(250) + h(8)} align="right">
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>drawn: it needs two sessions at once</span>
        </Note>

        {/* ── The lanes ── */}
        <Svg opacity={lanesIn}>
          {[
            { yy: l1, name: "transfer 1" },
            { yy: l2, name: "transfer 2" },
          ].map(({ yy, name }) => (
            <g key={name}>
              <text x={X0} y={yy + 8} style={svgText(label(23, INK))}>
                {name}
              </text>
              <line x1={T0 - 30} y1={yy} x2={T0 - 30 + (T1 - T0 + 30) * lanesIn} y2={yy} stroke={HAIRLINE} strokeWidth={2} />
            </g>
          ))}

          {/* ── The deadlock ── */}
          <Hold x0={tx(0.04)} x1={tx(0.72)} y={l1} account={1} at={oneLocksAt} out={cycOut} />
          <Hold x0={tx(0.1)} x1={tx(0.66)} y={l2} account={2} at={otherLocksAt} out={cycOut} labelAbove={false} fail={victim} />
          <Wait c={waitDown} at={wants2At} out={finishesAt} color={ACC[2]} glow={found} />
          <Wait c={waitUp} at={wants1At} out={abortsAt + 6} color={ACC[1]} glow={found} />
          {/* The victim, aborted; the first transfer goes on and commits. */}
          <g opacity={victim * (1 - ease(frame, cycOut, 8))}>
            <path d={`M${tx(0.66) - 13},${l2 - 13} l26,26 M${tx(0.66) + 13},${l2 - 13} l-26,26`} stroke={ACCENT} strokeWidth={4} strokeLinecap="round" />
          </g>
          <Mark x={tx(0.72)} y={l1} at={finishesAt} out={cycOut} text="locks 2, COMMIT" color={OK_INK} />
          <Mark x={tx(0.92)} y={l2} at={retriesAt + 6} out={cycOut} text="retry" color={OK_INK} below />

          {/* ── In one order: both take account 1 first ── */}
          <Hold x0={tx(0.04)} x1={tx(0.46)} y={l1} account={1} at={ordIn + 4} out={end + 60} />
          <Mark x={tx(0.3)} y={l1} at={ordIn + 10} out={end + 60} text="then 2" color={ACC_INK[2]} />
          <Mark x={tx(0.46)} y={l1} at={simplyAt + 10} out={end + 60} text="COMMIT" color={OK_INK} />
          <Wait c={wait1} at={simplyAt - 4} out={end + 60} color={ACC[1]} />
          <line x1={tx(0.16)} x2={tx(0.16) + (tx(0.5) - tx(0.16)) * ease(frame, simplyAt, 30)} y1={l2} y2={l2} stroke={ACC[1]} strokeWidth={3} strokeDasharray="6 6" opacity={ease(frame, simplyAt, 6)} />
          <Hold x0={tx(0.5)} x1={tx(0.86)} y={l2} account={1} at={noCycleAt - 2} out={end + 60} labelAbove={false} />
          <Mark x={tx(0.72)} y={l2} at={noCycleAt + 6} out={end + 60} text="then 2" color={ACC_INK[2]} below />
          <Mark x={tx(0.86)} y={l2} at={noCycleAt + 14} out={end + 60} text="COMMIT" color={OK_INK} below />
        </Svg>
        <Note at={wants2At + 8} x={cx + 150} y={(l1 + l2) / 2 - h(30)} out={finishesAt}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            1 waits for <b style={{ color: ACC_INK[2] }}>account 2</b>
          </span>
        </Note>
        <Note at={wants1At + 8} x={cx - 150} y={(l1 + l2) / 2 - h(30)} out={abortsAt + 6} align="right">
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            2 waits for <b style={{ color: ACC_INK[1] }}>account 1</b>
          </span>
        </Note>
        <Note at={neitherAt} x={cx + 150} y={(l1 + l2) / 2 + h(8)} out={findsAt}>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>neither can go on</span>
        </Note>
        <Note at={simplyAt + 2} x={tx(0.26)} y={(l1 + l2) / 2 - h(16)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            2 waits for <b style={{ color: ACC_INK[1] }}>account 1</b>, holding nothing
          </span>
        </Note>

        {/* ── Detection, under the lanes ── */}
        <Svg opacity={ease(frame, waitsAt - 2, 10) * (1 - ease(frame, cycOut, 10))}>
          <circle cx={watchC[0]} cy={watchC[1]} r={34} fill={PAPER} stroke={HAIRLINE} strokeWidth={3} />
          <circle
            cx={watchC[0]}
            cy={watchC[1]}
            r={34}
            fill="none"
            stroke={inkOf.yellow}
            strokeWidth={6}
            pathLength={1}
            strokeDasharray={`${watch} 1`}
            transform={`rotate(-90 ${watchC[0]} ${watchC[1]})`}
          />
          <line
            x1={watchC[0]}
            y1={watchC[1]}
            x2={watchC[0] + 24 * Math.sin(watch * 2 * Math.PI)}
            y2={watchC[1] - 24 * Math.cos(watch * 2 * Math.PI)}
            stroke={INK}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </Svg>
        <Note at={waitsAt} x={X0 + 110} y={below + h(10)} out={cycOut}>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            waits <SmallCode>deadlock_timeout</SmallCode> = <b>{DEADLOCK.timeout}</b>
          </div>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap", marginTop: h(10), opacity: ease(frame, looksAt, 10) }}>
            then looks for a cycle<span style={{ opacity: ease(frame, findsAt, 10) }}>: <b>found</b></span>
          </div>
        </Note>
        <ColumnRule x={770} top={below} bottom={below + h(176)} at={errorAt} out={cycOut} />
        <PgError x={980} top={below + h(4)} width={420} at={errorAt} message="ERROR: deadlock detected" size={21} out={cycOut} />
        <Note at={abortsAt + 4} x={980} y={below + h(80)} out={cycOut}>
          <div style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            transfer 2 is the <b style={{ color: ACCENT_INK }}>victim</b>, rolled back
          </div>
          <div style={{ ...note(23, OK_INK), whiteSpace: "nowrap", marginTop: h(10), opacity: ease(frame, finishesAt, 10) }}>transfer 1 finishes</div>
          <div style={{ ...note(23, OK_INK), whiteSpace: "nowrap", marginTop: h(8), opacity: ease(frame, retriesAt, 10) }}>the application retries transfer 2</div>
        </Note>

        {/* ── How to avoid it ── */}
        <Note at={avoidAt} x={X0} y={below + h(10)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>Lock in one global order</b>
            <span style={{ opacity: ease(frame, lowestAt, 10) }}>: the lowest account ID first</span>
          </span>
        </Note>
        <Note at={noCycleAt} x={X0} y={below + h(62)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>one wait, no cycle: both transfers finish</span>
        </Note>
        <Note at={shortAt} x={X0} y={below + h(130)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Keep transactions short.</span>
        </Note>
        <Note at={isoAt} x={X0} y={below + h(176)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Use the lowest isolation level that&rsquo;s correct.</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};

/** A setting's name inside a line of type. */
const SmallCode: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: 600, fontVariantLigatures: "none" }}>{children}</span>
);
