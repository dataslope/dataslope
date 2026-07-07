import { describe, it, expect } from "vitest";

import {
  esmShUrlFor,
  isBareSpecifier,
  REACT_VERSION,
  splitPackageSpecifier,
} from "../app/_components/runtime/esmResolve";

describe("isBareSpecifier", () => {
  it("accepts package names and scoped packages", () => {
    expect(isBareSpecifier("react")).toBe(true);
    expect(isBareSpecifier("react-dom/client")).toBe(true);
    expect(isBareSpecifier("@tanstack/react-table")).toBe(true);
  });

  it("rejects relative, absolute, and URL specifiers", () => {
    expect(isBareSpecifier("./App")).toBe(false);
    expect(isBareSpecifier("../util")).toBe(false);
    expect(isBareSpecifier("/main.tsx")).toBe(false);
    expect(isBareSpecifier("https://esm.sh/react")).toBe(false);
  });
});

describe("splitPackageSpecifier", () => {
  it("splits plain packages with subpaths", () => {
    expect(splitPackageSpecifier("react-dom/client")).toEqual({
      packageName: "react-dom",
      subpath: "/client",
    });
  });

  it("splits scoped packages", () => {
    expect(splitPackageSpecifier("@scope/pkg/sub/deep")).toEqual({
      packageName: "@scope/pkg",
      subpath: "/sub/deep",
    });
    expect(splitPackageSpecifier("@scope/pkg")).toEqual({
      packageName: "@scope/pkg",
      subpath: "",
    });
  });
});

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
  });
});
