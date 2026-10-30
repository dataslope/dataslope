import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { arrowHead } from "../../components/arrow";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { Drift, OK_INK, X0 } from "./parts";

const LANE_A = 380;
const LANE_B = 500;
const T0 = 330;
const T1 = 1280;
const GRID_TOP = 640;
const GRID_X = X0;
const LEVEL_W = 270;
const COL_W = 250;
const ROW_H = 58;
const R_X = 1360;

/** The SQL standard's table: which anomaly each level allows. */
const LEVELS = [
  { name: "Read uncommitted", allows: [true, true, true] },
  { name: "Read committed", allows: [false, true, true] },
  { name: "Repeatable read", allows: [false, false, true] },
  { name: "Serializable", allows: [false, false, false] },
];
const ANOMALIES = ["dirty read", "non-repeatable", "phantom"];

const mono = (size: number, color: string = INK) => svgText({ fontFamily: MONO, fontSize: size, fontWeight: 600, color });

/** One event on a lane: a dot, its statement above, a value under it. */
const Event: React.FC<{ x: number; y: number; at: number; text: string; color?: string; out?: number }> = ({ x, y, at, text, color = INK, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10) * (out === undefined ? 1 : 1 - ease(frame, out, 10));
  if (p <= 0) return null;
  return (
    <g opacity={p}>
      <circle cx={x} cy={y} r={7} fill={color} />
      <text x={x} y={y - 18} textAnchor="middle" style={mono(19, color)}>
        {text}
      </text>
    </g>
  );
};

/** What a read returned: a value in a rounded tag under its dot. */
const Value: React.FC<{ x: number; y: number; at: number; value: string; color: string; out?: number }> = ({ x, y, at, value, color, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10) * (out === undefined ? 1 : 1 - ease(frame, out, 10));
  if (p <= 0) return null;
  return (
    <g opacity={p}>
      <rect x={x - 34} y={y + 16} width={68} height={34} rx={17} fill={PAPER} stroke={color} strokeWidth={2} />
      <text x={x} y={y + 40} textAnchor="middle" style={mono(20, color)}>
        {value}
      </text>
    </g>
  );
};

/**
 * Question 9, drawn rather than run (PGlite is one connection). Two lanes,
 * transaction A reading a balance twice and B changing it from 100 to 50 in
 * between. Read uncommitted: A's read before B commits sees 50, a change that
 * could still roll back. Read committed: A's second read, after B commits,
 * returns 50, not the 100 it read first. Repeatable read: 100 both times.
 * Under the lanes, the standard's table of which anomaly each level allows,
 * a row per level as the narration reaches it, with Postgres's default
 * marked; then the cost, along the levels.
 */
