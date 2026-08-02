"use client";

// Segment error boundary for the dashboard: renders inside the Studio shell
// (app/dashboard/layout.tsx keeps the sidebar/top bar mounted), so a failed
// create/account/admin view degrades to an inline card instead of replacing
// the whole page via the root boundary.
import SegmentError from "@/app/_components/SegmentError";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentError
      error={error}
      reset={reset}
      title="This dashboard page didn't load"
      message="A temporary problem interrupted loading this view. Retry, or pick another section from the sidebar. Your saved work is not affected."
      fullScreen={false}
    />
  );
}
