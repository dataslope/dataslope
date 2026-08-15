"use client";

/**
 * Shell-level state for the builders' live preview column. `previewOpen`
 * shows/hides the side-by-side column; `fullPreview` hides the form instead.
 * Turning full preview on forces the preview open, and switching the preview
 * off exits full preview. Lives in the shell because the toggles render in
 * the top bar while the columns render inside each builder.
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
