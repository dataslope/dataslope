import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, body, HAIRLINE, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { NAME } from "./data";
import { ErrorBox, Listing } from "./kit";
import { Drift, Headline, Mark, pulse, Spot, STAT_INK, Svg } from "./parts";

const X = 120;
const SLOT = 44;
const SLOTS_Y = 470;

/** The two sides of the lesson's callout, "When in doubt, constrain what you control". */
const SIDES = [
  { x: 120, head: "What you control", items: "statuses, roles, internal codes", verdict: "Be strict" },
  { x: 760, head: "What the world sends", items: "names, addresses", verdict: "Go easy" },
] as const;

/**
 * A domain is a claim about the world. VARCHAR(20) claims no name is
 * longer, and a famous name of twenty-one characters breaks it, as Postgres
 * says. Then the lesson's rule of thumb: strict on what you control, easy on
 * what the world sends.
 */
export const ClaimsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("claims").from;
  const claimAt = n.word("claims", "claim");
  const capAt = n.word("claims", "Cap a name");
  const twentyAt = n.word("claims", "twenty characters");
  const claimingAt = n.word("claims", "claiming");
  const nameAt = NAME.value.split(" ").map((w) => n.word("claims", w));
  const oneAt = n.word("claims", "twenty-one");
  const strictAt = n.word("control", "strict");
  const controlAt = n.word("control", "you control");
  const statusesAt = n.word("control", "statuses");
  const easyAt = n.word("control", "Go easy");
  const worldAt = n.word("control", "the world");
  const namesAt = n.word("control", "names");
  const end = n.beat("control").to;

  // Each letter of the name lands in its slot as its word is read.
  const words = NAME.value.split(" ");
  const letters: { ch: string; at: number }[] = [];
  words.forEach((w, k) => {
    const start = nameAt[k];
    [...w].forEach((ch, j) => letters.push({ ch, at: start + j * 1.6 }));
    if (k < words.length - 1) letters.push({ ch: " ", at: start + w.length * 1.6 });
  });
  const landed = letters.filter((l) => frame >= l.at).length;
  const over = pulse(frame, oneAt, 22);
  const slotsIn = ease(frame, twentyAt - 4, 18);
  const slotsY = y(SLOTS_Y);
  const slotH = h(60);
  const countX = X + (NAME.limit + 1) * SLOT + 40;

  return (
    <AbsoluteFill>
      {/* ── Sound: the slots, the letters, the one that doesn't fit ── */}
      <Sfx name="el-pencil" at={twentyAt - 4} level={-35} />
      <Sfx name="el-sprinkle" at={nameAt[0]} level={-34} />
      <Sfx name="el-tap" at={letters[NAME.limit].at} level={-28} />
      <Sfx name="el-pop" at={claimingAt} level={-31} />
      <Sfx name="el-tap" at={statusesAt} level={-30} />
      <Sfx name="el-tap" at={namesAt} level={-30} />

      <Drift from={namesAt + 6} to={end + 70} scale={0.018} origin={[800, 600]}>
        <Headline
          lead={
            <>
              Every rule is a <Mark at={claimAt}>claim.</Mark>
            </>
          }
          leadAt={from - 6}
        />

        <Listing lines={[NAME.sql]} x={X} top={y(312)} width={660} size={28} at={capAt - 6} lineAt={[capAt - 2]} />
        <Note at={claimingAt - 2} x={X + 700} y={y(318)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            claims <span style={{ color: STAT_INK, fontWeight: 650 }}>no name is longer than {NAME.limit} characters</span>
          </span>
        </Note>

        {/* ── Twenty slots, and a name that needs one more ── */}
        <Svg opacity={slotsIn}>
          {Array.from({ length: NAME.limit }, (_, i) => (
            <rect
              key={i}
              x={X + i * SLOT}
              y={slotsY}
              width={SLOT}
              height={slotH}
              fill={PAPER}
              stroke={HAIRLINE}
              strokeWidth={1.2}
              opacity={ease(frame, twentyAt - 4 + i * 0.6, 6)}
            />
          ))}
          {landed > NAME.limit ? (
            <rect
              x={X + NAME.limit * SLOT + 3}
              y={slotsY + 3}
              width={SLOT - 6}
              height={slotH - 6}
              fill="none"
              stroke={ACCENT}
              strokeWidth={2 + over * 2}
              strokeDasharray="5 4"
            />
          ) : null}
        </Svg>
        {[1, 10, NAME.limit].map((k) => (
          <div
            key={k}
            style={{
              position: "absolute",
              left: X + (k - 0.5) * SLOT,
              top: slotsY + slotH + 10,
              opacity: slotsIn,
              transform: "translateX(-50%)",
              ...note(20, INK_SOFT),
            }}
          >
            {k}
          </div>
        ))}
        {letters.map((l, i) => {
          const p = ease(frame, l.at, 6);
          if (p <= 0 || l.ch === " ") return null;
          const out = i >= NAME.limit;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: X + i * SLOT,
                top: slotsY,
                width: SLOT,
                height: slotH,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontSize: 30,
                fontWeight: out ? 700 : 500,
                color: out ? STAT_INK : INK,
                opacity: p,
                transform: `translateY(${(1 - p) * -14}px) scale(${1 + (out ? over * 0.25 : 0)})`,
              }}
            >
              {l.ch}
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: countX,
            top: slotsY + slotH / 2 - 22,
            opacity: ease(frame, nameAt[0] - 2, 8),
            whiteSpace: "nowrap",
            ...note(32, landed > NAME.limit ? STAT_INK : INK),
            fontWeight: 700,
          }}
        >
          {Math.min(landed, NAME.length)}
          <span style={{ ...note(22, INK_SOFT), marginLeft: 10 }}>characters</span>
        </div>
        <ErrorBox x={X} top={y(600)} width={1100} at={oneAt + 6} message={NAME.error.message} detail={NAME.error.detail} />

        {/* ── The lesson's rule of thumb ── */}
        {SIDES.map((s, i) => {
          const headAt = i === 0 ? controlAt - 6 : worldAt - 6;
          const itemsAt = i === 0 ? statusesAt - 2 : namesAt - 2;
          const verdictAt = i === 0 ? strictAt - 2 : easyAt - 2;
          return (
            <React.Fragment key={s.head}>
              <Ink at={Math.min(headAt, verdictAt)} dur={14} style={{ left: s.x, top: y(724), whiteSpace: "nowrap" }}>
                <span style={label(24, INK)}>{s.head}</span>
              </Ink>
              <Ink at={itemsAt} dur={16} style={{ left: s.x, top: y(770), whiteSpace: "nowrap" }}>
                <span style={{ ...body(36, true), color: INK }}>{s.items}</span>
              </Ink>
              <Ink at={verdictAt + 8} dur={14} style={{ left: s.x, top: y(830), whiteSpace: "nowrap" }}>
                <span style={{ ...label(24, i === 0 ? STAT_INK : INK_SOFT) }}>{s.verdict}</span>
              </Ink>
            </React.Fragment>
          );
        })}

        <Spot id="db-entities-ribbon" at={capAt} left={1440} top={y(560)} width={340} height={340} />
      </Drift>
    </AbsoluteFill>
  );
};
