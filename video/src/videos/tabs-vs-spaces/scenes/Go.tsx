import React from "react";
import { useCurrentFrame } from "remotion";
import { Illustration } from "../../../components/Illustration";
import { bob, during, ease } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { ds } from "../../../theme/brand";
import { MONO } from "../../../theme/fonts";
import { CodeLine, CodePanel, tabs } from "../code";
import { SIDE, TOP } from "../layout";
import { Appear, Chip, Headline, TAB } from "../ui";

/** Go: gofmt indents with tabs (checked against gofmt's own output). */
export const Go: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  const go = word("go", "Go");
  const formatter = word("go", "formatter");
  const tabsAt = word("go", "tabs");
  const reveal = ease(frame, formatter, 10);
  const mark = during(frame, tabsAt, to + 100, 6);

  return (
    <Scene from={from} to={to} fade={6}>
      <Appear at={go} from="left" style={{ top: TOP, left: SIDE }}>
        <Headline size={116}>Go</Headline>
      </Appear>
      <Appear at={formatter} from="scale" style={{ top: TOP + 22, left: 290 }}>
        <Chip bg={TAB.soft} color={TAB.ink} size={56} font={MONO}>
          gofmt
        </Chip>
      </Appear>

      <Appear at={from + 2} from="up" style={{ top: 0, left: 0 }}>
        <CodePanel top={420} filename="main.go">
          <CodeLine line={{ code: "func main() {" }} reveal={reveal} />
          <CodeLine
            line={{ ws: tabs(1), code: 'fmt.Println("hi")' }}
            reveal={reveal}
            mark={{ from: 0, count: 1, color: ds("yellow"), amount: mark }}
          />
          <CodeLine line={{ code: "}" }} reveal={reveal} />
        </CodePanel>
      </Appear>

      <Appear at={tabsAt} from="scale" style={{ top: 800 + bob(frame, 8, 60), left: SIDE + 260 }}>
        <Illustration video="tabs-vs-spaces" id="tvs-tab-key" style={{ width: 380, height: 360 }} />
      </Appear>
    </Scene>
  );
};
