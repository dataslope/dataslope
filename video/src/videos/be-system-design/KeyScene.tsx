import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ESTIMATE, KEY } from "./data";
import { Arrow, artH, Drift, InlineArrow, int, Line, Mark, OK_INK, Spot, VRule, X0 } from "./parts";

const CARD_W = 600;
const RX = 1060;
/** The third column of the API row: which kind of redirect. */
const TX = 1250;

/**
 * Question 3, the API and the key. Two calls, said in words: create (a long
 * URL in, a short key out) and redirect (a key in, a redirect out). The key is
 * base 62, the 62 characters in three groups; an auto-incrementing ID
 * encoded in six of them gives 62⁶, about 57 billion keys, over fifteen years
 * at the estimate's ten million a day (check.mjs). The redirect is
 * temporary, since browsers keep a permanent one. Or hash the long URL and
 * keep a few characters: if that key is taken, add a salt and hash again, and
 * store only if absent, so two servers cannot both claim it.
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
  const tempAt = n.word("q3-temp", "Make that redirect temporary");
  const permAt = n.word("q3-temp", "Browsers keep a permanent one");
  const hashAt = n.word("q3-hash", "Or hash the long URL");
  const fewAt = n.word("q3-hash", "keep a few characters");
  const takenAt = n.word("q3-hash", "If that key is taken");
  const saltAt = n.word("q3-hash", "add a salt and hash again");
  const condAt = n.word("q3-hash", "make the write conditional");
  const claimAt = n.word("q3-hash", "so two servers can't both claim it");
  const end = n.beat("q3-hash").to;

  const cardY = y(314);
  const secY = y(462);
  const six = KEY.keyLengths.find((k) => k.len === 6)!;
  const id = KEY.counted[0];
  const groups = ["a–z", "A–Z", "0–9"];
  const cellsY = y(600);
  const cell = 46;
  const cellsX = X0 + 330;


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
      <Sfx name="el-tap" at={tempAt} level={-35} />
      <Sfx name="el-scratch" at={permAt + 4} level={-37} />
      <Sfx name="el-tap" at={takenAt} level={-35} />
      <Sfx name="el-chime" at={condAt + 4} level={-37} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4}>
          Design a URL shortener at a high level.
        </QuestionCard>
        <Spot id="key" at={keyAt} left={1560} top={y(716)} width={160} height={artH("key", 160)} />

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
                display: "flex",
                flexDirection: "column",
                gap: 12,
                opacity: p,
                transform: `translateY(${(1 - p) * 12}px)`,
              }}
            >
              <span style={{ ...label(23, INK_SOFT), fontWeight: 500 }}>{c.name}</span>
              <span style={{ ...note(30, INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, c.sub - 4, 10) }}>{c.body}</span>
            </div>
          );
        })}
        <VRule x={645} top={cardY} bottom={cardY + 80} at={otherAt - 2} />

        {/* Which redirect: temporary, since browsers keep a permanent one. */}
        <VRule x={1190} top={cardY} bottom={cardY + 112} at={tempAt} />
        <Line x={TX} y={cardY} at={tempAt} size={23} color={INK_SOFT}>
          which kind
        </Line>
        <Line x={TX} y={cardY + 36} at={tempAt + 6} size={30} color={OK_INK}>
          temporary (<Num>302</Num>)
        </Line>
        <Line x={TX} y={cardY + 86} at={permAt} size={23} color={ACCENT_INK}>
          permanent (<Num>301</Num>): browsers keep it
        </Line>
        <Line x={X0} y={cardY - 52} at={apiAt} size={22} weight={500} color={INK_SOFT}>
          The API, in two calls
        </Line>

        {/* Base 62 of a counted ID. */}
        <Line x={X0} y={secY} at={keyAt} size={28} weight={500}>
          Base <Num>{KEY.alphabet.length}</Num> of a counted ID
        </Line>
        <div style={{ position: "absolute", left: X0, top: secY + 64, display: "flex", alignItems: "center", gap: "0.6em", fontSize: 26 }}>
          <span style={{ ...note(26, INK_SOFT), opacity: ease(frame, keyAt + 6, 10) }}>
            <Num>{KEY.alphabet.length}</Num> characters:
          </span>
          {groups.map((g, i) => (
            <React.Fragment key={g}>
              {i ? <span style={{ ...note(26, INK_SOFT), opacity: ease(frame, groupAt[i], 10) }}>·</span> : null}
              <span style={{ fontFamily: MONO, fontSize: 27, fontWeight: 500, color: BLUE_INK, opacity: ease(frame, groupAt[i], 10) }}>{g}</span>
            </React.Fragment>
          ))}
        </div>
        <Line x={X0} y={cellsY + 6} at={idAt} size={26} weight={500}>
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
        <div style={{ position: "absolute", left: cellsX, top: cellsY - 2, display: "flex", fontFamily: MONO, fontSize: 34, fontWeight: 500, color: INK }}>
          {[...id.key].map((ch, i) => (
            <span key={i} style={{ width: cell + 4, textAlign: "center", opacity: ease(frame, idAt + 10 + i * 3, 8) }}>
              {ch}
            </span>
          ))}
        </div>
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
        <Line x={X0} y={y(732)} at={billionAt} size={30} weight={500} color={BLUE_INK}>
          <Num>{KEY.alphabet.length}</Num>
          <sup style={{ fontSize: "0.6em" }}>{six.len}</sup> ≈ <Num>{Math.round(six.keys / 1e9)}</Num> billion keys
        </Line>
        <Line x={X0} y={y(732) + 50} at={yearsAt} size={25} color={INK_SOFT}>
          over <Num>{Math.floor(six.years)}</Num> years at <Num>{int(ESTIMATE.assumptions.newLinksPerDay)}</Num> new links a day
        </Line>

        {/* Or a hash. */}
        <VRule x={905} top={secY} bottom={y(732) + 84} at={hashAt} />
        <Line x={RX} y={secY} at={hashAt} size={28} weight={500}>
          Or a hash of the long URL
        </Line>
        <div style={{ position: "absolute", left: RX, top: secY + 60, display: "flex", alignItems: "center", gap: 16, fontSize: 27 }}>
          <span style={{ ...note(27, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, hashAt + 4, 10) }}>long URL</span>
          <InlineArrow at={hashAt + 10} w={40} />
          <span style={{ ...note(27, INK), fontWeight: 500, opacity: ease(frame, hashAt + 14, 10) }}>hash</span>
          <InlineArrow at={fewAt - 4} w={40} />
          <span style={{ ...note(27, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, fewAt, 10) }}>a few characters</span>
        </div>
        {/* The follow-up: a key that is taken, and two servers racing for one. */}
        <div style={{ position: "absolute", left: RX, top: secY + 124, display: "flex", alignItems: "center", gap: 16, fontSize: 27 }}>
          <span style={{ ...note(27, INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, takenAt, 10) }}>
            <Mark at={takenAt + 2} color={HIGHLIGHT}>
              taken?
            </Mark>
          </span>
          <InlineArrow at={saltAt - 4} w={40} />
          <span style={{ ...note(27, INK), fontWeight: 500, whiteSpace: "nowrap", opacity: ease(frame, saltAt, 10) }}>add a salt, hash again</span>
        </div>
        <Line x={RX} y={secY + 188} at={condAt} size={26} color={OK_INK}>
          store only if absent
          <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, claimAt, 10) }}>: no two servers claim one key</span>
        </Line>
        <Line x={RX} y={secY + 240} at={claimAt + 24} size={23} weight={400} color={INK_SOFT}>
          and the same long URL always gets the same key
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
