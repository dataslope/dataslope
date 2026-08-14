"use client";

/**
 * Brand loading animations built from the Dataslope logo mark. Mirroring the
 * mark vertically across its foot line (y = 546.66) and stacking the copies
 * makes the foot caps coincide, forming the hollow-diamond spinner shape. All
 * shapes render with `currentColor` (`color` prop overrides the brand blue);
 * the CSS module honours `prefers-reduced-motion` with an opacity pulse.
 */

import { useId, type CSSProperties, type ReactNode } from "react";
import styles from "./loadingAnimations.module.css";

// ─── Logo geometry ─────────────────────────────────────────────────────
// Path data and radial gradients are lifted verbatim from
// public/dataslope-logo-blue.svg, with the gradients' #148cff stops
// swapped to currentColor so light/dark retinting works.

const LOGO_W = 1087.59;
const LOGO_H = 682.55;

/** y of the foot-cap centres, the mirror axis for the diamond. */
const FOOT_Y = 546.66;
/** Exact-mirror stack height (foot caps coinciding): the diamond's height. */
const MIRROR_H = FOOT_Y * 2; // 1093.32
/** Stacked hollow-diamond height (alias for readability at use sites). */
const DIAMOND_H = MIRROR_H;

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

/** The logo's radial gradients with currentColor stops; the varying opacities
 *  make the overlapping swooshes read as petals. gradientUnits is
 *  userSpaceOnUse, so the mirrored copy's transform flips the gradients too. */
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

/** The hollow diamond: the mark plus its vertical mirror image, foot caps
 *  coinciding at y = FOOT_Y. */
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

/** The hollow-diamond shape as a static SVG; parent's CSS `color` sets the
 *  tint. Decorative by default; pass `label` to expose it to assistive tech. */
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
  /** Any CSS color overriding the brand-blue tint (set on the wrapper; the
   *  mark draws with `currentColor`). */
  color?: string;
}

