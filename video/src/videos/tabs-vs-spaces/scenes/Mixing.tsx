import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { colors } from "../../../theme/brand";
import { CodeLine, CodePanel, spaces, tabs, type Line } from "../code";
import { shake, SIDE, TOP } from "../layout";
import { Appear, Body, Cross, Headline } from "../ui";

const MIXED: Line[] = [
  { code: "def total(xs):" },
  { ws: tabs(1), code: "s = 0" },
  { ws: spaces(4), code: "for x in xs:" },
  { ws: tabs(2), code: "s += x" },
];

/** The one wrong answer: both at once. */
export const Mixing: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { word } = useNarration();
  const only = word("mixing", "only wrong answer");
  const mixing = word("mixing", "mixing them");
  const x = frame < mixing ? 0 : pop(frame, mixing, fps, 11);
  const dim = ease(frame, mixing + 4, 10);

  return (
    <Scene from={from} to={to} fade={6}>
      <Appear at={only} from="up" distance={30} style={{ top: TOP + 10, left: SIDE }}>
        <Body size={64} color={colors.inkSoft}>
          The only wrong answer:
        </Body>
      </Appear>
      <Appear at={mixing} from="scale" style={{ top: TOP + 100, left: SIDE }}>
        <Headline size={128} color={colors.bad}>
          Mixing them
        </Headline>
      </Appear>

      <Appear at={from + 2} from="up" style={{ top: 0, left: shake(frame, mixing, 16, 20) }}>
        <CodePanel top={560} filename="both.py" style={{ opacity: 1 - dim * 0.15 }}>
          {MIXED.map((line, i) => (
            <CodeLine key={i} line={line} />
          ))}
        </CodePanel>
      </Appear>

      {x > 0 ? (
        <div
          style={{
            position: "absolute",
            top: 560 + 184 - 190,
            left: 540 - 190,
            transform: `scale(${2.2 - 1.2 * x}) rotate(${(1 - x) * 30}deg)`,
            opacity: Math.min(1, x * 1.4),
          }}
        >
          <Cross size={380} color={colors.bad} />
        </div>
      ) : null}
    </Scene>
  );
};
