import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { arrowHead, type Pt, sampleCubic } from "../../components/arrow";
import { during, ease } from "../../components/motion";
import { OK, OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note, svgText } from "../../editorial/style";
import { Badge, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { ISOLATION } from "./data";
import { DataTable, Drift, Listing, Spot, Svg, tableGeometry, X0 } from "./parts";

const GRID_HIGH = 318;
const GRID_LOW = 566;
const LEVEL_W = 300;
const COL_W = 270;
const R_X = 1290;
const LANE_A = 326;
const LANE_B = 446;
const T0 = 470;
const T1 = 1760;

const LEVELS = ["read uncommitted", "read committed", "repeatable read", "serializable"];
/** The highlight behind "read committed" (23px, weight 650, about 177px
 *  wide): 8px of yellow on either side of the words, not cut off at the d. */
const DEFAULT_MARK_W = 194;
const ANOMALIES = ["dirty read", "non-repeatable", "phantom"];
/** "possible" at 22px (Inter, weight 400): about 91px. */
const POSSIBLE_W = 92;
/** The SQL standard's table: which anomaly each level allows. */
const ALLOWS = [
  [true, true, true],
  [false, true, true],
  [false, false, true],
  [false, false, false],
];

const mono = (size: number, color: string = INK) => svgText({ fontFamily: MONO, fontSize: size, fontWeight: 500, color });

/** One event on a lane: a dot and its statement above it. */
const Event: React.FC<{ x: number; y: number; at: number; out: number; text: string; color?: string }> = ({ x, y, at, out, text, color = INK }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10) * (1 - ease(frame, out, 8));
  if (p <= 0) return null;
  return (
    <g opacity={p}>
      <circle cx={x} cy={y} r={7} fill={color} />
      <text x={x} y={y - 26} textAnchor="middle" style={mono(19, color)}>
        {text}
      </text>
    </g>
  );
};

/** What a read returned: a value in a rounded tag under its dot. */
const Value: React.FC<{ x: number; y: number; at: number; out: number; value: string; color: string; w?: number }> = ({ x, y, at, out, value, color }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10) * (1 - ease(frame, out, 8));
  if (p <= 0) return null;
  return (
    <g opacity={p}>
      <text x={x} y={y + 38} textAnchor="middle" style={mono(22, color)}>
        {value}
      </text>
    </g>
  );
};

/**
 * Questions 8 and 9, one grid. The four levels arrive as rows as the
 * narration names them, with Postgres's default read from SHOW. Question 9
 * replaces 8 over the same grid, which moves down and opens its three
 * anomaly columns, one column filled per anomaly, from the SQL standard's
 * table. Above it, two transactions as lanes: the run of the dirty read
 * (another transaction's 50 parked uncommitted; a read at each of the four
 * levels, 100 every time, so the standard's "possible" under read
 * uncommitted gets a "Postgres: no" badge beside it, never a strike: the
 * standard's cell is right), then the non-repeatable read and the phantom
 * drawn from the page's definitions (Postgres's repeatable read stops
 * phantoms, from its docs, badged the same way), then serializable: write
 * skew, which repeatable read lets through (two on-call doctors), and its
 * price, a transaction aborted with a serialization failure, and the retry.
 */
