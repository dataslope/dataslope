import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { pct, UNIT } from "./data";
import { Drift, Mark, MARK_OK, OK, OK_INK, Svg, X0 } from "./parts";
import { mulberry32 } from "../da-statistics-communication/parts";

const RIGHT_X = 1010;
const BAR_W = 640;
const BAR_MAX = 0.25;
const SQUARE = 46;

/** Eight users' orders for the picture: each user's count drawn from the same 1 + Poisson(4) shape. */
const rand = mulberry32(17);
const ORDERS = Array.from({ length: 8 }, () => 3 + Math.floor(rand() * 5));

/** One user and their five requests, each in the version it was served. */
const Requests: React.FC<{ top: number; at: number; mixed: boolean; label: string }> = ({ top, at, mixed, label: text }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: X0, top, display: "flex", alignItems: "center", gap: 14, opacity: p }}>
      <span style={{ width: 150, ...label(21, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>{text}</span>
      <svg width={52} height={52} style={{ overflow: "visible" }}>
        <circle cx={26} cy={16} r={11} fill={INK} />
        <path d="M6,50 Q26,20 46,50 Z" fill={INK} />
      </svg>
      <span style={{ ...label(20, INK_SOFT), margin: "0 4px" }}>→</span>
      {Array.from({ length: 5 }, (_, i) => {
        const b = mixed ? i % 2 === 1 : true;
        const q = ease(frame, at + 4 + i * 3, 8);
        return (
          <div
            key={i}
            style={{
              width: SQUARE,
              height: SQUARE,
              borderRadius: 6,
              background: b ? OK : BAR,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...label(21, PAPER),
              fontWeight: 700,
              opacity: q,
              transform: `scale(${0.6 + 0.4 * q})`,
            }}
          >
            {b ? "B" : "A"}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Question 3. What gets assigned (a user, a session, a device), then one
 * user's requests split by user and split by request, where the same person
 * sees both versions. Then the analysis: 2,000 simulated A/A tests on 1,000
 * users with about five orders each, read per order as if independent and
 * per user, against the 5% a test promises.
 */
export const UnitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("unit").from;
  const qAt = n.word("unit", "Question");
  const textAt = n.word("unit", "What is the randomization unit");
  const assignedAt = n.word("unit", "It's what gets assigned");
  const userAt = n.word("unit", "usually a user");
  const sessionAt = n.word("unit", "sometimes a session or a device");
  const requestAt = n.word("unit", "Randomize each request instead");
  const bothAt = n.word("unit", "sees both versions");
  const diluteAt = n.word("unit", "dilutes the difference");
  const respectAt = n.word("unit-orders", "respect the unit");
  const thousandAt = n.word("unit-orders", "A thousand users");
  const aaAt = n.word("unit-orders", "in an A A test");
  const orderAt = n.word("unit-orders", "Treat each order as independent");
  const naiveAt = n.word("unit-orders", "twenty-one percent");
  const perUserAt = n.word("unit-orders", "Analyze one average per user");
  const userValAt = n.word("unit-orders", "it's four percent");
  const promiseAt = n.word("unit-orders", "inside the five it promises");
  const wrongAt = n.word("errors-in", "two ways to be wrong");
  const clearAt = n.beat("errors-in").to - 6;

  const clear = 1 - ease(frame, clearAt, 10);
  const xOf = (v: number) => RIGHT_X + (v / BAR_MAX) * BAR_W;
  const bars = [
    { text: "each order as independent", v: UNIT.naive, at: orderAt, valAt: naiveAt, color: ACCENT, ink: ACCENT_INK, top: 560 },
    { text: "one average per user", v: UNIT.user, at: perUserAt, valAt: userValAt, color: OK, ink: OK_INK, top: 680 },
  ];
  const promise = ease(frame, promiseAt - 2, 14);

  return (
    <AbsoluteFill style={{ opacity: clear }}>
      <Sfx name="el-tap" at={userAt} level={-36} />
      <Sfx name="el-scratch" at={bothAt + 2} level={-34} />
      <Sfx name="el-pencil" at={thousandAt} level={-36} />
      <Sfx name="el-pop" at={naiveAt} level={-32} />
      <Sfx name="el-pop" at={userValAt} level={-32} />

      <Drift from={from} to={n.beat("errors-in").to + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is the randomization unit, and why does it matter?
        </QuestionCard>

        {/* What gets assigned. */}
        <Note at={assignedAt} x={X0} y={y(300)}>
          <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>assigned to a group:</span>
        </Note>
        <div style={{ position: "absolute", left: X0 + 250, top: y(294), display: "flex", gap: 12 }}>
        {[
          { text: "user", at: userAt, main: true },
          { text: "session", at: sessionAt, main: false },
          { text: "device", at: sessionAt + 6, main: false },
        ].map((c) => {
          const p = ease(frame, c.at - 2, 10);
          return (
            <div
              key={c.text}
              style={{
                padding: "4px 14px",
                borderRadius: 6,
                border: `2px solid ${c.main ? OK : INK_SOFT}`,
                background: c.main ? `color-mix(in srgb, ${OK} 16%, ${PAPER})` : PAPER,
                ...note(24, c.main ? OK_INK : INK),
                fontWeight: c.main ? 700 : 500,
                whiteSpace: "nowrap",
                opacity: p,
              }}
            >
              {c.main ? "usually a " : ""}
              {c.text}
            </div>
          );
        })}
        </div>

        <Requests top={y(410)} at={userAt + 6} mixed={false} label="by user" />
        <Note at={userAt + 22} x={X0 + 610} y={y(420)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>one version</span>
        </Note>
        <Requests top={y(520)} at={requestAt} mixed label="by request" />
        <Note at={bothAt} x={X0 + 610} y={y(530)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>both versions</span>
        </Note>
        <Note at={diluteAt} x={X0} y={y(620)}>
          <span style={{ ...note(26, ACCENT_INK), whiteSpace: "nowrap" }}>the measured difference is diluted</span>
        </Note>

        {/* The analysis: orders nested in users. */}
        <Note at={respectAt} x={RIGHT_X} y={y(300)}>
          <span style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>the analysis respects the unit, too</span>
        </Note>
        <Svg opacity={ease(frame, thousandAt - 2, 12)}>
          {ORDERS.map((k, u) => {
            const cx = RIGHT_X + 30 + u * 84;
            const cy = y(400);
            return (
              <g key={u}>
                {Array.from({ length: k }, (_, j) => {
                  // The user's orders fan out in a row beneath them.
                  const q = ease(frame, thousandAt + u * 2 + j, 8);
                  const ox = cx + (j - (k - 1) / 2) * 11 * q;
                  const oy = cy + h(36) * q;
                  return (
                    <g key={j}>
                      <line x1={cx} y1={cy} x2={ox} y2={oy} stroke={INK_SOFT} strokeWidth={1.2} opacity={0.6} />
                      <circle cx={ox} cy={oy} r={6} fill={BAR} opacity={0.8} />
                    </g>
                  );
                })}
                <circle cx={cx} cy={cy} r={12} fill={INK} />
              </g>
            );
          })}
        </Svg>
        <Note at={thousandAt + 6} x={RIGHT_X} y={y(468)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>
            1,000 users · about 5 orders each · <span style={{ opacity: ease(frame, aaAt - 2, 10) }}>A/A: both groups get the same version</span>
          </span>
        </Note>

        {bars.map((b) => {
          const p = ease(frame, b.at - 2, 12);
          if (p <= 0) return null;
          const grow = ease(frame, b.valAt - 6, 16);
          return (
            <React.Fragment key={b.text}>
              <div style={{ position: "absolute", left: RIGHT_X, top: y(b.top), ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap", opacity: p }}>
                {b.v === UNIT.user ? (
                  <Mark at={wrongAt - 6} color={MARK_OK}>
                    {b.text}
                  </Mark>
                ) : (
                  b.text
                )}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: RIGHT_X,
                  top: y(b.top) + h(40),
                  width: (xOf(b.v) - RIGHT_X) * grow,
                  height: h(40),
                  background: b.color,
                  opacity: 0.85 * p,
                  borderRadius: 3,
                }}
              />
              <Note at={b.valAt} x={xOf(b.v) + 14} y={y(b.top) + h(42)}>
                <span style={{ ...note(30, b.ink), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR }}>{pct(b.v, 1)} significant</span>
              </Note>
            </React.Fragment>
          );
        })}
        <Svg opacity={promise}>
          <line
            x1={xOf(0.05)}
            x2={xOf(0.05)}
            y1={y(550)}
            y2={y(550) + (y(780) - y(550)) * promise}
            stroke={INK}
            strokeWidth={2}
            strokeDasharray="5 6"
          />
        </Svg>
        <Note at={promiseAt + 2} x={xOf(0.05) - 100} y={y(786)} width={200} style={{ textAlign: "center" }}>
          <span style={{ ...label(21, INK), fontWeight: 700, whiteSpace: "nowrap" }}>5% promised</span>
        </Note>
        <Note at={orderAt} x={RIGHT_X} y={y(830)}>
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>{UNIT.sims.toLocaleString("en-US")} simulated A/A tests</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
