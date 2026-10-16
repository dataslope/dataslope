import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, body, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { KICKER_Y, X0 } from "./kit";
import { Drift, Fade, pulse, Spot } from "./parts";

const SIZE = 88;

/** A phrase of the oath, with an underline drawn under it on `underlineAt`. */
const Phrase: React.FC<{ at: number; underlineAt: number; color: string; children: React.ReactNode }> = ({
  at,
  underlineAt,
  color,
  children,
}) => {
  const frame = useCurrentFrame();
  const u = ease(frame, underlineAt - 2, 16);
  return (
    <Ink at={at} dur={20} style={{ position: "relative" }}>
      <span style={{ position: "relative", display: "inline-block" }}>
        {children}
        <span
          style={{
            position: "absolute",
            left: 0,
            top: "1.02em",
            width: `${u * 100}%`,
            height: "0.07em",
            borderRadius: 3,
            background: color,
            opacity: u > 0 ? 1 : 0,
          }}
        />
      </span>
    </Ink>
  );
};

/** What a phrase rules out, set after it on the same line. */
const Gloss: React.FC<{ at: number; form: string; gist: string; color: string }> = ({ at, form, gist, color }) => (
  <Ink at={at} dur={14} style={{ position: "relative", alignSelf: "center", marginLeft: 36, whiteSpace: "nowrap" }}>
    <div style={{ ...label(24, color), fontWeight: 700 }}>{form}</div>
    <div style={{ ...note(21, INK_SOFT), marginTop: 4 }}>{gist}</div>
  </Ink>
);

/**
 * Both dependency rules in Kent's one sentence (CACM, February 1983): "the
 * whole key" is second normal form, "nothing but the key" third, and the
 * later "so help me Codd". It ends on whether every table should stay that
 * way.
 */
export const OathScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("oath").from;
  const oathAt = n.word("oath", "old oath");
  const everyAt = n.word("oath", "Every non-key column");
  const keyAt = n.word("oath", "the key");
  const wholeAt = n.word("oath", "whole key");
  const nothingAt = n.word("oath", "nothing but");
  const wholeIsAt = n.word("halves", "whole key");
  const secondAt = n.word("halves", "second");
  const nothingIsAt = n.word("halves", "Nothing but");
  const thirdAt = n.word("halves", "third");
  const kentAt = n.word("kent", "William Kent");
  const yearAt = n.word("kent", "nineteen eighty-three");
  const addedAt = n.word("kent", "later added");
  const coddAt = n.word("kent", "so help me Codd");
  const soAt = n.word("denorm-in", "So should");
  const everyTableAt = n.word("denorm-in", "every table");
  const foreverAt = n.word("denorm-in", "forever");
  const almostAt = n.word("denorm-in", "Almost");
  const end = n.beat("denorm-in").to;

  const lift = pulse(frame, addedAt, 26);
  const line = (top: number): React.CSSProperties => ({
    position: "absolute",
    left: X0 - 4,
    top: y(top),
    display: "flex",
    alignItems: "baseline",
    whiteSpace: "nowrap",
    ...headline(SIZE),
  });

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={oathAt - 4} level={-30} />
      <Sfx name="el-pencil" at={wholeIsAt - 2} level={-34} />
      <Sfx name="el-pencil" at={nothingIsAt - 2} level={-34} />
      <Sfx name="el-pencil" at={coddAt} level={-35} />
      <Sfx name="el-tap" at={almostAt - 2} level={-29} />

      <Ink at={from - 10} dur={14} style={{ left: X0 + 2, top: y(KICKER_Y) }}>
        <span style={label(22, INK_SOFT)}>Third normal form</span>
      </Ink>
      <Spot id="db-normalization-keys" at={oathAt - 6} out={soAt} left={1520} top={y(300)} width={280} height={392} />

      <Drift from={from} to={end + 40} amount={0.015} origin="25% 50%">
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${-ease(frame, foreverAt - 4, 22) * h(34)}px)` }}>
        <Fade dimAt={everyTableAt} dim={0.35}>
          <Ink at={everyAt - 4} dur={18} style={{ left: X0, top: y(240), whiteSpace: "nowrap" }}>
            <span style={{ ...body(42, true), color: INK_SOFT }}>Every non-key column depends on</span>
          </Ink>
          <div style={line(310)}>
            <Phrase at={keyAt - 2} underlineAt={1e9} color={INK}>
              the key,
            </Phrase>
          </div>
          <div style={line(420)}>
            <Phrase at={wholeAt - 2} underlineAt={wholeIsAt} color={BAR}>
              the whole key,
            </Phrase>
            <Gloss at={secondAt - 2} form="Second normal form" gist="no partial dependencies" color={BLUE_INK} />
          </div>
          <div style={{ ...line(530), transform: `translateY(${-lift * 4}px)` }}>
            <Phrase at={nothingAt - 2} underlineAt={nothingIsAt} color={ACCENT}>
              and nothing but the key.
            </Phrase>
            <Gloss at={thirdAt - 2} form="Third normal form" gist="no transitive dependencies" color={ACCENT_INK} />
          </div>

          {/* Who said it that way, and what got added. */}
          <Ink at={kentAt - 2} dur={14} style={{ left: X0, top: y(664), whiteSpace: "nowrap" }}>
            <span style={{ ...label(24, INK) }}>William Kent, 1983</span>
          </Ink>
          <Ink at={yearAt} dur={16} style={{ left: X0 + 260, top: y(664) + 1, whiteSpace: "nowrap" }}>
            <span style={{ ...body(25, true), color: INK_SOFT }}>A Simple Guide to Five Normal Forms in Relational Database Theory</span>
          </Ink>
          <Ink at={coddAt - 2} dur={20} style={{ left: X0, top: y(714), whiteSpace: "nowrap" }}>
            <span style={{ ...body(40, true), color: ACCENT_INK }}>…so help me Codd.</span>
          </Ink>
        </Fade>
        </div>
        <Ink at={almostAt - 4} dur={18} style={{ left: X0 - 4, top: y(800), whiteSpace: "nowrap" }}>
          <span style={{ ...headline(76, true), color: INK }}>Almost.</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
