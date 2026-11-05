// Run with `npm test` (node --test; Node strips the types).
//
// A logo reveal is timed from one number per motion, MARK_LANDS: the frame
// the mark is whole. The words and the bell are cued from it, so if a spring
// is retuned and the number isn't, the bell rings over a half-built mark.
// These check each landing against the springs that make it, and that every
// sound the reveals cue exists and fits inside the video.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { spring } from "remotion";
import { REVEALS } from "./presets.ts";
import {
  ASSEMBLE_LAG,
  BAR_STAGGER,
  BARS,
  MARK_AT,
  MARK_EVENTS,
  MARK_LANDS,
  MARK_MOTIONS,
  openerCues,
  REVEAL_FRAMES,
  SCATTER_DELAY,
  SPRINGS,
  stingCues,
  textFrames,
  UNFOLD_OPENS,
} from "./timing.ts";

const FPS = 30;
const SFX = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public", "sfx");
const lengths: Record<string, number> = JSON.parse(readFileSync(join(SFX, "sounds.json"), "utf8"));
const accents: Record<string, number> = JSON.parse(readFileSync(join(SFX, "accents.json"), "utf8"));

type Config = { damping: number; mass: number; stiffness: number };
const value = (config: Config, frame: number) => spring({ frame, fps: FPS, config });
/** The first frame a spring started at 0 is within 2% of home. */
const home = (config: Config) => {
  for (let f = 0; f < 120; f++) if (value(config, f) >= 0.98) return f;
  throw new Error("never settles");
};
/** The frame of a spring's overshoot. */
const crest = (config: Config) => {
  let best = 0;
  for (let f = 1; f < 120; f++) if (value(config, f) > value(config, best)) best = f;
  return best;
};

test("each motion lands when its springs say it does", () => {
  // The right half is home, and the bell follows within a frame or two.
  const assembled = ASSEMBLE_LAG + home(SPRINGS.assemble);
  assert.ok(MARK_LANDS.assemble >= assembled && MARK_LANDS.assemble <= assembled + 2, `assemble: halves meet at ${assembled}`);
  // Every bar is up before the gaps start closing, ten frames before landing.
  const lastBar = (BARS - 1) * BAR_STAGGER + home(SPRINGS.bar);
  assert.ok(lastBar <= MARK_LANDS.histogram - 8, `histogram: last bar up at ${lastBar}`);
  // Every point has arrived before the points shrink, four frames before.
  const lastPoint = SCATTER_DELAY + home(SPRINGS.point);
  assert.ok(lastPoint <= MARK_LANDS.scatter - 4, `scatter: last point home at ${lastPoint}`);
  // The rise lands at the top of its overshoot.
  assert.ok(Math.abs(crest(SPRINGS.rise) - MARK_LANDS.rise) <= 1, `rise: crest at ${crest(SPRINGS.rise)}`);
  // The slopes are open.
  const opened = UNFOLD_OPENS + home(SPRINGS.open);
  assert.ok(MARK_LANDS.unfold >= opened && MARK_LANDS.unfold <= opened + 2, `unfold: open at ${opened}`);
});

test("every sound a reveal cues exists and starts inside the video", () => {
  const cues: { name: string; accentAt: number }[] = [];
  for (const motion of MARK_MOTIONS) {
    for (const e of MARK_EVENTS[motion]) cues.push({ name: `el-reveal-${e.sound}`, accentAt: MARK_AT + e.at });
    cues.push({ name: "el-reveal-bell", accentAt: stingCues(motion).land });
    const lines = openerCues(motion, "ink", "Unit 1");
    cues.push({ name: "el-reveal-line", accentAt: lines.course + 8 });
  }
  for (const { name, accentAt } of cues) {
    assert.ok(name in lengths && name in accents, `${name} is not in public/sfx`);
    // A sound cued by its accent starts early by the accent's time; before
    // frame 0 its head would be trimmed off (Sfx does, rather than drop it).
    const start = accentAt - accents[name] * FPS;
    assert.ok(start >= 0, `${name}: would start at frame ${start.toFixed(1)}, before the video does`);
  }
});

test("every reveal holds its finished lockup for at least a second", () => {
  const ids = REVEALS.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, "composition ids are unique");
  for (const { id, props } of REVEALS) {
    const end = props.layout === "sting" ? REVEAL_FRAMES.sting : REVEAL_FRAMES.opener;
    let done: number;
    if (props.layout === "sting") {
      done = stingCues(props.motion).word + textFrames(props.text, "Dataslope".length);
    } else {
      const c = openerCues(props.motion, props.text, props.unit);
      done = Math.max(c.course + textFrames(props.text, props.course.length), c.titleAt + textFrames(props.text, props.title.length));
    }
    assert.ok(end - done >= FPS, `${id}: finishes at frame ${done} of ${end}`);
  }
});
