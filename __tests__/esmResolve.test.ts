// Every non-React package is pinned to share the one React instance through
// `?deps`: two copies of React on a page break hooks ("Invalid hook call").
import { describe, it, expect } from "vitest";

import { esmShUrlFor, REACT_VERSION } from "../app/_components/runtime/esmResolve";

describe("esmShUrlFor", () => {
  it("pins react itself with no deps parameter", () => {
    expect(esmShUrlFor("react")).toBe(`https://esm.sh/react@${REACT_VERSION}`);
    expect(esmShUrlFor("react/jsx-runtime")).toBe(
      `https://esm.sh/react@${REACT_VERSION}/jsx-runtime`,
    );
  });

  it("pins react-dom and shares the react instance via ?deps", () => {
    expect(esmShUrlFor("react-dom/client")).toBe(
      `https://esm.sh/react-dom@${REACT_VERSION}/client?deps=react@${REACT_VERSION}`,
    );
  });

  it("passes other packages through unpinned but react-deduped", () => {
    expect(esmShUrlFor("canvas-confetti")).toBe(
      `https://esm.sh/canvas-confetti?deps=react@${REACT_VERSION}`,
    );
    expect(esmShUrlFor("@tanstack/react-table")).toBe(
      `https://esm.sh/@tanstack/react-table?deps=react@${REACT_VERSION}`,
    );
  });
});
