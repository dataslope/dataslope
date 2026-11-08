import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, BAR, BLUE_INK, INK, INK_SOFT, PAPER } from "../../editorial/style";
import { NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { ACCOUNT, FACTORY, SINGLETON, TOTAL_AREA } from "./data";
import { ACCENT_INK, ArtSpot, artW, Box, Drift, Flow, Headline, Kicker, Line, Mark, Mark2, OK, OK_INK, pulse, Strike, Svg, VRule, X0 } from "./parts";

const R_X = 820;
const LIST_TOP = 330;
const ROW = 64;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 9. The four pillars ──────────────────────────────────────────────────────

/** Every pillar is the one painted column (be-object-design-pillar),
 *  glazed in its own hue: an SVG filter recolors the painting toward the
 *  hue while keeping its washes' light and dark, then lays that over the
 *  painting at GLAZE. The four filters are defined once, here. */
const GLAZE = 0.85;
const Glazes: React.FC<{ colors: readonly string[] }> = ({ colors }) => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <defs>
      {colors.map((color, i) => (
        <filter key={i} id={`be-object-design-glaze-${i}`} colorInterpolationFilters="sRGB">
          <feFlood style={{ floodColor: color }} result="hue" />
          <feComposite in="hue" in2="SourceGraphic" operator="in" result="wash" />
          <feBlend in="wash" in2="SourceGraphic" mode="color" result="tinted" />
          <feComposite in="tinted" in2="SourceGraphic" operator="arithmetic" k2={GLAZE} k3={1 - GLAZE} />
        </filter>
      ))}
    </defs>
  </svg>
);

/** The rows: a word and its gloss beside a column PILLAR_H tall, centred on
 *  the two lines, with clear air between one column and the next. */
const PILLAR_TOP = 344;
const PILLAR_PITCH = 128;
const PILLAR_H = 100;
/** The two lines' middle, under a row's top. */
const TEXT_MID = 29;

const Pillars: React.FC<{ c: Ctx }> = ({ c }) => {
  const rows = [
    { at: c.w("r-pillars", "Encapsulation bundles data"), word: "Encapsulation", gloss: "bundles data with its methods, hides the state", color: BAR },
    { at: c.w("r-pillars", "Inheritance reuses"), word: "Inheritance", gloss: "reuses and specializes a class", color: ds("green", 500) },
    { at: c.w("r-pillars", "Polymorphism gives one call"), word: "Polymorphism", gloss: "one call, the right behavior for each type", color: ACCENT },
    { at: c.w("r-pillars", "Abstraction shows what an object does"), word: "Abstraction", gloss: "what an object does, not how", color: ds("yellow", 600) },
  ];
  const pw = artW("pillar", PILLAR_H);
  return (
    <>
      <Glazes colors={rows.map((r) => r.color)} />
      {rows.map((r, i) => {
        const top = c.y(PILLAR_TOP + i * PILLAR_PITCH);
        return (
          <React.Fragment key={r.word}>
            <ArtSpot id="pillar" at={r.at - 4} left={R_X + 18 - pw / 2} top={top + TEXT_MID - PILLAR_H / 2} h={PILLAR_H} filter={`url(#be-object-design-glaze-${i})`} />
            <Line x={R_X + 90} y={top - 4} at={r.at} size={27} weight={500}>
              {r.word}
            </Line>
            <Line x={R_X + 90} y={top + 34} at={r.at + 6} size={23} color={INK_SOFT}>
              {r.gloss}
            </Line>
          </React.Fragment>
        );
      })}
    </>
  );
};

// ── 10. Encapsulation ────────────────────────────────────────────────────────

