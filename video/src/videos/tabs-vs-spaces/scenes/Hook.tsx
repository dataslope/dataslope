import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../../components/Illustration";
import { Pattern } from "../../../components/Pattern";
import { bob, ease, pop } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { colors, ds } from "../../../theme/brand";
import { knock, SIDE, W } from "../layout";
import { Appear, Burst, Headline, SPACE, TAB } from "../ui";

const VIDEO = "tabs-vs-spaces";

/** "Tabs or spaces?" as a fight card: the two keys square up and collide on
 *  "argued" and again on "decades". */
export const Hook: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { word } = useNarration();
  const tabsAt = word("hook", "Tabs");
  const orAt = word("hook", "or");
  const spacesAt = word("hook", "spaces");
  const hits = [word("hook", "argued"), word("hook", "decades")];

  const band = ease(frame, from, 14);
  const lunge = hits.reduce((v, at) => v + knock(frame, at - 4, 14), 0);
  const keyIn = frame < tabsAt ? 0 : pop(frame, tabsAt + 2, fps, 12);
  const barIn = frame < spacesAt ? 0 : pop(frame, spacesAt + 2, fps, 12);
  const burst = hits.reduce((v, at) => Math.max(v, knock(frame, at, 12)), 0);

  return (
    <Scene from={from} to={to} fade={6}>
      <Pattern
        video={VIDEO}
        name="hook-band"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: W,
          height: 270,
          transform: `translateY(${(band - 1) * 270}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: W,
          height: 270,
          background: `linear-gradient(to bottom, transparent 55%, ${colors.page})`,
        }}
      />

      <Appear at={tabsAt} from="scale" style={{ top: 300, left: SIDE }}>
        <Headline size={190} color={TAB.main}>
          Tabs
        </Headline>
      </Appear>
      <Appear at={orAt} from="up" distance={30} style={{ top: 360, left: 590 }}>
        <Headline size={84} color={colors.inkSoft}>
          or
        </Headline>
      </Appear>
      <Appear at={spacesAt} from="scale" style={{ top: 510, left: SIDE }}>
        <Headline size={190} color={SPACE.main}>
          spaces?
        </Headline>
      </Appear>

      {/* The fight. The burst sits behind the keys so its points flare out
          around the collision instead of covering it. */}
      <div
        style={{
          position: "absolute",
          top: 905,
          left: 290,
          opacity: burst > 0 ? 1 : 0,
          transform: `scale(${burst}) rotate(${frame * 3}deg)`,
        }}
      >
        <Burst size={330} color={ds("yellow")} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 830,
          left: SIDE - 24,
          width: 400,
          height: 400,
          opacity: Math.min(1, keyIn * 1.5),
          transform: `translateX(${(1 - keyIn) * -500 + lunge * 70}px) translateY(${bob(frame, 8, 70)}px) rotate(${-6 + lunge * 10}deg)`,
        }}
      >
        <Illustration video={VIDEO} id="tvs-tab-key" style={{ width: 400, height: 400 }} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 975,
          left: 410,
          width: 600,
          height: 264,
          opacity: Math.min(1, barIn * 1.5),
          transform: `translateX(${(1 - barIn) * 600 - lunge * 70}px) translateY(${bob(frame + 35, 8, 70)}px) rotate(${4 - lunge * 8}deg)`,
        }}
      >
        <Illustration video={VIDEO} id="tvs-space-bar" style={{ width: 600, height: 264 }} />
      </div>
    </Scene>
  );
};
