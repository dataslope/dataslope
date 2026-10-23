import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, headline, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { ENCODING, FAMILIES, FORMATS, num, PRICE, SAMPLES } from "./data";
import { Drift, FIG_Y, FOCUS, FOCUS_INK, Headline, Out, pulse, TOKEN, TOKEN_TINT, TokenRun, X0 } from "./parts";

/** Fig. 12 and Fig. 14, on the left: rows of bars. */
const LBAR = { labelW: 300, barX: X0 + 300, row0: 410, step: 84 };
/** Fig. 13, on the right: one outlined cell per token. */
const RX = 1040;
const CELL = 26;
const CELL_GAP = 6;
const PER_ROW = 15;
const JSON_Y = 410;
const CSV_Y = 660;
const EQ_Y = 808;

/** A block of `count` token cells, filling in order from `at` over `dur`. */
const Cells: React.FC<{ count: number; x: number; top: number; at: number; dur: number; focus?: number }> = ({
  count,
  x,
  top,
  at,
  dur,
  focus = 0,
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const q = ease(frame, at + (i / count) * dur, 6);
        if (q <= 0) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + (i % PER_ROW) * (CELL + CELL_GAP),
              top: top + Math.floor(i / PER_ROW) * (CELL + CELL_GAP),
              width: CELL,
              height: CELL,
              boxSizing: "border-box",
              borderRadius: 6,
              border: `2px solid ${focus > 0 ? `color-mix(in srgb, ${FOCUS} ${Math.round(focus * 100)}%, ${TOKEN})` : TOKEN}`,
              background: TOKEN_TINT,
              opacity: q,
              transform: `scale(${0.7 + 0.3 * q})`,
            }}
          />
        );
      })}
    </>
  );
};

