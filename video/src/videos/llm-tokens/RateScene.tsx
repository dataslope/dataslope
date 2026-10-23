import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, headline, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ENCODING, num, OPENING, STRAWBERRY } from "./data";
import { ChipFace, Drift, FIG_Y, FOCUS, FOCUS_INK, Headline, pulse, TokenRun, X0 } from "./parts";

const RULE_Y = 372;
const PARA_Y = 548;
const PARA_SIZE = 30;
const CUT_Y = 800;

/** One cell of the rule of thumb: a number, and what it counts. */
const Cell: React.FC<{ at: number; value: string; unit: string; glow?: number }> = ({ at, value, unit, glow = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, opacity: p, transform: `translateY(${(1 - p) * 8}px)` }}>
      <span style={{ ...headline(60), color: glow > 0.3 ? FOCUS_INK : INK, ...TABULAR }}>{value}</span>
      <span style={{ ...body(30), color: INK_SOFT, whiteSpace: "nowrap" }}>{unit}</span>
    </div>
  );
};

const Approx: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  return <span style={{ ...headline(48), color: INK_SOFT, opacity: ease(frame, at, 10), margin: "0 26px" }}>≈</span>;
};

/**
 * The rough conversion rate for English, the lesson's rule of thumb, then
 * the lesson's own opening as o200k_base cuts it: 190 characters, 36
 * tokens. Then the question Part 3 answers: who decided where strawberry is
 * cut.
 */
export const RateScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const rateFrom = n.beat("rate").from;
  const tokenAt = n.word("rate", "token");
  const fourAt = n.word("rate", "four characters");
  const quartersAt = n.word("rate", "three quarters");
  const thousandAt = n.word("rate", "a thousand tokens");
  const sevenAt = n.word("rate", "seven hundred and fifty");
  const newerAt = n.word("newer", "Newer");
  const packAt = n.word("newer", "more text");
  const openingAt = n.word("opening", "opening");
  const charsAt = n.word("opening", "a hundred and ninety");
  const thirtyAt = n.word("opening", "thirty-six");
  const tokensAt = n.word("opening", "tokens");
  const decidedAt = n.word("bpe-in", "decided");
  const cutAt = n.word("bpe-in", "cut");
  const nobodyAt = n.word("bpe-in", "Nobody");
  const learnedAt = n.word("bpe-in", "learned");
  const end = n.beat("bpe").from;

  // The paragraph's tokens ink one after another, landing on "thirty-six".
  const pieces = OPENING.pieces;
  const span = Math.max(30, thirtyAt - openingAt);
  const pieceAt = (i: number) => openingAt + (i / (pieces.length - 1)) * span;
  const inked = pieces.filter((_, i) => frame >= pieceAt(i)).length;

  return (
    <AbsoluteFill>
      {/* ── Sound: the rule, the paragraph as a run of taps, the cuts ── */}
      <Sfx name="el-tap" at={tokenAt} level={-27} />
      <Sfx name="el-tap" at={fourAt} level={-27} />
      <Sfx name="el-tap" at={quartersAt} level={-27} />
      <Sfx name="el-tap" at={thousandAt} level={-27} />
      <Sfx name="el-sprinkle" at={openingAt} level={-33} />
      <Sfx name="el-tap" at={thirtyAt} level={-25} />
      <Sfx name="el-pencil" at={cutAt - 2} level={-34} />

      <Headline lead="About four characters" turn="a token." at={rateFrom - 6} turnAt={tokenAt + 4} />

      <Drift from={rateFrom} to={end} amount={0.012} origin="40% 50%">
        {/* Fig. 6: the rule of thumb. */}
        <FigLabel n="6" title="The rule of thumb, for English" at={rateFrom} x={X0} y={y(FIG_Y)} />
        <div style={{ position: "absolute", left: X0, top: y(RULE_Y), display: "flex", alignItems: "baseline" }}>
          <Cell at={tokenAt - 2} value="1" unit="token" />
          <Approx at={fourAt - 4} />
          <Cell at={fourAt - 2} value="4" unit="characters" />
          <Approx at={quartersAt - 4} />
          <Cell at={quartersAt - 2} value="0.75" unit="words" />
          <span style={{ width: 110 }} />
          <Cell at={thousandAt - 2} value={num(1000)} unit="tokens" />
          <Approx at={sevenAt - 4} />
          <Cell at={sevenAt - 2} value={num(750)} unit="words" />
        </div>

        {/* Fig. 7: the lesson's own opening, token by token. */}
        <FigLabel n="7" title={`The lesson's opening, in ${ENCODING} tokens`} at={newerAt - 4} x={X0} y={y(PARA_Y) - h(64)} />
        <div style={{ position: "absolute", left: X0, top: y(PARA_Y), opacity: ease(frame, packAt - 4, 14) }}>
          <TokenRun pieces={pieces} size={PARA_SIZE} width={1680} inkAt={pieceAt} />
        </div>
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(PARA_Y) + h(190),
            display: "flex",
            alignItems: "baseline",
            gap: 40,
            ...note(26, INK),
          }}
        >
          <span style={{ opacity: ease(frame, charsAt - 2, 10), whiteSpace: "nowrap" }}>
            <b style={{ ...TABULAR, fontWeight: 650 }}>{OPENING.chars}</b> characters
          </span>
          <span style={{ opacity: inked > 0 ? 1 : 0, whiteSpace: "nowrap" }}>
            <b style={{ ...TABULAR, fontWeight: 650, color: inked === pieces.length ? FOCUS_INK : INK }}>{inked}</b> tokens
          </span>
          <span style={{ ...note(24, INK_SOFT), opacity: ease(frame, tokensAt + 6, 12), whiteSpace: "nowrap" }}>
            {OPENING.charsPerToken} characters a token:{" "}
            <span style={{ color: FOCUS_INK }}>more than four, so fewer tokens than the rule predicts</span>
          </span>
        </div>

        {/* Who decided the cuts? */}
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(CUT_Y),
            display: "flex",
            alignItems: "center",
            gap: 0,
            opacity: ease(frame, decidedAt - 6, 12),
          }}
        >
          {STRAWBERRY.map((p, k) => (
            <React.Fragment key={p.id}>
              {k > 0 ? (
                <span
                  style={{
                    width: 4,
                    height: 54,
                    margin: "0 10px",
                    borderRadius: 2,
                    background: FOCUS,
                    opacity: 0.25 + 0.75 * ease(frame, cutAt - 2 + k * 4, 8),
                    transform: `scaleY(${1 + 0.3 * pulse(frame, cutAt - 2 + k * 4, 16)})`,
                  }}
                />
              ) : null}
              <ChipFace text={p.text} size={28} />
            </React.Fragment>
          ))}
          <span style={{ ...body(30), color: INK, marginLeft: 34, whiteSpace: "nowrap", opacity: ease(frame, nobodyAt - 2, 12) }}>
            Nobody chose these cuts.
          </span>
          <span style={{ ...label(22, FOCUS_INK), marginLeft: 18, whiteSpace: "nowrap", opacity: ease(frame, learnedAt - 2, 12) }}>
            They were learned.
          </span>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
