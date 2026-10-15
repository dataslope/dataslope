import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { DRAWS, ROWS, SEED, TOKENS, UNIFORMS } from "./data";
import { FILL, Legend, TEXT, TINT } from "./kit";

/** Rows of tiles, in layout y, and the tiles' columns. */
const ROW_Y = (k: number) => 344 + k * 112;
const TILE_H = 56;
const X0 = 330;
const PITCH = 64;
const TILE_W = 56;
const tileX = (j: number) => X0 + j * PITCH;
const COUNT_X = 1660;

const ROCK = TOKENS.length - 1;
const HOT = ROWS.length - 1;
/** Where rock turns up in the hottest row (the draw the narration names). */
const ROCK_AT = ROWS[HOT].draws.indexOf(ROCK);

/**
 * Draw, draw-low, draw-high: twenty seeded draws at each temperature, every
 * row consuming the same twenty uniform numbers (numpy, seed in data.ts).
 */
export const DrawScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("draw").from;
  const rowsAt = n.word("draw", "twenty tokens");
  const sameAt = n.word("draw", "same twenty");
  const lowAt = n.beat("draw-low").from;
  const allAt = n.word("draw-low", "all twenty");
  const highAt = n.beat("draw-high").from;
  const elevenAt = n.word("draw-high", "only eleven");
  const rockAt = n.word("draw-high", "even rock");
  const rowAt = (k: number) => rowsAt + k * 14;
  const tileAt = (k: number, j: number) => rowAt(k) + j * 1.4;
  const numbersBand = ease(frame, sameAt - 2, 10) * (1 - ease(frame, lowAt - 6, 10));
  const bandOf = (k: number) =>
    k === 0
      ? ease(frame, lowAt - 4, 10) * (1 - ease(frame, highAt - 6, 10))
      : k === HOT
        ? ease(frame, highAt - 4, 10)
        : 0;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={start - 14} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Twenty draws per temperature,
        </Ink>
        <Ink at={sameAt - 2} dur={18} style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
          the same random numbers.
        </Ink>
      </div>
      <FigLabel n="3" title={`The token each draw picks (numpy, seed ${SEED})`} at={start - 8} x={120} y={y(196)} />
      <Note at={start} x={1800} y={y(196) + 2} align="right" from="right">
        <Legend />
      </Note>

      {/* The twenty uniforms every row shares. */}
      <div
        style={{
          position: "absolute",
          left: X0 - 10,
          width: DRAWS * PITCH - (PITCH - TILE_W) + 20,
          top: y(268) - 6,
          height: 38,
          background: HIGHLIGHT,
          opacity: numbersBand * 0.5,
        }}
      />
      <Ink at={start - 4} dur={12} style={{ right: 1920 - (X0 - 24), top: y(268) }}>
        <span style={{ ...label(20), whiteSpace: "nowrap" }}>Random number</span>
      </Ink>
      {UNIFORMS.map((u, j) => (
        <div
          key={j}
          style={{
            position: "absolute",
            left: tileX(j) - 8,
            width: TILE_W + 16,
            top: y(268),
            textAlign: "center",
            opacity: ease(frame, start - 2 + j * 0.8, 10),
            ...note(20, INK_SOFT),
          }}
        >
          {u.toFixed(2).replace(/^0/, "")}
        </div>
      ))}
      <Ink at={start - 2} dur={12} style={{ left: COUNT_X, top: y(268) }}>
        <span style={{ ...label(20), whiteSpace: "nowrap" }}>Cat picked</span>
      </Ink>

      {ROWS.map((r, k) => {
        const top = y(ROW_Y(k));
        const band = bandOf(k);
        return (
          <React.Fragment key={r.t}>
            <div
              style={{
                position: "absolute",
                left: 100,
                width: 1720,
                top: top - 12,
                height: h(TILE_H) + 24,
                background: HIGHLIGHT,
                opacity: band * 0.45,
              }}
            />
            <Ink at={rowAt(k) - 6} dur={12} style={{ left: 120, top: top + h(TILE_H) / 2 - 24 }}>
              <span style={{ ...headline(40), fontVariantNumeric: "tabular-nums lining-nums", whiteSpace: "nowrap" }}>
                T = {r.t.toFixed(1)}
              </span>
            </Ink>
            {r.draws.map((tok, j) => {
              const s = pop(frame, tileAt(k, j), fps, 16);
              if (s <= 0.001) return null;
              return (
                <div
                  key={j}
                  style={{
                    position: "absolute",
                    left: tileX(j),
                    top,
                    width: TILE_W,
                    height: h(TILE_H),
                    boxSizing: "border-box",
                    background: TINT[tok],
                    borderBottom: `4px solid ${FILL[tok]}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: Math.min(1, s),
                    transform: `scale(${0.6 + 0.4 * s})`,
                    ...note(20, TEXT[tok]),
                    fontWeight: 650,
                  }}
                >
                  {TOKENS[tok]}
                </div>
              );
            })}
            <Note at={tileAt(k, DRAWS - 1) + 4} x={COUNT_X} y={top + h(TILE_H) / 2 - 27}>
              <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap" }}>
                <span
                  style={{ ...headline(44), color: TEXT[0], fontVariantNumeric: "tabular-nums lining-nums" }}
                >
                  {r.counts[0]}
                </span>
                <span style={note(20, INK_SOFT)}>of {DRAWS}</span>
              </span>
            </Note>
          </React.Fragment>
        );
      })}

      {/* All twenty, then only eleven: the count the narration reads. */}
      <Ink at={allAt - 2} dur={10} out={highAt - 4} style={{ left: COUNT_X - 18, top: y(ROW_Y(0)) - 8, width: 150, height: h(TILE_H) + 16 }}>
        <div style={{ width: "100%", height: "100%", border: `2px solid ${INK}` }} />
      </Ink>
      <Ink at={elevenAt - 2} dur={10} style={{ left: COUNT_X - 18, top: y(ROW_Y(HOT)) - 8, width: 150, height: h(TILE_H) + 16 }}>
        <div style={{ width: "100%", height: "100%", border: `2px solid ${INK}` }} />
      </Ink>

      {/* Rock, once. */}
      {ROCK_AT >= 0 ? (
        <>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: ease(frame, rockAt - 2, 10) }}>
            <rect
              x={tileX(ROCK_AT) - 4}
              y={y(ROW_Y(HOT)) - 4}
              width={TILE_W + 8}
              height={h(TILE_H) + 8}
              fill="none"
              stroke={ACCENT}
              strokeWidth={3}
            />
          </svg>
          <Note at={rockAt + 2} x={tileX(ROCK_AT) + TILE_W / 2} y={y(ROW_Y(HOT)) + h(TILE_H) + 22} from="up" style={{ transform: "translateX(-50%)" }}>
            <span style={{ ...note(21, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
              Rock, at {(ROWS[HOT].probs[ROCK] * 100).toFixed(1)}%, picked{" "}
              {ROWS[HOT].counts[ROCK] === 1 ? "once" : `${ROWS[HOT].counts[ROCK]} times`}
            </span>
          </Note>
        </>
      ) : null}

      <Note at={highAt + 10} x={120} y={y(830)}>
        <span style={note(20, INK_SOFT)}>
          Every row reuses the same twenty numbers, so as T rises a column can only stay put or move to a less
          likely token.
        </span>
      </Note>
    </AbsoluteFill>
  );
};
