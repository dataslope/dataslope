import { INTRO_LEAD_IN } from "../../editorial/intro.ts";
import type { TimedBeat, Timeline } from "../../narration/types";

/**
 * Where each part of the merged Unit 5 video sits. Pure (no Remotion, no
 * DOM), so metadata.ts, Video.tsx and any script that checks the merged
 * video's sync all place the parts the same way.
 *
 * Each part keeps its own timeline exactly as its standalone video times it
 * (its script and its own alignment.json). The merged video only decides
 * where each part starts:
 *
 *   - the first part's first word lands where a course video's first word
 *     lands after the series intro (INTRO_LEAD_IN, as every course script);
 *   - every later part starts HOLD seconds after the last word of the part
 *     before it (its spoken bridge), and cross-fades in over CROSSFADE
 *     frames, so the silence between two parts is HOLD plus the next part's
 *     own 0.5 s lead-in;
 *   - the last part runs to the end of its own timeline, tail included.
 */

/** Where the first part's first word lands, in seconds: after the intro. */
export const FIRST_WORD = INTRO_LEAD_IN;
/** Seconds between a part's last word and the next part's first frame. */
export const HOLD = 1.4;
/** Frames over which one part (or the intro) cross-fades into the next. */
export const CROSSFADE = 12;

export type PartSpan = {
  /** First frame of the part in the merged video. */
  from: number;
  /** Frame at which the part is gone (the end of the cross-fade out). */
  to: number;
};

export type PartPlan = { spans: PartSpan[]; durationInFrames: number };

export function planParts(timelines: readonly Timeline[], fps: number): PartPlan {
  const spans: PartSpan[] = [];
  let from = Math.round(FIRST_WORD * fps) - Math.round((timelines[0]?.beats[0]?.start ?? 0) * fps);
  timelines.forEach((t, k) => {
    const last = k === timelines.length - 1;
    const lastWord = t.beats[t.beats.length - 1]?.end ?? t.duration;
    const next = from + Math.round((lastWord + HOLD) * fps);
    spans.push({ from, to: last ? from + Math.ceil(t.duration * fps) : next + CROSSFADE });
    from = next;
  });
  return { spans, durationInFrames: spans[spans.length - 1]?.to ?? 0 };
}

/**
 * One timeline for the whole merged video: every part's beats and captions
 * moved to where the part plays, beat ids prefixed with the part's script id
 * ("sampling-bias/hook"). It carries no audio (each part plays its own,
 * inside its own provider), so it is safe as the page's timeline: the page's
 * captions read it, and its NarrationAudio stays silent.
 */
export function mergeTimelines(
  parts: readonly { id: string; timeline: Timeline }[],
  spans: readonly PartSpan[],
  fps: number,
  durationInFrames: number,
): Timeline {
  const beats: TimedBeat[] = [];
  const captions: Timeline["captions"] = [];
  parts.forEach(({ id, timeline }, k) => {
    const dt = spans[k].from / fps;
    for (const b of timeline.beats) {
      beats.push({
        ...b,
        id: `${id}/${b.id}`,
        start: b.start + dt,
        end: b.end + dt,
        words: b.words.map((w) => ({ ...w, start: w.start + dt, end: w.end + dt })),
        audio: null,
        audioStart: b.audioStart + dt,
      });
    }
    const ms = Math.round(dt * 1000);
    for (const c of timeline.captions) {
      captions.push({ ...c, startMs: c.startMs + ms, endMs: c.endMs + ms, timestampMs: c.timestampMs === null ? null : c.timestampMs + ms });
    }
  });
  return { beats, captions, duration: durationInFrames / fps };
}
