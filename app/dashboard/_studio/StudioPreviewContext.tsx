"use client";

/**
 * Shell-level state for the builders' live preview column, mirroring the
 * design handoff's top-bar controls:
 *
 *   - `previewOpen`: the "Live Preview" switch — shows/hides the side-by-side
 *     preview column inside the builder pages.
 *   - `fullPreview`: the expand button — hides the form and lets the preview
 *     take the full content width. Turning it on forces the preview open;
 *     toggling the switch off exits full preview too (same coupling as the
 *     design's togglePreview/toggleFullPreview).
 *
 * It lives in the shell (not the builder pages) because the toggles render in
 * the top bar while the columns render inside each builder's content.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface StudioPreviewValue {
  previewOpen: boolean;
  fullPreview: boolean;
  togglePreview: () => void;
  toggleFullPreview: () => void;
}

const StudioPreviewContext = createContext<StudioPreviewValue | null>(null);

export function StudioPreviewProvider({ children }: { children: React.ReactNode }) {
  const [previewOpen, setPreviewOpen] = useState(true);
  const [fullPreview, setFullPreview] = useState(false);

  const togglePreview = useCallback(() => {
    setPreviewOpen((open) => !open);
    setFullPreview(false);
  }, []);

  const toggleFullPreview = useCallback(() => {
    setFullPreview((full) => {
      if (!full) setPreviewOpen(true);
      return !full;
    });
  }, []);

  const value = useMemo(
    () => ({
      previewOpen: previewOpen || fullPreview,
      fullPreview,
      togglePreview,
      toggleFullPreview,
    }),
    [previewOpen, fullPreview, togglePreview, toggleFullPreview],
  );

  return (
    <StudioPreviewContext.Provider value={value}>
      {children}
    </StudioPreviewContext.Provider>
  );
}

export function useStudioPreview(): StudioPreviewValue {
  const ctx = useContext(StudioPreviewContext);
  if (!ctx) {
    throw new Error("useStudioPreview must be used within a StudioPreviewProvider");
  }
  return ctx;
}
