/**
 * The illustration registry: maps each stable `name` used in MDX to its
 * artwork, accessible label, SVG user-space, and default frame width.
 *
 * Add a new graphic by exporting a render function from a section file and
 * registering it here. Keys are kebab-case and never change once an MDX page
 * references them.
 */
import type { IllustrationRegistry } from "./types";
import * as Values from "./values";
import * as ControlFlow from "./controlFlow";
import * as Functions from "./functions";
import * as Data from "./data";
import * as Transform from "./transform";
import * as Thinking from "./thinking";
import * as Runtime from "./runtime";
import * as History from "./history";
import * as Engineering from "./engineering";

export const illustrations: IllustrationRegistry = {
  // ── Values, variables, and types ──────────────────────────────────────
  "types-as-tokens": {
    label:
      "Six rounded chips, one per JavaScript type — number, string, boolean, null, object, and array — each drawn with a small glyph.",
    viewBox: "0 0 380 212",
    size: "md",
    render: Values.TypesAsTokens,
  },
  "variable-rebind": {
    label:
      "A name tag linked by a solid arrow to its current value and by a faded arrow to the previous value it no longer points at.",
    viewBox: "0 0 372 196",
    size: "md",
    render: Values.VariableRebind,
  },
  "number-line": {
    label:
      "A number line running in both directions through zero, with a curved arc hopping three steps to the right.",
    viewBox: "0 0 380 168",
    size: "lg",
    render: Values.NumberLine,
  },
  "string-cells": {
    label:
      "The characters of a word in a row of cells, numbered from zero underneath to show zero-based indexing.",
    viewBox: "0 0 372 96",
    size: "lg",
    render: Values.StringCells,
  },
  "boolean-venn": {
    label:
      "Two overlapping circles whose shared lens highlights where both conditions are true at once.",
    viewBox: "0 0 376 200",
    size: "sm",
    render: Values.BooleanVenn,
  },

  // ── Control flow ──────────────────────────────────────────────────────
  "branch-fork": {
    label:
      "A path reaching a diamond-shaped decision and splitting two ways: a green branch with a check mark and a red branch with a cross.",
    viewBox: "0 0 360 212",
    size: "sm",
    render: ControlFlow.BranchFork,
  },
  "loop-cycle": {
    label:
      "A circular arrow looping back on itself with iteration ticks, and a branch that exits to a green check when the condition stops holding.",
    viewBox: "0 0 330 220",
    size: "sm",
    render: ControlFlow.LoopCycle,
  },

  // ── Functions and modularity ──────────────────────────────────────────
  "function-machine": {
    label:
      "A value entering a gear-driven machine on the left and a transformed value leaving on the right.",
    viewBox: "0 0 360 196",
    size: "md",
    render: Functions.FunctionMachine,
  },
  "params-funnel": {
    label:
      "Three differently coloured arguments funnelling into a function and a single return value coming out.",
    viewBox: "0 0 360 196",
    size: "md",
    render: Functions.ParamsFunnel,
  },
  "nested-scopes": {
    label:
      "Three nested rounded rectangles — global, outer, and inner scope — with a dashed arrow showing a name resolved by walking outward.",
    viewBox: "0 0 360 200",
    size: "md",
    render: Functions.NestedScopes,
  },
  "closure-backpack": {
    label:
      "A function that has moved away from the scope it was born in, still carrying a captured value in an attached pouch.",
    viewBox: "0 0 336 200",
    size: "md",
    render: Functions.ClosureBackpack,
  },

  // ── Composite data ────────────────────────────────────────────────────
  "array-cells": {
    label:
      "Five bracketed cells in a row, each holding a coloured value and numbered from zero to show zero-based indexing.",
    viewBox: "0 0 340 96",
    size: "lg",
    render: Data.ArrayCells,
  },
  "object-record": {
    label:
      "A record card of key-and-value rows, each key a coloured pill paired with a value shape, wrapped in braces.",
    viewBox: "0 0 330 196",
    size: "md",
    render: Data.ObjectRecord,
  },
  "nested-tree": {
    label:
      "A small tree: a root object branching to a nested array and a nested object, each ending in leaf values.",
    viewBox: "0 0 340 206",
    size: "md",
    render: Data.NestedTree,
  },

  // ── Data transformation ───────────────────────────────────────────────
  "mfr-pipeline": {
    label:
      "A pipeline reading left to right: map recolours every item, filter keeps only some, and reduce folds the survivors into one value.",
    viewBox: "0 0 384 210",
    size: "lg",
    render: Transform.MfrPipeline,
  },
  "compose-pipes": {
    label:
      "A value flowing through two chained functions, changing shape and colour as it passes from the first into the second.",
    viewBox: "0 0 380 140",
    size: "lg",
    render: Transform.ComposePipes,
  },

  // ── Thinking like a programmer ────────────────────────────────────────
  "cpu-cycle": {
    label:
      "A processor chip at the centre of a three-step loop — fetch, decode, execute — repeating clockwise.",
    viewBox: "0 0 320 210",
    size: "md",
    render: Thinking.CpuCycle,
  },
  "decomposition-split": {
    label:
      "One large problem block breaking apart into four smaller, independent pieces.",
    viewBox: "0 0 360 192",
    size: "md",
    render: Thinking.DecompositionSplit,
  },
  "maze-path": {
    label:
      "A dotted route weaving past scattered obstacles from a start point to a goal flag.",
    viewBox: "0 0 330 210",
    size: "md",
    render: Thinking.MazePath,
  },

  // ── Runtime and asynchrony ────────────────────────────────────────────
  "call-stack": {
    label:
      "Function frames stacked on top of one another, with arrows pushing a new frame on and popping the top one off.",
    viewBox: "0 0 300 210",
    size: "sm",
    render: Runtime.CallStack,
  },
  "event-loop": {
    label:
      "An event loop taking the next task from a waiting queue and running it on the call stack once the stack is empty.",
    viewBox: "0 0 360 210",
    size: "md",
    render: Runtime.EventLoop,
  },
  "async-handoff": {
    label:
      "A main thread that hands a long task to a background lane and keeps working, with a callback returning the result later.",
    viewBox: "0 0 360 180",
    size: "lg",
    render: Runtime.AsyncHandoff,
  },
  "promise-states": {
    label:
      "A pending promise settling either to a green fulfilled state or a red rejected state.",
    viewBox: "0 0 330 200",
    size: "md",
    render: Runtime.PromiseStates,
  },

  // ── The story of JavaScript ───────────────────────────────────────────
  "abstraction-ladder": {
    label:
      "Three stacked layers rising from raw binary at the bottom, through assembly, to human-readable high-level code at the top.",
    viewBox: "0 0 290 210",
    size: "sm",
    render: History.AbstractionLadder,
  },
  "compiled-vs-interpreted": {
    label:
      "Two lanes: a compiled language turning source into a binary before running, and an interpreted language running source directly.",
    viewBox: "0 0 320 190",
    size: "md",
    render: History.CompiledVsInterpreted,
  },
  "client-server": {
    label:
      "A browser window and a server exchanging a request and a response.",
    viewBox: "0 0 360 170",
    size: "md",
    render: History.ClientServer,
  },
  "ten-day-spark": {
    label:
      "An emblem: a lightning bolt inside a ring marked with ten ticks, for a language prototyped in ten days.",
    viewBox: "0 0 240 240",
    size: "sm",
    render: History.TenDaySpark,
  },
  "ecosystem-burst": {
    label:
      "A single library at the centre radiating outward into a galaxy of many colourful packages.",
    viewBox: "0 0 320 240",
    size: "md",
    render: History.EcosystemBurst,
  },
  "runtime-hub": {
    label:
      "One language at the hub, with spokes out to a browser, a server, a phone, a terminal, and a hardware chip.",
    viewBox: "0 0 340 240",
    size: "md",
    render: History.RuntimeHub,
  },
  "ubiquity-globe": {
    label:
      "A line-art globe with lit nodes scattered across it, for a language used everywhere.",
    viewBox: "0 0 240 240",
    size: "sm",
    render: History.UbiquityGlobe,
  },

  // ── Engineering foundations ───────────────────────────────────────────
  "bug-magnifier": {
    label:
      "A magnifying glass and a bug held over a block of code, for systematic debugging.",
    viewBox: "0 0 240 200",
    size: "md",
    render: Engineering.BugMagnifier,
  },
  "tangle-vs-tidy": {
    label:
      "A tangled red scribble on the left beside neat, evenly stacked green lines on the right.",
    viewBox: "0 0 360 180",
    size: "md",
    render: Engineering.TangleVsTidy,
  },
  "modules-blocks": {
    label:
      "Three code modules plugging into one another through export plugs and import sockets.",
    viewBox: "0 0 360 150",
    size: "md",
    render: Engineering.ModulesBlocks,
  },
  roadmap: {
    label:
      "A road winding into the distance past three milestone flags.",
    viewBox: "0 0 342 200",
    size: "md",
    render: Engineering.Roadmap,
  },
};
