/**
 * Registry of lesson illustrations.
 *
 * Maps a stable kebab-case `name` (used in MDX, e.g. `<Illustration
 * name="closure-backpack" />`) to the inner SVG `Art`, its `viewBox`, a default
 * accessible label, and an optional natural max width. Keeping this lookup in
 * one place means `mdx-components.tsx` registers a single `<Illustration>`
 * component, and new art can be added without touching MDX wiring.
 */
import type { FC } from "react";
import { TypedValuesArt, BranchingPathArt } from "./art/lineArt";
import { TenDaySprintArt, FunctionMachineArt, LoopCycleArt, TransformPipelineArt } from "./art/flat";
import { VariableBoxArt, IndexedArrayArt, ScopeNestingArt } from "./art/iso";
import { WelcomeJourneyArt, ObjectKeyValueArt, ClosureBackpackArt, PromisePlaceholderArt } from "./art/duotone";

export interface ArtEntry {
  /** SVG viewBox, e.g. "0 0 420 240". */
  viewBox: string;
  /** Default `aria-label` describing the illustration. */
  defaultAlt: string;
  /** Renders the inner content of the <svg>. */
  Art: FC;
  /** Natural max width (CSS length) so the piece isn't blown up too large. */
  maxWidth?: string;
  /** Short note on the visual style — for documentation / a future gallery. */
  style: "line-art" | "flat" | "isometric" | "duotone";
}

export const ART: Record<string, ArtEntry> = {
  // ── Duotone / editorial ──────────────────────────────────────────────
  "welcome-journey": {
    viewBox: "0 0 480 250",
    defaultAlt:
      "A rising slope past four milestone markers to a flag at the summit, over an ambient field of code symbols — learning to program as a climb.",
    Art: WelcomeJourneyArt,
    maxWidth: "34rem",
    style: "duotone",
  },
  "object-keyvalue": {
    viewBox: "0 0 400 268",
    defaultAlt:
      "A record card labelled 'user' with three rows mapping keys (name, age, isAdmin) to their values.",
    Art: ObjectKeyValueArt,
    maxWidth: "23rem",
    style: "duotone",
  },
  "closure-backpack": {
    viewBox: "0 28 360 226",
    defaultAlt:
      "A function drawn as a labelled block carrying a backpack that holds a captured variable named 'greeting', inside a dashed boundary marking the scope it was born in.",
    Art: ClosureBackpackArt,
    maxWidth: "24rem",
    style: "duotone",
  },
  "promise-placeholder": {
    viewBox: "0 40 440 164",
    defaultAlt:
      "A 'Promise' ticket in a pending state with a spinner, settling later into either a fulfilled value or a rejected error.",
    Art: PromisePlaceholderArt,
    maxWidth: "32rem",
    style: "duotone",
  },

  // ── Flat geometric ───────────────────────────────────────────────────
  "ten-day-sprint": {
    viewBox: "0 22 420 216",
    defaultAlt:
      "A calendar reading 'APRIL 1995 — 10 DAYS' beside a running alarm clock, evoking JavaScript designed in ten days.",
    Art: TenDaySprintArt,
    maxWidth: "27rem",
    style: "flat",
  },
  "function-machine": {
    viewBox: "0 30 440 176",
    defaultAlt:
      "Two inputs feeding into a labelled 'fn' machine with a gear on top, producing a single output.",
    Art: FunctionMachineArt,
    maxWidth: "30rem",
    style: "flat",
  },
  "loop-cycle": {
    viewBox: "0 0 320 290",
    defaultAlt:
      "A circular arrow looping around a small deck of cards labelled 'body', with a counter badge reading 'i++' in the gap.",
    Art: LoopCycleArt,
    maxWidth: "19rem",
    style: "flat",
  },
  "transform-pipeline": {
    viewBox: "0 60 504 92",
    defaultAlt:
      "A pipeline: four input squares pass through map (becoming circles), filter (dropping two), then reduce (combining into one value).",
    Art: TransformPipelineArt,
    maxWidth: "34rem",
    style: "flat",
  },

  // ── Isometric ────────────────────────────────────────────────────────
  "variable-box": {
    viewBox: "40 0 280 230",
    defaultAlt:
      "An isometric box labelled 'age' holding the value 28, with an arrow showing it being reassigned to 29 via 'let'.",
    Art: VariableBoxArt,
    maxWidth: "20rem",
    style: "isometric",
  },
  "indexed-array": {
    viewBox: "0 0 452 176",
    defaultAlt:
      "A row of five contiguous slots holding 10, 20, 30, 40, 50 with zero-based index badges 0 to 4 above them, and a 'length 5' label.",
    Art: IndexedArrayArt,
    maxWidth: "33rem",
    style: "isometric",
  },
  "scope-nesting": {
    viewBox: "0 24 342 288",
    defaultAlt:
      "Three stacked isometric platforms — global, function, block — with a name 'x' looked up by walking outward until it is found in the function scope.",
    Art: ScopeNestingArt,
    maxWidth: "21rem",
    style: "isometric",
  },

  // ── Line art ─────────────────────────────────────────────────────────
  "typed-values": {
    viewBox: "0 10 416 218",
    defaultAlt:
      "Four labelled value chips — 42 (number), \"hi\" (string), true (boolean), [1, 2, 3] (array) — converging on a single node.",
    Art: TypedValuesArt,
    maxWidth: "27rem",
    style: "line-art",
  },
  "branching-path": {
    viewBox: "0 30 420 188",
    defaultAlt:
      "A path reaching a decision diamond and splitting into a highlighted 'true' branch that runs a block and a muted 'false' branch that is skipped.",
    Art: BranchingPathArt,
    maxWidth: "29rem",
    style: "line-art",
  },
};
