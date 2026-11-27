import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COMPILED } from "./data";
import { Box, Chip, Clear, Drift, Flow, line, Listing, listingHeight, listingWidth, OK_INK, Strike, X0 } from "./parts";

/** The three columns: the assistant's request, the layer, what comes out. */
const SLOT_X = 262;
const SLOT_W = 208;
const LAYER = { x: 550, w: 520 };
const OUT_X = 1150;
const SIZE = 20;

/** Question 1's guesses, which the layer settles. */
const GUESSES = ["Net of refunds?", "Cancelled orders?", "Test accounts?", "Which of three tables?", "Which join path?"];
/** What a layer declares. */
const DECLARED = ["Metrics", "Filters", "Dimensions", "Join paths"];
/** What the assistant chooses. */
const SLOTS = ["metric", "dimensions", "filters", "time grain"];
/** Who reads the governed metric. */
const CONSUMERS = ["Assistant", "Dashboards", "Finance report"];

/** A slot in the assistant's request: a dashed outline, empty or holding a
 *  value that inks in (and goes again). */
const Slot: React.FC<{ x: number; y: number; w: number; h: number; at: number; values: readonly { text: string; at: number; out?: number; mono?: boolean; color?: string }[] }> = ({
  x,
  y,
  w,
  h,
  at,
  values,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px dashed ${HAIRLINE}`,
        borderRadius: 8,
        opacity: p,
      }}
    >
      {values.map((v) => {
        const o = ease(frame, v.at, 12) * (v.out === undefined ? 1 : 1 - ease(frame, v.out, 10));
        if (o <= 0) return null;
        return (
          <div key={v.text} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: 14, opacity: o }}>
            <span style={v.mono ? { fontFamily: MONO, fontSize: 22, fontWeight: 500, color: v.color ?? INK, whiteSpace: "nowrap", fontVariantLigatures: "none" } : { ...note(22, v.color ?? INK), whiteSpace: "nowrap" }}>
              {v.text}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Question 2. The guesses go into the layer and come out as one definition;
 * what the layer declares; the assistant now only chooses (a metric and the
 * rest) and the layer writes the SQL, which every consumer shares: 440.00.
 * Then a metric it does not hold: "no metric matches", the right reply to an
 * executive's "active users", and why a definition made up on the spot is
 * drift. Last, the price: coverage, and the fork teams build around it.
 */
export const SemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("sem").from;
  const qAt = n.word("sem", "Question two");
  const textAt = n.word("sem", "What does a semantic layer");
  const guessAt = n.word("sem", "out of the guess");
  const codeAt = n.word("sem", "into code");
  const declaredAt = [
    n.word("sem-declared", "Metrics"),
    n.word("sem-declared", "their filters"),
    n.word("sem-declared", "the dimensions"),
    n.word("sem-declared", "the join paths"),
  ];
  const onceAt = n.word("sem-declared", "declared once");
  const jobAt = n.word("sem-job", "The assistant's job shrinks");
  const slotAt = [n.word("sem-job", "a metric"), n.word("sem-job", "dimensions"), n.word("sem-job", "filters and"), n.word("sem-job", "a time grain")];
  const compilesAt = n.word("sem-job", "The layer compiles the SQL");
  const askAt = n.word("sem-same", "Ask for net revenue");
  const consumerAt = [n.word("sem-same", "the assistant"), n.word("sem-same", "the dashboards"), n.word("sem-same", "the finance report")];
  const fortyAt = n.word("sem-same", "four hundred forty");
  const sameAt = n.word("sem-same", "computed the same way");
  const failFrom = n.beat("sem-fail").from;
  const questionAt = n.word("sem-fail", "a question the layer doesn't model");
  const matchesAt = n.word("sem-fail", "no metric matches");
  const inventedAt = n.word("sem-fail", "not an invented query");
  const cheaperAt = n.word("sem-fail", "far cheaper");
  const activeAt = n.word("sem-active", "active users last week");
  const weekAt = n.word("sem-active", "last week");
  const definedAt = n.word("sem-active", "nobody has defined active");
  const saysAt = n.word("sem-active", "the right answer says so");
  const closestAt = n.word("sem-active", "the closest governed metrics");
  const exploratoryAt = n.word("sem-active", "an exploratory query");
  const unverifiedAt = n.word("sem-active", "labeled as unverified");
  const defineAt = n.word("sem-drift", "Having the language model define it");
  const driftAt = n.word("sem-drift", "metric drift by design");
  const tradeFrom = n.beat("sem-trade").from;
  const coverageAt = n.word("sem-trade", "The price is coverage");
  const onlyAt = n.word("sem-trade", "can only answer");
  const routeAt = n.word("sem-trade", "route modeled questions");
  const fallAt = n.word("sem-trade", "fall back to text-to-SQL");
  const end = n.beat("sem-trade").to;

  const top = y(286);
  const layerTop = top;
  const layerH = h(344);
  const layerBottom = layerTop + layerH;
  const slotTop = top + h(52);
  const slotH = h(46);
  const slotPitch = h(62);
  const slotMid = (i: number) => slotTop + i * slotPitch + slotH / 2;
  const reqMid = slotTop + (3 * slotPitch + slotH) / 2;
  const defTop = layerTop + h(62);
  const badgeTop = layerTop + h(168);
  const listTop = top + h(46);
  const listW = listingWidth(COMPILED.lines, SIZE);
  const listMid = listTop + listingHeight(COMPILED.lines.length, SIZE) / 2;
  const consumerTop = y(716);
  const consumerW = 250;
  const consumerGap = 50;
  const consumerX = (i: number) => LAYER.x + LAYER.w / 2 - (3 * consumerW + 2 * consumerGap) / 2 + i * (consumerW + consumerGap);
  const forkTop = top + h(100);

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={codeAt - 6} level={-36} />
      <Sfx name="el-pop" at={codeAt + 4} level={-31} />
      {declaredAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at} level={-33} />
      ))}
      {slotAt.map((at, i) => (
        <Sfx key={`s${i}`} name="el-tap" at={at} level={-33} />
      ))}
      <Sfx name="el-pencil" at={compilesAt} level={-35} />
      {consumerAt.map((at, i) => (
        <Sfx key={`c${i}`} name="el-tap" at={at} level={-32} />
      ))}
      <Sfx name="el-chime" at={sameAt} level={-33} />
      <Sfx name="el-tap" at={matchesAt} level={-30} />
      <Sfx name="el-tap" at={activeAt} level={-32} />
      <Sfx name="el-scratch" at={defineAt + 10} level={-33} />
      <Sfx name="el-pencil" at={routeAt} level={-35} />
      <Sfx name="el-pencil" at={fallAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={60}>
          What does a semantic layer change for an AI assistant?
        </QuestionCard>

        {/* The guesses, out of the assistant's hands and into the layer. */}
        {GUESSES.map((g, i) => (
          <Slide key={g} at={guessAt + i * 3} into={codeAt - 4 + i * 2} dx={LAYER.x + 40 - X0} left={X0} top={top + h(10) + i * h(44)}>
            <span style={line(26, INK_SOFT)}>{g}</span>
          </Slide>
        ))}

        {/* The layer, and the definition that replaces them. */}
        <Box x={LAYER.x} y={layerTop} w={LAYER.w} h={layerH} at={codeAt - 6} title="Semantic layer" size={26} align="top" />
        <Ink at={codeAt + 8} dur={14} style={{ left: LAYER.x + 30, top: defTop }}>
          <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 500, color: INK, whiteSpace: "nowrap", fontVariantLigatures: "none" }}>net_revenue</div>
          <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", marginTop: 6 }}>completed orders, test accounts excluded</div>
        </Ink>
        <div style={{ position: "absolute", left: LAYER.x + 30, top: badgeTop - h(20), width: LAYER.w - 60, height: 1, background: HAIRLINE, opacity: 0.6 * ease(frame, declaredAt[0] - 4, 12) }} />
        {DECLARED.map((d, i) => (
          <Ink key={d} at={declaredAt[i]} dur={12} style={{ left: LAYER.x + 30 + (i % 2) * 240, top: badgeTop + Math.floor(i / 2) * h(56) }}>
            <Chip tone="gray" size={24}>
              {d}
            </Chip>
          </Ink>
        ))}
        <Ink at={onceAt} dur={12} style={{ left: LAYER.x + 30, top: badgeTop + h(124) }}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Declared once</span>
        </Ink>

        {/* The assistant's request: four choices, never SQL. */}
        <Ink at={jobAt} dur={12} style={{ left: X0, top }}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>The assistant chooses</span>
        </Ink>
        {SLOTS.map((s, i) => (
          <React.Fragment key={s}>
            <Ink at={slotAt[i]} dur={12} style={{ left: X0, top: slotMid(i) - 14 }}>
              <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>{s}</span>
            </Ink>
            <Slot
              x={SLOT_X}
              y={slotTop + i * slotPitch}
              w={SLOT_W}
              h={slotH}
              at={slotAt[i]}
              values={
                i === 0
                  ? [
                      { text: "net_revenue", at: slotAt[0] + 10, out: failFrom, mono: true },
                      { text: "?", at: questionAt + 6, out: activeAt },
                      { text: "active_users", at: activeAt, mono: true },
                    ]
                  : i === 2
                    ? // "Last week" is a range on time, so a filter; the
                      // grain it is counted at is the week.
                      [{ text: "last week", at: weekAt }]
                    : i === 3
                      ? [{ text: "week", at: weekAt + 6 }]
                      : []
              }
            />
          </React.Fragment>
        ))}
        <Flow points={[[SLOT_X + SLOT_W + 10, reqMid], [LAYER.x - 10, reqMid]]} at={slotAt[3] + 8} />

        {/* What comes out: the SQL, and the one number everyone gets. */}
        <Clear at={failFrom}>
          <Ink at={compilesAt} dur={12} style={{ left: OUT_X, top }}>
            <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>SQL the layer writes</span>
          </Ink>
          <Flow points={[[LAYER.x + LAYER.w + 10, listMid], [OUT_X - 10, listMid]]} at={compilesAt} />
          <Listing lines={COMPILED.lines} x={OUT_X} top={listTop} width={listW} size={SIZE} at={compilesAt + 4} step={3} marks={[{ line: "SUM(o.amount)", at: askAt + 6 }]} />
          {CONSUMERS.map((c, i) => {
            const x = consumerX(i);
            return (
              <React.Fragment key={c}>
                <Flow points={[[LAYER.x + LAYER.w / 2 + (i - 1) * 120, layerBottom + 8], [x + consumerW / 2, consumerTop - 10]]} at={consumerAt[i] - 4} />
                <Box x={x} y={consumerTop} w={consumerW} h={h(100)} at={consumerAt[i]} title={c} size={24} align="top" />
                <Ink at={fortyAt + i * 3} dur={12} style={{ left: x, width: consumerW, top: consumerTop + h(54), textAlign: "center" }}>
                  <span style={{ ...note(28, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>{COMPILED.netRevenue.toFixed(2)}</span>
                </Ink>
              </React.Fragment>
            );
          })}
        </Clear>

        {/* A metric the layer does not hold, and the reply that is right. */}
        <Clear at={tradeFrom + 10}>
          <Flow points={[[LAYER.x + LAYER.w + 10, top + h(64)], [OUT_X - 10, top + h(64)]]} at={matchesAt - 6} />
          <Ink at={matchesAt} dur={14} style={{ left: OUT_X, top: top + h(42) }}>
            <span style={{ ...note(30, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Error: no metric matches</span>
          </Ink>
          <Ink at={inventedAt} dur={12} style={{ left: OUT_X, top: top + h(92) }}>
            <span style={line(24, INK_SOFT)}>Not an invented query</span>
          </Ink>
          <Ink at={cheaperAt} dur={12} style={{ left: OUT_X, top: top + h(132) }}>
            <span style={line(24, INK_SOFT)}>Cheaper than a wrong number in a board deck</span>
          </Ink>
          <Ink at={saysAt} dur={12} style={{ left: OUT_X, top: top + h(200) }}>
            <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>The right answer</span>
          </Ink>
          {[
            { t: "Not defined", at: saysAt + 6, color: OK_INK },
            { t: "Closest governed metrics", at: closestAt, color: INK },
            { t: "An exploratory query, labeled unverified", at: exploratoryAt, color: INK },
          ].map((r, i) => (
            <Ink key={r.t} at={r.at} dur={12} style={{ left: OUT_X, top: top + h(240) + i * h(42) }}>
              <span style={{ ...line(26, r.color), fontWeight: 500 }}>
                {i === 2 ? (
                  <>
                    An exploratory query, <span style={{ opacity: ease(frame, unverifiedAt, 10) }}>labeled unverified</span>
                  </>
                ) : (
                  r.t
                )}
              </span>
            </Ink>
          ))}
          <Ink at={defineAt} dur={12} style={{ left: OUT_X, top: top + h(390) }}>
            <span style={{ ...line(24, INK), display: "flex", gap: "0.5em", fontSize: 24 }}>
              <Strike at={defineAt + 10}>Let the LLM define it</Strike>
              <span style={{ color: ACCENT_INK, fontWeight: 500, opacity: ease(frame, driftAt, 12) }}>metric drift by design</span>
            </span>
          </Ink>
        </Clear>
        <Ink at={definedAt} dur={12} style={{ left: X0, top: slotTop + 4 * slotPitch + h(14) }}>
          <span style={line(22, INK_SOFT)}>“active” is not defined</span>
        </Ink>

        {/* The price: coverage, and the fork around it. */}
        <Ink at={coverageAt} dur={12} style={{ left: OUT_X, top }}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>The price: coverage</span>
        </Ink>
        <Ink at={onlyAt} dur={12} style={{ left: OUT_X, top: top + h(40) }}>
          <span style={line(22, INK_SOFT)}>Only what has been modeled</span>
        </Ink>
        <Box x={OUT_X} y={forkTop} w={220} h={h(60)} at={routeAt - 6} title="A question" size={24} />
        <Flow points={[[OUT_X + 40, forkTop + h(60) + 8], [OUT_X + 40, forkTop + h(130)], [OUT_X + 82, forkTop + h(130)]]} at={routeAt} />
        <Box x={OUT_X + 90} y={forkTop + h(100)} w={470} h={h(60)} at={routeAt + 8} title="Modeled: through the layer" tone="ok" size={24} />
        <Flow points={[[OUT_X + 40, forkTop + h(60) + 8], [OUT_X + 40, forkTop + h(230)], [OUT_X + 82, forkTop + h(230)]]} at={fallAt} />
        <Box x={OUT_X + 90} y={forkTop + h(200)} w={470} h={h(60)} at={fallAt + 8} title="Exploratory: text-to-SQL, labeled" size={24} />
      </Drift>
    </AbsoluteFill>
  );
};

/** A line that inks in, then slides `dx` to the right and fades on `into`. */
const Slide: React.FC<{ at: number; into: number; dx: number; left: number; top: number; children: React.ReactNode }> = ({ at, into, dx, left, top, children }) => {
  const frame = useCurrentFrame();
  const s = ease(frame, into, 16);
  if (s >= 1) return null;
  return (
    <Ink at={at} dur={12} style={{ left: left + dx * s, top, opacity: 1 - s }}>
      {children}
    </Ink>
  );
};
