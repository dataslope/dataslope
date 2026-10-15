import React from "react";
import { useCurrentFrame } from "remotion";
import { useNarration } from "../../../narration/NarrationContext";
import { CATCH_TARGET, SHUFFLED, SORTED } from "../data";
import { ARROW_LEFT, ARROW_UP, BANG, Bitmap, CHECK, CROSS, Pixel, Screen, Sprite } from "../pixel";
import { ARCADE, blink, blinkIn, steps, W } from "../theme";

const CELL = 110;
const GAP = 18;
const ROW_W = SORTED.length * CELL + (SORTED.length - 1) * GAP;
const RX = (W - ROW_W) / 2;
const RY = 580;
const MID = Math.floor(SORTED.length / 2);
const xOf = (i: number) => RX + i * (CELL + GAP);

/** The catch: the same seven numbers sorted, then shuffled, and the middle
 *  says "lower" while the target sits on the right. */
export const Catch: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  const catchAt = word("catch", "catch");
  const sortedAt = word("catch", "sorted");
  const shuffleAt = word("catch", "Shuffled");
  const higherAt = word("catch", "higher");
  const lowerAt = word("catch", "lower");
  const wrongAt = word("catch", "wrong");

  const shuffle = steps(frame, shuffleAt, 9, 3);
  const shuffled = shuffle >= 1;
  const midValue = SHUFFLED[MID];
  const goLeft = CATCH_TARGET < midValue;
  const where = SHUFFLED.indexOf(CATCH_TARGET);
  // The half "lower" sends you to, and whether the target is in it.
  const searched = (i: number) => (goLeft ? i < MID : i > MID);
  // The row waits out the cross-fade, then lights a cell a frame.
  const rowAt = from + 6;

  return (
    <Screen from={from} to={to}>
      <div
        style={{
          position: "absolute",
          top: 268,
          left: 0,
          width: W,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 34,
          opacity: blinkIn(frame, Math.min(catchAt, from + 6), 3, 4) ? 1 : 0,
        }}
      >
        <Bitmap rows={BANG} px={10} inks={{ "#": ARCADE.red }} style={{ opacity: blink(frame, catchAt, 12) ? 1 : 0 }} />
        <Pixel size={64} color={ARCADE.red} drop={ARCADE.screen}>
          THE CATCH
        </Pixel>
        <Bitmap rows={BANG} px={10} inks={{ "#": ARCADE.red }} style={{ opacity: blink(frame, catchAt, 12) ? 1 : 0 }} />
      </div>

      {/* SORTED, then SHUFFLED. */}
      <div
        style={{
          position: "absolute",
          top: 404,
          left: 0,
          width: W,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
          opacity: frame >= sortedAt ? 1 : 0,
        }}
      >
        {shuffled ? (
          <>
            <Bitmap rows={CROSS} px={6} inks={{ "#": ARCADE.red }} />
            <Pixel size={40} color={ARCADE.red}>
              SHUFFLED
            </Pixel>
          </>
        ) : (
          <>
            <Bitmap rows={CHECK} px={6} inks={{ "#": ARCADE.green }} style={{ opacity: blinkIn(frame, sortedAt, 3, 4) ? 1 : 0 }} />
            <Pixel size={40} color={ARCADE.green}>
              SORTED
            </Pixel>
          </>
        )}
      </div>

      {/* FIND 25 */}
      <div style={{ position: "absolute", top: 484, left: 0, width: W, textAlign: "center", opacity: frame >= higherAt ? 1 : 0 }}>
        <Pixel size={32} color={ARCADE.yellow}>
          {`FIND ${CATCH_TARGET}`}
        </Pixel>
      </div>

      {/* The row. Each value hops from its sorted slot to its shuffled one in
          three jumps. */}
      {SORTED.map((v, i) => {
        const to = SHUFFLED.indexOf(v);
        const x = xOf(i) + (xOf(to) - xOf(i)) * shuffle;
        const lift = shuffle > 0 && shuffle < 1 ? -48 : 0;
        const slot = shuffled ? to : i;
        const isMid = shuffled && slot === MID && frame >= higherAt;
        const isTarget = v === CATCH_TARGET;
        if (frame < rowAt + i) return null;
        const dimmed = frame >= wrongAt && shuffled && searched(slot);
        const caught = frame >= wrongAt && isTarget;
        const fill = caught
          ? blink(frame, wrongAt, 8)
            ? ARCADE.red
            : ARCADE.yellow
          : isMid
            ? ARCADE.yellow
            : dimmed
              ? ARCADE.panel
              : ARCADE.lit;
        const ink = caught || isMid ? ARCADE.screen : dimmed ? ARCADE.dim : ARCADE.white;
        const outline =
          frame >= lowerAt && frame < wrongAt && shuffled && searched(slot) ? `0 0 0 6px ${ARCADE.yellow}` : "";
        return (
          <div
            key={v}
            style={{
              position: "absolute",
              left: x,
              top: RY + lift,
              width: CELL,
              height: CELL,
              background: fill,
              boxShadow: [
                `inset 6px 6px 0 color-mix(in srgb, ${ARCADE.white} 30%, transparent)`,
                `inset -6px -6px 0 color-mix(in srgb, ${ARCADE.screen} 35%, transparent)`,
                outline,
              ]
                .filter(Boolean)
                .join(", "),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Pixel size={40} color={ink}>
              {v}
            </Pixel>
          </div>
        );
      })}

      {/* LOWER points left… */}
      {frame >= lowerAt ? (
        <div
          style={{
            position: "absolute",
            top: RY + CELL + 36,
            left: xOf(0),
            width: xOf(MID) - xOf(0) - GAP,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 18,
            opacity: blinkIn(frame, lowerAt, 3, 4) ? 1 : 0,
          }}
        >
          {frame >= wrongAt ? (
            <>
              <Bitmap rows={CROSS} px={6} inks={{ "#": ARCADE.red }} />
              <Pixel size={32} color={ARCADE.red}>
                NOPE
              </Pixel>
            </>
          ) : (
            <>
              <Bitmap rows={ARROW_LEFT} px={6} inks={{ "#": ARCADE.yellow, "+": ARCADE.yellowLo }} />
              <Pixel size={32} color={ARCADE.yellow}>
                LOWER
              </Pixel>
            </>
          )}
        </div>
      ) : null}

      {/* …but the target is on the right. */}
      {frame >= wrongAt ? (
        <div
          style={{
            position: "absolute",
            top: RY + CELL + 30,
            left: xOf(where) - 40,
            width: CELL + 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            opacity: blinkIn(frame, wrongAt, 3, 4) ? 1 : 0,
          }}
        >
          <Bitmap rows={ARROW_UP} px={6} inks={{ "#": ARCADE.red, "+": ARCADE.redLo }} />
          <Pixel size={32} color={ARCADE.red}>
            HERE
          </Pixel>
        </div>
      ) : null}

      {/* The signpost flips upside down on "wrong": up and down swap. */}
      <div
        style={{
          position: "absolute",
          top: 940,
          left: 230,
          width: 170,
          height: 366,
          transform: frame >= wrongAt && blink(frame, wrongAt, 10) ? "scaleY(-1)" : undefined,
        }}
      >
        <Sprite id="bs-arrow-sign" at={shuffleAt} width={170} height={366} hopAmp={0} style={{ top: 0, left: 0 }} />
      </div>
      <Sprite id="bs-marmot-puzzled" at={from + 4} width={320} height={415} hopAmp={8} hopPeriod={24} style={{ top: 900, left: 470 }} />
    </Screen>
  );
};
