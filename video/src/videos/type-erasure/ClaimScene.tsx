import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Leader, Note } from "../../editorial/ui";
import {
  CRASH_AT,
  CRASH_CLAIM,
  CRASH_NULL,
  CRASH_PARSE,
  CRASH_RUN,
  CRASH_TS,
  ILLUSTRATIONS,
  JSON_PARSE_RETURNS,
  tscCommand,
  VIDEO,
} from "./data";
import { ADVANCE, codeLeft, Fig, FileTab, Listing, listingGeometry, listingHeight, lineTop, Mono, OK_INK, Terminal } from "./kit";

const LEFT = 110;
const LIST_W = 940;
const NOTE_X = 1110;
const SIZE = 28;
const TERM = 21;
/** Layout rows, before `y()`. */
const FIG_Y = 290;
const TAB_Y = 338;
const LIST_Y = 384;

/**
 * "Only a claim" and the crash: JSON.parse returns any, so annotating its
 * result as User compiles; with the name null, the compiled file throws at
 * runtime. The listing, tsc's silence and node's error are real (data.ts).
 */
export const ClaimScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  const start = n.beat("claim").from;
  const onlyAt = n.word("claim", "only a claim");
  const jsonAt = n.word("claim", "JSON dot parse");
  const anyAt = n.word("claim", "returns any");
  const whateverAt = n.word("claim", "whatever type");
  const nullAt = n.word("crash", "null");
  const compilesAt = n.word("crash", "compiles");
  const noErrorsAt = n.word("crash", "no errors");
  const runsAt = n.word("crash", "runs");
  const crashesAt = n.word("crash", "crashes");

  const top = y(LIST_Y);
  const g = listingGeometry(SIZE);
  const parcel = pop(frame, onlyAt - 4, fps, 16);
  // The leader runs from the note to the end of `JSON.parse(text)`.
  const parseMid = lineTop(top, CRASH_PARSE.line, SIZE) + g.lineH / 2;
  const parseEnd = LEFT + codeLeft(SIZE) + (CRASH_PARSE.col + CRASH_PARSE.chars) * ADVANCE * SIZE + 10;
  const termTop = top + listingHeight(CRASH_TS.length, SIZE) + 36;

  return (
    <AbsoluteFill>
      <Ink at={start - 12} dur={14} style={{ left: LEFT + 4, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>Data from outside the program</span>
      </Ink>
      <Ink
        at={start - 10}
        dur={22}
        style={{ left: LEFT - 2, top: y(150), ...headline(88), whiteSpace: "nowrap", display: "flex", gap: "0.24em" }}
      >
        <span>A type is</span>
        <span style={{ ...headline(88, true), color: ACCENT_INK, opacity: ease(frame, onlyAt - 6, 12) }}>only a claim.</span>
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="type-erasure-parcel"
          style={{
            position: "absolute",
            left: 1500,
            top: y(78),
            width: 300,
            height: 229,
            opacity: parcel,
            transform: `translateY(${bob(frame, 4, 110) + (1 - parcel) * 28}px)`,
          }}
        />
      ) : null}

      <Fig n="3" at={jsonAt - 10} x={LEFT} y={y(FIG_Y)}>
        A <Mono>User</Mono> that is not one
      </Fig>
      <FileTab at={jsonAt - 8} x={LEFT} y={y(TAB_Y)} name="crash.ts" />
      <Listing
        lines={CRASH_TS}
        x={LEFT}
        top={top}
        width={LIST_W}
        size={SIZE}
        at={jsonAt - 8}
        lineAt={CRASH_TS.map((_, i) => jsonAt - 4 + i * 3)}
        marks={[
          { ...CRASH_PARSE, at: anyAt - 2 },
          { ...CRASH_CLAIM, at: whateverAt - 2 },
          { ...CRASH_NULL, at: nullAt - 2, color: `color-mix(in srgb, ${ACCENT} 26%, transparent)` },
        ]}
        squiggles={[{ ...CRASH_AT, at: crashesAt + 4 }]}
      />

      <Leader points={[[NOTE_X - 16, parseMid], [parseEnd, parseMid]]} at={anyAt + 4} dur={12} color={INK_SOFT} />
      <Note at={anyAt} x={NOTE_X} y={parseMid - 17} width={700}>
        <div style={note(24, INK)}>
          <Mono>JSON.parse</Mono> returns{" "}
          <Mono color={ACCENT_INK} weight={700}>
            {JSON_PARSE_RETURNS}
          </Mono>
        </div>
        <div style={{ ...note(20, INK_SOFT), marginTop: 8 }}>as declared in TypeScript&apos;s lib.es5.d.ts</div>
      </Note>
      <Note at={whateverAt + 2} x={NOTE_X} y={parseMid + 74} width={700}>
        <div style={note(24, INK)}>
          and <Mono>{JSON_PARSE_RETURNS}</Mono> is accepted as a <Mono>User</Mono>, unchecked.
        </div>
      </Note>

      <Terminal
        x={LEFT}
        top={termTop}
        width={LIST_W}
        size={TERM}
        at={compilesAt - 6}
        rows={[
          {
            kind: "cmd",
            text: tscCommand("crash"),
            at: compilesAt - 4,
            tag: { text: "no output, no errors", at: noErrorsAt, color: OK_INK },
          },
          { kind: "cmd", text: "node crash.js", at: runsAt - 4 },
          { kind: "err", text: CRASH_RUN.message, at: crashesAt },
        ]}
      />
      <Note at={crashesAt + 10} x={NOTE_X} y={termTop + 18} width={700}>
        <div style={{ ...note(22, INK_SOFT) }}>
          The type said <Mono color={INK}>name</Mono> is a string. At runtime it was{" "}
          <Mono color={ACCENT_INK} weight={700}>
            null
          </Mono>
          .
        </div>
      </Note>
    </AbsoluteFill>
  );
};
