import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { arrowHead, cubicPath, sampleCubic, type Cubic } from "../../components/arrow";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { SANS } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { MONTY } from "./data";
import { DATA, DATA_INK, FAINT, GOLD, GOLD_INK, Headline, lerp, STAT, STAT_INK, Svg } from "./parts";

/** The three cases, one row each: where the car is, given you picked door 1. */
const ROWS = [350, 530, 710];
const MINI = { x: [430, 545, 660], w: 88, h: 104 } as const;
const RESULT_X = 810;
/** Which door the host opens in each case, and where the car is. */
const CASES = [
  { car: 0, opens: 1 },
  { car: 1, opens: 2 },
  { car: 2, opens: 1 },
];
/** The running win rates, on a log axis of games. */
const CH = { x0: 1180, x1: 1790, top: 352, base: 740 } as const;
const LOG_HI = Math.log10(MONTY.trials);
const gx = (k: number) => CH.x0 + (Math.log10(k) / LOG_HI) * (CH.x1 - CH.x0);

/**
 * Part 4, why switching wins: the three equally likely places the car can be
 * when you pick door 1, what the host is forced to open in each, and the
 * lesson's 100,000 simulated games settling on a third and two thirds.
 */
export const CasesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const fy = (p: number) => y(CH.base) - h(CH.base - CH.top) * p;

  // ── Cues ──
  const casesFrom = n.beat("cases").from;
  const pickAt = n.word("cases", "first pick");
  const oneInAt = n.word("cases", "one time in three");
  const otherAt = n.word("goat", "other two times");
  const goatAt = n.word("goat", "picked a goat");
  const hasToAt = n.word("goat", "has to open");
  const shutAt = n.word("goat", "leaves shut");
  const hasCarAt = n.word("goat", "has the car");
  const randomAt = n.word("knows", "isn't random");
  const dependsAt = n.word("knows", "depends");
  const infoAt = n.word("knows", "information");
  const whereAt = n.word("knows", "where the car");
  const playAt = n.word("games", "a hundred thousand games");
  const stayAt = n.word("games", "Staying");
  const thirtyAt = n.word("games", "thirty-three percent");
  const switchAt = n.word("games", "Switching");
  const sixtyAt = n.word("games", "sixty-seven");
  const labelsAt = n.word("rv-in", "labels");
  const headsAt = n.word("rv-in", "Heads");
  const aGoatAt = n.word("rv-in", "a goat");
  const positiveAt = n.word("rv-in", "a positive");
  const numbersAt = n.word("rv-in", "numbers");
  const rvInFrom = n.beat("rv-in").from;

  const rowAt = [pickAt - 4, otherAt - 2, otherAt + 8];
  // Where the car is, flashed in every case as the narration says it decides the host's door.
  const carFlash = ease(frame, whereAt - 2, 6) * (1 - ease(frame, whereAt + 12, 14));
  const opensAt = [hasToAt - 2, hasToAt + 2, hasToAt + 6];

  // The lines: drawn out along the games as the narration names the run.
  const reach = lerp(0, LOG_HI, ease(frame, playAt - 4, Math.max(30, sixtyAt - playAt + 4)));
  const K = 10 ** reach;
  const pts = MONTY.path.filter(([k]) => k <= K);
  const stayD = pts.map(([k, v], i) => `${i ? "L" : "M"}${gx(k).toFixed(1)},${fy(v).toFixed(1)}`).join(" ");
  const switchD = pts.map(([k, v], i) => `${i ? "L" : "M"}${gx(k).toFixed(1)},${fy(1 - v).toFixed(1)}`).join(" ");
  const axis = ease(frame, randomAt - 6, 16);
  // The running rate at the newest game drawn, for the labels at the lines' ends.
  const liveStay = pts.length ? pts[pts.length - 1][1] : MONTY.stay;

  return (
    <AbsoluteFill>
      {/* ── Sound: each case, the host's forced doors, the tally, the games ── */}
      <Sfx name="el-tap" at={rowAt[0]} level={-30} />
      <Sfx name="el-tap" at={rowAt[1]} level={-30} />
      <Sfx name="el-whoosh" at={hasToAt - 2} level={-34} />
      <Sfx name="el-pop" at={hasCarAt - 4} level={-30} />
      <Sfx name="el-pencil" at={playAt - 4} level={-34} />
      <Sfx name="el-tap" at={sixtyAt - 2} level={-28} />

      <Headline top={y(150)} first="She was right:" second="switching wins two in three." firstAt={casesFrom - 6} secondAt={hasCarAt - 2} out={rvInFrom - 6} />
      <Headline top={y(150)} first="Outcomes so far:" second="labels, not numbers." firstAt={rvInFrom - 2} secondAt={numbersAt - 6} />
      <FigLabel n="6" title="You pick door 1. Where the car can be" at={casesFrom} x={160} y={y(268)} />

      {/* ── The three cases ── */}
      {CASES.map((c, r) => {
        const at = rowAt[r];
        const ry = y(ROWS[r]);
        const open = ease(frame, opensAt[r], 16);
        const stayWins = c.car === 0;
        const shutDoor = [0, 1, 2].find((d) => d !== 0 && d !== c.opens) ?? 0;
        const glow = !stayWins ? ease(frame, shutAt - 2, 12) : 0;
        const resultAt = stayWins ? oneInAt + 6 : hasCarAt + (r - 1) * 5;
        return (
          <React.Fragment key={r}>
            <Ink at={at} dur={12} style={{ left: 160, top: ry + 14, whiteSpace: "nowrap" }}>
              <span style={{ ...note(24, INK) }}>Car behind {c.car + 1}</span>
              <div style={{ ...note(21, INK_SOFT), opacity: ease(frame, stayWins ? oneInAt - 2 : otherAt + 4, 10) }}>1 in 3</div>
            </Ink>
            <Svg opacity={ease(frame, at, 12)}>
              {MINI.x.map((x, d) => {
                const isOpen = d === c.opens ? open : 0;
                const leaf = lerp(MINI.w, MINI.w * 0.18, isOpen);
                return (
                  <g key={d}>
                    <rect x={x} y={ry} width={MINI.w} height={h(MINI.h)} fill={d === c.car ? GOLD : `color-mix(in srgb, ${INK} 14%, ${PAPER})`} />
                    <rect
                      x={x}
                      y={ry}
                      width={leaf}
                      height={h(MINI.h)}
                      rx={3}
                      fill={FAINT}
                      stroke={d === shutDoor ? `color-mix(in srgb, ${GOLD} ${Math.round(glow * 100)}%, ${INK})` : INK}
                      strokeWidth={d === shutDoor ? lerp(1.6, 4, glow) : 1.6}
                    />
                    {d === c.car && carFlash > 0 ? <rect x={x} y={ry} width={leaf} height={h(MINI.h)} rx={3} fill={GOLD} opacity={carFlash * 0.75} /> : null}
                    {d === 0 ? <rect x={x - 7} y={ry - 7} width={MINI.w + 14} height={h(MINI.h) + 14} rx={8} fill="none" stroke={STAT} strokeWidth={2.6} /> : null}
                  </g>
                );
              })}
            </Svg>
            {/* What is behind each door, for us if not for the player. */}
            {MINI.x.map((x, d) => (
              <div
                key={d}
                style={{
                  position: "absolute",
                  left: x + MINI.w / 2,
                  top: ry + h(MINI.h) + 8,
                  transform: "translateX(-50%)",
                  opacity: ease(frame, d === 0 && !stayWins ? goatAt - 2 : at + 6, 10),
                  ...note(19, d === c.car ? GOLD_INK : INK_SOFT),
                  fontWeight: d === c.car ? 700 : 500,
                  whiteSpace: "nowrap",
                }}
              >
                {d === c.car ? "car" : "goat"}
              </div>
            ))}
            {!stayWins ? <SwitchArrow from={MINI.x[0] + MINI.w / 2} to={MINI.x[c.car] + MINI.w / 2} top={ry - 6} at={hasCarAt - 4 + (r - 1) * 5} /> : null}
            <Ink at={resultAt} dur={12} style={{ left: RESULT_X, top: ry + h(MINI.h) / 2 - 22, whiteSpace: "nowrap" }}>
              <span style={{ ...body(34, true), color: stayWins ? STAT_INK : DATA_INK }}>{stayWins ? "Stay wins" : "Switch wins"}</span>
            </Ink>
          </React.Fragment>
        );
      })}
      <Note at={randomAt} x={160} y={y(868)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          The host&apos;s door <b>depends</b>
          <span style={{ opacity: ease(frame, dependsAt + 6, 10) }}> on where the car is</span>
          <span style={{ opacity: ease(frame, infoAt - 4, 10), color: STAT_INK, fontWeight: 650 }}>, so it carries information.</span>
        </span>
      </Note>

      {/* ── A hundred thousand games ── */}
      <Ink at={randomAt - 6} dur={14} style={{ left: CH.x0, top: y(282), whiteSpace: "nowrap" }}>
        <span style={label(23, INK)}>Win rate so far, over {MONTY.trials.toLocaleString("en-US")} games</span>
      </Ink>
      <Svg opacity={axis}>
        <line x1={CH.x0} x2={CH.x1} y1={y(CH.base) + 0.5} y2={y(CH.base) + 0.5} stroke={INK} strokeWidth={1.6} />
        {[1, 10, 100, 1000, 10_000, 100_000].map((k) => (
          <g key={k}>
            <line x1={gx(k)} x2={gx(k)} y1={y(CH.base) + 1} y2={y(CH.base) + 7} stroke={INK} strokeWidth={1.2} />
            <text x={gx(k)} y={y(CH.base) + 30} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 20, fontWeight: 500, fill: INK_SOFT }}>
              {k >= 1000 ? `${k / 1000}k` : k}
            </text>
          </g>
        ))}
        {[1 / 3, 2 / 3].map((p) => (
          <line key={p} x1={CH.x0} x2={CH.x1} y1={fy(p)} y2={fy(p)} stroke={INK} strokeWidth={1.6} strokeDasharray="6 6" opacity={0.7} />
        ))}
        {[0, 0.5, 1].map((p) => (
          <text key={p} x={CH.x0 - 12} y={fy(p) + 7} textAnchor="end" style={{ fontFamily: SANS, fontSize: 20, fontWeight: 500, fill: INK_SOFT }}>
            {p === 0 ? "0" : p === 1 ? "1" : "½"}
          </text>
        ))}
      </Svg>
      <Svg>
        {pts.length > 1 ? (
          <>
            <path d={stayD} fill="none" stroke={STAT} strokeWidth={3.2} strokeLinejoin="round" />
            <path d={switchD} fill="none" stroke={DATA} strokeWidth={3.2} strokeLinejoin="round" />
          </>
        ) : null}
      </Svg>
      <Note at={stayAt - 2} x={CH.x1 - 4} y={fy(MONTY.stay) + 12} align="right">
        <span style={{ ...note(24, STAT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          stay <span style={{ opacity: ease(frame, thirtyAt - 4, 10) }}>{fmt(liveStay * 100, 1)}%</span>
        </span>
      </Note>
      <Note at={switchAt - 2} x={CH.x1 - 4} y={fy(MONTY.switch) - 46} align="right">
        <span style={{ ...note(24, DATA_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          switch <span style={{ opacity: ease(frame, sixtyAt - 4, 10) }}>{fmt((1 - liveStay) * 100, 1)}%</span>
        </span>
      </Note>
      {/* How many games have been played, counting up as the lines run. */}
      <div style={{ position: "absolute", right: 1920 - CH.x1, top: y(CH.top) - 6, opacity: ease(frame, playAt - 4, 10), whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, INK_SOFT) }}>games </span>
        <span style={{ ...note(34, INK), fontWeight: 700 }}>{Math.round(K).toLocaleString("en-US")}</span>
      </div>

      {/* ── The turn: outcomes so far were labels ── */}
      {(
        [
          ["heads", headsAt],
          ["a goat", aGoatAt],
          ["a positive", positiveAt],
        ] as const
      ).map(([t, at], i) => (
        <Ink key={t} at={at - 4} dur={12} style={{ left: CH.x0 + i * 200, top: y(872), whiteSpace: "nowrap" }}>
          <span
            style={{
              ...note(24, INK),
              padding: "4px 14px",
              borderRadius: 20,
              border: `1.5px solid ${INK_SOFT}`,
              opacity: 1 - ease(frame, numbersAt - 2, 12) * 0.5,
            }}
          >
            {t}
          </span>
        </Ink>
      ))}
      <Ink at={labelsAt - 4} dur={12} style={{ left: CH.x0, top: y(826), whiteSpace: "nowrap" }}>
        <span style={label(22, INK_SOFT)}>
          Outcomes so far
          <span style={{ opacity: ease(frame, numbersAt - 2, 10), color: STAT_INK }}>: no average of these</span>
        </span>
      </Ink>
    </AbsoluteFill>
  );
};

/** A small arc from your pick over to the door with the car. */
const SwitchArrow: React.FC<{ from: number; to: number; top: number; at: number }> = ({ from, to, top, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const arc: Cubic = [
    [from + 8, top - 2],
    [from + 30, top - 40],
    [to - 60, top - 44],
    [to - 10, top - 4],
  ];
  const samples = sampleCubic(arc);
  const shown = samples.slice(0, Math.max(2, Math.round(samples.length * p)));
  return (
    <Svg>
      <path d={cubicPath(arc)} fill="none" stroke={DATA} strokeWidth={2.6} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
      {p > 0.85 ? <path d={arrowHead(shown, 12, 7)} fill="none" stroke={DATA} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /> : null}
    </Svg>
  );
};
