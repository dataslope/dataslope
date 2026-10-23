import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { W2V, W2V_PAPER } from "./data";
import { DATA, DATA_INK, DATA_WASH, Headline, Kicker, Mark, pulse, SOFT, Svg, Tag, Wire } from "./parts";

type Word = "man" | "woman" | "king" | "queen";

/** A word on the plane: a dot and its name, popping in on `at`. */
const WordDot: React.FC<{ x: number; y: number; word: string; at: number; dx: number; dy: number; swell?: number; color?: string }> = ({
  x,
  y,
  word,
  at,
  dx,
  dy,
  swell = 0,
  color = DATA,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(1, pop(frame, at, fps, 13));
  if (p <= 0.001) return null;
  return (
    <>
      <Svg>
        <circle cx={x} cy={y} r={11 * p * (1 + swell * 0.45)} fill={color} stroke={PAPER} strokeWidth={2.5} />
      </Svg>
      <div
        style={{
          position: "absolute",
          left: x + dx,
          top: y + dy,
          transform: `translate(${dx < 0 ? "-100%" : "0"}, -50%)`,
          opacity: p,
          fontFamily: MONO,
          fontSize: 30,
          fontWeight: 500,
          color: INK,
          whiteSpace: "nowrap",
        }}
      >
        {word}
      </div>
    </>
  );
};

/** The arXiv paper's first page: its date, title, authors and where they
 *  worked, each inking on the word that names it, then lines of text. */
const PaperCard: React.FC<{
  x: number;
  top: number;
  width: number;
  height: number;
  at: number;
  dateAt: number;
  authorAt: number;
  placeAt: number;
  titleMark: number;
  out: number;
}> = ({ x, top, width, height, at, dateAt, authorAt, placeAt, titleMark, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = ease(frame, out, 12);
  if (p <= 0 || o >= 1) return null;
  const pad = 28;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width,
        height,
        opacity: p * (1 - o),
        transform: `translate(${(1 - p) * 30 + o * 30}px, 0) rotate(${(1 - p) * 1.5 - 0.5}deg)`,
        background: PAPER,
        border: `1.5px solid ${HAIRLINE}`,
        borderRadius: 3,
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "absolute", left: pad, right: pad, top: 20, display: "flex", justifyContent: "space-between", ...note(19, INK_SOFT), whiteSpace: "nowrap" }}>
        <span>arXiv</span>
        <span style={{ color: ACCENT_INK, fontWeight: 650, opacity: ease(frame, dateAt, 10) }}>{W2V_PAPER.date}</span>
      </div>
      <div style={{ position: "absolute", left: pad, right: pad, top: 52, height: 1.5, background: INK }} />
      <Ink at={at + 6} dur={20} style={{ left: pad, top: 70, width: width - 2 * pad }}>
        <div style={{ ...headline(30), lineHeight: 1.12 }}>
          <Mark at={titleMark}>{W2V_PAPER.title}</Mark>
        </div>
      </Ink>
      <Ink at={authorAt} dur={14} style={{ left: pad, top: 158, width: width - 2 * pad }}>
        <div style={{ ...label(21, INK), lineHeight: 1.35 }}>{W2V_PAPER.authors}</div>
      </Ink>
      <Ink at={placeAt} dur={14} style={{ left: pad, top: 226, whiteSpace: "nowrap" }}>
        <div style={{ ...label(21, INK_SOFT), fontWeight: 560 }}>{W2V_PAPER.place}</div>
      </Ink>
      {Array.from({ length: 5 }, (_, i) => {
        const w = ease(frame, at + 14 + i * 6, 12);
        const full = i === 4 ? 0.5 : 0.88 + ((i * 37) % 10) / 100;
        return <div key={i} style={{ position: "absolute", left: pad, top: 280 + i * 30, width: (width - 2 * pad) * full * w, height: 6, borderRadius: 3, background: SOFT }} />;
      })}
    </div>
  );
};

/**
 * Part 7, 2013: word2vec gives every word a point in space. Four of its words
 * on one flat slice of its 300 dimensions (Fig. 11): the step from man to
 * woman, taken again from king, lands nearest queen. Then the course's own
 * complaint about bag of words answered (Fig. 12): "great" is among the
 * nearest words to "excellent".
 */