const Encap: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const hidesAt = c.w("r-encap", "an account hides its balance");
  const checkAt = c.w("r-encap", "methods that check");
  const overdrawAt = c.w("r-encap", "no withdrawal can overdraw it");
  const guardAt = c.w("r-encap", "Guard every way in");
  const ctorAt = c.w("r-encap", "the constructor too");
  const opensAt = c.w("r-encap", "An account that opens at minus fifty");
  const alreadyAt = c.w("r-encap", "is overdrawn already");
  const shell = { x: 1090, w: 320, top: c.y(420), h: 210 };
  const mid = shell.top + shell.h / 2;
  const bounce = ease(frame, overdrawAt + 4, 10) - ease(frame, overdrawAt + 16, 10);
  const opened = ease(frame, opensAt + 10, 12);
  const value = opened > 0.5 ? ACCOUNT.opening : 100;
  const overdraw = ACCOUNT.overdraw.replace(/^ValueError: /, "");
  return (
    <>
      {/* The shell: three bands, the balance inside. */}
      <div
        style={{
          position: "absolute",
          left: shell.x,
          top: shell.top,
          width: shell.w,
          height: shell.h,
          boxSizing: "border-box",
          border: `6px solid ${INK}`,
          borderRadius: "110px 110px 22px 22px",
          background: `color-mix(in srgb, ${INK} 4%, ${PAPER})`,
          opacity: ease(frame, hidesAt, 12),
        }}
      />
      <Line x={shell.x + shell.w / 2} y={shell.top + 64} at={hidesAt + 4} size={22} color={INK_SOFT} weight={500} align="center" width={240}>
        balance, hidden
      </Line>
      <Line x={shell.x + shell.w / 2} y={shell.top + 102} at={hidesAt + 8} size={40} weight={500} color={value < 0 ? ACCENT_INK : BLUE_INK} align="center" width={240}>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{value < 0 ? `−${Math.abs(value)}` : value}</span>
      </Line>

      {/* The withdraw door checks. */}
      <Box x={shell.x + shell.w - 10} y={mid - 30} w={26} h={60} at={checkAt} tone="ok" radius={6} />
      <Line x={shell.x + shell.w + 40} y={mid - 112} at={checkAt + 4} size={22} color={OK_INK} weight={500}>
        withdraw: checks
      </Line>
      <Flow points={[[1740, mid], [shell.x + shell.w + 26 + 24 * bounce, mid]]} at={overdrawAt} dur={10} color={ACCENT} />
      <Line x={shell.x + shell.w + 50} y={mid - 46} at={overdrawAt} size={22} weight={500}>
        withdraw 200
      </Line>
      <Line x={shell.x + shell.w + 50} y={mid + 22} at={overdrawAt + 12} size={22} color={ACCENT_INK} weight={500}>
        refused: {overdraw}
      </Line>

      {/* The constructor's door, unguarded, then guarded. */}
      <Box x={shell.x - 16} y={mid - 30} w={26} h={60} at={guardAt} tone="bad" tones={[[alreadyAt + 16, "ok"]]} dashed radius={6} />
      <Line x={R_X} y={mid - 112} at={ctorAt} size={22} weight={500} color={ACCENT_INK}>
        <span style={{ opacity: 1 - ease(frame, alreadyAt + 16, 10) }}>opening: no check</span>
      </Line>
      <Line x={R_X} y={mid - 112} at={alreadyAt + 16} size={22} weight={500} color={OK_INK}>
        opening: checked too
      </Line>
      <Flow points={[[R_X, mid], [shell.x - 26, mid]]} at={opensAt} dur={10} color={ACCENT} />
      <Line x={R_X} y={mid - 46} at={opensAt} size={22} weight={500}>
        open at −50
      </Line>
      <Line x={shell.x} y={shell.top + shell.h + 26} at={alreadyAt} size={24} color={ACCENT_INK} weight={500}>
        overdrawn already
      </Line>
      <Line x={shell.x} y={shell.top + shell.h + 76} at={guardAt} size={24} weight={500}>
        <Mark at={guardAt + 4}>Guard every way in</Mark>
      </Line>
    </>
  );
};

// ── 11. Polymorphism ─────────────────────────────────────────────────────────

