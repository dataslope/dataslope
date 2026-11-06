import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../components/motion";
import { Ink } from "../editorial/ui";
import { SPRINGS, textFrames, type TextMotion } from "./timing";

export type { TextMotion } from "./timing";

/** Room left around glyphs by any motion that clips the line, so
 *  descenders and the tilt of a rising letter are never cut off. */
const BLEED = "0.2em 0.12em 0.32em";
const UNBLEED = "-0.2em -0.12em -0.32em";

/**
 * One line of text, `text`, in `style`, arriving by `motion` from frame `at`.
 * `caret` colors the typing caret. Renders inline, so a caller lays several
 * out in a flex row or column.
 */
export const Words: React.FC<{
  motion: TextMotion;
  at: number;
  text: string;
  style: React.CSSProperties;
  caret?: string;
}> = ({ motion, at, text, style, caret = "currentColor" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line: React.CSSProperties = { ...style, whiteSpace: "pre", display: "inline-block" };

  if (motion === "ink") {
    return (
      <span style={{ position: "relative", display: "inline-block" }}>
        <span style={{ ...line, visibility: "hidden" }}>{text}</span>
        <Ink at={at} dur={18} style={{ left: 0, top: 0, whiteSpace: "pre" }}>
          <span style={line}>{text}</span>
        </Ink>
      </span>
    );
  }

  if (motion === "slide") {
    const p = ease(frame, at, 16);
    return (
      <span style={{ display: "inline-block", overflow: "hidden", padding: BLEED, margin: UNBLEED }}>
        <span style={{ ...line, transform: `translateY(${(1 - p) * 115}%)` }}>{text}</span>
      </span>
    );
  }

  if (motion === "blur") {
    const p = ease(frame, at, 16);
    return (
      <span
        style={{
          ...line,
          opacity: p,
          filter: p < 1 ? `blur(${(1 - p) * 14}px)` : undefined,
          transform: `scale(${1.04 - 0.04 * p})`,
        }}
      >
        {text}
      </span>
    );
  }

  const chars = [...text];

  if (motion === "letters") {
    return (
      <span style={{ display: "inline-block", overflow: "hidden", padding: BLEED, margin: UNBLEED }}>
        <span style={line}>
          {chars.map((c, i) => {
            const p = spring({ frame: frame - at - i * 1.1, fps, config: SPRINGS.letter });
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  whiteSpace: "pre",
                  opacity: Math.min(1, p * 1.6),
                  transform: `translateY(${(1 - p) * 0.9}em)`,
                }}
              >
                {c}
              </span>
            );
          })}
        </span>
      </span>
    );
  }

  // type: one letter every 1.4 frames, behind a caret that blinks once the
  // line is done and then goes.
  const shown = Math.floor(Math.max(0, frame - at) / 1.4) + (frame >= at ? 1 : 0);
  const done = at + textFrames("type", chars.length);
  const blink = frame < done || Math.floor((frame - done) / 9) % 2 === 0;
  const caretOn = frame >= at - 3 && frame < done + 36 && blink;
  // An empty inline-block sits on the baseline with no height, so the bar is
  // placed from there: from just under the baseline up past the cap height.
  const bar = (
    <span key="caret" style={{ display: "inline-block", width: 0, position: "relative" }}>
      <span
        style={{
          position: "absolute",
          left: "0.04em",
          bottom: "-0.1em",
          width: "0.07em",
          height: "0.92em",
          background: caret,
          opacity: caretOn ? 1 : 0,
        }}
      />
    </span>
  );
  return (
    <span style={line}>
      {chars.map((c, i) => (
        <React.Fragment key={i}>
          {i === Math.min(shown, chars.length) ? bar : null}
          <span style={{ opacity: i < shown ? 1 : 0 }}>{c}</span>
        </React.Fragment>
      ))}
      {shown >= chars.length ? bar : null}
    </span>
  );
};
