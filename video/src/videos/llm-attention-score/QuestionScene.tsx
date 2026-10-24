import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, headline, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { KEYS, TOKENS, TROPHY, VALUES } from "./data";
import {
  Arrow,
  Cells,
  DATA,
  DATA_TINT,
  Fade,
  FIG_Y,
  HEAD_Y,
  Headline,
  KEY,
  KEY_INK,
  Kicker,
  lerp,
  Mark,
  PathArrow,
  Mono,
  POINT,
  POINT_INK,
  pulse,
  QUERY,
  QUERY_INK,
  Spot,
  Svg,
  Tag,
  TokenChip,
  VALUE,
  VALUE_INK,
  X0,
} from "./parts";

// ═══ Scene 1: the question, and the three vectors every token makes ════════

const S = "The trophy didn't fit in the suitcase because it was too big.";
const SIZE = 30;
/** JetBrains Mono advances 0.6 em per character, so a word's place in the
 *  sentence is its character index times this, in any page face. */
const CW = SIZE * 0.6;
const midOf = (w: string) => {
  const i = S.indexOf(` ${w}`) + 1;
  return X0 + (i + w.length / 2) * CW;
};

/** The sentence in mono, with highlighter marks under chosen words. */
const Sentence: React.FC<{ marks: { word: string; at: number; color?: string }[] }> = ({ marks }) => {
  const parts: React.ReactNode[] = [];
  let i = 0;
  const sorted = marks.map((m) => ({ ...m, i: S.indexOf(` ${m.word}`) + 1 })).sort((a, b) => a.i - b.i);
  for (const m of sorted) {
    parts.push(S.slice(i, m.i));
    parts.push(
      <Mark key={m.word} at={m.at} color={m.color}>
        {m.word}
      </Mark>,
    );
    i = m.i + m.word.length;
  }
  parts.push(S.slice(i));
  return <span style={{ fontFamily: MONO, fontSize: SIZE, fontWeight: 600, color: INK, whiteSpace: "pre" }}>{parts}</span>;
};

const it = TOKENS.indexOf("it");
const QKV = [
  { name: "Query", ask: "What am I looking for?", color: QUERY, ink: QUERY_INK, values: TROPHY.query },
  { name: "Key", ask: "What do I offer?", color: KEY, ink: KEY_INK, values: KEYS[it] },
  { name: "Value", ask: "What I hand over.", color: VALUE, ink: VALUE_INK, values: VALUES[it] },
];

