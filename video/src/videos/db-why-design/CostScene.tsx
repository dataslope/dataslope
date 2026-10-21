import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { FIXED_ORDER, FLAT, MISSED_ORDER, NEW_EMAIL, OLD_EMAIL, rowsChanged } from "./data";
import { Chip, Drift, Headline, lerp, Listing, Mark, pulse, X0 } from "./parts";

/** The programs that touch the table: the lesson's own list ("the web app,
 *  the admin dashboard, the import job, the reporting script"). */
const PROGRAMS = ["web app", "admin dashboard", "import job", "reporting script"] as const;
const CHIP_X = 1300;
const CHIP_W = 330;
const CHIP_Y = [404, 504, 604, 704];
const CARD_W = 560;
const CARD_H = 96;
/** The one fact, and the two copies it became. */
const ONE_Y = 548;
const COPY_Y = [474, 622];
/** The rushed update, where Fig. 1's scene left it, until the programs arrive. */
const LISTING_X = 1150;
const LISTING_Y = 345;
/** The notes beside Postgres's reply. */
const NOTE_X = X0 + 590;
/** The anomaly's name, below "The data stays." under the copies. */
const ANOMALY_Y = 840;

/**
 * Why the anomaly is the design's fault: the update was legal and Postgres
 * did what it was told; Ada's email became copies that every program has to
 * keep in step; that has a name; and rewriting the programs leaves the data
 * as it is.
 */
