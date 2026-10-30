import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FILE, PIPE } from "./data";
import { Code, Drift, Headline, Kicker, lineOf, Mark, MARK_BAD, MARK_OK, OK, OK_INK, Spot, Strike, X0 } from "./parts";

/** Pixels per gigabyte: the log and the memory on one scale. */
const PX_GB = 20;
const LOG_GB = 50;
const MEM_GB = 8;
const LOG_Y = 352;
const MEM_Y = 488;
const CODE_Y = 606;
const COUNT_Y = 790;
/** Frames between one line read and the next. */
const TICK = 16;

/**
 * The opening: the page's own fifty gigabyte log beside eight gigabytes of
 * memory, drawn to one scale (its first concept check). readlines() drops the
 * whole log into memory, which it overflows; a for loop moves one line at a
 * time, over and over, beside the ant carrying one block. Then what the round
 * checks, the count (fourteen worked, four quick), and the bridge's two
 * brackets: the same stage of a pipeline as a list and as a generator.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const drawingAt = n.word("hook", "A data model is only a drawing");
  const loadsAt = n.word("hook", "until code loads it");
  const logAt = n.word("hook", "fifty gigabyte log");
  const memAt = n.word("hook", "eight gigabytes of memory");
  const wholeAt = n.word("hook-fit", "Read the whole file first");
  const fitAt = n.word("hook-fit", "it can't fit");
  const lineAt = n.word("hook-fit", "Read it one line at a time");
  const holdsAt = n.word("hook-fit", "memory only ever holds one line");
  const checksAt = n.word("plan", "That's what the Python round checks");
  const memoryAt = n.word("plan", "without running out of memory");
  const twiceAt = n.word("plan", "safe to run twice");
  const eighteenAt = n.word("plan", "Eighteen questions");
  const workedAt = n.word("plan", "fourteen worked through");
  const quickAt = n.word("plan", "then four quickly");
  const choiceAt = n.word("gen-in", "It starts with one choice");
  const listAt = n.word("gen-in", "a list");
  const genAt = n.word("gen-in", "or a generator");
  const end = n.beat("gen-in").to;

  const logW = LOG_GB * PX_GB;
  const memW = MEM_GB * PX_GB;
  const barH = h(54);
  const logTop = y(LOG_Y);
  const memTop = y(MEM_Y);

  // readlines(): the whole log drops into memory's row and overflows the box.
  const drop = ease(frame, wholeAt + 4, 18);
  const dropGone = ease(frame, lineAt - 6, 12);
  const over = ease(frame, fitAt - 4, 10);

  // The for loop: a read head steps along the log a line at a time, and each
  // line drops into memory, stays a moment, and is gone when the next lands.
  const readFrom = lineAt + 6;
  const k = Math.max(0, Math.floor((frame - readFrom) / TICK));
  const t = frame < readFrom ? -1 : (frame - readFrom - k * TICK) / TICK;
  const headX = X0 + Math.min(logW - 8, 6 + k * 9);
  const sliceW = 8;
  const fall = t < 0 ? 0 : Math.min(1, t / 0.45);
  const sliceY = logTop + (memTop - logTop) * (fall * fall * (3 - 2 * fall));
  const sliceX = headX + (X0 + memW / 2 - sliceW / 2 - headX) * fall;
  const readOn = ease(frame, readFrom - 4, 8);

  const L = PIPE.lists.lines;
  const G = PIPE.gens.lines;
  const listLine = L[lineOf(L, "rows = [")].trim();
  const genLine = G[lineOf(G, "rows = (")].trim();
  const R = FILE.readlines.lines;
  const S = FILE.stream.lines;
  const wholeLine = R[lineOf(R, "readlines()")].trim();
  const loopLine = S[lineOf(S, "for line in f")].trim();

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={logAt} level={-34} />
      <Sfx name="el-tap" at={memAt + 4} level={-32} />
      <Sfx name="el-whoosh" at={wholeAt + 4} level={-34} />
      <Sfx name="el-scratch" at={fitAt + 2} level={-32} />
      <Sfx name="el-pop" at={lineAt + 2} level={-34} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="el-tap" at={readFrom + i * TICK + 7} level={-38} />
      ))}
      <Sfx name="el-pencil" at={workedAt} level={-36} />
      <Sfx name="el-pencil" at={listAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Data engineer interview prep</Kicker>
        <Headline lead="A model is a drawing" turn="until code loads it." at={drawingAt} turnAt={loadsAt - 2} out={checksAt - 6} />
        <Headline lead="Bigger than memory." turn="Safe to run twice." at={memoryAt - 4} turnAt={twiceAt - 2} />

        {/* ── The log and the memory, one scale ── */}
        <Note at={logAt - 2} x={X0} y={logTop - h(42)}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap" }}>
            the log <span style={{ color: BLUE_INK }}>50 GB</span>
          </span>
        </Note>
        <div
          style={{
            position: "absolute",
            left: X0,
            top: logTop,
            width: logW * ease(frame, logAt, 20),
            height: barH,
            background: BAR,
            borderRadius: 3,
          }}
        />
        {/* What the for loop has read so far, paled behind the read head. */}
        <div
          style={{
            position: "absolute",
            left: X0,
            top: logTop,
            width: Math.max(0, headX - X0),
            height: barH,
            background: PAPER,
            opacity: 0.55 * readOn,
            borderRadius: 3,
          }}
        />

        <Note at={memAt - 2} x={X0} y={memTop - h(42)}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap" }}>
            memory <span style={{ color: INK_SOFT }}>8 GB</span>
          </span>
        </Note>
        {/* readlines(): the whole log, dropped into memory's row */}
        {drop > 0 && dropGone < 1 ? (
          <>
            <div
              style={{
                position: "absolute",
                left: X0,
                top: logTop + (memTop - logTop) * drop,
                width: logW,
                height: barH,
                background: BAR,
                opacity: 0.85 * (1 - dropGone),
                borderRadius: 3,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: X0 + memW,
                top: memTop,
                width: (logW - memW) * over,
                height: barH,
                background: MARK_BAD,
                opacity: 1 - dropGone,
              }}
            />
          </>
        ) : null}
        <div
          style={{
            position: "absolute",
            left: X0 - 3,
            top: memTop - 3,
            width: memW + 6,
            height: barH + 6,
            boxSizing: "border-box",
            border: `3px solid ${over > 0 && dropGone < 1 ? ACCENT : INK}`,
            borderRadius: 5,
            opacity: ease(frame, memAt, 12),
          }}
        />
        <Note at={fitAt} x={X0 + logW + 24} y={memTop + barH / 2 - h(16)} out={lineAt - 6}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>can&apos;t fit</span>
        </Note>

        {/* The for loop: one line at a time */}
        {readOn > 0 ? (
          <>
            <div
              style={{
                position: "absolute",
                left: headX - 2,
                top: logTop - 8,
                width: 4,
                height: barH + 16,
                background: INK,
                borderRadius: 2,
                opacity: readOn,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: sliceX,
                top: sliceY,
                width: sliceW,
                height: barH,
                background: OK,
                borderRadius: 2,
                opacity: readOn * (t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15),
              }}
            />
          </>
        ) : null}
        <Note at={holdsAt} x={X0 + memW + 24} y={memTop + barH / 2 - h(16)}>
          <span style={{ ...note(26, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>one line at a time</span>
        </Note>

        {/* ── The two reads, in code ── */}
        <Note at={wholeAt} x={X0} y={y(CODE_Y)} out={eighteenAt - 6}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 24, whiteSpace: "nowrap" }}>
            <Strike at={fitAt + 2}>
              <Code line={wholeLine} size={30} />
            </Strike>
            <span style={note(24, ACCENT_INK)}>the whole file at once</span>
          </span>
        </Note>
        <Note at={lineAt} x={X0} y={y(CODE_Y) + h(72)} out={eighteenAt - 6}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 24, whiteSpace: "nowrap" }}>
            <Mark at={holdsAt} color={MARK_OK}>
              <Code line={loopLine} size={30} />
            </Mark>
            <span style={note(24, OK_INK)}>a line at a time</span>
          </span>
        </Note>

        {/* ── The count, then the choice the first question opens on ── */}
        <Note at={eighteenAt} x={X0} y={y(COUNT_Y)} out={choiceAt - 6}>
          <span style={{ ...note(32, INK), whiteSpace: "nowrap" }}>
            18 questions: <Mark at={workedAt}>14 worked through</Mark>, <Mark at={quickAt}>4 quickly</Mark>
          </span>
        </Note>
        <Note at={listAt - 4} x={X0} y={y(CODE_Y)}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 24, whiteSpace: "nowrap" }}>
            <Code line={listLine} size={30} />
            <span style={note(24, INK_SOFT)}>a list</span>
          </span>
        </Note>
        <Note at={genAt - 4} x={X0} y={y(CODE_Y) + h(72)}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 24, whiteSpace: "nowrap" }}>
            <Code line={genLine} size={30} />
            <span style={note(24, INK_SOFT)}>a generator</span>
          </span>
        </Note>

        <Spot id="de-python-ant" at={lineAt + 2} left={1160} top={y(560)} width={640} height={401} />
      </Drift>
    </AbsoluteFill>
  );
};
