// Shared lightweight loading state for the per-request (D1-backed) segments.
// The theme is already on <html> before this paints (app/layout.tsx), so a
// hard load in dark mode doesn't flash white while the segment streams.
//
// NOTE: this file has its own entry in app/tailwind.shared.css's @source
// list (both Tailwind roots compile with source(none)); if it moves,
// update that glob or its utilities stop being generated.
import "@/app/tailwind.css";

export default function SegmentLoading({
  fullScreen = true,
}: {
  /** Full-viewport centering for standalone segments; false when the
      spinner renders inside persistent chrome (the dashboard shell). */
  fullScreen?: boolean;
}) {
  return (
    <>
      <div
        className={`flex items-center justify-center ${
          fullScreen ? "min-h-screen bg-white dark:bg-[#121212]" : "py-24"
        }`}
      >
        <div
          role="status"
          aria-label="Loading"
          className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--ds-gray-200)] border-t-[var(--ds-blue-500)] dark:border-white/10 dark:border-t-[var(--ds-blue-400)]"
        />
      </div>
    </>
  );
}
