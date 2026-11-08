import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, PAPER, headline, label } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ACCENT_INK, Box, Drift, Flow, Line, Mark, Mark2, OK_INK, Strike, VRule, X0 } from "./parts";

const ROW_TOP = 290;
const PITCH = 100;
const TILE = 72;
const NAME_X = 246;
const EX_X = 830;
const BOX_H = 54;

/**
 * Question 4. The five letters down the left, each filled with its shop
 * example as it is read: the invoice with one reason to change, a new
 * shipping option arriving as new code, the square from question 3, the
 * stock screen on a small read-only interface, and an arrow to the next
 * question. Then all five set back behind one line: guidelines, not laws.
 */
export const SolidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("solid").from;
  const qAt = n.word("solid", "Question four");
  const textAt = n.word("solid", "Walk through the SOLID principles");
  const sAt = n.word("solid", "Single responsibility");
  const invoiceAt = n.word("solid", "The invoice changes only");
  const layoutAt = n.word("solid", "when its layout does");
  const oAt = n.word("solid-o", "Open-closed");
  const newAt = n.word("solid-o", "A new shipping option arrives");
  const newCodeAt = n.word("solid-o", "as new code");
  const notEditAt = n.word("solid-o", "not as an edit to what works");
  const lAt = n.word("solid-l", "Liskov substitution");
  const couldntAt = n.word("solid-l", "which the square couldn't");
  const iAt = n.word("solid-i", "Interface segregation");
  const stockAt = n.word("solid-i", "The stock screen only reads stock");
  const refundsAt = n.word("solid-i", "an interface that also issues refunds");
  const dAt = n.word("solid-d", "And dependency inversion");
  const nextAt = n.word("solid-d", "That's the next question");
  const lawsAt = n.word("solid-laws", "They're guidelines");
  const notLawsAt = n.word("solid-laws", "not laws");
  const everywhereAt = n.word("solid-laws", "Applied everywhere");
  const overAt = n.word("solid-laws", "the over-engineering this video ends on");
  const end = n.beat("solid-laws").to;

  const ROWS = [
    { letter: "S", at: sAt, name: "Single responsibility", def: "a class has one reason to change" },
    { letter: "O", at: oAt, name: "Open-closed", def: "open for extension, closed for modification" },
    { letter: "L", at: lAt, name: "Liskov substitution", def: "subtypes stand in for their base type" },
    { letter: "I", at: iAt, name: "Interface segregation", def: "many small interfaces over one fat one" },
    { letter: "D", at: dAt, name: "Dependency inversion", def: "depend on abstractions, inject the concrete" },
  ];
  const top = (i: number) => y(ROW_TOP + i * PITCH);
  const mid = (i: number) => top(i) + TILE / 2;
  const exTop = (i: number) => mid(i) - BOX_H / 2;
  const dim = lawsAt - 2;

  return (
    <AbsoluteFill>
      {ROWS.map((r) => (
        <Sfx key={r.letter} name="el-tap" at={r.at} level={-31} />
      ))}
      <Sfx name="el-whoosh" at={newAt + 4} level={-35} />
      <Sfx name="el-scratch" at={couldntAt + 4} level={-32} />
      <Sfx name="el-scratch" at={refundsAt + 8} level={-32} />
      <Sfx name="el-pencil" at={notLawsAt} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4}>
          Walk through the SOLID principles.
        </QuestionCard>

        {ROWS.map((r, i) => {
          const fill = ease(frame, r.at, 12);
          const d = ease(frame, dim, 14) * 0.6;
          return (
            <React.Fragment key={r.letter}>
              <div
                style={{
                  position: "absolute",
                  left: X0 + 6,
                  top: top(i) - 6,
                  width: TILE,
                  height: TILE,
                  display: "flex",
                  alignItems: "center",
                  opacity: ease(frame, textAt + i * 3, 10) * (1 - d),
                }}
              >
                <span style={{ ...headline(60), color: `color-mix(in srgb, ${BLUE_INK} ${Math.round(35 + fill * 65)}%, ${PAPER})`, fontWeight: 600 }}>{r.letter}</span>
              </div>
              <Line x={NAME_X} y={top(i) - 2} at={r.at} size={26} weight={600} dim={dim}>
                {r.name}
              </Line>
              <Line x={NAME_X} y={top(i) + 36} at={r.at + 8} size={22} color={INK_SOFT} weight={500} dim={dim}>
                {r.def}
              </Line>
            </React.Fragment>
          );
        })}

        <VRule x={(NAME_X + 500 + EX_X) / 2} top={top(0) - 4} bottom={top(4) + 66} at={invoiceAt} dim={dim} />

        {/* S: the invoice. */}
        <Box x={EX_X} y={exTop(0)} w={170} h={BOX_H} at={invoiceAt} title="Invoice" size={23} tone="ok" dim={dim} />
        <Line x={EX_X + 200} y={mid(0) - 16} at={layoutAt - 6} size={24} dim={dim}>
          changes only when <Mark at={layoutAt}>its layout</Mark> does
        </Line>

        {/* O: a new shipping option snaps in beside the two that work. */}
        {["flat rate", "by weight"].map((t, k) => (
          <Box key={t} x={EX_X + k * 190} y={exTop(1)} w={170} h={BOX_H} at={oAt + 8 + k * 4} title={t} size={22} dim={dim} />
        ))}
        <Box x={EX_X + 380 + 30 * (1 - ease(frame, newAt + 4, 14))} y={exTop(1)} w={190} h={BOX_H} at={newAt + 4} title="+ new option" size={22} tone="ok" dashed dim={dim} />
        <Line x={EX_X + 610} y={mid(1) - 16} at={newCodeAt} size={24} color={OK_INK} weight={650} dim={dim}>
          new code<span style={{ color: INK, fontWeight: 500, opacity: ease(frame, notEditAt, 10) }}>, not an edit</span>
        </Line>

        {/* L: the square, from question 3. */}
        <Box x={EX_X} y={exTop(2)} w={150} h={BOX_H} at={lAt + 8} title="Square" size={22} tone="bad" dim={dim} />
        <Flow points={[[EX_X + 156, mid(2)], [EX_X + 232, mid(2)]]} at={lAt + 12} dur={8} width={2.2} head={12} dim={dim} />
        <Box x={EX_X + 240} y={exTop(2)} w={250} h={BOX_H} at={lAt + 14} title="where a rectangle fits" size={21} dashed dim={dim} />
        <Mark2 at={couldntAt + 4} kind="cross" size={32} style={{ left: EX_X + 512, top: mid(2) - 16, opacity: 1 - ease(frame, dim, 14) * 0.6 }} />
        <Line x={EX_X + 566} y={mid(2) - 16} at={couldntAt + 2} size={24} color={ACCENT_INK} weight={650} dim={dim}>
          the square couldn&apos;t
        </Line>

        {/* I: the stock screen, on a small interface. */}
        <Box x={EX_X} y={exTop(3)} w={190} h={BOX_H} at={stockAt} title="Stock screen" size={22} dim={dim} />
        <Flow points={[[EX_X + 196, mid(3)], [EX_X + 272, mid(3)]]} at={stockAt + 8} dur={8} width={2.2} head={12} dim={dim} />
        <Box x={EX_X + 280} y={exTop(3)} w={180} h={BOX_H} at={stockAt + 10} title="reads stock" size={22} tone="ok" dim={dim} />
        <Box x={EX_X + 520} y={exTop(3)} w={300} h={BOX_H} at={refundsAt} size={22} tone="bad" dashed dim={dim}>
          <span style={{ ...label(22, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
            <Strike at={refundsAt + 10}>stock and refunds</Strike>
          </span>
        </Box>

        {/* D: on to question 5. */}
        <Line x={EX_X} y={mid(4) - 16} at={nextAt} size={24} weight={600} color={BLUE_INK} dim={dim}>
          → the next question
        </Line>

        {/* Guidelines, not laws. */}
        <Line x={X0} y={y(800)} at={lawsAt} size={30} weight={600}>
          Guidelines for low coupling and high cohesion, <Mark at={notLawsAt}>not laws</Mark>
        </Line>
        <Line x={X0} y={y(800) + 50} at={everywhereAt} size={24} color={INK_SOFT} weight={500}>
          applied everywhere, they become <span style={{ color: ACCENT_INK, fontWeight: 650, opacity: ease(frame, overAt, 10) }}>over-engineering</span>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
