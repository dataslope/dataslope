import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, HAIRLINE, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { FIG1 } from "./data";
import { ADDR, ADDR_INK, Mono, VALUE_INK } from "./kit";

const LEFT = 120;
const RIGHT = 1800;
/** Rows, before `y()`. */
const ROWS = [366, 566] as const;
const FOOT = 780;

/**
 * The rule: `&` asks where a variable lives, and `*` goes there. Each row
 * points back at what it did in Fig. 1.
 */
export const RuleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const start = n.beat("rule").from;
  const allAt = n.word("rule", "all");
  const ampAt = n.word("rule", "Ampersand asks");
  const livesAt = n.word("rule", "lives");
  const starAt = n.word("rule", "star goes");
  const thereAt = n.word("rule", "there");

  const rows = [
    {
      code: "&n",
      text: "asks where n lives.",
      at: ampAt,
      backAt: livesAt + 4,
      back: (
        <>
          In Fig. 1, <span style={{ color: ADDR_INK, fontWeight: 600 }}>{FIG1.n}</span>
        </>
      ),
    },
    {
      code: "*p",
      text: "goes there.",
      at: starAt,
      backAt: thereAt + 4,
      back: (
        <>
          In Fig. 1, n&apos;s box: read <span style={{ color: VALUE_INK, fontWeight: 600 }}>42</span>, then wrote{" "}
          <span style={{ color: VALUE_INK, fontWeight: 600 }}>100</span>
        </>
      ),
    },
  ] as const;

  return (
    <AbsoluteFill>
      <Ink at={start - 8} dur={14} style={{ left: LEFT + 4, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>Pointers in C</span>
      </Ink>
      <Ink
        at={start - 6}
        dur={22}
        style={{ left: LEFT - 2, top: y(150), ...headline(88), whiteSpace: "nowrap", display: "flex", gap: "0.24em" }}
      >
        <span>That is all</span>
        <span style={{ ...headline(88, true), opacity: ease(frame, allAt, 12) }}>a pointer is.</span>
      </Ink>

      {rows.map((r, i) => (
        <React.Fragment key={r.code}>
          <div
            style={{
              position: "absolute",
              left: LEFT,
              top: y(ROWS[i]) - 34,
              width: (RIGHT - LEFT) * ease(frame, r.at - 10, 18),
              height: 1,
              background: i === 0 ? INK : HAIRLINE,
            }}
          />
          <Ink
            at={r.at - 4}
            dur={18}
            style={{
              left: LEFT,
              top: y(ROWS[i]),
              display: "flex",
              alignItems: "baseline",
              gap: "0.5em",
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 104,
                fontWeight: 700,
                color: ADDR_INK,
                fontVariantLigatures: "none",
                lineHeight: 1.1,
                minWidth: "1.6em",
              }}
            >
              {r.code}
            </span>
            <span style={{ ...body(58, true), color: INK }}>{r.text}</span>
          </Ink>
          <Note at={r.backAt} x={RIGHT} y={y(ROWS[i]) + 50} align="right" from="right">
            <span style={note(21, INK_SOFT)}>{r.back}</span>
          </Note>
        </React.Fragment>
      ))}

      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: y(FOOT) - 30,
          width: 64,
          height: 3,
          background: ADDR,
          opacity: ease(frame, thereAt + 10, 10),
        }}
      />
      <Note at={thereAt + 12} x={LEFT} y={y(FOOT)} from="up" width={1500}>
        <span style={note(21, INK_SOFT)}>
          In a declaration the star only names the type: <Mono color={INK}>int *p</Mono> says <Mono color={INK}>p</Mono>{" "}
          is a pointer to an int. In an expression, <Mono color={INK}>*p</Mono> follows it.
        </span>
      </Note>
    </AbsoluteFill>
  );
};
