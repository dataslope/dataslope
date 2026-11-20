import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { READY } from "./data";
import { artBox, Box, Chip, Clear, Drift, Flow, line, Listing, listingWidth, Mark, OK_INK, spanAt, Spot, X0 } from "./parts";

const SIZE = 19;
/** The right column, beside the YAML. */
const R_X = 1040;
/** The project's lineage, staging to mart, as the access rule sees it. */
const MODELS = [
  { name: "stg_orders", access: "private" },
  { name: "int_orders", access: "private" },
  { name: "fct_orders", access: "public" },
] as const;
const MODEL_W = 200;
const MODEL_GAP = 50;

/**
 * Question 3. What helps a new analyst helps an assistant, which won't ask.
 * The page's YAML, read as the assistant reads it: the grain and the metric
 * to use; the tests that prove what it claims (each passes on the page's
 * orders, and the statuses are exactly the three listed); access, so the
 * assistant reaches only the public mart; metrics and freshness. Then the
 * caution: the description is an input, and three words cut from it move
 * net revenue from 440.00 to 1190.00.
 */
export const ReadyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("ready").from;
  const qAt = n.word("ready", "Question three");
  const textAt = n.word("ready", "What makes a dbt project");
  const helpsAt = n.word("ready", "Everything that helps a new analyst");
  const gapsAt = n.word("ready", "less tolerance for gaps");
  const askAt = n.word("ready", "won't ask");
  const describeAt = n.word("ready-desc", "Describe every public model");
  const grainAt = n.word("ready-desc", "the grain");
  const perOrderAt = n.word("ready-desc", "one row per order");
  const useAt = n.word("ready-desc", "how to use it");
  const metricAt = n.word("ready-desc", "the net revenue metric");
  const testAt = n.word("ready-tests", "Test what the descriptions claim");
  const uniqueAt = n.word("ready-tests", "the key unique and not null");
  const relAt = n.word("ready-tests", "relationships for foreign keys");
  const acceptedAt = n.word("ready-tests", "accepted values");
  const knowsAt = n.word("ready-tests", "so the assistant knows");
  const valueAt = [n.word("ready-tests", "completed"), n.word("ready-tests", "refunded"), n.word("ready-tests", "cancelled")];
  const accessFrom = n.beat("ready-access").from;
  const markAt = n.word("ready-access", "Mark staging and intermediate models");
  const privateAt = n.word("ready-access", "private or protected");
  const exposeAt = n.word("ready-access", "expose only the public marts");
  const removesAt = n.word("ready-access", "removes the wrong choice");
  const restAt = n.word("ready-rest", "Put every number the business argues about");
  const freshAt = n.word("ready-rest", "check source freshness");
  const asOfAt = n.word("ready-rest", "as of when");
  const staleAt = n.word("ready-rest", "refuse to answer from stale data");
  const inputFrom = n.beat("ready-input").from;
  const inputAt = n.word("ready-input", "documentation is now an input");
  const dropAt = n.word("ready-input", "Drop the words");
  const letterAt = n.word("ready-input", "follows it to the letter");
  const reportsAt = n.word("ready-input", "eleven hundred ninety");
  const reviewAt = n.word("ready-review", "review them like code");
  const end = n.beat("ready-review").to;

  const lines = READY.yaml;
  const top = y(342);
  const width = listingWidth(lines, SIZE);
  const passOf = (test: keyof typeof READY.tests) => READY.tests[test].failing === 0;
  const keyTests = spanAt(lines, "data_tests: [unique, not_null]", "[unique, not_null]", X0, top, SIZE);
  const valuesLine = lines.find((l) => l.includes("values: ["))!;
  const valuesSpan = spanAt(lines, valuesLine, valuesLine.trim(), X0, top, SIZE);
  const desc = spanAt(lines, READY.description, READY.description, X0, top, SIZE);

  // The access diagram.
  const accessTop = top;
  const modelTop = accessTop + h(108);
  const modelH = h(62);
  const modelX = (i: number) => R_X + i * (MODEL_W + MODEL_GAP);
  const asstTop = modelTop + modelH + h(96);
  const padlock = artBox("ae-ai-semantic-layer-padlock", 92);
  const restTop = y(758);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={perOrderAt} level={-33} />
      <Sfx name="el-tap" at={metricAt} level={-33} />
      <Sfx name="el-tap" at={uniqueAt + 10} level={-31} />
      <Sfx name="el-tap" at={acceptedAt + 10} level={-31} />
      {MODELS.map((m, i) => (
        <Sfx key={m.name} name="el-tap" at={markAt + i * 5} level={-33} />
      ))}
      <Sfx name="el-pop" at={privateAt} level={-30} />
      <Sfx name="el-pencil" at={exposeAt + 8} level={-35} />
      <Sfx name="el-scratch" at={dropAt + 8} level={-34} />
      <Sfx name="el-tap" at={reportsAt} level={-30} />
      <Sfx name="el-chime" at={reviewAt + 6} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={66}>
          What makes a dbt project &ldquo;AI-ready&rdquo;?
        </QuestionCard>
        <Ink at={helpsAt} dur={16} style={{ left: X0, top: y(266) }}>
          <span style={line(28, INK)}>
            What helps a new analyst helps an assistant,{" "}
            <span style={{ opacity: ease(frame, gapsAt - 2, 12) }}>
              with less tolerance for gaps: <Mark at={askAt}>it won&apos;t ask.</Mark>
            </span>
          </span>
        </Ink>

        {/* The page's YAML, read as an assistant reads it. */}
        <Listing
          lines={lines}
          x={X0}
          top={top}
          width={width}
          size={SIZE}
          lang="yaml"
          at={helpsAt + 12}
          step={2}
          marks={[
            { line: "One row per order.", text: "One row per order.", at: perOrderAt, out: testAt },
            { line: "use the net_revenue metric", text: "use the net_revenue metric", at: metricAt, out: testAt },
            { line: "data_tests: [unique, not_null]", text: "[unique, not_null]", at: uniqueAt, out: acceptedAt },
            { line: "- accepted_values:", at: acceptedAt, out: knowsAt },
            { line: valuesLine, at: acceptedAt + 4, out: knowsAt },
            ...READY.accepted.map((v, i) => ({ line: valuesLine, text: v, at: valueAt[i], out: accessFrom })),
            { line: "access: public", at: exposeAt, out: inputFrom },
            { line: READY.description, text: READY.cut, at: dropAt + 8, color: INK, kind: "strike" as const },
          ]}
        />
        {/* Each test passes on the page's orders. */}
        <Ink at={uniqueAt + 10} dur={12} style={{ left: keyTests.x1 + 28, top: keyTests.mid - 17 }}>
          <Chip tone="green" size={21}>
            {passOf("unique") && passOf("not_null") ? "pass" : "fail"}
          </Chip>
        </Ink>
        <Ink at={acceptedAt + 10} dur={12} style={{ left: valuesSpan.x1 + 28, top: valuesSpan.mid - 17 }}>
          <Chip tone="green" size={21}>
            {passOf("accepted_values") ? "pass" : "fail"}
          </Chip>
        </Ink>

        {/* What the YAML gives the assistant: descriptions, then tests. */}
        <Clear at={accessFrom - 4}>
          <Ink at={describeAt} dur={14} style={{ left: R_X, top }}>
            <div style={{ ...line(26, INK), fontWeight: 500 }}>Descriptions</div>
          </Ink>
          <Ink at={grainAt} dur={12} style={{ left: R_X, top: top + h(42) }}>
            <span style={line(23, INK_SOFT)}>
              The grain, <span style={{ opacity: ease(frame, useAt, 10) }}>and how to use it</span>
            </span>
          </Ink>
          <Ink at={testAt} dur={14} style={{ left: R_X, top: top + h(128) }}>
            <div style={{ ...line(26, INK), fontWeight: 500 }}>Tests for what they claim</div>
          </Ink>
          {[
            { t: "Key: unique, not null", at: uniqueAt },
            { t: "Foreign keys: relationships", at: relAt },
            { t: "Status: accepted values", at: acceptedAt },
          ].map((r, i) => (
            <Ink key={r.t} at={r.at} dur={12} style={{ left: R_X, top: top + h(170) + i * h(38) }}>
              <span style={line(23, INK_SOFT)}>{r.t}</span>
            </Ink>
          ))}
          <Ink at={knowsAt} dur={12} style={{ left: R_X, top: top + h(300) }}>
            <span style={line(23, INK)}>
              Real statuses:{" "}
              {READY.statuses.length === READY.accepted.length ? (
                READY.accepted.map((v, i) => (
                  <span key={v} style={{ opacity: ease(frame, valueAt[i], 10) }}>
                    {v}
                    {i < READY.accepted.length - 1 ? ", " : ""}
                  </span>
                ))
              ) : (
                <span style={{ color: ACCENT_INK }}>not the listed ones</span>
              )}
            </span>
          </Ink>
        </Clear>

        {/* Access: only the public mart is the assistant's to read. */}
        <Clear at={inputFrom - 4}>
          <Ink at={markAt} dur={14} style={{ left: R_X, top: accessTop }}>
            <div style={{ ...line(26, INK), fontWeight: 500 }}>Access boundaries</div>
          </Ink>
          {MODELS.map((m, i) => (
            <React.Fragment key={m.name}>
              <Box x={modelX(i)} y={modelTop} w={MODEL_W} h={modelH} at={markAt + i * 5} title={m.name} mono size={22} toTone={m.access === "public" ? "ok" : "soft"} toAt={m.access === "public" ? exposeAt : privateAt} />
              <Ink at={m.access === "public" ? exposeAt : privateAt + i * 4} dur={12} style={{ left: modelX(i), width: MODEL_W, top: modelTop - h(50), textAlign: "center" }}>
                <Chip tone={m.access === "public" ? "green" : "gray"} size={21}>
                  {m.access}
                </Chip>
              </Ink>
              {i < MODELS.length - 1 ? (
                <Flow points={[[modelX(i) + MODEL_W + 6, modelTop + modelH / 2], [modelX(i + 1) - 6, modelTop + modelH / 2]]} at={markAt + 4 + i * 5} color={INK_SOFT} head={11} width={2} />
              ) : null}
            </React.Fragment>
          ))}
          <Spot id="ae-ai-semantic-layer-padlock" at={privateAt} left={R_X + MODEL_W + MODEL_GAP / 2 - padlock.width / 2} top={modelTop + modelH + 70} {...padlock} />
          <Box x={modelX(2)} y={asstTop} w={MODEL_W} h={modelH} at={exposeAt} title="Assistant" size={24} />
          <Flow points={[[modelX(2) + MODEL_W / 2, asstTop - 8], [modelX(2) + MODEL_W / 2, modelTop + modelH + 8]]} at={exposeAt + 8} />
          <Ink at={removesAt} dur={14} style={{ left: modelX(2), top: asstTop + modelH + h(22) }}>
            <span style={line(23, INK_SOFT)}>No wrong model to choose</span>
          </Ink>

          {/* The rest: metrics in the layer, freshness. */}
          <Ink at={restAt} dur={14} style={{ left: R_X, top: restTop }}>
            <span style={line(24, INK)}>
              <b style={{ fontWeight: 500 }}>Semantic layer:</b> every number the business argues about
            </span>
          </Ink>
          <Ink at={freshAt} dur={14} style={{ left: R_X, top: restTop + h(44) }}>
            <span style={line(24, INK)}>
              <b style={{ fontWeight: 500 }}>Source freshness:</b>{" "}
              <span style={{ opacity: ease(frame, asOfAt - 2, 10) }}>answer &ldquo;as of&rdquo;,</span>{" "}
              <span style={{ opacity: ease(frame, staleAt, 10) }}>refuse stale data</span>
            </span>
          </Ink>
        </Clear>

        {/* The caution: the description is an input. */}
        <Ink at={inputAt} dur={14} style={{ left: R_X, top }}>
          <div style={{ ...line(26, INK), fontWeight: 500 }}>Documentation is an input</div>
        </Ink>
        <Flow points={[[desc.x1 + 14, desc.mid], [R_X - 14, desc.mid]]} at={letterAt - 10} color={INK_SOFT} head={11} width={2} />
        <Ink at={letterAt - 6} dur={12} style={{ left: R_X, top: desc.mid - h(64) }}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>Net revenue, followed to the letter</span>
        </Ink>
        <Swap at={reportsAt} left={R_X} top={desc.mid - 22} from={READY.asWritten.toFixed(2)} to={READY.withoutCut.toFixed(2)} fromColor={OK_INK} toColor={ACCENT_INK} showAt={letterAt} />
        <Ink at={reviewAt - 4} dur={16} style={{ left: R_X, top: desc.mid + h(118) }}>
          <span style={{ ...line(30, INK), fontWeight: 500 }}>
            <Mark at={reviewAt + 4}>Review descriptions like code</Mark>
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};

/** A value that shows from `showAt`, then gives way to another on `at`. */
const Swap: React.FC<{ at: number; showAt: number; left: number; top: number; from: string; to: string; fromColor: string; toColor: string }> = ({
  at,
  showAt,
  left,
  top,
  from,
  to,
  fromColor,
  toColor,
}) => {
  const frame = useCurrentFrame();
  const shown = ease(frame, showAt, 12);
  const k = ease(frame, at, 12);
  if (shown <= 0) return null;
  const style: React.CSSProperties = { ...note(40, fromColor), fontWeight: 500, position: "absolute", left: 0, top: 0, whiteSpace: "nowrap" };
  return (
    <div style={{ position: "absolute", left, top, opacity: shown }}>
      <span style={{ ...style, opacity: 1 - k, transform: `translateY(${-k * 14}px)` }}>{from}</span>
      <span style={{ ...style, color: toColor, opacity: k, transform: `translateY(${(1 - k) * 14}px)` }}>{to}</span>
      <span style={{ ...note(23, INK_SOFT), position: "absolute", left: 0, top: 62, whiteSpace: "nowrap", opacity: ease(frame, at + 16, 12) }}>As written, {from}</span>
    </div>
  );
};
