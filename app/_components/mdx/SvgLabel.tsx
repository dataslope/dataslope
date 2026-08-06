/**
 * The small grey id printed under each inline `<svg>` and each Mermaid
 * diagram in a lesson (injected by `lib/remarkSvgLabels`).
 *
 * It exists so an author or reviewer reading the live page can name the exact
 * graphic they want changed, which is authoring scaffolding, not something a
 * learner should see. So it renders ONLY under `next dev`: in any deployed
 * build this returns null, and the diagram is followed by nothing at all
 * (returning an empty div instead would leave its `margin-top` behind as a
 * stray gap). The remark plugin still runs in production, so the ids stay
 * stable and the labels reappear the moment you're back on localhost.
 */
const SHOW_SVG_LABELS = process.env.NODE_ENV === "development";

export function SvgLabel({ figId }: { figId: string }) {
  if (!SHOW_SVG_LABELS) return null;
  return (
    // `id={figId}` makes each graphic a deep-link target, so the build-time
    // Stable per-graphic id, kept so a lesson SVG remains addressable by anchor.
    <div
      id={figId}
      data-svg-id={figId}
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "0.8125rem",
        color: "var(--ds-gray-600, #4B5563)",
        textAlign: "center",
        marginTop: "0.375rem",
        letterSpacing: "0.025em",
      }}
    >
      {figId}
    </div>
  );
}