export const IsoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("levels").from;
  const q8At = n.word("levels", "Question eight");
  const text8At = n.word("levels", "What are the SQL isolation levels");
  const fourAt = n.word("levels", "The standard names four");
  const levelAt = [
    n.word("levels", "read uncommitted"),
    n.word("levels", "read committed", { nth: 1 }),
    n.word("levels", "repeatable read"),
    n.word("levels", "and serializable"),
  ];
  const definedAt = n.word("levels", "Each is defined by the anomalies it rules out");
  const builtAt = n.word("levels", "not by how it's built");
  const differAt = n.word("levels", "defaults differ");
  const pgDefaultAt = n.word("levels", "Postgres uses read committed");
  const q9At = n.word("anomalies", "Question nine");
  const text9At = n.word("anomalies", "What anomalies do isolation levels prevent");
  const threeAt = n.word("anomalies", "Three classic ones");
  const dirtyAt = n.word("anomalies-dirty", "A dirty read");
  const beforeAt = n.word("anomalies-dirty", "before it commits");
  const fiftyAt = n.word("anomalies-dirty", "set the balance to fifty");
  const uncommittedAt = n.word("anomalies-dirty", "uncommitted", { nth: 1 });
  const neverAt = n.word("anomalies-dirty", "Postgres never shows it");
  const allFourAt = n.word("anomalies-dirty", "at all four levels");
  const evenAt = n.word("anomalies-dirty", "even read uncommitted");
  const hundredAt = n.word("anomalies-dirty", "the read says a hundred");
  const nonrepAt = n.word("anomalies-nonrep", "A non-repeatable read");
  const twiceAt = n.word("anomalies-nonrep", "read a row twice");
  const commitsAt = n.word("anomalies-nonrep", "another transaction commits a change");
  const differsAt = n.word("anomalies-nonrep", "the second read differs");
  const rcAllowsAt = n.word("anomalies-nonrep", "Read committed allows it");
  const rrPreventsAt = n.word("anomalies-nonrep", "repeatable read prevents it");
  const phantomAt = n.word("anomalies-phantom", "A phantom");
  const rerunAt = n.word("anomalies-phantom", "rerun a query");
  const newRowsAt = n.word("anomalies-phantom", "new rows match");
  const insertedAt = n.word("anomalies-phantom", "inserted them");
  const stdAt = n.word("anomalies-phantom", "The standard stops phantoms only at serializable");
  const pgRrAt = n.word("anomalies-phantom", "Postgres's repeatable read already does");
  const serialAt = n.word("anomalies-serial", "Serializable promises");
  const orderAt = n.word("anomalies-serial", "some one-at-a-time order");
  const skewAt = n.word("anomalies-skew", "That stops write skew");
  const rrAllowsAt = n.word("anomalies-skew", "which repeatable read allows");
  const checkAt = n.word("anomalies-skew", "each check a rule");
  const changeAt = n.word("anomalies-skew", "each change a different row");
  const breakAt = n.word("anomalies-skew", "together they break it");
  const exchangeAt = n.word("anomalies-abort", "In exchange");
  const failureAt = n.word("anomalies-abort", "a serialization failure");
  const retriedAt = n.word("anomalies-abort", "to be retried");
  const end = n.beat("anomalies-abort").to;

  // ── The grid: high for question 8, low once the lanes need the top ──
  const move = ease(frame, q9At - 2, 24);
  const gridTop = y(GRID_HIGH) + (y(GRID_LOW) - y(GRID_HIGH)) * move;
  const headH = h(44) * move;
  const rowH = h(54);
  const rowY = (i: number) => gridTop + headH + i * rowH;
  const colX = (j: number) => X0 + LEVEL_W + j * COL_W;
  const colAt = [dirtyAt, nonrepAt, phantomAt];
  const gridW = LEVEL_W + 3 * COL_W;

  // ── The lanes ──
  const laneA = y(LANE_A);
  const laneB = y(LANE_B);
  const tx = (t: number) => T0 + t * (T1 - T0);
  const lanesIn = ease(frame, dirtyAt - 4, 16);
  // Each anomaly's events live from its beat to the next.
  const phase = {
    dirty: { in: dirtyAt, out: nonrepAt - 4 },
    nonrep: { in: nonrepAt, out: phantomAt - 4 },
    phantom: { in: phantomAt, out: serialAt - 4 },
    serial: { in: serialAt, out: end + 60 },
  };
  const readsX = [0.34, 0.5, 0.66, 0.82].map(tx);

  // Postgres's default, from SHOW.
  const showG = tableGeometry({ x: R_X, top: y(540) + h(10), cols: [{ name: "default_transaction_isolation" }], rows: [[ISOLATION.default]], headH: h(44), rowH: h(50), headSize: 20, bodySize: 24 });

  // Serializable's retry: a curve from the failed commit back to the start,
  // landing above BEGIN's label rather than on it.
  const beginX = tx(0.04);
  const failX = tx(0.76);
  const retry: Pt[] = sampleCubic([
    [failX - 10, laneA - 48],
    [failX - 160, laneA - 96],
    [beginX + 150, laneA - 96],
    [beginX + 30, laneA - 62],
  ]);

  // Where Postgres is stricter than the standard: a badge beside the
  // standard's "possible", which stays as the standard has it.
  const pgRu = ease(frame, evenAt + 4, 12);
  const pgRr = ease(frame, pgRrAt + 2, 12);
  // Question 8: the anomalies a level is defined by, named early and grey.
  const defined = ease(frame, definedAt, 14);
  const ruleW = LEVEL_W + 120 + (3 * COL_W - 120) * Math.max(move, defined);

  return (
    <AbsoluteFill>
      {levelAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-34} />
      ))}
      <Sfx name="el-pencil" at={pgDefaultAt} level={-35} />
      <Sfx name="el-whoosh" at={q9At} level={-36} />
      <Sfx name="el-pencil" at={dirtyAt} level={-35} />
      <Sfx name="el-pop" at={hundredAt} level={-31} />
      <Sfx name="el-scratch" at={evenAt + 4} level={-33} />
      <Sfx name="el-tap" at={commitsAt + 4} level={-34} />
      <Sfx name="el-scratch" at={differsAt + 4} level={-33} />
      <Sfx name="el-tap" at={insertedAt} level={-34} />
      <Sfx name="el-pop" at={newRowsAt + 4} level={-32} />
      <Sfx name="el-scratch" at={pgRrAt + 2} level={-33} />
      <Sfx name="el-scratch" at={failureAt + 2} level={-32} />
      <Sfx name="el-pencil" at={retriedAt} level={-35} />

      <Sfx name="el-pop" at={fourAt + 6} level={-32} />
      <Drift from={from} to={end + 40}>
        {/* Four levels, as four steps: Question 8's spot, gone when 9's grid
            comes down into its space. */}
        <Spot art="steps" at={fourAt + 6} out={q9At - 8} left={720} top={y(620)} width={220} />
        <QuestionCard n={8} at={q8At - 4} textAt={text8At - 4} out={q9At - 6} size={58}>
          What are the SQL isolation levels?
        </QuestionCard>
        <QuestionCard n={9} at={q9At} textAt={text9At - 2} size={58}>
          What anomalies do isolation levels prevent?
        </QuestionCard>

        {/* ── The grid ── */}
        <Svg>
          <g opacity={Math.max(0.5 * defined, ease(frame, threeAt - 4, 12))}>
            {ANOMALIES.map((a, j) => (
              <text key={a} x={colX(j)} y={gridTop + headH - 14} style={svgText(label(21, INK_SOFT))}>
                {a}
              </text>
            ))}
          </g>
          <line x1={X0} y1={gridTop + headH} x2={X0 + ruleW * ease(frame, fourAt, 14)} y2={gridTop + headH} stroke={INK} strokeWidth={2} opacity={ease(frame, fourAt, 8)} />
          {/* The cell the narration is on, banded behind its word. */}
          {[
            { i: 1, j: 1, from: rcAllowsAt, to: rrPreventsAt, color: ACCENT },
            { i: 2, j: 1, from: rrPreventsAt, to: phantomAt, color: OK },
            { i: 3, j: 2, from: stdAt, to: pgRrAt, color: OK },
          ].map((r, k) => {
            const p = during(frame, r.from, r.to, 8);
            if (p <= 0) return null;
            return <rect key={k} x={colX(r.j) - 8} y={rowY(r.i) + 10} width={COL_W - 90} height={rowH - 20} rx={3} fill={`color-mix(in srgb, ${r.color} 22%, transparent)`} opacity={p} />;
          })}
          {/* Write skew: repeatable read lets it through. */}
          <rect x={X0 - 8} y={rowY(2) + 8} width={LEVEL_W - 70} height={rowH - 16} rx={4} fill={`color-mix(in srgb, ${ACCENT} 22%, transparent)`} opacity={during(frame, rrAllowsAt, exchangeAt, 8)} />
          {LEVELS.map((lv, i) => {
            const p = ease(frame, levelAt[i], 12);
            if (p <= 0) return null;
            const yy = rowY(i);
            const isDefault = i === 1 ? ease(frame, pgDefaultAt + 2, 12) : 0;
            const serial = i === 3 ? ease(frame, serialAt, 12) * (1 - ease(frame, exchangeAt, 12)) : 0;
            return (
              <g key={lv} opacity={p}>
                {serial > 0 ? <rect x={X0 - 10} y={yy + 6} width={gridW + 10} height={rowH - 12} rx={5} fill={`color-mix(in srgb, ${OK} ${20 * serial}%, transparent)`} /> : null}
                {isDefault > 0 ? <rect x={X0 - 8} y={yy + 8} width={DEFAULT_MARK_W} height={rowH - 16} rx={4} fill={HIGHLIGHT} opacity={isDefault} /> : null}
                <line x1={X0} y1={yy + rowH} x2={X0 + ruleW} y2={yy + rowH} stroke={HAIRLINE} strokeWidth={1} opacity={0.5} />
                <text x={X0} y={yy + rowH / 2 + 8} style={svgText({ ...note(23, INK), fontWeight: 500 })}>
                  {lv}
                </text>
                {i === 1 ? (
                  <text x={X0 + DEFAULT_MARK_W + 6} y={yy + rowH / 2 + 8} style={svgText(note(22, INK_SOFT))} opacity={isDefault}>
                    default
                  </text>
                ) : null}
                {ALLOWS[i].map((allowed, j) => {
                  const cp = ease(frame, colAt[j] + 6 + i * 3, 10);
                  if (cp <= 0) return null;
                  const word = allowed ? "possible" : "prevented";
                  return (
                    <g key={j} opacity={cp}>
                      <text x={colX(j)} y={yy + rowH / 2 + 8} style={svgText(note(22, allowed ? ACCENT_INK : OK_INK))}>
                        {word}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </Svg>

        {[
          { i: 0, j: 0, p: pgRu },
          { i: 2, j: 2, p: pgRr },
        ].map((b) =>
          b.p > 0 ? (
            <div
              key={`${b.i}-${b.j}`}
              style={{ position: "absolute", left: colX(b.j) + POSSIBLE_W + 12, top: rowY(b.i), height: rowH, display: "flex", alignItems: "center", opacity: b.p }}
            >
              <Badge tone="yellow" size={20}>
                Postgres: no
              </Badge>
            </div>
          ) : null,
        )}

        {/* ── Question 8's notes: what defines a level, and the default ── */}
        <Note at={definedAt} x={R_X} y={y(GRID_HIGH) + h(8)} out={q9At - 6}>
          <div style={{ ...note(24, INK), width: 520 }}>
            Each level is defined by the anomalies it rules out<span style={{ opacity: ease(frame, builtAt, 10) }}>, not by how it&rsquo;s built.</span>
          </div>
        </Note>
        <Note at={differAt} x={R_X} y={y(430)} out={q9At - 6}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>Defaults differ. Postgres:</span>
        </Note>
        <Listing lines={ISOLATION.showDefault} x={R_X} top={y(470)} width={520} size={20} at={differAt + 4} out={q9At - 6} />
        <DataTable g={showG} cols={[{ name: "default_transaction_isolation" }]} rows={[{ cells: [ISOLATION.default], at: pgDefaultAt }]} at={pgDefaultAt - 4} marks={[{ row: 0, col: 0, at: pgDefaultAt + 4 }]} out={q9At - 6} />

        {/* ── The lanes ── */}
        <Svg opacity={lanesIn}>
          {[
            { yy: laneA, name: "this transaction" },
            { yy: laneB, name: "another one" },
          ].map(({ yy, name }) => (
            <g key={name}>
              <text x={X0} y={yy + 7} style={svgText(label(22, INK))}>
                {name}
              </text>
              <line x1={T0 - 20} y1={yy} x2={T0 - 20 + (T1 - T0 + 20) * lanesIn} y2={yy} stroke={HAIRLINE} strokeWidth={2} />
            </g>
          ))}

          {/* Dirty read: the run. The other transaction's 50, parked. */}
          <Event x={tx(0.1)} y={laneB} at={fiftyAt} out={phase.dirty.out} text="UPDATE → 50" color={BLUE_INK} />
          <line
            x1={tx(0.1)}
            y1={laneB}
            x2={tx(0.1) + (T1 - tx(0.1)) * ease(frame, uncommittedAt, 20)}
            y2={laneB}
            stroke={BAR}
            strokeWidth={3}
            strokeDasharray="8 7"
            opacity={1 - ease(frame, phase.dirty.out, 8)}
          />
          <text x={T1} y={laneB + 40} textAnchor="end" style={svgText(note(21, INK_SOFT))} opacity={ease(frame, uncommittedAt + 6, 10) * (1 - ease(frame, phase.dirty.out, 8))}>
            still uncommitted
          </text>
          {LEVELS.map((lv, k) => (
            <React.Fragment key={lv}>
              <Event x={readsX[k]} y={laneA} at={allFourAt + k * 4} out={phase.dirty.out} text={lv} color={INK} />
              <Value x={readsX[k]} y={laneA} at={hundredAt + k * 2} out={phase.dirty.out} value={String(ISOLATION.reads[k].balance)} color={OK_INK} />
            </React.Fragment>
          ))}

          {/* Non-repeatable read: drawn. */}
          <Event x={tx(0.12)} y={laneA} at={twiceAt} out={phase.nonrep.out} text="read" color={BLUE_INK} />
          <Value x={tx(0.12)} y={laneA} at={twiceAt + 6} out={phase.nonrep.out} value="100" color={BLUE_INK} />
          <Event x={tx(0.36)} y={laneB} at={commitsAt} out={phase.nonrep.out} text="UPDATE → 50" color={BLUE_INK} />
          <Event x={tx(0.56)} y={laneB} at={commitsAt + 8} out={phase.nonrep.out} text="COMMIT" color={INK} />
          <Event x={tx(0.8)} y={laneA} at={differsAt - 4} out={phase.nonrep.out} text="read again" color={BLUE_INK} />
          <Value x={tx(0.8)} y={laneA} at={differsAt + 2} out={phase.nonrep.out} value="50" color={ACCENT_INK} />

          {/* Phantom: drawn. */}
          <Event x={tx(0.12)} y={laneA} at={rerunAt - 6} out={phase.phantom.out} text="SELECT … WHERE" color={BLUE_INK} />
          <Value x={tx(0.12)} y={laneA} at={rerunAt} out={phase.phantom.out} value="2 rows" color={BLUE_INK} w={100} />
          <Event x={tx(0.36)} y={laneB} at={insertedAt - 8} out={phase.phantom.out} text="INSERT" color={BLUE_INK} />
          <Event x={tx(0.56)} y={laneB} at={insertedAt} out={phase.phantom.out} text="COMMIT" color={INK} />
          <Event x={tx(0.8)} y={laneA} at={newRowsAt - 6} out={phase.phantom.out} text="the same SELECT" color={BLUE_INK} />
          <Value x={tx(0.8)} y={laneA} at={newRowsAt} out={phase.phantom.out} value="3 rows" color={ACCENT_INK} w={100} />

          {/* Serializable: write skew. Both check the rule, each takes a
              different doctor off call; Postgres aborts one, which retries. */}
          <text x={X0} y={laneA - 74} style={svgText(note(21, INK_SOFT))} opacity={ease(frame, checkAt - 4, 10) * (1 - ease(frame, phase.serial.out, 8))}>
            rule: one doctor stays on call
          </text>
          <Event x={beginX} y={laneA} at={serialAt + 4} out={phase.serial.out} text="BEGIN" color={INK} />
          <Event x={beginX} y={laneB} at={orderAt} out={phase.serial.out} text="BEGIN" color={INK} />
          <Event x={tx(0.2)} y={laneA} at={checkAt} out={phase.serial.out} text="SELECT → 2 on call" color={BLUE_INK} />
          <Event x={tx(0.25)} y={laneB} at={checkAt + 4} out={phase.serial.out} text="SELECT → 2 on call" color={BLUE_INK} />
          <Event x={tx(0.44)} y={laneA} at={changeAt} out={phase.serial.out} text="UPDATE doctor A" color={BLUE_INK} />
          <Event x={tx(0.49)} y={laneB} at={changeAt + 4} out={phase.serial.out} text="UPDATE doctor B" color={BLUE_INK} />
          <text x={T1} y={laneB + 44} textAnchor="end" style={svgText({ ...note(21, ACCENT_INK), fontWeight: 500 })} opacity={ease(frame, breakAt, 10) * (1 - ease(frame, exchangeAt, 10))}>
            under repeatable read, both commit: nobody on call
          </text>
          <Event x={tx(0.62)} y={laneB} at={exchangeAt} out={phase.serial.out} text="COMMIT" color={OK_INK} />
          <Event x={failX} y={laneA} at={failureAt - 2} out={phase.serial.out} text="serialization failure" color={ACCENT_INK} />
          <g opacity={ease(frame, retriedAt, 10)}>
            <path d={`M${retry.map(([a, b]) => `${a},${b}`).join(" L")}`} fill="none" stroke={OK} strokeWidth={2.6} pathLength={1} strokeDasharray={`${ease(frame, retriedAt, 18)} 1`} />
            <path d={arrowHead(retry, 13, 7, { filled: true })} fill={OK} opacity={ease(frame, retriedAt + 14, 5)} />
            <text x={(failX + beginX) / 2} y={laneA - 106} textAnchor="middle" style={svgText({ ...label(21, OK_INK), fontWeight: 500 })}>
              retry
            </text>
          </g>
        </Svg>

        {/* ── Each anomaly, defined, right of the grid ── */}
        {[
          { at: dirtyAt, out: phase.dirty.out, head: "Dirty read", body: "sees another transaction's change before it commits", foot: { at: neverAt, text: "Postgres never shows one: its read uncommitted acts as read committed" } },
          { at: nonrepAt, out: phase.nonrep.out, head: "Non-repeatable read", body: "the same row, read twice, differs: a commit landed in between" },
          { at: phantomAt, out: phase.phantom.out, head: "Phantom", body: "a rerun query matches new rows another transaction inserted", foot: { at: pgRrAt, text: "Postgres's repeatable read already stops phantoms" } },
          { at: serialAt, out: phase.serial.out, head: "Serializable", body: "the outcome of some one-at-a-time order", mid: { at: skewAt, text: "also stops write skew, which repeatable read allows" }, foot: { at: exchangeAt, text: "may abort: catch it and retry" } },
        ].map((d) => (
          <Note key={d.head} at={d.at} x={R_X} y={y(GRID_LOW) + h(14)} out={d.out}>
            <div style={{ width: 520 }}>
              <div style={{ ...note(24, INK), fontWeight: 500 }}>{d.head}</div>
              <div style={{ ...note(23, INK), marginTop: h(8) }}>{d.body}</div>
              {"mid" in d && d.mid ? <div style={{ ...note(23, INK), marginTop: h(8), opacity: ease(frame, d.mid.at, 10) }}>{d.mid.text}</div> : null}
              {d.foot ? <div style={{ ...note(22, OK_INK), fontWeight: 500, marginTop: h(14), opacity: ease(frame, d.foot.at, 10) }}>{d.foot.text}</div> : null}
            </div>
          </Note>
        ))}
        <Note at={beforeAt} x={R_X} y={y(GRID_LOW) - h(40)} out={phase.dirty.out}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>this read ran in Postgres</span>
        </Note>
        <Note at={nonrepAt + 4} x={R_X} y={y(GRID_LOW) - h(40)} out={phase.phantom.out}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>drawn: it needs two sessions at once</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
