import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { SWITCH } from "./data";
import { Box, DATA, DATA_TINT, Drift, head, LineArrow, madeUp, Mark, MARK_OK, OK, OK_INK, say, X0 } from "./parts";

const T = { x: X0, top: 360, rowH: 52, cols: [150, 120, 100, 140, 160] };
const BG = { x1: 1010, x2: 1430, w: 380, top: 470, h: 130 };

/**
 * Question 5. Left: llm-meaning's five-word space (the course lesson's
 * vectors, read from that video's measurements.json), and a stand-in second
 * model that learned the same meanings with its axes rotated one place. Its
 * kitten (0.1, 0.9, 0.9) is searched against the first model's index by
 * distance, and lands nearest truck (check.mjs), the wrong neighbour, in
 * red. Right: the blue-green switch: the alias on the old index, a new
 * version built beside it, backfilled and compared, the alias moved
 * atomically, the old one kept for rollback. Last, every vector tagged with
 * its model and version.
 */
export const SwitchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("switch").from;
  const qAt = n.word("switch", "Question");
  const textAt = n.word("switch", "What changes when you switch");
  const allAt = n.word("switch", "Everything gets re-embedded");
  const spaceAt = n.word("switch", "Each model has its own space");
  const tinyAt = n.word("switch-demo", "a tiny space of five words");
  const pretendAt = n.word("switch-demo", "Pretend a second model");
  const axesAt = n.word("switch-demo", "its axes in another order");
  const kittenAt = n.word("switch-demo", "Its kitten");
  const searchAt = n.word("switch-demo", "searched in the old index");
  const truckAt = n.word("switch-demo", "lands nearest truck");
  const bgAt = n.word("switch-bg", "a blue-green deployment");
  const buildAt = n.word("switch-bg", "build a new index version");
  const backfillAt = n.word("switch-bg", "backfill and compare");
  const compareAt = n.word("switch-bg", "compare");
  const aliasAt = n.word("switch-bg", "switch an alias atomically");
  const rollbackAt = n.word("switch-bg", "keep the old one for rollback");
  const tagAt = n.word("switch-tag", "store the model version on every vector");
  const silentAt = n.word("switch-tag", "can't happen silently");
  const end = n.beat("switch-tag").to;

  const colX = (j: number) => T.x + T.cols.slice(0, j).reduce((a, b) => a + b, 0);
  const rowTop = (i: number) => y(T.top) + 44 + i * T.rowH;
  const dist = SWITCH.dist as Record<string, number>;
  const nearest = SWITCH.nearest;
  const qTop = rowTop(SWITCH.words.length) + 30;

  const cellStyle = (j: number): React.CSSProperties => ({
    position: "absolute",
    left: colX(j) + 12,
    fontFamily: j === 0 ? note(24).fontFamily : MONO,
    fontSize: j === 0 ? 25 : 23,
    fontWeight: j === 0 ? 600 : 500,
    fontVariantLigatures: "none",
    whiteSpace: "nowrap",
  });

  // The blue-green switch.
  const swing = ease(frame, aliasAt + 2, 14);
  const pillX = (BG.x1 + BG.x2 + BG.w) / 2;
  const pillY = y(345);
  const target = BG.x1 + BG.w / 2 + (BG.x2 - BG.x1) * swing;
  const fill = ease(frame, backfillAt, 26);
  const bgTop = y(BG.top);
  const tagStyle: React.CSSProperties = { fontFamily: MONO, fontSize: 20, fontWeight: 600, fontVariantLigatures: "none" };

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={tinyAt + 4} level={-36} />
      <Sfx name="el-tap" at={kittenAt + 2} level={-35} />
      <Sfx name="el-sprinkle" at={searchAt + 4} level={-36} />
      <Sfx name="el-scratch" at={truckAt + 6} level={-33} />
      <Sfx name="el-pop" at={buildAt + 2} level={-34} />
      <Sfx name="el-whoosh" at={aliasAt + 2} level={-34} />
      <Sfx name="el-chime" at={silentAt + 6} level={-35} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          What changes when you switch embedding models?
        </QuestionCard>
        <Note at={allAt} x={X0} y={y(240)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <Mark at={allAt + 4}>everything gets re-embedded</Mark>
            <span style={{ opacity: ease(frame, spaceAt - 2, 10), color: INK_SOFT }}>: each model has its own space</span>
          </span>
        </Note>

        {/* The tiny space, and a second model's kitten searched in it. */}
        <Note at={tinyAt - 2} x={T.x} y={y(T.top) - 34}>
          <span style={madeUp(20)}>a tiny space from the How LLMs Work course: five words, three numbers each</span>
        </Note>
        {["word", ...SWITCH.axes, "distance"].map((t, j) => (
          <Note key={t} at={(j === 4 ? searchAt : tinyAt) + j * 2} x={colX(j) + 12} y={y(T.top) + 8}>
            <span style={{ ...label(20, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>{t}</span>
          </Note>
        ))}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, tinyAt, 12) }}>
          <line x1={T.x} x2={colX(5)} y1={y(T.top)} y2={y(T.top)} stroke={INK} strokeWidth={2} />
          <line x1={T.x} x2={colX(5)} y1={y(T.top) + 42} y2={y(T.top) + 42} stroke={HAIRLINE} />
          <line x1={T.x} x2={colX(5)} y1={rowTop(5) + 4} y2={rowTop(5) + 4} stroke={HAIRLINE} />
        </svg>
        {SWITCH.words.map((w, i) => {
          const p = ease(frame, tinyAt + 4 + i * 3, 10);
          const dShow = ease(frame, searchAt + 6 + i * 4, 10);
          const isNear = w.word === nearest;
          const wrong = isNear ? ease(frame, truckAt + 4, 10) : 0;
          return (
            <React.Fragment key={w.word}>
              <div
                style={{
                  position: "absolute",
                  left: T.x - 6,
                  top: rowTop(i) + 4,
                  width: colX(5) - T.x + 12,
                  height: T.rowH - 8,
                  borderRadius: 6,
                  border: `2.4px solid color-mix(in srgb, ${ACCENT} ${100 * wrong}%, transparent)`,
                  background: `color-mix(in srgb, ${ACCENT} ${10 * wrong}%, transparent)`,
                }}
              />
              <div style={{ ...cellStyle(0), top: rowTop(i) + 10, color: INK, opacity: p }}>{w.word}</div>
              {w.vec.map((v, j) => (
                <div key={j} style={{ ...cellStyle(j + 1), top: rowTop(i) + 12, color: BLUE_INK, opacity: p }}>
                  {v.toFixed(1)}
                </div>
              ))}
              <div style={{ ...cellStyle(4), top: rowTop(i) + 12, color: isNear ? ACCENT_INK : INK, fontWeight: isNear ? 700 : 500, opacity: dShow }}>
                {dist[w.word].toFixed(2)}
              </div>
            </React.Fragment>
          );
        })}
        {/* The second model's kitten. */}
        <Note at={pretendAt} x={T.x} y={qTop}>
          <span style={{ ...label(20, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>
            a second model, same meanings
            <span style={{ opacity: ease(frame, axesAt - 2, 10) }}>, axes in another order: {SWITCH.newAxes.join(", ")}</span>
          </span>
        </Note>
        <div
          style={{
            position: "absolute",
            left: T.x - 6,
            top: qTop + 38,
            width: colX(4) - T.x + 12,
            height: T.rowH - 4,
            borderRadius: 8,
            background: `color-mix(in srgb, ${HIGHLIGHT} ${100 * ease(frame, kittenAt, 10)}%, ${PAPER})`,
            opacity: ease(frame, kittenAt - 2, 10),
          }}
        />
        <div style={{ ...cellStyle(0), top: qTop + 48, color: INK, opacity: ease(frame, kittenAt - 2, 10) }}>kitten</div>
        {SWITCH.kittenNew.map((v, j) => (
          <div key={j} style={{ ...cellStyle(j + 1), top: qTop + 50, color: INK, fontWeight: 650, opacity: ease(frame, kittenAt + j * 2, 10) }}>
            {v.toFixed(1)}
          </div>
        ))}
        <Note at={truckAt + 4} x={T.x} y={qTop + 112}>
          <span style={{ ...note(27, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            nearest: {nearest}
            <span style={{ ...note(22, INK_SOFT), fontWeight: 500 }}> (the old model&apos;s own kitten lands nearest {SWITCH.nearestSame})</span>
          </span>
        </Note>

        {/* The blue-green switch. */}
        <Note at={bgAt} x={BG.x1} y={y(250)}>
          <span style={head(22, INK)}>a blue-green switch</span>
        </Note>
        <div
          style={{
            position: "absolute",
            left: pillX - 90,
            top: pillY,
            width: 180,
            height: 48,
            borderRadius: 24,
            border: `2px solid ${INK}`,
            background: PAPER,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...say(23, INK, 650),
            opacity: ease(frame, bgAt + 2, 10),
          }}
        >
          alias: live
        </div>
        <LineArrow from={[pillX, pillY + 52]} to={[target, bgTop - 10]} at={bgAt + 6} color={INK} width={2.4} />
        <Box x={BG.x1} y={bgTop} w={BG.w} h={BG.h} at={bgAt + 4} tone={DATA} fill={DATA_TINT} size={25}>
          <span style={{ color: BLUE_INK }}>
            index v1
            <br />
            <span style={{ fontWeight: 500, fontSize: 22 }}>old model</span>
            <br />
            <span style={{ ...tagStyle, opacity: ease(frame, tagAt + 4, 10) }}>model=old-v1</span>
          </span>
        </Box>
        <Box x={BG.x2} y={bgTop} w={BG.w} h={BG.h} at={buildAt + 2} tone={OK} dashed={fill < 1} size={25}>
          <span style={{ color: OK_INK }}>
            index v2
            <br />
            <span style={{ fontWeight: 500, fontSize: 22 }}>new model</span>
            <br />
            <span style={{ ...tagStyle, opacity: ease(frame, tagAt + 8, 10) }}>model=new-v2</span>
          </span>
        </Box>
        {/* The backfill filling v2. */}
        <div
          style={{
            position: "absolute",
            left: BG.x2 + 3,
            top: bgTop + BG.h - 12,
            width: (BG.w - 6) * fill,
            height: 9,
            borderRadius: 4,
            background: OK,
            opacity: 0.55 * (1 - ease(frame, aliasAt, 12)),
          }}
        />
        {[
          { text: "1. build beside the old", at: buildAt },
          { text: "2. backfill", at: backfillAt },
          { text: "3. compare retrieval on both", at: compareAt + 4 },
          { text: "4. switch the alias atomically", at: aliasAt },
          { text: "5. keep v1 for rollback", at: rollbackAt },
        ].map((s, i) => (
          <Note key={s.text} at={s.at - 2} x={BG.x1} y={bgTop + BG.h + 30 + i * 44}>
            <span style={say(24, i === 3 ? INK : INK_SOFT, i === 3 ? 650 : 500)}>
              {i === 3 ? <Mark at={aliasAt + 6}>{s.text}</Mark> : s.text}
            </span>
          </Note>
        ))}
        <Note at={tagAt - 2} x={BG.x1} y={bgTop + BG.h + 30 + 5 * 44 + 22}>
          <span style={say(25, OK_INK, 650)}>
            <Mark at={tagAt + 6} color={MARK_OK}>
              every vector stores its model and version
            </Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
