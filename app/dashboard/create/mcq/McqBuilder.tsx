"use client";

/**
 * Builder for a custom multiple-choice question. Structured fields
 * (question, choices, explanations) are serialized to the Markdown format
 * `<MultipleChoiceQuestion>` renders (lib/custom-content/mcq.ts), with a
 * live preview of the real component alongside the form.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import CustomItemRenderer from "@/app/_components/customContent/CustomItemRendererLazy";
import { serializeMcqMarkdown, mcqDraftFromMarkdown, type McqDraftChoice } from "@/lib/custom-content/mcq";
import { validateItemPayload } from "@/lib/custom-content/schema";
import type { McqPayload } from "@/lib/custom-content/types";
import { getItem } from "../_components/api";
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
import { CircleHelp, Info, List, Plus, Save, Type } from "lucide-react";
import { useSaveItem } from "../_components/useSaveItem";
import { useRegisterBuilderDraft } from "@/app/dashboard/_studio/StudioAiContext";
import type { DraftResult } from "@/lib/ai/draft";

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

  // "Fill with AI": drop a drafted question into the structured form fields
  // (form mode, so the choices/explanations are editable straight away).
  useRegisterBuilderDraft("mcq", (draft: DraftResult) => {
    if (draft.kind !== "mcq") return;
    saveState.clearError();
    setFormError(null);
    setMode("form");
    setTitle(draft.title);
    setQuestion(draft.question);
    setChoices(
      draft.choices.length >= 2
        ? draft.choices.map((c) => ({
            text: c.text,
            correct: c.correct,
            explanation: c.explanation,
          }))
        : [{ ...EMPTY_CHOICE, correct: true }, { ...EMPTY_CHOICE }],
    );
    setExplanation(draft.explanation);
  });

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

  // The live-preview column renders the real question card and updates as you
  // type (markdown serialization is cheap). Remount on content change so a
  // submitted preview resets.
  const previewColumn = previewReady ? (
    <div key={markdown}>
      <CustomItemRenderer
        title={title || "Untitled question"}
        payload={{ kind: "mcq", markdown }}
      />
    </div>
  ) : (
    <PreviewPlaceholder note="The learner-facing question renders here as you type. Add a question and at least two choices." />
  );

  return (
    <BuilderSplit preview={previewColumn}>
      <BuilderHeader
        title="New multiple-choice question"
        lede="Write the question and choices, mark the correct answer, and add feedback."
        aiPlaceholder="Describe the question and AI fills every field below"
      />
      <GuestNotice />

      <div className="ds-section flex flex-col gap-7">
        <TextField
          label="Title"
          note="shown on the share page and in quiz sets"
          icon={Type}
          value={title}
          onChange={(v) => {
            setTitle(v);
            saveState.clearError();
          }}
          placeholder="e.g. Pandas groupby basics"
          maxLength={120}
        />

        <div
          role="tablist"
          aria-label="Authoring mode"
          className="flex w-fit items-center gap-1 rounded-lg p-1"
          style={{ background: "var(--panel)" }}
        >
          {(["form", "markdown"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className="rounded-md px-3 py-1 text-xs font-semibold transition-colors"
              style={
                mode === m
                  ? {
                      background: "var(--input)",
                      color: "var(--ink)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                    }
                  : { color: "var(--muted)" }
              }
            >
              {m === "form" ? "Form" : "Markdown"}
            </button>
          ))}
        </div>

        {mode === "markdown" ? (
          <TextAreaField
            label="Question source"
            icon={CircleHelp}
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
          <TextAreaField
            label="Question"
            icon={CircleHelp}
            value={question}
            onChange={(v) => {
              setQuestion(v);
              saveState.clearError();
            }}
            rows={3}
            placeholder={"Which tool is commonly used for dashboards?\n\nMarkdown, `code`, and $math$ all work here."}
            hint="Markdown supported: paragraphs, lists, fenced code blocks, and KaTeX math."
          />
        )}
      </div>

      {mode === "form" ? (
        <>
          <Section
            icon={List}
            title="Choices"
            actions={
              <SmallButton
                onClick={() => setChoices((prev) => [...prev, { ...EMPTY_CHOICE }])}
                disabled={choices.length >= 8}
              >
                <Plus size={12} />
                Add choice
              </SmallButton>
            }
          >
            {choices.map((choice, i) => (
              <div key={i} className="flex flex-col gap-3.5">
                <div className="flex items-center gap-2">
                  <label
                    role="radio"
                    aria-checked={choice.correct}
                    onClick={() => markCorrect(i)}
                    className="flex cursor-pointer items-center gap-[7px] text-[13px] font-medium"
                    style={{ color: "var(--text)" }}
                  >
                    <span
                      className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition-colors"
                      style={{
                        background: choice.correct
                          ? "var(--green-btn)"
                          : "var(--chip-bg)",
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: choice.correct ? "#ffffff" : "transparent",
                        }}
                      />
                    </span>
                    Choice {i + 1}
                    {choice.correct ? (
                      <span
                        className="rounded-full px-[7px] py-0.5 text-[10px] font-bold uppercase tracking-[0.05em]"
                        style={{
                          color: "var(--green-text)",
                          background: "var(--green-soft)",
                        }}
                      >
                        Correct
                      </span>
                    ) : null}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setChoices((prev) => prev.filter((_, j) => j !== i))
                    }
                    disabled={choices.length <= 2}
                    className="ds-btn-danger-chip ml-auto"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  rows={1}
                  value={choice.text}
                  onChange={(e) => updateChoice(i, { text: e.target.value })}
                  placeholder="Choice text (Markdown works)"
                  className="ds-textarea"
                  style={{ minHeight: 40 }}
                />
                <textarea
                  rows={1}
                  value={choice.explanation}
                  onChange={(e) => updateChoice(i, { explanation: e.target.value })}
                  placeholder="Explanation (optional), shown after submitting"
                  className="ds-textarea"
                  style={{ minHeight: 40, fontSize: 13, color: "var(--muted)" }}
                />
              </div>
            ))}
          </Section>

          <Section
            icon={Info}
            title="Overall explanation"
            note="optional, shown after any answer"
          >
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => {
                setExplanation(e.target.value);
                saveState.clearError();
              }}
              placeholder="Shown under the question after any answer is submitted."
              className="ds-textarea"
              style={{ minHeight: 56 }}
            />
          </Section>
        </>
      ) : null}

      <div className="mt-7 flex flex-col gap-5">
        <ErrorNotice message={formError ?? saveState.error} />
        {saveState.savedUrl ? (
          <SharedLinkPanel
            url={saveState.savedUrl}
            editable={saveState.editingId !== null}
          />
        ) : null}

        <div className="flex items-center gap-2.5">
          <PrimaryButton onClick={onSave} disabled={saveState.saving}>
            <Save size={14} />
            {saveState.saving
              ? "Saving…"
              : saveState.editingId
                ? "Save changes"
                : "Save & get link"}
          </PrimaryButton>
        </div>
      </div>
    </BuilderSplit>
  );
}