export const IsoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("iso").from;
  const qAt = n.word("iso", "Question nine");
  const textAt = n.word("iso", "What are transaction isolation levels");
  const seeAt = n.word("iso", "what one transaction can see");
  const readsAt = n.word("iso", "one reads a balance twice");
  const changesAt = n.word("iso", "another changes it");
  const ruAt = n.word("iso-dirty", "Read uncommitted");
  const dirtyAt = n.word("iso-dirty", "a dirty read");
  const beforeAt = n.word("iso-dirty", "before it commits");
  const rollAt = n.word("iso-dirty", "may yet roll back");
  const rcAt = n.word("iso-committed", "Read committed");
  const defaultAt = n.word("iso-committed", "Postgres's default");
  const onlyAt = n.word("iso-committed", "sees only committed changes");
  const fiftyAt = n.word("iso-committed", "returns fifty");
  const nonRepAt = n.word("iso-committed", "a non-repeatable read");
  const rrAt = n.word("iso-repeat", "Repeatable read");
  const bothAt = n.word("iso-repeat", "a hundred both times");
  const phantomAt = n.word("iso-repeat", "phantoms");
  const serialAt = n.word("iso-repeat", "Serializable");
  const oneAtATime = n.word("iso-repeat", "one at a time");
  const upAt = n.word("iso-cost", "Each level up");
  const concurrencyAt = n.word("iso-cost", "less concurrency");
  const retriedAt = n.word("iso-cost", "must be retried");
  const end = n.beat("iso-cost").to;

  const laneA = y(LANE_A);
  const laneB = y(LANE_B);
  const tx = (t: number) => T0 + t * (T1 - T0);
  const lane = (at: number) => ease(frame, at, 20);
  const readOne = tx(0.12);
  const update = tx(0.3);
  const dirtyRead = tx(0.48);
  const commit = tx(0.66);
  const readTwo = tx(0.86);
  const rollback = ease(frame, rollAt, 10) * (1 - ease(frame, rcAt, 10));

  const gridTop = y(GRID_TOP);
  const rowAt = [ruAt, rcAt, rrAt, serialAt];
  const colX = (j: number) => GRID_X + LEVEL_W + j * COL_W;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={readsAt} level={-35} />
      <Sfx name="el-scratch" at={dirtyAt + 4} level={-33} />
      <Sfx name="el-tap" at={fiftyAt + 2} level={-33} />
      <Sfx name="el-pop" at={bothAt + 2} level={-32} />
      <Sfx name="el-tap" at={serialAt + 2} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={60}>
          What are transaction isolation levels?
        </QuestionCard>

        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {/* ── The two lanes ── */}
          {[
            { yy: laneA, name: "A", at: seeAt },
            { yy: laneB, name: "B", at: seeAt + 6 },
          ].map(({ yy, name, at }) => {
            const p = lane(at);
            return (
              <g key={name} opacity={Math.min(1, p * 2)}>
                <text x={X0} y={yy + 7} style={svgText(label(22, INK))}>
                  Transaction {name}
                </text>
                <line x1={T0} y1={yy} x2={T0 + (T1 - T0) * p} y2={yy} stroke={HAIRLINE} strokeWidth={2} />
              </g>
            );
          })}
          <text x={T1} y={laneB + 54} textAnchor="end" style={svgText(note(20, INK_SOFT))} opacity={ease(frame, seeAt + 10, 10)}>
            time →
          </text>
          {/* B's change, uncommitted until its commit (dashed in between). */}
          <line x1={update} y1={laneB} x2={commit} y2={laneB} stroke={BAR} strokeWidth={3} strokeDasharray="7 6" opacity={ease(frame, changesAt + 4, 10)} />
          <Event x={update} y={laneB} at={changesAt} text="UPDATE → 50" color={BLUE_INK} />
          <Event x={commit} y={laneB} at={changesAt + 8} text="COMMIT" color={INK} out={rollAt} />
          <g opacity={rollback}>
            <circle cx={commit} cy={laneB} r={7} fill={ACCENT} />
            <text x={commit} y={laneB - 18} textAnchor="middle" style={mono(19, ACCENT_INK)}>
              ROLLBACK?
            </text>
          </g>
          <Event x={commit} y={laneB} at={rcAt} text="COMMIT" color={INK} />

          {/* A's two reads, and the read before B commits. */}
          <Event x={readOne} y={laneA} at={readsAt} text="read" color={BLUE_INK} />
          <Value x={readOne} y={laneA} at={readsAt + 6} value="100" color={BLUE_INK} />
          <Event x={dirtyRead} y={laneA} at={dirtyAt - 2} text="read" color={ACCENT_INK} out={rcAt} />
          <Value x={dirtyRead} y={laneA} at={dirtyAt + 4} value="50" color={ACCENT_INK} out={rcAt} />
          <Event x={readTwo} y={laneA} at={readsAt + 8} text="read again" color={BLUE_INK} />
          <Value x={readTwo} y={laneA} at={fiftyAt} value="50" color={ACCENT_INK} out={bothAt} />
          <Value x={readTwo} y={laneA} at={bothAt + 2} value="100" color={OK_INK} />
        </svg>

        {/* What the current level does, on the right. */}
        <Note at={beforeAt} x={R_X} y={laneA - h(30)} out={rcAt}>
          <div style={{ ...note(24, ACCENT_INK), width: 460 }}>Read uncommitted: A sees 50 before B commits. If B rolls back, A read a value that never existed.</div>
        </Note>
        <Note at={nonRepAt} x={R_X} y={laneA - h(30)} out={rrAt}>
          <div style={{ ...note(24, ACCENT_INK), width: 460 }}>Read committed: the same row, read twice, changed in between.</div>
        </Note>
        <Note at={bothAt + 4} x={R_X} y={laneA - h(30)}>
          <div style={{ ...note(24, OK_INK), width: 460 }}>Repeatable read: A keeps the snapshot it started with.</div>
        </Note>

        {/* ── The standard's table ── */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <g opacity={ease(frame, ruAt - 4, 12)}>
            {ANOMALIES.map((a, j) => (
              <text key={a} x={colX(j)} y={gridTop} style={svgText(label(21, INK_SOFT))}>
                {a}
              </text>
            ))}
            <line x1={GRID_X} y1={gridTop + 14} x2={colX(2) + COL_W} y2={gridTop + 14} stroke={INK} strokeWidth={2} />
          </g>
          {LEVELS.map((lv, i) => {
            const at = rowAt[i];
            const p = ease(frame, at, 12);
            if (p <= 0) return null;
            const yy = gridTop + 14 + (i + 1) * ROW_H - 18;
            const isDefault = i === 1;
            return (
              <g key={lv.name} opacity={p}>
                {i > 0 ? <line x1={GRID_X} y1={yy - ROW_H + 18} x2={colX(2) + COL_W} y2={yy - ROW_H + 18} stroke={HAIRLINE} strokeWidth={1} opacity={0.5} /> : null}
                <text x={GRID_X} y={yy} style={svgText({ ...note(23, INK), fontWeight: 650 })}>
                  {lv.name}
                </text>
                {lv.allows.map((allowed, j) => (
                  <text key={j} x={colX(j)} y={yy} style={svgText(note(22, allowed ? ACCENT_INK : OK_INK))} opacity={ease(frame, at + 6 + j * 3, 10)}>
                    {allowed ? "allowed" : "prevented"}
                  </text>
                ))}
                {isDefault ? (
                  <g opacity={ease(frame, defaultAt, 10)}>
                    <rect x={colX(2) + COL_W - 6} y={yy - 26} width={196} height={36} rx={18} fill={`color-mix(in srgb, ${ds("yellow", 400)} 70%, ${PAPER})`} />
                    <text x={colX(2) + COL_W + 92} y={yy - 2} textAnchor="middle" style={svgText(label(20, INK))}>
                      Postgres default
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}
          {/* The phantom cell under repeatable read, pointed at as it is named. */}
          <rect
            x={colX(2) - 10}
            y={gridTop + 14 + 3 * ROW_H - 18 - 30}
            width={COL_W - 20}
            height={40}
            rx={4}
            fill="none"
            stroke={ACCENT}
            strokeWidth={2}
            opacity={ease(frame, phantomAt, 10) * (1 - ease(frame, serialAt, 10))}
          />
          {/* The cost, along the levels: an arrow down the table. */}
          <g opacity={ease(frame, upAt, 12)}>
            <line x1={colX(2) + COL_W + 30} y1={gridTop + 40} x2={colX(2) + COL_W + 30} y2={gridTop + 14 + 4 * ROW_H - 20} stroke={BAR} strokeWidth={3} />
            <path
              d={arrowHead(
                Array.from({ length: 20 }, (_, k) => [colX(2) + COL_W + 30, gridTop + 40 + ((gridTop + 14 + 4 * ROW_H - 20 - gridTop - 40) * k) / 19] as const),
                14,
                7.5,
                { filled: true },
              )}
              fill={BAR}
            />
          </g>
        </svg>
        <Note at={upAt + 4} x={colX(2) + COL_W + 60} y={gridTop + h(60)}>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>prevents more,</div>
          <div style={{ ...note(24, INK), whiteSpace: "nowrap", opacity: ease(frame, concurrencyAt, 10) }}>allows less concurrency</div>
          <div style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap", marginTop: h(14), opacity: ease(frame, retriedAt, 10) }}>serializable: a transaction</div>
          <div style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap", opacity: ease(frame, retriedAt, 10) }}>can fail; retry it</div>
        </Note>
        <Note at={onlyAt} x={GRID_X} y={gridTop + 14 + 4 * ROW_H + h(18)}>
          <div style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
            The SQL standard&rsquo;s table. Postgres goes further: its read uncommitted acts as read committed, and its repeatable read stops phantoms too.
          </div>
        </Note>
        <div style={{ position: "absolute", left: R_X, top: laneB + h(74), ...note(24, OK_INK), width: 460, opacity: ease(frame, oneAtATime, 10) }}>
          Serializable: as if A and B ran one at a time.
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
