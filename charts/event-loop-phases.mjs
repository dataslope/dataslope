/**
 * One turn of the JavaScript event loop, drawn as a timeline, so the ordering
 * rules stop being a list to memorise and become something you can point at.
 *
 * The three rules the figure exists to make visible:
 *
 *   1. A task runs to completion. Nothing interleaves with it — not a timer
 *      that came due, not a resolved promise, not a click. That is why one slow
 *      task blocks everything after it.
 *   2. The microtask queue drains *completely* between tasks, and it drains
 *      before rendering. A promise chain scheduled at the end of a task runs
 *      before the timer that was already due.
 *   3. Rendering happens at most once per frame, after microtasks, and only if
 *      there is time left. A task longer than the frame budget does not delay
 *      a paint a little; it drops the frame entirely.
 *
 * The clock is real: the durations below are added up, so the frame boundaries
 * and the dropped-frame annotation are computed from the schedule rather than
 * drawn where they look right.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Under a tenth of a second of event-loop activity as a timeline: tasks run to completion, microtasks drain between them, and a render is only attempted once the queue is empty. A long task overruns the frame budget and the paints are skipped.";

const FRAME_MS = 16.7;

/** The schedule, in order. `kind` picks the lane and the color. */
const SCHEDULE = [
  { kind: "task", label: "click handler", ms: 4 },
  { kind: "micro", label: "promise callbacks", ms: 1.2 },
  { kind: "render", label: "style, layout, paint", ms: 3.5 },
  { kind: "task", label: "setTimeout callback", ms: 2.5 },
  { kind: "micro", label: "await continuation", ms: 0.8 },
  { kind: "render", label: "style, layout, paint", ms: 3.2 },
  { kind: "task", label: "JSON.parse of a big payload", ms: 38 },
  { kind: "micro", label: "promise callbacks", ms: 1.5 },
  { kind: "render", label: "style, layout, paint", ms: 3.4 },
];

// Lay the schedule out on a real clock.
let t = 0;
const BLOCKS = SCHEDULE.map((s) => {
  const block = { ...s, t0: t, t1: t + s.ms };
  t += s.ms;
  return block;
});
const TOTAL = t;

/** The frame the long task blew through, found rather than hard-coded. */
const OVERRUN = BLOCKS.filter((b) => b.kind === "task").find((b) => b.ms > FRAME_MS);
const FRAMES_SKIPPED = OVERRUN ? Math.floor(OVERRUN.ms / FRAME_MS) : 0;

export const caption = OVERRUN
  ? `Each task runs to completion, then the microtask queue drains entirely, then the browser may paint. The ${OVERRUN.label} takes ${OVERRUN.ms} ms, more than ${FRAMES_SKIPPED} whole ${FRAME_MS} ms frame${FRAMES_SKIPPED === 1 ? "" : "s"}, and because nothing can interrupt a task, those frames are not delayed but skipped. This is why "chunk the work" is the fix and "make it async" on its own is not: an await that resolves immediately is still a microtask, and microtasks run before the paint.`
  : `Each task runs to completion, then the microtask queue drains entirely, then the browser may paint.`;

const LANES = {
  task: { y: 96, h: 34, color: SERIES[0], label: "task queue" },
  micro: { y: 148, h: 26, color: SERIES[2], label: "microtasks" },
  render: { y: 192, h: 26, color: SERIES[4], label: "render" },
};

const W = 680;
const H = 340;
const X0 = 118;
const X1 = 656;
const x = (ms) => X0 + (ms / TOTAL) * (X1 - X0);

const rects = BLOCKS.map((b) => {
  const lane = LANES[b.kind];
  return {
    x1: x(b.t0),
    x2: Math.max(x(b.t1), x(b.t0) + 2),
    y1: lane.y,
    y2: lane.y + lane.h,
    fill: lane.color,
    ...b,
  };
});

/** Frame boundaries across the whole span. */
const FRAME_LINES = [];
for (let f = 0; f * FRAME_MS <= TOTAL; f++) FRAME_LINES.push(f * FRAME_MS);

