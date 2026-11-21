import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, body, INK, INK_SOFT, label, note } from "../../editorial/style";
import { badgeStyle, ColumnRule, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { GRAIN } from "./data";
import { Drift, Kicker, Mark, SERIES, Spot, spotH, X0 } from "./parts";

/** The hero at most half its pixels, as a 4K render needs: 1449x1024 → 640x452. */
const HERO_W = 640;
const HERO_X = 1150;

/**
 * The opening, the plan's 0 to 1 join written fresh: a model starts from one
 * sentence, what one row means. "One row per order line." is set in the
 * serif, a second grain under it; the sentence is marked as the grain is
 * named, and the order-line fact's columns line up under it as "the rest of
 * the model is built on it". Then the round: twenty-two questions, nine
 * worked through in Postgres and thirteen quick ones. The sparrow, the
 * video's hero, holds its one grain on the right.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  const startAt = n.word("hook", "Every model starts");
  const sentenceAt = n.word("hook", "one sentence");
  const meansAt = n.word("hook", "what one row means");
  const lineAt = n.word("hook", "One row per order line");
  const accountAt = n.word("hook", "one row per account per month");
  const grainAt = n.word("hook", "That sentence is the grain");
  const restAt = n.word("hook", "the rest of the model");
  const builtAt = n.word("hook", "is built on it");
  const twentyAt = n.word("plan", "Twenty-two questions");
  const topicAt = n.word("plan", "on facts, dimensions and grain");
  const nineAt = n.word("plan", "Nine are worked through");
  const postgresAt = n.word("plan", "on real tables in Postgres");
  const quickAt = n.word("plan", "thirteen quick ones");
  const end = n.beat("plan").to;

  // The order-line fact's columns, from the grain scene's table.
  const columns = GRAIN.lines.cols.filter((c) => c !== "shipping_fee");
  const colAt = (i: number) => builtAt + i * 4;
  const heroH = spotH("sparrow", HERO_W);

  const PLAN_Y = 700;
  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={sentenceAt} level={-30} />
      <Sfx name="el-pencil" at={lineAt + 2} level={-36} />
      <Sfx name="el-tap" at={accountAt} level={-32} />
      <Sfx name="el-pencil" at={grainAt + 4} level={-35} />
      {columns.map((c, i) => (
        <Sfx key={c} name="el-tap" at={colAt(i)} level={-33} />
      ))}
      <Sfx name="el-chime" at={twentyAt} level={-35} />
      <Sfx name="el-tap" at={nineAt} level={-31} />
      <Sfx name="el-tap" at={quickAt} level={-31} />

      <Drift from={0} to={end + 30}>
        <Kicker at={startAt}>{SERIES} · Facts, dimensions and grain</Kicker>

        {/* What one row means, the sentence a model starts from. */}
        <Note at={meansAt - 4} x={X0} y={y(250)}>
          <span style={{ ...label(26, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>
            What one row means
            <span style={{ opacity: ease(frame, grainAt + 2, 12), color: INK }}>: the grain</span>
          </span>
        </Note>
        <Note at={lineAt - 2} x={X0 - 4} y={y(300)}>
          <span style={{ ...body(80), color: INK, whiteSpace: "nowrap" }}>
            <Mark at={grainAt + 4} dur={18}>
              One row per order line.
            </Mark>
          </span>
        </Note>
        <Note at={accountAt - 2} x={X0} y={y(420)}>
          <span style={{ ...note(30, INK_SOFT), whiteSpace: "nowrap" }}>Or one row per account per month.</span>
        </Note>

        {/* The rest of the model, built on it: the order-line fact's columns. */}
        <Note at={restAt} x={X0} y={y(500)}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>Every column is read at that grain</span>
        </Note>
        <div style={{ position: "absolute", left: X0, top: y(548), display: "flex", gap: 14, fontSize: 24 }}>
          {columns.map((c, i) => {
            const p = Math.min(1, pop(frame, colAt(i), fps, 14));
            return (
              <span
                key={c}
                style={{
                  ...badgeStyle("blue", 24),
                  fontFamily: MONO,
                  fontWeight: 500,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 10}px)`,
                }}
              >
                {c}
              </span>
            );
          })}
        </div>

        {/* The round. */}
        <Note at={twentyAt - 2} x={X0} y={y(PLAN_Y)}>
          <span style={{ ...note(32, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            <span style={{ color: BLUE_INK }}>
              <Num>22</Num> questions
            </span>
            <span style={{ opacity: ease(frame, topicAt, 12) }}> on facts, dimensions and grain</span>
          </span>
        </Note>
        <div style={{ position: "absolute", left: X0, top: y(PLAN_Y + 66), display: "flex", alignItems: "flex-start", gap: 64, fontSize: 27 }}>
          <div style={{ opacity: ease(frame, nineAt - 2, 12), transform: `translateX(${(1 - ease(frame, nineAt - 2, 12)) * -16}px)` }}>
            <div style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
              <b style={{ color: BLUE_INK }}>
                <Num>9</Num>
              </b>{" "}
              worked through
            </div>
            <div style={{ ...note(23, INK_SOFT), marginTop: 10, whiteSpace: "nowrap", opacity: ease(frame, postgresAt, 12) }}>
              On real tables, in Postgres
            </div>
          </div>
          <div style={{ position: "relative", width: 1, alignSelf: "stretch" }}>
            <ColumnRule x={0} top={0} height={74} at={quickAt} />
          </div>
          <div style={{ opacity: ease(frame, quickAt - 2, 12), transform: `translateX(${(1 - ease(frame, quickAt - 2, 12)) * -16}px)` }}>
            <div style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
              <b style={{ color: BLUE_INK }}>
                <Num>13</Num>
              </b>{" "}
              quick ones
            </div>
            <div style={{ ...note(23, INK_SOFT), marginTop: 10, whiteSpace: "nowrap" }}>To close the round</div>
          </div>
        </div>

        <Spot art="sparrow" at={sentenceAt} left={HERO_X} top={y(560) - heroH / 2} width={HERO_W} />
      </Drift>
    </AbsoluteFill>
  );
};
