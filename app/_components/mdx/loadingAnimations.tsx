"use client";

/**
 * Brand loading animations built from the Dataslope logo mark.
 *
 * The logo (public/dataslope-logo-blue.svg) is a mountain-shaped curve
 * made of two mirrored "swoosh" paths whose rounded foot caps are
 * centred on the horizontal line y = 546.66 (in the logo's
 * 1087.59 × 682.55 viewBox). Two facts fall out of that geometry and
 * drive every variant below:
 *
 *  - Mirroring the mark vertically across the foot line and stacking
 *    the copies makes both copies' foot caps coincide, forming a
 *    4-point star whose centre opens into a small hollow diamond.
 *    Rendered with the logo's own translucent radial gradients, the
 *    four overlapping swooshes show through as lighter petals around
 *    that hollow — this is the brand spinner shape.
 *  - Tiling gradient copies horizontally every 815.81 units (the
 *    distance between the two foot-cap centres) makes adjacent feet
 *    coincide; the translucent overlaps show as darker blob accents at
 *    each trough, producing a rolling wave that scrolls seamlessly.
 *    On top of the scroll, a traveling-light pulse (per-tile phased
 *    opacity) rolls along the crests; an optional blended-ends mode
 *    fades both ends out so the band melts into any background.
 *
 * All shapes render with `currentColor`; the CSS module sets the brand
 * blue (light/dark aware) on each wrapper, and honours
 * `prefers-reduced-motion` by swapping motion for an opacity pulse.
 *
 * Exported pieces:
 *  - <DiamondMark /> — the hollow diamond as a static (non-animated) mark
 *  - <DiamondSpinner />, <DiamondTurnSpinner />, <DiamondAssembleLoader />,
 *    <DiamondAssembleTurnLoader />, <DiamondRippleLoader />, <LogoHopLoader />
 *  - <LogoWave />
 *  - <LoadingAnimationsGallery section=… /> — the /learn demo grid.
 */

import { useId, type CSSProperties, type ReactNode } from "react";
import styles from "./loadingAnimations.module.css";

// ─── Logo geometry ─────────────────────────────────────────────────────
// Path data and radial gradients are lifted verbatim from
// public/dataslope-logo-blue.svg, with the gradients' #148cff stops
// swapped to currentColor so light/dark retinting works.

const LOGO_W = 1087.59;
const LOGO_H = 682.55;

/** y of the foot-cap centres — the mirror axis for the diamond and the
 *  wave tiles. */
const FOOT_Y = 546.66;
/** Exact-mirror stack height (foot caps coinciding): the diamond's
 *  height, and the sine wave tiles' band height. The stack reads as a
 *  4-point star whose centre opens into a small hollow diamond — the
 *  translucent gradients let the overlapping swooshes show through as
 *  petals around that hollow. */
const MIRROR_H = FOOT_Y * 2; // 1093.32
/** Stacked hollow-diamond height (alias for readability at use sites). */
const DIAMOND_H = MIRROR_H;
/** x distance between the left and right foot-cap centres
 *  (951.70 − 135.89). Tiling at this step makes adjacent feet coincide. */
const TILE_STEP = 815.81;
/** One full wave pattern: an upright tile plus a mirrored tile. */
const WAVE_PERIOD = TILE_STEP * 2; // 1631.62 — must match waveScroll in the CSS

const LEFT_D =
  "M679.63,139.57c.05-1.45.06-2.21.06-3.67C679.69,60.84,618.85,0,543.79,0s-132.49,57.51-135.75,129.67h0s-2.99,129.29-85.67,205.52c-73.47,67.75-167.89,74.85-188,75.59-1.2.01-2.39.04-3.58.09-.2,0-.3,0-.3,0h0C57.94,413.72,0,473.42,0,546.66s60.84,135.89,135.89,135.89c3.22,0,6.41-.12,9.57-.34h0s278.11,3.51,437.31-237.01c100.12-151.26,96.85-304.24,96.85-304.24v-1.4Z";

