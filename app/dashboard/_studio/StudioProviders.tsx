"use client";

// Client boundary for the /dashboard Studio shell: the AI-draft and
// live-preview state providers wrapping the sidebar/top-bar chrome. Kept
// separate from layout.tsx so the layout can stay a server component
// (rendering the pre-hydration theme script, exporting metadata) while this
// holds the client-only shell.
import { StudioAiProvider } from "./StudioAiContext";
import { StudioPreviewProvider } from "./StudioPreviewContext";
import { StudioShell } from "./StudioShell";

export function StudioProviders({ children }: { children: React.ReactNode }) {
  return (
    <StudioAiProvider>
      <StudioPreviewProvider>
        <StudioShell>{children}</StudioShell>
      </StudioPreviewProvider>
    </StudioAiProvider>
  );
}
