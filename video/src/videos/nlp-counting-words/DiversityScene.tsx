import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, fmt, HAIRLINE, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DIVERSITY, EMMA } from "./data";
import { flow, HBar, Headline, Kicker, MARK_BAD, Marked, numStyle, pulse, Spot, Tile } from "./parts";

const LEFT_X = 120;
const LEFT_MAX = 985;
const SIZE = 22;
/** Fig. 3, on the right. */
const RX = 1080;
const BAR_X = 1330;
const BAR_W = 400;
const ROWS_Y = 336;
const ROW_STEP = 66;

/**
 * Lexical diversity: distinct over total, the lesson's two short texts (0.29
 * and 1.0), and the same ratio measured on more and more of Emma, falling
 * from 0.73 to 0.04, the lesson's callout that it depends on length.
 */
export const DiversityScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("diversity").from;
  const ratioAt = n.word("diversity", "ratio");
  const differentAt = n.word("diversity", "different");
  const totalAt = n.word("diversity", "total");
  const lexicalAt = n.word("diversity", "lexical");
  const veryAt = n.word("very", "Very", { nth: 1 });
  const goodAt = n.word("very", "good", { nth: 1 });
  const twoAt = n.word("very", "two different");
  const sevenAt = n.word("very", "seven");
  const scoreAt = n.word("very", "zero point two nine");
  const sentenceAt = n.word("varied", "sentence");
  const neverAt = n.word("varied", "never");
  const perfectAt = n.word("varied", "perfect");
  const fallsAt = n.word("length", "falls");
  const growsAt = n.word("length", "grows");
  const comingAt = n.word("length", "coming back");
  const emmaAt = n.word("emma-length", "Emma");
  const r100 = n.word("emma-length", "zero point seven three");
  const r1k = n.word("emma-length", "first thousand");
  const r1kv = n.word("emma-length", "zero point four two");
  const r10k = n.word("emma-length", "Ten thousand");
  const r10kv = n.word("emma-length", "zero point one eight");
  const rAll = n.word("emma-length", "whole novel");
  const rAllv = n.word("emma-length", "zero point oh four");
  const sameAt = n.word("same", "same");
  const novelAt = n.word("tail-in", "whole novel");

  // ── Fig. 2: the formula and the two texts ──
  const formulaY = y(330);
  const rep = DIVERSITY.repetitive;
  const vary = DIVERSITY.varied;
  const repTiles = flow(rep.tokens, LEFT_X, y(500), LEFT_MAX, SIZE, 8, h(54));
  const varTiles = flow(vary.tokens, LEFT_X, y(660), LEFT_MAX, SIZE, 8, h(54));
  const seen = new Set<string>();
  const repFirst = rep.tokens.map((t) => {
    const f = !seen.has(t);
    seen.add(t);
    return f;
  });

  // ── Fig. 3: Emma, read further and further ──
  const rows = EMMA.byLength.map((r, i) => ({
    name: i === EMMA.byLength.length - 1 ? `all ${fmt(r.words, 0)}` : `first ${fmt(r.words, 0)}`,
    value: r.value,
    at: [emmaAt, r1k, r10k, rAll][i] - 2,
    valueAt: [r100, r1kv, r10kv, rAllv][i] - 2,
  }));
  const rowY = (i: number) => y(ROWS_Y) + i * h(ROW_STEP);
  const allPulse = pulse(frame, novelAt - 2, 24);

  return (
    <AbsoluteFill>
      {/* ── Sound: the fraction's rule, each score, each of Emma's bars ── */}
      <Sfx name="el-pencil" at={totalAt - 4} level={-34} />
      <Sfx name="el-tap" at={scoreAt - 2} level={-27} />
      <Sfx name="el-tap" at={perfectAt - 2} level={-28} />
      <Sfx name="el-pop" at={emmaAt - 4} level={-30} />
      {rows.map((r, i) => (
        <Sfx key={i} name="el-tap" at={r.valueAt} level={-29} />
      ))}

      <Kicker at={from - 10}>Counting words</Kicker>
      <Headline at={lexicalAt - 4}>Lexical diversity</Headline>
      <Spot id="nlp-counting-words-novel" at={emmaAt - 4} left={1400} top={y(660)} width={380} height={244} />

      <FigLabel n="2" title="Different words over total words" at={ratioAt - 4} x={LEFT_X} y={y(270)} />

      {/* The ratio, built as it is said. */}
      <div style={{ position: "absolute", left: LEFT_X, top: formulaY, display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
          <Ink at={differentAt - 4} dur={14} style={{ position: "relative", ...body(36), color: INK, whiteSpace: "nowrap" }}>
            different words
          </Ink>
          <div
            style={{
              width: 300,
              height: 2,
              background: INK,
              margin: "8px 0 6px",
              transformOrigin: "left center",
              transform: `scaleX(${ease(frame, totalAt - 6, 12)})`,
            }}
          />
          <Ink at={totalAt - 2} dur={14} style={{ position: "relative", ...body(36), color: INK, whiteSpace: "nowrap" }}>
            total words
          </Ink>
        </div>
      </div>

      {/* The lesson's repetitive text: first uses lit, repeats washed. */}
      {repTiles.map((t, i) => (
        <Tile
          key={i}
          text={t.text}
          x={t.x}
          y={t.y}
          size={SIZE}
          at={(i < 3 ? veryAt : goodAt) - 4 + (i < 3 ? i : i - 3) * 3}
          marks={[
            ...(repFirst[i] ? [{ at: twoAt - 2 + i }] : []),
            ...(!repFirst[i] ? [{ at: comingAt - 2 + i, color: MARK_BAD }] : []),
          ]}
        />
      ))}
      <Note at={twoAt - 2} x={LEFT_X} y={y(500) + h(54) + 4}>
        <div style={{ ...label(24, INK_SOFT), whiteSpace: "nowrap", display: "flex", gap: 8, alignItems: "baseline" }}>
          <span>
            <span style={numStyle(24, INK)}>{rep.distinct}</span> different
          </span>
          <span style={{ opacity: ease(frame, sevenAt - 2, 10) }}>
            over <span style={numStyle(24, INK)}>{rep.total}</span> words
          </span>
          <span style={{ opacity: ease(frame, scoreAt - 2, 10) }}>
            = <span style={{ ...numStyle(28, ACCENT_INK), fontWeight: 700 }}>{fmt(rep.value, 2)}</span>
          </span>
        </div>
      </Note>

      {/* The varied sentence: every word new. */}
      {varTiles.map((t, i) => (
        <Tile key={i} text={t.text} x={t.x} y={t.y} size={SIZE} at={sentenceAt - 2 + i * 3} marks={[{ at: neverAt + i * 2 }]} />
      ))}
      <Note at={perfectAt - 4} x={LEFT_X} y={y(660) + h(54) + 4}>
        <div style={{ ...label(24, INK_SOFT), whiteSpace: "nowrap" }}>
          <span style={numStyle(24, INK)}>{vary.distinct}</span> different over <span style={numStyle(24, INK)}>{vary.total}</span> words ={" "}
          <span style={{ ...numStyle(28, ACCENT_INK), fontWeight: 700 }}>{fmt(vary.value, 1)}</span>
        </div>
      </Note>

      {/* Fig. 3: the same ratio on more and more of one novel. */}
      <FigLabel n="3" title="One novel, scored on more and more of it" at={fallsAt - 4} x={RX} y={y(270)} />
      <div
        style={{
          position: "absolute",
          left: BAR_X,
          top: rowY(0) - 14,
          width: 1.5,
          height: rowY(3) - rowY(0) + h(40) + 18,
          background: HAIRLINE,
          opacity: ease(frame, fallsAt, 12),
        }}
      />
      {rows.map((r, i) => (
        <React.Fragment key={r.name}>
          <Ink at={i === 0 ? growsAt - 2 : r.at} dur={12} style={{ left: RX, top: rowY(i), height: h(40), display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
            <span style={{ ...label(22, INK), fontWeight: 600 }}>
              {i === rows.length - 1 ? <Marked at={novelAt - 2}>{r.name}</Marked> : r.name}{" "}
              <span style={{ color: INK_SOFT, fontWeight: 500 }}>words</span>
            </span>
          </Ink>
          <HBar x={BAR_X + 1} y={rowY(i) + h(6)} w={r.value * BAR_W} h={h(28)} at={r.valueAt} />
          <Note at={r.valueAt + 6} x={BAR_X + r.value * BAR_W + 12} y={rowY(i)}>
            <div style={{ height: h(40), display: "flex", alignItems: "center", ...numStyle(24, INK) }}>
              {i === rows.length - 1 ? <Marked at={sameAt - 2}>{fmt(r.value, 2)}</Marked> : fmt(r.value, 2)}
            </div>
          </Note>
        </React.Fragment>
      ))}
      <div
        style={{
          position: "absolute",
          left: RX - 16,
          top: rowY(3) - 6,
          width: BAR_X - RX + 200,
          height: h(40) + 12,
          borderRadius: 8,
          background: `color-mix(in srgb, ${INK} ${Math.round(allPulse * 8)}%, transparent)`,
        }}
      />
      <Note at={sameAt - 4} x={RX} y={rowY(3) + h(80)}>
        <div style={{ ...body(32, true), color: INK, whiteSpace: "nowrap" }}>Only compare texts of the same length.</div>
      </Note>
    </AbsoluteFill>
  );
};
