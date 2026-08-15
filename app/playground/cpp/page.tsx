"use client";

import dynamic from "next/dynamic";

// Client-only: the playground restores its workspace from OPFS/localStorage,
// so there is nothing useful to server-render, and a static import would put
// the whole <Playground> graph into the deployed Worker. Deliberately no
// loading fallback: a pre-chunk skeleton can't know the persisted playground
// theme, so it flashed dark over light-themed setups.
const CppPlayground = dynamic(() => import("./client"), { ssr: false });

export default function CppPage() {
  return <CppPlayground />;
}
