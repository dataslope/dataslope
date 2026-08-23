/**
 * Streaming and stack-trace cleanup for the Java playground.
 *
 * Traces here are written in the Java 8 shape, since that is what CheerpJ
 * runs; `javaBuild.test.ts` checks the same cleanup against whatever JDK is
 * on the machine, which spells the reflection frames differently.
 */
import { describe, expect, it } from "vitest";

import {
  JavaOutputRouter,
  type JavaOutputChunk,
} from "../app/_components/runtime/javaOutput";

/** Collect what a router emits, and the text each cell ends up holding. */
function collect(options?: { firstSeq?: number }) {
  const chunks: JavaOutputChunk[] = [];
  const router = new JavaOutputRouter((c) => chunks.push(c), options);
  const cells = () => {
    const bySeq = new Map<number, { channel: string; content: string }>();
    for (const c of chunks) {
      const existing = bySeq.get(c.seq);
      if (existing && c.append) existing.content += c.content;
      else bySeq.set(c.seq, { channel: c.channel, content: c.content });
    }
    return [...bySeq.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([seq, cell]) => ({ seq, ...cell }));
  };
  return { router, chunks, cells };
}

describe("streaming", () => {
  it("emits a prompt that has no newline yet", () => {
    // JV-09: output was collected and rendered at exit, so a program that
    // printed a prompt and then waited showed nothing at all.
    const { router, chunks } = collect();
    router.write("stdout", "Enter your name: ");
    expect(chunks).toEqual([
      {
        channel: "stdout",
        content: "Enter your name: ",
        seq: 0,
        append: false,
      },
    ]);
  });

  it("grows one cell for a run of writes on the same stream", () => {
    const { router, chunks, cells } = collect();
    router.write("stdout", "one\n");
    router.write("stdout", "two\n");
    router.write("stdout", "three\n");
    expect(chunks.map((c) => c.append)).toEqual([false, true, true]);
    expect(cells()).toEqual([
      { seq: 0, channel: "stdout", content: "one\ntwo\nthree\n" },
    ]);
  });

  it("keeps the order the two streams were written in", () => {
    const { router, cells } = collect();
    router.write("stdout", "before\n");
    router.write("stderr", "warning\n");
    router.write("stdout", "after\n");
    router.flush();
    expect(cells()).toEqual([
      { seq: 0, channel: "stdout", content: "before\n" },
      { seq: 1, channel: "stderr", content: "warning\n" },
      { seq: 2, channel: "stdout", content: "after\n" },
    ]);
  });

  it("does not split a line that arrives in pieces", () => {
    const { router, cells } = collect();
    router.write("stdout", "half");
    router.write("stdout", " and half\n");
    router.flush();
    expect(cells()).toEqual([
      { seq: 0, channel: "stdout", content: "half and half\n" },
    ]);
  });

  it("emits a last line with no trailing newline", () => {
    const { router, cells } = collect();
    router.write("stdout", "done\nno newline here");
    router.flush();
    expect(cells()).toEqual([
      { seq: 0, channel: "stdout", content: "done\nno newline here" },
    ]);
  });

  it("starts after the cell the compile diagnostics took", () => {
    const { router, cells } = collect({ firstSeq: 1 });
    router.write("stdout", "hello\n");
    router.flush();
    expect(cells()).toEqual([
      { seq: 1, channel: "stdout", content: "hello\n" },
    ]);
    expect(router.nextSeq).toBe(2);
  });

  it("reports where the next cell would go before anything is written", () => {
    const { router } = collect({ firstSeq: 1 });
    expect(router.nextSeq).toBe(1);
  });
});

