import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { colors, ds } from "../../../theme/brand";
import { CodeLine, CodePanel, spaces, tabs } from "../code";
import { CONTENT_W, shake, SIDE, TOP } from "../layout";
import { Appear, Body, Chip, Headline, SPACE, TAB } from "../ui";

/** Python: PEP 8's four spaces, and the TabError for mixing. The snippet
 *  and the message are real: Python 3.13 rejects exactly this file. */
export const Python: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  const python = word("python", "Python");
  const pep = word("python", "PEP 8");
  const four = word("python", "four spaces");
  const level = word("python", "per level");
  const mixing = word("python", "inconsistent mixing");
  const raises = word("python", "raises");
  const tabError = word("python", "TabError");
  const failed = ease(frame, tabError, 8);
  // Ring the two kinds of indentation the moment the mix is named.
  const ringSpaces = ease(frame, mixing, 8);
  const ringTab = ease(frame, mixing + 6, 8);

  return (
    <Scene from={from} to={to} fade={2}>
      <Appear at={python} from="left" style={{ top: TOP, left: SIDE }}>
        <Headline size={116}>Python</Headline>
      </Appear>
      <Appear at={pep} from="scale" style={{ top: TOP + 22, left: 540 }}>
        <Chip bg={TAB.soft} color={TAB.ink} size={56}>
          PEP 8
        </Chip>
      </Appear>

      <Appear
        at={four}
        from="up"
        style={{
          top: 420,
          left: SIDE,
          width: CONTENT_W,
          height: 170,
          borderRadius: 30,
          background: colors.surface,
          border: `3px solid ${colors.line}`,
          display: "flex",
          alignItems: "center",
          gap: 36,
          padding: "0 36px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 14,
            padding: "26px 26px",
            borderRadius: 26,
            background: SPACE.soft,
          }}
        >
          {[0, 1, 2, 3].map((i) => {
            const p = ease(frame, four + i * 3, 8);
            return (
              <div
                key={i}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  background: SPACE.main,
                  transform: `scale(${p})`,
                }}
              />
            );
          })}
        </div>
        <div>
          <Body size={60}>4 spaces</Body>
          <Body size={42} color={colors.inkSoft} weight={600}>
            per indent level
          </Body>
        </div>
      </Appear>

      <Appear at={level} from="up" style={{ top: 0, left: 0 }}>
        <CodePanel top={640} filename="check.py">
          <CodeLine line={{ code: "def check(x):" }} />
          <CodeLine
            line={{ ws: spaces(4), code: "if x:" }}
            mark={{ from: 0, count: 4, color: ds("yellow"), amount: ringSpaces }}
          />
          <CodeLine
            line={{
              ws: tabs(1),
              code: "return 1",
              tint: `color-mix(in srgb, ${ds("red")} ${Math.round(failed * 28)}%, transparent)`,
            }}
            mark={{ from: 0, count: 1, color: ds("yellow"), amount: ringTab }}
          />
        </CodePanel>
      </Appear>

      <Appear at={raises} from="up" style={{ top: 0, left: shake(frame, tabError, 16, 18) }}>
        <CodePanel
          top={975}
          filename="$ python3 check.py"
          bodyStyle={{ fontSize: 40, lineHeight: "56px", color: ds("red", 300) }}
        >
          <div>
            <span style={{ fontWeight: 700, color: ds("red", 400) }}>TabError</span>: inconsistent use of
          </div>
          <div>tabs and spaces in indentation</div>
        </CodePanel>
      </Appear>
    </Scene>
  );
};
