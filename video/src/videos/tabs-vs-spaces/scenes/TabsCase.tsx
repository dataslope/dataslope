import React from "react";
import { useCurrentFrame } from "remotion";
import { Illustration } from "../../../components/Illustration";
import { bob, ease } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { colors, syntax } from "../../../theme/brand";
import { MONO, SANS } from "../../../theme/fonts";
import { CodeLine, tabs } from "../code";
import { CODE_SIZE, CONTENT_W, SIDE, TOP } from "../layout";
import { Appear, Body, Headline, SHADOW, TAB, TabGlyph } from "../ui";

/** Team tabs: one character per level, and the reader chooses the width. */
export const TabsCase: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  const team = word("tabs-case", "Team tabs");
  const oneChar = word("tabs-case", "one character");
  const every = word("tabs-case", "every reader");
  const readers: [number, number][] = [
    [every, 2],
    [word("tabs-case", "picks"), 4],
    [word("tabs-case", "own width"), 8],
  ];
  const helps = word("tabs-case", "helps");
  const low = word("tabs-case", "low vision");

  return (
    <Scene from={from} to={to} fade={6}>
      <Appear at={team} from="left" style={{ top: TOP, left: SIDE, display: "flex", alignItems: "center", gap: 28 }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 32,
            background: TAB.soft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TabGlyph width={92} height={92} color={TAB.main} stroke={9} />
        </div>
        <Headline size={116} color={TAB.main}>
          Team Tabs
        </Headline>
      </Appear>

      {/* 1. One character per level */}
      <Appear
        at={oneChar}
        from="up"
        style={{
          top: 430,
          left: SIDE,
          width: CONTENT_W,
          height: 170,
          borderRadius: 30,
          background: colors.surface,
          border: `3px solid ${colors.line}`,
          display: "flex",
          alignItems: "center",
          gap: 34,
          padding: "0 36px",
          boxSizing: "border-box",
        }}
      >
        <TabGlyph width={210} height={100} color={TAB.main} fill={TAB.soft} stroke={7} />
        <div>
          <Body size={60}>1 character</Body>
          <Body size={42} color={colors.inkSoft} weight={600}>
            per indent level
          </Body>
        </div>
      </Appear>

      {/* 2. Every reader picks their own width */}
      <Appear at={every} from="up" distance={30} style={{ top: 650, left: SIDE }}>
        <Body size={56}>Each reader sets the width</Body>
      </Appear>
      <Appear
        at={every}
        from="up"
        style={{
          top: 735,
          left: SIDE,
          width: CONTENT_W,
          borderRadius: 30,
          background: colors.codeBg,
          boxShadow: SHADOW,
          padding: "18px 36px",
          boxSizing: "border-box",
          fontFamily: MONO,
          fontSize: CODE_SIZE,
          color: syntax.plain,
        }}
      >
        {readers.map(([at, width]) => {
          const p = ease(frame, at, 10);
          return (
            <div
              key={width}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 26,
                opacity: 0.25 + 0.75 * p,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 54,
                  borderRadius: 14,
                  background: TAB.main,
                  color: colors.page,
                  fontFamily: SANS,
                  fontWeight: 800,
                  fontSize: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {width}
              </div>
              <CodeLine line={{ ws: tabs(1), code: "return total" }} tabWidth={1 + (width - 1) * p} />
            </div>
          );
        })}
      </Appear>

      {/* 3. Accessibility */}
      <Appear at={helps} from="up" distance={30} style={{ top: 1060, left: SIDE }}>
        <Body size={58}>Helps readers</Body>
      </Appear>
      <Appear at={low} from="up" distance={30} style={{ top: 1130, left: SIDE }}>
        <Body size={58} color={TAB.ink}>
          with low vision
        </Body>
      </Appear>
      <Appear at={helps} from="right" style={{ top: 1000 + bob(frame, 6, 80), left: 610 }}>
        <Illustration video="tabs-vs-spaces" id="tvs-marmot-glasses" style={{ width: 360, height: 343 }} />
      </Appear>
    </Scene>
  );
};
