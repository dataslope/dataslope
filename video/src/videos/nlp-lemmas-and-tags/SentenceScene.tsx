import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { colors } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { FOUND, MAPPING, SENTENCE, tokenAt } from "./data";
import { Arrow, Chip, chipHeight, chipWidth, Headline, Kicker, Mark, rowLayout, Spot, X0 } from "./parts";

const SIZE = 28;
const CHIP_X = 340;
const GAP = 14;
const FIG_Y = 286;
/** Rows of Fig. 4: the words, their Penn tags, WordNet's part of speech;
 *  then, after a rule, the lemmas and Porter's stems. */
const ROW_Y = [356, 442, 528, 650, 736];
const LEGEND_X = 1490;
const LEGEND_Y = 350;
const LEGEND_STEP = 58;
const legendCode: React.CSSProperties = { fontFamily: MONO, fontSize: 26, fontWeight: 600, color: INK, fontVariantLigatures: "none" };

/**
 * A Penn tag whose letters after the first fade to faint on `cutAt`: the
 * lesson's to_wordnet_pos reads only tag[0].
 */
const TagText: React.FC<{ tag: string; cutAt: number }> = ({ tag, cutAt }) => {
  const frame = useCurrentFrame();
  const k = ease(frame, cutAt, 14);
  return (
    <span>
      {tag.slice(0, 1)}
      <span style={{ color: k > 0 ? `color-mix(in srgb, ${colors.inkFaint} ${(k * 100).toFixed(0)}%, ${INK})` : INK }}>{tag.slice(1)}</span>
    </span>
  );
};

/**
 * The pos-tagging lesson's sentence through the accurate recipe: pos_tag()
 * gives each word a Penn tag, its first letter picks one of WordNet's four
 * parts of speech, and lemmatize() with that part returns be, run, have and
 * eat, where Porter's stemmer, on the same words, leaves were, had and eaten.
 */
