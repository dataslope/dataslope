"use client";

import dynamic from "next/dynamic";

// Client-only, matching the SQL playground pages: the playground restores
// its workspace and tabs from OPFS/localStorage on the client, so there is
// nothing useful to server-render — and the static import this replaces put
// the whole <Playground> graph into the deployed Worker for every language
// route (agent-outputs/20260813-1424-git-playground-design.md §8.8). The
// adapter import lives in ./client so it stays out of the server graph too.
const CSharpPlayground = dynamic(() => import("./client"), { ssr: false });

export default function CSharpPage() {
  return <CSharpPlayground />;
}
