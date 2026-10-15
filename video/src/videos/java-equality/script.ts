import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "== or .equals()?" (16:9), after
 * content/courses/java-programming-for-beginners/the-type-system.mdx,
 * "Strings are not primitive" (never compare strings with `==`: it compares
 * references, `equals` compares contents), with the stack and heap picture
 * of content/courses/java-programming-for-beginners/stack-and-heap.mdx. No
 * lesson covers the Integer cache; that half follows the same rule.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, each printed by Equality.java on OpenJDK 21.0.12.1 (measure.py runs
 * it and writes measurements.json, which data.ts reads):
 *   - with a = "hi" and b = new String("hi"), a == b prints false and
 *     a.equals(b) prints true;
 *   - with c = "hi", a == c is true, and a == "hi".intern() is true: a
 *     literal is the interned copy;
 *   - d = "HI".toLowerCase() is built at run time: a == d and b == d are
 *     false, a.equals(d) is true;
 *   - Integer a = 127, b = 127: a == b prints true; Integer x = 128, y = 128:
 *     x == y prints false and x.equals(y) prints true;
 *   - javap shows each of those four boxings compiled to Integer.valueOf;
 *   - scanning every int from -100,000 to 100,000, two boxings give one
 *     object exactly for -128 to 127, 256 values; with
 *     -XX:AutoBoxCacheMax=1000 the range runs to 1000 and x == y is true.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "java-equality",
  leadIn: 0.5,
  tail: 2.4,
  beats: [
    {
      id: "hook",
      text: "These two Java strings hold the same two letters.",
      pauseAfter: 0.35,
    },
    {
      id: "verdict",
      text: "Ask with equals equals, and Java prints false. Ask with dot equals, and it prints true.",
      pauseAfter: 0.6,
    },
    {
      id: "questions",
      text: "They ask different questions. Equals equals asks, is this the same object? Dot equals asks, do they hold the same contents?",
      pauseAfter: 0.6,
    },
    {
      id: "refs",
      scene: true,
      text: "A string variable never holds the letters. It holds a reference, an arrow to an object on the heap.",
      pauseAfter: 0.35,
    },
    {
      id: "literal",
      text: "String literals are interned. Write the same literal twice, and both arrows point at one shared object, so equals equals is true.",
      pauseAfter: 0.35,
    },
    {
      id: "fresh",
      text: "New String always makes a fresh object, and so does a string built while the program runs. Same letters, different arrows.",
      pauseAfter: 0.6,
    },
    {
      id: "boxing",
      scene: true,
      text: "Numbers hide a sharper trap. Box one hundred twenty-seven into two Integers, and equals equals says true.",
      pauseAfter: 0.3,
    },
    {
      id: "boxing-128",
      text: "Box one hundred twenty-eight, and it says false. Dot equals still says true.",
      pauseAfter: 0.6,
    },
    {
      id: "cache",
      scene: true,
      text: "Autoboxing calls Integer dot value of. It keeps one cached object for each value from minus one hundred twenty-eight to one hundred twenty-seven.",
      pauseAfter: 0.3,
    },
    {
      id: "outside",
      text: "Inside that range, both variables get the same cached object. Outside it, each box is brand new, so the arrows differ.",
      pauseAfter: 0.6,
    },
    {
      id: "rule",
      scene: true,
      text: "So save equals equals for primitives, or for when you mean the same object. To compare contents, call dot equals.",
    },
  ],
};