const RIGHT_D =
  "M407.96,139.57c-.05-1.45-.06-2.21-.06-3.67C407.91,60.84,468.75,0,543.8,0s132.49,57.51,135.75,129.67h0s2.99,129.29,85.67,205.52c73.47,67.75,167.89,74.85,188,75.59,1.2.01,2.39.04,3.58.09.2,0,.3,0,.3,0h0c72.55,2.85,130.49,62.55,130.49,135.79s-60.84,135.89-135.89,135.89c-3.22,0-6.41-.12-9.57-.34h0s-278.11,3.51-437.31-237.01c-100.12-151.26-96.85-304.24-96.85-304.24v-1.4Z";

/** The flip that mirrors the mark to form the diamond's bottom half,
 *  expressed in the stacked-diamond coordinate space (height DIAMOND_H). */
const FLIP_TRANSFORM = `translate(0 ${DIAMOND_H}) scale(1 -1)`;

function MarkPaths() {
  return (
    <>
      <path d={LEFT_D} fill="currentColor" />
      <path d={RIGHT_D} fill="currentColor" />
    </>
  );
}

/** The logo's two radial gradients with currentColor stops. The
 *  varying stop opacities are what make the stacked diamond's
 *  overlapping swooshes visible as lighter petals. gradientUnits is
 *  userSpaceOnUse (as in the source SVG), so the mirrored copy's
 *  group transform flips the gradients along with the paths. */
function MarkGradientDefs({ idPrefix }: { idPrefix: string }) {
  return (
    <defs>
      <radialGradient
        id={`${idPrefix}-l`}
        cx="339.84"
        cy="341.28"
        r="340.56"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset=".19" stopColor="currentColor" stopOpacity=".6" />
        <stop offset=".32" stopColor="currentColor" stopOpacity=".62" />
        <stop offset=".51" stopColor="currentColor" stopOpacity=".69" />
        <stop offset=".72" stopColor="currentColor" stopOpacity=".81" />
        <stop offset=".96" stopColor="currentColor" stopOpacity=".97" />
        <stop offset="1" stopColor="currentColor" />
      </radialGradient>
      <radialGradient
        id={`${idPrefix}-r`}
        cx="798.17"
        cy="382.86"
        r="318.51"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset=".14" stopColor="currentColor" />
        <stop offset=".34" stopColor="currentColor" stopOpacity=".89" />
        <stop offset=".76" stopColor="currentColor" stopOpacity=".68" />
        <stop offset=".96" stopColor="currentColor" stopOpacity=".6" />
      </radialGradient>
    </defs>
  );
}

function GradientMarkPaths({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      <path d={LEFT_D} fill={`url(#${idPrefix}-l)`} />
      <path d={RIGHT_D} fill={`url(#${idPrefix}-r)`} />
    </>
  );
}

/** The hollow diamond: the mark plus its vertical mirror image, with
 *  the rounded foot caps of both copies coinciding at y = FOOT_Y.
 *  Rendered with the logo's translucent gradients so the four
 *  overlapping swooshes read as petals around the small diamond-shaped
 *  hollow at the centre. */
function GradientDiamond({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      <MarkGradientDefs idPrefix={idPrefix} />
      <GradientMarkPaths idPrefix={idPrefix} />
      <g transform={FLIP_TRANSFORM}>
        <GradientMarkPaths idPrefix={idPrefix} />
      </g>
    </>
  );
}

/** Strip useId's wrapper characters (":", "«»") down to a token that is
 *  safe inside url(#…) references and href fragments. */
function useSafeId(prefix: string): string {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return `${prefix}-${uid}`;
}

// ─── Static mark ───────────────────────────────────────────────────────

/** The hollow-diamond brand shape as a plain, static SVG — the same
 *  4-point star the spinners rotate, without any animation. Renders
 *  with `currentColor`, so the parent's CSS `color` sets the tint
 *  (e.g. the playgrounds' welcome empty-states tint it brand blue via
 *  `.welcome-icon`). Decorative by default; pass `label` to expose it
 *  to assistive tech instead. */
