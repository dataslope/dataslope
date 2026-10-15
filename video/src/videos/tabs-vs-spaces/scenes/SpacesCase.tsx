import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { colors, ds, syntax } from "../../../theme/brand";
import { MONO } from "../../../theme/fonts";
import { CodeLine, CodePanel, spaces } from "../code";
import { CHAR_W, CODE_SIZE, CONTENT_W, LINE_H, SIDE, TOP } from "../layout";
import { Appear, Body, DotsGlyph, Headline, SHADOW, SPACE } from "../ui";

const ROW_TOP = 505;
const ROW_H = 104;
const ROW_GAP = 14;
const LABEL_W = 220;
const PAD = 30;

const ROWS = [
  { phrase: "diffs", label: "diff", tint: `color-mix(in srgb, ${ds("green")} 16%, ${colors.codeBg})` },
  { phrase: "terminals", label: "terminal", tint: colors.codeBg },
  { phrase: "reviews", label: "review", tint: `color-mix(in srgb, ${ds("blue")} 14%, ${colors.codeBg})` },
];

/** A vertical yellow rule that draws downwards: "these line up". */
const Guide: React.FC<{ x: number; top: number; height: number; progress: number }> = ({
  x,
  top,
  height,
  progress,
}) =>
  progress > 0 ? (
    <div
      style={{
        position: "absolute",
        left: x - 3,
        top,
        width: 6,
        height: height * progress,
        borderRadius: 3,
        background: ds("yellow"),
      }}
    />
  ) : null;

/** Team spaces: identical everywhere, and continuation lines align. */
export const SpacesCase: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { word } = useNarration();
  const team = word("spaces-case", "Team spaces");
  const same = word("spaces-case", "same everywhere");
  const wrapped = word("spaces-case", "wrapped lines");
  const align = word("spaces-case", "align exactly");
  const rowCues = ROWS.map((r) => word("spaces-case", r.phrase));
  const codeX = SIDE + LABEL_W + PAD + 4 * CHAR_W;
  const wrapTop = 1005;

  return (
    <Scene from={from} to={to} fade={2}>
      <Appear at={team} from="right" style={{ top: TOP, left: SIDE, display: "flex", alignItems: "center", gap: 28 }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 32,
            background: SPACE.soft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <DotsGlyph count={3} cell={30} height={120} color={SPACE.main} dot={18} />
        </div>
        <Headline size={108} color={SPACE.main}>
          Team Spaces
        </Headline>
      </Appear>

      <Appear at={same} from="up" distance={30} style={{ top: 410, left: SIDE }}>
        <Body size={58}>Same everywhere</Body>
      </Appear>

      {ROWS.map((r, i) => (
        <Appear
          key={r.label}
          at={rowCues[i]}
          from="left"
          style={{
            top: ROW_TOP + i * (ROW_H + ROW_GAP),
            left: SIDE,
            width: CONTENT_W,
            height: ROW_H,
            borderRadius: 24,
            background: r.tint,
            boxShadow: SHADOW,
            display: "flex",
            alignItems: "center",
            fontFamily: MONO,
            fontSize: CODE_SIZE,
            color: syntax.plain,
          }}
        >
          <div
            style={{
              width: LABEL_W,
              paddingLeft: PAD,
              boxSizing: "border-box",
              fontSize: 32,
              fontWeight: 600,
              color: ds("gray", 400),
            }}
          >
            {r.label}
          </div>
          <div style={{ paddingLeft: PAD }}>
            <CodeLine line={{ ws: spaces(4), code: "return total" }} />
          </div>
        </Appear>
      ))}
      <Guide
        x={codeX}
        top={ROW_TOP - 10}
        height={3 * ROW_H + 2 * ROW_GAP + 20}
        progress={ease(frame, rowCues[2] + 8, 12)}
      />

      <Appear at={wrapped} from="up" distance={30} style={{ top: 915, left: SIDE }}>
        <Body size={58}>Wrapped lines align</Body>
      </Appear>
      <Appear at={wrapped + 3} from="up" style={{ top: 0, left: 0 }}>
        <CodePanel top={wrapTop} filename="wrap.py">
          <CodeLine line={{ code: "total = add(first," }} />
          <CodeLine line={{ ws: spaces(12), code: "second)" }} />
        </CodePanel>
      </Appear>
      <Guide
        x={SIDE + 36 + 12 * CHAR_W}
        top={wrapTop + 68 + 10}
        height={2 * LINE_H + 16}
        progress={ease(frame, align, 12)}
      />
    </Scene>
  );
};
