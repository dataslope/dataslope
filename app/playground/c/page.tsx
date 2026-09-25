"use client";

import dynamic from "next/dynamic";
import { playgroundTitle } from "../_components/PlaygroundTitle";

// Client-only: the playground restores its workspace from OPFS/localStorage,
// so there is nothing useful to server-render, and a static import would put
// the whole <Playground> graph into the deployed Worker. No visible
// loading fallback: a pre-chunk skeleton can't know the persisted playground
// theme, so it flashed dark over light-themed setups.
const CPlayground = dynamic(() => import("./client"), {
  ssr: false,
  loading: playgroundTitle("c"),
});

export default function CPage() {
  return <CPlayground />;
}
