import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Type erasure" (16:9), after
 * content/courses/typescript-from-scratch/how-typescript-works.mdx ("Compile
 * time vs. runtime", "What the compiler can't do"), with the fix from
 * any-unknown-never.mdx (`unknown`) and type-narrowing.mdx (user-defined type
 * predicates).
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, each checked by verify.py, which compiles every example with the
 * repo's TypeScript 5.9.3 (`tsc --target es2022 <file>.ts`) and runs the
 * output on Node 22.22.0; compiled.json is its output, and every listing,
 * error and line of output on screen is read from it (data.ts):
 *   - user.ts compiles with no errors, and user.js has no interface, no `<T>`
 *     and no annotation left: deleting exactly those spans from user.ts gives
 *     user.js, up to whitespace (asserted). `node user.js` prints ADA;
 *   - `x instanceof User` against an interface is TS2693, "'User' only
 *     refers to a type, but is being used as a value here." tsc still writes
 *     check.js (exit code 2, but the file is emitted), and calling it there
 *     throws "ReferenceError: User is not defined";
 *   - `JSON.parse` is declared to return `any` (lib.es5.d.ts), so
 *     `const user: User = JSON.parse(text)` compiles with no output and exit
 *     code 0, and with the name null it crashes at runtime with
 *     "TypeError: Cannot read properties of null (reading 'toUpperCase')";
 *   - parsed into `unknown`, the same use is TS2339, "Property 'name' does
 *     not exist on type 'unknown'." Behind the `isUser` type predicate it
 *     compiles, and the null name takes the else branch: "Not a user: ...".
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "type-erasure",
  leadIn: 0.5,
  tail: 2.4,
  beats: [
    { id: "hook", text: "TypeScript checks your types, and then it deletes them.", pauseAfter: 0.4 },
    {
      id: "file",
      text: "Here is a small TypeScript file. An interface, a generic function, and type annotations.",
      pauseAfter: 0.3,
    },
    { id: "compile", text: "Run the compiler, and this is the JavaScript it writes.", pauseAfter: 0.4 },
    {
      id: "gone",
      text: "The interface is gone. So are the generic and every annotation. What runs is plain JavaScript.",
      pauseAfter: 0.6,
    },
    {
      id: "instanceof",
      scene: true,
      text: "So you cannot ask whether a value is an instance of User. The compiler flags it, and the JavaScript it writes anyway has no User to ask about.",
      pauseAfter: 0.6,
    },
    {
      id: "claim",
      scene: true,
      text: "It also means a type on outside data is only a claim. JSON dot parse returns any, so the compiler accepts whatever type you give it.",
      pauseAfter: 0.35,
    },
    {
      id: "crash",
      text: "Say the server sends the name as null. The file compiles with no errors. Then it runs, and crashes.",
      pauseAfter: 0.6,
    },
    {
      id: "fix",
      scene: true,
      text: "The fix is a check that actually runs. Parse into unknown, and the compiler will not let you use the value until you test it.",
      pauseAfter: 0.3,
    },
    {
      id: "narrow",
      text: "Test each field. Inside the check, TypeScript narrows the value to a User. Bad data takes the other branch.",
      pauseAfter: 0.6,
    },
    {
      id: "rule",
      scene: true,
      text: "Types describe what you expect. Only a runtime check can tell you what actually arrived.",
    },
  ],
};
