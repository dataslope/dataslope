"use client";

// Client boundary for the /dashboard Studio shell. Kept separate from
// layout.tsx so the layout can stay a server component (rendering the
// pre-hydration theme script, exporting metadata) while this holds the
// client-only shell.
//
// This used to wrap two context providers — AI draft state and live preview —
// that existed only for the /create builders. Both went with them, so the
// shell needs no provider of its own; this remains purely as the boundary.
import { StudioShell } from "./StudioShell";

export function StudioProviders({ children }: { children: React.ReactNode }) {
  return <StudioShell>{children}</StudioShell>;
}