export const VectorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("w2v").from;
  const thirteenAt = n.word("w2v", "twenty thirteen");
  const mikolovAt = n.word("w2v", "Mikolov");
  const vecWordAt = n.word("w2v", "vec");
  const googleAt = n.word("w2v", "Google");
  const releasedAt = n.word("w2v", "released");
  const pointAt = n.word("points", "point in space");
  const closeAt = n.word("points", "close together");
  const directionsAt = n.word("analogy", "directions");
  const kingAt = n.word("analogy", "king");
  const manAt = n.word("analogy", "take away man");
  const womanAt = n.word("analogy", "add woman");
  const nearestAt = n.word("analogy", "nearest other word");
  const queenAt = n.word("analogy", "queen");
  const rememberAt = n.word("great", "Remember");
  const columnsAt = n.word("great", "unrelated columns");
  const neighborsAt = n.word("great", "neighbors");
  const hereAt = n.word("great", "Here");

  // ── Fig. 11, the plane ──
  const OX = 300;
  const OY = y(850);
  const S = 410;
  const at = (w: Word | "query"): [number, number] => [OX + W2V.plane[w][0] * S, OY - W2V.plane[w][1] * S];
  const man = at("man");
  const woman = at("woman");
  const king = at("king");
  const queen = at("queen");
  const query = at("query");
  const ring = ease(frame, nearestAt - 2, 16);

  /** "great" stands out once the narration says the two were unrelated. */
  const isGreatAt = (word: string) => word === "great" && frame >= columnsAt;

  // ── Fig. 12, the nearest words to "excellent" ──
  const LX = 1080;
  const LTOP = y(400);
  const ROW = 62;
  const BAR0 = LX + 230;
  const BARW = 470;

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-pop" at={mikolovAt} level={-32} />
      <Sfx name="el-pop" at={releasedAt} level={-32} />
      <Sfx name="el-tap" at={kingAt} level={-29} />
      <Sfx name="el-pencil" at={manAt} level={-34} />
      <Sfx name="el-pencil" at={womanAt} level={-34} />
      <Sfx name="el-pop" at={nearestAt - 2} level={-30} />
      <Sfx name="el-sprinkle" at={rememberAt + 8} level={-33} />
      <Sfx name="el-pencil" at={pointAt - 2} level={-35} />
      <Sfx name="el-tap" at={neighborsAt} level={-28} />

      <Kicker at={from - 6}>2013: Tomáš Mikolov and colleagues, Google</Kicker>
      <Headline at={from + 2} lead="Words become" turn="points." turnAt={from + 14} out={directionsAt - 6} />
      <Headline at={directionsAt - 2} lead="Directions" turn="mean something." turnAt={directionsAt + 8} />

      <FigLabel n="11" title="Four of its words, on one flat slice of its 300 dimensions" at={from + 2} x={96} y={y(290)} />
      {/* The four words, as points. */}
      <WordDot x={man[0]} y={man[1]} word="man" at={pointAt - 2} dx={-20} dy={30} swell={pulse(frame, manAt, 20)} />
      <WordDot x={woman[0]} y={woman[1]} word="woman" at={pointAt + 4} dx={18} dy={30} swell={pulse(frame, womanAt, 20)} />
      <WordDot x={king[0]} y={king[1]} word="king" at={pointAt + 10} dx={-20} dy={-26} swell={pulse(frame, kingAt, 20)} />
      <WordDot x={queen[0]} y={queen[1]} word="queen" at={pointAt + 16} dx={-42} dy={30} swell={pulse(frame, queenAt, 24)} />
      {/* Royal words sit apart from the rest: a wash behind king and queen. */}
      <Svg opacity={ease(frame, closeAt - 6, 14) * (1 - ease(frame, directionsAt, 14))}>
        <ellipse cx={(king[0] + queen[0]) / 2} cy={(king[1] + queen[1]) / 2} rx={150} ry={110} fill={DATA_WASH} />
        <ellipse cx={(man[0] + woman[0]) / 2} cy={man[1]} rx={210} ry={70} fill={DATA_WASH} />
      </Svg>
      {/* man to woman, then the same step from king. */}
      <Wire points={[[man[0] + 16, man[1]], [woman[0] - 18, woman[1]]]} at={manAt + 4} dur={16} color={ACCENT} width={3} />
      <Wire points={[[king[0] + 16, king[1]], [query[0] - 18, query[1]]]} at={womanAt} dur={18} color={ACCENT} width={3} dash="9 7" />
      <Svg opacity={ease(frame, womanAt + 14, 10)}>
        <g transform={`translate(${query[0]} ${query[1]})`} stroke={ACCENT} strokeWidth={3.4} strokeLinecap="round">
          <line x1={-10} y1={-10} x2={10} y2={10} />
          <line x1={10} y1={-10} x2={-10} y2={10} />
        </g>
        {/* From where the sum lands to the nearest real word. */}
        <line x1={query[0] - 8} y1={query[1] + 8} x2={queen[0] + 14} y2={queen[1] - 12} stroke={INK_SOFT} strokeWidth={1.8} strokeDasharray="5 5" opacity={ring} />
        <circle cx={queen[0]} cy={queen[1]} r={30} fill="none" stroke={ACCENT} strokeWidth={2.8} pathLength={1} strokeDasharray={`${ring} 1`} />
      </Svg>
      <Tag x={query[0] + 22} y={query[1] - 62} at={womanAt + 12} size={24} color={ACCENT_INK} weight={650}>
        king − man + woman
      </Tag>
      <Tag x={queen[0] + 46} y={queen[1] + 4} at={nearestAt} size={23} color={INK} weight={650}>
        nearest other word: <span style={{ fontFamily: MONO, fontWeight: 500 }}>{W2V.analogy[0].word}</span>
      </Tag>
      <Tag x={(man[0] + woman[0]) / 2} y={man[1] + 54} at={manAt + 8} align="center" size={20} color={INK_SOFT} weight={560}>
        one step, man to woman
      </Tag>

      {/* ── The paper behind it, assembled as the narration names its parts ── */}
      <PaperCard x={LX + 40} top={y(330)} width={580} height={450} at={from + 2} dateAt={thirteenAt} authorAt={mikolovAt} placeAt={googleAt} titleMark={vecWordAt} out={rememberAt - 8} />

      {/* ── Fig. 12 ── */}
      <FigLabel n="12" title="The six words nearest to excellent" at={rememberAt - 2} x={LX} y={y(290)} />
      <Ink at={rememberAt} style={{ left: LX, top: LTOP - 4, whiteSpace: "nowrap" }}>
        <div style={{ ...label(22, INK_SOFT) }}>
          in a bag of words, <span style={{ fontFamily: MONO, color: INK }}>great</span> and{" "}
          <span style={{ fontFamily: MONO, color: INK }}>excellent</span> share <Mark at={columnsAt}>nothing</Mark>
        </div>
      </Ink>
      {W2V.excellent.map((w, i) => {
        const t = rememberAt + 8 + i * 4;
        const blue = isGreatAt(w.word);
        const isGreat = blue;
        const top = LTOP + 56 + i * ROW;
        const grow = ease(frame, t, 14);
        return (
          <React.Fragment key={w.word}>
            <Ink at={t} style={{ left: LX, top: top + 2, width: 210, textAlign: "right" }}>
              <span style={{ fontFamily: MONO, fontSize: 30, color: isGreat ? DATA_INK : INK, fontWeight: isGreat ? 600 : 400 }}>
                {isGreat ? <Mark at={neighborsAt}>{w.word}</Mark> : w.word}
              </span>
            </Ink>
            <div
              style={{
                position: "absolute",
                left: BAR0,
                top: top + 8,
                width: BARW * (w.sim / W2V.excellent[0].sim) * grow,
                height: 30,
                transform: isGreat ? `scaleY(${1 + pulse(frame, hereAt - 2, 20) * 0.5})` : undefined,
                borderRadius: 4,
                background: isGreat ? DATA : `color-mix(in srgb, ${DATA} 40%, transparent)`,
                opacity: grow > 0 ? 1 : 0,
              }}
            />
          </React.Fragment>
        );
      })}
      <Tag x={BAR0} y={LTOP + 56 + 6 * ROW + 6} at={rememberAt + 34} size={20} color={INK_SOFT}>
        bar: how close each word sits to excellent
      </Tag>
    </AbsoluteFill>
  );
};
