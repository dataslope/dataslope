import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ease, map, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { colors, ds } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { GHOST_STEPS, QUERY, type ClauseKey } from "./data";
import { SqlLine } from "./Sql";

const ROW_H = 72;
const PAD = 36;
const WIDTH = 1260;
const FONT = 40;
const BADGE = 54;

/** Which clause the trace is on, by beat. */
const TRACE: { beat: string; key: ClauseKey }[] = [
  { beat: "from", key: "from" },
  { beat: "where", key: "where" },
  { beat: "group-by", key: "group-by" },
  { beat: "having", key: "having" },
  { beat: "select", key: "select" },
  { beat: "order-by", key: "order-by" },
  { beat: "limit", key: "limit" },
];

/**
 * The query, first in the order it is written, then rearranged into the
 * order PostgreSQL runs it, then shrunk into the left column as the trace's
 * map. One component for all three so the rows never jump between scenes.
 */
export const QueryCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();

  const written = n.beat("written").from;
  const selectCue = n.word("written", "SELECT");
  const notThere = n.word("not-there", "doesn't");
  const reorderAt = n.word("reorder", "FROM");
  const fiveCue = n.word("reorder", "five");
  const limitCue = n.word("reorder", "LIMIT");
  const shrink = ease(frame, n.beat("trace-intro").from, 22);

  // Trace highlight: the clause whose beat is being spoken.
  const tracing = TRACE.findLast((t) => frame >= n.beat(t.beat).from - 4);
  const traceOn = frame >= n.beat("from").from - 4;

  // Card geometry: centered and full size, then a map in the left column.
  const rows = 7 + 2 * ease(frame, reorderAt, 16);
  const height = rows * ROW_H + PAD * 2;
  const scale = 1 - shrink * 0.38;
  const x = map(shrink, [0, 1], [(1920 - WIDTH) / 2, 64]);
  const y = map(shrink, [0, 1], [150, 236]);

  const pulse = (at: number) => {
    const t = frame - at;
    return t < 0 || t > 24 ? 0 : Math.sin((t / 24) * Math.PI);
  };

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: WIDTH,
        height,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        borderRadius: 28,
        background: colors.codeBg,
        boxShadow: `0 30px 80px -30px color-mix(in srgb, ${ds("blue", 900)} 45%, transparent)`,
      }}
    >
      {GHOST_STEPS.map((g) => {
        const p = ease(frame, reorderAt + 6 + g.step * 2, 14);
        return (
          <div
            key={g.key}
            style={{
              position: "absolute",
              left: PAD - 8,
              right: PAD - 8,
              top: PAD + (g.step - 1) * ROW_H + 6,
              height: ROW_H - 12,
              borderRadius: 14,
              border: `2px dashed ${ds("gray", 600)}`,
              opacity: p * 0.9,
              display: "flex",
              alignItems: "center",
              paddingLeft: BADGE + 32,
              gap: 20,
              fontFamily: MONO,
              fontSize: FONT * 0.82,
              color: colors.codeDim,
            }}
          >
            <Badge step={g.step} visible={p} ghost />
            {g.label}
            <span style={{ fontFamily: SANS, fontSize: 26, fontWeight: 600 }}>
              not in this query
            </span>
          </div>
        );
      })}
      {QUERY.map((clause, written_i) => {
        const appear = pop(frame, written + written_i * 3, fps, 18);
        const move = pop(frame, reorderAt + clause.step * 2, fps, 17);
        const slot = map(move, [0, 1], [written_i, clause.step - 1]);
        const isSelect = clause.key === "select";

        // Highlights, in the order the narration reaches them.
        const selectMark = isSelect ? ease(frame, selectCue, 10) * (1 - ease(frame, reorderAt, 10)) : 0;
        const shakeT = frame - notThere;
        const shake = isSelect && shakeT >= 0 && shakeT < 16 ? Math.sin(shakeT * 1.6) * 10 * (1 - shakeT / 16) : 0;
        const notFirst = isSelect ? ease(frame, notThere + 4, 10) * (1 - ease(frame, reorderAt, 8)) : 0;
        const active = traceOn && tracing?.key === clause.key;
        const dim = traceOn && !active ? 0.42 : 1;
        const fromGlow = clause.key === "from" ? pulse(reorderAt + 4) : 0;
        const badgePulse =
          clause.key === "select" ? pulse(fiveCue) : clause.key === "limit" ? pulse(limitCue) : 0;

        return (
          <div
            key={clause.key}
            style={{
              position: "absolute",
              left: PAD - 8,
              right: PAD - 8,
              top: PAD + slot * ROW_H + 6,
              height: ROW_H - 12,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              gap: 24,
              paddingLeft: 12,
              opacity: appear * dim,
              transform: `translate(${shake + (1 - appear) * -30}px, 0)`,
              background: active
                ? `color-mix(in srgb, ${ds("blue")} 26%, transparent)`
                : selectMark > 0
                  ? `color-mix(in srgb, ${ds("yellow")} ${18 * selectMark}%, transparent)`
                  : fromGlow > 0
                    ? `color-mix(in srgb, ${ds("blue")} ${26 * fromGlow}%, transparent)`
                    : "transparent",
              boxShadow: active
                ? `inset 6px 0 0 ${ds("blue", 400)}`
                : selectMark > 0
                  ? `inset ${6 * selectMark}px 0 0 ${ds("yellow")}`
                  : "none",
            }}
          >
            <Badge step={clause.step} visible={ease(frame, reorderAt + 10 + clause.step * 4, 10)} pulse={badgePulse} />
            <SqlLine sql={clause.sql} fontSize={FONT} />
            {isSelect && notFirst > 0 ? (
              <span
                style={{
                  marginLeft: "auto",
                  marginRight: 16,
                  padding: "6px 18px",
                  borderRadius: 999,
                  background: ds("red"),
                  color: colors.page,
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: 26,
                  whiteSpace: "nowrap",
                  opacity: notFirst,
                  transform: `scale(${0.8 + notFirst * 0.2})`,
                }}
              >
                not first
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const Badge: React.FC<{ step: number; visible: number; ghost?: boolean; pulse?: number }> = ({
  step,
  visible,
  ghost,
  pulse = 0,
}) => (
  <span
    style={{
      position: ghost ? "absolute" : "relative",
      left: ghost ? 12 : undefined,
      flex: "none",
      width: BADGE,
      height: BADGE,
      borderRadius: 999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: SANS,
      fontWeight: 800,
      fontSize: 28,
      color: ghost ? colors.codeDim : colors.codeBg,
      background: ghost ? "transparent" : pulse > 0 ? ds("yellow") : ds("blue", 300),
      border: ghost ? `2px dashed ${ds("gray", 600)}` : "none",
      opacity: visible,
      transform: `scale(${(0.6 + visible * 0.4) * (1 + pulse * 0.28)})`,
    }}
  >
    {step}
  </span>
);
