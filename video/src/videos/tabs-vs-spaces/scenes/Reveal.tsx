import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { during, ease, pop } from "../../../components/motion";
import { Scene } from "../../../components/Scene";
import { useNarration } from "../../../narration/NarrationContext";
import { colors, ds } from "../../../theme/brand";
import { SANS } from "../../../theme/fonts";
import { CodeLine, CodePanel, spaces, tabs, type Line } from "../code";
import { CHAR_W, latest, SIDE, stepTo, TOP } from "../layout";
import { Appear, Check, Chip, Headline, SPACE, TAB, Toggle } from "../ui";

const tabbed: Line[] = [
  { code: "def greet(name):" },
  { ws: tabs(1), code: "if name:" },
  { ws: tabs(2), code: "print(name)" },
  { ws: tabs(1), code: "return name" },
];
const spaced: Line[] = tabbed.map((l) => ({
  ...l,
  ws: spaces((l.ws?.length ?? 0) * 4),
}));

const PANEL_A = 470;
const PANEL_B = 884;

/** Crossfading one-line headlines, each shown from its cue to the next. */
const Swap: React.FC<{ items: [number, string][]; end: number }> = ({ items, end }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {items.map(([at, text], i) => {
        const next = items[i + 1]?.[0] ?? end;
        const o = during(frame, at, next, 6);
        if (o <= 0) return null;
        return (
          <div
            key={text}
            style={{
              position: "absolute",
              top: TOP,
              left: SIDE,
              opacity: o,
              transform: `translateY(${(1 - ease(frame, at, 8)) * 24}px)`,
            }}
          >
            <Headline size={92}>{text}</Headline>
          </div>
        );
      })}
    </>
  );
};

/** A small pointer label that sits at the end of a code line. */
const Note: React.FC<{ amount: number; left: number; children: React.ReactNode }> = ({
  amount,
  left,
  children,
}) =>
  amount > 0 ? (
    <div
      style={{
        position: "absolute",
        left,
        top: 10,
        opacity: amount,
        transform: `translateX(${(1 - amount) * 30}px)`,
      }}
    >
      <Chip bg={ds("yellow")} color={colors.ink} size={34}>
        {children}
      </Chip>
    </div>
  ) : null;

/**
 * The same function indented two ways. Whitespace is invisible until the
 * editor's "render whitespace" switch flips on; then the tab width changes
 * and only the tab-indented copy moves.
 */