export function DiamondMark({
  size = 44,
  label,
}: {
  /** Rendered width in px (the diamond is ~square). */
  size?: number;
  /** Accessible label; omitted = decorative (aria-hidden). */
  label?: string;
}) {
  const gradId = useSafeId("ds-mark");
  return (
    <svg
      viewBox={`0 0 ${LOGO_W} ${DIAMOND_H}`}
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <GradientDiamond idPrefix={gradId} />
    </svg>
  );
}

// ─── Spinners ──────────────────────────────────────────────────────────

export interface SpinnerProps {
  /** Rendered width in px (the diamond is ~square). */
  size?: number;
  /** Seconds per revolution / cycle. */
  duration?: number;
  /** Accessible label. */
  label?: string;
}

/** Animation 1 (requested): the hollow diamond rotating continuously. */
export function DiamondSpinner({
  size = 44,
  duration = 1.5,
  label = "Loading…",
}: SpinnerProps) {
  const gradId = useSafeId("ds-dia");
  return (
    <span className={styles.loader} role="img" aria-label={label}>
      <svg
        viewBox={`0 0 ${LOGO_W} ${DIAMOND_H}`}
        width={size}
        height={size}
        className={styles.spin}
        style={{ "--spin-dur": `${duration}s` } as CSSProperties}
        aria-hidden
      >
        <GradientDiamond idPrefix={gradId} />
      </svg>
    </span>
  );
}

/** The diamond turning in eased half-turn steps with a brief rest —
 *  calmer than the continuous spin. (The diamond's 2-fold symmetry
 *  makes each 180° step land on an identical pose.) */
export function DiamondTurnSpinner({
  size = 44,
  label = "Loading…",
}: Omit<SpinnerProps, "duration">) {
  const gradId = useSafeId("ds-turn");
  return (
    <span className={styles.loader} role="img" aria-label={label}>
      <svg
        viewBox={`0 0 ${LOGO_W} ${DIAMOND_H}`}
        width={size}
        height={size}
        className={styles.turn}
        aria-hidden
      >
        <GradientDiamond idPrefix={gradId} />
      </svg>
    </span>
  );
}

/** Extra headroom (in user units) the assemble animation needs above
 *  and below the diamond for the separated halves. Must match the
 *  translateY distance in the CSS keyframes. */
const ASSEMBLE_GAP = 170;

/** The two halves drift apart and snap back into the diamond. Both
 *  halves share one keyframe: the bottom half lives inside the flip
 *  group, so the same local translateY moves it the opposite way. */
export function DiamondAssembleLoader({
  size = 64,
  label = "Loading…",
}: Omit<SpinnerProps, "duration">) {
  const gradId = useSafeId("ds-asm");
  const viewH = DIAMOND_H + ASSEMBLE_GAP * 2;
  const height = Math.round(size * (viewH / LOGO_W));
  return (
    <span className={styles.loader} role="img" aria-label={label}>
      <svg
        viewBox={`0 ${-ASSEMBLE_GAP} ${LOGO_W} ${viewH}`}
        width={size}
        height={height}
        aria-hidden
      >
        <MarkGradientDefs idPrefix={gradId} />
        <g className={styles.assembleHalf}>
          <GradientMarkPaths idPrefix={gradId} />
        </g>
        <g transform={FLIP_TRANSFORM}>
          <g className={styles.assembleHalf}>
            <GradientMarkPaths idPrefix={gradId} />
          </g>
        </g>
      </svg>
    </span>
  );
}

/** Concentric diamond outlines scale outward and fade — a radar ping.
 *  Each copy is a <g> animated with `transform-box: fill-box`, so the
 *  scale runs about the diamond's centre and non-scaling-stroke keeps
 *  the outline weight constant while the ring grows. */
