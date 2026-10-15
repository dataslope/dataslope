import React from "react";
import { AbsoluteFill } from "remotion";
import { useNarration } from "../../narration/NarrationContext";
import { useLayout } from "../../editorial/layout";
import { ACCENT, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import {
  CHECK_ERROR,
  CHECK_ERROR_SPAN,
  CHECK_INSTANCEOF,
  CHECK_JS,
  CHECK_RUN,
  CHECK_RUN_SPAN,
  CHECK_TS,
  tscCommand,
} from "./data";
import { Fig, FileTab, Listing, listingHeight, Mono, Terminal } from "./kit";

const LEFT = 110;
const TS_W = 790;
const JS_X = 1040;
const JS_W = 770;
const RIGHT = 1810;
const SIZE = 26;
/** Layout rows, before `y()`. */
const FIG_Y = 150;
const TAB_Y = 206;
const LIST_Y = 252;

/**
 * `x instanceof User` against an interface: tsc reports TS2693, still writes
 * check.js, and node, running it, finds no User. Every line of code and
 * output is the real file or the real message (data.ts).
 */
export const InstanceofScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  const start = n.beat("instanceof").from;
  const askAt = n.word("instanceof", "instance of User");
  const flagsAt = n.word("instanceof", "flags it");
  const anywayAt = n.word("instanceof", "writes anyway");
  const noUserAt = n.word("instanceof", "no User");

  const top = y(LIST_Y);
  const termTop = top + listingHeight(CHECK_TS.length, SIZE) + 40;

  return (
    <AbsoluteFill>
      <Fig n="2" at={start - 12} x={LEFT} y={y(FIG_Y)}>
        Asking whether a value is a <Mono>User</Mono>
      </Fig>
      <FileTab at={start - 8} x={LEFT} y={y(TAB_Y)} name="check.ts" />
      <Listing
        lines={CHECK_TS}
        x={LEFT}
        top={top}
        width={TS_W}
        size={SIZE}
        at={start - 8}
        lineAt={CHECK_TS.map((_, i) => start - 4 + i * 2)}
        marks={[{ ...CHECK_INSTANCEOF, at: askAt - 2 }]}
        squiggles={[{ ...CHECK_ERROR_SPAN, at: flagsAt + 4 }]}
      />

      <FileTab at={anywayAt - 6} x={JS_X} y={y(TAB_Y)} name="check.js">
        written anyway
      </FileTab>
      <Listing
        lines={CHECK_JS}
        x={JS_X}
        top={top}
        width={JS_W}
        size={SIZE}
        at={anywayAt - 6}
        lineAt={CHECK_JS.map((_, i) => anywayAt - 2 + i * 3)}
        marks={[{ ...CHECK_RUN_SPAN, at: noUserAt - 2, color: `color-mix(in srgb, ${ACCENT} 26%, transparent)` }]}
      />
      <Note at={noUserAt + 4} x={JS_X} y={top + listingHeight(CHECK_JS.length, SIZE) + 26} width={JS_W}>
        <span style={note(21, INK_SOFT)}>
          The interface was erased, so nothing in <Mono>check.js</Mono> defines <Mono>User</Mono>.
        </span>
      </Note>

      <Terminal
        x={LEFT}
        top={termTop}
        width={RIGHT - LEFT}
        at={flagsAt - 6}
        rows={[
          { kind: "cmd", text: tscCommand("check"), at: flagsAt - 4 },
          { kind: "err", text: CHECK_ERROR.full, at: flagsAt + 4 },
          { kind: "cmd", text: "node check.js", at: noUserAt - 4 },
          { kind: "err", text: CHECK_RUN.message, at: noUserAt + 4 },
        ]}
      />
    </AbsoluteFill>
  );
};