const Poly: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const totalAt = c.w("r-poly", "total area asks each shape");
  const circleAt = c.w("r-poly", "a circle and a square alike");
  const squareAt = c.w("r-poly", "a square alike");
  const noAt = c.w("r-poly", "with no ladder of type checks");
  const top = c.y(390);
  const shapes = c.y(560);
  const circle = Math.PI * 1 ** 2;
  if (Math.abs(circle + 4 - TOTAL_AREA) > 0.01) throw new Error("the parts no longer add up to the run's total");
  const R = 54;
  return (
    <>
      <Box x={1010} y={top} w={300} h={70} at={totalAt} title="total area" tone="plain" />
      <Flow points={[[1110, top + 76], [1110, shapes - 20], [960, shapes - 20], [960, shapes + 4]]} at={circleAt} dur={10} width={2.2} head={12} />
      <Flow points={[[1210, top + 76], [1210, shapes - 20], [1360, shapes - 20], [1360, shapes + 4]]} at={squareAt} dur={10} width={2.2} head={12} />
      <Line x={1110 - 150} y={top + 100} at={circleAt + 2} size={21} color={INK_SOFT} weight={500}>
        area?
      </Line>
      <Line x={1210 + 60} y={top + 100} at={squareAt + 2} size={21} color={INK_SOFT} weight={500}>
        area?
      </Line>
      <Svg opacity={ease(frame, circleAt + 6, 10)}>
        <circle cx={960} cy={shapes + 16 + R} r={R} fill={`color-mix(in srgb, ${BAR} 16%, ${PAPER})`} stroke={BAR} strokeWidth={3} />
      </Svg>
      <Svg opacity={ease(frame, squareAt + 6, 10)}>
        <rect x={1360 - 54} y={shapes + 16} width={108} height={108} fill={`color-mix(in srgb, ${BAR} 16%, ${PAPER})`} stroke={BAR} strokeWidth={3} />
      </Svg>
      <Line x={960} y={shapes + 150} at={circleAt + 10} size={26} weight={500} color={BLUE_INK} align="center" width={200}>
        {circle.toFixed(2)}
      </Line>
      <Line x={1360} y={shapes + 150} at={squareAt + 10} size={26} weight={500} color={BLUE_INK} align="center" width={200}>
        4
      </Line>
      <Line x={1336} y={top + 18} at={squareAt + 16} size={26} weight={500} color={BLUE_INK}>
        = {TOTAL_AREA.toFixed(2)}
      </Line>
      <Line x={R_X} y={c.y(800)} at={noAt} size={24} color={INK_SOFT}>
        no ladder of <Strike at={noAt + 8}>type checks</Strike>
      </Line>
    </>
  );
};

// ── 12. Factory ──────────────────────────────────────────────────────────────

const Factory: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const centralAt = c.w("r-factory", "A factory centralizes creation");
  const askAt = c.w("r-factory", "callers ask for what they want");
  const csvAt = c.w("r-factory", "like a parser for CSV");
  const howAt = c.w("r-factory", "not how to build it");
  const paysAt = c.w("r-factory", "It pays off when");
  const runtimeAt = c.w("r-factory", "depends on runtime input");
  const complexAt = c.w("r-factory", "construction is complex");
  if (FACTORY.csv !== "CsvParser") throw new Error(`the factory now returns ${FACTORY.csv}`);
  const xml = FACTORY.xml.replace(/^ValueError: /, "");
  const row1 = c.y(420);
  const row2 = c.y(540);
  const H = 62;
  const fx = { x: 1130, w: 220 };
  return (
    <>
      <Box x={fx.x} y={row1 - 10} w={fx.w} h={row2 - row1 + H + 20} at={centralAt} title="Factory" sub={<span style={{ opacity: ease(frame, howAt, 10) }}>knows how to build</span>} tone="plain" />
      <Box x={R_X} y={row1} w={180} h={H} at={askAt} title="caller" />
      <Flow points={[[R_X + 186, row1 + H / 2], [fx.x - 8, row1 + H / 2]]} at={csvAt} dur={10} width={2.4} head={12} />
      <Line x={R_X + 214} y={row1 - 6} at={csvAt} size={21} weight={500} color={BLUE_INK}>
        “csv”
      </Line>
      <Flow points={[[fx.x + fx.w + 6, row1 + H / 2], [1490 - 8, row1 + H / 2]]} at={csvAt + 10} dur={10} width={2.4} head={12} color={OK} />
      <Box x={1490} y={row1} w={230} h={H} at={csvAt + 16} title="a CSV parser" tone="ok" size={23} />
      <Box x={R_X} y={row2} w={180} h={H} at={howAt + 4} title="caller" />
      <Flow points={[[R_X + 186, row2 + H / 2], [fx.x - 8, row2 + H / 2]]} at={howAt + 8} dur={10} width={2.4} head={12} />
      <Line x={R_X + 214} y={row2 + H + 4} at={howAt + 8} size={21} weight={500} color={BLUE_INK}>
        “xml”
      </Line>
      <Line x={fx.x + fx.w + 30} y={row2 + H / 2 - 15} at={howAt + 18} size={22} weight={500} color={ACCENT_INK}>
        {xml}
      </Line>
      <Line x={R_X} y={c.y(690)} at={paysAt} size={24} weight={500}>
        Pays off when
      </Line>
      <Line x={R_X} y={c.y(690) + 44} at={runtimeAt} size={24}>
        · the class depends on runtime input
      </Line>
      <Line x={R_X} y={c.y(690) + 86} at={complexAt} size={24}>
        · construction is complex
      </Line>
    </>
  );
};