describe("launcher frames", () => {
  const trace =
    'Exception in thread "main" java.lang.IllegalStateException: deliberate\n' +
    "\tat Main.boom(Main.java:3)\n" +
    "\tat Main.main(Main.java:5)\n" +
    "\tat sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n" +
    "\tat sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)\n" +
    "\tat sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)\n" +
    "\tat java.lang.reflect.Method.invoke(Method.java:498)\n" +
    "\tat __DataslopeMain.main(__DataslopeMain.java:24)\n";

  /** Feed a trace the way a PrintStream does: one write per line. */
  function play(text: string, options?: { firstSeq?: number }) {
    const { router, cells } = collect(options);
    for (const line of text.split(/(?<=\n)/)) router.write("stderr", line);
    router.flush();
    return cells()[0]?.content ?? "";
  }

  it("takes the harness back out of the trace", () => {
    expect(play(trace)).toBe(
      'Exception in thread "main" java.lang.IllegalStateException: deliberate\n' +
        "\tat Main.boom(Main.java:3)\n" +
        "\tat Main.main(Main.java:5)\n",
    );
  });

  it("survives a trace arriving as one write", () => {
    const { router, cells } = collect();
    router.write("stderr", trace);
    router.flush();
    expect(cells()[0].content).toBe(
      'Exception in thread "main" java.lang.IllegalStateException: deliberate\n' +
        "\tat Main.boom(Main.java:3)\n" +
        "\tat Main.main(Main.java:5)\n",
    );
  });

  it("recounts the frames a Caused by block says it shares", () => {
    // `... 8 more` counted five frames the reader can no longer see.
    const withCause =
      'Exception in thread "main" java.lang.RuntimeException: outer\n' +
      "\tat Main.mid(Main.java:3)\n" +
      "\tat Main.main(Main.java:6)\n" +
      "\tat sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n" +
      "\tat sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)\n" +
      "\tat sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)\n" +
      "\tat java.lang.reflect.Method.invoke(Method.java:498)\n" +
      "\tat __DataslopeMain.main(__DataslopeMain.java:24)\n" +
      "Caused by: java.lang.IllegalStateException: inner\n" +
      "\tat Main.boom(Main.java:2)\n" +
      "\t... 7 more\n";
    expect(play(withCause)).toBe(
      'Exception in thread "main" java.lang.RuntimeException: outer\n' +
        "\tat Main.mid(Main.java:3)\n" +
        "\tat Main.main(Main.java:6)\n" +
        "Caused by: java.lang.IllegalStateException: inner\n" +
        "\tat Main.boom(Main.java:2)\n" +
        "\t... 2 more\n",
    );
  });

  it("drops a shared-frame line that counted nothing else", () => {
    const allShared =
      'Exception in thread "main" java.lang.RuntimeException: outer\n' +
      "\tat sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n" +
      "\tat java.lang.reflect.Method.invoke(Method.java:498)\n" +
      "\tat __DataslopeMain.main(__DataslopeMain.java:24)\n" +
      "Caused by: java.lang.IllegalStateException: inner\n" +
      "\tat Main.boom(Main.java:2)\n" +
      "\t... 3 more\n";
    expect(play(allShared)).toBe(
      'Exception in thread "main" java.lang.RuntimeException: outer\n' +
        "Caused by: java.lang.IllegalStateException: inner\n" +
        "\tat Main.boom(Main.java:2)\n",
    );
  });

  it("keeps reflection the program did itself", () => {
    // Only the frames that run into the launcher are ours.
    const ownReflection =
      'Exception in thread "main" java.lang.RuntimeException: boom\n' +
      "\tat Target.run(Target.java:5)\n" +
      "\tat sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n" +
      "\tat java.lang.reflect.Method.invoke(Method.java:498)\n" +
      "\tat Main.callByReflection(Main.java:9)\n" +
      "\tat Main.main(Main.java:4)\n" +
      "\tat sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n" +
      "\tat java.lang.reflect.Method.invoke(Method.java:498)\n" +
      "\tat __DataslopeMain.main(__DataslopeMain.java:24)\n";
    expect(play(ownReflection)).toBe(
      'Exception in thread "main" java.lang.RuntimeException: boom\n' +
        "\tat Target.run(Target.java:5)\n" +
        "\tat sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n" +
        "\tat java.lang.reflect.Method.invoke(Method.java:498)\n" +
        "\tat Main.callByReflection(Main.java:9)\n" +
        "\tat Main.main(Main.java:4)\n",
    );
  });

  it("counts each trace's stripped frames on its own", () => {
    // Two printStackTrace calls in one run: the second must not be
    // discounted by the first's frames as well as its own.
    const twice =
      "java.lang.RuntimeException: first\n" +
      "\tat Main.main(Main.java:4)\n" +
      "\tat java.lang.reflect.Method.invoke(Method.java:498)\n" +
      "\tat __DataslopeMain.main(__DataslopeMain.java:24)\n" +
      "Caused by: java.lang.IllegalStateException: cause\n" +
      "\tat Main.boom(Main.java:2)\n" +
      "\t... 3 more\n" +
      "java.lang.RuntimeException: second\n" +
      "\tat Main.main(Main.java:5)\n" +
      "\tat java.lang.reflect.Method.invoke(Method.java:498)\n" +
      "\tat __DataslopeMain.main(__DataslopeMain.java:24)\n" +
      "Caused by: java.lang.IllegalStateException: cause\n" +
      "\tat Main.boom(Main.java:2)\n" +
      "\t... 3 more\n";
    expect(play(twice)).toBe(
      "java.lang.RuntimeException: first\n" +
        "\tat Main.main(Main.java:4)\n" +
        "Caused by: java.lang.IllegalStateException: cause\n" +
        "\tat Main.boom(Main.java:2)\n" +
        "\t... 1 more\n" +
        "java.lang.RuntimeException: second\n" +
        "\tat Main.main(Main.java:5)\n" +
        "Caused by: java.lang.IllegalStateException: cause\n" +
        "\tat Main.boom(Main.java:2)\n" +
        "\t... 1 more\n",
    );
  });

  it("leaves a program's own output alone", () => {
    const { router, cells } = collect();
    router.write("stdout", "\tat the start of a line\n");
    router.write("stdout", "... 3 more of something\n");
    router.flush();
    expect(cells()[0].content).toBe(
      "\tat the start of a line\n... 3 more of something\n",
    );
  });
});
