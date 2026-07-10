"use client";

/**
 * Builder for a custom multiple-choice question. Structured fields
 * (question, choices, explanations) are serialized to the Markdown format
 * `<MultipleChoiceQuestion>` renders (lib/custom-content/mcq.ts), with a
 * live preview of the real component alongside the form.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import CustomItemRenderer from "@/app/_components/customContent/CustomItemRenderer";
import { serializeMcqMarkdown, mcqDraftFromMarkdown, type McqDraftChoice } from "@/lib/custom-content/mcq";
import { validateItemPayload } from "@/lib/custom-content/schema";
import type { McqPayload } from "@/lib/custom-content/types";
import { getItem } from "../_components/api";
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
import { useSaveItem } from "../_components/useSaveItem";

const EMPTY_CHOICE: McqDraftChoice = { text: "", correct: false, explanation: "" };

const MARKDOWN_PLACEHOLDER = `Which tool is commonly used for dashboards?

- Microsoft Word
  > Word is primarily used for documents.
- [o] Tableau
  > Tableau is built for interactive dashboards.
- Notepad

Visualization tools turn raw data into interactive charts.`;

export default function McqBuilder() {
  const params = useSearchParams();
  const editId = params.get("edit");

  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [choices, setChoices] = useState<McqDraftChoice[]>([
    { ...EMPTY_CHOICE, correct: true },
    { ...EMPTY_CHOICE },
    { ...EMPTY_CHOICE },
  ]);
  const [explanation, setExplanation] = useState("");
  // "form" edits structured fields; "markdown" edits the raw source in
  // the site's internal MCQ syntax (parseQuestion.ts). Both produce the
  // same stored markdown, and switching modes converts in place.
  const [mode, setMode] = useState<"form" | "markdown">("form");
  const [markdownDraft, setMarkdownDraft] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const saveState = useSaveItem();
  const { beginEdit } = saveState;

  // Edit prefill: fetch the stored payload and rebuild the structured
  // draft from its markdown.
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    getItem(editId)
      .then((item) => {
        if (cancelled) return;
        if (item.kind !== "mcq" || item.payload.kind !== "mcq") {
          setLoadError("That link isn't a multiple-choice question.");
          return;
        }
        if (!item.owned) {
          setLoadError(
            "Only the creator can edit this question. You can still view it, or build your own copy from scratch.",
          );
          return;
        }
        const draft = mcqDraftFromMarkdown(item.payload.markdown);
        setTitle(item.title);
        setQuestion(draft.question);
        setChoices(
          draft.choices.length > 0
            ? draft.choices
            : [{ ...EMPTY_CHOICE, correct: true }, { ...EMPTY_CHOICE }],
        );
        setExplanation(draft.explanation);
        beginEdit(editId);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load that question, the link may have expired.");
      });
    return () => {
      cancelled = true;
    };
  }, [editId, beginEdit]);

  const markdown = useMemo(
    () =>
      mode === "markdown"
        ? markdownDraft
        : serializeMcqMarkdown({ question, choices, explanation }),
    [mode, markdownDraft, question, choices, explanation],
  );

  const previewReady =
    mode === "markdown"
      ? markdownDraft.trim().length > 0
      : question.trim().length > 0 &&
        choices.filter((c) => c.text.trim().length > 0).length >= 2;

  // Mode switches convert the current draft in place: form → markdown
  // serializes, markdown → form re-parses through the same parser the
  // renderer uses, so what the form shows is exactly what the source
  // means.
  const switchMode = (next: "form" | "markdown") => {
    if (next === mode) return;
    saveState.clearError();
    setFormError(null);
    if (next === "markdown") {
      setMarkdownDraft(
        serializeMcqMarkdown({
          question,
          choices: choices.filter((c) => c.text.trim().length > 0),
          explanation,
        }),
      );
    } else {
      const draft = mcqDraftFromMarkdown(markdownDraft);
      setQuestion(draft.question);
      setChoices(
        draft.choices.length > 0
          ? draft.choices
          : [{ ...EMPTY_CHOICE, correct: true }, { ...EMPTY_CHOICE }],
      );
      setExplanation(draft.explanation);
    }
    setMode(next);
  };

  const updateChoice = (i: number, patch: Partial<McqDraftChoice>) => {
    saveState.clearError();
    setChoices((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  };

  const markCorrect = (i: number) => {
    saveState.clearError();
    setChoices((prev) => prev.map((c, j) => ({ ...c, correct: j === i })));
  };

  const onSave = async () => {
    setFormError(null);
    const source =
      mode === "markdown"
        ? markdownDraft
        : serializeMcqMarkdown({
            question,
            choices: choices.filter((c) => c.text.trim().length > 0),
            explanation,
          });
    const payload: McqPayload = { kind: "mcq", markdown: source };
    const check = validateItemPayload("mcq", payload);
    if (!check.ok) {
      setFormError(check.message);
      return;
    }
    await saveState.save("mcq", title || "Untitled question", check.payload);
  };

  if (loadError) {
    return <ErrorNotice message={loadError} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <GuestNotice />

      <TextField
        label="Title"
        value={title}
        onChange={(v) => {
          setTitle(v);
          saveState.clearError();
        }}
        placeholder="e.g. Pandas groupby basics"
        maxLength={120}
        hint="Shown on the share page and in quiz sets."
      />

      <div
        role="tablist"
        aria-label="Authoring mode"
        className="flex w-fit items-center gap-1 rounded-lg border border-[var(--ds-gray-200)] p-1 dark:border-white/10"
      >
        {(["form", "markdown"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              mode === m
                ? "bg-[var(--ds-green-600)] text-white"
                : "text-[var(--ds-gray-600)] hover:bg-[var(--ds-gray-50)] dark:text-[var(--ds-gray-300)] dark:hover:bg-white/5"
            }`}
          >
            {m === "form" ? "Form" : "Markdown"}
          </button>
        ))}
      </div>

      {mode === "markdown" ? (
        <TextAreaField
          label="Question source"
          value={markdownDraft}
          onChange={(v) => {
            setMarkdownDraft(v);
            saveState.clearError();
            setFormError(null);
          }}
          rows={14}
          mono
          placeholder={MARKDOWN_PLACEHOLDER}
          hint={
            "The site's MCQ syntax: question body first, then one choice per `- ` line with `[o]` marking the correct one, indented `>` lines as per-choice explanations, and anything after the choices as the overall explanation. Markdown, fenced code, and KaTeX math all work."
          }
        />
      ) : (
        <>
        <TextAreaField
          label="Question"
          value={question}
          onChange={(v) => {
            setQuestion(v);
            saveState.clearError();
          }}
          rows={4}
          placeholder={"Which tool is commonly used for dashboards?\n\nMarkdown, `code`, and $math$ all work here."}
          hint="Markdown supported: paragraphs, lists, fenced code blocks, and KaTeX math."
        />
  
        <Fieldset
          legend="Choices"
          actions={
            <SmallButton
              onClick={() => setChoices((prev) => [...prev, { ...EMPTY_CHOICE }])}
              disabled={choices.length >= 8}
            >
              + Add choice
            </SmallButton>
          }
        >
          {choices.map((choice, i) => (
            <div
              key={i}
              className="rounded-lg border border-[var(--ds-gray-200)] p-3 dark:border-white/10"
            >
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-200)]">
                  <input
                    type="radio"
                    name="correct-choice"
                    checked={choice.correct}
                    onChange={() => markCorrect(i)}
                    className="accent-[var(--ds-green-600)]"
                  />
                  Correct answer
                </label>
                <SmallButton
                  tone="danger"
                  onClick={() =>
                    setChoices((prev) => prev.filter((_, j) => j !== i))
                  }
                  disabled={choices.length <= 2}
                >
                  Remove
                </SmallButton>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                <TextAreaField
                  label={`Choice ${i + 1}`}
                  value={choice.text}
                  onChange={(v) => updateChoice(i, { text: v })}
                  rows={2}
                  placeholder="Choice text (Markdown works)"
                />
                <TextAreaField
                  label="Explanation (optional)"
                  value={choice.explanation}
                  onChange={(v) => updateChoice(i, { explanation: v })}
                  rows={2}
                  placeholder="Shown after submitting. Write a neutral statement, it's shown to everyone."
                />
              </div>
            </div>
          ))}
        </Fieldset>
  
        <TextAreaField
          label="Overall explanation (optional)"
          value={explanation}
          onChange={(v) => {
            setExplanation(v);
            saveState.clearError();
          }}
          rows={3}
          placeholder="Shown under the question after any answer is submitted."
        />
        </>
      )}

      <ErrorNotice message={formError ?? saveState.error} />
      {saveState.savedUrl ? (
        <SharedLinkPanel
          url={saveState.savedUrl}
          editable={saveState.editingId !== null}
        />
      ) : null}

      <div className="flex items-center gap-3">
        <PrimaryButton onClick={onSave} disabled={saveState.saving}>
          {saveState.saving
            ? "Saving…"
            : saveState.editingId
              ? "Save changes"
              : "Save & get link"}
        </PrimaryButton>
      </div>

      {previewReady ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
            Live preview
          </h2>
          {/* Remount on content change so a submitted preview resets. */}
          <div key={markdown}>
            <CustomItemRenderer
              title={title || "Untitled question"}
              payload={{ kind: "mcq", markdown }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