export const SentenceScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();
  const S = SENTENCE;

  // ── Cues ──
  const from = n.beat("tagger").from;
  const wholeAt = n.word("tagger", "whole");
  const wordAt = [
    n.word("tagger", "the runners"),
    n.word("tagger", "runners"),
    n.word("tagger", "were"),
    n.word("tagger", "running"),
    n.word("tagger", "and"),
    n.word("tagger", "they"),
    n.word("tagger", "had"),
    n.word("tagger", "eaten"),
    n.word("tagger", "well"),
  ];
  wordAt.push(wordAt[wordAt.length - 1] + 5);
  const pennAt = n.word("tags", "Penn Treebank tag");
  const said = [
    { tag: n.word("tags", "NNS"), word: n.word("tags", "runners"), i: tokenAt("runners") },
    { tag: n.word("tags", "VBD"), word: n.word("tags", "were"), i: tokenAt("were") },
    { tag: n.word("tags", "VBG"), word: n.word("tags", "running"), i: tokenAt("running") },
  ];
  const fourAt = n.word("letter", "four parts");
  const firstAt = n.word("letter", "first letter");
  const legendAt: Record<string, number> = {
    J: n.word("letter", "J"),
    V: n.word("letter", "V"),
    R: n.word("letter", "R"),
    else: n.word("letter", "anything else"),
  };
  const lemmatizeAt = n.word("lemmas", "lemmatize");
  const lemmaSaid: Record<string, number> = {
    runner: n.word("lemmas", "runner"),
    be: n.word("lemmas", "be"),
    run: n.word("lemmas", "run"),
    have: n.word("lemmas", "have"),
    eat: n.word("lemmas", "eat"),
  };
  const porterAt = n.word("porter", "Porter's");
  const stemmerAt = n.word("porter", "stemmer");
  const porterSaid: Record<string, number> = {
    runner: n.word("porter", "runner"),
    run: n.word("porter", "run"),
    were: n.word("porter", "were"),
    had: n.word("porter", "had"),
    eaten: n.word("porter", "eaten"),
  };
  const endingsAt = n.word("porter", "endings");
  const closeAt = n.word("close", "So");
  const neededAt = n.word("close", "part of speech");
  const tagFirstAt = n.word("close", "Tag first");
  const thenAt = n.word("close", "then lemmatize");
  const closeEnd = n.beat("close").to;
  const lastAt = n.word("close", "lemmatize");

  // ── Geometry: one column per token, every row centred on it ──
  const cols = rowLayout(S.tokens, CHIP_X, SIZE, GAP);
  const chipH = chipHeight(SIZE);
  const rowTop = (r: number) => y(ROW_Y[r]);
  const centred = (text: string, i: number) => cols[i].mid - chipWidth(text, SIZE) / 2;
  const labelTop = (r: number) => rowTop(r) + chipH / 2 - 14;
  const familyOf = (tag: string) => MAPPING.find((m) => m.letter === tag[0]) ?? MAPPING[3];
  const posAt = S.tags.map((t, i) => legendAt[familyOf(t).letter] + 4 + i * 2);
  const lemmaAt = S.aware.map((l, i) => (S.aware[i] !== S.tokens[i] && lemmaSaid[l] !== undefined ? lemmaSaid[l] : lemmatizeAt + 4 + i * 2));
  const stemAt = S.porter.map((_, i) => stemmerAt + 2 + i * 2);
  /** A lemma Porter's stem misses (were, had, eaten), lit as its stem is said. */
  const missed = (i: number) => {
    const at = S.aware[i] !== S.porter[i] ? porterSaid[S.porter[i]] : undefined;
    return at === undefined ? [] : [{ at: at - 2, out: at + 30 }];
  };

  const rowLabel = (r: number, at: number, text: string) => (
    <Ink at={at} dur={12} style={{ left: X0, top: labelTop(r), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{text}</span>
    </Ink>
  );

  return (
    <AbsoluteFill>
      {wordAt.map((a, i) => (
        <Sfx key={`w${i}`} name="el-tap" at={a} level={-31} />
      ))}
      <Sfx name="el-pop" at={from + 10} level={-30} />
      <Sfx name="el-sprinkle" at={pennAt} level={-33} />
      {MAPPING.map((m) => (
        <Sfx key={m.letter} name="el-tap" at={legendAt[m.letter]} level={-27} />
      ))}
      {Object.values(lemmaSaid).map((a, i) => (
        <Sfx key={`l${i}`} name="el-tap" at={a} level={-26} />
      ))}
      <Sfx name="el-sprinkle" at={stemmerAt} level={-34} />
      <Sfx name="el-pencil" at={tagFirstAt - 2} level={-35} />
      <Sfx name="el-chime" at={closeEnd + 8} level={-32} />

      <Kicker at={from - 6}>Tag, then lemmatize</Kicker>
      <Headline lead="The tagger" turn="reads the whole sentence." at={from - 4} turnAt={wholeAt - 2} out={tagFirstAt - 6} />
      <Headline lead="Tag first," turn="then lemmatize." at={tagFirstAt - 6} turnAt={thenAt - 2} />

      {/* Fig. 4: the pos-tagging lesson's sentence, row by row. */}
      <FigLabel n="4" title="The runners sentence, tagged and lemmatized" at={from} x={X0} y={y(FIG_Y)} />
      {rowLabel(0, from + 6, "word")}
      {S.tokens.map((t, i) => (
        <Chip
          key={`w${i}`}
          text={t}
          x={cols[i].x}
          y={rowTop(0)}
          at={wordAt[i]}
          size={SIZE}
          marks={said.filter((s) => s.i === i).map((s) => ({ at: s.word - 2, out: s.word + 24 }))}
        />
      ))}

      {rowLabel(1, pennAt - 4, "Penn tag")}
      {S.tags.map((t, i) => (
        <Chip
          key={`t${i}`}
          text={t}
          x={centred(t, i)}
          y={rowTop(1)}
          at={pennAt + i * 3}
          size={SIZE}
          content={<TagText tag={t} cutAt={firstAt + i * 2} />}
          marks={said.filter((s) => s.i === i).map((s) => ({ at: s.tag - 2, out: s.tag + 24 }))}
        />
      ))}
      {rowLabel(2, firstAt, "WordNet")}
      {S.wordnetPos.map((p, i) => (
        <Chip
          key={`p${i}`}
          text={p}
          x={centred(p, i)}
          y={rowTop(2)}
          at={posAt[i]}
          size={SIZE}
          marks={[{ at: neededAt + i * 2, out: neededAt + 50 }]}
        />
      ))}

      {rowLabel(3, lemmatizeAt, "lemma")}
      {S.aware.map((l, i) => (
        <Chip
          key={`l${i}`}
          text={l}
          x={centred(l, i)}
          y={rowTop(3)}
          at={lemmaAt[i]}
          size={SIZE}
          tones={FOUND[i] ? [{ at: lemmaAt[i] + 6, tone: "good" }] : []}
          marks={[...missed(i), ...(FOUND[i] ? [{ at: lastAt + i * 3, out: lastAt + i * 3 + 40 }] : [])]}
        />
      ))}

      {rowLabel(4, porterAt, "Porter stem")}
      {S.porter.map((s, i) => (
        <Chip
          key={`s${i}`}
          text={s}
          x={centred(s, i)}
          y={rowTop(4)}
          at={stemAt[i]}
          size={SIZE}
          marks={porterSaid[s] !== undefined ? [{ at: porterSaid[s] - 2, out: porterSaid[s] + 30 }] : []}
        />
      ))}
      <Ink at={endingsAt} dur={12} out={closeAt + 4} style={{ left: CHIP_X, top: rowTop(4) + chipH + 16, whiteSpace: "nowrap" }}>
        <span style={label(22, INK)}>only cuts endings</span>
      </Ink>

      {/* Fig. 5: the lesson's to_wordnet_pos, as a legend. */}
      <FigLabel n="5" title="First letter to WordNet" at={fourAt} x={LEGEND_X} y={y(FIG_Y)} />
      {MAPPING.map((m, k) => {
        const top = y(LEGEND_Y + k * LEGEND_STEP);
        const at = legendAt[m.letter];
        const mid = top + 19;
        return (
          <React.Fragment key={m.letter}>
            <Ink at={at} dur={10} style={{ left: LEGEND_X, top, whiteSpace: "nowrap" }}>
              <span style={legendCode}>{m.letter}</span>
            </Ink>
            <Arrow from={[LEGEND_X + 84, mid]} to={[LEGEND_X + 128, mid]} at={at + 4} dur={8} />
            <Ink at={at + 8} dur={10} style={{ left: LEGEND_X + 146, top, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 14 }}>
              <span style={legendCode}>{m.pos}</span>
              <span style={label(24, INK)}>
                <Mark at={at + 8} out={at + 32}>
                  {m.name}
                </Mark>
              </span>
            </Ink>
          </React.Fragment>
        );
      })}

      <Spot id="nlp-lemmas-and-tags-tags" at={from + 10} left={1510} top={y(650)} width={300} height={231} />
    </AbsoluteFill>
  );
};
