import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { count, SRM } from "./data";
import { Drift, Mark, OK_INK, pulse } from "./parts";

const BASE = 800;
const TOP = 390;
const MAX = 6000;
const BAR_W = 130;
const BARS_X = 200;
const GAP = 70;
const RIGHT_X = 760;
const MINI_X = 1500;
const MINI_TOP = 470;
const MINI_BASE = 760;
const MINI_W = 84;

/**
 * Question 2. The page's split, 4,800 against 5,200, against the 5,000 each
 * that was asked for; the chi-square that says chance does not explain it
 * (16, p about one in sixteen thousand); 4,960 against 5,040 for contrast,
 * which chance does explain; then what usually causes a mismatch.
 */
export const SrmScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("srm").from;
  const qAt = n.word("srm", "Question two");
  const textAt = n.word("srm", "What is a sample ratio mismatch");
  const askedAt = n.word("srm", "You asked for fifty-fifty");
  const aAt = n.word("srm", "four thousand eight hundred");
  const bAt = n.word("srm", "five thousand two hundred");
  const chiAt = n.word("srm-test", "A chi-square test");
  const chanceAt = n.word("srm-test", "whether chance could do that");
  const sixteenAt = n.word("srm-test", "chi-square is sixteen");
  const pAt = n.word("srm-test", "one in sixteen thousand");
  const srmAt = n.word("srm-test", "That's a sample ratio mismatch");
  const fineAt = n.word("srm-test", "Four thousand nine hundred sixty");
  const fineP = n.word("srm-test", "would be chance");
  const causeAt = n.word("srm-cause", "A mismatch means");
  const causes = [
    { text: "bots filtered from one arm", at: n.word("srm-cause", "bots filtered") },
    { text: "a redirect that loses slow page loads", at: n.word("srm-cause", "a redirect") },
    { text: "a logging bug", at: n.word("srm-cause", "a logging bug") },
  ];
  const findAt = n.word("srm-cause", "Find it before");
  const end = n.beat("srm-cause").to;

  const sy = (v: number) => y(BASE) - (v / MAX) * (y(BASE) - y(TOP));
  const my = (v: number) => y(MINI_BASE) - (v / MAX) * (y(MINI_BASE) - y(MINI_TOP));
  const bad = SRM.bad;
  const fine = SRM.fine;
  const bars = [
    { name: "A", v: bad.observed[0], at: aAt },
    { name: "B", v: bad.observed[1], at: bAt },
  ];
  const expP = ease(frame, askedAt + 2, 16);
  const formulaOut = causeAt - 2;
  const bump = pulse(frame, srmAt, 20);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={aAt} level={-36} />
      <Sfx name="el-tap" at={bAt} level={-36} />
      <Sfx name="el-pencil" at={chiAt + 2} level={-36} />
      <Sfx name="el-pop" at={srmAt + 2} level={-34} />
      {causes.map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at} level={-37} />
      ))}

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is a sample ratio mismatch, and what causes it?
        </QuestionCard>

        {/* The split that came back, against the one asked for. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <line x1={BARS_X - 40} x2={BARS_X + 2 * BAR_W + GAP + 40} y1={y(BASE)} y2={y(BASE)} stroke={INK} strokeWidth={1.6} opacity={ease(frame, askedAt - 4, 10)} />
          {bars.map((b, i) => {
            const p = ease(frame, b.at - 2, 16);
            const x = BARS_X + i * (BAR_W + GAP);
            return <rect key={b.name} x={x} y={y(BASE) - (y(BASE) - sy(b.v)) * p} width={BAR_W} height={(y(BASE) - sy(b.v)) * p} fill={BAR} opacity={0.85} rx={3} />;
          })}
          <line
            x1={BARS_X - 40}
            x2={BARS_X - 40 + (2 * BAR_W + GAP + 80) * expP}
            y1={sy(bad.expected)}
            y2={sy(bad.expected)}
            stroke={INK}
            strokeWidth={2.4}
            strokeDasharray="8 6"
          />
        </svg>
        <Note at={askedAt + 6} x={BARS_X - 40} y={sy(bad.expected) - h(48)}>
          <span style={{ ...label(21, INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>asked for: {count(bad.expected)} each</span>
        </Note>
        {bars.map((b, i) => (
          <React.Fragment key={b.name}>
            <div
              style={{
                position: "absolute",
                left: BARS_X + i * (BAR_W + GAP),
                width: BAR_W,
                top: sy(b.v) + (i === 0 ? h(14) : -h(40)),
                textAlign: "center",
                ...note(25, i === 0 ? PAPER : BLUE_INK),
                fontWeight: 700,
                ...TABULAR,
                opacity: ease(frame, b.at + 8, 10),
              }}
            >
              {count(b.v)}
            </div>
            <div
              style={{
                position: "absolute",
                left: BARS_X + i * (BAR_W + GAP),
                width: BAR_W,
                top: y(BASE) + h(12),
                textAlign: "center",
                ...label(22, INK_SOFT),
                fontWeight: 700,
                opacity: ease(frame, askedAt, 10),
              }}
            >
              {b.name}
            </div>
          </React.Fragment>
        ))}

        {/* The test. */}
        <Note at={chiAt} x={RIGHT_X} y={y(390)} out={formulaOut}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>
            a chi-square test: <span style={{ opacity: ease(frame, chanceAt, 10) }}>could chance do this?</span>
          </span>
        </Note>
        <Note at={chiAt + 6} x={RIGHT_X} y={y(440)} out={formulaOut}>
          <span style={{ fontFamily: MONO, fontSize: 27, fontWeight: 600, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>
            χ² = Σ (observed − expected)² / expected
          </span>
        </Note>
        <Note at={sixteenAt - 2} x={RIGHT_X} y={y(500)} out={formulaOut}>
          <span style={{ fontFamily: MONO, fontSize: 27, fontWeight: 600, color: INK, whiteSpace: "pre", fontVariantLigatures: "none", ...TABULAR }}>
            {"   = 200² / 5,000 + 200² / 5,000 = "}
            <Mark at={sixteenAt + 4}>{bad.chi2.toFixed(0)}</Mark>
          </span>
        </Note>
        <Note at={pAt - 2} x={RIGHT_X} y={y(580)} out={formulaOut}>
          <span style={{ ...note(32, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>
            p ≈ {bad.p.toFixed(5)}, about 1 in {count(Math.round(1 / bad.p / 1000) * 1000)}
          </span>
        </Note>
        <Note at={srmAt} x={RIGHT_X} y={y(650)} out={formulaOut}>
          <span
            style={{
              display: "inline-block",
              padding: "6px 16px",
              border: `3px solid ${ACCENT}`,
              borderRadius: 8,
              ...note(28, ACCENT_INK),
              fontWeight: 800,
              whiteSpace: "nowrap",
              transform: `scale(${1 + 0.06 * bump})`,
            }}
          >
            SRM · sample ratio mismatch
          </span>
        </Note>

        {/* The contrast: a split chance does explain. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <line x1={MINI_X - 20} x2={MINI_X + 2 * MINI_W + 50} y1={y(MINI_BASE)} y2={y(MINI_BASE)} stroke={INK} strokeWidth={1.4} opacity={ease(frame, fineAt - 4, 10)} />
          {fine.observed.map((v, i) => {
            const p = ease(frame, fineAt + i * 4, 14);
            return (
              <rect key={i} x={MINI_X + i * (MINI_W + 30)} y={my(v) + (y(MINI_BASE) - my(v)) * (1 - p)} width={MINI_W} height={(y(MINI_BASE) - my(v)) * p} fill={BAR} opacity={0.6} rx={3} />
            );
          })}
          <line
            x1={MINI_X - 20}
            x2={MINI_X - 20 + (2 * MINI_W + 70) * ease(frame, fineAt + 6, 12)}
            y1={my(fine.expected)}
            y2={my(fine.expected)}
            stroke={INK}
            strokeWidth={2}
            strokeDasharray="6 5"
          />
        </svg>
        {fine.observed.map((v, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: MINI_X + i * (MINI_W + 30) - 10,
              width: MINI_W + 20,
              top: y(MINI_BASE) + h(10),
              textAlign: "center",
              ...label(20, INK_SOFT),
              fontWeight: 700,
              ...TABULAR,
              opacity: ease(frame, fineAt + 8 + i * 4, 10),
            }}
          >
            {count(v)}
          </div>
        ))}
        <Note at={fineP - 2} x={MINI_X - 20} y={y(MINI_TOP) - h(62)}>
          <span style={{ ...note(26, OK_INK), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>p = {fine.p.toFixed(2)}: chance</span>
        </Note>

        {/* What usually causes it. */}
        <Note at={causeAt + 2} x={RIGHT_X} y={y(400)}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>something treats the arms differently:</span>
        </Note>
        {causes.map((c, i) => (
          <Note key={c.text} at={c.at - 2} x={RIGHT_X} y={y(450) + i * h(56)}>
            <span style={{ ...note(29, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>· {c.text}</span>
          </Note>
        ))}
        <Note at={findAt - 2} x={RIGHT_X} y={y(640)}>
          <span style={{ ...note(30, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>Find it before you read a single result.</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