/** A horizontal bar with its value, grown on `at`. */
const BarRow: React.FC<{
  top: number;
  at: number;
  width: number;
  value: string;
  focus?: number;
  children: React.ReactNode;
}> = ({ top, at, width, value, focus = 0, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  return (
    <>
      <div style={{ position: "absolute", left: X0, top, width: LBAR.labelW - 20, opacity: p }}>{children}</div>
      <div
        style={{
          position: "absolute",
          left: LBAR.barX,
          top: top + 6,
          height: 36,
          width: width * p,
          borderRadius: 3,
          background: focus > 0 ? `color-mix(in srgb, ${FOCUS} ${Math.round(focus * 100)}%, ${TOKEN})` : TOKEN,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: LBAR.barX + width + 14,
          top: top + 4,
          ...note(30, focus > 0.5 ? FOCUS_INK : INK),
          fontWeight: 650,
          opacity: ease(frame, at + 8, 8),
          ...TABULAR,
        }}
      >
        {value}
      </div>
    </>
  );
};

/**
 * What the text is changes the count: the lesson's prose and code samples,
 * measured; its three records as JSON and as CSV, every token a cell; the
 * same JSON on four tokenizers, with Anthropic's thirty percent; and the
 * price check that follows from it.
 */
export const FormatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const formatsFrom = n.beat("formats").from;
  const textAt = n.word("formats", "text");
  const proseAt = n.word("formats", "prose");
  const halfAt = n.word("formats", "four and a half");
  const pythonAt = n.word("formats", "Python");
  const underAt = n.word("formats", "under");
  const recordsAt = n.word("json", "records");
  const eightyAt = n.word("json", "eighty-nine");
  const thirtyThreeAt = n.word("json", "thirty-three");
  const keyAt = n.word("json", "every key");
  const familyAt = n.word("models", "model family");
  const gptAt = n.word("models", "GPT-3's");
  const hundredAt = n.word("models", "a hundred and twenty");
  const anthropicAt = n.word("models", "Anthropic");
  const percentAt = n.word("models", "thirty percent");
  const cheaperAt = n.word("price", "cheaper");
  const moreAt = n.word("price", "thirty percent more");
  const fourAt = n.word("price", "four percent");
  const end = n.beat("chat").from;

  const rowY = (i: number) => y(LBAR.row0) + i * h(LBAR.step);
  const sampleY = (i: number) => y(LBAR.row0) + i * h(170);
  const prose = SAMPLES.find((s) => s.kind === "prose")!;
  const code = SAMPLES.find((s) => s.kind === "code")!;
  const perChar = 100;
  const perToken = 3.3;
  const jsonCells = FORMATS.json[ENCODING as "o200k_base"];
  const csvCells = FORMATS.csv[ENCODING as "o200k_base"];
  const top = Math.max(...FAMILIES.map((f) => f.json));

  return (
    <AbsoluteFill>
      {/* ── Sound: the bars, the cells filling, the four tokenizers, the sum ── */}
      <Sfx name="el-tap" at={proseAt} level={-27} />
      <Sfx name="el-tap" at={pythonAt} level={-27} />
      <Sfx name="el-sprinkle" at={eightyAt - 4} level={-32} />
      <Sfx name="el-sprinkle" at={thirtyThreeAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={familyAt - 6} level={-36} />
      {FAMILIES.map((_, i) => (
        <Sfx key={i} name="el-tap" at={familyAt + i * 5} level={-29} />
      ))}
      <Sfx name="el-tap" at={cheaperAt} level={-27} />
      <Sfx name="el-tap" at={moreAt} level={-27} />
      <Sfx name="el-tap" at={fourAt} level={-24} />

      <Headline lead="Same content," turn="different counts." at={formatsFrom - 6} turnAt={textAt} />

      <Drift from={formatsFrom} to={end} amount={0.01} origin="45% 55%">
        {/* Fig. 12: characters per token, the lesson's two samples, counted;
            under each bar, its first repeat as the tokenizer cuts it. */}
        <Out at={familyAt - 8}>
          <FigLabel n="12" title="Characters a token, the lesson's samples" at={formatsFrom} x={X0} y={y(FIG_Y)} />
          {[
            { s: prose, at: proseAt, name: "English prose", said: halfAt },
            { s: code, at: pythonAt, name: "Python code", said: underAt },
          ].map((r, i) => (
            <React.Fragment key={r.name}>
              <BarRow top={sampleY(i)} at={r.at - 2} width={r.s.charsPerToken * perChar} value={r.s.charsPerToken.toFixed(1)}>
                <div style={{ ...label(24, INK), whiteSpace: "nowrap" }}>{r.name}</div>
                <div style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap", marginTop: 4, opacity: ease(frame, r.said, 12), ...TABULAR }}>
                  {num(r.s.chars)} characters, {num(r.s.tokens)} tokens
                </div>
              </BarRow>
              <div style={{ position: "absolute", left: X0, top: sampleY(i) + h(72), opacity: ease(frame, r.at, 10) }}>
                <TokenRun
                  pieces={r.s.unit}
                  size={22}
                  width={860}
                  rowGap={8}
                  faint={0}
                  inkAt={(j) => r.at + 4 + (j * 22) / r.s.unit.length}
                />
              </div>
            </React.Fragment>
          ))}
        </Out>

        {/* Fig. 14: the same JSON, counted by four tokenizers. */}
        <FigLabel n="14" title="The same JSON, four tokenizers" at={familyAt - 2} x={X0} y={y(FIG_Y)} />
        {FAMILIES.map((f, i) => {
          const rare = f.json === top;
          return (
            <BarRow
              key={f.encoding}
              top={rowY(i)}
              at={familyAt + i * 5}
              width={f.json * perToken}
              value={String(f.json)}
              focus={rare ? ease(frame, hundredAt - 2, 10) : 0}
            >
              <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>{f.encoding}</div>
              <div
                style={{
                  ...note(20, rare && frame > gptAt ? FOCUS_INK : INK_SOFT),
                  whiteSpace: "nowrap",
                  marginTop: 2,
                }}
              >
                {f.model === "davinci" ? "GPT-3, davinci" : f.model === "text-davinci-003" ? f.model : f.model.toUpperCase().replace("GPT-4O", "GPT-4o")}
              </div>
            </BarRow>
          );
        })}
        <Note at={anthropicAt - 2} x={X0} y={rowY(FAMILIES.length) + h(10)}>
          <div style={{ ...body(28), color: INK, whiteSpace: "nowrap" }}>
            Anthropic: its tokenizer since Claude Opus 4.7 makes
          </div>
          <div style={{ ...body(28), color: INK, whiteSpace: "nowrap", opacity: ease(frame, percentAt - 2, 12) }}>
            about <span style={{ color: FOCUS_INK }}>30% more tokens</span> for the same text
          </div>
          <div style={{ ...note(20, INK_SOFT), marginTop: 8, whiteSpace: "nowrap" }}>Anthropic, Pricing, October 2026, as the lesson cites it</div>
        </Note>

        {/* Fig. 13: three records, as JSON and as CSV. */}
        <FigLabel n="13" title="Three records, two formats" at={recordsAt - 4} x={RX} y={y(FIG_Y)} />
        <Cells count={jsonCells} x={RX} top={y(JSON_Y)} at={recordsAt + 2} dur={Math.max(18, eightyAt - recordsAt)} focus={pulse(frame, keyAt, 30)} />
        <div style={{ position: "absolute", left: RX + PER_ROW * (CELL + CELL_GAP) + 22, top: y(JSON_Y), opacity: ease(frame, eightyAt - 2, 10) }}>
          <div style={{ ...label(24, INK) }}>JSON</div>
          <div style={{ ...note(30, INK), fontWeight: 650, ...TABULAR }}>{jsonCells} tokens</div>
          <div style={{ ...note(20, INK_SOFT), marginTop: 6, whiteSpace: "nowrap", opacity: ease(frame, keyAt - 2, 12) }}>every key,</div>
          <div style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, keyAt - 2, 12) }}>on every record</div>
        </div>
        <Cells count={csvCells} x={RX} top={y(CSV_Y)} at={thirtyThreeAt - 8} dur={14} />
        <div style={{ position: "absolute", left: RX + PER_ROW * (CELL + CELL_GAP) + 22, top: y(CSV_Y), opacity: ease(frame, thirtyThreeAt - 2, 10) }}>
          <div style={{ ...label(24, INK) }}>CSV</div>
          <div style={{ ...note(30, INK), fontWeight: 650, ...TABULAR }}>{csvCells} tokens</div>
          <div style={{ ...note(20, INK_SOFT), marginTop: 6, whiteSpace: "nowrap", opacity: ease(frame, keyAt - 2, 12) }}>keys once, in a header</div>
        </div>

        {/* The price check: cheaper per token, more tokens. */}
        <div style={{ position: "absolute", left: RX, top: y(EQ_Y), display: "flex", alignItems: "flex-start", gap: 22 }}>
          {[
            { at: cheaperAt, v: PRICE.cheaper.toFixed(1), u: "the price a token" },
            { at: moreAt, v: PRICE.more.toFixed(1), u: "the tokens" },
            { at: fourAt, v: PRICE.product.toFixed(2), u: "the cost" },
          ].map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 ? (
                <span style={{ ...headline(46), color: INK_SOFT, opacity: ease(frame, c.at - 4, 10) }}>{i === 1 ? "×" : "="}</span>
              ) : null}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: ease(frame, c.at - 2, 10) }}>
                <span style={{ ...headline(52), color: i === 2 ? FOCUS_INK : INK, ...TABULAR }}>{c.v}</span>
                <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap", marginTop: 6 }}>{c.u}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
