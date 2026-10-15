import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../../components/Illustration";
import { bob, ease, pop } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { colors } from "../../../theme/brand";
import { SANS } from "../../../theme/fonts";
import { CodeLine, CodePanel } from "../code";
import { CONTENT_W, SIDE, stepTo, TOP } from "../layout";
import { Appear, Body, Check, Chip, DotsGlyph, Headline, SHADOW, SPACE, TAB, TabGlyph } from "../ui";

const CONFIG = ["[*]", "indent_style = space", "indent_size = 4"];

/** Pick one, then hand the rule to a formatter and an .editorconfig. */
export const Answer: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { word } = useNarration();
  const real = word("answer", "real answer");
  const pick = word("answer", "pick one");
  const project = word("answer", "project");
  const formatter = word("answer", "formatter");
  const ec = word("answer", "EditorConfig");
  const enforce = word("answer", "enforce");

  // The selection lands on tabs, considers it, and settles on spaces: which
  // one matters less than that there is exactly one.
  const half = CONTENT_W / 2;
  const sel = stepTo(frame, 0, [[project, 1]], 14);
  const selIn = frame < pick ? 0 : pop(frame, pick, fps);
  const stamp = frame < enforce ? 0 : pop(frame, enforce, fps, 10);

  return (
    <Scene from={from} to={to} fade={6}>
      <Appear at={Math.max(from + 2, real - 6)} from="up" style={{ top: TOP, left: SIDE }}>
        <Headline size={100}>The real answer</Headline>
      </Appear>
      <Appear at={pick} from="up" distance={30} style={{ top: 392, left: SIDE }}>
        <Body size={56} color={colors.inkSoft}>
          Pick one per project
        </Body>
      </Appear>

      {/* Segmented control: tabs | spaces */}
      <Appear
        at={pick}
        from="up"
        style={{
          top: 480,
          left: SIDE,
          width: CONTENT_W,
          height: 116,
          borderRadius: 32,
          background: colors.surface,
          border: `3px solid ${colors.line}`,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8 + sel * half,
            width: half - 22,
            height: 94,
            borderRadius: 26,
            background: colors.page,
            boxShadow: SHADOW,
            opacity: Math.min(1, selIn),
            transform: `scale(${0.8 + 0.2 * selIn})`,
          }}
        />
        {[
          { label: "Tabs", color: TAB.main, glyph: <TabGlyph width={74} height={60} color={TAB.main} stroke={7} /> },
          { label: "Spaces", color: SPACE.main, glyph: <DotsGlyph count={3} cell={22} height={60} color={SPACE.main} dot={14} /> },
        ].map((opt, i) => (
          <div
            key={opt.label}
            style={{
              position: "absolute",
              top: 0,
              left: i * half,
              width: half,
              height: 110,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 52,
              color: opt.color,
              opacity: 0.45 + 0.55 * (i === 0 ? 1 - sel : sel),
            }}
          >
            {opt.glyph}
            {opt.label}
          </div>
        ))}
      </Appear>

      <Appear at={formatter} from="left" distance={40} style={{ top: 745, left: SIDE }}>
        <Body size={56}>Formatter</Body>
      </Appear>
      <Appear at={formatter} from="right" style={{ top: 640 + bob(frame, 6, 70), left: 420 }}>
        <Illustration video="tabs-vs-spaces" id="tvs-formatter" style={{ width: 520, height: 310 }} />
      </Appear>

      <Appear at={ec} from="up" style={{ top: 0, left: 0 }}>
        <CodePanel top={975} filename=".editorconfig">
          {CONFIG.map((code, i) => (
            <div key={code} style={{ opacity: ease(frame, ec + 3 + i * 4, 6) }}>
              <CodeLine line={{ code }} lang="ini" />
            </div>
          ))}
        </CodePanel>
      </Appear>

      {stamp > 0 ? (
        <div
          style={{
            position: "absolute",
            top: 966,
            left: 590,
            transform: `rotate(-7deg) scale(${2 - stamp})`,
            opacity: Math.min(1, stamp * 1.5),
          }}
        >
          <Chip
            bg={`color-mix(in srgb, ${colors.page} 94%, transparent)`}
            color={colors.okInk}
            size={46}
            style={{ border: `5px solid ${colors.ok}` }}
          >
            <Check size={46} color={colors.okInk} progress={ease(frame, enforce + 3, 8)} />
            enforced
          </Chip>
        </div>
      ) : null}
    </Scene>
  );
};