// ── 13. Singleton ────────────────────────────────────────────────────────────

/** "['test_prices_in_euros: pass', …]" → [["prices in euros", "pass"], …]. */
const tests = (printed: string) =>
  [...printed.matchAll(/'([^']*)'/g)].map((m) => {
    const [name, result] = m[1].split(": ");
    return [name.replace(/^test_/, "").replace(/_/g, " "), result] as const;
  });

const Single: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const oneAt = c.w("r-single", "A singleton is one instance");
  const globalAt = c.w("r-single", "a global access point");
  const configAt = c.w("r-single", "like a config");
  const mutableAt = c.w("r-single", "global mutable state");
  const hidesAt = c.w("r-single", "it hides dependencies");
  const passesAt = c.w("r-single", "a test that passes alone");
  const failAt = c.w("r-single", "can fail after one that changed the config");
  const cleanerAt = c.w("r-single", "A module-level value or plain injection");
  const inOrder = tests(SINGLETON.inOrder);
  const alone = tests(SINGLETON.alone);
  if (inOrder.length !== 2 || alone.length !== 1) throw new Error("the singleton run changed shape");
  const cfg = { x: 1180, y: c.y(430), w: 220, h: 66 };
  const users = [
    { t: "pricing", x: R_X, y: c.y(380) },
    { t: "checkout", x: R_X, y: c.y(470) },
    { t: "emails", x: 1540, y: c.y(380) },
    { t: "reports", x: 1540, y: c.y(470) },
  ];
  const hidden = ease(frame, hidesAt, 14);
  const testTop = c.y(600);
  return (
    <>
      <Box x={cfg.x} y={cfg.y} w={cfg.w} h={cfg.h} at={oneAt} title="Config" sub={<span style={{ opacity: ease(frame, mutableAt, 10) }}>one, mutable</span>} tone="look" lit={pulse(frame, configAt, 20)} />
      {users.map((u, i) => {
        const left = u.x < cfg.x;
        const from: [number, number] = [left ? u.x + 200 + 6 : u.x - 6, u.y + 28];
        const to: [number, number] = [left ? cfg.x - 8 : cfg.x + cfg.w + 8, cfg.y + cfg.h / 2];
        return (
          <React.Fragment key={u.t}>
            <Box x={u.x} y={u.y} w={200} h={56} at={globalAt + i * 3} title={u.t} size={22} />
            <Flow points={[from, to]} at={globalAt + 4 + i * 3} dur={10} width={2} head={11} dash={hidden > 0.5 ? "6 7" : undefined} color={hidden > 0.5 ? INK_SOFT : INK} />
          </React.Fragment>
        );
      })}
      <Line x={cfg.x + cfg.w / 2} y={cfg.y - 52} at={hidesAt + 4} size={21} color={INK_SOFT} weight={500} align="center" width={400}>
        no one says they use it
      </Line>

      {/* Two tests, in order, then the second alone. */}
      <Line x={R_X} y={testTop} at={passesAt - 4} size={21} color={INK_SOFT} weight={500}>
        in order
      </Line>
      {inOrder.map(([name, result], i) => {
        const ok = result === "pass";
        const at = i === 0 ? passesAt + 4 : failAt + 6;
        return (
          <React.Fragment key={name}>
            <Mark2 at={at + 6} kind={ok ? "tick" : "cross"} size={26} style={{ left: R_X, top: testTop + 40 + i * 44 }} />
            <Line x={R_X + 40} y={testTop + 36 + i * 44} at={at} size={23} weight={500} color={ok ? INK : ACCENT_INK}>
              {name}: {ok ? "pass" : result.replace(/^FAIL/, "fail")}
            </Line>
          </React.Fragment>
        );
      })}
      <VRule x={1395} top={testTop} bottom={testTop + 114} at={passesAt} />
      <Line x={1430} y={testTop} at={passesAt} size={21} color={INK_SOFT} weight={500}>
        alone
      </Line>
      {alone.map(([name, result]) => (
        <React.Fragment key={name}>
          <Mark2 at={passesAt + 8} kind={result === "pass" ? "tick" : "cross"} size={26} style={{ left: 1430, top: testTop + 84 }} />
          <Line x={1470} y={testTop + 80} at={passesAt + 2} size={23} weight={500}>
            {name}: {result}
          </Line>
        </React.Fragment>
      ))}
      <Line x={R_X} y={c.y(810)} at={cleanerAt} size={24} weight={500} color={OK_INK}>
        often cleaner: a module-level value, or plain injection
      </Line>
    </>
  );
};

