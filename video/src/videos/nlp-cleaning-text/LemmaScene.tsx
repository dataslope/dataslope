import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { LEMMAS } from "./data";
import { Chip, chipHeight, chipWidth, Fade, Headline, Kicker, Mark, type MarkSpan, Spot, Tag, type ToneStep, X0 } from "./parts";

const SIZE = 32;
const FIG_Y = 300;
const HEAD_Y = 362;
const ROW_Y = 414;
const STEP = 74;
const COL = [X0, 330, 560];
const RIGHT_X = 1010;
const CARD_Y = [370, 572];
const CARD_W = 790;
/** The open dictionary, centred in the right half where Fig. 16 will go; its
 *  box follows the art's own proportions (1536x1024 before trimming). */
const BOOK = { left: 1080, dy: 0, w: 560, h: 373 };

const head: React.CSSProperties = { fontFamily: MONO, fontSize: 21, fontWeight: 600, color: INK_SOFT, whiteSpace: "nowrap" };

/** One of Fig. 16's two answers: a heading and a line under it. */
const Card: React.FC<{ at: number; y: number; title: string; children: React.ReactNode }> = ({ at, y, title, children }) => (
  <Note at={at} x={RIGHT_X} y={y} width={CARD_W} from="right">
    <div style={{ borderTop: `2px solid ${INK}`, borderBottom: `1px solid ${HAIRLINE}`, padding: "18px 0 22px", background: PAPER }}>
      <div style={{ ...label(28, INK), fontWeight: 700 }}>{title}</div>
      <div style={{ ...body(32), color: INK, marginTop: 12 }}>{children}</div>
    </div>
  </Note>
);

/**
 * WordNet's lemmatizer on the lesson's five words: with no part of speech it
 * treats each as a noun and leaves running, ran and was (as "wa") wrong;
 * told the part of speech it returns run, run, be and good. Then the
 * lesson's rule of thumb: stem for speed, lemmatize for real words.
 */
