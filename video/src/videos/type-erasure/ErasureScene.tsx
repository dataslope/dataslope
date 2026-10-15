import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline, INK_SOFT, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ILLUSTRATIONS, USER_JS, USER_RUN, USER_TS, VIDEO } from "./data";
import { Arrow, Fig, FileTab, Listing, listingHeight, lineTop, Mono, Terminal } from "./kit";

const LEFT = 110;
const TS_W = 790;
const JS_X = 1040;
const JS_W = 770;
const SIZE = 25;
/** Layout rows, before `y()`. */
const FIG_Y = 310;
const TAB_Y = 360;
const LIST_Y = 406;

/**
 * Hook to "plain JavaScript": the same file before and after tsc, with every
 * piece of type syntax struck out in the source as the narration names it.
 * Both listings, and node's output, are the real files (data.ts).
 */
export const ErasureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  const open = Math.max(0, n.beat("hook").from - 13);
  const deletesAt = n.word("hook", "deletes");
  const fileAt = n.word("file", "small TypeScript file");
  const interfaceAt = n.word("file", "interface");
  const genericAt = n.word("file", "generic function");
  const annotationsAt = n.word("file", "type annotations");
  const compileFrom = n.beat("compile").from;
  const compilerAt = n.word("compile", "compiler");
  const jsAt = n.word("compile", "JavaScript");
  const goneInterfaceAt = n.word("gone", "interface");
  const goneGenericAt = n.word("gone", "generic");
  const goneEveryAt = n.word("gone", "every annotation");
  const plainAt = n.word("gone", "plain JavaScript");

  const top = y(LIST_Y);
  const eraser = pop(frame, deletesAt - 6, fps, 15);

  // Which line holds what: the interface, the generic function, the two
  // annotated constants. Read off the marks, so an edited example re-points.
  const erasedLines = USER_TS.flatMap((l, i) => (l.includes("«") ? [i] : []));
  const interfaceLine = USER_TS.findIndex((l) => l.includes("interface"));
  const genericLine = USER_TS.findIndex((l) => l.includes("<T>"));
  const annotated = erasedLines.filter((i) => i !== interfaceLine && i !== genericLine);
  const strikeAt = (i: number, k: number) =>
    i === interfaceLine
      ? goneInterfaceAt
      : i === genericLine
        ? goneGenericAt + k * 4
        : goneEveryAt + annotated.indexOf(i) * 5;

  const tsAt = USER_TS.map((_, i) => fileAt + 2 + i * 3);
  const jsLineAt = USER_JS.map((_, i) => jsAt + i * 4);
  const arrowY = lineTop(top, 2, SIZE) + 23;
  const runTop = top + listingHeight(USER_JS.length, SIZE) + 36;

  return (
    <AbsoluteFill>
      <Ink at={open} dur={14} style={{ left: LEFT + 4, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>What TypeScript ships</span>
      </Ink>
      <Ink
        at={open + 2}
        dur={22}
        style={{ left: LEFT - 2, top: y(150), ...headline(88), whiteSpace: "nowrap", display: "flex", gap: "0.24em" }}
      >
        <span>Types are checked,</span>
        <span style={{ position: "relative", ...headline(88, true), opacity: ease(frame, deletesAt - 6, 12) }}>
          then erased.
          {/* Sized in em and to the words, so it underlines them in any face. */}
          <svg
            viewBox="0 0 400 30"
            style={{ position: "absolute", left: -4, top: "1.0em", width: "calc(100% + 8px)", height: "auto", overflow: "visible" }}
          >
            <path
              d="M4,16 C90,8 220,6 394,13"
              fill="none"
              stroke={ACCENT}
              strokeWidth={5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${ease(frame, deletesAt + 2, 14)} 1`}
              opacity={frame >= deletesAt + 2 ? 1 : 0}
            />
          </svg>
        </span>
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="type-erasure-eraser"
          style={{
            position: "absolute",
            left: 1540,
            top: y(84),
            width: 280,
            height: 196,
            opacity: eraser,
            transformOrigin: "50% 60%",
            transform: `translateY(${bob(frame, 4, 100) + (1 - eraser) * 26}px) rotate(${(1 - eraser) * -14}deg)`,
          }}
        />
      ) : null}

      <Fig n="1" at={fileAt - 8} x={LEFT} y={y(FIG_Y)}>
        The same file, before and after <Mono>tsc</Mono>
      </Fig>
      <FileTab at={fileAt - 4} x={LEFT} y={y(TAB_Y)} name="user.ts">
        what you write
      </FileTab>
      <Listing
        lines={USER_TS}
        x={LEFT}
        top={top}
        width={TS_W}
        size={SIZE}
        at={fileAt - 4}
        lineAt={tsAt}
        marks={[
          { line: interfaceLine, at: interfaceAt - 2, out: compileFrom },
          { line: genericLine, at: genericAt - 2, out: compileFrom },
          ...annotated.map((line, k) => ({ line, at: annotationsAt - 2 + k * 4, out: compileFrom })),
        ]}
        erase={strikeAt}
      />

      <Arrow points={[[LEFT + TS_W + 22, arrowY], [JS_X - 22, arrowY]]} at={compilerAt - 2} dur={12} />
      <Ink at={compilerAt} dur={12} style={{ left: LEFT + TS_W + 22, width: JS_X - LEFT - TS_W - 44, top: arrowY - 48, textAlign: "center" }}>
        <span style={{ fontSize: 26, color: INK_SOFT }}>
          <Mono weight={700}>tsc</Mono>
        </span>
      </Ink>

      <FileTab at={jsAt - 6} x={JS_X} y={y(TAB_Y)} name="user.js">
        what tsc writes, and what runs
      </FileTab>
      <Listing lines={USER_JS} x={JS_X} top={top} width={JS_W} size={SIZE} at={jsAt - 6} lineAt={jsLineAt} />

      <Terminal
        x={JS_X}
        top={runTop}
        width={JS_W}
        at={plainAt - 6}
        rows={[
          { kind: "cmd", text: "node user.js", at: plainAt - 4 },
          { kind: "out", text: USER_RUN, at: plainAt + 6 },
        ]}
      />
    </AbsoluteFill>
  );
};
