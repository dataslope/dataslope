import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { ENGINEER, type Family, familyOf, FISH, TALL } from "./data";
import { FAMILY, flow, Headline, Kicker, Marked, numStyle, TagChip, Tile, tileH, tileW } from "./parts";

const X0 = 120;
const SIZE = 28;
const ESIZE = 24;
/** The legend of first letters, on the right. */
const LX = 1240;

/** What the lesson's table calls each tag in this sentence, as narrated. */
const GLOSS: Record<string, string> = {
  DT: "determiner",
  JJ: "adjective",
  NN: "noun",
  VBZ: "verb for he, she, it",
  NNS: "plural noun",
};

/**
 * The Penn Treebank tags on the lesson's "The tall man reads books.", what
 * each means, the first-letter shortcut, and the lesson's filter-by-tag:
 * the engineer sentence's words gliding into rows by the first letter of
 * their tags.
 */
export const PennScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("penn").from;
  const pennAt = n.word("penn", "Penn Treebank");
  const handAt = n.word("penn", "hand-tagged");
  const tallAt = n.word("tall", "tall");
  const tagAts = ["DT", "JJ", "NN", "VBZ", "NNS"].map((t) => n.word("tall", t));
  const meanAts = [
    n.word("meanings", "determiner"),
    n.word("meanings", "adjective"),
    n.word("meanings", "noun", { nth: 1 }),
    n.word("meanings", "present-tense"),
    n.word("meanings", "plural"),
  ];
  const thirtySixAt = n.word("letters", "thirty-six");
  const firstLetterAt = n.word("letters", "first letter");
  const letterAts: Record<"noun" | "verb" | "adj" | "adv", number> = {
    noun: n.word("letters", "N for"),
    verb: n.word("letters", "V for"),
    adj: n.word("letters", "J for"),
    adv: n.word("letters", "R for"),
  };
  const patternsAt = n.word("extract", "patterns");
  const tagAt = n.word("extract", "Tag");
  const keepAt = n.word("extract", "keep the tags");
  const startAt = n.word("extract", "start with N");
  const nounsAt = n.word("nouns", "nouns");

  const jAt = n.word("adjectives", "J gives");
  const vAt = n.word("adjectives", "V gives");
  const rAt = n.word("adjectives", "R");

  // The tags Fig. 8 just gave "fish", held over into this scene's opening.
  const fishTags = FISH.map((f) => f.tagged.find(([w]) => w.toLowerCase() === "fish")?.[1] ?? "");

  // ── Fig. 9: the tall man ──
  const tallWords = TALL.map(([w]) => w);
  const tallTiles = flow(tallWords, X0, y(322), 1180, SIZE, 60, 0);
  const chipY = y(322) + tileH(SIZE) + 12;

  // ── Fig. 10: the engineer, and the rows it sorts into ──
  const eWords = ENGINEER.tagged.map(([w]) => w);
  const eTiles = flow(eWords, X0, y(546), 1800, ESIZE, 10, 0);
  const eChipY = y(546) + tileH(ESIZE) + 8;
  // The rows stand in the legend's order (N, V, J, R); each fills as it is named.
  const ROW_ORDER: { fam: Family; prefix: string; name: string }[] = [
    { fam: "noun", prefix: "N…", name: "nouns" },
    { fam: "verb", prefix: "V…", name: "verbs" },
    { fam: "adj", prefix: "J…", name: "adjectives" },
    { fam: "adv", prefix: "R…", name: "adverbs" },
  ];
  const rowLabelAt = [startAt - 4, vAt - 4, jAt - 4, rAt - 4];
  const sortedY = (k: number) => y(668) + k * 56;
  const rowX = X0 + 250;
  // Each word of the sentence arrives as it is read out.
  const wordAt = eWords.map((w, i) =>
    i === 0 ? tagAt - 2 : w === "." ? n.word("extract", eWords[i - 1]) + 6 : n.word("extract", w) - 4,
  );
  // Where each sorted word lands: in its row, after the ones before it.
  const landing = eWords.map((w, i) => {
    const fam = familyOf(ENGINEER.tagged[i][1]);
    const k = ROW_ORDER.findIndex((r) => r.fam === fam);
    if (k < 0) return null;
    const before = eWords.slice(0, i).filter((_, j) => familyOf(ENGINEER.tagged[j][1]) === fam);
    const x = rowX + before.reduce((s, b) => s + tileW(b, ESIZE) + 10, 0);
    // Each word leaves the sentence as the narration names it.
    const beat = fam === "noun" ? "nouns" : "adjectives";
    return { k, x, y: sortedY(k), at: n.word(beat, w) - 6 };
  });

  return (
    <AbsoluteFill>
      {/* ── Sound: the tags dropping, the legend, each row filling ── */}
      <Sfx name="el-tap" at={tagAts[0] - 2} level={-29} />
      <Sfx name="el-tap" at={tagAts[4] - 2} level={-29} />
      <Sfx name="el-pencil" at={firstLetterAt - 2} level={-35} />
      {landing.map((l, i) => (l ? <Sfx key={i} name="el-tap" at={l.at + 16} level={-31} /> : null))}

      <Kicker at={from - 10}>Tagging words</Kicker>
      <Headline at={pennAt - 4} second={handAt - 2} italic="hand-tagged text.">
        The Penn Treebank:
      </Headline>

      {/* The two tags just read, held over while their source is named. */}
      {fishTags.map((tag, k) => (
        <React.Fragment key={tag}>
          <Tile text="fish" x={LX} y={y(300) + k * 70} at={from - 4 + k * 4} size={26} out={thirtySixAt - 8} />
          <TagChip tag={tag} family={familyOf(tag)} cx={LX + 160} y={y(300) + k * 70 + 4} at={from + k * 4} size={22} out={thirtySixAt - 8} />
          <Note at={from + 4 + k * 4} out={thirtySixAt - 8} x={LX + 220} y={y(300) + k * 70 + 8}>
            <div style={{ ...label(22, FAMILY[familyOf(tag)].ink), fontWeight: 600, whiteSpace: "nowrap" }}>{FAMILY[familyOf(tag)].name}</div>
          </Note>
        </React.Fragment>
      ))}

      <FigLabel n="9" title="A sentence, tagged" at={from - 2} x={X0} y={y(266)} />
      {tallTiles.map((t, i) => (
        <Tile key={i} text={t.text} x={t.x} y={t.y} size={SIZE} at={tallAt - 6 + i * 4} />
      ))}
      {TALL.map(([, tag], i) => {
        const t = tallTiles[i];
        const named = i < tagAts.length;
        return (
          <TagChip
            key={i}
            tag={tag}
            family={familyOf(tag)}
            cx={t.x + t.w / 2}
            y={chipY}
            at={named ? tagAts[i] - 2 : tagAts[4] + 6}
            size={22}
            gloss={GLOSS[tag]}
            glossAt={named ? meanAts[i] - 2 : undefined}
          />
        );
      })}

      {/* The first-letter shortcut. */}
      <Note at={thirtySixAt - 2} x={LX} y={y(266)}>
        <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
          about <span style={numStyle(22, INK)}>36</span> tags in all
        </div>
      </Note>
      <Ink at={firstLetterAt - 2} dur={14} style={{ left: LX, top: y(266) + 40, whiteSpace: "nowrap" }}>
        <span style={{ ...body(30, true), color: INK }}>The first letter does the work:</span>
      </Ink>
      {(["noun", "verb", "adj", "adv"] as const).map((fam, k) => (
        <Note key={fam} at={letterAts[fam] - 2} x={LX} y={y(266) + 96 + k * 46}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, whiteSpace: "nowrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 52,
                height: 34,
                borderRadius: 6,
                border: `2px solid ${FAMILY[fam].fill}`,
                background: FAMILY[fam].tint,
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 22,
                color: FAMILY[fam].ink,
              }}
            >
              {fam === "noun" ? "N…" : fam === "verb" ? "V…" : fam === "adj" ? "J…" : "R…"}
            </span>
            <span style={{ ...label(24, FAMILY[fam].ink), fontWeight: 600 }}>{FAMILY[fam].name}s</span>
          </div>
        </Note>
      ))}

      {/* Fig. 10: filter by tag. */}
      <FigLabel n="10" title="Sort the words by their tag's first letter" at={patternsAt - 4} x={X0} y={y(490)} />
      {eTiles.map((t, i) => {
        const land = landing[i];
        return (
          <React.Fragment key={i}>
            <Tile text={t.text} x={t.x} y={t.y} size={ESIZE} at={wordAt[i]} dim={land ? land.at : undefined} />
          </React.Fragment>
        );
      })}
      {ENGINEER.tagged.map(([, tag], i) => {
        const t = eTiles[i];
        return <TagChip key={i} tag={tag} family={familyOf(tag)} cx={t.x + t.w / 2} y={eChipY} at={keepAt - 2 + i * 2} size={20} />;
      })}
      {/* The sorted copies, drawn last so a word in flight passes over the
          chips and rows rather than under them. */}
      {eTiles.map((t, i) => {
        const land = landing[i];
        if (!land) return null;
        const fam = familyOf(ENGINEER.tagged[i][1]);
        return (
          <Tile
            key={`fly${i}`}
            text={t.text}
            x={t.x}
            y={t.y}
            size={ESIZE}
            at={land.at}
            tint={FAMILY[fam].tint}
            border={FAMILY[fam].fill}
            to={{ x: land.x, y: land.y, at: land.at, dur: 20 }}
          />
        );
      })}
      {ROW_ORDER.map((r, k) => (
        <Note key={r.fam} at={rowLabelAt[k]} x={X0} y={sortedY(k)}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, height: tileH(ESIZE), whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: FAMILY[r.fam].ink }}>{r.prefix}</span>
            <span style={{ ...label(24, INK), fontWeight: 600 }}>
              {k === 0 ? <Marked at={nounsAt - 2}>{r.name}</Marked> : r.name}
            </span>
          </div>
        </Note>
      ))}
    </AbsoluteFill>
  );
};
