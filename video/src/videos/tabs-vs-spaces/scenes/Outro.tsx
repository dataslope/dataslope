import React from "react";
import { useCurrentFrame } from "remotion";
import { Illustration } from "../../../components/Illustration";
import { Logo } from "../../../components/Logo";
import { Pattern } from "../../../components/Pattern";
import { bob, ease } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { colors, ds } from "../../../theme/brand";
import { MONO, SANS } from "../../../theme/fonts";
import { CONTENT_W, SIDE, W } from "../layout";
import { Appear, SHADOW } from "../ui";

/** End card: the marmot, the logo, and the lesson that goes deeper. */
export const Outro: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  const learn = word("outro", "Learn");
  const python = word("outro", "Python");
  const dataslope = word("outro", "Dataslope");
  const band = ease(frame, from, 14);
  const url = ease(frame, dataslope, 10);

  return (
    <Scene from={from} to={to} fade={6}>
      <Pattern
        video="tabs-vs-spaces"
        name="end-band"
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

      <Appear at={from + 4} from="up" distance={30} style={{ top: 300, left: 0, width: W, display: "flex", justifyContent: "center" }}>
        <Logo size={84} />
      </Appear>

      <Appear at={learn} from="scale" style={{ top: 430 + bob(frame, 8, 80), left: (W - 560) / 2 }}>
        <Illustration video="tabs-vs-spaces" id="tvs-marmot-outro" style={{ width: 560, height: 449 }} />
      </Appear>

      <Appear
        at={python}
        from="up"
        style={{
          top: 930,
          left: SIDE,
          width: CONTENT_W,
          padding: "38px 44px",
          boxSizing: "border-box",
          borderRadius: 36,
          background: colors.surface,
          border: `3px solid ${colors.line}`,
          boxShadow: SHADOW,
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 34,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: colors.accentInk,
          }}
        >
          Python Basics
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 66,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            color: colors.ink,
          }}
        >
          Syntax and Indentation
        </div>
        <div
          style={{
            marginTop: 22,
            padding: "14px 20px",
            borderRadius: 18,
            background: `color-mix(in srgb, ${ds("yellow")} ${Math.round(url * 45)}%, transparent)`,
            fontFamily: MONO,
            fontWeight: 600,
            fontSize: 34,
            lineHeight: 1.4,
            color: colors.accentInk,
          }}
        >
          dataslope.com/courses/
          <br />
          python-basics/syntax-and-indentation
        </div>
      </Appear>
    </Scene>
  );
};
