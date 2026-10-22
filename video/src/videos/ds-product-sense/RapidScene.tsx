import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { num, pct, RATIO, TRADE } from "./data";
import { Chip, DATA, Drift, Headline, Kicker, madeUp, Mark, OK_INK, Spot, Strike, X0 } from "./parts";

/** Where the answers go: right of the list. */
const R_X = 800;
const LIST_TOP = 320;
const ROW = 58;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 12. Competing metrics ───────────────────────────────────────────────────

const Trade: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const pullAt = c.w("r-trade", "When two metrics pull apart");
  const goalAt = c.w("r-trade", "which is the goal");
  const limitAt = c.w("r-trade", "which is the limit");
  const sessionsAt = c.w("r-trade", "lifts sessions five percent");
  const unsubsAt = c.w("r-trade", "raises unsubscribes two");
  const winAt = c.w("r-trade", "only a win if");
  const unit = 70;
  const rows = [
    { text: "sessions", v: TRADE.sessions, at: sessionsAt, color: DATA, ink: BLUE_INK, tag: "the goal", tagAt: goalAt },
    { text: "unsubscribes", v: TRADE.unsubscribes, at: unsubsAt, color: ACCENT, ink: ACCENT_INK, tag: "the limit", tagAt: limitAt },
  ];
  return (
    <>
      <Note at={pullAt - 2} x={R_X + 40} y={c.y(330)}>
        <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>two metrics pulling apart: name the goal, and the limit</span>
      </Note>
      <Note at={sessionsAt - 4} x={R_X + 40} y={c.y(392)}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>a notification change:</span>
      </Note>
      {rows.map((r, i) => {
        const p = ease(frame, r.at - 2, 14);
        if (p <= 0) return null;
        const top = c.y(440) + i * c.h(78);
        return (
          <React.Fragment key={r.text}>
            <div style={{ position: "absolute", left: R_X + 40, top: top + c.h(4), ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap", opacity: p }}>{r.text}</div>
            <div style={{ position: "absolute", left: R_X + 230, top, width: r.v * unit * p, height: c.h(40), background: r.color, opacity: 0.85, borderRadius: 3 }} />
            <div style={{ position: "absolute", left: R_X + 244 + r.v * unit, top: top + c.h(4), ...note(26, r.ink), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap", opacity: p }}>
              +{r.v}%
            </div>
            <Chip x={R_X + 340 + r.v * unit} y={top - c.h(2)} at={Math.max(r.tagAt, r.at) + 4} size={22} ink={r.ink}>
              {r.tag}
            </Chip>
          </React.Fragment>
        );
      })}
      <Note at={winAt} x={R_X + 40} y={c.y(620)}>
        <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
          a win only if <Mark at={winAt + 10}>the long-run math nets out positive</Mark>
        </span>
      </Note>
    </>
  );
};

// ── 13. Vanity metrics ──────────────────────────────────────────────────────

const Vanity: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const vanityAt = c.w("r-vanity", "A vanity metric looks good");
  const upAt = c.w("r-vanity", "only goes up");
  const signupsAt = c.w("r-vanity", "like total signups");
  const doubledAt = c.w("r-vanity", "if it doubled");
  const differentlyAt = c.w("r-vanity", "what to do differently");
  const preferAt = c.w("r-vanity", "Prefer rates and cohorts");
  const retentionAt = c.w("r-vanity", "week-four retention");
  const draw = ease(frame, upAt - 2, 24);
  const W = 420;
  const H = c.h(150);
  const x0 = R_X + 40;
  const base = c.y(520);
  const pts = Array.from({ length: 20 }, (_, i) => [x0 + (i / 19) * W, base - ((i / 19) ** 1.25 * 0.92 + 0.04) * H] as const);
  return (
    <>
      <Note at={vanityAt - 2} x={R_X + 40} y={c.y(330)}>
        <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>looks good, and only goes up</span>
      </Note>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line x1={x0} x2={x0 + W} y1={base} y2={base} stroke={INK} strokeWidth={1.6} opacity={draw > 0 ? 1 : 0} />
        <path
          d={pts.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ")}
          fill="none"
          stroke={DATA}
          strokeWidth={4}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${draw} 1`}
        />
      </svg>
      <Note at={signupsAt} x={x0 + W + 18} y={base - H}>
        <span style={{ ...note(26, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>total signups</span>
      </Note>
      <Note at={doubledAt - 2} x={R_X + 40} y={c.y(560)}>
        <span style={{ ...note(28, INK), fontStyle: "italic", whiteSpace: "nowrap" }}>
          If it doubled, <span style={{ opacity: ease(frame, differentlyAt - 2, 10) }}>would you know what to do differently?</span>
        </span>
      </Note>
      <Note at={preferAt - 2} x={R_X + 40} y={c.y(640)}>
        <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>prefer rates and cohorts:</span>
      </Note>
      <Chip x={R_X + 380} y={c.y(632)} at={retentionAt - 2} ink={OK_INK} size={25}>
        week-four retention
      </Chip>
    </>
  );
};

// ── 14. Ratio metrics ───────────────────────────────────────────────────────

const Ratio: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const topAt = c.w("r-ratio", "because of its top");
  const bottomAt = c.w("r-ratio", "its bottom");
  const mixAt = c.w("r-ratio", "the mix underneath");
  const roseAt = c.w("r-ratio", "Saves per user rose");
  const fellAt = c.w("r-ratio", "while saves fell");
  const leftAt = c.w("r-ratio", "a fifth of the users left");
  const readAt = c.w("r-ratio", "Read both halves");
  const addAt = c.w("r-ratio", "add up counts across groups");
  const avgAt = c.w("r-ratio", "averaging their ratios");
  const frac = (top: number, bottom: number, value: string, from: number, x: number, ink: string) => (
    <Note at={from} x={x} y={c.y(430)}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", ...note(28, INK), ...TABULAR }}>
          <span style={{ paddingBottom: 6 }}>{num(top)} saves</span>
          <span style={{ alignSelf: "stretch", height: 2, background: INK }} />
          <span style={{ paddingTop: 6 }}>{num(bottom)} users</span>
        </div>
        <span style={{ ...note(40, ink), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>= {value}</span>
      </div>
    </Note>
  );
  return (
    <>
      <Note at={topAt - 2} x={R_X + 40} y={c.y(330)}>
        <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
          a ratio moves with its top
          <span style={{ opacity: ease(frame, bottomAt, 10) }}>, its bottom</span>
          <span style={{ opacity: ease(frame, mixAt, 10) }}>, or the mix underneath</span>
        </span>
      </Note>
      {frac(RATIO.savesBefore, RATIO.usersBefore, RATIO.perUserBefore.toFixed(1), roseAt - 2, R_X + 40, INK)}
      <Note at={roseAt + 6} x={R_X + 410} y={c.y(458)}>
        <span style={{ ...note(36, INK_SOFT), whiteSpace: "nowrap" }}>→</span>
      </Note>
      {frac(RATIO.savesAfter, RATIO.usersAfter, RATIO.perUserAfter.toFixed(1), roseAt + 8, R_X + 480, BLUE_INK)}
      <Note at={fellAt} x={R_X + 480} y={c.y(560)}>
        <span style={{ ...label(22, ACCENT_INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>saves {pct(RATIO.savesChange)}</span>
      </Note>
      <Note at={leftAt} x={R_X + 680} y={c.y(560)}>
        <span style={{ ...label(22, ACCENT_INK), fontWeight: 700, ...TABULAR, whiteSpace: "nowrap" }}>users {pct(RATIO.usersChange)}</span>
      </Note>
      <Note at={readAt - 2} x={R_X + 40} y={c.y(630)}>
        <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
          <Mark at={readAt + 4}>read both halves</Mark>
        </span>
      </Note>
      <Note at={addAt - 2} x={R_X + 40} y={c.y(684)}>
        <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
          add up counts across groups,{" "}
          <span style={{ color: ACCENT_INK, opacity: ease(frame, avgAt - 2, 10) }}>
            don&apos;t <Strike at={avgAt + 6}>average the ratios</Strike>
          </span>
        </span>
      </Note>
      <Note at={roseAt} x={R_X + 40} y={c.y(560)}>
        <span style={madeUp()}>made up for this video</span>
      </Note>
    </>
  );
};

/**
 * The quick round, questions 12 to 14: the numbered list on the left, ticked
 * as the round goes, each answer on the right. Then the bridge into Part 9:
 * every case ends with someone pulling the numbers, and next time that's you,
 * in Python.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: (b, p) => n.word(b, p), y, h };

  const from = n.beat("rapid-in").from;
  const threeAt = n.word("rapid-in", "Three left");
  const eachAt = n.word("rapid-in", "each about a number");
  const everyAt = n.word("next", "Every case in this round");
  const pullingAt = n.word("next", "someone pulling the numbers");
  const youAt = n.word("next", "that's you, in Python");
  const nextAt = n.word("next", "Next", { nth: 2 });
  const end = n.beat("next").from;

  const items: RapidItem[] = [
    { n: 12, label: "Competing metrics", beat: "r-trade", body: <Trade c={c} /> },
    { n: 13, label: "Vanity metrics", beat: "r-vanity", body: <Vanity c={c} /> },
    { n: 14, label: "Ratio metrics", beat: "r-ratio", body: <Ratio c={c} /> },
  ].map(({ beat, ...item }) => ({ ...item, at: n.beat(beat).from }));

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={from} level={-34} />
      {items.map((item) => (
        <Sfx key={item.n} name="el-tap" at={item.at} level={-34} />
      ))}
      <Sfx name="el-pencil" at={pullingAt} level={-36} />
      <Sfx name="el-chime" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40} scale={0.015}>
        <Kicker at={from}>Questions 12 to 14</Kicker>
        <Headline lead="Three left," turn="each about a number you already have." at={threeAt - 4} turnAt={eachAt - 4} size={60} />
        <Spot id="da-sql-stopwatch" video="da-sql" at={from + 6} left={1660} top={y(300)} width={130} height={140} />

        <RapidFire items={items} x={X0} top={y(LIST_TOP) + h(40)} rowH={h(ROW)} width={600} at={eachAt} end={end} />

        {/* The bridge: someone pulls the numbers, and next time it's you. */}
        <Note at={everyAt} x={R_X + 40} y={y(360)}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
            every case ends with <Mark at={pullingAt + 4}>someone pulling the numbers</Mark>
          </span>
        </Note>
        <Note at={youAt} x={R_X + 40} y={y(430)}>
          <span style={{ ...note(30, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>next time, that&apos;s you, in Python</span>
        </Note>
        <NextLine at={nextAt} x={R_X + 40} y={y(560)} width={860}>
          Python &amp; pandas
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
