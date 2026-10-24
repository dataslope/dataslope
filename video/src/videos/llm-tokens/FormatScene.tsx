import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, headline, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { CSV_PIECES, ENCODING, FAMILIES, FORMATS, JSON_PIECES, num, PRICE, SAMPLES } from "./data";
import { Drift, FIG_Y, FOCUS, FOCUS_INK, Headline, Out, TOKEN, TokenRun, X0 } from "./parts";

/** Fig. 12 and Fig. 14, on the left: rows of bars. */
const LBAR = { labelW: 300, barX: X0 + 300, row0: 410, step: 84 };
/** The right column: the left one moved over. */
const RX = 1040;
/** Fig. 13: the two texts, JSON then CSV beside it. */
const TEXT_Y = 368;
const CSV_DX = 430;
/** Fig. 15: the price check. */
const EQ_Y = 470;

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
  const modelsFrom = n.beat("models").from;
  const priceFrom = n.beat("price").from;
  const cheaperAt = n.word("price", "cheaper");
  const moreAt = n.word("price", "thirty percent more");
  const fourAt = n.word("price", "four percent");
  const end = n.beat("chat").from;

  const rowY = (i: number) => y(LBAR.row0) + i * h(LBAR.step);
  const sampleY = (i: number) => y(LBAR.row0) + i * h(170);
  const prose = SAMPLES.find((s) => s.kind === "prose")!;
  const code = SAMPLES.find((s) => s.kind === "code")!;
  const perChar = 100;
  const perToken = 3.0;
  const jsonCount = FORMATS.json[ENCODING as "o200k_base"];
  const csvCount = FORMATS.csv[ENCODING as "o200k_base"];
  const top = Math.max(...FAMILIES.map((f) => f.json));
  const keysLit = ease(frame, keyAt - 2, 10);

  // Every figure is laid out in the left column; the right column is the
  // same drawing moved over. Figures step left as the next one arrives, so
  // they always read 12 | 13, then 13 | 14, then 14 | 15.
  const SHIFT = RX - X0;
  const fig13X = SHIFT * (1 - ease(frame, modelsFrom + 4, 18));
  const fig14X = SHIFT * (1 - ease(frame, priceFrom + 6, 18));
  const jsonInk = (i: number) => recordsAt + 2 + (i / JSON_PIECES.length) * Math.max(18, eightyAt - recordsAt - 2);
  const csvInk = (i: number) => thirtyThreeAt - 8 + (i / CSV_PIECES.length) * 14;

  return (
    <AbsoluteFill>
      {/* ── Sound: the bars, the texts inking, the four tokenizers, the sum ── */}
      <Sfx name="el-tap" at={proseAt} level={-27} />
      <Sfx name="el-tap" at={pythonAt} level={-27} />
      <Sfx name="el-sprinkle" at={recordsAt + 2} level={-33} />
      <Sfx name="el-sprinkle" at={thirtyThreeAt - 8} level={-34} />
      <Sfx name="el-pencil" at={keyAt - 2} level={-35} />
      <Sfx name="el-whoosh" at={modelsFrom + 4} level={-36} />
      {FAMILIES.map((_, i) => (
        <Sfx key={i} name="el-tap" at={familyAt + 10 + i * 5} level={-29} />
      ))}
      <Sfx name="el-whoosh" at={priceFrom + 6} level={-36} />
      <Sfx name="el-tap" at={cheaperAt} level={-27} />
      <Sfx name="el-tap" at={moreAt} level={-27} />
      <Sfx name="el-tap" at={fourAt} level={-24} />

      <Headline lead="Different text," turn="different rates." at={formatsFrom - 6} turnAt={textAt} out={recordsAt - 12} />
      <Headline lead="Same content," turn="different counts." at={recordsAt - 2} turnAt={eightyAt} />

      <Drift from={formatsFrom} to={end} amount={0.01} origin="45% 55%">
        {/* Fig. 12: characters per token, the lesson's two samples, counted;
            under each bar, its first repeat as the tokenizer cuts it. */}
        <Out at={modelsFrom - 6}>
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

        {/* Fig. 13: the lesson's three records, as JSON and as CSV, every
            token drawn, the key names lit on "every key". */}
        <Out at={priceFrom - 4}>
          <div style={{ position: "absolute", inset: 0, transform: `translateX(${fig13X}px)` }}>
            <FigLabel n="13" title="Three records, two formats" at={recordsAt - 4} x={X0} y={y(FIG_Y)} />
            {[
              { x: X0, name: "JSON", count: jsonCount, at: eightyAt },
              { x: X0 + CSV_DX, name: "CSV", count: csvCount, at: thirtyThreeAt },
            ].map((f) => (
              <div
                key={f.name}
                style={{ position: "absolute", left: f.x, top: y(TEXT_Y), display: "flex", alignItems: "baseline", gap: 14, opacity: ease(frame, f.at - 2, 10) }}
              >
                <span style={label(24, INK)}>{f.name}</span>
                <span style={{ ...note(28, INK), fontWeight: 650, ...TABULAR }}>{f.count} tokens</span>
              </div>
            ))}
            <div style={{ position: "absolute", left: X0, top: y(TEXT_Y) + 46, opacity: ease(frame, recordsAt, 8) }}>
              <TokenRun
                pieces={JSON_PIECES}
                size={20}
                width={420}
                rowGap={2}
                lineHeight={1.3}
                faint={0}
                inkAt={jsonInk}
                focus={(i) => (JSON_PIECES[i].key ? keysLit : 0)}
              />
            </div>
            <div style={{ position: "absolute", left: X0 + CSV_DX, top: y(TEXT_Y) + 46, opacity: ease(frame, thirtyThreeAt - 10, 8) }}>
              <TokenRun
                pieces={CSV_PIECES}
                size={20}
                width={360}
                rowGap={2}
                lineHeight={1.3}
                faint={0}
                inkAt={csvInk}
                focus={(i) => (CSV_PIECES[i].key ? keysLit : 0)}
              />
            </div>
            <Note at={keyAt} x={X0 + CSV_DX} y={y(TEXT_Y) + 46 + h(140)}>
              <div style={{ ...note(22, FOCUS_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
                JSON: the {FORMATS.keys.length} keys on all {FORMATS.jsonKeyNames / FORMATS.keys.length} records
              </div>
              <div style={{ ...note(22, INK_SOFT), marginTop: 8, whiteSpace: "nowrap" }}>CSV: once, in a header</div>
            </Note>
          </div>
        </Out>

        {/* Fig. 14: the same JSON, counted by four tokenizers. */}
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${fig14X}px)` }}>
          <FigLabel n="14" title="The same JSON, four tokenizers" at={familyAt + 6} x={X0} y={y(FIG_Y)} />
          {FAMILIES.map((f, i) => {
            const rare = f.json === top;
            return (
              <BarRow
                key={f.encoding}
                top={rowY(i)}
                at={familyAt + 10 + i * 5}
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
            <div style={{ ...body(28), color: INK, whiteSpace: "nowrap" }}>Anthropic: its tokenizer since Claude Opus 4.7 makes</div>
            <div style={{ ...body(28), color: INK, whiteSpace: "nowrap", opacity: ease(frame, percentAt - 2, 12) }}>
              about <span style={{ color: FOCUS_INK }}>30% more tokens</span> for the same text
            </div>
            <div style={{ ...note(20, INK_SOFT), marginTop: 8, whiteSpace: "nowrap" }}>Anthropic, Pricing, October 2026, as the lesson cites it</div>
          </Note>
        </div>

        {/* Fig. 15: the price check, cheaper per token but more tokens. */}
        <div style={{ position: "absolute", inset: 0, transform: `translateX(${SHIFT}px)` }}>
          <FigLabel n="15" title="Cheaper a token, dearer for the text" at={priceFrom + 10} x={X0} y={y(FIG_Y)} />
          <div style={{ position: "absolute", left: X0, top: y(EQ_Y), display: "flex", alignItems: "flex-start", gap: 22 }}>
            {[
              { at: cheaperAt, v: PRICE.cheaper.toFixed(1), u: "the price a token" },
              { at: moreAt, v: PRICE.more.toFixed(1), u: "the tokens" },
              { at: fourAt, v: PRICE.product.toFixed(2), u: "the cost" },
            ].map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 ? (
                  <span style={{ ...headline(56), color: INK_SOFT, opacity: ease(frame, c.at - 4, 10), marginTop: 10 }}>{i === 1 ? "×" : "="}</span>
                ) : null}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: ease(frame, c.at - 2, 10) }}>
                  <span style={{ ...headline(76), color: i === 2 ? FOCUS_INK : INK, ...TABULAR }}>{c.v}</span>
                  <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap", marginTop: 10 }}>{c.u}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
