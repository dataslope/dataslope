import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { RULE_EXAMPLES, TRACES, type Trace, WA } from "./data";
import { Chip, chipHeight, Fade, Headline, Kicker, Mark, rowLayout, Tag, X0 } from "./parts";

const SIZE = 28;
const FIG_Y = 286;
const HEAD_Y = 340;
const ROW_Y = 424;
const STEP = 78;
const AS_X = 300;
const COL = [480, 760, 1040];
const RES_X = 1560;

const faint: React.CSSProperties = { ...label(22, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" };
const code: React.CSSProperties = { fontFamily: MONO, fontSize: 22, fontWeight: 600, color: INK_SOFT, fontVariantLigatures: "none" };

/** A column head: its step number in the accent, then its name. */
const Head: React.FC<{ x: number; y: number; n?: string; nAt?: number; at: number; children: React.ReactNode }> = ({
  x,
  y,
  n,
  nAt,
  at,
  children,
}) => (
  <>
    {n ? (
      <Ink at={nAt ?? at} dur={10} style={{ left: x, top: y, whiteSpace: "nowrap" }}>
        <span style={{ ...label(24, ACCENT_INK), fontWeight: 700 }}>{n}</span>
      </Ink>
    ) : null}
    <Ink at={at} dur={14} style={{ left: x + (n ? 26 : 0), top: y, whiteSpace: "nowrap" }}>
      <span style={label(24, INK)}>{children}</span>
    </Ink>
  </>
);

/** When each part of one row of Fig. 3 arrives. */
type RowCues = { word: number; as: number; list: number; rules: number; check: number; result: number };

/**
 * WordNet's lookup, in three steps, traced on six words: the part of
 * speech's list of irregular forms, or else its suffix rules; then the word
 * and every candidate checked against WordNet, the shortest survivor
 * returned, or the word unchanged. ran, was and better are on their lists;
 * was as a noun loses its s and lands on wa, Washington; running is a noun
 * as it stands; ran is no noun at all.
 */
export const LookupScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("list").from;
  const threeAt = n.word("list", "three steps");
  const listAt = n.word("list", "list");
  const listed = {
    ran: n.word("listed", "ran"),
    verb: n.word("listed", "verb"),
    run: n.word("listed", "run"),
    was: n.word("listed", "was"),
    be: n.word("listed", "be"),
    better: n.word("listed", "better"),
    adjective: n.word("listed", "adjective"),
    good: n.word("listed", "good"),
  };
  const suffixAt = n.word("rules", "suffix rules");
  const insteadAt = n.word("rules", "instead");
  const sAt = n.word("rules", "s");
  const edAt = n.word("rules", "ed");
  const ingAt = n.word("rules", "ing");
  const wordnetAt = n.word("check", "WordNet");
  const realAt = n.word("check", "real entries");
  const shortestAt = n.word("check", "shortest");
  const wa = n.beat("wa").from;
  const waNoun = n.word("wa", "noun");
  const waOff = n.word("wa", "comes off");
  const waReal = n.word("wa", "real entry");
  const washingtonAt = n.word("wa", "Washington");
  const runningAt = n.word("nothing", "Running");
  const passesAt = n.word("nothing", "passes");
  const itselfAt = n.word("nothing", "itself");
  const ranAt = n.word("nothing", "ran", { nth: 1 });
  const ranNounAt = n.word("nothing", "noun");
  const nothingAt = n.word("nothing", "nothing survives");
  const backAt = n.word("nothing", "ran back");
  const posAt = n.word("tag-in", "part of speech");

  const cues: RowCues[] = [
    { word: listed.ran, as: listed.verb + 2, list: listed.run, rules: insteadAt, check: realAt, result: shortestAt },
    { word: listed.was, as: listed.was + 4, list: listed.be, rules: insteadAt + 3, check: realAt + 5, result: shortestAt + 4 },
    {
      word: listed.better,
      as: listed.adjective,
      list: listed.good,
      rules: insteadAt + 6,
      check: realAt + 10,
      result: shortestAt + 8,
    },
    { word: wa, as: waNoun, list: waNoun + 6, rules: waOff, check: waReal, result: waReal + 12 },
    { word: runningAt, as: runningAt + 4, list: runningAt + 8, rules: runningAt + 12, check: passesAt, result: itselfAt },
    { word: ranAt, as: ranNounAt, list: ranNounAt + 4, rules: ranNounAt + 8, check: nothingAt, result: backAt },
  ];
  /** "well", the second listed form of better, inks on its own word. */
  const wellAt = n.word("listed", "well");

  // ── Geometry ──
  const chipH = chipHeight(SIZE);
  const rowTop = (i: number) => y(ROW_Y + i * STEP);
  const textTop = (i: number) => rowTop(i) + chipH / 2 - 16;
  const headY = y(HEAD_Y);

  const row = (t: Trace, i: number) => {
    const c = cues[i];
    const top = rowTop(i);
    const listForms = t.listed ?? [];
    const listLay = rowLayout(listForms, COL[0], SIZE, 12);
    const checkLay = rowLayout(
      t.checked.map((k) => k.form),
      COL[2],
      SIZE,
      12,
    );
    const guess = t.guesses[0];
    return (
      <React.Fragment key={`${t.word}-${t.pos}`}>
        <Chip text={t.word} x={X0} y={top} at={c.word} size={SIZE} />
        <Ink at={c.as} dur={10} style={{ left: AS_X, top: textTop(i), whiteSpace: "nowrap" }}>
          <span style={label(24, INK)}>
            <Mark at={posAt + i * 3} out={posAt + 60}>
              {t.posName}
            </Mark>
          </span>
        </Ink>

        {/* 1. The part of speech's list of irregular forms. */}
        {t.listed ? (
          listForms.map((f, k) => (
            <Chip
              key={f}
              text={f}
              x={listLay[k].x}
              y={top}
              at={f === "well" ? wellAt : c.list + k * 4}
              size={SIZE}
            />
          ))
        ) : (
          <Ink at={c.list} dur={10} style={{ left: COL[0], top: textTop(i) }}>
            <span style={faint}>not listed</span>
          </Ink>
        )}

        {/* 2. Suffix rules, only for a word that is not listed. */}
        {t.listed ? (
          <Ink at={c.rules} dur={10} style={{ left: COL[1], top: textTop(i) }}>
            <span style={faint}>not needed</span>
          </Ink>
        ) : guess ? (
          <>
            <Ink at={c.rules} dur={10} style={{ left: COL[1], top: textTop(i) }}>
              <span style={code}>{`-${guess.rule[0]}`}</span>
            </Ink>
            <Chip text={guess.form} x={COL[1] + 60} y={top} at={c.rules + 4} size={SIZE} />
          </>
        ) : (
          <Ink at={c.rules} dur={10} style={{ left: COL[1], top: textTop(i) }}>
            <span style={faint}>no rule fits</span>
          </Ink>
        )}

        {/* 3. The word and its candidates, checked against WordNet. */}
        {t.checked.map((k, j) => {
          const at = c.check + j * 4;
          return (
            <Chip
              key={k.form}
              text={k.form}
              x={checkLay[j].x}
              y={top}
              at={at}
              size={SIZE}
              tones={k.inWordnet ? [{ at: at + 6, tone: "good" }] : []}
              gone={k.inWordnet ? undefined : at + 8}
            />
          );
        })}

        {/* The shortest survivor, or the word itself. */}
        <Chip text={t.result} x={RES_X} y={top} at={c.result} size={SIZE} marks={[{ at: c.result, out: c.result + 30 }]} />
        {t.unchanged ? (
          <Tag at={c.result + 6} x={RES_X + 90} y={textTop(i) + 2} color={INK_SOFT} size={22}>
            unchanged
          </Tag>
        ) : null}
      </React.Fragment>
    );
  };

  const waRow = TRACES.findIndex((t) => t.word === "was" && t.pos === "n");
  const waCheck = rowLayout(
    TRACES[waRow].checked.map((k) => k.form),
    COL[2],
    SIZE,
    12,
  );
  const waIdx = TRACES[waRow].checked.findIndex((k) => k.form === "wa");

  return (
    <AbsoluteFill>
      {cues.map((c, i) => (
        <React.Fragment key={i}>
          <Sfx name="el-tap" at={c.word} level={-30} />
          <Sfx name="el-tap" at={c.result} level={-26} />
        </React.Fragment>
      ))}
      <Sfx name="el-pencil" at={listAt} level={-36} />
      <Sfx name="el-pencil" at={suffixAt} level={-36} />
      <Sfx name="el-pencil" at={wordnetAt} level={-36} />
      <Sfx name="el-pop" at={waReal} level={-30} />

      <Kicker at={from - 6}>Inside the lookup</Kicker>
      <Headline lead="One lookup," turn="three steps." at={from - 4} turnAt={threeAt - 2} />

      {/* Fig. 3: six lookups through the three steps. */}
      <FigLabel n="3" title="Six lookups, step by step" at={from} x={X0} y={y(FIG_Y)} />
      <Head x={X0} y={headY} at={from + 6}>
        word
      </Head>
      <Head x={AS_X} y={headY} at={from + 9}>
        as a
      </Head>
      <Head x={COL[0]} y={headY} n="1" nAt={threeAt} at={listAt}>
        Irregular forms
      </Head>
      <Head x={COL[1]} y={headY} n="2" nAt={threeAt + 4} at={suffixAt}>
        Suffix rules
      </Head>
      <Head x={COL[2]} y={headY} n="3" nAt={threeAt + 8} at={wordnetAt}>
        In WordNet?
      </Head>
      <Head x={RES_X} y={headY} at={shortestAt - 6}>
        result
      </Head>
      {/* Two of the rules, as the narration names them. */}
      <Ink at={sAt - 2} dur={10} style={{ left: COL[1] + 26, top: headY + 34, whiteSpace: "nowrap" }}>
        <span style={{ ...code, fontSize: 21 }}>
          noun {RULE_EXAMPLES.noun.join(" ")}
          <Fade at={edAt - 2}>
            <span>&nbsp;&nbsp;verb {RULE_EXAMPLES.verb[0]}</span>
          </Fade>
          <Fade at={ingAt - 2}>
            <span>&nbsp;{RULE_EXAMPLES.verb[1]}</span>
          </Fade>
        </span>
      </Ink>

      {TRACES.map(row)}

      <Tag at={washingtonAt} x={waCheck[waIdx].right + 16} y={rowTop(waRow) + chipH / 2 - 15} color={INK} size={22}>
        {WA.lemmas[0]}, the state
      </Tag>
    </AbsoluteFill>
  );
};
