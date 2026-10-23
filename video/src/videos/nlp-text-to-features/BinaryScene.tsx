import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BOW } from "./data";
import { Chip, ChipRow, FIG_Y, Headline, INK, INK_SOFT, Kicker, Mark, NumCell, X0 } from "./parts";

const SPAM_Y = 344;
const HEAD_ROW_Y = 470;
const COUNT_Y = 518;
const BINARY_Y = 648;
const ROW_H = 96;
const COL_X0 = 440;
const COL_W = 220;
const NOTE_Y = 780;

const SPAM = BOW.spam;
const FREE = SPAM.vocab.indexOf("free");

/**
 * Counts against presence: the lesson's spam message as a count vector and as
 * a binary vector over its five-word vocabulary. "free" is a 3 in one and a 1
 * in the other.
 */
export const BinaryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const start = n.beat("binary").from;
  const whetherAt = n.word("binary", "whether");
  const spamAt = n.word("binary-spam", "This spam");
  const freeAt = n.word("binary-spam", "free");
  const threeAt = n.word("binary-spam", "three times");
  const countAt = n.word("vectors", "count vector");
  const keepsAt = n.word("vectors", "keeps the three");
  const binAt = n.word("vectors", "binary vector");
  const oneAt = n.word("vectors", "marks a one");
  const presentAt = n.word("vectors", "present");

  const rows = [
    { name: "count vector", values: SPAM.count, at: countAt, top: COUNT_Y, markAt: keepsAt },
    { name: "binary vector", values: SPAM.binary, at: binAt, top: BINARY_Y, markAt: oneAt },
  ];
  const frees = SPAM.tokens.map((w, k) => (w === "free" ? k : -1)).filter((k) => k >= 0);
  const max = Math.max(...SPAM.count);

  return (
    <AbsoluteFill>
      {/* ── Sound: the message, each "free", each vector ── */}
      <Sfx name="el-pencil" at={spamAt - 4} level={-36} />
      {frees.map((_, i) => (
        <Sfx key={i} name="el-tap" at={threeAt - 4 + i * 4} level={-30} />
      ))}
      <Sfx name="el-tap" at={countAt - 2} level={-28} />
      <Sfx name="el-tap" at={binAt - 2} level={-28} />

      <Kicker at={start - 10}>Bag of words</Kicker>
      <Headline at={start - 4} second={whetherAt - 4} italic="or just whether?">
        How often,
      </Headline>
      <FigLabel n="8" title="Counts against presence, from the lesson" at={start - 2} x={X0} y={y(FIG_Y)} />

      <Ink at={spamAt - 4} dur={14} style={{ left: X0, top: y(SPAM_Y) + 12, ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>
        The spam
      </Ink>
      <ChipRow x={COL_X0} y={y(SPAM_Y)}>
        {SPAM.tokens.map((w, k) => {
          const i = frees.indexOf(k);
          return <Chip key={k} text={w} size={34} at={spamAt + k * 2} mark={i >= 0 ? (i === 0 ? freeAt : threeAt - 4 + i * 4) : undefined} />;
        })}
      </ChipRow>

      <Note at={whetherAt + 4} x={X0} y={y(HEAD_ROW_Y) + 4}>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>the lesson’s vocabulary</span>
      </Note>
      {SPAM.vocab.map((w, j) => (
        <Ink
          key={w}
          at={whetherAt + j * 2}
          dur={12}
          style={{ left: COL_X0 + j * COL_W, width: COL_W, top: y(HEAD_ROW_Y), textAlign: "center", ...label(26, INK), whiteSpace: "nowrap" }}
        >
          {w}
        </Ink>
      ))}

      {rows.map((r) => {
        const mark = ease(frame, r.markAt - 2, 12);
        return (
          <React.Fragment key={r.name}>
            <Ink at={r.at - 4} dur={14} style={{ left: X0, top: y(r.top) + h(ROW_H) / 2 - 18, ...label(26, INK), whiteSpace: "nowrap" }}>
              {r.name}
            </Ink>
            {r.values.map((v, j) => (
              <NumCell
                key={j}
                value={v}
                at={r.at + j * 2}
                x={COL_X0 + j * COL_W + 6}
                y={y(r.top)}
                w={COL_W - 12}
                h={h(ROW_H)}
                heat={v / max}
                size={44}
                faint={v === 0}
                outline={j === FREE && mark > 0.5 ? BLUE_INK : undefined}
              />
            ))}
          </React.Fragment>
        );
      })}
      <Note at={oneAt + 4} x={COL_X0} y={y(NOTE_Y)}>
        <span style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap" }}>
          1 for <Mark at={presentAt - 2}>present</Mark>, 0 for absent
        </span>
      </Note>
    </AbsoluteFill>
  );
};
