export function SvgLabel({ figId }: { figId: string }) {
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
