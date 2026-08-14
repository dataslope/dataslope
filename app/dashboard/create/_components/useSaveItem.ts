"use client";

/**
 * Save/edit flow shared by the three item builders. Signed-in creators' later
 * saves become PUTs to the same /c/<id>; guests mint a fresh link per save
 * (no owner → nothing to authorize an edit against). In edit mode the builder
 * calls `beginEdit` after prefilling, so the first save is already a PUT.
 */

import { useCallback, useState } from "react";
import { useSession } from "@/lib/auth/client";
import type { CustomItemKind, CustomItemPayload } from "@/lib/custom-content/types";
import { createItem, updateItem, CustomApiError } from "./api";

export interface SaveItemState {
  saving: boolean;
  savedUrl: string | null;
  /** Non-null once saves update an existing row instead of creating. */
  editingId: string | null;
  error: string | null;
  /** Clear the error (builders call this on input changes). */
  clearError: () => void;
  /** Switch into update mode (edit prefill). */
  beginEdit: (id: string) => void;
  save: (kind: CustomItemKind, title: string, payload: CustomItemPayload) => Promise<void>;
}

export function useSaveItem(): SaveItemState {
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const beginEdit = useCallback((id: string) => {
    setEditingId(id);
    setSavedUrl(`${window.location.origin}/c/${id}`);
  }, []);

  const save = useCallback(
    async (kind: CustomItemKind, title: string, payload: CustomItemPayload) => {
      setSaving(true);
      setError(null);
      try {
        if (editingId) {
          await updateItem(editingId, { title, payload });
          setSavedUrl(`${window.location.origin}/c/${editingId}`);
        } else {
          const res = await createItem({ kind, title, payload });
          setSavedUrl(res.url);
          // Members keep editing the same row; guests mint a new link each
          // save (no owner → no edits).
          if (session) setEditingId(res.item.id);
        }
      } catch (err) {
        setError(
          err instanceof CustomApiError
            ? err.message
            : "Something went wrong while saving. Please try again.",
        );
      } finally {
        setSaving(false);
      }
    },
    [editingId, session],
  );

  return {
    saving,
    savedUrl,
    editingId,
    error,
    clearError: useCallback(() => setError(null), []),
    beginEdit,
    save,
  };
}
