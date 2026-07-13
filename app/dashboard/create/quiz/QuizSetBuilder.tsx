"use client";

/**
 * Builder for a quiz set: an ordered collection of custom items shared at
 * /quiz/<id>. Items come from two places, the signed-in creator's own
 * items (listed with one-click Add) and pasted /c/<id> links or ids
 * (resolved through GET /api/custom/items/:id so guests can assemble sets
 * too).
 */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { customItemShortLabel } from "@/lib/custom-content/labels";
import type { CustomItemKind, CustomItemMeta } from "@/lib/custom-content/types";
import {
  CustomApiError,
  createSet,
  getItem,
  getSet,
  listItems,
  updateSet,
} from "../_components/api";
import {
  ErrorNotice,
  Fieldset,
  GuestNotice,
  PrimaryButton,
  SharedLinkPanel,
  SmallButton,
  TextAreaField,
  TextField,
} from "../_components/builderUi";
import { useRegisterBuilderDraft } from "@/app/dashboard/_studio/StudioAiContext";
import type { DraftResult } from "@/lib/ai/draft";

interface PickedItem {
  id: string;
  title: string;
  kind: CustomItemKind;
}

/** Accepts a bare 16-char id or any URL whose path ends in /c/<id>. */
function extractItemId(input: string): string | null {
  const raw = input.trim();
  const m = raw.match(/\/c\/([a-z0-9]{16})\b/);
  if (m) return m[1];
  return /^[a-z0-9]{16}$/.test(raw) ? raw : null;
}

