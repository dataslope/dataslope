import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, normalPdf, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { jitter, USERS } from "./data";
import { Bracket, DATA, EST, EST_INK, Headline, IntervalBar, Kicker, Marked, pulse, Rule, Slot, Svg, XBar } from "./parts";

/** Fig. 1: every user's monthly spend. */
const X: XScale = { lo: 10, hi: 90, x0: 160, x1: 1240 };
const STRIP = 440;
const AXIS1 = 490;
/** Fig. 2: the same axis, zoomed to the stretch around the average. */
const Z: XScale = { lo: 43, hi: 55.5, x0: 160, x1: 1760 };
const BASE = 836;
const BELL_H = 150;
const BAR_Y = 640;
/** The inset: the two critical values on a scale of their own. */
const C: XScale = { lo: 1.9, hi: 2.1, x0: 1340, x1: 1700 };
const C_Y = 470;

const JIT = jitter(61, USERS.n);
const money = (v: number) => `$${fmt(v)}`;

/**
 * Part 1 opens on Unit 5's last line: an interval built properly from an
 * estimate, its standard error and a critical value, on the lesson's fifty
 * users. The formula across the top fills in term by term as each number is
 * spoken; Fig. 2 zooms in on the average to show the wobble and the margin.
 */
export const BuildScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const twoNumbersAt = n.word("hook", "two numbers");
  const dataAt = n.word("hook", "data");
  const estimateAt = n.word("hook", "estimate");
  const seWordAt = n.word("hook", "standard error");
  const fiftyAt = n.word("users", "Fifty users");
  const averageAt = n.word("users", "average");
  const fortyNineAt = n.word("users", "forty-nine");
  const thatsAt = n.word("users", "estimate");
  const anotherAt = n.word("wobble", "Another");
  const elseAt = n.word("wobble", "something else");
  const howMuchAt = n.word("wobble", "how much");
  const dollarFiftyAt = n.word("wobble", "dollar fifty");
  const seWobbleAt = n.word("wobble", "standard error");
  const monthAt = n.word("users", "month");
  const thirtyThreeAt = n.word("interval", "thirty-three");
  const intervalWordAt = n.word("interval", "interval");
  const multiplyAt = n.word("margin", "Multiply");
  const whyAt = n.word("why", "Why");
  const buildingAt = n.word("means-in", "Building");
  const tDistAt = n.word("why-t", "t-distribution");
  const slipEndAt = n.word("means-in", "slip", { edge: "end" });
  const criticalAt = n.word("margin", "critical value");
  const twoOhOneAt = n.word("margin", "two point oh one");
  const marginAt = n.word("margin", "margin of error");
  const threeAt = n.word("margin", "three dollars");
  const stepAt = n.word("interval", "Step");
  const fortySixAt = n.word("interval", "forty-six");
  const fiftyTwoAt = n.word("interval", "fifty-two");
  const usualAt = n.word("why", "usual");
  const nineSixAt = n.word("why", "one point nine six");
  const spreadAt = n.word("why-t", "spread");
  const sameAt = n.word("why-t", "same fifty");
  const widensAt = n.word("why-t", "widens");
  const payAt = n.word("why-t", "pay");
  const easyAt = n.word("means-in", "easy");
  const meansAt = n.word("means-in", "means");

  const mx = sx(Z, USERS.xBar);
  const zx = (v: number) => sx(Z, v);

  const zoomIn = ease(frame, anotherAt - 4, 18);
  const bell = ease(frame, elseAt - 6, 20);
  const bellPath = (() => {
    const pts: string[] = [];
    const peak = normalPdf(0, 0, USERS.se);
    for (let i = 0; i <= 120; i++) {
      const v = USERS.xBar - 3.6 * USERS.se + (7.2 * USERS.se * i) / 120;
      const yy = y(BASE) - h(BELL_H) * (normalPdf(v, USERS.xBar, USERS.se) / peak) * bell;
      pts.push(`${i ? "L" : "M"}${zx(v).toFixed(1)},${yy.toFixed(1)}`);
    }
    return pts.join(" ");
  })();

  // The formula across the top: each term arrives on its word, each value
  // when it is spoken.
  const term = (at: number, text: string, value: React.ReactNode, color = INK, valueAt?: number, mark?: number, markOut?: number) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
      <Slot at={at} style={headline(50)}>
        {mark === undefined ? (
          text
        ) : (
          <Marked at={mark} out={markOut} color={HIGHLIGHT}>
            {text}
          </Marked>
        )}
      </Slot>
      <div style={{ height: 44, position: "relative" }}>
        {valueAt !== undefined ? (
          <Ink at={valueAt} dur={14} style={{ position: "relative", ...note(34, color), fontWeight: 700, whiteSpace: "nowrap" }}>
            {value}
          </Ink>
        ) : null}
      </div>
    </div>
  );
  const op = (at: number, text: string) => (
    <Slot at={at} dur={12} style={{ ...headline(50), color: INK_SOFT }}>
      {text}
    </Slot>
  );

  return (
    <AbsoluteFill>
      {/* ── Sound: the fifty users, their average, the bell, the margin, the interval, the t ── */}
      <Sfx name="el-sprinkle" at={dataAt - 4} level={-33} />
      <Sfx name="el-tap" at={fortyNineAt - 4} level={-28} />
      <Sfx name="el-pencil" at={elseAt - 6} level={-34} />
      <Sfx name="el-pop" at={threeAt - 4} level={-30} />
      <Sfx name="el-whoosh" at={stepAt} level={-33} />
      <Sfx name="el-tap" at={nineSixAt} level={-29} />

      <Kicker at={hookFrom - 10}>What 95% confident means</Kicker>
      <Headline at={hookFrom - 4} second={twoNumbersAt - 4} out={estimateAt - 10} size={64} italic="two numbers.">
        An interval needs
      </Headline>

      {/* ── The formula: estimate ± critical value × standard error ── */}
      <div style={{ position: "absolute", left: 96, top: y(150), display: "flex", alignItems: "flex-start", gap: 26 }}>
        {term(estimateAt - 4, "estimate", money(USERS.xBar), EST_INK, fortyNineAt - 2, thatsAt - 2, anotherAt + 4)}
        {op(criticalAt - 6, "±")}
        {term(criticalAt - 4, "critical value", fmt(USERS.tCrit), INK, twoOhOneAt - 2, payAt - 4)}
        {op(multiplyAt - 4, "×")}
        {term(seWordAt - 4, "standard error", money(USERS.se), INK, dollarFiftyAt - 2, seWobbleAt - 2, criticalAt)}
        {op(intervalWordAt - 6, "=")}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
          <Slot at={intervalWordAt - 4} style={headline(50)}>
            <Marked at={meansAt - 4} color={HIGHLIGHT}>
              95%
            </Marked>{" "}
            interval
          </Slot>
          <div style={{ height: 44, position: "relative", display: "flex", gap: "0.35em", whiteSpace: "nowrap", ...note(34, INK), fontWeight: 700 }}>
            <Ink at={fortySixAt - 2} dur={12} style={{ position: "relative" }}>
              {money(USERS.lo)}
            </Ink>
            <Ink at={fiftyTwoAt - 6} dur={12} style={{ position: "relative" }}>
              to {money(USERS.hi)}
            </Ink>
          </div>
        </div>
      </div>
      <Ink at={marginAt - 4} dur={16} style={{ left: 98, top: y(300), whiteSpace: "nowrap" }}>
        <span style={{ ...note(26, INK_SOFT) }}>
          margin of error: {fmt(USERS.tCrit)} × {money(USERS.se)} ={" "}
          <span style={{ color: EST_INK, fontWeight: 700, opacity: ease(frame, threeAt - 2, 10) }}>{money(USERS.margin)}</span>
        </span>
      </Ink>

      {/* ── Fig. 1: the fifty users ── */}
      <FigLabel n="1" title={`${USERS.n} users' monthly spend, in dollars`} at={dataAt - 8} x={160} y={y(362)} />
      <Svg>
        <rect
          x={sx(X, Z.lo)}
          y={y(STRIP) - h(34)}
          width={(sx(X, Z.hi) - sx(X, Z.lo)) * zoomIn}
          height={h(68)}
          fill={HIGHLIGHT}
          opacity={0.45}
        />
        {USERS.values.map((v, j) => {
          const a = ease(frame, dataAt - 4 + j * 0.45, 7);
          if (a <= 0) return null;
          // They arrive on "from the data", and swell once as "Fifty users" names them.
          const named = 1 + 0.3 * pulse(frame, fiftyAt - 2 + j * 0.3, 16);
          return (
            <circle key={j} cx={sx(X, v)} cy={y(STRIP) + h((JIT[j] - 0.5) * 44)} r={7 * a * named} fill={DATA} stroke={PAPER} strokeWidth={1.4} opacity={0.85} />
          );
        })}
      </Svg>
      <Axis scale={X} base={y(AXIS1)} ticks={[10, 30, 50, 70, 90]} at={dataAt - 6} format={(v) => `$${v}`} />
      <Rule
        x={sx(X, USERS.xBar)}
        y0={y(STRIP) + h(38)}
        y1={y(STRIP) - h(40)}
        at={averageAt - 2}
        color={EST}
        width={4 + 3 * pulse(frame, thatsAt - 4, 16)}
      />
      <Note at={monthAt - 4} x={sx(X, USERS.xBar) + 12} y={y(STRIP) - h(44) - 18} out={spreadAt - 6}>
        <span style={{ ...note(22, EST_INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>
          <XBar /> = {money(USERS.xBar)} a month
        </span>
      </Note>
      <IntervalBar x0={sx(X, USERS.lo)} x1={sx(X, USERS.hi)} y={y(STRIP) + h(36)} at={thirtyThreeAt} dur={12} color={INK} width={3} tick={7} />
      {/* The spread the t pays for: one s either side, from the same fifty. */}
      <Bracket
        x0={sx(X, USERS.xBar - USERS.s)}
        x1={sx(X, USERS.xBar + USERS.s)}
        y={y(STRIP) - h(44)}
        at={spreadAt - 2}
        out={easyAt}
        color={INK}
        up={false}
      />
      <Note at={sameAt - 4} x={sx(X, USERS.xBar + USERS.s) + 16} y={y(STRIP) - h(44) - 16} out={easyAt}>
        <span style={{ ...note(22, INK), ...halo, whiteSpace: "nowrap" }}>
          spread s = {money(USERS.s)}, from the same {USERS.n}
        </span>
      </Note>

      {/* ── Fig. 2: zoomed in on the average ── */}
      <FigLabel n="2" title={`Zoomed in: ${money(Z.lo)} to ${money(Z.hi)}`} at={anotherAt - 2} x={160} y={y(560)} />
      <Axis scale={Z} base={y(BASE)} ticks={[44, 46, 48, 50, 52, 54]} at={anotherAt} format={(v) => `$${v}`} opacity={zoomIn} />
      {bell > 0 ? (
        <Svg>
          <path d={`${bellPath} L${zx(USERS.xBar + 3.6 * USERS.se)},${y(BASE)} L${zx(USERS.xBar - 3.6 * USERS.se)},${y(BASE)} Z`} fill={EST} opacity={0.12} />
          <path d={bellPath} fill="none" stroke={EST} strokeWidth={2.6} />
        </Svg>
      ) : null}
      <Note at={elseAt + 4} x={zx(USERS.xBar - 2.3 * USERS.se) - 10} y={y(BASE) - h(BELL_H * 0.4)} align="right" from="right">
        <span style={{ ...note(22, EST_INK), ...halo, whiteSpace: "nowrap" }}>how much an average wobbles</span>
      </Note>
      <Rule x={mx} y0={y(BASE)} y1={y(BAR_Y) - h(26)} at={fortyNineAt - 2} color={EST} width={3.2} opacity={zoomIn} />

      {/* One standard error, then the margin: 2.01 of them. */}
      <Bracket x0={mx} x1={zx(USERS.xBar + USERS.se)} y={y(BASE) - h(BELL_H * 0.3)} at={howMuchAt - 2} color={INK} />
      <Note at={dollarFiftyAt - 2} x={zx(USERS.xBar + USERS.se) + 10} y={y(BASE) - h(BELL_H * 0.3) - 14}>
        <span style={{ ...note(21, INK), fontWeight: 650, whiteSpace: "nowrap" }}>1 SE</span>
      </Note>
      <Rule x={zx(USERS.xBar - USERS.margin)} y0={y(BASE)} y1={y(BAR_Y) + h(24)} at={twoOhOneAt - 2} color={INK_SOFT} width={1.6} dash="5 5" />
      <Rule x={zx(USERS.xBar + USERS.margin)} y0={y(BASE)} y1={y(BAR_Y) + h(24)} at={twoOhOneAt} color={INK_SOFT} width={1.6} dash="5 5" />
      <Bracket x0={mx} x1={zx(USERS.hi)} y={y(BAR_Y) - h(40)} at={marginAt - 2} color={EST} />
      <Note at={threeAt - 2} x={(mx + zx(USERS.hi)) / 2} y={y(BAR_Y) - h(40) - 38} from="up">
        <span style={{ ...note(22, EST_INK), fontWeight: 700, ...halo, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
          margin {money(USERS.margin)}
        </span>
      </Note>

      {/* The interval itself, on both figures. */}
      <IntervalBar
        x0={zx(USERS.lo)}
        x1={zx(USERS.hi)}
        y={y(BAR_Y)}
        at={stepAt - 2}
        dur={22}
        color={INK}
        width={4 + 4 * pulse(frame, buildingAt - 2, 20)}
        tick={14}
      />
      <Note at={fortySixAt} x={zx(USERS.lo) - 14} y={y(BAR_Y) - 16} align="right" from="right">
        <span style={{ ...note(26, INK), fontWeight: 700, ...halo }}>{money(USERS.lo)}</span>
      </Note>
      <Note at={fiftyTwoAt - 4} x={zx(USERS.hi) + 14} y={y(BAR_Y) - 16}>
        <span style={{ ...note(26, INK), fontWeight: 700, ...halo }}>{money(USERS.hi)}</span>
      </Note>
      <Svg>
        <circle cx={mx} cy={y(BAR_Y)} r={7 * ease(frame, stepAt, 10) * (1 + 0.35 * pulse(frame, easyAt - 2, 16))} fill={EST} stroke={PAPER} strokeWidth={1.6} />
      </Svg>

      {/* ── The inset: why 2.01 and not 1.96 ── */}
      <Ink at={whyAt - 4} dur={14} out={meansAt - 8} style={{ left: C.x0, top: y(C_Y - 100), whiteSpace: "nowrap" }}>
        <span style={label(21, INK_SOFT)}>Critical value for 95%</span>
      </Ink>
      <Axis scale={C} base={y(C_Y)} ticks={[1.9, 2.0, 2.1]} format={(v) => fmt(v, 1)} at={usualAt - 2} opacity={1 - ease(frame, meansAt - 8, 10)} />
      <Rule x={sx(C, USERS.zCrit)} y0={y(C_Y)} y1={y(C_Y) - h(40)} at={nineSixAt} color={INK_SOFT} width={3} out={meansAt - 8} />
      <Note at={nineSixAt + 2} x={sx(C, USERS.zCrit)} y={y(C_Y) - h(40) - 30} from="up" out={meansAt - 8}>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
          normal {fmt(USERS.zCrit)}
        </span>
      </Note>
      <Rule x={sx(C, USERS.tCrit)} y0={y(C_Y)} y1={y(C_Y) - h(40)} at={tDistAt - 2} color={EST} width={4 + 3 * pulse(frame, widensAt - 2, 18)} out={meansAt - 8} />
      <Note at={tDistAt} x={sx(C, USERS.tCrit) + 8} y={y(C_Y) - h(40) - 30} from="up" out={meansAt - 8}>
        <span style={{ ...note(20, EST_INK), fontWeight: 700, whiteSpace: "nowrap" }}>t-distribution: {fmt(USERS.tCrit)}</span>
      </Note>

      {/* The turn: what the 95% means. */}
      <Ink at={meansAt - 2} dur={18} style={{ left: 1340, top: y(400), whiteSpace: "nowrap" }}>
        <span style={{ ...body(34, true), color: INK }}>But what does the 95% mean?</span>
        <div style={{ height: 3, marginTop: 6, background: EST, width: `${100 * ease(frame, slipEndAt - 4, 16)}%`, borderRadius: 2 }} />
      </Ink>
    </AbsoluteFill>
  );
};
