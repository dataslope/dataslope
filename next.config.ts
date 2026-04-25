import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The C playground uses `@wasmer/sdk`, which spins up a Web Worker
  // threadpool backed by `SharedArrayBuffer`. Browsers only expose
  // `SharedArrayBuffer` to cross-origin-isolated documents, so we need
  // to serve the `/c` page with COOP/COEP headers.
  //
  // We deliberately scope this to `/c` only — applying it globally would
  // require every cross-origin script the other playgrounds load
  // (Pyodide, WebR, php-wasm, plotly from CDNs) to also send
  // `Cross-Origin-Resource-Policy: cross-origin`, which we can't
  // guarantee.
  async headers() {
    return [
      {
        source: "/c",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
