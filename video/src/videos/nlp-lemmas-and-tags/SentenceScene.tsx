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
import { MAPPING, RESCUED, SENTENCE, tokenAt } from "./data";
import { Arrow, Chip, chipHeight, chipWidth, Headline, Kicker, Mark, rowLayout, Spot, Tag, X0 } from "./parts";

const SIZE = 28;
const CHIP_X = 340;
const GAP = 14;
const FIG_Y = 286;
/** Rows of Fig. 4: the words, their Penn tags, WordNet's part of speech;
 *  then, after a wider gap, the lemmas without tags and with them (the
 *  lesson's two printed lines), and Porter's stems. */
const ROW_Y = [356, 438, 520, 612, 694, 776];
const ROW = { word: 0, penn: 1, pos: 2, naive: 3, aware: 4, porter: 5 } as const;
const LEGEND_X = 1490;
const LEGEND_Y = 344;
const LEGEND_STEP = 64;
const legendCode: React.CSSProperties = { fontFamily: MONO, fontSize: 26, fontWeight: 600, color: INK, fontVariantLigatures: "none" };
/** The fix as one call, in Fig. 1's code face. */
const CALL_SIZE = 28;
const callFace: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: CALL_SIZE,
  fontWeight: 500,
  lineHeight: 1.3,
  color: INK,
  fontVariantLigatures: "none",
  whiteSpace: "pre",
};
/** What the narration calls the three tags it names, set under each. */
const GLOSS: Record<string, string> = { NNS: "plural noun", VBD: "past", VBG: "ing form" };

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
 * eat, where without it (the lesson's naive line) those four come back
 * unchanged, and Porter's stemmer, on the same words, leaves were, had and
 * eaten. The close writes the fix as one call.
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
    { tag: n.word("tags", "NNS"), gloss: n.word("tags", "plural noun"), word: n.word("tags", "runners"), i: tokenAt("runners") },
    { tag: n.word("tags", "VBD"), gloss: n.word("tags", "past-tense verb"), word: n.word("tags", "were"), i: tokenAt("were") },
    { tag: n.word("tags", "VBG"), gloss: n.word("tags", "ing form"), word: n.word("tags", "running"), i: tokenAt("running") },
  ];
  const fourAt = n.word("letter", "four parts");
  const firstAt = n.word("letter", "first letter");
  const legendAt: Record<string, number> = {
    J: n.word("map", "J"),
    V: n.word("map", "V"),
    R: n.word("map", "R"),
    else: n.word("map", "anything else"),
  };
  const thoseAt = n.word("lemmas", "those");
  const withoutAt = n.word("contrast", "Without tags");
  /** The four the tags rescue, as each is said without them. */
  const naiveSaid: Record<string, number> = {
    were: n.word("contrast", "were", { nth: 1 }),
    running: n.word("contrast", "running", { nth: 1 }),
    had: n.word("contrast", "had", { nth: 1 }),
    eaten: n.word("contrast", "eaten", { nth: 1 }),
  };
  const unchangedAt = n.word("contrast", "unchanged");
  const withAt = n.word("contrast", "With them");
  const lemmaSaid: Record<string, number> = {
    be: n.word("contrast", "be"),
    run: n.word("contrast", "run"),
    have: n.word("contrast", "have"),
    eat: n.word("contrast", "eat"),
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
  /** A chip wider than its token starts at the token's left edge rather than
   *  spilling left into the column before it (have under had, beside they). */
  const placed = (text: string, i: number) => Math.max(cols[i].x, centred(text, i));
  const labelTop = (r: number) => rowTop(r) + chipH / 2 - 14;
  const familyOf = (tag: string) => MAPPING.find((m) => m.letter === tag[0]) ?? MAPPING[3];
  const posAt = S.tags.map((t, i) => legendAt[familyOf(t).letter] + 4 + i * 2);
  const naiveAt = S.naive.map((_, i) => withoutAt + 2 + i * 2);
  const lemmaAt = S.aware.map((l, i) => (RESCUED[i] && lemmaSaid[l] !== undefined ? lemmaSaid[l] : withAt + 2 + i * 2));
  const stemAt = S.porter.map((_, i) => stemmerAt + 2 + i * 2);
  /** The fix as one call: the lesson's lemmatize() on running, with the
   *  part of speech its tag gives. */
  const fix = (() => {
    const i = tokenAt("running");
    return { i, word: S.tokens[i], pos: S.wordnetPos[i], lemma: S.aware[i] };
  })();
  const callTop = rowTop(ROW.porter) + chipH + 40;
  const callHead = `lemmatize("${fix.word}", pos=`;
  const callW = (callHead.length + `"${fix.pos}")`.length) * 0.6 * CALL_SIZE;
  const callArrowX = X0 + callW + 22;
  /** Its result sits in running's column, under the run the rows reached. */
  const callResultX = Math.max(callArrowX + 80, placed(fix.lemma, fix.i));
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
      <Sfx name="el-pencil" at={withoutAt} level={-35} />
      {Object.values(lemmaSaid).map((a, i) => (
        <Sfx key={`l${i}`} name="el-tap" at={a} level={-26} />
      ))}
      <Sfx name="el-sprinkle" at={stemmerAt} level={-34} />
      <Sfx name="el-pencil" at={neededAt - 2} level={-36} />
      <Sfx name="el-pencil" at={tagFirstAt - 2} level={-35} />
      <Sfx name="el-chime" at={closeEnd + 8} level={-32} />

      <Kicker at={from - 6}>Tag, then lemmatize</Kicker>
      <Headline lead="The tagger" turn="reads the whole sentence." at={from - 4} turnAt={wholeAt - 2} out={tagFirstAt - 6} />
      <Headline lead="Tag first," turn="then lemmatize." at={tagFirstAt - 6} turnAt={thenAt - 2} />

      {/* Fig. 4: the pos-tagging lesson's sentence, row by row. */}
      <FigLabel n="4" title="The runners sentence, tagged and lemmatized" at={from} x={X0} y={y(FIG_Y)} />
      {rowLabel(ROW.word, from + 6, "word")}
      {S.tokens.map((t, i) => (
        <Chip
          key={`w${i}`}
          text={t}
          x={cols[i].x}
          y={rowTop(ROW.word)}
          at={wordAt[i]}
          size={SIZE}
          marks={said.filter((s) => s.i === i).map((s) => ({ at: s.word - 2, out: s.word + 24 }))}
        />
      ))}

      {rowLabel(ROW.penn, pennAt - 4, "Penn tag")}
      {S.tags.map((t, i) => (
        <Chip
          key={`t${i}`}
          text={t}
          x={centred(t, i)}
          y={rowTop(ROW.penn)}
          at={pennAt + i * 3}
          size={SIZE}
          content={<TagText tag={t} cutAt={firstAt + i * 2} />}
          marks={said.filter((s) => s.i === i).map((s) => ({ at: s.tag - 2, out: s.tag + 24 }))}
        />
      ))}
      {/* What each named tag means, under it as it is said; gone once the
          tags are cut to their first letters. */}
      {said.map((s) => (
        <Tag
          key={`g${s.i}`}
          at={s.gloss}
          out={firstAt}
          x={cols[s.i].mid}
          y={rowTop(ROW.penn) + chipH + 4}
          align="center"
          color={INK_SOFT}
          size={22}
        >
          {GLOSS[S.tags[s.i]]}
        </Tag>
      ))}

      {rowLabel(ROW.pos, firstAt, "WordNet pos")}
      {S.wordnetPos.map((p, i) => (
        <Chip
          key={`p${i}`}
          text={p}
          x={centred(p, i)}
          y={rowTop(ROW.pos)}
          at={posAt[i]}
          size={SIZE}
          marks={[
            { at: thoseAt + i * 2, out: thoseAt + i * 2 + 30 },
            { at: neededAt + i * 2, out: neededAt + 50 },
          ]}
        />
      ))}

      {/* The lesson's two printed lines: without tags, then with them. */}
      {rowLabel(ROW.naive, withoutAt, "lemma, no tag")}
      {S.naive.map((l, i) => (
        <Chip
          key={`n${i}`}
          text={l}
          x={placed(l, i)}
          y={rowTop(ROW.naive)}
          at={naiveAt[i]}
          size={SIZE}
          marks={naiveSaid[S.tokens[i]] !== undefined && RESCUED[i] ? [{ at: naiveSaid[S.tokens[i]] - 2, out: unchangedAt + 16 }] : []}
        />
      ))}

      {rowLabel(ROW.aware, withAt, "lemma, with tag")}
      {S.aware.map((l, i) => (
        <Chip
          key={`l${i}`}
          text={l}
          x={placed(l, i)}
          y={rowTop(ROW.aware)}
          at={lemmaAt[i]}
          size={SIZE}
          marks={[
            ...(RESCUED[i] ? [{ at: lemmaAt[i], out: lemmaAt[i] + 30 }] : []),
            ...missed(i),
            ...(RESCUED[i] ? [{ at: lastAt + i * 3, out: lastAt + i * 3 + 40 }] : []),
          ]}
        />
      ))}

      {rowLabel(ROW.porter, porterAt, "Porter stem")}
      {S.porter.map((s, i) => (
        <Chip
          key={`s${i}`}
          text={s}
          x={placed(s, i)}
          y={rowTop(ROW.porter)}
          at={stemAt[i]}
          size={SIZE}
          marks={porterSaid[s] !== undefined ? [{ at: porterSaid[s] - 2, out: porterSaid[s] + 30 }] : []}
        />
      ))}
      <Ink at={endingsAt} dur={12} out={closeAt + 4} style={{ left: CHIP_X, top: rowTop(ROW.porter) + chipH + 16, whiteSpace: "nowrap" }}>
        <span style={label(22, INK)}>only cuts endings, and lowercases</span>
      </Ink>

      {/* The fix as code, under the figure, where Fig. 1 left the bug. */}
      <Ink at={neededAt} dur={16} style={{ left: X0, top: callTop + (chipH - CALL_SIZE * 1.3) / 2 }}>
        <div style={{ ...callFace, display: "flex" }}>
          <span>{callHead}</span>
          <Mark at={neededAt + 10} out={tagFirstAt + 4}>
            &quot;{fix.pos}&quot;
          </Mark>
          <span>)</span>
        </div>
      </Ink>
      <Arrow from={[callArrowX, callTop + chipH / 2]} to={[callResultX - 18, callTop + chipH / 2]} at={neededAt + 8} dur={10} />
      <Chip text={fix.lemma} x={callResultX} y={callTop} at={neededAt + 14} size={SIZE} />

      {/* Fig. 5: the lesson's to_wordnet_pos, as a legend. */}
      <FigLabel n="5" title="First letter to WordNet" at={fourAt} x={LEGEND_X} y={y(FIG_Y)} />
      {MAPPING.map((m, k) => {
        const top = y(LEGEND_Y + k * LEGEND_STEP);
        const at = legendAt[m.letter];
        const mid = top + chipH / 2;
        const middle: React.CSSProperties = { top, height: chipH, display: "flex", alignItems: "center", whiteSpace: "nowrap" };
        return (
          <React.Fragment key={m.letter}>
            <Ink at={at} dur={10} style={{ left: LEGEND_X, ...middle }}>
              <span style={legendCode}>{m.letter}</span>
            </Ink>
            <Arrow from={[LEGEND_X + 84, mid]} to={[LEGEND_X + 128, mid]} at={at + 4} dur={8} />
            {/* The code as the WordNet pos row draws it, so "a" reads as a code. */}
            <Chip text={m.pos} x={LEGEND_X + 146} y={top} at={at + 8} size={SIZE} />
            <Ink at={at + 10} dur={10} style={{ left: LEGEND_X + 146 + chipWidth(m.pos, SIZE) + 14, ...middle }}>
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
