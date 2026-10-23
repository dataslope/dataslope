import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, fmt, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EMMA } from "./data";
import { FADED, HBar, Headline, Kicker, Marked, Mono, numStyle, TagChip } from "./parts";

const PANELS = [120, 1000];
const WORD_W = 120;
const BAR_X = (k: number) => PANELS[k] + WORD_W + 20;
const SCALE = 520;
const ROWS_Y = 400;
const ROW_STEP = 64;

/**
 * Raw counts are dominated by stopwords: Emma's six most common words with
 * everything counted, then with NLTK's English stopwords removed first, on
 * one scale. The heroine's name comes second.
 */
export const StopScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("top").from;
  const sixAt = n.word("top", "six");
  const wordAts = [
    n.word("top", "to"),
    n.word("top", "the"),
    n.word("top", "and", { nth: 1 }),
    n.word("top", "of"),
    n.word("top", "I"),
    n.word("top", "a"),
  ];
  const notOneAt = n.word("nothing", "Not one");
  const aboutAt = n.word("nothing", "about");
  const dropAt = n.word("without", "Drop");
  const againAt = n.word("without", "count again");
  const rightAts = ["Mister", "Emma", "could", "would", "Missus", "Miss"].map((w) => n.word("without", w));
  const heroineAt = n.word("heroine", "heroine's");
  const secondAt = n.word("heroine", "second");
  const rawAt = n.word("commonplace", "Raw");
  const commonplaceAt = n.word("commonplace", "commonplace");
  const filterAt = n.word("commonplace", "Filter");
  const topicAt = n.word("commonplace", "topic");
  const spellingAt = n.word("tag-in", "spelling");
  const jobAt = n.word("tag-in", "job");

  const max = EMMA.withStop[0][1];
  const rowY = (i: number) => y(ROWS_Y) + i * h(ROW_STEP);
  const rowH = h(44);
  const panels = [
    { rows: EMMA.withStop, title: "every word", ats: wordAts, titleAt: sixAt - 4, dim: notOneAt },
    { rows: EMMA.withoutStop, title: "stopwords removed first", ats: rightAts, titleAt: dropAt - 4, dim: undefined },
  ];

  return (
    <AbsoluteFill>
      {/* ── Sound: each panel's first and last bar, the heroine, the missing tags ── */}
      <Sfx name="el-tap" at={wordAts[0] - 2} level={-28} />
      <Sfx name="el-tap" at={wordAts[5] - 2} level={-29} />
      <Sfx name="el-tap" at={rightAts[0] - 2} level={-28} />
      <Sfx name="el-tap" at={rightAts[5] - 2} level={-29} />
      <Sfx name="el-pencil" at={secondAt - 4} level={-34} />
      <Sfx name="el-pop" at={jobAt - 2} level={-31} />

      <Kicker at={from - 10}>Counting words</Kicker>
      <Headline at={from - 4} out={rawAt - 10}>
        The top of the list
      </Headline>
      <Headline at={rawAt - 4} second={commonplaceAt - 4} italic="rewards the commonplace.">
        Raw frequency
      </Headline>

      <FigLabel n="7" title="Emma's six most common words, counted two ways" at={sixAt - 6} x={PANELS[0]} y={y(286)} />

      {panels.map((p, k) => (
        <React.Fragment key={p.title}>
          <Ink at={p.titleAt} dur={14} style={{ left: BAR_X(k), top: y(340), whiteSpace: "nowrap" }}>
            <span style={{ ...label(24, INK), fontWeight: 600 }}>{p.title}</span>
          </Ink>
          {p.rows.map(([w, c], i) => {
            const at = p.ats[i] - 2;
            const isEmma = k === 1 && w === "emma";
            const dimmed = p.dim === undefined ? 0 : ease(frame, p.dim + i * 2, 12);
            return (
              <React.Fragment key={w}>
                <Ink
                  at={at}
                  dur={12}
                  style={{
                    left: PANELS[k],
                    width: WORD_W,
                    top: rowY(i),
                    height: rowH,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  <span style={{ opacity: 1 - dimmed * 0.55 }}>
                    <Mono size={26} color={isEmma && frame >= heroineAt - 2 ? ACCENT_INK : INK} weight={isEmma ? 600 : 500}>
                      {isEmma ? <Marked at={heroineAt - 2}>{w}</Marked> : k === 1 ? <Marked at={spellingAt - 2 + i * 2}>{w}</Marked> : w}
                    </Mono>
                  </span>
                </Ink>
                <HBar x={BAR_X(k)} y={rowY(i) + rowH * 0.18} w={(c / max) * SCALE} h={rowH * 0.64} at={at} color={dimmed > 0 ? FADED : undefined} />
                <Note at={at + 6} x={BAR_X(k) + (c / max) * SCALE + 12} y={rowY(i)}>
                  <div style={{ height: rowH, display: "flex", alignItems: "center", ...numStyle(22, dimmed > 0.5 ? INK_SOFT : INK) }}>{fmt(c, 0)}</div>
                </Note>
                {k === 1 ? (
                  <TagChip tag="?" family="other" cx={PANELS[k] + WORD_W - w.length * 0.6 * 26 - 40} y={rowY(i) + rowH * 0.12} at={jobAt - 2 + i * 3} size={20} />
                ) : null}
              </React.Fragment>
            );
          })}
        </React.Fragment>
      ))}

      <Note at={aboutAt - 2} x={PANELS[0]} y={rowY(6) + 10}>
        <div style={{ ...body(30, true), color: INK_SOFT, whiteSpace: "nowrap" }}>Not one says what the book is about.</div>
      </Note>
      <Note at={secondAt - 4} x={BAR_X(1) + 220} y={rowY(1)}>
        <div style={{ height: rowH, display: "flex", alignItems: "center", ...body(30, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
          the heroine, second
        </div>
      </Note>
      <Note at={filterAt - 2} x={BAR_X(1)} y={rowY(6) + 10}>
        <div style={{ ...body(30, true), color: INK, whiteSpace: "nowrap" }}>
          Filter first, and the <Marked at={topicAt - 2}>topic</Marked> comes through.
        </div>
      </Note>
      <Note at={againAt} x={BAR_X(1)} y={y(340) + 38}>
        <div style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>same scale as the left</div>
      </Note>
    </AbsoluteFill>
  );
};
