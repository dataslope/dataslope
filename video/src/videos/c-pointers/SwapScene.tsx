import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { FIG2, FIG3, ILLUSTRATIONS, SIZEOF_INT, SIZEOF_PTR, VIDEO } from "./data";
import {
  ADDR,
  ADDR_INK,
  AddrLabel,
  CopyArrow,
  type Curve,
  Fig,
  type LineMark,
  Listing,
  Marked,
  markP,
  MemBox,
  Mono,
  PointerArrow,
  Val,
} from "./kit";

const LEFT = 120;
const SIZE = 26;
const LIST_TOP = 340;
const LIST_W = 660;

/** The two stack frames, main over swap, at the right of the listing. */
const FRAME_L = 840;
const FRAME_R = 1820;
const FRAME_LABEL_X = 862;
const BYTE = 50;
const COL = [960, 1400] as const;
const INT_W = BYTE * SIZEOF_INT;
const PTR_W = BYTE * SIZEOF_PTR;

/** Rows, before `y()`. main's names sit over its boxes and swap's under
 *  its own, so the arrows between the two rows cross open paper. */
const MAIN_TOP = 322;
const MAIN_NAME = 384;
const MAIN_BOX = 426;
const MAIN_BOTTOM = 540;
const SWAP_TOP = 600;
const SWAP_BOX = 626;
const SWAP_NAME = 726;
const SWAP_BOTTOM = 776;
const BOX_H = 88;
const OUT_Y = 814;
const NOTE_Y = 866;

/** Frames a bead takes to reach the far box (kit's PULSE). */
const ARRIVE = 18;

type Variant = "copy" | "pointer";

/** The cues each version of the figure runs on. */
type Cues = {
  open: number;
  listingAt: number;
  mainAt: number;
  paramsAt: number;
  bodyAt: number;
  /** Fig. 3: when the call with `&x, &y` is named. */
  callAt: number | null;
  /** Fig. 3: "ampersand x", "ampersand y". */
  ampAt: readonly [number, number] | null;
  swapAt: number;
  namesAt: number;
  valuesAt: readonly [number, number];
  arrowsAt: number;
  /** Fig. 3: when `*a` and `*b` follow their arrows. */
  reachAt: number | null;
  tradeAt: number;
  stayAt: number;
  doneAt: number;
  underlineAt: number;
};

const useCues = (variant: Variant): Cues => {
  const n = useNarration();
  if (variant === "copy") {
    const open = n.beat("trap").from - 8;
    return {
      open,
      listingAt: n.word("trap", "This swap") - 4,
      mainAt: n.word("trap", "two ints") - 6,
      paramsAt: n.word("copies", "passes copies"),
      bodyAt: n.word("trap", "trades them"),
      callAt: null,
      ampAt: null,
      swapAt: n.word("copies", "two new boxes") - 4,
      namesAt: n.word("copies", "a and b"),
      valuesAt: [n.word("copies", "one"), n.word("copies", "and two") + 2],
      arrowsAt: n.word("copies", "holding") - 2,
      reachAt: null,
      tradeAt: n.word("nothing", "copies") + 2,
      stayAt: n.word("nothing", "stay exactly"),
      doneAt: n.word("nothing", "as they were"),
      underlineAt: n.word("nothing", "exactly"),
    };
  }
  const open = n.beat("fix").from - 8;
  const holdAt = n.word("fix", "now hold");
  const tradeAt = n.word("works", "really") - 4;
  return {
    open,
    listingAt: open + 2,
    mainAt: open,
    paramsAt: n.word("fix", "addresses"),
    bodyAt: n.word("works", "Star a"),
    callAt: n.word("fix", "Call swap"),
    ampAt: [n.word("fix", "ampersand x"), n.word("fix", "ampersand y")],
    swapAt: n.word("fix", "Call swap") + 4,
    namesAt: n.word("fix", "a and b"),
    valuesAt: [holdAt, holdAt + 6],
    arrowsAt: n.word("fix", "where x") - 2,
    reachAt: n.word("works", "reach back"),
    tradeAt,
    stayAt: tradeAt + 8,
    doneAt: tradeAt + 14,
    underlineAt: n.word("fix", "addresses"),
  };
};