export const CostScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const legalFrom = n.beat("legal").from;
  const illegalAt = n.word("legal", "illegal");
  const exactlyAt = n.word("legal", "exactly");
  const toldAt = n.word("legal", "told");
  const designAt = n.word("design", "design");
  const copiesAt = n.word("design", "copies");
  const programAt = n.word("design", "program");
  const stepAt = n.word("design", "step");
  const handAt = n.word("design", "hand");
  const foreverAt = n.word("design", "forever");
  const anomalyAt = n.word("anomaly", "update");
  const rewriteAt = n.word("outlives", "rewrite");
  const tomorrowAt = n.word("outlives", "tomorrow");
  const outlivesAt = n.word("outlives", "outlives");
  const whatAt = n.word("what-in", "design");
  const end = n.beat("what").from;

  // The one fact splits into its copies.
  const split = ease(frame, copiesAt - 2, 16);
  const cardY = (k: number) => y(lerp(ONE_Y, COPY_Y[k], split));
  const copies = [
    { order: FIXED_ORDER, email: NEW_EMAIL },
    { order: MISSED_ORDER, email: OLD_EMAIL },
  ];
  // The fact arrives as "the design" is named, so the page is never bare.
  const cardIn = ease(frame, designAt - 2, 14);
  // Both copies hold the old email until "in step": then the update reaches one.
  const diverged = ease(frame, stepAt - 2, 10);
  const outlive = pulse(frame, outlivesAt, 24);
  const chipY = (i: number) => y(CHIP_Y[i]);
  const rewritten = (i: number) => rewriteAt - 2 + i * 5;
  const dimAll = whatAt - 4;

  return (
    <AbsoluteFill>
      {/* ── Sound: the reply, the split, the programs, the name, the rewrite ── */}
      <Sfx name="el-tap" at={legalFrom - 2} level={-30} />
      <Sfx name="el-pop" at={copiesAt - 2} level={-30} />
      <Sfx name="el-pencil" at={stepAt - 4} level={-35} />
      <Sfx name="el-pencil" at={anomalyAt + 4} level={-34} />
      <Sfx name="el-whoosh" at={rewriteAt - 4} level={-34} />

      <Headline lead="Legal SQL," turn="bad design." at={legalFrom - 6} turnAt={designAt - 4} />

      <Drift from={legalFrom} to={end} amount={0.018} origin="45% 55%">
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, dimAll, 20) * 0.6 }}>
          {/* The update itself, carried over from Fig. 1's scene, until the programs need the room. */}
          <Listing
            lines={FLAT.update}
            x={LISTING_X}
            top={y(LISTING_Y)}
            width={630}
            size={22}
            at={legalFrom - 30}
            lineAt={FLAT.update.map(() => legalFrom - 30)}
            marks={[{ line: 2, at: legalFrom - 30 }]}
            out={programAt - 16}
          />
          {/* What Postgres said to the rushed update. */}
          <Ink at={legalFrom - 4} dur={16} style={{ left: X0, top: y(300), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 18 }}>
            <span style={label(22, INK_SOFT)}>Postgres replied</span>
            <span style={{ fontFamily: MONO, fontSize: 34, fontWeight: 600, color: INK }}>
              <Mark at={toldAt - 2}>UPDATE {FLAT.updated}</Mark>
            </span>
            <span style={note(22, INK_SOFT)}>{rowsChanged(FLAT.updated)}</span>
          </Ink>
          <Note at={illegalAt} x={NOTE_X} y={y(300) + 4}>
            <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>No error, no warning.</span>
          </Note>
          <Note at={exactlyAt + 2} x={NOTE_X} y={y(300) + 40} dim={designAt}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Exactly what it was told.</span>
          </Note>
          {/* The fact, and the copies it became. The second copy is drawn first, so it
              slides out from under the first rather than over its text. */}
          {cardIn > 0
            ? [1, 0].map((k) => {
                const c = copies[k];
                const shown = k === 0 ? cardIn : split;
                if (shown <= 0) return null;
                const stepped = pulse(frame, handAt + k * 6, 20) + outlive;
                const one = k === 0 && split < 0.5;
                // Copy 101 takes the new email at "in step"; until then both say the same.
                const swap = k === 0 && !one ? diverged : 0;
                return (
                  <div
                    key={k}
                    style={{
                      position: "absolute",
                      left: X0,
                      top: cardY(k),
                      width: CARD_W,
                      height: h(CARD_H),
                      boxSizing: "border-box",
                      padding: "0 24px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: 6,
                      borderRadius: 8,
                      border: `2px solid ${split > 0.5 ? ACCENT : INK}`,
                      // Opaque, so the copy underneath never shows through.
                      background:
                        split > 0.5
                          ? `color-mix(in srgb, ${ACCENT} ${Math.round(10 + stepped * 16)}%, ${PAPER})`
                          : `color-mix(in srgb, ${ds("yellow", 50)} 55%, ${PAPER})`,
                      opacity: shown,
                      transform: `scale(${1 + stepped * 0.025})`,
                    }}
                  >
                    <div style={label(20, INK_SOFT)}>{one ? "Ada's email: one fact" : `copy on order ${c.order}`}</div>
                    <div style={{ fontFamily: MONO, fontSize: 26, color: INK, fontWeight: 600 }}>
                      <span style={{ opacity: swap < 0.5 ? 1 - 2 * swap : 2 * swap - 1 }}>{swap < 0.5 ? OLD_EMAIL : c.email}</span>
                    </div>
                  </div>
                );
              })
            : null}

          {/* Every program that touches the table, each with both copies to keep in step. */}
          {PROGRAMS.map((p, i) => (
            <React.Fragment key={p}>
              <Chip at={programAt - 4 + i * 5} out={rewritten(i)} x={CHIP_X} y={chipY(i)} width={CHIP_W} glow={pulse(frame, handAt + 4 + i * 5, 20)}>
                {p}
              </Chip>
              <Chip at={rewritten(i) + 6} x={CHIP_X} y={chipY(i)} width={CHIP_W} glow={pulse(frame, outlivesAt + 6 + i * 4, 18)}>
                {p}, rewritten
              </Chip>
              {[0, 1].map((k) => (
                <Leader
                  key={k}
                  points={[
                    [CHIP_X - 8, chipY(i) + 26],
                    [X0 + CARD_W + 10, y(COPY_Y[k]) + h(CARD_H) / 2],
                  ]}
                  at={stepAt - 6 + i * 4 + k * 2}
                  dur={14}
                  color={`color-mix(in srgb, ${ACCENT} ${Math.round(35 + 50 * pulse(frame, foreverAt + i * 4, 22))}%, ${INK_SOFT})`}
                  width={1.6}
                  dot={false}
                />
              ))}
            </React.Fragment>
          ))}
          <Note at={foreverAt - 2} x={CHIP_X} y={chipY(3) + 84} dim={anomalyAt + 10}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>By hand, forever.</span>
          </Note>

          {/* Its name. */}
          <Ink at={anomalyAt - 2} dur={18} style={{ left: X0, top: y(ANOMALY_Y), whiteSpace: "nowrap" }}>
            <span style={{ ...headline(54, true), color: ACCENT_INK }}>The update anomaly</span>
          </Ink>
          <div
            style={{
              position: "absolute",
              left: X0,
              top: y(ANOMALY_Y) + 70,
              width: 520 * ease(frame, anomalyAt + 8, 16),
              height: 4,
              borderRadius: 2,
              background: ACCENT,
            }}
          />
          {/* Under the copies it means. */}
          <Note at={outlivesAt + 4} x={X0} y={y(COPY_Y[1]) + h(CARD_H) + 18}>
            <span style={{ ...body(32), color: INK, whiteSpace: "nowrap" }}>The data stays.</span>
          </Note>
          <Note at={tomorrowAt} x={CHIP_X} y={chipY(0) - 52}>
            <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>Code, tomorrow</span>
          </Note>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
