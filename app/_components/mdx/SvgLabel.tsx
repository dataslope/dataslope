/**
 * The small grey id under each inline `<svg>`/Mermaid diagram (injected by
 * `lib/remarkSvgLabels`) — authoring scaffolding, rendered ONLY under
 * `next dev`. Returns null (not an empty div, which would leave a stray
 * margin gap) in deployed builds; the remark plugin still runs in production
 * so the ids stay stable.
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
