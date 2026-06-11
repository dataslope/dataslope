"use client";

import { useId } from "react";
import type { SVGProps } from "react";

export function SvgFigure(props: SVGProps<SVGSVGElement>) {
  const id = useId();
  const figureId = `svg-${id.replace(/:/g, "")}`;

  return (
    <div>
      <svg {...props} />
      <div
        data-svg-id={figureId}
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "0.6875rem",
          color: "var(--ds-gray-400, #9CA3AF)",
          textAlign: "center",
          marginTop: "0.25rem",
          letterSpacing: "0.025em",
        }}
      >
        {figureId}
      </div>
    </div>
  );
}
