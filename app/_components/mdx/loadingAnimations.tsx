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
 *  - Tiling copies horizontally every 815.81 units (the distance
 *    between the two foot-cap centres) makes adjacent feet coincide,
 *    so upright tiles form a rolling ridgeline — and alternating
 *    upright/mirrored tiles a sine-style wave — with a pattern period
 *    of 1631.62 units.
 *
 * All shapes render with `currentColor`; the CSS module sets the brand
 * blue (light/dark aware) on each wrapper, and honours
 * `prefers-reduced-motion` by swapping motion for an opacity pulse.
 *
 * Exported pieces:
 *  - <DiamondSpinner />, <DiamondTurnSpinner />, <DiamondAssembleLoader />,
 *    <DiamondRippleLoader />, <LogoTraceLoader />, <LogoHopLoader />
 *  - <LogoWave />, <LogoWaveBar />, <SlopeBackdrop />
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

/** The mark's outline draws itself on and off, one half after the
 *  other. `pathLength={1}` normalises the dash maths in the CSS. */
export function LogoTraceLoader({
  size = 110,
  label = "Loading…",
}: Omit<SpinnerProps, "duration">) {
  const height = Math.round(size * (LOGO_H / LOGO_W));
  return (
    <span className={styles.loader} role="img" aria-label={label}>
      <svg
        viewBox={`0 0 ${LOGO_W} ${LOGO_H}`}
        width={size}
        height={height}
        aria-hidden
      >
        <path d={LEFT_D} className={styles.traceBase} vectorEffect="non-scaling-stroke" />
        <path d={RIGHT_D} className={styles.traceBase} vectorEffect="non-scaling-stroke" />
        <path
          d={LEFT_D}
          pathLength={1}
          className={styles.tracePath}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={RIGHT_D}
          pathLength={1}
          className={styles.tracePath}
          style={{ animationDelay: "-1.5s" }}
          vectorEffect="non-scaling-stroke"
        />
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

// ─── Waves ─────────────────────────────────────────────────────────────

interface WaveSvgProps {
  /** Wave construction:
   *  - "ridge": upright mountains tiled side by side (the logo simply
   *    repeated horizontally) — reads as a rolling ridgeline.
   *  - "sine": upright crests alternate with vertically mirrored
   *    troughs for a full sine-style wave (double the vertical span;
   *    the shared foot caps form slightly thicker knots at the
   *    inflection points). */
  variant?: WaveVariant;
  /** How many full wave periods the viewBox spans (controls how many
   *  crests are visible at once — more periods = smaller ripples). */
  periods?: number;
  /** Seconds to scroll one full period (lower = faster). */
  duration?: number;
  /** Negative delay offsets the phase so stacked layers desynchronise. */
  delay?: number;
  /** Opacity applied to the whole tile track (overlaps stay seamless
   *  because the opacity composites after the group is flattened). */
  trackOpacity?: number;
}

export type WaveVariant = "ridge" | "sine";

/** Animation 2 (requested): the mark tiled into a continuous wave.
 *  Tiles repeat every TILE_STEP units so neighbouring foot caps
 *  coincide; the track scrolls by exactly one WAVE_PERIOD (= two tile
 *  steps — a whole number of periods for both variants) per loop,
 *  which is what makes the repeat seamless. Rendered with
 *  preserveAspectRatio="none" so callers size the band freely. */
function WaveSvg({
  variant = "ridge",
  periods = 2,
  duration = 9,
  delay = 0,
  trackOpacity = 1,
}: WaveSvgProps) {
  const tileId = useSafeId("ds-wave");
  const width = WAVE_PERIOD * periods;
  // Tiles must cover the viewBox plus one extra period of scroll range.
  const tileCount = Math.ceil((width + WAVE_PERIOD) / TILE_STEP) + 1;
  const tiles: ReactNode[] = [];
  for (let k = 0; k < tileCount; k++) {
    const x = k * TILE_STEP;
    tiles.push(
      variant === "ridge" || k % 2 === 0 ? (
        <use key={k} href={`#${tileId}`} x={x} />
      ) : (
        // <use> can't mirror, so odd (trough) tiles wrap the reference
        // in an exact foot-line mirror (no diamond gap here — crest and
        // trough feet must coincide for the wave to be continuous).
        <g key={k} transform={`translate(${x} ${MIRROR_H}) scale(1 -1)`}>
          <use href={`#${tileId}`} />
        </g>
      ),
    );
  }
  return (
    <svg
      className={styles.waveSvg}
      viewBox={`0 0 ${width} ${variant === "sine" ? MIRROR_H : LOGO_H}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <g id={tileId}>
          <path d={LEFT_D} />
          <path d={RIGHT_D} />
        </g>
      </defs>
      <g
        className={styles.waveTrack}
        fill="currentColor"
        opacity={trackOpacity}
        style={
          {
            "--wave-dur": `${duration}s`,
            animationDelay: delay ? `${delay}s` : undefined,
          } as CSSProperties
        }
      >
        {tiles}
      </g>
    </svg>
  );
}

export interface LogoWaveProps {
  /** "ridge" (mountains tiled side by side) or "sine" (crests
   *  alternating with mirrored troughs). */
  variant?: WaveVariant;
  /** Band height in px (the wave stretches to fill it). */
  height?: number;
  /** Seconds per period — lower is faster. */
  duration?: number;
  /** Wave opacity, for ambient/background bands. */
  opacity?: number;
  label?: string;
}

/** A full-width wave band with soft-faded edges. */
export function LogoWave({
  variant = "ridge",
  height = 88,
  duration = 9,
  opacity = 1,
  label = "Loading…",
}: LogoWaveProps) {
  return (
    <span
      className={styles.waveBand}
      style={{ height }}
      role="img"
      aria-label={label}
    >
      <WaveSvg
        variant={variant}
        periods={2}
        duration={duration}
        trackOpacity={opacity}
      />
    </span>
  );
}

export interface LogoWaveBarProps {
  width?: number;
  height?: number;
  duration?: number;
  label?: string;
}

/** Pill-clipped wave — an indeterminate progress bar. The sine variant
 *  reads best at bar heights: the squashed crest/trough alternation
 *  looks like a flowing squiggle. */
export function LogoWaveBar({
  width = 260,
  height = 14,
  duration = 5,
  label = "Loading…",
}: LogoWaveBarProps) {
  return (
    <span
      className={styles.waveBar}
      style={{ width, height }}
      role="img"
      aria-label={label}
    >
      <WaveSvg variant="sine" periods={4} duration={duration} trackOpacity={0.9} />
    </span>
  );
}

// ─── Full-surface backdrop ─────────────────────────────────────────────

export interface SlopeBackdropProps {
  /** Surface height in px. */
  height?: number;
  /** Status message under the spinner (ignored when children given). */
  message?: string;
  /** Replaces the default spinner + message centre slot. */
  children?: ReactNode;
}

/** A full-surface loading state: three wave layers scroll at different
 *  speeds/opacities (slow in back, fast in front) for a parallax slope,
 *  with a centred spinner and status message. Drop-in for runtime-boot
 *  overlays and route-level suspense fallbacks. */
export function SlopeBackdrop({
  height = 240,
  message = "Loading…",
  children,
}: SlopeBackdropProps) {
  // Ridge variant on purpose: layered rolling slopes, back to front.
  const layers = [
    { height: "78%", opacity: 0.14, duration: 30, delay: -11 },
    { height: "58%", opacity: 0.26, duration: 19, delay: -5 },
    { height: "42%", opacity: 0.5, duration: 12, delay: 0 },
  ];
  return (
    <div
      className={styles.backdrop}
      style={{ height }}
      role="status"
      aria-label={message}
    >
      <div className={styles.backdropWaves} aria-hidden>
        {layers.map((layer, i) => (
          <span
            key={i}
            className={styles.backdropLayer}
            style={{ height: layer.height }}
          >
            <WaveSvg
              variant="ridge"
              periods={2}
              duration={layer.duration}
              delay={layer.delay}
              trackOpacity={layer.opacity}
            />
          </span>
        ))}
      </div>
      <div className={styles.backdropContent}>
        {children ?? (
          <>
            <DiamondSpinner size={40} label="" />
            <div className={styles.backdropMsg}>{message}</div>
          </>
        )}
      </div>
    </div>
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

export type GallerySection = "spinners" | "waves" | "surfaces";

/** The /learn demo grid. Rendered per section so the MDX page can put
 *  its own (TOC-visible) headings between groups. */
export default function LoadingAnimationsGallery({
  section = "spinners",
}: {
  section?: GallerySection;
}) {
  if (section === "waves") {
    return (
      <div className={`not-prose ${styles.gallery}`}>
        <DemoCard
          wide
          fill
          title="Logo wave — ridgeline"
          blurb="The mountain mark repeated horizontally — adjacent foot caps coincide, so the ridge scrolls seamlessly. Suits empty states and panel-level loading."
        >
          <LogoWave variant="ridge" height={72} duration={8} />
        </DemoCard>
        <DemoCard
          wide
          fill
          title="Logo wave — sine"
          blurb="Upright crests alternate with vertically mirrored troughs for a full sine-style wave with twice the swing."
        >
          <LogoWave variant="sine" height={96} duration={8} />
        </DemoCard>
        <DemoCard
          wide
          fill
          title="Ambient wave"
          blurb="The ridgeline, slower and fainter — an unobtrusive divider or footer treatment for long-running background work."
        >
          <LogoWave variant="ridge" height={44} duration={18} opacity={0.35} />
        </DemoCard>
        <DemoCard
          title="Wave progress bar"
          blurb="The wave clipped to a pill — an indeterminate progress bar for downloads and runtime boots."
        >
          <span style={{ display: "inline-flex", flexDirection: "column", gap: 14 }}>
            <LogoWaveBar width={250} height={14} duration={5} />
            <LogoWaveBar width={250} height={8} duration={4} />
          </span>
        </DemoCard>
      </div>
    );
  }

  if (section === "surfaces") {
    return (
      <div className={`not-prose ${styles.gallery}`}>
        <DemoCard
          wide
          fill
          title="Slope backdrop"
          blurb="Full-surface loading state: three wave layers scroll at different speeds and opacities for a parallax slope, with a centred spinner and message. Drop-in for runtime-boot overlays and suspense fallbacks."
        >
          <SlopeBackdrop height={250} message="Setting up the Python runtime…" />
        </DemoCard>
        <DemoCard
          wide
          fill
          title="Slope backdrop — progress variant"
          blurb="The same surface with a wave progress bar in the centre slot, for boots that report download stages."
        >
          <SlopeBackdrop height={200}>
            <LogoWaveBar width={240} height={10} duration={4.5} />
            <div className={styles.backdropMsg}>
              Downloading DuckDB (about 6 MB) — first run only…
            </div>
          </SlopeBackdrop>
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
                Downloading the Python runtime — this happens once; later runs
                are instant.
              </span>
            </span>
          </div>
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
        title="Logo trace"
        blurb="The outline of the mark draws itself on and off, one half chasing the other."
      >
        <LogoTraceLoader size={120} />
      </DemoCard>
      <DemoCard
        title="Logo hop"
        blurb="Three small marks hop in sequence — a typing-indicator-style loader for inline and chat-ish contexts."
      >
        <LogoHopLoader size={28} />
      </DemoCard>
    </div>
  );
}