export const LemmaScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("lemma").from;
  const dictionaryAt = n.word("lemma", "dictionary");
  const lemmatizerAt = n.word("lemma", "lemmatizer");
  const wordnetAt = n.word("lemma", "WordNet");
  const nounAt = n.word("noun", "noun");
  const defaultAt = n.word("noun", "default");
  const wrongAt: Record<string, number> = {
    running: n.word("noun", "running", { nth: 2 }),
    ran: n.word("noun", "ran", { nth: 2 }),
    was: n.word("noun", "wa"),
  };
  const partAt = n.word("pos", "part of speech");
  const rightAt: Record<string, number> = {
    running: n.word("pos", "run"),
    ran: n.word("pos", "run") + 4,
    studies: n.word("pos", "verbs"),
    was: n.word("pos", "be"),
    better: n.word("pos", "good"),
  };
  const wasAt = n.word("know", "was");
  const beAt = n.word("know", "be");
  const soAt = n.word("choose", "So");
  const stemAt = n.word("choose", "stem");
  const searchAt = n.word("choose", "search");
  const lemmatizeAt = n.word("choose", "Lemmatize");
  const realAt = n.word("choose", "real");
  const speedAt = n.word("choose", "speed");
  const machineAt = n.word("choose", "machine");
  const rootAt = n.word("choose", "root");

  // ── Geometry ──
  const chipH = chipHeight(SIZE);
  const rowTop = (i: number) => y(ROW_Y + i * STEP);
  const wordAt = LEMMAS.map((_, i) => from + 8 + i * 4);
  const defAt = LEMMAS.map((_, i) => nounAt + 2 + i * 3);
  const wasRow: MarkSpan[] = [{ at: wasAt, out: soAt }];
  /** The pos labels share one column, past the widest lemma. */
  const posX = COL[2] + Math.max(...LEMMAS.map((l) => chipWidth(l.withPos, SIZE))) + 14;

  return (
    <AbsoluteFill>
      {wordAt.map((a, i) => (
        <Sfx key={`w${i}`} name="el-tap" at={a} level={-30} />
      ))}
      <Sfx name="el-pop" at={wordnetAt} level={-30} />
      {LEMMAS.map((l) => (
        <Sfx key={l.word} name="el-tap" at={rightAt[l.word]} level={-28} />
      ))}
      <Sfx name="el-whoosh" at={stemAt - 4} level={-35} />
      <Sfx name="el-whoosh" at={lemmatizeAt - 4} level={-35} />

      <Kicker at={from - 6}>Stems and lemmas</Kicker>
      <Headline lead="A lemma is" turn="the dictionary form." at={from - 4} turnAt={dictionaryAt - 2} />
      <Spot id="nlp-cleaning-text-book" at={wordnetAt} out={soAt} left={BOOK.left} top={y(340) + BOOK.dy} width={BOOK.w} height={BOOK.h} />

      {/* Fig. 15: the lemmatizer with no part of speech, then with one. */}
      <FigLabel n="15" title="WordNet lemmas, with and without a part of speech" at={from} x={X0} y={y(FIG_Y)} />
      <Ink at={from + 6} dur={12} style={{ left: COL[0], top: y(HEAD_Y), whiteSpace: "nowrap" }}>
        <span style={label(21, INK_SOFT)}>word</span>
      </Ink>
      <Ink at={lemmatizerAt} dur={12} style={{ left: COL[1], top: y(HEAD_Y) }}>
        <span style={head}>lemmatize(w)</span>
      </Ink>
      <Ink at={partAt} dur={12} style={{ left: COL[2], top: y(HEAD_Y) }}>
        <span style={head}>lemmatize(w, pos)</span>
      </Ink>
      {LEMMAS.map((l, i) => {
        const top = rowTop(i);
        const wrong = wrongAt[l.word];
        const defTones: ToneStep[] = wrong !== undefined ? [{ at: wrong, tone: "bad" }] : [];
        const marks = l.word === "was" ? wasRow : [];
        const posAt = rightAt[l.word] + 2;
        return (
          <React.Fragment key={l.word}>
            <Chip text={l.word} x={COL[0]} y={top} at={wordAt[i]} size={SIZE} marks={marks} />
            <Chip text={l.default} x={COL[1]} y={top} at={Math.min(defAt[i], defaultAt + 40)} size={SIZE} tones={defTones} />
            <Chip
              text={l.withPos}
              x={COL[2]}
              y={top}
              at={rightAt[l.word]}
              size={SIZE}
              tones={[{ at: rightAt[l.word] + 4, tone: "good" }]}
              marks={l.word === "was" ? [{ at: beAt, out: soAt }] : []}
            />
            {l.word === "was" ? (
              <Tag at={wrong} x={COL[1] + chipWidth(l.default, SIZE) + 12} y={top + chipH / 2 - 13} size={20}>
                plural noun
              </Tag>
            ) : null}
            <Ink at={posAt} dur={10} style={{ left: posX, top: top + chipH / 2 - 14 }}>
              <span style={{ ...head, fontSize: 22 }}>pos=&quot;{l.pos}&quot;</span>
            </Ink>
          </React.Fragment>
        );
      })}

      {/* Fig. 16: which to reach for. */}
      <FigLabel n="16" title="Stem or lemma?" at={stemAt - 4} x={RIGHT_X} y={y(FIG_Y)} />
      <Card at={stemAt} y={y(CARD_Y[0])} title="Stem">
        <Fade at={speedAt - 4}>for speed,</Fade> <Fade at={machineAt - 4}>when only a machine sees the key</Fade>
        <div style={{ marginTop: 10 }}>
          <Fade at={searchAt - 4}>
            <span style={label(22, INK_SOFT)}>like a search index</span>
          </Fade>
        </div>
      </Card>
      <Card at={lemmatizeAt} y={y(CARD_Y[1])} title="Lemmatize">
        <Fade at={rootAt - 6}>when the root has to be a</Fade>{" "}
        <Mark at={realAt - 2}>
          <span style={{ fontStyle: "italic" }}>real word</span>
        </Mark>
        <div style={{ marginTop: 10 }}>
          <Fade at={realAt + 14}>
            <span style={label(22, INK_SOFT)}>given the part of speech</span>
          </Fade>
        </div>
      </Card>
      <Sfx name="el-pencil" at={realAt - 4} level={-36} />
    </AbsoluteFill>
  );
};
