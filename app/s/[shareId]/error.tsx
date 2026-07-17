"use client";

// Segment error boundary: a transient D1/R2 failure while resolving a shared
// playground link no longer bubbles to the root boundary.
import SegmentError from "@/app/_components/SegmentError";

export default function ShareError({
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
      title="This shared playground didn't load"
      message="A temporary problem interrupted opening this share link. It usually clears up on retry — the shared workspace itself is safe."
    />
  );
}
