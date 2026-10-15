import React from "react";
import { useCurrentFrame } from "remotion";
import { ease, map } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { W } from "../theme";
import { Clay, Headlines, NeonText } from "../ui";
import { LetterRow, ROW_TOP } from "./Letters";

/**
 * The robot squints at the letters and they smear out of reach: a model
 * never reads them. On "tokens" the row is gone and three clay chunks land
 * where it was.
 */
export const Sees: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  const model = word("sees", "model");
  const never = word("sees", "never");
  const letters = word("sees", "letters");
  const it = word("sees", "It");
  const tokens = word("sees", "tokens");

  const blur = map(frame, [never, letters + 8], [0, 7]);
  const rowGone = ease(frame, tokens - 4, 5);

  return (
    <Scene from={from} to={to} fade={6}>
      <Headlines
        end={to + 1000}
        items={[
          [never, <NeonText key="a" size={92} hue="blue">No letters.</NeonText>],
          [it, <NeonText key="b" size={92} hue="yellow">Only tokens.</NeonText>],
        ]}
      />

      <Clay id="tok-robot" at={model} left={(W - 500) / 2} top={420} width={500} height={557} seed={11} />

      {rowGone < 1 ? (
        <LetterRow
          onAt={from - 40}
          blur={blur}
          scrambleAt={letters}
          strike={ease(frame, letters + 2, 10)}
          dim={rowGone}
        />
      ) : null}

      <Clay id="tok-blocks" at={tokens} left={(W - 880) / 2} top={ROW_TOP - 30} width={880} height={227} rim="yellow" seed={5} bob={6} />
    </Scene>
  );
};