export function DiamondRippleLoader({
  size = 72,
  label = "Loading…",
}: Omit<SpinnerProps, "duration">) {
  return (
    <span className={styles.loader} role="img" aria-label={label}>
      <svg
        viewBox={`0 0 ${LOGO_W} ${DIAMOND_H}`}
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden
      >
        {[0, 1, 2].map((i) => (
          <g
            key={i}
            className={styles.rippleCopy}
            style={{ animationDelay: `${-i * 0.7}s` }}
          >
            <path d={LEFT_D} vectorEffect="non-scaling-stroke" />
            <path d={RIGHT_D} vectorEffect="non-scaling-stroke" />
            <g transform={FLIP_TRANSFORM}>
              <path d={LEFT_D} vectorEffect="non-scaling-stroke" />
              <path d={RIGHT_D} vectorEffect="non-scaling-stroke" />
            </g>
          </g>
        ))}
      </svg>
    </span>
  );
}

/** Combined sequence: the halves drift together (assemble), the
 *  assembled diamond makes an eased QUARTER turn, the halves part
 *  again — and because they always part along the diamond's local
 *  vertical axis, the drift alternates between vertical (at 0°) and
 *  horizontal (at 90°) on screen. The diamond is only 2-fold
 *  symmetric, so one CSS loop contains two assemble-and-turn steps
 *  (180° total) to land back on an identical pose. Rotation lives on
 *  the <svg> (whose viewBox is vertically symmetric around the
 *  diamond's centre, so the element centre is the rotation centre)
 *  while the translation lives on the inner half groups — the two
 *  keyframe sets share one 3.2s timeline in the CSS. */
export function DiamondAssembleTurnLoader({
  size = 64,
  label = "Loading…",
}: Omit<SpinnerProps, "duration">) {
  const gradId = useSafeId("ds-asmturn");
  const viewH = DIAMOND_H + ASSEMBLE_GAP * 2;
  return (
    <span className={styles.loader} role="img" aria-label={label}>
      <svg
        viewBox={`0 ${-ASSEMBLE_GAP} ${LOGO_W} ${viewH}`}
        width={size}
        height={size}
        className={styles.comboRotor}
        aria-hidden
      >
        <MarkGradientDefs idPrefix={gradId} />
        <g className={styles.comboHalf}>
          <GradientMarkPaths idPrefix={gradId} />
        </g>
        <g transform={FLIP_TRANSFORM}>
          <g className={styles.comboHalf}>
            <GradientMarkPaths idPrefix={gradId} />
          </g>
        </g>
      </svg>
    </span>
  );
}

/** Three small marks hop in sequence — a typing-indicator-style loader. */
export function LogoHopLoader({
  size = 26,
  label = "Loading…",
}: Omit<SpinnerProps, "duration">) {
  const height = Math.round(size * (LOGO_H / LOGO_W));
  return (
    <span
      className={`${styles.loader} ${styles.hopRow}`}
      role="img"
      aria-label={label}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={styles.hopGlyph}
          style={{ animationDelay: `${(i - 2) * 0.16}s` }}
        >
          <svg
            viewBox={`0 0 ${LOGO_W} ${LOGO_H}`}
            width={size}
            height={height}
            aria-hidden
          >
            <MarkPaths />
          </svg>
        </span>
      ))}
    </span>
  );
}

// ─── Wave ──────────────────────────────────────────────────────────────

/** Widest container (in px) the pre-tiled wave must be able to fill.
 *  The tile count is derived from this so the band covers any
 *  realistic surface without runtime measurement. */
const MAX_WAVE_BAND_PX = 4000;

/** Per-tile phase offset and period (seconds) of the traveling-light
 *  pulse. The period must match `tileGlow` in the CSS module. */
const PULSE_STEP_S = 0.3;
const PULSE_PERIOD_S = 1.8;

/** Snap a scroll duration so the traveling light stays seamless across
 *  the scroll loop: after one loop the track jumps back by two tiles,
 *  so the scene only repeats exactly when
 *  duration ≡ −2·PULSE_STEP (mod PULSE_PERIOD). Returns the nearest
 *  duration satisfying that. */
