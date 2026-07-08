"use client";

/**
 * Mount point for the "Ask AI" widget, rendered once from the root layout.
 *
 * It renders NOTHING except on the lesson routes (`/courses/*`,
 * `/interview-prep/*`, `/fumadocs-dev/*`) and `/playground/*`, and the
 * actual widget (which pulls
 * in react-markdown) is dynamically imported so those bytes never load on
 * the home page, pricing, etc. Off-surface this is a bare `usePathname()`
 * check, no session fetch, no widget code.
 *
 * `collectContext` is called at send time (not render), so it reads the live
 * playground store / current slug each time the user asks.
 */
import { useCallback } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { getPlaygroundStore } from "@/app/_components/stores/createPlaygroundStore";
import { isSqlPlayground } from "@/lib/workspaces/types";
import type { AskAiClientContext } from "@/lib/ai/types";

const AskAiWidget = dynamic(() => import("./AskAiWidget"), { ssr: false });

const MAX_FILE_CHARS = 8000;
const MAX_FILES = 6;

// SQL playgrounds use a different store shape; send page-level context only for
// them in v1 (their files/outputs aren't in the createPlaygroundStore registry).
function collectPlayground(segment: string): AskAiClientContext {
  const base: AskAiClientContext = { surface: "playground", adapterId: segment };
  if (!segment || isSqlPlayground(segment)) return base;
  try {
    const state = getPlaygroundStore(segment).getState();
    const files = state.files
      .slice(0, MAX_FILES)
      .map((f) => ({
        filename: f.filename,
        content: (state.dirtyBuffers.get(f.id) ?? "").slice(0, MAX_FILE_CHARS),
      }))
      .filter((f) => f.content.trim());
    const outputs = (state.outputsByFile.get(state.activeFileId) ?? [])
      .filter((c) => c.type === "stdout" || c.type === "stderr")
      .map((c) => c.content)
      .filter(Boolean)
      .slice(-4);
    return { ...base, files, outputs };
  } catch {
    return base;
  }
}

export default function AskAi() {
  const pathname = usePathname() ?? "";
  // Lesson surfaces: course lessons, interview-prep pages, and the dev
  // component gallery. The bare `/courses` URL is the catalog page, no
  // lesson to ask about there. Interview-prep has no raw-Markdown mirror,
  // so its context comes entirely from the widget registry (the questions
  // on screen), which is what matters there anyway.
  const onInterviewPrep = pathname.startsWith("/interview-prep/");
  const onLesson =
    pathname.startsWith("/courses/") ||
    onInterviewPrep ||
    pathname === "/fumadocs-dev" ||
    pathname.startsWith("/fumadocs-dev/");
  const onPlayground = pathname.startsWith("/playground");

  const collectContext = useCallback((): AskAiClientContext => {
    const segments = pathname.split("/").filter(Boolean); // e.g. ["courses","a","b"]
    if (
      pathname.startsWith("/courses") ||
      pathname.startsWith("/interview-prep") ||
      pathname.startsWith("/fumadocs-dev")
    ) {
      // Send the FULL path segments (base included), the server allowlists
      // the base segment and fetches `/<segments>.md` (see lib/ai/context.ts).
      // Bases without a `.md` mirror (interview-prep) resolve to null there.
      return { surface: "learn", slug: segments };
    }
    return collectPlayground(segments[1] ?? "");
  }, [pathname]);

  if (!onLesson && !onPlayground) return null;

  return (
    <AskAiWidget
      surface={onLesson ? "learn" : "playground"}
      // Interview-prep mounts as the "learn" surface but isn't a lesson,
      // keep the widget's copy honest about what it's looking at.
      subjectNoun={
        onInterviewPrep ? "question set" : onLesson ? "lesson" : "playground"
      }
      collectContext={collectContext}
    />
  );
}
