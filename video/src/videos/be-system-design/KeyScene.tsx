import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ESTIMATE, KEY } from "./data";
import { Arrow, artH, Box, Drift, int, Line, Spot, X0 } from "./parts";

const CARD_W = 600;
const CARD_H = 112;
const RX = 1060;

/**
 * Question 3, the API and the key. Two calls, said in words: create (a long
 * URL in, a short key out) and redirect (a key in, a redirect out). The key is
 * base 62, the 62 characters in three groups; an auto-incrementing ID
 * encoded in six of them gives 62⁶, about 57 billion keys, over fifteen years
 * at the estimate's ten million a day (check.mjs). Or hash the long URL, and
 * check the key is not already taken before storing it.
 */
export const KeyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("q3").from;
  const qAt = n.word("q3", "Question three");
  const textAt = n.word("q3", "Design a URL shortener");
  const apiAt = n.word("q3", "Start from the API");
  const createAt = n.word("q3", "one call takes a long URL");
  const keyOutAt = n.word("q3", "returns a short key");
  const otherAt = n.word("q3", "the other takes the key");
  const redirAt = n.word("q3", "and redirects");
  const keyAt = n.word("q3-key", "The key is base sixty-two");
  const groupAt = ["lowercase", "uppercase", "digits"].map((w) => n.word("q3-key", w));
  const idAt = n.word("q3-key", "Encode an auto-incrementing ID");
  const sixAt = n.word("q3-key", "six characters");
  const billionAt = n.word("q3-key", "fifty-seven billion links");
  const yearsAt = n.word("q3-key", "over fifteen years at ten million a day");
  const hashAt = n.word("q3-hash", "Or hash the long URL");
  const checkAt = n.word("q3-hash", "check each key for a collision");
  const storeAt = n.word("q3-hash", "before you store it");
  const end = n.beat("q3-hash").to;

  const cardY = y(292);
  const secY = y(462);
  const six = KEY.keyLengths.find((k) => k.len === 6)!;
  const id = KEY.counted[0];
  const groups = ["a–z", "A–Z", "0–9"];
  const cellsY = y(600);
  const cell = 46;
  const cellsX = X0 + 330;

  // The hash path, left to right.
  const flowY = y(560);
  const fbox = (cx: number, w: number) => ({ cx, cy: flowY, w, h: 66 });
  const urlB = fbox(RX + 75, 150);
  const hashB = fbox(RX + 246, 104);
  const takenB = fbox(RX + 442, 200);
  const storeB = fbox(RX + 640, 108);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={createAt} level={-35} />
      <Sfx name="el-tap" at={otherAt} level={-35} />
      {groupAt.map((a, i) => (
        <Sfx key={i} name="el-tap" at={a} level={-36} />
      ))}
      <Sfx name="el-sprinkle" at={idAt + 10} level={-35} />
      <Sfx name="el-pencil" at={billionAt} level={-36} />
      <Sfx name="el-tap" at={hashAt + 4} level={-35} />
      <Sfx name="el-tap" at={checkAt} level={-35} />
      <Sfx name="el-tap" at={storeAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4}>
          Design a URL shortener at a high level.
        </QuestionCard>
        <Spot id="key" at={keyAt} left={1580} top={y(86)} width={150} height={artH("key", 150)} />

        {/* The API, in words. */}
        {[
          { x: X0, at: createAt, name: "create", body: <>long URL in, short key out</>, sub: keyOutAt },
          { x: X0 + CARD_W + 60, at: otherAt, name: "redirect", body: <>short key in, redirect out</>, sub: redirAt },
        ].map((c) => {
          const p = ease(frame, c.at - 2, 14);
          return (
            <div
              key={c.name}
              style={{
                position: "absolute",
                left: c.x,
                top: cardY,
                width: CARD_W,
                height: CARD_H,
                boxSizing: "border-box",
                border: `2px solid ${INK}`,
                borderRadius: 12,
                background: PAPER,
                padding: "16px 24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 8,
                opacity: p,
                transform: `translateY(${(1 - p) * 12}px)`,
              }}
            >
              <span style={{ ...label(23, INK_SOFT), fontWeight: 700 }}>{c.name}</span>
              <span style={{ ...note(29, INK), fontWeight: 650, whiteSpace: "nowrap", opacity: ease(frame, c.sub - 4, 10) }}>{c.body}</span>
            </div>
          );
        })}
        <Line x={X0 + 2 * CARD_W + 120} y={cardY + 38} at={apiAt} size={24} color={INK_SOFT}>
          the API
        </Line>

        {/* Base 62 of a counted ID. */}
        <Line x={X0} y={secY} at={keyAt} size={28} weight={700}>
          Base <Num>{KEY.alphabet.length}</Num> of a counted ID
        </Line>
        <div style={{ position: "absolute", left: X0, top: secY + 64, display: "flex", alignItems: "center", gap: "0.6em", fontSize: 26 }}>
          <span style={{ ...note(26, INK_SOFT), opacity: ease(frame, keyAt + 6, 10) }}>
            <Num>{KEY.alphabet.length}</Num> characters:
          </span>
          {groups.map((g, i) => (
            <span
              key={g}
              style={{
                fontFamily: MONO,
                fontSize: 26,
                fontWeight: 600,
                color: BLUE_INK,
                padding: "2px 12px",
                border: `2px solid ${BLUE_INK}`,
                borderRadius: 8,
                opacity: ease(frame, groupAt[i], 10),
              }}
            >
              {g}
            </span>
          ))}
        </div>
        <Line x={X0} y={cellsY + 6} at={idAt} size={26} weight={600}>
          ID <Num>{int(id.id)}</Num>
        </Line>
        <Arrow
          points={[
            [cellsX - 70, cellsY + cell / 2],
            [cellsX - 16, cellsY + cell / 2],
          ]}
          at={idAt + 8}
          dur={8}
          head={12}
          color={INK_SOFT}
        />
        {[...id.key].map((ch, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cellsX + i * (cell + 4),
              top: cellsY,
              width: cell,
              height: cell,
              boxSizing: "border-box",
              border: `2px solid ${INK}`,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: MONO,
              fontSize: 27,
              fontWeight: 600,
              color: INK,
              opacity: ease(frame, idAt + 10 + i * 3, 8),
            }}
          >
            {ch}
          </div>
        ))}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <path
            d={`M${cellsX},${cellsY + cell + 12} v8 H${cellsX + 6 * (cell + 4) - 4} v-8`}
            fill="none"
            stroke={INK_SOFT}
            strokeWidth={2}
            opacity={ease(frame, sixAt, 10)}
          />
        </svg>
        <Line x={cellsX} y={cellsY + cell + 30} at={sixAt} size={22} color={INK_SOFT}>
          <Num>{six.len}</Num> characters
        </Line>
        <Line x={X0} y={y(732)} at={billionAt} size={30} weight={700} color={BLUE_INK}>
          <Num>{KEY.alphabet.length}</Num>
          <sup style={{ fontSize: "0.6em" }}>{six.len}</sup> ≈ <Num>{Math.round(six.keys / 1e9)}</Num> billion keys
        </Line>
        <Line x={X0} y={y(732) + 50} at={yearsAt} size={25} color={INK_SOFT}>
          over <Num>{Math.floor(six.years)}</Num> years at <Num>{int(ESTIMATE.assumptions.newLinksPerDay)}</Num> new links a day
        </Line>

        {/* Or a hash. */}
        <div style={{ position: "absolute", left: RX - 50, top: secY - 4, width: 1.5, height: y(820) - secY, background: HAIRLINE, opacity: ease(frame, hashAt, 12) }} />
        <Line x={RX} y={secY} at={hashAt} size={28} weight={700}>
          Or a hash of the long URL
        </Line>
        <Box r={urlB} at={hashAt + 4} title="long URL" tone="data" size={24} />
        <Arrow points={[[urlB.cx + urlB.w / 2 + 8, flowY], [hashB.cx - hashB.w / 2 - 8, flowY]]} at={hashAt + 10} dur={8} head={12} />
        <Box r={hashB} at={hashAt + 14} title="hash" size={24} />
        <Arrow points={[[hashB.cx + hashB.w / 2 + 8, flowY], [takenB.cx - takenB.w / 2 - 8, flowY]]} at={checkAt - 4} dur={8} head={12} />
        <Box r={takenB} at={checkAt} title="already taken?" tone="lit" size={24} />
        <Arrow points={[[takenB.cx + takenB.w / 2 + 8, flowY], [storeB.cx - storeB.w / 2 - 8, flowY]]} at={storeAt - 4} dur={8} head={12} />
        <Box r={storeB} at={storeAt} title="store" tone="data" size={24} />
      </Drift>
    </AbsoluteFill>
  );
};
