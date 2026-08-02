"use client";

// Segment error boundary: a transient D1/network failure while loading a
// shared challenge no longer bubbles to the root boundary (whose copy talks
// about playground work and replaces the whole page).
import SegmentError from "@/app/_components/SegmentError";

export default function CustomItemError({
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
      title="This challenge didn't load"
      message="A temporary problem interrupted loading this page. It usually clears up on retry, and the challenge itself is safe."
    />
  );
}
