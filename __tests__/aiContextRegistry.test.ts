/**
 * Ask AI context registry: registration, pinning, snapshot collection, and
 * schema preference. Runs in the Node environment, so all sources here are
 * element-less (element-less sources count as always visible; visibility
 * tracking itself needs IntersectionObserver and is exercised in the browser).
 */
import { describe, it, expect } from "vitest";
import {
  collectAskAiLiveSources,
  collectAskAiWidgets,
  getAskAiSources,
  registerAskAiSource,
} from "../app/_components/ai/contextRegistry";

describe("contextRegistry", () => {
  it("registers/unregisters sources and collects their snapshots", () => {
    const un1 = registerAskAiSource({
      kind: "challenge",
      label: "Challenge: A",
      getSnapshot: () => ({ content: "challenge state" }),
    });
    const un2 = registerAskAiSource({
      kind: "sql-playground",
      label: "SQLite playground",
      getSnapshot: () => ({ content: "sql state", schema: "Table t (id)" }),
    });
    try {
      expect(getAskAiSources().map((s) => s.label)).toEqual([
        "Challenge: A",
        "SQLite playground",
      ]);

      const { widgets, schema } = collectAskAiWidgets(new Set());
      expect(widgets.map((w) => w.label)).toEqual([
        "Challenge: A",
        "SQLite playground",
      ]);
      expect(widgets.every((w) => !w.referenced)).toBe(true);
      expect(schema).toBe("Table t (id)");
    } finally {
      un1();
      un2();
    }
    expect(getAskAiSources()).toEqual([]);
    expect(collectAskAiWidgets(new Set()).widgets).toEqual([]);
  });

  it("marks pinned sources as referenced and orders them first", () => {
    const unA = registerAskAiSource({
      kind: "code-block",
      label: "Block A",
      getSnapshot: () => ({ content: "a" }),
    });
    const unB = registerAskAiSource({
      kind: "code-block",
      label: "Block B",
      getSnapshot: () => ({ content: "b" }),
    });
    try {
      const idB = getAskAiSources().find((s) => s.label === "Block B")!.id;
      const { widgets } = collectAskAiWidgets(new Set([idB]));
      expect(widgets[0]).toMatchObject({ label: "Block B", referenced: true });
      expect(widgets[1]).toMatchObject({ label: "Block A" });
      expect(widgets[1].referenced).toBeUndefined();
    } finally {
      unA();
      unB();
    }
  });

  it("skips empty and throwing snapshots without breaking collection", () => {
    const unEmpty = registerAskAiSource({
      kind: "mcq",
      label: "Empty",
      getSnapshot: () => ({ content: "   " }),
    });
    const unThrows = registerAskAiSource({
      kind: "mcq",
      label: "Throws",
      getSnapshot: () => {
        throw new Error("boom");
      },
    });
    const unOk = registerAskAiSource({
      kind: "mcq",
      label: "Ok",
      getSnapshot: () => ({ content: "fine" }),
    });
    try {
      const { widgets } = collectAskAiWidgets(new Set());
      expect(widgets.map((w) => w.label)).toEqual(["Ok"]);
    } finally {
      unEmpty();
      unThrows();
      unOk();
    }
  });

  it("prefers a pinned source's schema over a merely-visible one", () => {
    const unVisible = registerAskAiSource({
      kind: "sql-playground",
      label: "Visible",
      getSnapshot: () => ({ content: "v", schema: "visible-schema" }),
    });
    const unPinned = registerAskAiSource({
      kind: "challenge",
      label: "Pinned",
      getSnapshot: () => ({ content: "p", schema: "pinned-schema" }),
    });
    try {
      const idPinned = getAskAiSources().find((s) => s.label === "Pinned")!.id;
      expect(collectAskAiWidgets(new Set([idPinned])).schema).toBe(
        "pinned-schema",
      );
      expect(collectAskAiWidgets(new Set()).schema).toBe("visible-schema");
    } finally {
      unVisible();
      unPinned();
    }
  });

  it("collects live sources with their registry id and schema", () => {
    const unBlock = registerAskAiSource({
      kind: "code-block",
      label: "main.py",
      getSnapshot: () => ({ content: "print(1)" }),
    });
    const unSql = registerAskAiSource({
      kind: "sql-playground",
      label: "SQLite playground",
      getSnapshot: () => ({ content: "SELECT 1", schema: "Table t (id)" }),
    });
    try {
      const live = collectAskAiLiveSources();
      const ids = getAskAiSources().map((s) => s.id);
      expect(live.map((s) => s.label)).toEqual(["main.py", "SQLite playground"]);
      expect(live.map((s) => s.id)).toEqual(ids);
      expect(live.find((s) => s.label === "SQLite playground")?.schema).toBe(
        "Table t (id)",
      );
      expect(live.find((s) => s.label === "main.py")?.schema).toBeUndefined();
    } finally {
      unBlock();
      unSql();
    }
  });

  it("skips empty and throwing snapshots when collecting live sources", () => {
    const unEmpty = registerAskAiSource({
      kind: "mcq",
      label: "Empty",
      getSnapshot: () => ({ content: "   " }),
    });
    const unThrows = registerAskAiSource({
      kind: "mcq",
      label: "Throws",
      getSnapshot: () => {
        throw new Error("boom");
      },
    });
    const unOk = registerAskAiSource({
      kind: "code-block",
      label: "Ok",
      getSnapshot: () => ({ content: "fine" }),
    });
    try {
      expect(collectAskAiLiveSources().map((s) => s.label)).toEqual(["Ok"]);
    } finally {
      unEmpty();
      unThrows();
      unOk();
    }
  });

  it("caps the number of collected widgets", () => {
    const unregisters = Array.from({ length: 10 }, (_, i) =>
      registerAskAiSource({
        kind: "code-block",
        label: `Block ${i}`,
        getSnapshot: () => ({ content: `c${i}` }),
      }),
    );
    try {
      expect(collectAskAiWidgets(new Set()).widgets).toHaveLength(6);
    } finally {
      unregisters.forEach((fn) => fn());
    }
  });
});
