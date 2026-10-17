// Run with `npm test` (node --test).
import assert from "node:assert/strict";
import { test } from "node:test";
import { ATTACK, loudestFrame, speechOnset } from "./onset.mjs";

const RATE = 44100;
/** Builds a signal from [seconds, amplitude, kind] pieces: "tone" is voiced
 *  speech, "noise" is a breath or a fricative, "quiet" is the room. */
const signal = (...pieces) => {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const out = [];
  for (const [seconds, amp, kind] of pieces) {
    for (let i = 0; i < Math.round(seconds * RATE); i++) {
      const v = kind === "tone" ? Math.sin((2 * Math.PI * 180 * i) / RATE) * 1.414 : kind === "noise" ? rand() * 1.732 : 0;
      out.push(Math.round(v * amp * 32767 * 0.5));
    }
  }
  return Int16Array.from(out);
};
const near = (actual, expected, why) => assert.ok(Math.abs(actual - expected) <= 0.011, `${why}: ${actual.toFixed(3)} s, expected ${expected} s`);

test("a breath before the word is not the word", () => {
  // Estimation's rate-se: a breath (-25 dB), a short gap, then speech at 0.40 s.
  const s = signal([0.1, 0, "quiet"], [0.15, 0.056, "noise"], [0.15, 0, "quiet"], [0.6, 1, "tone"]);
  near(speechOnset(s, RATE, 0, 0.7, loudestFrame(s, RATE)), 0.4, "onset");
});

test("a soft consonant before the vowel belongs to the word", () => {
  // An "s" at -25 dB for 80 ms, straight into the vowel.
  const s = signal([0.2, 0, "quiet"], [0.08, 0.056, "noise"], [0.5, 1, "tone"]);
  near(speechOnset(s, RATE, 0, 0.6, loudestFrame(s, RATE)), 0.2, "onset");
});

test("a breath that runs straight into the word is cut off at ATTACK", () => {
  const s = signal([0.1, 0, "quiet"], [0.4, 0.056, "noise"], [0.5, 1, "tone"]);
  near(speechOnset(s, RATE, 0, 0.8, loudestFrame(s, RATE)), 0.5 - ATTACK, "onset");
});

test("the search starts at the cut, not before it", () => {
  const s = signal([0.2, 1, "tone"], [0.3, 0, "quiet"], [0.5, 1, "tone"]);
  near(speechOnset(s, RATE, 0.3, 0.9, loudestFrame(s, RATE)), 0.5, "onset");
});

test("a window with only quiet sound falls back to the first sound, and silence to null", () => {
  const quiet = signal([0.2, 0, "quiet"], [0.3, 0.056, "noise"], [0.2, 0, "quiet"], [0.3, 1, "tone"]);
  near(speechOnset(quiet, RATE, 0, 0.5, loudestFrame(quiet, RATE)), 0.2, "fallback");
  const silent = signal([0.3, 0, "quiet"], [0.3, 1, "tone"]);
  assert.equal(speechOnset(silent, RATE, 0, 0.25, loudestFrame(silent, RATE)), null);
});
