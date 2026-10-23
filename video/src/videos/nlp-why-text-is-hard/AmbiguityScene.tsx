import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ART } from "./data";
import { FIG_Y, Headline, Kicker, Mark, Spot, X0 } from "./parts";

const ROW_Y = [338, 528, 718];
const EX_X = 480;

/** Two readings of one example, side by side: "the side of a river  or
 *  a place for money". Each inks on its own word; `hl` marks one of them. */
const Readings: React.FC<{
  a: string;
  b: string;
  aAt: number;
  bAt: number;
  top: number;
  hlA?: { at: number; out?: number };
}> = ({ a, b, aAt, bAt, top, hlA }) => (
  <div style={{ position: "absolute", left: EX_X, top, display: "flex", alignItems: "baseline", gap: 22, whiteSpace: "nowrap" }}>
    <Ink at={aAt} dur={14} style={{ position: "relative" }}>
      <span style={{ ...body(32, true), color: INK }}>{hlA ? <Mark at={hlA.at} out={hlA.out}>{a}</Mark> : a}</span>
    </Ink>
    <Ink at={bAt - 6} dur={10} style={{ position: "relative" }}>
      <span style={{ ...label(22, INK_SOFT) }}>or</span>
    </Ink>
    <Ink at={bAt} dur={14} style={{ position: "relative" }}>
      <span style={{ ...body(32, true), color: INK }}>{b}</span>
    </Ink>
  </div>
);

/** A row's name, inked on the word that names it, over what it means, which
 *  arrives with the beat that explains it. */
const RowName: React.FC<{ name: string; gist: string; nameAt: number; gistAt: number; top: number }> = ({
  name,
  gist,
  nameAt,
  gistAt,
  top,
}) => (
  <>
    <Ink at={nameAt - 2} dur={14} style={{ left: X0, top, whiteSpace: "nowrap" }}>
      <span style={{ ...label(30, INK), fontWeight: 700 }}>{name}</span>
    </Ink>
    <Ink at={gistAt} dur={16} style={{ left: X0, top: top + 48, whiteSpace: "nowrap" }}>
      <span style={{ ...note(23, INK_SOFT) }}>{gist}</span>
    </Ink>
  </>
);

/**
 * Part 1, ambiguity: the lesson's three kinds, one row each, each named only
 * once the narration names it. Lexical: "bank". Structural: "I saw the man
 * with the telescope". Referential: the trophy that did not fit in the case.
 */
export const AmbiguityScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("ambiguity").from;
  const noticeAt = n.word("ambiguity", "rarely notice");
  const lexFrom = n.beat("lexical").from;
  const bankAt = n.word("lexical", "bank");
  const riverAt = n.word("lexical", "side of a river");
  const moneyAt = n.word("lexical", "money");
  const lexicalAt = n.word("lexical", "lexical");
  const strFrom = n.beat("structural").from;
  const sawAt = n.word("structural", "I saw");
  const useAt = n.word("structural", "use it");
  const holdingAt = n.word("structural", "holding");
  const structuralAt = n.word("structural", "structural");
  const refFrom = n.beat("referential").from;
  const trophyAt = n.word("referential", "trophy");
  const whatAt = n.word("referential", "What was");
  const bigAt = n.word("referential", "big", { nth: 2 });
  const knowAt = n.word("answer", "trophy");
  const ideaAt = n.word("answer", "no idea");
  const referentialAt = n.word("answer", "referential");

  const row = (i: number) => y(ROW_Y[i]);
  const rules = [from + 2, from + 6, from + 10];

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-pencil" at={from} level={-36} />
      <Sfx name="el-tap" at={bankAt - 2} level={-30} />
      <Sfx name="el-tap" at={sawAt - 2} level={-30} />
      <Sfx name="el-pop" at={sawAt + 4} level={-32} />
      <Sfx name="el-tap" at={trophyAt - 2} level={-30} />
      <Sfx name="el-pop" at={trophyAt + 4} level={-32} />
      {[lexicalAt, structuralAt, referentialAt].map((t) => (
        <Sfx key={t} name="el-pencil" at={t} level={-35} />
      ))}

      <Kicker at={from - 10}>Text is ambiguous</Kicker>
      <Headline lead="Full of ambiguity," turn="and we rarely notice." at={from - 6} turnAt={noticeAt - 6} size={64} />
      <FigLabel n="4" title="Three kinds of ambiguity" at={from + 2} x={X0} y={y(FIG_Y)} />

      {/* Row rules: the figure's frame arrives with the scene. */}
      {ROW_Y.map((r, i) => (
        <div
          key={r}
          style={{
            position: "absolute",
            left: X0,
            top: y(r) - 26,
            width: 1680 * ease(frame, rules[i], 16),
            height: 1,
            background: HAIRLINE,
            opacity: 0.5,
          }}
        />
      ))}

      {/* ── Lexical ── */}
      <RowName name="Lexical" gist="one word, two meanings" nameAt={lexicalAt} gistAt={lexFrom - 2} top={row(0)} />
      <Ink at={bankAt - 4} dur={14} style={{ left: EX_X, top: row(0) - 10, whiteSpace: "nowrap" }}>
        <span style={{ ...body(48), color: INK }}>
          <Mark at={bankAt + 4}>bank</Mark>
        </span>
      </Ink>
      <Readings a="the side of a river" b="a place for money" aAt={riverAt - 2} bAt={moneyAt - 8} top={row(0) + 62} />

      {/* ── Structural ── */}
      <RowName name="Structural" gist="one sentence, two groupings" nameAt={structuralAt} gistAt={strFrom - 2} top={row(1)} />
      <Ink at={sawAt - 4} dur={20} style={{ left: EX_X, top: row(1) - 10, whiteSpace: "nowrap" }}>
        <span style={{ ...body(46), color: INK }}>
          I saw the man <Mark at={useAt - 4}>with the telescope</Mark>
        </span>
      </Ink>
      <Readings a="I used it to see him" b="he was holding it" aAt={useAt} bAt={holdingAt - 4} top={row(1) + 62} />
      <Spot id={ART.telescope} at={sawAt + 2} left={1420} top={row(1) - 46} width={164} height={196} />

      {/* ── Referential ── */}
      <RowName name="Referential" gist="what does it point to?" nameAt={referentialAt} gistAt={refFrom - 2} top={row(2)} />
      <Ink at={trophyAt - 6} dur={24} style={{ left: EX_X, top: row(2) - 6, whiteSpace: "nowrap" }}>
        <span style={{ ...body(38), color: INK }}>
          The trophy didn't fit in the case because <Mark at={whatAt}>it</Mark> was too big.
        </span>
      </Ink>
      <Readings
        a="the trophy?"
        b="the case?"
        aAt={whatAt + 4}
        bAt={bigAt}
        top={row(2) + 62}
        hlA={{ at: knowAt - 2, out: ideaAt }}
      />
      <Spot id={ART.trophy} at={trophyAt + 2} left={1610} top={row(2) - 14} width={184} height={187} />
    </AbsoluteFill>
  );
};
