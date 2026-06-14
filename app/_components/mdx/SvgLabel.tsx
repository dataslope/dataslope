export function SvgLabel({ figId }: { figId: string }) {
  return (
    // `id={figId}` makes each graphic a deep-link target, so the build-time
    // SVG gallery (/svg-gallery) can link straight to a graphic on its lesson.
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
