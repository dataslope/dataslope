"use client";

/**
 * "Mark complete" toggle shown at the bottom of every /learn lesson. Stores
 * completion against the current pathname in the persisted learn-progress
 * store (see useLearnProgress), which the course sidebar reads to show a
 * progress bar + "Continue" resume link.
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { useLearnProgress } from "./useLearnProgress";
import styles from "./progress.module.css";

export function LessonComplete() {
  const pathname = usePathname();
  const completed = useLearnProgress((s) => s.completed);
  const toggle = useLearnProgress((s) => s.toggle);
  // Gate on mount so SSR and the first client render agree (empty), then
  // reflect the localStorage-restored state — avoids a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Show on lesson pages only, not the /learn landing index.
  if (!pathname || pathname === "/learn" || !pathname.startsWith("/learn/")) {
    return null;
  }

  const done = mounted && !!completed[pathname];

  return (
    <div className={styles.lessonComplete}>
      <button
        type="button"
        className={`${styles.completeBtn}${done ? ` ${styles.completeBtnDone}` : ""}`}
        onClick={() => toggle(pathname)}
        aria-pressed={done}
        data-testid="lesson-complete"
      >
        <Check size={16} strokeWidth={2.5} aria-hidden />
        {done ? "Completed" : "Mark complete"}
      </button>
    </div>
  );
}
