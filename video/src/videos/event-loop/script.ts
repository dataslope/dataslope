import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "The event loop ordering puzzle", after
 * content/courses/beginners-javascript/how-javascript-runs.mdx, section
 * "A famous ordering puzzle", using the lesson's exact snippet (data.ts).
 *
 * Every animation in this video is cued to a word below (see Video.tsx and
 * the scene files), so edit freely: a cue whose word disappears throws in the
 * Studio rather than silently drifting.
 *
 * Facts checked by running the snippet with Node 22.22.0, which prints
 *   1: script start / 2: script end / 3: promise microtask / 4: setTimeout callback
 * and two variants: the same order holds when the script busy-waits 50 ms
 * after scheduling both (so the 0 ms timer has certainly fired), and a
 * microtask queued by a microtask still runs before the timer's task. The rule
 * is the lesson's: when the stack is empty, drain every microtask, then run
 * one task.
 *
 * Written to be spoken: "set timeout" and "dot then" as a person says them,
 * no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "event-loop",
  leadIn: 0.6,
  tail: 2.6,
  beats: [
    {
      id: "hook",
      text: "Here's a famous JavaScript puzzle. Four logs. In what order do they print?",
      pauseAfter: 1.1,
    },
    { id: "answer", text: "It prints in label order: one, two, three, four.", pauseAfter: 0.4 },
    {
      id: "surprise",
      text: "The timer was set first, with a delay of zero, yet it prints last, after the promise.",
      pauseAfter: 0.6,
    },
    {
      id: "machine",
      scene: true,
      text: "To see why, meet the machinery: a call stack, a task queue, a microtask queue, and the event loop that moves work between them.",
      pauseAfter: 0.5,
    },
    {
      id: "stack",
      scene: true,
      text: "The whole script runs on the call stack. Line one logs right away.",
      pauseAfter: 0.4,
    },
    {
      id: "timeout",
      text: "Set timeout does not run its callback now. It hands it to the host's timer, and when the timer fires, the callback waits in the task queue.",
      pauseAfter: 0.4,
    },
    { id: "then", text: "The dot then call puts its callback in the microtask queue.", pauseAfter: 0.4 },
    { id: "sync-end", text: "Line two logs, and the script finishes. The stack is empty.", pauseAfter: 0.6 },
    {
      id: "rule",
      text: "Now the event loop's rule. When the stack is empty, run every microtask, then take one task.",
      pauseAfter: 0.5,
    },
    { id: "micro-run", text: "So the promise callback runs first, and logs three.", pauseAfter: 0.3 },
    {
      id: "task-run",
      text: "Only then does the timer's callback get its turn, and logs four.",
      pauseAfter: 0.7,
    },
    {
      id: "replay",
      scene: true,
      text: "Once more, in order. Script start. Script end. Promise microtask. Set timeout callback.",
      pauseAfter: 0.6,
    },
    {
      id: "takeaway",
      text: "So a zero delay never means right now. A timer's callback is a task, and every microtask runs before the next task starts.",
      pauseAfter: 0.6,
    },
    {
      id: "outro",
      scene: true,
      text: "The Dataslope lesson, How JavaScript Runs, walks through it with code you can run.",
    },
  ],
};
