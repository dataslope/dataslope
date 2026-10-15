import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, headline, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { FIG1, ILLUSTRATIONS, SIZEOF_INT, SIZEOF_PTR, VIDEO } from "./data";
import {
  AddrLabel,
  Fig,
  lineTop,
  Listing,
  listingGeometry,
  Marked,
  markP,
  MemBox,
  Mono,
  PointerArrow,
  Val,
  VALUE_INK,
} from "./kit";

const LEFT = 120;
const SIZE = 30;
const LIST_TOP = 350;
const LIST_W = 680;

/** The memory strip: n's four bytes, p's eight, and one more either side. */
const BYTE = 64;
const STRIP_R = 1800;
const STRIP_L = STRIP_R - BYTE * (SIZEOF_INT + SIZEOF_PTR + 2);
const N_X = STRIP_L + BYTE;
const N_W = BYTE * SIZEOF_INT;
/** p starts on the byte after n's last, so their borders are one line. */
const P_X = N_X + N_W - 2;
const P_W = BYTE * SIZEOF_PTR + 2;

/** Rows of the figure, before `y()`. */
const NAME_Y = 432;
const BOX_Y = 476;
const BOX_H = 96;
const SIZE_Y = 678;
const NOTE_Y = 754;

/** Frames a bead takes to reach n along the arrow (kit's PULSE). */
const ARRIVE = 18;

/**
 * Fig. 1: a variable is a box at an address. `&n` is that address, `p` holds
 * it, and `*p` follows it, to read 42 and then to write 100 into n.
 */