export function render() {
  return plot({
    height: H,
    width: W,
    marginTop: 26,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 20,
    ariaLabel: title,
    // Pixel space: three lanes with no shared quantity between them, and a time
    // axis drawn by hand so the frame grid can sit behind everything.
    x: { axis: null, grid: false, domain: [0, W] },
    y: { axis: null, grid: false, domain: [H, 0] },
    marks: [
      // The frame grid, behind the lanes.
      ...FRAME_LINES.map((ms) =>
        Plot.ruleX([{ x: x(ms) }], {
          x: "x",
          y1: 74,
          y2: 232,
          stroke: GUIDE,
          strokeOpacity: 0.5,
        }),
      ),
      Plot.text([{}], {
        x: X0,
        y: 64,
        text: () => `${FRAME_MS} ms frame boundaries`,
        fill: MUTED,
        fontSize: 10,
        textAnchor: "start",
      }),

      // Lane labels.
      ...Object.values(LANES).map((lane) =>
        Plot.text([{}], {
          x: X0 - 12,
          y: lane.y + lane.h / 2,
          text: () => lane.label,
          fill: MUTED,
          fontSize: 11,
          fontWeight: 600,
          textAnchor: "end",
        }),
      ),

      Plot.rect(rects, {
        x1: "x1",
        x2: "x2",
        y1: "y1",
        y2: "y2",
        fill: "fill",
        fillOpacity: (d) => (d === OVERRUN ? 0.85 : 0.55),
      }),

      // Only the blocks wide enough to hold their own label get one inside;
      // the rest are named below the lane so nothing overprints.
      Plot.text(
        rects.filter((r) => r.x2 - r.x1 > 74),
        {
          x: (d) => (d.x1 + d.x2) / 2,
          y: (d) => (d.y1 + d.y2) / 2,
          text: (d) => `${d.label} · ${d.ms} ms`,
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          ...HALO,
        },
      ),
      Plot.text(
        rects.filter((r) => r.x2 - r.x1 <= 74 && r.kind !== "render"),
        {
          x: (d) => (d.x1 + d.x2) / 2,
          y: (d) => d.y1 - 6,
          text: (d) => `${d.ms} ms`,
          fill: MUTED,
          fontSize: 10,
          textAnchor: "middle",
          ...HALO,
        },
      ),

      // The skipped frames: the span the long task covered where a paint was
      // due and never happened.
      ...(OVERRUN
        ? [
            Plot.rect([{}], {
              x1: x(OVERRUN.t0),
              x2: x(OVERRUN.t1),
              y1: LANES.render.y,
              y2: LANES.render.y + LANES.render.h,
              fill: ACCENT,
              fillOpacity: 0.1,
              stroke: ACCENT,
              strokeOpacity: 0.55,
              strokeDasharray: "4,3",
            }),
            Plot.text([{}], {
              x: (x(OVERRUN.t0) + x(OVERRUN.t1)) / 2,
              y: LANES.render.y + LANES.render.h / 2,
              text: () =>
                `${FRAMES_SKIPPED} frame${FRAMES_SKIPPED === 1 ? "" : "s"} skipped`,
              fill: ACCENT,
              fontSize: 10,
              fontWeight: 600,
              textAnchor: "middle",
              ...HALO,
            }),
            // The block already carries its own name and duration inside the
            // lane, so this says the part the timeline cannot: why the gap
            // below it exists.
            Plot.text([{}], {
              x: (x(OVERRUN.t0) + x(OVERRUN.t1)) / 2,
              y: LANES.task.y - 12,
              text: () => "nothing can interrupt a task, not even a due timer",
              fill: ACCENT,
              fontSize: 10.5,
              fontWeight: 600,
              textAnchor: "middle",
              ...HALO,
            }),
          ]
        : []),

      // The time axis, drawn by hand under the lanes.
      Plot.ruleY([{ y: 240 }], {
        y: "y",
        x1: X0,
        x2: X1,
        stroke: "currentColor",
        strokeOpacity: 0.35,
      }),
      ...[0, 10, 20, 30, 40, 50].map((ms) =>
        Plot.text([{ x: x(ms) }], {
          x: "x",
          y: 254,
          text: () => `${ms} ms`,
          fill: MUTED,
          fontSize: 10,
          textAnchor: "middle",
        }),
      ),

      Plot.text([{}], {
        x: X0,
        y: 296,
        text: () =>
          "microtasks drain completely between tasks, and before the paint, which is why an\nimmediately-resolved await does not give the browser a chance to render",
        fill: MUTED,
        fontSize: 10.5,
        lineHeight: 1.4,
        textAnchor: "start",
      }),
    ],
  });
}