/**
 * Figs. 2 and 3: the same swap twice. Taking ints, it gets copies in a frame
 * of its own, trades them, and main's x and y never move. Taking pointers,
 * a and b hold where x and y live, and `*a`, `*b` trade main's own values.
 * The two figures share one layout, so the cut between them reads as the
 * same page with the parameters changed.
 */
export const SwapScene: React.FC<{ variant: Variant }> = ({ variant }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { y, h } = useLayout();
  const c = useCues(variant);
  const isPtr = variant === "pointer";
  const fig = isPtr ? FIG3 : FIG2;

  const mainBoxTop = y(MAIN_BOX);
  const swapBoxTop = y(SWAP_BOX);
  const boxH = h(BOX_H);
  const mainBottom = mainBoxTop + boxH;
  const boxW = isPtr ? PTR_W : INT_W;

  // Which pair trades: the copies in swap, or main's own x and y through *a, *b.
  const trade = ease(frame, c.tradeAt - 2, 20);
  const pulses = c.reachAt === null ? [] : [c.reachAt - 2];
  const arrived = pulses.length
    ? ease(frame, pulses[0] + ARRIVE - 4, 6) * (1 - ease(frame, pulses[0] + ARRIVE + 4, 22))
    : 0;
  const settled = ease(frame, c.stayAt - 2, 12);

  // Highlights that tie an address to the pointer holding it (Fig. 3 only).
  const ampAt = c.ampAt;
  const linkOut = c.reachAt === null ? undefined : c.reachAt + 40;
  const addrMark = (i: 0 | 1) => (ampAt ? markP(frame, ampAt[i] + 2, linkOut) : 0);
  const holdMark = (i: 0 | 1) => (isPtr ? markP(frame, c.valuesAt[i] + 4, linkOut) : 0);

  const marks: LineMark[] = isPtr
    ? [
        { line: 0, col: 10, chars: 14, at: c.paramsAt - 2, out: c.bodyAt - 6 },
        { line: 8, at: c.callAt ?? c.paramsAt, out: c.bodyAt - 6 },
        ...[1, 2, 3].map((line, i) => ({ line, at: c.bodyAt - 2 + i * 4, out: c.doneAt + 30 })),
      ]
    : [
        ...[1, 2, 3].map((line, i) => ({ line, at: c.bodyAt - 2 + i * 4, out: c.paramsAt - 6 })),
        { line: 0, col: 10, chars: 12, at: c.paramsAt, out: c.tradeAt - 6 },
        { line: 8, at: c.paramsAt + 6, out: c.tradeAt - 6 },
      ];
  const lineAt = fig.lines.map((line, i) =>
    !line ? 0 : isPtr ? c.listingAt + i * 2 : i < 5 ? c.listingAt + i * 3 : c.mainAt + (i - 6) * 3,
  );

  const envelope = pop(frame, c.paramsAt - 6, fps, 15);
  const headColor = isPtr ? ADDR : ACCENT;

  /** Where a value sits: column `i`, in main's row or swap's. */
  const valueAt = (row: "main" | "swap", i: 0 | 1) => ({
    x: COL[i] + (row === "main" ? INT_W : boxW) / 2,
    y: (row === "main" ? mainBoxTop : swapBoxTop) + boxH / 2,
  });
  const tradeRow = isPtr ? "main" : "swap";
  /** The two ints that trade, each moving to the other's box along an arc. */
  const traders = ([0, 1] as const).map((i) => {
    const from = valueAt(tradeRow, i);
    const to = valueAt(tradeRow, i === 0 ? 1 : 0);
    const lift = (i === 0 ? -1 : 1) * Math.sin(trade * Math.PI) * h(30);
    return { value: String(i + 1), x: from.x + (to.x - from.x) * trade, y: from.y + lift };
  });

  // Each pointer leaves its dot and arrives at its box along the same 55
  // degree slant, with its last control point far back along the arrival, so
  // the line is straight under its head (components/arrow.ts). With the last
  // control point straight under the tip, the curve was still swinging round
  // as it arrived and turned 29 degrees inside the head's 15 px, which no
  // head angle can sit on.
  const arrowCurve = (i: 0 | 1): Curve => {
    const sx = COL[i] + PTR_W - 70;
    const ex = COL[i] + INT_W / 2;
    const gap = swapBoxTop - mainBottom;
    const tip = mainBottom + 5;
    const arrive = (55 * Math.PI) / 180;
    return [
      [sx, swapBoxTop],
      [sx - Math.cos(arrive) * gap * 0.45, swapBoxTop - Math.sin(arrive) * gap * 0.45],
      [ex + Math.cos(arrive) * gap * 0.86, tip + Math.sin(arrive) * gap * 0.86],
      [ex, tip],
    ];
  };

  return (
    <AbsoluteFill>
      <Ink at={c.open} dur={14} style={{ left: LEFT + 4, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>Passing to a function</span>
      </Ink>
      <Ink
        at={c.open + 2}
        dur={22}
        style={{ left: LEFT - 2, top: y(150), ...headline(80), whiteSpace: "nowrap", display: "flex", gap: "0.24em" }}
      >
        <span>{isPtr ? "Pass the" : "A swap that"}</span>
        <span style={{ position: "relative", ...headline(80, true), color: isPtr ? ADDR_INK : INK }}>
          {isPtr ? "addresses instead." : "swaps nothing."}
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
              stroke={headColor}
              strokeWidth={5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${ease(frame, c.underlineAt - 2, 14)} 1`}
              opacity={frame >= c.underlineAt - 2 ? 1 : 0}
            />
          </svg>
        </span>
      </Ink>
      {ILLUSTRATIONS && isPtr ? (
        <Illustration
          video={VIDEO}
          id="c-pointers-envelope"
          style={{
            position: "absolute",
            left: 1590,
            top: y(70),
            width: 210,
            height: 210,
            opacity: envelope,
            transformOrigin: "50% 60%",
            transform: `translateY(${bob(frame, 4, 100) + (1 - envelope) * 24}px) rotate(${(1 - envelope) * -14}deg)`,
          }}
        />
      ) : null}

      <Fig n={isPtr ? "3" : "2"} at={c.open + 6} x={LEFT} y={y(290)}>
        {isPtr ? (
          <>
            <Mono>swap(&x, &y)</Mono> hands over their addresses
          </>
        ) : (
          <>
            <Mono>swap(x, y)</Mono> hands over copies
          </>
        )}
      </Fig>

      <Listing
        lines={fig.lines}
        x={LEFT}
        top={y(LIST_TOP)}
        width={LIST_W}
        size={SIZE}
        at={isPtr ? c.open + 4 : c.listingAt - 10}
        lineAt={lineAt}
        marks={marks}
      />

      {/* Stack frames: main's boxes over swap's. */}
      <FramePanel
        name="main"
        at={c.mainAt - 4}
        top={y(MAIN_TOP)}
        bottom={y(MAIN_BOTTOM)}
        boxTop={mainBoxTop}
        boxH={boxH}
      />
      <FramePanel
        name="swap"
        at={c.swapAt - 4}
        top={y(SWAP_TOP)}
        bottom={y(SWAP_BOTTOM)}
        boxTop={swapBoxTop}
        boxH={boxH}
      />

      {([0, 1] as const).map((i) => {
        const name = i === 0 ? "x" : "y";
        return (
          <React.Fragment key={name}>
            <AddrLabel
              x={COL[i]}
              y={y(MAIN_NAME)}
              name={name}
              addr={fig[name]}
              at={c.mainAt + 4 + i * 3}
              mark={addrMark(i)}
              tag={ampAt ? { text: `&${name}`, at: ampAt[i] - 2, out: linkOut } : undefined}
            />
            <MemBox
              x={COL[i]}
              top={mainBoxTop}
              width={INT_W}
              height={boxH}
              at={c.mainAt + i * 3}
              tint={isPtr ? Math.max(arrived * 0.3, settled * 0.16) : settled * 0.16}
              tintColor={isPtr ? ADDR : ACCENT}
            >
              {isPtr ? null : <Val>{String(i + 1)}</Val>}
            </MemBox>
          </React.Fragment>
        );
      })}

      {([0, 1] as const).map((i) => {
        const name = i === 0 ? "a" : "b";
        return (
          <React.Fragment key={name}>
            <MemBox x={COL[i]} top={swapBoxTop} width={boxW} height={boxH} at={c.swapAt + i * 3}>
              {isPtr ? (
                <Ink at={c.valuesAt[i]} dur={14} style={{ position: "relative" }}>
                  <Marked p={holdMark(i)}>
                    <Val kind="addr">{i === 0 ? FIG3.aHolds : FIG3.bHolds}</Val>
                  </Marked>
                </Ink>
              ) : null}
            </MemBox>
            <AddrLabel
              x={COL[i]}
              y={y(SWAP_NAME)}
              name={name}
              addr={fig[name]}
              at={c.namesAt + 6 + i * 3}
              nameAt={c.namesAt + i * 4}
            />
          </React.Fragment>
        );
      })}

      {/* The ints that trade places, and (Fig. 2) the copies' first values. */}
      {isPtr
        ? null
        : ([0, 1] as const).map((i) => {
            const p = ease(frame, c.valuesAt[i] - 2, 12);
            if (frame >= c.tradeAt - 2 || p <= 0) return null;
            const at = valueAt("swap", i);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: at.x,
                  top: at.y,
                  transform: `translate(-50%, ${-50 + (1 - p) * -30}%)`,
                  opacity: p,
                }}
              >
                <Val>{String(i + 1)}</Val>
              </div>
            );
          })}
      {traders.map((t, i) =>
        frame >= c.tradeAt - 2 || isPtr ? (
          <div
            key={i}
            style={{
              position: "absolute",
              left: t.x,
              top: t.y,
              transform: "translate(-50%, -50%)",
              opacity: ease(frame, c.mainAt + 6, 10),
            }}
          >
            <Val>{t.value}</Val>
          </div>
        ) : null,
      )}

      {isPtr
        ? ([0, 1] as const).map((i) => (
            <PointerArrow
              key={i}
              curve={arrowCurve(i)}
              at={c.arrowsAt + i * 5}
              dur={16}
              pulses={pulses.map((p) => p + i * 3)}
            />
          ))
        : ([0, 1] as const).map((i) => (
            <React.Fragment key={i}>
              <CopyArrow x={COL[i] + INT_W / 2} y0={mainBottom + 8} y1={swapBoxTop - 8} at={c.arrowsAt + i * 6} />
              <Ink
                at={c.arrowsAt + 8 + i * 6}
                dur={10}
                style={{
                  left: COL[i] + INT_W / 2 + 18,
                  top: mainBottom,
                  height: swapBoxTop - mainBottom,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <span style={{ ...note(20, INK_SOFT), fontStyle: "italic" }}>copy</span>
              </Ink>
            </React.Fragment>
          ))}

      {/* What the program printed. */}
      <Ink
        at={c.stayAt - 4}
        dur={14}
        style={{ left: FRAME_L, top: y(OUT_Y), display: "flex", alignItems: "baseline", gap: 18, whiteSpace: "nowrap" }}
      >
        <span style={label(21, INK_SOFT)}>It prints</span>
        <span style={{ fontFamily: MONO, fontSize: 32, fontWeight: 500, color: INK, fontVariantLigatures: "none" }}>
          {fig.stdout}
        </span>
        <span
          style={{
            ...note(22, isPtr ? ADDR_INK : ACCENT_INK),
            fontWeight: 650,
            opacity: ease(frame, c.doneAt - 2, 10),
          }}
        >
          {isPtr ? "swapped" : "unchanged"}
        </span>
      </Ink>
      <Note at={c.namesAt + 14} x={FRAME_L} y={y(NOTE_Y)} from="up">
        <span style={note(21, INK_SOFT)}>
          Addresses from one run, printed with <Mono>%p</Mono>. They change on every run.
        </span>
      </Note>
    </AbsoluteFill>
  );
};

/** A stack frame: a faint panel with its function's name at the left. */
const FramePanel: React.FC<{ name: string; at: number; top: number; bottom: number; boxTop: number; boxH: number }> = ({
  name,
  at,
  top,
  bottom,
  boxTop,
  boxH,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  if (p <= 0) return null;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: FRAME_L,
          top,
          width: FRAME_R - FRAME_L,
          height: bottom - top,
          boxSizing: "border-box",
          border: `1.5px solid ${HAIRLINE}`,
          borderRadius: 8,
          background: `color-mix(in srgb, ${INK} 2.5%, ${PAPER})`,
          clipPath: `inset(-2px ${(1 - p) * 100}% -2px -2px)`,
        }}
      />
      <Ink
        at={at + 4}
        dur={12}
        style={{ left: FRAME_LABEL_X, top: boxTop, height: boxH, display: "flex", alignItems: "center" }}
      >
        <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: INK_SOFT }}>{name}</span>
      </Ink>
    </>
  );
};
