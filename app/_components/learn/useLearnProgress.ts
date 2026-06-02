"use client";

// Per-learner lesson-completion progress, persisted to localStorage so a
// returning learner keeps their place across sessions. Keyed by lesson URL
// (e.g. "/learn/python-basics/hello-world"), which matches both
// `usePathname()` and the Fumadocs page-tree URLs.
//
// SSR note: components must gate any progress-derived UI behind a mounted
// check so the first client render matches the server (empty) render —
// otherwise localStorage-restored state would trip a hydration mismatch.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface LearnProgressState {
  completed: Record<string, boolean>;
  toggle: (url: string) => void;
  setComplete: (url: string, value: boolean) => void;
}

export const useLearnProgress = create<LearnProgressState>()(
  persist(
    (set) => ({
      completed: {},
      toggle: (url) =>
        set((state) => {
          const completed = { ...state.completed };
          if (completed[url]) delete completed[url];
          else completed[url] = true;
          return { completed };
        }),
      setComplete: (url, value) =>
        set((state) => {
          const completed = { ...state.completed };
          if (value) completed[url] = true;
          else delete completed[url];
          return { completed };
        }),
    }),
    {
      name: "dataslope-learn-progress",
      version: 1,
      // localStorage is unavailable during SSR — fall back to a no-op store
      // so creation never throws; the client mounts and restores from
      // localStorage after hydration.
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
);
