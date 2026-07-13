"use client";

// Client boundary for the /create Studio shell: the AI-draft state provider
// wrapping the sidebar/top-bar chrome. Kept separate from layout.tsx so the
// layout can stay a server component (rendering the pre-hydration theme script
// server-side, exporting metadata) while this holds the client-only shell.
import { StudioAiProvider } from "./StudioAiContext";
import { StudioShell } from "./StudioShell";

export function StudioProviders({ children }: { children: React.ReactNode }) {
  return (
    <StudioAiProvider>
      <StudioShell>{children}</StudioShell>
    </StudioAiProvider>
  );
}
