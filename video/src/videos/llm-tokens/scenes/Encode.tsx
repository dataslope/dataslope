import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { ds } from "../../../theme/brand";
import { BARE, BARE_CL100K } from "../data";
import { chipHue, CONTENT_W, fringe, neon, W } from "../theme";
import {
  chipWidth,
  Clay,
  DownArrow,
  flicker,
  glitch,
  IdTag,
  Mono,
  Terminal,
  TokenChip,
  Typed,
} from "../ui";

const TERM_TOP = 270;
const TERM_H = 1040;
/** The terminal starts short and grows on "ID" to make room for the ids. */
const TERM_H0 = 620;
const INNER = CONTENT_W - 6;
const SIZE = 84;
const GAP = 48;
const CHIP_TOP = 200;
const ID_TOP = 460;

const widths = BARE.map((t) => chipWidth(t.text, SIZE));

/**
 * The GPT-4o tokenizer, run on "strawberry". One glowing word splits into
 * its three real chunks, each chunk drops its id, and the ids are the only
 * thing left lit: that is the model's whole view of the word.
 */
export const Encode: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { word } = useNarration();
  const run = word("split", "Run");
  const strawberryEnd = word("split", "strawberry", { edge: "end" });
  const tokenizer = word("split", "tokenizer");
  const splits = word("split", "splits");
  const three = word("split", "three");
  const chunksEnd = word("split", "chunks", { edge: "end" });
  const idAt = word("ids", "ID");
  const numbers = word("ids", "numbers");
  const all = word("ids", "all");
  const gets = word("ids", "gets", { edge: "end" });

  const s = frame < splits ? 0 : pop(frame, splits, fps, 11);
  const gap = GAP * s;
  const rowW = widths.reduce((a, b) => a + b, 0) + gap * (BARE.length - 1);
  const rowLeft = (INNER - rowW) / 2;
  const g = glitch(frame, splits - 2, 10);
  const dim = ease(frame, numbers, 10) * 0.85;
  const grow = ease(frame, idAt - 4, 14);
  const termH = TERM_H0 + (TERM_H - TERM_H0) * grow;

  let x = rowLeft;
  const lefts = widths.map((w) => {
    const l = x;
    x += w + gap;
    return l;
  });

  return (
    <Scene from={from} to={to} fade={6}>
      <Terminal top={TERM_TOP} height={termH} title="GPT-4o tokenizer" subtitle="o200k_base" on={flicker(frame, from)}>
        <div style={{ position: "absolute", left: 34, top: 40 }}>
          <Typed
            text={[
              { text: "> ", color: ds("yellow", 300) },
              { text: "encode(" },
              { text: '"strawberry"', color: ds("red", 300), glow: ds("red", 400) },
              { text: ")" },
            ]}
            from={run}
            to={strawberryEnd}
            size={46}
            glow={ds("blue", 400)}
            cursor={frame < tokenizer ? "always" : "none"}
          />
        </div>

        {/* The word, then its chunks. Before the split the three chips touch
            with square inner corners, so they read as one pill. */}
        <div style={{ position: "absolute", left: 0, top: CHIP_TOP, width: INNER, height: SIZE * 1.5, filter: fringe(Math.round(g * 8)) }}>
          {BARE.map((t, i) => {
            const r = SIZE * 0.75 * (i === 0 ? 1 : s);
            const rr = SIZE * 0.75 * (i === BARE.length - 1 ? 1 : s);
            return (
              <div key={i} style={{ position: "absolute", left: lefts[i], top: 0 }}>
                <TokenChip
                  text={t.text}
                  hue={frame < splits ? "blue" : chipHue(i)}
                  size={SIZE}
                  on={flicker(frame, tokenizer)}
                  dim={dim}
                  radius={`${r}px ${rr}px ${rr}px ${r}px`}
                  style={{
                    borderLeftWidth: i === 0 || s > 0.05 ? undefined : 0,
                    borderRightWidth: i === BARE.length - 1 || s > 0.05 ? undefined : 0,
                  }}
                />
                {frame >= three + i * 4 ? (
                  <Mono
                    size={34}
                    color={neon(chipHue(i)).core}
                    glow={neon(chipHue(i)).tube}
                    style={{
                      position: "absolute",
                      top: -58,
                      width: widths[i],
                      textAlign: "center",
                      opacity: flicker(frame, three + i * 4),
                    }}
                  >
                    {String(i + 1)}
                  </Mono>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Each chunk drops its id. */}
        {BARE.map((t, i) => {
          const at = idAt + i * 5;
          if (frame < at) return null;
          const cx = lefts[i] + widths[i] / 2;
          return (
            <div key={t.id} style={{ position: "absolute", left: cx - 120, top: CHIP_TOP + SIZE * 1.5 + 16, width: 240, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <DownArrow length={100} hue={chipHue(i)} progress={ease(frame, at, 8)} />
              <IdTag id={t.id} at={at + 4} size={62} />
            </div>
          );
        })}

        {frame >= all ? (
          <div style={{ position: "absolute", left: 0, top: ID_TOP + 200, width: INNER, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <Mono size={32} color={ds("gray", 400)} style={{ opacity: flicker(frame, all) }}>
              what the model receives
            </Mono>
            <Typed
              text={`[${BARE.map((t) => t.id).join(", ")}]`}
              from={all}
              to={gets}
              size={64}
              color={ds("yellow", 300)}
              glow={ds("yellow", 400)}
            />
          </div>
        ) : null}

        {frame >= chunksEnd ? (
          <Mono
            size={28}
            color={ds("gray", 400)}
            style={{
              position: "absolute",
              left: 0,
              width: INNER,
              textAlign: "center",
              top: termH - 78 - 80,
              opacity: flicker(frame, chunksEnd),
            }}
          >
            {`GPT-4 tokenizer (cl100k): ${BARE_CL100K.join(" | ")}`}
          </Mono>
        ) : null}
      </Terminal>

      {/* The split, in clay: three chunks under the terminal until the ids
          need the room. */}
      {grow < 1 ? (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - grow }}>
          <Clay id="tok-blocks" at={splits} left={(W - 820) / 2} top={TERM_TOP + TERM_H0 + 50} width={820} height={212} rim="yellow" seed={9} bob={6} />
        </div>
      ) : null}

    </Scene>
  );
};
