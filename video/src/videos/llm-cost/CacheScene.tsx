import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { CACHE_FRACTION, int, NAME, PREFIX, usd } from "./data";
import {
  CACHED,
  CACHED_INK,
  FIG_Y,
  HBar,
  Headline,
  INPUT,
  INPUT_INK,
  INPUT_SOFT,
  POINT,
  POINT_INK,
  pulse,
  X0,
} from "./parts";

const ROW_Y = [384, 466, 548];
const ROW_H = 50;
const PREFIX_W = 1000;
const TAIL_W = 84;
/** controlling-cost's own timestamp, the one its block puts at the top. */
const STAMP = "Session started 2026-08-03T14:22:01Z";
const STAMP_W = 486;
/** The per-turn price of the prefix, full and cached. */
const PRICE_HEAD_Y = 688;
const PRICE_ROW_Y = [742, 812];
const PRICE_X = 380;
const FULL_W = 900;

/**
 * Why cached input is cheap, and what breaks it: the same 50,000-token prefix
 * sent every turn, computed once and then read back from the cache; what that
 * does to its price on Sonnet; and a timestamp at the top that sends the
 * whole prefix back to full price.
 */
export const CacheScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const cachedFrom = n.beat("cached").from;
  const cachedAt = n.word("cached", "Cached");
  const otherAt = n.word("cached", "other way");
  const prefixWordAt = n.word("reuse", "fifty-thousand-token");
  const everyAt = n.word("reuse", "every turn");
  const keepAt = n.word("reuse", "keep");
  const readAt = n.word("reuse", "read");
  const tenthAt = n.word("twentieth", "tenth");
  const twentiethAt = n.word("twentieth", "twentieth");
  const sonnetAt = n.word("twentieth", "Sonnet");
  const tenCentsAt = n.word("twentieth", "ten cents");
  const halfAt = n.word("twentieth", "half a cent");
  const catchAt = n.word("prefix", "catch");
  const exactAt = n.word("prefix", "exact");
  const stampAt = n.word("prefix", "timestamp");
  const putAt = n.word("prefix", "Put");
  const byteAt = n.word("prefix", "changed byte");
  const afterAt = n.word("prefix", "everything after");
  const fullAt = n.word("prefix", "full price");

  const rowY = (i: number) => y(ROW_Y[i]);
  const rh = h(ROW_H);
  const rowAt = [otherAt - 6, everyAt, everyAt + 8];
  // Row 3 makes room at its front for the timestamp.
  const shift = STAMP_W * ease(frame, stampAt - 4, 16);
  const rowX = (i: number) => X0 + (i === 2 ? shift : 0);
  // The cache covers rows 2 and 3 from "keep"; row 3's lifts off at "everything after".
  const cover = (i: number) => (i === 0 ? 0 : ease(frame, keepAt - 2 + (i - 1) * 6, 18));
  const lift = ease(frame, afterAt - 2, 22);

  return (
    <AbsoluteFill>
      {/* ── Sound: the turns, the covers, the prices, the timestamp ── */}
      <Sfx name="el-tap" at={rowAt[0]} level={-28} />
      <Sfx name="el-tap" at={rowAt[1]} level={-29} />
      <Sfx name="el-tap" at={rowAt[2]} level={-30} />
      <Sfx name="el-whoosh" at={keepAt - 2} level={-34} />
      <Sfx name="el-tap" at={tenCentsAt - 2} level={-28} />
      <Sfx name="el-tap" at={halfAt - 2} level={-28} />
      <Sfx name="el-pop" at={stampAt - 4} level={-29} />
      <Sfx name="el-scratch" at={afterAt - 2} level={-34} />

      <Headline at={cachedFrom - 6} second={readAt - 4} italic="read back, not recomputed.">
        Cached input:
      </Headline>

      <FigLabel n="4" title={`A ${int(PREFIX.tokens)}-token prefix, sent every turn`} at={cachedAt - 4} x={X0} y={y(FIG_Y)} />

      {ROW_Y.map((_, i) => {
        const ry = rowY(i);
        const x = rowX(i);
        const c = i === 2 ? cover(i) * (1 - lift) : cover(i);
        const glow = i > 0 ? pulse(frame, readAt + (i - 1) * 5, 22) : 0;
        // Turn 3 lifts as the timestamp is about to land on it.
        const lifted = i === 2 ? pulse(frame, putAt - 4, 26) : 0;
        return (
          <React.Fragment key={i}>
            {/* The prefix, at the input rate. */}
            <HBar x={x} y={ry - lifted * 10} w={PREFIX_W} h={rh} at={rowAt[i]} dur={18} fill={INPUT} />
            {/* The cache over it: read back, not recomputed. */}
            {c > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: ry - 4 - lifted * 10,
                  width: PREFIX_W * c,
                  height: rh + 8,
                  borderRadius: 5,
                  background: `color-mix(in srgb, ${CACHED} ${Math.round(82 + glow * 18)}%, ${PAPER})`,
                  display: "flex",
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                <span style={{ ...label(23, PAPER), marginLeft: 18, whiteSpace: "nowrap", opacity: ease(frame, keepAt + 10, 10) }}>
                  read back from the cache
                </span>
              </div>
            ) : null}
            {/* The new message each turn. */}
            <HBar x={x + PREFIX_W + 6} y={ry} w={TAIL_W} h={rh} at={rowAt[i] + 14} fill={INPUT_SOFT} outline={INPUT} />
            <Ink at={rowAt[i] + 8} dur={12} style={{ left: x + PREFIX_W + TAIL_W + 22, top: ry + rh / 2 - 15, whiteSpace: "nowrap" }}>
              <span style={label(22, INK_SOFT)}>turn {i + 1}</span>
            </Ink>
          </React.Fragment>
        );
      })}
      <Ink at={prefixWordAt - 2} dur={14} style={{ left: X0 + 18, top: rowY(0) + rh / 2 - 15, whiteSpace: "nowrap" }}>
        <span style={label(23, PAPER)}>computed once</span>
      </Ink>
      <Note at={rowAt[0] + 18} x={X0 + PREFIX_W + 6} y={rowY(0) - 34}>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>new message</span>
      </Note>

      {/* The timestamp at the top of turn 3's prompt. */}
      <div
        style={{
          position: "absolute",
          left: X0,
          top: rowY(2) - 4,
          width: STAMP_W - 10,
          height: rh + 8,
          boxSizing: "border-box",
          borderRadius: 6,
          border: `2px solid ${POINT}`,
          background: `color-mix(in srgb, ${POINT} 10%, ${PAPER})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO,
          fontSize: 20,
          fontWeight: 600,
          color: INK,
          opacity: ease(frame, stampAt, 12),
          transform: `translateY(${(1 - ease(frame, stampAt, 14)) * -30}px)`,
          whiteSpace: "nowrap",
        }}
      >
        {STAMP}
      </div>
      <Note at={byteAt - 2} x={X0} y={rowY(2) + rh + 14}>
        <span style={{ ...note(23, POINT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>one changed byte, every turn</span>
      </Note>
      <Note at={fullAt - 2} x={X0 + STAMP_W + PREFIX_W + TAIL_W + 22} y={rowY(2) + rh + 14} align="right">
        <span style={{ ...note(23, INPUT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>back to full price</span>
      </Note>
      {/* The exact prefix the cache matches, outlined on turn 2. */}
      <div
        style={{
          position: "absolute",
          left: X0 - 6,
          top: rowY(1) - 10,
          // Drawn out along the prefix on "catch", thickened on "exact".
          width: (PREFIX_W + 12) * ease(frame, catchAt - 2, 30),
          height: rh + 20,
          boxSizing: "border-box",
          borderRadius: 8,
          border: `${2 + pulse(frame, exactAt - 2, 24) * 2}px dashed ${INK}`,
          opacity: ease(frame, catchAt - 2, 8) * (1 - ease(frame, stampAt + 8, 12)) * 0.8,
        }}
      />

      {/* What the prefix costs a turn on Sonnet, full and cached. */}
      <Ink at={sonnetAt - 6} dur={14} style={{ left: X0, top: y(PRICE_HEAD_Y), whiteSpace: "nowrap" }}>
        <span style={label(23, INK_SOFT)}>
          The prefix, per turn, on {NAME.sonnet}
        </span>
      </Ink>
      {[
        { name: "full price", w: FULL_W, fill: INPUT, ink: INPUT_INK, at: tenthAt - 4, value: PREFIX.sonnetFull, valueAt: tenCentsAt, digits: 2 },
        { name: "cache hit", w: FULL_W * CACHE_FRACTION.sonnet, fill: CACHED, ink: CACHED_INK, at: twentiethAt - 4, value: PREFIX.sonnetCached, valueAt: halfAt, digits: 3 },
      ].map((r, i) => {
        const ry = y(PRICE_ROW_Y[i]);
        return (
          <React.Fragment key={r.name}>
            <Ink at={r.at} dur={12} style={{ left: X0, top: ry - 2, whiteSpace: "nowrap" }}>
              <span style={{ ...label(25, r.ink), fontWeight: 700 }}>{r.name}</span>
            </Ink>
            <HBar x={PRICE_X} y={ry} w={r.w} h={h(32)} at={r.at + 2} dur={16} fill={r.fill} />
            <Note at={r.valueAt - 4} x={PRICE_X + r.w + 16} y={ry + h(16) - 18}>
              <span style={{ ...note(27, INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>{usd(r.value, r.digits)}</span>
            </Note>
          </React.Fragment>
        );
      })}
      {/* A tenth of the work: the usual cache rate, ticked on the full bar. */}
      <div
        style={{
          position: "absolute",
          left: PRICE_X + FULL_W * CACHE_FRACTION.haiku - 1.5,
          top: y(PRICE_ROW_Y[0]) - 10,
          width: 3,
          height: h(32) + 20,
          background: INK,
          opacity: ease(frame, tenthAt, 10),
        }}
      />
      <Note at={tenthAt + 2} x={PRICE_X + FULL_W * CACHE_FRACTION.haiku + 12} y={y(PRICE_ROW_Y[0]) + h(16) - 15}>
        <span style={{ ...label(22, PAPER), whiteSpace: "nowrap" }}>a tenth</span>
      </Note>
      <Note at={twentiethAt + 2} x={PRICE_X + FULL_W * CACHE_FRACTION.sonnet + 130} y={y(PRICE_ROW_Y[1]) + h(16) - 16}>
        <span style={{ ...note(23, CACHED_INK), fontWeight: 600, whiteSpace: "nowrap" }}>a twentieth</span>
      </Note>
    </AbsoluteFill>
  );
};