function snapGlowDuration(duration: number): number {
  const target =
    (((-2 * PULSE_STEP_S) % PULSE_PERIOD_S) + PULSE_PERIOD_S) % PULSE_PERIOD_S;
  const rem =
    ((duration % PULSE_PERIOD_S) + PULSE_PERIOD_S) % PULSE_PERIOD_S;
  let delta = target - rem;
  if (delta > PULSE_PERIOD_S / 2) delta -= PULSE_PERIOD_S;
  if (delta < -PULSE_PERIOD_S / 2) delta += PULSE_PERIOD_S;
  return Math.max(PULSE_PERIOD_S, duration + delta);
}

export interface LogoWaveProps {
  /** Edge treatment: "soft" keeps a narrow fade where the band is
   *  clipped; "blend" fades the ends out over a long run on both
   *  sides, so the wave dissolves into whatever background it sits
   *  on. */
  edges?: "soft" | "blend";
  /** Band height in px. The wave renders aspect-true (no stretching),
   *  so this also sets the crest-to-crest spacing. */
  height?: number;
  /** Seconds per scroll loop (two crests) — lower is faster. The value
   *  is snapped (±0.9s) so the traveling light stays seamless across
   *  the scroll loop. */
  duration?: number;
  label?: string;
}

/** Animation 2 (requested): the gradient mark repeated horizontally
 *  into a rolling wave with a traveling light. Tiles step by TILE_STEP
 *  so adjacent foot caps coincide, and because the fills keep the
 *  logo's translucent radial gradients, the doubled foot regions show
 *  through as darker blob accents at each trough — the stitched-logo
 *  look. Each tile's opacity oscillates with a per-tile phase offset,
 *  so a brightness pulse rolls along the crests. The svg is sized in
 *  px (aspect-true) wider than any container and cropped by the band,
 *  so the blobs stay circular; the track scrolls by exactly two tile
 *  steps per loop (matching waveScroll in the CSS). */
export function LogoWave({
  edges = "soft",
  height = 96,
  duration = 4.8,
  label = "Loading…",
}: LogoWaveProps) {
  const gradId = useSafeId("ds-wave");
  const tileId = `${gradId}-tile`;
  const scrollDur = snapGlowDuration(duration);
  const pxPerUnit = height / LOGO_H;
  // Cover MAX_WAVE_BAND_PX plus one scroll loop of slack.
  const neededUnits = MAX_WAVE_BAND_PX / pxPerUnit + WAVE_PERIOD;
  const tileCount = Math.ceil((neededUnits - LOGO_W) / TILE_STEP) + 1;
  const viewW = (tileCount - 1) * TILE_STEP + LOGO_W;

  return (
    <span
      className={`${styles.waveBand}${
        edges === "blend" ? ` ${styles.waveBandBlend}` : ""
      }`}
      style={{ height }}
      role="img"
      aria-label={label}
    >
      <svg
        className={styles.waveSvg}
        viewBox={`0 0 ${viewW} ${LOGO_H}`}
        width={Math.ceil(viewW * pxPerUnit)}
        height={height}
        aria-hidden
      >
        <MarkGradientDefs idPrefix={gradId} />
        <defs>
          <g id={tileId}>
            <GradientMarkPaths idPrefix={gradId} />
          </g>
        </defs>
        <g
          className={styles.waveTrack}
          style={{ "--wave-dur": `${scrollDur}s` } as CSSProperties}
        >
          {Array.from({ length: tileCount }, (_, k) => (
            <use
              key={k}
              href={`#${tileId}`}
              x={k * TILE_STEP}
              className={styles.waveTilePulse}
              style={{ animationDelay: `${(-k * PULSE_STEP_S).toFixed(2)}s` }}
            />
          ))}
        </g>
      </svg>
    </span>
  );
}

// ─── Demo gallery (the /learn/loading-animations page) ────────────────

