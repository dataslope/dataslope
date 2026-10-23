import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { familyOf, FISH } from "./data";
import { FAMILY, flow, Headline, Kicker, Marked, Spot, TagChip, Tile, tileH } from "./parts";

const X0 = 120;
const SIZE = 30;
const ROWS = [380, 560];

/**
 * Part 2 opens: the lesson's "fish" twice, a noun and then a verb; the same
 * spelling a counter cannot tell apart; what part-of-speech tagging is; and
 * the tagger's own answer for each, NN and VBP.
 */
export const FishScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("fish").from;
  const caughtAt = n.word("fish", "caught");
  const nounAt = n.word("fish", "noun");
  const weAt = n.word("fish", "we");
  const verbAt = n.word("fish", "verb");
  const spellingAt = n.word("jobs", "spelling");
  const jobsAt = n.word("jobs", "jobs");
  const counterAt = n.word("jobs", "counter");
  const taggingAt = n.word("tagging", "Part-of-speech");
  const jobAt = n.word("tagging", "job");
  const aroundAt = n.word("tagging", "around");
  const learnedAt = n.word("tagger", "learned");
  const handAt = n.word("tagger", "hand");
  const nnAt = n.word("tagger", "NN");
  const vbpAt = n.word("tagger", "VBP");

  const rows = FISH.map((s, k) => {
    const words = s.tagged.map(([w]) => w);
    const placed = flow(words, X0, y(ROWS[k]), 1180, SIZE, 12, 80);
    const fish = words.findIndex((w) => w.toLowerCase() === "fish");
    return { placed, fish, tag: s.tagged[fish][1], at: k === 0 ? caughtAt - 8 : weAt - 4 };
  });
  // The neighbours the tagger reads: the words either side of each fish.
  const near = (k: number, i: number) =>
    /\w/.test(rows[k].placed[i].text) && (Math.abs(i - rows[k].fish) === 1 || (k === 0 && i === rows[k].fish - 2));

  return (
    <AbsoluteFill>
      {/* ── Sound: each sentence, the two tags ── */}
      <Sfx name="el-whoosh" at={rows[0].at} level={-35} />
      <Sfx name="el-whoosh" at={rows[1].at} level={-35} />
      <Sfx name="el-pop" at={nnAt - 2} level={-29} />
      <Sfx name="el-pop" at={vbpAt - 2} level={-29} />

      <Kicker at={from - 10}>Tagging words</Kicker>
      <Headline at={spellingAt - 4} second={jobsAt - 2} italic="two jobs.">
        Same spelling,
      </Headline>
      <Spot id="nlp-counting-words-fish" at={from + 6} left={1290} top={y(300)} width={470} height={446} />

      <FigLabel n="8" title="One spelling, two tags" at={from - 2} x={X0} y={y(300)} />

      {rows.map((r, k) =>
        r.placed.map((t, i) => (
          <Tile
            key={`${k}-${i}`}
            text={t.text}
            x={t.x}
            y={t.y}
            size={SIZE}
            at={r.at + i * 3}
            marks={[
              ...(i === r.fish ? [{ at: (k === 0 ? nounAt : verbAt) - 6 }] : []),
              ...(near(k, i) ? [{ at: aroundAt - 2 + i * 2, color: `color-mix(in srgb, ${INK_SOFT} 16%, transparent)` }] : []),
            ]}
            border={i === r.fish ? INK : undefined}
          />
        )),
      )}

      {/* Plain words for the jobs first, then the tagger's own tags. */}
      {rows.map((r, k) => {
        const t = r.placed[r.fish];
        const cx = t.x + t.w / 2;
        const top = t.y + tileH(SIZE) + 14;
        const fam = familyOf(r.tag);
        return (
          <React.Fragment key={k}>
            <Note at={(k === 0 ? nounAt : verbAt) - 2} out={(k === 0 ? nnAt : vbpAt) - 6} x={cx - 60} y={top + 4} width={120} from="up">
              <div style={{ ...label(24, INK), fontWeight: 600, textAlign: "center" }}>{k === 0 ? "a noun" : "a verb"}</div>
            </Note>
            <TagChip tag={r.tag} family={fam} cx={cx} y={top} at={(k === 0 ? nnAt : vbpAt) - 2} size={24} gloss={FAMILY[fam].name} glossAt={(k === 0 ? nnAt : vbpAt) + 6} glossSize={22} />
          </React.Fragment>
        );
      })}

      <Note at={counterAt - 2} x={X0} y={y(ROWS[1]) + 170}>
        <div style={{ ...body(30, true), color: INK_SOFT, whiteSpace: "nowrap" }}>To a counter, both are just “fish”.</div>
      </Note>
      <Note at={taggingAt - 2} x={X0} y={y(ROWS[1]) + 230}>
        <div style={{ ...body(32), color: INK, whiteSpace: "nowrap" }}>
          <span style={{ fontWeight: 600 }}>Part-of-speech tagging:</span> each word&apos;s <Marked at={jobAt - 2}>job</Marked>, judged
          from the words around it.
        </div>
      </Note>
      <Note at={learnedAt - 2} x={X0} y={y(ROWS[1]) + 288}>
        <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
          NLTK&apos;s tagger learned from text people <Marked at={handAt - 2}>tagged by hand</Marked>
        </div>
      </Note>
    </AbsoluteFill>
  );
};