// ── 14. Abstract class or interface ──────────────────────────────────────────

const Slots: React.FC<{ x: number; top: number; w: number; at: number; filled: readonly boolean[]; tone: "plain" | "data" }> = ({ x, top, w, at, filled, tone }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {filled.map((f, i) => {
        const p = ease(frame, at + i * 5, 10);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + 24,
              top: top + 70 + i * 50,
              width: w - 48,
              height: 34,
              boxSizing: "border-box",
              borderRadius: 6,
              border: `2px ${f ? "solid" : "dashed"} ${f ? BAR : ds("gray", 400)}`,
              background: f ? `color-mix(in srgb, ${BAR} ${tone === "data" ? 22 : 0}%, ${PAPER})` : "transparent",
              opacity: p,
            }}
          />
        );
      })}
    </>
  );
};

const Abstract: React.FC<{ c: Ctx }> = ({ c }) => {
  const declaresAt = c.w("r-abstract", "An interface declares");
  const noImplAt = c.w("r-abstract", "with no implementation");
  const abstractAt = c.w("r-abstract", "An abstract class can also share code and state");
  const contractAt = c.w("r-abstract", "Use an interface for a pure contract");
  const sharedAt = c.w("r-abstract", "an abstract class when subclasses share code");
  const top = c.y(390);
  const w = 360;
  const h = 260;
  const A = R_X;
  const B = 1300;
  return (
    <>
      <Box x={A} y={top} w={w} h={h} at={declaresAt} dashed tone="plain" />
      <Line x={A + 24} y={top + 18} at={declaresAt} size={25} weight={500}>
        Interface
      </Line>
      <Slots x={A} top={top} w={w} at={declaresAt + 6} filled={[false, false, false]} tone="plain" />
      <Line x={A} y={top + h + 22} at={noImplAt} size={22} color={INK_SOFT} weight={500}>
        methods named, none written
      </Line>
      <VRule x={(A + w + B) / 2} top={top} bottom={top + h + 104} at={abstractAt} />
      <Box x={B} y={top} w={w} h={h} at={abstractAt} tone="plain" />
      <Line x={B + 24} y={top + 18} at={abstractAt} size={25} weight={500}>
        Abstract class
      </Line>
      <Slots x={B} top={top} w={w} at={abstractAt + 6} filled={[true, true, false]} tone="data" />
      <Line x={B} y={top + h + 22} at={abstractAt + 10} size={22} color={INK_SOFT} weight={500}>
        some code and state shared
      </Line>
      <Line x={A} y={top + h + 74} at={contractAt} size={24} weight={500} color={OK_INK}>
        a pure contract
      </Line>
      <Line x={B} y={top + h + 74} at={sharedAt} size={24} weight={500} color={OK_INK}>
        subclasses share code
      </Line>
    </>
  );
};

// ── 15. Is-a or has-a ────────────────────────────────────────────────────────

