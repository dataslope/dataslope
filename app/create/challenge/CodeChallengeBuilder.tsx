"use client";

/**
 * Builder for a custom code challenge (Python, JavaScript, SQL-free
 * languages, …). Produces a CodeChallengePayload rendered by the same
 * `<ChallengeCard>` the courses use. The preview mounts the real card,
 * which boots the language's WASM runtime, so it renders on demand
 * (Preview button) rather than on every keystroke.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CustomItemRenderer from "@/app/_components/customContent/CustomItemRendererLazy";
import {
  NATIVE_TEST_ADAPTERS,
  validateItemPayload,
} from "@/lib/custom-content/schema";
import { adapterLabel } from "@/lib/custom-content/labels";
import type {
  CodeChallengePayload,
  CustomChallengeFile,
  CustomCodeTest,
  CustomStdoutExpect,
} from "@/lib/custom-content/types";
import { getItem } from "../_components/api";
import {
  getChallengeHandle,
  verifySolutionViaCard,
} from "../_components/solutionVerify";
import {
  ErrorNotice,
  Fieldset,
  GuestNotice,
  PrimaryButton,
  SecondaryButton,
  SelectField,
  SharedLinkPanel,
  SmallButton,
  TextAreaField,
  TextField,
} from "../_components/builderUi";
import { useSaveItem } from "../_components/useSaveItem";

const ADAPTER_OPTIONS = [
  "python",
  "javascript",
  "typescript",
  "r",
  "php",
  "c",
  "cpp",
  "java",
  "csharp",
  "web",
  "react",
] as const;

const DEFAULT_FILENAMES: Record<string, string> = {
  python: "main.py",
  javascript: "main.js",
  typescript: "main.ts",
  r: "main.R",
  php: "main.php",
  c: "main.c",
  cpp: "main.cpp",
  java: "Main.java",
  csharp: "Program.cs",
  web: "index.html",
  react: "App.jsx",
};

type StdoutCheckKind = "stdoutEquals" | "stdoutContains" | "stdoutMatches";

interface FileDraft {
  filename: string;
  initCode: string;
  starterCode: string;
  solutionCode: string;
}

interface TestDraft {
  name: string;
  description: string;
  mode: "code" | "stdout";
  code: string;
  stdoutKind: StdoutCheckKind;
  stdoutValue: string;
  noStderr: boolean;
}

const NEW_TEST: TestDraft = {
  name: "",
  description: "",
  mode: "code",
  code: "",
  stdoutKind: "stdoutContains",
  stdoutValue: "",
  noStderr: false,
};

function newFile(adapter: string): FileDraft {
  return {
    filename: DEFAULT_FILENAMES[adapter] ?? "main.txt",
    initCode: "",
    starterCode: "",
    solutionCode: "",
  };
}

function testToDraft(test: CustomCodeTest): TestDraft {
  const draft: TestDraft = {
    ...NEW_TEST,
    name: test.name,
    description: test.description ?? "",
  };
  if (test.code !== undefined) {
    draft.mode = "code";
    draft.code = test.code;
  } else if (test.expect) {
    draft.mode = "stdout";
    draft.noStderr = !!test.expect.noStderr;
    if (test.expect.stdoutEquals !== undefined) {
      draft.stdoutKind = "stdoutEquals";
      draft.stdoutValue = test.expect.stdoutEquals;
    } else if (test.expect.stdoutMatches !== undefined) {
      draft.stdoutKind = "stdoutMatches";
      draft.stdoutValue = test.expect.stdoutMatches;
    } else if (typeof test.expect.stdoutContains === "string") {
      draft.stdoutKind = "stdoutContains";
      draft.stdoutValue = test.expect.stdoutContains;
    }
  }
  return draft;
}

function draftToTest(draft: TestDraft, index: number): CustomCodeTest | string {
  const test: CustomCodeTest = {
    id: `t${index + 1}`,
    name: draft.name.trim() || `Test ${index + 1}`,
  };
  if (draft.description.trim()) test.description = draft.description.trim();
  if (draft.mode === "code") {
    if (!draft.code.trim()) {
      return `Test ${index + 1}: write the check code (assert/throw on failure).`;
    }
    test.code = draft.code;
    return test;
  }
  const expect: CustomStdoutExpect = {};
  if (draft.stdoutValue.trim().length > 0) {
    expect[draft.stdoutKind] = draft.stdoutValue;
  }
  if (draft.noStderr) expect.noStderr = true;
  if (Object.keys(expect).length === 0) {
    return `Test ${index + 1}: enter expected output or require empty stderr.`;
  }
  test.expect = expect;
  return test;
}

export default function CodeChallengeBuilder() {
  const params = useSearchParams();
  const editId = params.get("edit");

  const [title, setTitle] = useState("");
  const [adapter, setAdapter] = useState<string>("python");
  const [instructions, setInstructions] = useState("");
  const [files, setFiles] = useState<FileDraft[]>([newFile("python")]);
  const [tests, setTests] = useState<TestDraft[]>([{ ...NEW_TEST }]);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    payload: CodeChallengePayload;
    title: string;
    version: number;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const saveState = useSaveItem();
  const { beginEdit } = saveState;

  const nativeTests = NATIVE_TEST_ADAPTERS.includes(adapter);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    getItem(editId)
      .then((item) => {
        if (cancelled) return;
        if (item.kind !== "code" || item.payload.kind !== "code") {
          setLoadError("That link isn't a code challenge.");
          return;
        }
        if (!item.owned) {
          setLoadError(
            "Only the creator can edit this challenge. You can still view it, or build your own from scratch.",
          );
          return;
        }
        const p = item.payload;
        setTitle(item.title);
        setAdapter(p.adapter);
        setInstructions(p.instructions);
        setFiles(
          p.files.map((f) => ({
            filename: f.filename,
            initCode: f.initCode ?? "",
            starterCode: f.starterCode,
            solutionCode: f.solutionCode ?? "",
          })),
        );
        setTests(p.tests.length > 0 ? p.tests.map(testToDraft) : [{ ...NEW_TEST }]);
        beginEdit(editId);
      })
      .catch(() => {
        if (!cancelled)
          setLoadError("Couldn't load that challenge, the link may have expired.");
      });
    return () => {
      cancelled = true;
    };
  }, [editId, beginEdit]);

  const onAdapterChange = (next: string) => {
    saveState.clearError();
    setFormError(null);
    setAdapter(next);
    // Untouched single-file scaffolds follow the language's conventional
    // filename; anything the author already edited is left alone.
    setFiles((prev) =>
      prev.length === 1 &&
      prev[0].filename === (DEFAULT_FILENAMES[adapter] ?? "main.txt") &&
      !prev[0].starterCode &&
      !prev[0].initCode &&
      !prev[0].solutionCode
        ? [newFile(next)]
        : prev,
    );
    // Compiled languages can't inject per-test code; flip those tests to
    // stdout mode instead of failing at save time.
    if (!NATIVE_TEST_ADAPTERS.includes(next)) {
      setTests((prev) =>
        prev.map((t) => (t.mode === "code" ? { ...t, mode: "stdout" } : t)),
      );
    }
  };

  const buildPayload = (): CodeChallengePayload | string => {
    const builtTests: CustomCodeTest[] = [];
    for (let i = 0; i < tests.length; i++) {
      const t = draftToTest(tests[i], i);
      if (typeof t === "string") return t;
      builtTests.push(t);
    }
    const builtFiles: CustomChallengeFile[] = files.map((f) => {
      const out: CustomChallengeFile = {
        filename: f.filename.trim(),
        starterCode: f.starterCode,
      };
      if (f.initCode.trim()) out.initCode = f.initCode;
      if (f.solutionCode.trim()) out.solutionCode = f.solutionCode;
      return out;
    });
    return {
      kind: "code",
      adapter,
      instructions,
      files: builtFiles,
      tests: builtTests,
    };
  };

  const validate = (): CodeChallengePayload | null => {
    const built = buildPayload();
    if (typeof built === "string") {
      setFormError(built);
      return null;
    }
    const check = validateItemPayload("code", built);
    if (!check.ok) {
      setFormError(check.message);
      return null;
    }
    return check.payload as CodeChallengePayload;
  };

  const onPreview = () => {
    setFormError(null);
    const payload = validate();
    if (!payload) return;
    setPreview((prev) => ({
      payload,
      title: title || "Untitled challenge",
      version: (prev?.version ?? 0) + 1,
    }));
  };

  // Publishing is gated on the reference solution passing the tests: the
  // preview card is (re)mounted with the exact payload being saved, the
  // solution is loaded into its buffers through the card's imperative
  // driver, and the save only proceeds on a green banner.
  const onSave = async () => {
    setFormError(null);
    const payload = validate();
    if (!payload) return;
    const cardTitle = title.trim() || "Untitled challenge";
    const key = `${payload.adapter}::${cardTitle}`;
    const prevHandle = getChallengeHandle(key);
    setPreview((prev) => ({
      payload,
      title: cardTitle,
      version: (prev?.version ?? 0) + 1,
    }));
    setVerifying(true);
    try {
      const outcome = await verifySolutionViaCard({
        key,
        prevHandle,
        files: payload.files.map((f) => ({
          filename: f.filename,
          // Files without their own solution are scaffold the learner
          // doesn't modify; they run as their starter content.
          source: f.solutionCode ?? f.starterCode,
        })),
      });
      if (!outcome.ok) {
        setFormError(outcome.detail);
        return;
      }
      await saveState.save("code", cardTitle, payload);
    } finally {
      setVerifying(false);
    }
  };

  const updateFile = (i: number, patch: Partial<FileDraft>) => {
    saveState.clearError();
    setFormError(null);
    setFiles((prev) => prev.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  };

  const updateTest = (i: number, patch: Partial<TestDraft>) => {
    saveState.clearError();
    setFormError(null);
    setTests((prev) => prev.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  };

  if (loadError) {
    return <ErrorNotice message={loadError} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <GuestNotice />

      <div className="grid gap-6 sm:grid-cols-[1fr_200px]">
        <TextField
          label="Title"
          value={title}
          onChange={(v) => {
            setTitle(v);
            saveState.clearError();
          }}
          placeholder="e.g. Summarize sales by category"
          maxLength={120}
        />
        <SelectField
          label="Language"
          value={adapter}
          onChange={onAdapterChange}
          options={ADAPTER_OPTIONS.map((a) => ({
            value: a,
            label: adapterLabel(a),
          }))}
        />
      </div>

      <TextAreaField
        label="Instructions"
        value={instructions}
        onChange={(v) => {
          setInstructions(v);
          saveState.clearError();
          setFormError(null);
        }}
        rows={4}
        placeholder="What should the learner implement? Markdown supported."
        hint="Markdown supported: paragraphs, bullet lists, **bold**, and `inline code`."
      />

      <Fieldset
        legend="Files"
        actions={
          <SmallButton
            onClick={() =>
              setFiles((prev) => [
                ...prev,
                { ...newFile(adapter), filename: "" },
              ])
            }
            disabled={files.length >= 8}
          >
            + Add file
          </SmallButton>
        }
      >
        {files.map((file, i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--ds-gray-200)] p-3 dark:border-white/10"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-gray-400)]">
                File {i + 1}
                {i === 0 ? " · entry file, tests run against it" : ""}
              </span>
              <SmallButton
                tone="danger"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                disabled={files.length <= 1}
              >
                Remove
              </SmallButton>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              <TextField
                label="Filename"
                value={file.filename}
                onChange={(v) => updateFile(i, { filename: v })}
                placeholder={DEFAULT_FILENAMES[adapter] ?? "main.txt"}
              />
              <TextAreaField
                label="Setup code (optional, read-only for the learner)"
                value={file.initCode}
                onChange={(v) => updateFile(i, { initCode: v })}
                rows={4}
                mono
                placeholder={"# Runs before the learner's code on every run\nimport pandas as pd"}
              />
              <TextAreaField
                label="Starter code"
                value={file.starterCode}
                onChange={(v) => updateFile(i, { starterCode: v })}
                rows={6}
                mono
                placeholder="# Pre-filled in the learner's editor"
              />
              <TextAreaField
                label={i === 0 ? "Solution code" : "Solution code (optional)"}
                value={file.solutionCode}
                onChange={(v) => updateFile(i, { solutionCode: v })}
                rows={6}
                mono
                placeholder={'# Enables the "Show Solution" button'}
                hint={
                  i === 0
                    ? "Required. Saving runs this solution against your tests, the challenge only publishes when it passes."
                    : undefined
                }
              />
            </div>
          </div>
        ))}
      </Fieldset>

      <Fieldset
        legend="Tests (run on Check Answer)"
        actions={
          <SmallButton
            onClick={() =>
              setTests((prev) => [
                ...prev,
                { ...NEW_TEST, mode: nativeTests ? "code" : "stdout" },
              ])
            }
            disabled={tests.length >= 20}
          >
            + Add test
          </SmallButton>
        }
      >
        {tests.map((test, i) => (
          <div
            key={i}
            className="rounded-lg border border-[var(--ds-gray-200)] p-3 dark:border-white/10"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-gray-400)]">
                Test {i + 1}
              </span>
              <SmallButton
                tone="danger"
                onClick={() => setTests((prev) => prev.filter((_, j) => j !== i))}
                disabled={tests.length <= 1}
              >
                Remove
              </SmallButton>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              <TextField
                label="Name"
                value={test.name}
                onChange={(v) => updateTest(i, { name: v })}
                placeholder="e.g. `summary` has one row per category"
                maxLength={200}
              />
              <SelectField
                label="Check type"
                value={test.mode}
                onChange={(v) => updateTest(i, { mode: v as "code" | "stdout" })}
                options={[
                  ...(nativeTests
                    ? [{ value: "code", label: "Check code (assert on failure)" }]
                    : []),
                  { value: "stdout", label: "Expected output (stdout)" },
                ]}
                hint={
                  nativeTests
                    ? undefined
                    : `${adapterLabel(adapter)} challenges check the program's printed output.`
                }
              />
              {test.mode === "code" ? (
                <TextAreaField
                  label="Check code"
                  value={test.code}
                  onChange={(v) => updateTest(i, { code: v })}
                  rows={4}
                  mono
                  placeholder={"# Runs after the learner's code.\n# assert/throw on failure, stay silent on success.\nassert summary is not None"}
                />
              ) : (
                <>
                  <SelectField
                    label="Output check"
                    value={test.stdoutKind}
                    onChange={(v) =>
                      updateTest(i, { stdoutKind: v as StdoutCheckKind })
                    }
                    options={[
                      { value: "stdoutContains", label: "Output contains…" },
                      { value: "stdoutEquals", label: "Output equals exactly…" },
                      { value: "stdoutMatches", label: "Output matches regex…" },
                    ]}
                  />
                  <TextAreaField
                    label="Expected output"
                    value={test.stdoutValue}
                    onChange={(v) => updateTest(i, { stdoutValue: v })}
                    rows={3}
                    mono
                    placeholder="Hello, world!"
                  />
                  <label className="flex items-center gap-2 text-sm text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-200)]">
                    <input
                      type="checkbox"
                      checked={test.noStderr}
                      onChange={(e) => updateTest(i, { noStderr: e.target.checked })}
                      className="accent-[var(--ds-green-600)]"
                    />
                    Also require empty stderr (no warnings or errors)
                  </label>
                </>
              )}
            </div>
          </div>
        ))}
      </Fieldset>

      <ErrorNotice message={formError ?? saveState.error} />
      {saveState.savedUrl ? (
        <SharedLinkPanel
          url={saveState.savedUrl}
          editable={saveState.editingId !== null}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton onClick={onSave} disabled={saveState.saving || verifying}>
          {verifying
            ? "Verifying solution…"
            : saveState.saving
              ? "Saving…"
              : saveState.editingId
                ? "Verify & save changes"
                : "Verify & get link"}
        </PrimaryButton>
        <SecondaryButton onClick={onPreview} disabled={verifying}>
          {preview ? "Refresh preview" : "Preview"}
        </SecondaryButton>
        {verifying ? (
          <span
            role="status"
            className="text-sm text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]"
          >
            Running your solution against the tests below, the first run can
            take a moment while the language runtime loads…
          </span>
        ) : null}
      </div>

      {preview ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
            {verifying
              ? "Verifying, your solution is running in this card"
              : "Preview, exactly what visitors will see"}
          </h2>
          {/* Keyed remount so the card re-reads the edited files/tests
              (booting the language runtime again on Refresh). */}
          <div key={preview.version}>
            <CustomItemRenderer title={preview.title} payload={preview.payload} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
