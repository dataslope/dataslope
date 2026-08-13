"use client";

import dynamic from "next/dynamic";

// Client-only, matching the SQL playground pages: the playground restores
// its workspace and tabs from OPFS/localStorage on the client, so there is
// nothing useful to server-render — and the static import this replaces put
// the whole <Playground> graph into the deployed Worker for every language
// route (agent-outputs/20260813-1424-git-playground-design.md §8.8). The
// adapter import lives in ./client so it stays out of the server graph too.
// Deliberately no loading fallback: the boot overlay fades in when the chunk
// mounts (playground.css), and a pre-chunk skeleton can't know the persisted
// playground theme, so it flashed dark over light-themed setups.
const RPlayground = dynamic(() => import("./client"), { ssr: false });

export default function RPage() {
  return <RPlayground />;
}
