"use client";

/**
 * Client-only loader for `CustomItemRenderer`.
 *
 * The renderer pulls in the entire interactive-card graph, CodeMirror,
 * the language-runtime registry, react-markdown + KaTeX + highlight.js,
 * which is multiple MiB of JS. Importing it from a server-rendered page
 * would drag all of it into the OpenNext Worker bundle, and the deployed
 * Worker sits close to Cloudflare's 10 MiB (gzipped) ceiling (see
 * agent-outputs/20260620-1640-cloudflare-deploy-runbook.md). `ssr: false`
 * keeps the graph out of the server bundle entirely; the cards need a
 * browser to do anything useful anyway (WASM runtimes, editors), so
 * skipping their SSR costs only the initial paint of a placeholder.
 *
 * Every route-level consumer (the /c and /quiz viewers, the /create
 * builders' previews) must import THIS module, not CustomItemRenderer
 * directly, or the Worker regains the weight.
 */

import dynamic from "next/dynamic";

const CustomItemRenderer = dynamic(() => import("./CustomItemRenderer"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-label="Loading challenge"
      style={{
        border: "1px solid rgba(128, 128, 128, 0.25)",
        borderRadius: "12px",
        padding: "2.5rem 1rem",
        textAlign: "center",
        fontSize: "0.875rem",
        opacity: 0.7,
      }}
    >
      Loading challenge…
    </div>
  ),
});

export default CustomItemRenderer;
