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
  BuilderSplit,
  ErrorNotice,
  GuestNotice,
  PreviewPlaceholder,
  PrimaryButton,
  Section,
  SharedLinkPanel,
  SmallButton,
  TextAreaField,
  TextField,
} from "../_components/builderUi";
import { BuilderHeader } from "@/app/dashboard/_studio/BuilderHeader";
import {
  AlignLeft,
  ChevronDown,
  ChevronUp,
  Layers,
  LayoutGrid,
  Link2,
  Plus,
  Save,
  Trash2,
  Type,
} from "lucide-react";
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

  const chipCls =
    "flex-shrink-0 rounded-full px-[9px] py-[3px] text-[11px] font-semibold";
  const chipStyle = { background: "var(--chip-bg)", color: "var(--muted)" };

  return (
    <BuilderSplit
      preview={
        <PreviewPlaceholder note="The quiz set share page renders here. Save to get the shareable link." />
      }
    >
      <BuilderHeader
        title="New quiz set"
        lede="Pick the challenges and questions, put them in order, and share one link to the whole quiz."
      />
      <GuestNotice />

      <div className="ds-section flex flex-col gap-7">
        <TextField
          label="Title"
          icon={Type}
          value={title}
          onChange={(v) => {
            setTitle(v);
            setFormError(null);
          }}
          placeholder="e.g. SQL joins practice set"
          maxLength={120}
        />

        <TextAreaField
          label="Description"
          note="optional"
          icon={AlignLeft}
          value={description}
          onChange={(v) => setDescription(v)}
          rows={2}
          placeholder="Shown under the quiz title on the share page."
        />
      </div>

      <Section
        icon={Layers}
        title="Questions in this quiz"
        actions={
          <span
            className="inline-flex h-5 min-w-[22px] items-center justify-center rounded-full px-[7px] text-[11px] font-bold"
            style={chipStyle}
          >
            {picked.length}
          </span>
        }
      >
        {picked.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>
            Nothing here yet, add your own creations below or paste a /c/… link.
          </p>
        ) : (
          <ol className="m-0 flex list-none flex-col p-0">
            {picked.map((item, i) => (
              <li
                key={item.id}
                className="flex items-center gap-2.5 px-0.5 py-2.5"
                style={{ borderTop: "1px solid var(--divider)" }}
              >
                <span
                  className="w-5 flex-shrink-0 text-right text-[13px] font-semibold"
                  style={{ color: "var(--faint)" }}
                >
                  {i + 1}.
                </span>
                <span
                  className="ds-mono w-[84px] flex-shrink-0 truncate text-xs"
                  style={{ color: "var(--faint)" }}
                >
                  {item.id}
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-sm font-medium"
                  style={{ color: "var(--ink)" }}
                >
                  {item.title}
                </span>
                <span className={chipCls} style={chipStyle}>
                  {customItemShortLabel(item.kind)}
                </span>
                <span className="flex flex-shrink-0 gap-0.5">
                  <button
                    type="button"
                    aria-label="Move up"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="ds-icon-btn disabled:opacity-40"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    onClick={() => move(i, 1)}
                    disabled={i === picked.length - 1}
                    className="ds-icon-btn disabled:opacity-40"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() =>
                      setPicked((prev) => prev.filter((p) => p.id !== item.id))
                    }
                    className="ds-icon-btn ds-icon-btn-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section icon={Link2} title="Add by link or id">
        <div className="flex gap-2">
          <input
            type="text"
            value={linkInput}
            onChange={(e) => {
              setLinkInput(e.target.value);
              setFormError(null);
            }}
            placeholder="https://…/c/abcd1234efgh5678 or the 16-character id"
            className="ds-input ds-mono flex-1"
          />
          <button
            type="button"
            onClick={onAddByLink}
            disabled={resolving || !linkInput.trim()}
            className="flex h-[38px] flex-shrink-0 items-center gap-1.5 rounded-[7px] border-none px-3.5 text-[13px] font-semibold transition-colors hover:bg-[var(--chip-hover)] disabled:opacity-50"
            style={{ background: "var(--chip-bg)", color: "var(--ink)" }}
          >
            <Plus size={12} />
            {resolving ? "Looking up…" : "Add"}
          </button>
        </div>
      </Section>

      {session ? (
        <Section icon={LayoutGrid} title="Your creations">
          {mine === null ? (
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>
              Loading…
            </p>
          ) : addable.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>
              {mine.length === 0
                ? "You haven't created any challenges or questions yet."
                : "All of your creations are already in this quiz."}
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {addable.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2.5 px-0.5 py-2.5"
                  style={{ borderTop: "1px solid var(--divider)" }}
                >
                  <span
                    className="ds-mono w-[84px] flex-shrink-0 truncate text-xs"
                    style={{ color: "var(--faint)" }}
                  >
                    {item.id}
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate text-sm"
                    style={{ color: "var(--ink)" }}
                  >
                    {item.title}
                  </span>
                  <span className={chipCls} style={chipStyle}>
                    {customItemShortLabel(item.kind)}
                  </span>
                  <SmallButton
                    onClick={() =>
                      addPicked({ id: item.id, title: item.title, kind: item.kind })
                    }
                  >
                    <Plus size={12} />
                    Add
                  </SmallButton>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      <div className="mt-7 flex flex-col gap-5">
        <ErrorNotice message={formError} />
        {savedUrl ? (
          <SharedLinkPanel url={savedUrl} editable={editingId !== null} />
        ) : null}

        <div className="flex items-center gap-2.5">
          <PrimaryButton onClick={onSave} disabled={saving}>
            <Save size={14} />
            {saving ? "Saving…" : editingId ? "Save changes" : "Save & get link"}
          </PrimaryButton>
        </div>
      </div>
    </BuilderSplit>
  );
}
