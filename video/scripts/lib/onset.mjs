/**
 * Where a beat's first word starts in a take. narrate.mjs cuts each take into
 * one file per beat and moves the beat's first letter to the first sound
 * after the cut, because ElevenLabs' character times can put it 0.3 s late
 * after an audio tag.
 *
 * "The first sound" used to mean the first 10 ms frame at 3% of the take's
 * loudest (-30 dB), and a breath clears that. Estimation's `rate-se` took the
 * breath before "A" for the word and cued 0.23 s early (0.17 s against a
 * spoken onset of 0.40 s) while check:sync, measuring the real speech, failed
 * it. So the onset is now found in two steps:
 *
 *   1. the first frame of voiced speech, at VOICE (-27 dB from the take's
 *      loudest), which a breath, a lip noise or the room's tone stays under;
 *   2. then back from there over the word's own quieter attack (an s, an f,
 *      an h before the vowel) while the frames stay at SOUND (-30 dB), but
 *      never more than ATTACK: a breath that runs straight into the word
 *      without a gap is not swallowed whole.
 *
 * VOICE was set against all 906 beats recorded for the course videos, each
 * measured from its take's loudest frame and compared with the onset
 * check:sync passed: any bar from -26 to -28 dB fixes rate-se and moves no
 * other beat by 50 ms. At -25 dB a soft opening word starts to be skipped as
 * if it were a breath (Relationships' "min"; Normalization's "And when
 * Grace" at -22), and from -29 dB the breath gets through again. -27 is the
 * middle of that window.
 *
 * A window with no voiced frame at all falls back to the first sounding one,
 * and one with no sound at all returns null (the caller keeps the character
 * time).
 */

/** Analysis frame, in seconds. */
export const FRAME = 0.01;
/** A frame is sounding at this fraction of the take's loudest frame (-30 dB). */
export const SOUND = 0.03;
/** Voiced speech reaches this fraction of the loudest (-27 dB). */
export const VOICE = 0.045;
/** How far before the first voiced frame a word's attack may begin, in seconds. */
export const ATTACK = 0.12;

/** RMS of the FRAME-long window starting at sample `at`. */
export function frameLevel(samples, at, n) {
  let e = 0;
  const end = Math.min(samples.length, at + n);
  for (let k = at; k < end; k++) e += samples[k] * samples[k];
  return end > at ? Math.sqrt(e / (end - at)) : 0;
}

/** The loudest FRAME-long window in the samples. */
export function loudestFrame(samples, rate) {
  const n = Math.round(FRAME * rate);
  let loudest = 0;
  for (let at = 0; at + n <= samples.length; at += n) loudest = Math.max(loudest, frameLevel(samples, at, n));
  return loudest;
}

/**
 * The time, in seconds, at which speech starts in [from, until), or null if
 * nothing in the window sounds. `loudest` is the take's loudest frame
 * (loudestFrame), so the thresholds are relative to the voice itself.
 */
export function speechOnset(samples, rate, from, until, loudest) {
  const n = Math.round(FRAME * rate);
  const first = Math.max(0, Math.round(from * rate));
  const last = Math.min(samples.length - n, Math.round(until * rate));
  const level = (at) => frameLevel(samples, at, n);
  let voiced = -1;
  for (let at = first; at < last; at += n) {
    if (level(at) >= VOICE * loudest) {
      voiced = at;
      break;
    }
  }
  if (voiced < 0) {
    for (let at = first; at < last; at += n) if (level(at) >= SOUND * loudest) return at / rate;
    return null;
  }
  const reach = Math.round(ATTACK * rate);
  let at = voiced;
  while (at - n >= first && voiced - (at - n) <= reach && level(at - n) >= SOUND * loudest) at -= n;
  return at / rate;
}
