"use client";

// Segment error boundary: a transient D1/network failure while loading a
// quiz set no longer bubbles to the root boundary (whose copy talks about
// playground work and replaces the whole page).
import SegmentError from "@/app/_components/SegmentError";

export default function QuizError({
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
      title="This quiz didn't load"
      message="A temporary problem interrupted loading this quiz set. It usually clears up on retry, and the quiz itself is safe."
    />
  );
}