export const QuestionScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("hook").from;
  const itAt = n.word("hook", "it");
  const bigAt = n.word("hook", "big");
  const weightAt = n.word("ask", "weight");
  const everyAt = n.word("ask", "every token");
  const trophyAt = n.word("ask", "trophy");
  const winAt = n.word("ask", "win");
  const computeAt = n.word("ask", "compute");
  const everyTokenAt = n.word("three", "Every token");
  const embeddingAt = n.word("three", "embedding");
  const vectorsAt = n.word("three", "vectors");
  const cardAt = [n.word("query", "query"), n.word("key", "key"), n.word("value", "value")];
  const lookingAt = n.word("query", "looking");
  const offerAt = n.word("key", "offer");
  const handOverAt = n.word("value", "hand over");
  const tinyAt = n.word("toy", "tiny");
  const twoAt = n.word("toy", "Two numbers");

  // Fig. 1: the sentence, with arcs from "it" to the two nouns.
  const R = y(440);
  const itX = midOf("it");
  const trX = midOf("trophy");
  const scX = midOf("suitcase");
  const win = ease(frame, winAt - 2, 14);

  // Fig. 2: one embedding, three vectors.
  const rowY = (i: number) => y(640) + i * 92;
  const stripY = rowY(1);
  const STRIP_X = 210;
  const CELL = 30;
  const STRIP_N = 9;
  const VX = 650;
  // "Short vectors" first, as blank cells; "tiny" collapses each to two.
  const collapse = ease(frame, tinyAt - 2, 22);
  const cells = lerp(6, 2, collapse);
  const cellW = lerp(30, 72, collapse);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={itAt - 2} level={-35} />
      <Sfx name="el-pencil" at={weightAt} level={-35} />
      <Sfx name="el-tap" at={winAt} level={-25} />
      <Sfx name="el-pop" at={trophyAt - 4} level={-31} />
      <Sfx name="el-pencil" at={computeAt} level={-36} />
      {cardAt.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-26} />
      ))}
      <Sfx name="el-whoosh" at={tinyAt - 2} level={-34} />
      <Sfx name="el-tap" at={twoAt} level={-24} />

      <Kicker at={from - 10}>Attention, by hand</Kicker>
      <Headline
        lead={
          <>
            What does <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: "0.86em" }}>it</span> mean?
          </>
        }
        at={from}
        out={everyTokenAt - 6}
      />
      {/* "Three vectors: query, key, value", each word in its own ink as it is named. */}
      <div style={{ position: "absolute", left: 92, top: y(HEAD_Y), display: "flex", gap: "0.26em", ...headline(72) }}>
        <Ink at={everyTokenAt + 4} dur={18} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Three vectors:
        </Ink>
        {["query,", "key,", "value."].map((w, i) => (
          <Ink key={w} at={cardAt[i] - 4} dur={16} style={{ position: "relative", whiteSpace: "nowrap", ...headline(72, true), color: QKV[i].ink }}>
            {w}
          </Ink>
        ))}
      </div>

      {/* ── Fig. 1: the lesson's sentence ── */}
      <FigLabel n="1" title="The lesson's sentence" at={from} x={X0} y={y(FIG_Y)} />
      <Fade at={from} style={{ left: X0, top: R }}>
        <Sentence
          marks={[
            { word: "it", at: itAt, color: `color-mix(in srgb, ${QUERY} 26%, transparent)` },
            { word: "big", at: bigAt },
          ]}
        />
      </Fade>
      {/* A weight on every token: one arc to each noun, trophy's the heavy one. */}
      <PathArrow
        points={[
          [itX, R - 8],
          [itX, R - 92],
          [trX, R - 92],
          [trX, R - 12],
        ]}
        radius={30}
        at={weightAt}
        color={win > 0.5 ? POINT : INK_SOFT}
        width={2.4 + 2.6 * win + 3 * pulse(frame, computeAt, 30)}
      />
      <PathArrow
        points={[
          [itX - 10, R - 8],
          [itX - 10, R - 54],
          [scX, R - 54],
          [scX, R - 12],
        ]}
        radius={22}
        at={everyAt}
        color={INK_SOFT}
        width={2.4}
      />
      <Fade at={everyAt + 6} style={{ left: itX + 22, top: R - 74 }}>
        <Tag size={21}>a weight for each</Tag>
      </Fade>
      <Fade at={winAt} style={{ left: (trX + itX) / 2 - 80, top: R - 134 }}>
        <span style={{ ...label(22, POINT_INK), whiteSpace: "nowrap" }}>the biggest?</span>
      </Fade>
      <Spot id="llm-meaning-trophy" at={trophyAt - 4} left={1440} top={y(390)} width={340} height={334} />

      {/* ── Fig. 2: one embedding, three vectors ── */}
      <FigLabel n="2" title="From one embedding, three vectors" at={everyTokenAt - 4} x={X0} y={y(560)} />
      <Fade at={everyTokenAt} style={{ left: X0 - 6, top: stripY - 2 }}>
        <TokenChip text="it" size={24} border={QUERY} color={QUERY_INK} />
      </Fade>
      <Svg opacity={ease(frame, embeddingAt - 4, 12)}>
        {Array.from({ length: STRIP_N }, (_, i) => (
          <rect
            key={i}
            x={STRIP_X + i * CELL}
            y={stripY + 2}
            width={CELL - 4}
            height={42}
            rx={4}
            fill={DATA_TINT}
            stroke={DATA}
            strokeWidth={1.4}
            opacity={ease(frame, embeddingAt - 4 + i, 8)}
          />
        ))}
      </Svg>
      <Fade at={embeddingAt + 2} style={{ left: STRIP_X, top: stripY + 54 }}>
        <Tag size={21}>its embedding</Tag>
      </Fade>
      {QKV.map((c, i) => (
        <Arrow
          key={c.name}
          from={[STRIP_X + STRIP_N * CELL + 14, stripY + 23]}
          to={[VX - 16, rowY(i) + 23]}
          at={vectorsAt - 4 + i * 4}
          color={c.color}
          width={2.6}
        />
      ))}
      {QKV.map((c, i) => (
        <React.Fragment key={c.name}>
          <Fade at={vectorsAt - 2 + i * 4} style={{ left: VX, top: rowY(i) }}>
            <Cells values={c.values} numAt={twoAt + i * 4} cells={cells} cell={cellW} border={c.color} />
          </Fade>
          <Fade at={cardAt[i] - 4} style={{ left: VX + 230, top: rowY(i) + 6, display: "flex", alignItems: "baseline", gap: 22 }}>
            <span style={{ ...label(28, c.ink), width: 92 }}>{c.name}</span>
            <span
              style={{
                ...body(34, true),
                color: INK,
                whiteSpace: "nowrap",
                opacity: 1 - 0.15 * pulse(frame, [lookingAt, offerAt, handOverAt][i], 20),
              }}
            >
              {i === 0 ? (
                <>
                  What am I <Mark at={lookingAt}>looking for?</Mark>
                </>
              ) : i === 1 ? (
                <>
                  What do I <Mark at={offerAt}>offer?</Mark>
                </>
              ) : (
                <>
                  What I <Mark at={handOverAt}>hand over.</Mark>
                </>
              )}
            </span>
          </Fade>
        </React.Fragment>
      ))}
      <Fade at={twoAt + 6} style={{ left: VX, top: rowY(3) - 8 }}>
        <Tag size={21}>
          The lesson&apos;s numbers for <Mono>it</Mono>, two in each
        </Tag>
      </Fade>
    </AbsoluteFill>
  );
};
