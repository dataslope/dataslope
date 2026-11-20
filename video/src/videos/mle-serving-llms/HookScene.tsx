import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { KV } from "./data";
import { Box, Drift, Flow, Headline, Kicker, Line, Mark, Spot, TokenRow, X0 } from "./parts";

/** The model box, the same in both rows. */
const MODEL = { x: 380, w: 200 };
/** Where the outputs start. */
const OUT_X = 664;
const WORDS = ["Every", "token", "is", "another", "pass", "through", "the", "model"];
const PASS_EVERY = 22;
const GPU = { w: 118, h: 62, gap: 14 };

/**
 * The opening: a classifier's one pass beside a language model's loop, a pass
 * per token, counted under the model; then the model the four questions share
 * (70B parameters) and the node it is served from (eight 80 GB GPUs), with
 * the kingfisher at the right.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const classAt = n.word("hook", "A classifier");
  const onePassAt = n.word("hook", "one pass through its model");
  const lmAt = n.word("hook", "A language model");
  const tokenAt = n.word("hook", "one token at a time");
  const anotherAt = n.word("hook", "every token is another pass");
  const slowAt = n.word("hook-cost", "generation is slow");
  const fourAt = n.word("hook-cost", "Four questions");
  const paramsAt = n.word("hook-cost", "seventy billion parameters");
  const gpusAt = n.word("hook-cost", "served from eight GPUs");
  const end = n.beat("hook-cost").to;

  // Row 1, the classifier; row 2, the language model.
  const r1 = y(360);
  const r2 = y(612);
  const boxH1 = 64;
  const boxH2 = 84;
  // One pass per token: the loop redraws, then the token comes out.
  const passAt = (k: number) => tokenAt + 4 + k * PASS_EVERY;
  const passes = WORDS.filter((_, k) => frame >= passAt(k) + 10).length;
  const loopTop = r2 - boxH2 / 2 - 58;
  const loopX = MODEL.x + MODEL.w + 40;
  const gpuTop = y(812);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={classAt + 6} level={-31} />
      <Sfx name="el-tap" at={lmAt + 6} level={-31} />
      {WORDS.map((_, k) => (
        <Sfx key={k} name="el-tap" at={passAt(k) + 10} level={-36} />
      ))}
      <Sfx name="el-pop" at={classAt + 4} level={-30} />
      <Sfx name="el-pencil" at={slowAt} level={-36} />
      <Sfx name="el-sprinkle" at={gpusAt + 4} level={-33} />

      <Drift from={0} to={end + 40}>
        <Kicker at={classAt - 12}>Machine learning engineer interview questions · Serving LLMs</Kicker>
        <Headline lead="One pass," turn="or one pass per token" at={classAt - 6} turnAt={anotherAt} size={64} />

        {/* ── A classifier: one input, one pass, one output ── */}
        <Line at={classAt} x={X0} y={y(282)} size={24} color={INK_SOFT}>
          Classifier
        </Line>
        <TokenRow x={X0} y={r1 - 22} tokens={[{ text: "an email", at: classAt + 4 }]} />
        <Flow points={[[256, r1], [MODEL.x - 4, r1]]} at={onePassAt - 4} />
        <Box x={MODEL.x} y={r1 - boxH1 / 2} w={MODEL.w} h={boxH1} at={classAt + 6} title="Model" />
        <Flow points={[[MODEL.x + MODEL.w + 4, r1], [OUT_X - 6, r1]]} at={onePassAt + 6} />
        <TokenRow x={OUT_X} y={r1 - 22} tokens={[{ text: "spam", at: onePassAt + 18 }]} />
        <Line at={onePassAt + 10} x={MODEL.x + MODEL.w / 2} width={MODEL.w} align="center" y={r1 + boxH1 / 2 + 12} size={22} color={INK_SOFT}>
          1 pass
        </Line>

        {/* ── A language model: the same box, once per token ── */}
        <Line at={lmAt} x={X0} y={y(470)} size={24} color={INK_SOFT}>
          Language model
        </Line>
        <TokenRow x={X0} y={r2 - 22} tokens={[{ text: "a prompt", at: lmAt + 4 }]} />
        <Flow points={[[268, r2], [MODEL.x - 4, r2]]} at={lmAt + 8} />
        <Box
          x={MODEL.x}
          y={r2 - boxH2 / 2}
          w={MODEL.w}
          h={boxH2}
          at={lmAt + 6}
          title="Model"
          sub={<span style={{ opacity: ease(frame, paramsAt, 12) }}>70B parameters</span>}
        />
        <Flow points={[[MODEL.x + MODEL.w + 4, r2 + 14], [OUT_X - 6, r2 + 14]]} at={tokenAt - 4} />
        {/* The loop: out of the model and back into it, redrawn each pass. */}
        {WORDS.map((_, k) => (
          <Flow
            key={k}
            points={[
              [MODEL.x + MODEL.w + 4, r2 - 18],
              [loopX, r2 - 18],
              [loopX, loopTop],
              [MODEL.x + MODEL.w / 2, loopTop],
              [MODEL.x + MODEL.w / 2, r2 - boxH2 / 2 - 4],
            ]}
            at={passAt(k)}
            dur={10}
            head={13}
            out={k < WORDS.length - 1 ? passAt(k + 1) : undefined}
          />
        ))}
        <TokenRow x={OUT_X} y={r2 + 14 - 22} tokens={WORDS.map((w, k) => ({ text: w, at: passAt(k) + 10 }))} />
        <div
          style={{
            position: "absolute",
            left: MODEL.x,
            width: MODEL.w,
            top: r2 + boxH2 / 2 + 12,
            textAlign: "center",
            opacity: ease(frame, passAt(0) + 8, 8),
            ...note(22, INK_SOFT),
          }}
        >
          <span style={{ ...note(22, frame >= slowAt ? INK : INK_SOFT), fontWeight: 500 }}>
            <Mark at={slowAt + 2}>
              <Num>{Math.max(1, passes)}</Num> {passes === 1 || passes === 0 ? "pass" : "passes"}
            </Mark>
          </span>
        </div>

        {/* ── The model the four questions share, and its node ── */}
        <Line at={fourAt} x={X0} y={y(742)} size={24} color={INK}>
          Four questions, all on one model
        </Line>
        {Array.from({ length: KV.gpus }, (_, i) => (
          <Box key={i} x={X0 + i * (GPU.w + GPU.gap)} y={gpuTop} w={GPU.w} h={GPU.h} at={gpusAt + i * 2} title={`${KV.gpuGB} GB`} size={22} />
        ))}
        <div
          style={{
            position: "absolute",
            left: X0 + KV.gpus * (GPU.w + GPU.gap) + 20,
            top: gpuTop + GPU.h / 2 - 16,
            ...label(26, INK),
            fontWeight: 500,
            whiteSpace: "nowrap",
            opacity: ease(frame, gpusAt + 16, 12),
          }}
        >
          <Num>{KV.gpus}</Num> × <Num>{KV.gpuGB}</Num> GB GPUs
        </div>

        <Spot id="kingfisher" at={classAt + 4} x={1436} y={y(296)} w={390} />
      </Drift>
    </AbsoluteFill>
  );
};