export const Reveal: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { word } = useNarration();

  const onScreen = word("hook", "on screen");
  const identical = word("hook", "identical");
  const but = word("tab-char", "But");
  const tab = word("tab-char", "tab");
  const oneChar = word("tab-char", "one character");
  const editor = word("tab-char", "editor");
  const decides = word("tab-char", "decides");
  const draw = word("tab-char", "draw");
  const change = word("widths", "Change");
  const indented = word("widths", "tab-indented");
  const stay = word("widths", "Spaces stay put");

  const tabWidth = stepTo(frame, 4, [
    [decides, 6.5],
    [draw, 4],
    [change + 6, 2],
    [indented, 8],
  ]);
  const activeWidth = latest(frame, 4, [
    [change + 6, 2],
    [indented, 8],
  ]);
  const revealA = ease(frame, tab, 10);
  const revealB = ease(frame, tab + 5, 10);
  const switchOn = ease(frame, but + 2, 8);
  const markA = during(frame, oneChar, editor, 6);
  const markB = during(frame, oneChar + 8, editor, 6);
  const eq = frame < identical ? 0 : pop(frame, identical, fps);
  const slash = frame < tab + 10 ? 0 : pop(frame, tab + 10, fps);
  const toggleRow = during(frame, onScreen + 4, change, 6);
  const widthRow = frame < change ? 0 : ease(frame, change, 8);

  return (
    <Scene from={from} to={to} fade={6}>
      <Swap
        end={to + 1000}
        items={[
          [onScreen, "Same code?"],
          [but, "Look closer"],
          [oneChar, "Tab = 1 character"],
          [editor, "Drawn at any width"],
          [change, "Change tab width"],
          [stay, "Spaces stay put"],
        ]}
      />

      {/* Editor setting row: the whitespace switch, then the tab width. */}
      {toggleRow > 0 ? (
        <div
          style={{
            position: "absolute",
            top: TOP + 124,
            left: SIDE,
            display: "flex",
            alignItems: "center",
            gap: 22,
            opacity: toggleRow,
          }}
        >
          <Toggle on={switchOn} />
          <span
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 46,
              color: colors.inkSoft,
            }}
          >
            Render whitespace
          </span>
        </div>
      ) : null}
      {widthRow > 0 ? (
        <div
          style={{
            position: "absolute",
            top: TOP + 120,
            left: SIDE,
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: widthRow,
            transform: `translateY(${(1 - widthRow) * 20}px)`,
          }}
        >
          <span
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 46,
              color: colors.inkSoft,
              marginRight: 8,
            }}
          >
            Tab width
          </span>
          {[2, 4, 8].map((n) => (
            <div
              key={n}
              style={{
                width: 84,
                height: 64,
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: SANS,
                fontWeight: 800,
                fontSize: 40,
                background: n === activeWidth ? TAB.main : colors.surface,
                color: n === activeWidth ? colors.page : colors.ink,
                border: `3px solid ${n === activeWidth ? TAB.main : colors.line}`,
              }}
            >
              {n}
            </div>
          ))}
        </div>
      ) : null}

      <Appear at={onScreen} from="up" style={{ top: 0, left: 0 }}>
        <CodePanel
          top={PANEL_A}
          filename="tabs.py"
          badge={<Chip bg={`color-mix(in srgb, ${TAB.main} 30%, transparent)`} color={TAB.onDark} size={26}>tabs</Chip>}
        >
          {tabbed.map((line, i) => (
            <CodeLine
              key={i}
              line={line}
              tabWidth={tabWidth}
              reveal={revealA}
              mark={i === 1 ? { from: 0, count: 1, color: ds("yellow"), amount: markA } : undefined}
            >
              {i === 1 ? (
                <Note amount={markA} left={tabWidth * CHAR_W + 280}>
                  1 character
                </Note>
              ) : null}
            </CodeLine>
          ))}
        </CodePanel>
      </Appear>

      <Appear at={onScreen + 5} from="up" style={{ top: 0, left: 0 }}>
        <CodePanel
          top={PANEL_B}
          filename="spaces.py"
          badge={<Chip bg={`color-mix(in srgb, ${SPACE.main} 30%, transparent)`} color={SPACE.onDark} size={26}>spaces</Chip>}
        >
          {spaced.map((line, i) => (
            <CodeLine
              key={i}
              line={line}
              reveal={revealB}
              mark={i === 1 ? { from: 0, count: 4, color: ds("yellow"), amount: markB } : undefined}
            >
              {i === 1 ? (
                <Note amount={markB} left={4 * CHAR_W + 280}>
                  4 characters
                </Note>
              ) : null}
            </CodeLine>
          ))}
        </CodePanel>
      </Appear>

      {/* "=" between the copies, struck through once the whitespace shows. */}
      {eq > 0 ? (
        <div
          style={{
            position: "absolute",
            top: (PANEL_A + 366 + PANEL_B) / 2 - 50,
            left: 760,
            width: 100,
            height: 100,
            borderRadius: 50,
            background: ds("yellow"),
            boxShadow: `0 8px 20px color-mix(in srgb, ${colors.ink} 20%, transparent)`,
            transform: `scale(${eq})`,
          }}
        >
          {[34, 56].map((y) => (
            <div
              key={y}
              style={{
                position: "absolute",
                left: 26,
                top: y,
                width: 48,
                height: 10,
                borderRadius: 5,
                background: colors.ink,
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              left: 45,
              top: 18,
              width: 10,
              height: 64,
              borderRadius: 5,
              background: colors.ink,
              transform: `rotate(35deg) scaleY(${slash})`,
            }}
          />
        </div>
      ) : null}

      <Appear at={stay} from="up" distance={30} style={{ top: PANEL_B + 366 + 22, left: SIDE }}>
        <Chip bg={ds("green", 100)} color={colors.okInk} size={44}>
          <Check size={44} color={colors.okInk} progress={ease(frame, stay + 4, 10)} />
          Same at every width
        </Chip>
      </Appear>
    </Scene>
  );
};
