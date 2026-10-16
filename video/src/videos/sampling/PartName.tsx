import React from "react";
import { HAIRLINE, INK, label } from "../../editorial/style";
import { useMergedPart } from "./merged";

/**
 * The part's name, as the kicker the merged video gives each part (the way
 * Unit 1 names its three), ahead of whatever kicker the part's opening scene
 * already has, on the same line and in the same flow: "Survivorship bias |
 * Statistical Research Group, Columbia, 1943". Renders nothing in the
 * standalone videos, so their kickers read as before.
 *
 * Place it first inside the opening scene's kicker, so the two ink in as one
 * line. `alone` drops the rule, for a scene with no kicker of its own.
 */
export const PartName: React.FC<{ alone?: boolean }> = ({ alone = false }) => {
  const part = useMergedPart();
  if (!part) return null;
  return (
    <>
      <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>{part.name}</span>
      {alone ? null : (
        <span
          style={{
            display: "inline-block",
            width: 1.5,
            height: "0.95em",
            margin: "0 0.7em",
            verticalAlign: "-0.12em",
            background: HAIRLINE,
          }}
        />
      )}
    </>
  );
};