function DemoCard({
  title,
  blurb,
  wide = false,
  fill = false,
  children,
}: {
  title: string;
  blurb: string;
  wide?: boolean;
  fill?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`${styles.card}${wide ? ` ${styles.cardWide}` : ""}`}>
      <div
        className={`${styles.cardPreview}${fill ? ` ${styles.cardPreviewFill}` : ""}`}
      >
        {children}
      </div>
      <div className={styles.cardMeta}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardBlurb}>{blurb}</p>
      </div>
    </section>
  );
}

export type GallerySection = "spinners" | "wave";

/** The /learn demo grid. Rendered per section so the MDX page can put
 *  its own (TOC-visible) headings between groups. */
export default function LoadingAnimationsGallery({
  section = "spinners",
}: {
  section?: GallerySection;
}) {
  if (section === "wave") {
    return (
      <div className={`not-prose ${styles.gallery}`}>
        <DemoCard
          wide
          fill
          title="Wave — traveling light"
          blurb="The gradient mark repeated horizontally with a brightness pulse rolling along the crests: each tile's opacity oscillates with a per-tile phase offset, reading as a light source sweeping along the wave while it scrolls."
        >
          <LogoWave height={96} duration={4.8} />
        </DemoCard>
        <DemoCard
          wide
          fill
          title="Wave — blended ends"
          blurb="The same wave with both ends faded out over a long run, so the band dissolves into whatever background it sits on."
        >
          <LogoWave edges="blend" height={96} duration={4.8} />
        </DemoCard>
      </div>
    );
  }

  return (
    <div className={`not-prose ${styles.gallery}`}>
      <DemoCard
        title="Diamond spinner"
        blurb="The logo stacked with a vertically mirrored copy — the foot caps coincide and the translucent swooshes overlap as petals around a small hollow diamond centre. Rotates continuously; works from button-size up."
      >
        <span className={styles.sizeRow}>
          <DiamondSpinner size={20} />
          <DiamondSpinner size={44} />
          <DiamondSpinner size={72} />
        </span>
      </DemoCard>
      <DemoCard
        title="Diamond half-turn"
        blurb="The diamond turns in eased half-turn steps with a brief rest — calmer than a continuous spin for longer waits."
      >
        <DiamondTurnSpinner size={56} />
      </DemoCard>
      <DemoCard
        title="Diamond ripple"
        blurb="Concentric diamond outlines scale outward and fade, radar-ping style — reads well on empty surfaces."
      >
        <DiamondRippleLoader size={86} />
      </DemoCard>
      <DemoCard
        title="Diamond assemble"
        blurb="The two logo halves drift apart and snap back into the diamond — a natural fit for “preparing…” states."
      >
        <DiamondAssembleLoader size={62} />
      </DemoCard>
      <DemoCard
        title="Diamond assemble + quarter-turn"
        blurb="The combined sequence: the halves snap together, the diamond makes an eased quarter turn, and the halves part again — alternating vertical and horizontal drifts as the rotation carries the split axis around."
      >
        <DiamondAssembleTurnLoader size={72} />
      </DemoCard>
      <DemoCard
        title="Logo hop"
        blurb="Three small marks hop in sequence — a typing-indicator-style loader for inline and chat-ish contexts."
      >
        <LogoHopLoader size={28} />
      </DemoCard>
      <DemoCard
        wide
        title="Inline boot notice"
        blurb="A compact row for embedded code blocks: small diamond spinner beside staged boot copy, mirroring the CodeBlock boot notice."
      >
        <div className={styles.bootDemo}>
          <DiamondSpinner size={22} label="" />
          <span className={styles.bootText}>
            <span className={styles.bootTitle}>
              Setting up the Python runtime…
            </span>
            <span className={styles.bootHint}>
              This can take a moment on first load
            </span>
            <span className={styles.bootHint}>
              This happens once. Later runs are much faster.
            </span>
          </span>
        </div>
      </DemoCard>
    </div>
  );
}