const IsA: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const isAt = c.w("r-isa", "A car is a vehicle");
  const inhAt = c.w("r-isa", "inheritance");
  const hasAt = c.w("r-isa", "A car has an engine");
  const compAt = c.w("r-isa", "composition");
  const extendAt = c.w("r-isa", "Make car extend engine");
  const wholeAt = c.w("r-isa", "the engine's whole interface");
  const askAt = c.w("r-isa", "Ask which it is before you inherit");
  const top = c.y(400);
  const low = c.y(560);
  const W = 190;
  const H = 58;
  const cols = [R_X, 1160, 1500];
  const kinds = [
    { at: isAt, upper: "Vehicle", lower: "Car", link: "is a", ok: true, note: "inheritance", noteAt: inhAt },
    { at: hasAt, upper: "Car", lower: "Engine", link: "has a", ok: true, note: "composition", noteAt: compAt },
    { at: extendAt, upper: "Engine", lower: "Car", link: "is a?", ok: false, note: "inherits it all", noteAt: wholeAt },
  ];
  return (
    <>
      {kinds.map((k, i) => {
        const x = cols[i];
        return (
          <React.Fragment key={i}>
            <Box x={x} y={top} w={W} h={H} at={k.at} title={k.upper} size={23} tone={k.ok ? "plain" : "bad"} />
            <Box x={x} y={low} w={W} h={H} at={k.at + 4} title={k.lower} size={23} tone={k.ok ? "plain" : "bad"} />
            {k.link === "has a" ? (
              <Svg opacity={ease(frame, k.at + 8, 10)}>
                <line x1={x + 60} y1={top + H + 26} x2={x + 60} y2={low - 4} stroke={OK} strokeWidth={2.6} />
                <path d={`M${x + 60},${top + H + 2} l9,12 l-9,12 l-9,-12 Z`} fill={OK} />
              </Svg>
            ) : (
              <Flow points={[[x + 60, low - 8], [x + 60, top + H + 8]]} at={k.at + 8} dur={10} color={k.ok ? INK : ACCENT} />
            )}
            <Line x={x + 86} y={(top + H + low) / 2 - 15} at={k.at + 8} size={21} weight={500} color={k.ok ? INK_SOFT : ACCENT_INK}>
              {k.link}
            </Line>
            <Line x={x} y={low + H + 22} at={k.noteAt} size={22} weight={500} color={k.ok ? OK_INK : ACCENT_INK}>
              {k.note}
            </Line>
            <Mark2 at={k.noteAt + 6} kind={k.ok ? "tick" : "cross"} size={28} style={{ left: x + W - 34, top: low + H + 22 }} />
          </React.Fragment>
        );
      })}
      {[1, 2].map((i) => (
        <VRule key={i} x={(cols[i - 1] + W + cols[i]) / 2} top={top} bottom={low + H + 52} at={kinds[i].at} />
      ))}
      <Line x={cols[2]} y={low + H + 64} at={wholeAt + 8} size={21} color={INK_SOFT} weight={500}>
        ignite, idle, rev…
      </Line>
      <Line x={R_X} y={c.y(800)} at={askAt} size={26} weight={500}>
        <Mark at={askAt + 4}>Ask which it is</Mark> before you inherit.
      </Line>
    </>
  );
};

/**
 * The quick round: seven questions down the left, each answer drawn on the
 * right while it is read, then the bridge into reading and reviewing code,
 * with the hero back on the page.
 */
export const RapidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const moreAt = n.word("rapid-in", "Seven more");
  const eachAt = n.word("rapid-in", "a sentence or two each");
  const end = n.beat("next").from - 4;
  const assumedAt = n.word("next", "Every answer here assumed");
  const writingAt = n.word("next", "you were the one writing the code");
  const didntAt = n.word("next-read", "you didn't write");
  const nextAt = n.word("next-read", "Next:");

  const items: RapidItem[] = [
    { n: 9, label: "The four pillars of OOP", at: n.word("r-pillars", "The four pillars of OOP"), body: <Pillars c={c} /> },
    { n: 10, label: "Encapsulation, concretely", at: n.word("r-encap", "Encapsulation, concretely"), body: <Encap c={c} /> },
    { n: 11, label: "Polymorphism, by example", at: n.word("r-poly", "Polymorphism, by example"), body: <Poly c={c} /> },
    { n: 12, label: "The Factory pattern", at: n.word("r-factory", "A factory centralizes creation"), body: <Factory c={c} /> },
    { n: 13, label: "The Singleton pattern", at: n.word("r-single", "A singleton is one instance"), body: <Single c={c} /> },
    { n: 14, label: "Abstract class or interface", at: n.word("r-abstract", "An interface declares"), body: <Abstract c={c} /> },
    { n: 15, label: "Is-a or has-a", at: n.word("r-isa", "And is-a versus has-a"), body: <IsA c={c} /> },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={moreAt} level={-32} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-32} />
      ))}
      <Sfx name="el-pop" at={assumedAt + 4} level={-30} />
      <Sfx name="el-pencil" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next-read").to + 40}>
        <Kicker at={moreAt}>Quick round</Kicker>
        <Headline lead="Seven more." turn="A sentence or two each." at={moreAt} turnAt={eachAt - 2} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={600} at={moreAt + 6} end={end} />

        {/* The bridge. */}
        <ArtSpot id="armadillo" at={assumedAt + 4} left={1260} top={y(340)} h={300} />
        <Line x={R_X} y={y(680)} at={assumedAt} size={28}>
          Every answer here assumed <span style={{ opacity: ease(frame, writingAt, 10) }}>you wrote the code.</span>
        </Line>
        <Line x={R_X} y={y(680) + 48} at={didntAt - 6} size={28} color={INK_SOFT}>
          Most of what you&apos;ll be asked about, you didn&apos;t.
        </Line>
        <NextLine at={nextAt} x={R_X} y={y(780)} width={900}>
          reading and reviewing code
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
