"use client";

import dynamic from "next/dynamic";

// Client-only, matching the other playground routes: the whole graph
// (just-bash worker client, panels) needs a browser, and a static import would
// put it into the deployed Worker. No loading fallback — the boot overlay
// inside the component can't be reproduced before the chunk lands.
const GitPlaygroundClient = dynamic(() => import("./client"), { ssr: false });

export default function GitPage() {
  return <GitPlaygroundClient />;
}