export const PointerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const open = Math.max(0, n.beat("box").from - 13);
  const boxAt = n.word("box", "box");
  const memoryAt = n.word("box", "memory");
  const addressAt = n.word("box", "address");

  const holdsAt = n.word("n", "n holds");
  const fortyTwoAt = n.word("n", "forty-two");
  const ampAt = n.word("n", "Ampersand");
  const nAddrAt = n.word("n", "address");

  const pointerAt = n.word("pointer", "pointer");
  const intStarAt = n.word("pointer", "Int star p");
  const setToAt = n.word("pointer", "ampersand n");
  const storesAt = n.word("pointer", "stores");
  const livesAt = n.word("pointer", "where n lives");

  const starFrom = n.beat("star").from;
  const goesAt = n.word("star", "goes");
  const readingAt = n.word("star", "Reading");
  const readStarAt = n.word("star", "star p", { nth: 2 });
  const readsAt = n.word("star", "forty-two");
  const writingAt = n.word("star", "writing");
  const throughAt = n.word("star", "through it");
  const changesAt = n.word("star", "changes");
  const itselfAt = n.word("star", "itself");

  const machineAt = n.word("sizes", "machine");
  const fourAt = n.word("sizes", "four bytes");
  const eightAt = n.word("sizes", "eight");
  const changeAt = n.word("sizes", "change");
  const alwaysAt = n.word("sizes", "always holds");

  const top = y(LIST_TOP);
  const g = listingGeometry(SIZE);
  const boxTop = y(BOX_Y);
  const boxH = h(BOX_H);
  const boxBottom = boxTop + boxH;

  // *p: a bead runs down the arrow, and n lights up when it arrives.
  const pulses = [goesAt - 2, readStarAt - 2, throughAt - 4];
  const flash = Math.max(...pulses.map((c) => ease(frame, c + ARRIVE - 4, 6) * (1 - ease(frame, c + ARRIVE + 4, 22))));
  const changed = ease(frame, changesAt - 2, 12);

  // The address of n, wherever it is written, carries one highlight.
  const addrMark = Math.max(markP(frame, nAddrAt - 2, starFrom - 8), markP(frame, alwaysAt - 2));
  const valueMark = Math.max(markP(frame, storesAt, starFrom - 8), markP(frame, alwaysAt + 4));

  // The strip of memory around n draws outward from n's box.
  const strip = ease(frame, memoryAt - 4, 24);
  const stripW = STRIP_R - STRIP_L;
  const fromX = N_X + N_W / 2 - STRIP_L;
  const shelf = pop(frame, boxAt - 6, fps, 15);

  const arrowX0 = P_X + 128;
  const arrowX1 = N_X + N_W / 2;
  const dip = h(96);

  return (
    <AbsoluteFill>
      <Ink at={open} dur={14} style={{ left: LEFT + 4, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>Pointers in C</span>
      </Ink>
      <Ink
        at={open + 2}
        dur={22}
        style={{ left: LEFT - 2, top: y(150), ...headline(88), whiteSpace: "nowrap", display: "flex", gap: "0.24em" }}
      >
        <span>Every box has</span>
        <span style={{ position: "relative", ...headline(88, true) }}>
          an address.
          {/* Sized in em and to the words, so it underlines them in any face. */}
          <svg
            viewBox="0 0 400 30"
            style={{
              position: "absolute",
              left: -4,
              top: "1.0em",
              width: "calc(100% + 8px)",
              height: "auto",
              overflow: "visible",
            }}
          >
            <path
              d="M4,16 C90,8 220,6 394,13"
              fill="none"
              stroke={ACCENT}
              strokeWidth={5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${ease(frame, addressAt - 2, 14)} 1`}
              opacity={frame >= addressAt - 2 ? 1 : 0}
            />
          </svg>
        </span>
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="c-pointers-pigeonholes"
          style={{
            position: "absolute",
            left: 1430,
            top: y(80),
            width: 370,
            height: 210,
            opacity: shelf,
            transform: `translateY(${bob(frame, 4, 110) + (1 - shelf) * 24}px)`,
          }}
        />
      ) : null}

      <Fig n="1" at={boxAt - 6} x={LEFT} y={y(290)}>
        <Mono>n</Mono> and <Mono>p</Mono> in memory, from one run
      </Fig>

      <Listing
        lines={FIG1.lines}
        x={LEFT}
        top={top}
        width={LIST_W}
        size={SIZE}
        at={boxAt - 2}
        lineAt={[holdsAt - 2, intStarAt - 2, readingAt - 2, writingAt - 2, itselfAt - 4]}
        marks={[
          { line: 1, col: 9, chars: 2, at: setToAt - 2, out: starFrom - 8 },
          { line: 2, col: 15, chars: 2, at: readStarAt - 2, out: writingAt - 6 },
          { line: 3, col: 0, chars: 2, at: writingAt, out: n.beat("sizes").from - 6 },
        ]}
      >
        {FIG1.prints.map((out, i) => {
          if (out === null) return null;
          const at = i === 2 ? readsAt - 2 : itselfAt + 4;
          return (
            <Ink
              key={i}
              at={at}
              dur={12}
              style={{
                right: 22,
                top: lineTop(0, i, SIZE),
                height: g.lineH,
                display: "flex",
                alignItems: "center",
                gap: 12,
                whiteSpace: "nowrap",
              }}
            >
              <span style={label(20, INK_SOFT)}>prints</span>
              <span style={{ fontSize: 26, color: VALUE_INK }}>
                <Mono weight={600}>{out}</Mono>
              </span>
            </Ink>
          );
        })}
      </Listing>

      {/* Memory: a strip of bytes, faint, with n's and p's boxes on it. */}
      <div
        style={{
          position: "absolute",
          left: STRIP_L,
          top: boxTop,
          width: stripW,
          height: boxH,
          opacity: strip > 0 ? 1 : 0,
          clipPath: `inset(-4px ${(stripW - fromX) * (1 - strip)}px -4px ${fromX * (1 - strip)}px)`,
          WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
          maskImage: "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      >
        <svg width={stripW} height={boxH} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {[1, boxH - 1].map((ly) => (
            <line
              key={ly}
              x1={0}
              x2={stripW}
              y1={ly}
              y2={ly}
              stroke={HAIRLINE}
              strokeWidth={1.5}
              strokeDasharray="6 6"
            />
          ))}
          {Array.from({ length: SIZEOF_INT + SIZEOF_PTR + 1 }, (_, i) => (
            <line
              key={i}
              x1={(i + 1) * BYTE}
              x2={(i + 1) * BYTE}
              y1={0}
              y2={boxH}
              stroke={HAIRLINE}
              strokeWidth={1.2}
              strokeDasharray="6 6"
            />
          ))}
        </svg>
      </div>

      {/* n */}
      <AddrLabel
        x={N_X}
        y={y(NAME_Y)}
        name="n"
        addr={FIG1.n}
        at={addressAt - 2}
        nameAt={holdsAt}
        mark={addrMark}
        tag={{ text: "&n", at: ampAt - 2, out: starFrom - 8 }}
      />
      <MemBox
        x={N_X}
        top={boxTop}
        width={N_W}
        height={boxH}
        at={boxAt - 4}
        bytes={SIZEOF_INT}
        ticks={ease(frame, fourAt - 4, 12)}
        tint={flash * 0.3}
      >
        <div style={{ display: "grid", opacity: ease(frame, fortyTwoAt - 4, 10) }}>
          <div
            style={{
              gridArea: "1 / 1",
              justifySelf: "center",
              opacity: 1 - changed,
              transform: `translateY(${-changed * 16}px)`,
            }}
          >
            <Val>42</Val>
          </div>
          <div
            style={{
              gridArea: "1 / 1",
              justifySelf: "center",
              opacity: changed,
              transform: `translateY(${(1 - changed) * 16}px)`,
            }}
          >
            <Val>100</Val>
          </div>
        </div>
      </MemBox>

      {/* p */}
      <AddrLabel x={P_X + 2} y={y(NAME_Y)} name="p" addr={FIG1.p} at={pointerAt + 4} nameAt={intStarAt + 2} />
      <MemBox
        x={P_X}
        top={boxTop}
        width={P_W}
        height={boxH}
        at={pointerAt - 2}
        bytes={SIZEOF_PTR}
        ticks={ease(frame, eightAt - 4, 12)}
      >
        <Ink at={storesAt} dur={14} style={{ position: "relative" }}>
          <Marked p={valueMark}>
            <Val kind="addr" size={26}>
              {FIG1.n}
            </Val>
          </Marked>
        </Ink>
      </MemBox>

      <PointerArrow
        curve={[
          [arrowX0, boxBottom],
          [arrowX0, boxBottom + dip],
          [arrowX1, boxBottom + dip],
          [arrowX1, boxBottom + 5],
        ]}
        at={livesAt - 2}
        dur={18}
        pulses={pulses}
      />

      {/* Sizes, under each box. */}
      {(
        [
          { x: N_X, w: N_W, type: "int", bytes: SIZEOF_INT, at: fourAt },
          { x: P_X, w: P_W, type: "int *", bytes: SIZEOF_PTR, at: eightAt },
        ] as const
      ).map((s) => (
        <Ink
          key={s.type}
          at={s.at - 2}
          dur={12}
          style={{ left: s.x, top: y(SIZE_Y), width: s.w, textAlign: "center", whiteSpace: "nowrap" }}
        >
          <span style={note(21, INK_SOFT)}>
            <Mono>{s.type}</Mono>, {s.bytes} bytes
          </span>
        </Ink>
      ))}

      <Note at={machineAt - 2} x={STRIP_L} y={y(NOTE_Y)} from="up">
        <span style={note(20, INK_SOFT)}>
          Sizes from <Mono>sizeof</Mono> on x86-64 Linux, gcc 13.
        </span>
      </Note>
      <Note at={changeAt - 2} x={STRIP_L} y={y(NOTE_Y) + 34} from="up">
        <span style={note(20, INK_SOFT)}>
          Addresses from one run, printed with <Mono>%p</Mono>. They change on every run.
        </span>
      </Note>
    </AbsoluteFill>
  );
};