export default function QuizSetBuilder() {
  const params = useSearchParams();
  const editId = params.get("edit");
  const { data: session } = useSession();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [picked, setPicked] = useState<PickedItem[]>([]);
  const [mine, setMine] = useState<CustomItemMeta[] | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [resolving, setResolving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // The signed-in creator's items, offered as one-click adds. Signed-out
  // renders ignore `mine` entirely, so a stale list from a previous
  // session needs no reset.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    listItems()
      .then((items) => {
        if (!cancelled) setMine(items);
      })
      .catch(() => {
        if (!cancelled) setMine([]);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Edit prefill: load the set, then each item's title for the list.
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      try {
        const set = await getSet(editId);
        if (cancelled) return;
        if (!set.owned) {
          setLoadError(
            "Only the creator can edit this quiz set. You can still view it, or build your own.",
          );
          return;
        }
        setTitle(set.title);
        setDescription(set.description);
        setEditingId(editId);
        setSavedUrl(`${window.location.origin}/quiz/${editId}`);
        const items = await Promise.all(
          set.itemIds.map((id) =>
            getItem(id).then(
              (item) => ({ id, title: item.title, kind: item.kind }),
              () => null,
            ),
          ),
        );
        if (!cancelled) setPicked(items.filter((i): i is PickedItem => i !== null));
      } catch {
        if (!cancelled)
          setLoadError("Couldn't load that quiz set, the link may have expired.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  // "Fill with AI": a quiz set references existing items, so AI only drafts the
  // title + description; the user adds the questions themselves below.
  useRegisterBuilderDraft("quiz", (draft: DraftResult) => {
    if (draft.kind !== "quiz") return;
    setFormError(null);
    setTitle(draft.title);
    setDescription(draft.description);
  });

  const addPicked = useCallback((item: PickedItem) => {
    setFormError(null);
    setPicked((prev) =>
      prev.some((p) => p.id === item.id) ? prev : [...prev, item],
    );
  }, []);

  const onAddByLink = async () => {
    setFormError(null);
    const id = extractItemId(linkInput);
    if (!id) {
      setFormError("Paste a /c/… link or a 16-character item id.");
      return;
    }
    setResolving(true);
    try {
      const item = await getItem(id);
      addPicked({ id: item.id, title: item.title, kind: item.kind });
      setLinkInput("");
    } catch (err) {
      setFormError(
        err instanceof CustomApiError && err.status === 404
          ? "No challenge found at that link, it may have expired."
          : "Couldn't look up that link, please try again.",
      );
    } finally {
      setResolving(false);
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    setPicked((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const onSave = async () => {
    setFormError(null);
    if (!title.trim()) {
      setFormError("Give the quiz set a title.");
      return;
    }
    if (picked.length === 0) {
      setFormError("Add at least one challenge or question to the set.");
      return;
    }
    setSaving(true);
    try {
      const input = {
        title: title.trim(),
        description: description.trim(),
        itemIds: picked.map((p) => p.id),
      };
      if (editingId) {
        await updateSet(editingId, input);
        setSavedUrl(`${window.location.origin}/quiz/${editingId}`);
      } else {
        const res = await createSet(input);
        setSavedUrl(res.url);
        if (session) setEditingId(res.set.id);
      }
    } catch (err) {
      setFormError(
        err instanceof CustomApiError
          ? err.message
          : "Something went wrong while saving. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return <ErrorNotice message={loadError} />;
  }

  const pickedIds = new Set(picked.map((p) => p.id));
  const addable = (mine ?? []).filter((m) => !pickedIds.has(m.id));

  return (
    <div className="flex flex-col gap-6">
      <GuestNotice />

      <TextField
        label="Title"
        value={title}
        onChange={(v) => {
          setTitle(v);
          setFormError(null);
        }}
        placeholder="e.g. SQL joins practice set"
        maxLength={120}
      />

      <TextAreaField
        label="Description (optional)"
        value={description}
        onChange={(v) => setDescription(v)}
        rows={2}
        placeholder="Shown under the quiz title on the share page."
      />

      <Fieldset legend={`Questions in this quiz (${picked.length})`}>
        {picked.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing here yet, add your own creations below or paste a /c/…
            link.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {picked.map((item, i) => (
              <li
                key={item.id}
                className="bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2"
              >
                <span className="text-muted-foreground w-6 shrink-0 text-right text-sm font-semibold">
                  {i + 1}.
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {item.title}
                </span>
                <Badge variant="outline" className="text-muted-foreground shrink-0 rounded-full text-[11px]">
                  {customItemShortLabel(item.kind)}
                </Badge>
                <span className="flex shrink-0 gap-1">
                  <SmallButton onClick={() => move(i, -1)} disabled={i === 0}>
                    ↑
                  </SmallButton>
                  <SmallButton
                    onClick={() => move(i, 1)}
                    disabled={i === picked.length - 1}
                  >
                    ↓
                  </SmallButton>
                  <SmallButton
                    tone="danger"
                    onClick={() =>
                      setPicked((prev) => prev.filter((p) => p.id !== item.id))
                    }
                  >
                    Remove
                  </SmallButton>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Fieldset>

      <Fieldset legend="Add by link or id">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="text"
            value={linkInput}
            onChange={(e) => {
              setLinkInput(e.target.value);
              setFormError(null);
            }}
            placeholder="https://…/c/abcd1234efgh5678 or the 16-character id"
            className="min-w-0 flex-1 font-mono text-[13px] md:text-[13px]"
          />
          <SmallButton onClick={onAddByLink} disabled={resolving || !linkInput.trim()}>
            {resolving ? "Looking up…" : "Add"}
          </SmallButton>
        </div>
      </Fieldset>

      {session ? (
        <Fieldset legend="Your creations">
          {mine === null ? (
            <p className="text-muted-foreground text-sm">
              Loading…
            </p>
          ) : addable.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {mine.length === 0
                ? "You haven't created any challenges or questions yet."
                : "All of your creations are already in this quiz."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {addable.map((item) => (
                <li
                  key={item.id}
                  className="bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {item.title}
                  </span>
                  <Badge variant="outline" className="text-muted-foreground shrink-0 rounded-full text-[11px]">
                    {customItemShortLabel(item.kind)}
                  </Badge>
                  <SmallButton
                    onClick={() =>
                      addPicked({ id: item.id, title: item.title, kind: item.kind })
                    }
                  >
                    Add
                  </SmallButton>
                </li>
              ))}
            </ul>
          )}
        </Fieldset>
      ) : null}

      <ErrorNotice message={formError} />
      {savedUrl ? (
        <SharedLinkPanel url={savedUrl} editable={editingId !== null} />
      ) : null}

      <div className="flex items-center gap-3">
        <PrimaryButton onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : editingId ? "Save changes" : "Save & get link"}
        </PrimaryButton>
      </div>
    </div>
  );
}