/** The hollow diamond rotating continuously. */
export function DiamondSpinner({
  size = 44,
  duration = 1.5,
  label = "Loading…",
  color,
}: SpinnerProps) {
  const gradId = useSafeId("ds-dia");
  return (
    <span
      className={styles.loader}
      role="img"
      aria-label={label}
      style={color ? { color } : undefined}
    >
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

/** The diamond turning in eased half-turn steps with a brief rest; 2-fold
 *  symmetry makes each 180° step land on an identical pose. */
export function DiamondTurnSpinner({
  size = 44,
  label = "Loading…",
  color,
}: Omit<SpinnerProps, "duration">) {
  const gradId = useSafeId("ds-turn");
  return (
    <span
      className={styles.loader}
      role="img"
      aria-label={label}
      style={color ? { color } : undefined}
    >
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

/** Headroom (user units) for the separated halves; must match the translateY
 *  distance in the CSS keyframes. */
const ASSEMBLE_GAP = 170;

/** The two halves drift apart and snap back. Both share one keyframe: the
 *  bottom half sits inside the flip group, so the same local translateY moves
 *  it the opposite way. */
export function DiamondAssembleLoader({
  size = 64,
  label = "Loading…",
  color,
}: Omit<SpinnerProps, "duration">) {
  const gradId = useSafeId("ds-asm");
  const viewH = DIAMOND_H + ASSEMBLE_GAP * 2;
  const height = Math.round(size * (viewH / LOGO_W));
  return (
    <span
      className={styles.loader}
      role="img"
      aria-label={label}
      style={color ? { color } : undefined}
    >
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

/** Concentric diamond outlines scale outward and fade (radar ping);
 *  `transform-box: fill-box` centres the scale, non-scaling-stroke keeps the
 *  outline weight constant. */
export function DiamondRippleLoader({
  size = 72,
  label = "Loading…",
  color,
}: Omit<SpinnerProps, "duration">) {
  return (
    <span
      className={styles.loader}
      role="img"
      aria-label={label}
      style={color ? { color } : undefined}
    >
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

/** Assemble + eased quarter turn + part again. One CSS loop is FOUR such
 *  steps (a full 360°) so it lands on the same pose AND shading — a half turn
 *  would swap the differently-gradiented halves and visibly flip. Rotation
 *  lives on the <svg> (viewBox symmetric, so element centre = rotation
 *  centre), translation on the inner half groups; one 4.8s CSS timeline. */
export function DiamondAssembleTurnLoader({
  size = 64,
  label = "Loading…",
  color,
}: Omit<SpinnerProps, "duration">) {
  const gradId = useSafeId("ds-asmturn");
  const viewH = DIAMOND_H + ASSEMBLE_GAP * 2;
  return (
    <span
      className={styles.loader}
      role="img"
      aria-label={label}
      style={color ? { color } : undefined}
    >
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

/** Three small marks hop in sequence, a typing-indicator-style loader. */
export function LogoHopLoader({
  size = 26,
  label = "Loading…",
  color,
}: Omit<SpinnerProps, "duration">) {
  const height = Math.round(size * (LOGO_H / LOGO_W));
  return (
    <span
      className={`${styles.loader} ${styles.hopRow}`}
      role="img"
      aria-label={label}
      style={color ? { color } : undefined}
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

// ─── Demo gallery (the /learn/loading-animations page) ────────────────

function DemoCard({
  title,
  blurb,
  wide = false,
  fill = false,
  dark = false,
  children,
}: {
  title: string;
  blurb: string;
  wide?: boolean;
  fill?: boolean;
  /** Dark preview backdrop, needed so a white loader variant is visible. */
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`${styles.card}${wide ? ` ${styles.cardWide}` : ""}`}>
      <div
        className={`${styles.cardPreview}${fill ? ` ${styles.cardPreviewFill}` : ""}${dark ? ` ${styles.cardPreviewDark}` : ""}`}
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

export type GallerySection = "spinners" | "variants";

/** Brand-palette color variants. The mark draws with `currentColor`, so each
 *  loader just takes a `color`. White needs a dark backdrop to be visible. */
const COLOR_VARIANTS: {
  title: string;
  color: string;
  dark?: boolean;
  blurb: string;
}[] = [
  {
    title: "White",
    color: "#ffffff",
    dark: true,
    blurb: "For dark surfaces and overlays. Shown here on a dark backdrop.",
  },
  {
    title: "Black",
    color: "var(--ds-gray-900)",
    blurb: "Neutral mark for light surfaces where brand blue is too loud.",
  },
  {
    title: "Green",
    color: "var(--ds-green-500)",
    blurb: "Brand green (var(--ds-green-500)), success and “ready” states.",
  },
  {
    title: "Red",
    color: "var(--ds-red-500)",
    blurb: "Brand red (var(--ds-red-500)), errors and destructive waits.",
  },
];

/** The /learn demo grid. Rendered per section so the MDX page can put
 *  its own (TOC-visible) headings between groups. */
export default function LoadingAnimationsGallery({
  section = "spinners",
}: {
  section?: GallerySection;
}) {
  if (section === "variants") {
    return (
      <div className={`not-prose ${styles.gallery}`}>
        {COLOR_VARIANTS.map((v) => (
          <DemoCard
            key={v.title}
            dark={v.dark}
            title={`Diamond, ${v.title}`}
            blurb={v.blurb}
          >
            <DiamondAssembleTurnLoader size={72} color={v.color} label="" />
          </DemoCard>
        ))}
      </div>
    );
  }

  return (
    <div className={`not-prose ${styles.gallery}`}>
      <DemoCard
        title="Diamond spinner"
        blurb="The logo stacked with a vertically mirrored copy, the foot caps coincide and the translucent swooshes overlap as petals around a small hollow diamond centre. Rotates continuously; works from button-size up."
      >
        <span className={styles.sizeRow}>
          <DiamondSpinner size={20} />
          <DiamondSpinner size={44} />
          <DiamondSpinner size={72} />
        </span>
      </DemoCard>
      <DemoCard
        title="Diamond half-turn"
        blurb="The diamond turns in eased half-turn steps with a brief rest, calmer than a continuous spin for longer waits."
      >
        <DiamondTurnSpinner size={56} />
      </DemoCard>
      <DemoCard
        title="Diamond ripple"
        blurb="Concentric diamond outlines scale outward and fade, radar-ping style, reads well on empty surfaces."
      >
        <DiamondRippleLoader size={86} />
      </DemoCard>
      <DemoCard
        title="Diamond assemble"
        blurb="The two logo halves drift apart and snap back into the diamond, a natural fit for “preparing…” states."
      >
        <DiamondAssembleLoader size={62} />
      </DemoCard>
      <DemoCard
        title="Diamond assemble + quarter-turn"
        blurb="The combined sequence: the halves snap together, the diamond makes an eased quarter turn, and the halves part again, alternating vertical and horizontal drifts as the rotation carries the split axis around."
      >
        <DiamondAssembleTurnLoader size={72} />
      </DemoCard>
      <DemoCard
        title="Logo hop"
        blurb="Three small marks hop in sequence, a typing-indicator-style loader for inline and chat-ish contexts."
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
