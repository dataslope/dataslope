import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { body, headline, INK, INK_SOFT, label } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HEADS } from "./data";
import { Arrow, Coin, Headline, Kicker, STAT_INK } from "./parts";

const ROW_Y = [370, 470, 570, 670];
const COIN_X = [470, 540];

/**
 * Part 5 opens: a random variable as a rule from outcomes to numbers, on the
 * lesson's first figure, two flips and the number of heads.
 */
export const RvScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const rvFrom = n.beat("rv").from;
  const numberAt = n.word("rv", "a number");
  const flipAt = n.word("rv", "Flip two coins");
  const countAt = n.word("rv", "count the heads");
  const twoAt = n.word("rv", "Two");
  const oneAt = n.word("rv", "one");
  const one2At = n.word("rv", "one", { nth: 2 });
  const zeroAt = n.word("rv", "zero");
  const outcomes = Object.keys(HEADS);
  const cues = [twoAt, oneAt, one2At, zeroAt];

  return (
    <AbsoluteFill>
      {/* ── Sound: the four outcomes, then each number as it is said ── */}
      <Sfx name="el-pop" at={flipAt - 2} level={-30} />
      {cues.map((c, i) => (
        <Sfx key={i} name="el-tap" at={c - 4} level={-29} />
      ))}

      <Kicker at={rvFrom - 10}>Random variables and expected value</Kicker>
      <Headline top={y(150)} first="A random variable" second="puts a number on each outcome." firstAt={rvFrom - 6} secondAt={numberAt - 2} />

      <Ink at={flipAt - 6} dur={12} style={{ left: COIN_X[0] - 30, top: y(296), whiteSpace: "nowrap" }}>
        <span style={label(23, INK_SOFT)}>Two flips</span>
      </Ink>
      <Ink at={countAt - 4} dur={12} style={{ left: 900, top: y(296), whiteSpace: "nowrap" }}>
        <span style={label(23, INK_SOFT)}>X, the number of heads</span>
      </Ink>
      {outcomes.map((o, i) => (
        <React.Fragment key={o}>
          {o.split("").map((c, k) => (
            <Coin key={k} x={COIN_X[k]} y={y(ROW_Y[i])} heads={c === "H"} at={flipAt - 2 + i * 4 + k * 2} r={28} />
          ))}
          <Arrow from={[600, y(ROW_Y[i])]} to={[860, y(ROW_Y[i])]} at={cues[i] - 8} dur={10} color={INK_SOFT} />
          <Ink at={cues[i] - 2} dur={12} style={{ left: 900, top: y(ROW_Y[i]) - 42 }}>
            <span style={{ ...headline(72), color: STAT_INK }}>{HEADS[o]}</span>
          </Ink>
        </React.Fragment>
      ))}
      <Note at={one2At + 4} x={1060} y={y(ROW_Y[1]) + 14} width={560}>
        <span style={{ ...body(32, true), color: INK }}>Two outcomes, one number: that&apos;s allowed.</span>
      </Note>
      <Note at={zeroAt + 8} x={1060} y={y(ROW_Y[3]) - 24} width={600}>
        <span style={{ ...body(32, true), color: INK }}>Now there&apos;s something to average.</span>
      </Note>
    </AbsoluteFill>
  );
};
