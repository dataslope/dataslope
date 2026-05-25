"use client";

import { useEffect } from "react";

import { CORS_PROXY_BASE } from "./runtime/corsProxy";

export function CorsProxyServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    if (!CORS_PROXY_BASE) return;

    navigator.serviceWorker
      .register("/cors-proxy-sw.js", { scope: "/" })
      .catch((err) => console.warn("[cors-proxy-sw] registration failed:", err));
  }, []);

  return null;
}
