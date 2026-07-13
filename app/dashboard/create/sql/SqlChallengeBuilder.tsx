"use client";

/**
 * Builder for a custom SQL challenge. Produces a SqlChallengePayload
 * (lib/custom-content/types.ts) rendered by the same `<SqlChallengeCard>`
 * the courses use; the preview pane mounts the real card (booting the
 * in-browser SQL engine), so it's rendered on demand rather than live.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CustomItemRenderer from "@/app/_components/customContent/CustomItemRendererLazy";
import { validateItemPayload } from "@/lib/custom-content/schema";
import { sqlDialectLabel } from "@/lib/custom-content/labels";
import type {
  CustomSqlDialect,
  CustomSqlTest,
  SqlChallengePayload,
} from "@/lib/custom-content/types";
import { getItem } from "../_components/api";
import {
  getChallengeHandle,
  verifySolutionViaCard,
} from "../_components/solutionVerify";
import {
  BuilderSplit,
  CheckboxField,
  ErrorNotice,
  GuestNotice,
  ItemHeader,
  PreviewPlaceholder,
  PrimaryButton,
  SecondaryButton,
  Section,
  SelectField,
  SharedLinkPanel,
  SmallButton,
  TextAreaField,
  TextField,
} from "../_components/builderUi";
import { BuilderHeader } from "@/app/dashboard/_studio/BuilderHeader";
import {
  AlignLeft,
  CircleCheck,
  Code,
  Database,
  Eye,
  FlaskConical,
  Lightbulb,
  Plus,
  Tag,
  Type,
  WholeWord,
  Wrench,
} from "lucide-react";
import { useSaveItem } from "../_components/useSaveItem";
import { useRegisterBuilderDraft } from "@/app/dashboard/_studio/StudioAiContext";
import type { DraftResult } from "@/lib/ai/draft";

type SqlAssertionKind =
  | "matchesSolution"
  | "expectedRowCount"
  | "rowCountAtLeast"
  | "expectedColumns"
  | "expectedColumnsInclude";

interface TestDraft {
  name: string;
  description: string;
  assertion: SqlAssertionKind;
  /** Number for the row-count assertions, comma-separated column names
   *  for the column assertions; unused for matchesSolution. */
  value: string;
  /** Row order must match (matchesSolution only). */
  ordered: boolean;
}

const NEW_TEST: TestDraft = {
  name: "",
  description: "",
  assertion: "matchesSolution",
  value: "",
  ordered: false,
};

const ASSERTION_OPTIONS: { value: SqlAssertionKind; label: string }[] = [
  { value: "matchesSolution", label: "Result matches the solution query" },
  { value: "expectedRowCount", label: "Result has exactly N rows" },
  { value: "rowCountAtLeast", label: "Result has at least N rows" },
  { value: "expectedColumns", label: "Result has exactly these columns (in order)" },
  { value: "expectedColumnsInclude", label: "Result includes these columns" },
];

function draftToTest(draft: TestDraft, index: number): CustomSqlTest | string {
  const test: CustomSqlTest = {
    id: `t${index + 1}`,
    name: draft.name.trim() || `Test ${index + 1}`,
  };
  if (draft.description.trim()) test.description = draft.description.trim();
  switch (draft.assertion) {
    case "matchesSolution":
      test.matchesSolution = true;
      if (draft.ordered) test.ordered = true;
      break;
    case "expectedRowCount":
    case "rowCountAtLeast": {
      const n = Number(draft.value.trim());
      if (!Number.isInteger(n) || n < 0) {
        return `Test ${index + 1}: enter a non-negative whole number of rows.`;
      }
      test[draft.assertion] = n;
      break;
    }
    case "expectedColumns":
    case "expectedColumnsInclude": {
      const cols = draft.value
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cols.length === 0) {
        return `Test ${index + 1}: list at least one column name.`;
      }
      test[draft.assertion] = cols;
      break;
    }
  }
  return test;
}

function testToDraft(test: CustomSqlTest): TestDraft {
  const draft: TestDraft = {
    ...NEW_TEST,
    name: test.name,
    description: test.description ?? "",
    ordered: !!test.ordered,
  };
  if (test.matchesSolution) {
    draft.assertion = "matchesSolution";
  } else if (test.expectedRowCount !== undefined) {
    draft.assertion = "expectedRowCount";
    draft.value = String(test.expectedRowCount);
  } else if (test.rowCountAtLeast !== undefined) {
    draft.assertion = "rowCountAtLeast";
    draft.value = String(test.rowCountAtLeast);
  } else if (test.expectedColumns) {
    draft.assertion = "expectedColumns";
    draft.value = test.expectedColumns.join(", ");
  } else if (test.expectedColumnsInclude) {
    draft.assertion = "expectedColumnsInclude";
    draft.value = test.expectedColumnsInclude.join(", ");
  }
  return draft;
}

export default function SqlChallengeBuilder() {
  const params = useSearchParams();
  const editId = params.get("edit");

  const [title, setTitle] = useState("");
  const [dialect, setDialect] = useState<CustomSqlDialect>("sqlite");
  const [instructions, setInstructions] = useState("");
  const [initSql, setInitSql] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [solutionSql, setSolutionSql] = useState("");
  const [tests, setTests] = useState<TestDraft[]>([{ ...NEW_TEST }]);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    payload: SqlChallengePayload;
    title: string;
    version: number;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const saveState = useSaveItem();
  const { beginEdit } = saveState;

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    getItem(editId)
      .then((item) => {
        if (cancelled) return;
        if (item.kind !== "sql" || item.payload.kind !== "sql") {
          setLoadError("That link isn't a SQL challenge.");
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
        setDialect(p.dialect);
        setInstructions(p.instructions);
        setInitSql(p.initSql ?? "");
        setStarterCode(p.starterCode);
        setSolutionSql(p.solutionSql ?? "");
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

  // "Fill with AI": map a drafted SQL challenge onto the form. The drafted
  // solution query is verified against the drafted checks on save.
  useRegisterBuilderDraft("sql", (draft: DraftResult) => {
    if (draft.kind !== "sql") return;
    saveState.clearError();
    setFormError(null);
    setTitle(draft.title);
    setDialect(draft.dialect);
    setInstructions(draft.instructions);
    setInitSql(draft.setupSql);
    setStarterCode(draft.starterSql);
    setSolutionSql(draft.solutionSql);
    setTests(
      draft.tests.length > 0
        ? draft.tests.map((t) => ({
            ...NEW_TEST,
            name: t.name,
            assertion: t.check,
            value: t.value,
          }))
        : [{ ...NEW_TEST }],
    );
  });

  const buildPayload = (): SqlChallengePayload | string => {
    const builtTests: CustomSqlTest[] = [];
    for (let i = 0; i < tests.length; i++) {
      const t = draftToTest(tests[i], i);
      if (typeof t === "string") return t;
      builtTests.push(t);
    }
    const payload: SqlChallengePayload = {
      kind: "sql",
      dialect,
      instructions,
      starterCode,
      tests: builtTests,
    };
    if (initSql.trim()) payload.initSql = initSql;
    if (solutionSql.trim()) payload.solutionSql = solutionSql;
    return payload;
  };

  const validate = (): SqlChallengePayload | null => {
    const built = buildPayload();
    if (typeof built === "string") {
      setFormError(built);
      return null;
    }
    const check = validateItemPayload("sql", built);
    if (!check.ok) {
      setFormError(check.message);
      return null;
    }
    return check.payload as SqlChallengePayload;
  };

  const onPreview = () => {
    setFormError(null);
    const payload = validate();
    if (!payload) return;
    setPreview((prev) => ({
      payload,
      title: title || "Untitled SQL challenge",
      version: (prev?.version ?? 0) + 1,
    }));
  };

  // Publishing is gated on the solution SQL passing the tests: the
  // preview card is (re)mounted with the payload being saved, the solution
  // is loaded through the card's driver (the single editor surface is one
  // virtual "query.sql" file), and the save only proceeds on a green
  // banner.
  const onSave = async () => {
    setFormError(null);
    const payload = validate();
    if (!payload) return;
    const cardTitle = title.trim() || "Untitled SQL challenge";
    const key = `${payload.dialect}::${cardTitle}`;
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
        files: [{ filename: "query.sql", source: payload.solutionSql ?? "" }],
      });
      if (!outcome.ok) {
        setFormError(outcome.detail);
        return;
      }
      await saveState.save("sql", cardTitle, payload);
    } finally {
      setVerifying(false);
    }
  };

  const updateTest = (i: number, patch: Partial<TestDraft>) => {
    saveState.clearError();
    setFormError(null);
    setTests((prev) => prev.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  };

  if (loadError) {
    return <ErrorNotice message={loadError} />;
  }

  // The live-preview column: the real learner-facing card once Preview (or a
  // verifying save) has mounted it, a pulsing placeholder until then. Keyed
  // remount: the SQL engine re-seeds with the new setup SQL.
  const previewColumn = preview ? (
    <div key={preview.version}>
      <CustomItemRenderer title={preview.title} payload={preview.payload} />
    </div>
  ) : (
    <PreviewPlaceholder note="The learner-facing SQL challenge renders here. Click Preview to load it with your fields." />
  );

  return (
    <BuilderSplit preview={previewColumn}>
      <BuilderHeader
        title="New SQL challenge"
        lede="Define the tables and seed data, write the task, and pick the checks. Recipients query a real database in their browser."
        aiPlaceholder="Describe the exercise and AI fills every field below"
      />
      <GuestNotice />

      <div className="ds-section flex flex-col gap-7">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
          <TextField
            label="Title"
            icon={Type}
            value={title}
            onChange={(v) => {
              setTitle(v);
              saveState.clearError();
            }}
            placeholder="e.g. Top customers by revenue"
            maxLength={120}
          />
          <SelectField
            label="Dialect"
            icon={Database}
            value={dialect}
            onChange={(v) => setDialect(v as CustomSqlDialect)}
            options={(["sqlite", "duckdb", "postgres"] as const).map((d) => ({
              value: d,
              label: sqlDialectLabel(d),
            }))}
          />
        </div>

        <TextAreaField
          label="Instructions"
          icon={AlignLeft}
          value={instructions}
          onChange={(v) => {
            setInstructions(v);
            saveState.clearError();
            setFormError(null);
          }}
          rows={3}
          placeholder="What should the learner's query return? Markdown supported."
          hint="Markdown supported: paragraphs, bullet lists, **bold**, and `inline code`."
        />
      </div>

      <Section icon={Database} title="Database & solution">
        <TextAreaField
          label="Setup SQL"
          note="runs once, create tables and seed data"
          icon={Wrench}
          value={initSql}
          onChange={(v) => setInitSql(v)}
          rows={6}
          mono
          placeholder={"CREATE TABLE orders (id INTEGER, amount REAL);\nINSERT INTO orders VALUES (1, 19.99), (2, 5.00);"}
        />
        <TextAreaField
          label="Starter SQL"
          note="optional, pre-filled in the learner's editor"
          icon={Code}
          value={starterCode}
          onChange={(v) => setStarterCode(v)}
          rows={2}
          mono
          placeholder={"-- Write a query that…\nSELECT "}
        />
        <TextAreaField
          label="Solution SQL"
          icon={Lightbulb}
          value={solutionSql}
          onChange={(v) => setSolutionSql(v)}
          rows={3}
          mono
          placeholder="SELECT customer, SUM(amount) AS total FROM orders GROUP BY customer ORDER BY total DESC;"
          hint={
            'Required. Saving runs this solution against your tests, the challenge only publishes when it passes. Also enables the "Show Solution" button and the "matches the solution" check.'
          }
        />
      </Section>

      <Section
        icon={FlaskConical}
        title="Tests"
        actions={
          <SmallButton
            onClick={() => setTests((prev) => [...prev, { ...NEW_TEST }])}
            disabled={tests.length >= 20}
          >
            <Plus size={12} />
            Add test
          </SmallButton>
        }
      >
        {tests.map((test, i) => (
          <div key={i} className="flex flex-col gap-[22px]">
            <ItemHeader
              label={`Test ${i + 1}`}
              onRemove={() => setTests((prev) => prev.filter((_, j) => j !== i))}
              removeDisabled={tests.length <= 1}
            />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              <TextField
                label="Name"
                icon={Tag}
                value={test.name}
                onChange={(v) => updateTest(i, { name: v })}
                placeholder={`e.g. Returns one row per customer`}
                maxLength={200}
              />
              <SelectField
                label="Check"
                icon={CircleCheck}
                value={test.assertion}
                onChange={(v) =>
                  updateTest(i, {
                    assertion: v as SqlAssertionKind,
                    value: "",
                  })
                }
                options={ASSERTION_OPTIONS.filter(
                  (o) => o.value !== "matchesSolution" || solutionSql.trim().length > 0,
                )}
                hint={
                  solutionSql.trim().length === 0
                    ? 'Add a solution SQL above to unlock the "matches the solution" check.'
                    : undefined
                }
              />
            </div>
            {test.assertion === "matchesSolution" ? (
              <CheckboxField
                label="Row order must match too"
                checked={test.ordered}
                onChange={(v) => updateTest(i, { ordered: v })}
              />
            ) : (
              <TextField
                label={
                  test.assertion === "expectedRowCount" ||
                  test.assertion === "rowCountAtLeast"
                    ? "Row count"
                    : "Column names (comma-separated)"
                }
                icon={WholeWord}
                value={test.value}
                onChange={(v) => updateTest(i, { value: v })}
                placeholder={
                  test.assertion === "expectedRowCount" ||
                  test.assertion === "rowCountAtLeast"
                    ? "e.g. 5"
                    : "e.g. customer, total"
                }
              />
            )}
          </div>
        ))}
      </Section>

      <div className="mt-7 flex flex-col gap-5">
        <ErrorNotice message={formError ?? saveState.error} />
        {saveState.savedUrl ? (
          <SharedLinkPanel
            url={saveState.savedUrl}
            editable={saveState.editingId !== null}
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2.5">
          <PrimaryButton onClick={onSave} disabled={saveState.saving || verifying}>
            <CircleCheck size={14} />
            {verifying
              ? "Verifying solution…"
              : saveState.saving
                ? "Saving…"
                : saveState.editingId
                  ? "Verify & save changes"
                  : "Verify & get link"}
          </PrimaryButton>
          <SecondaryButton onClick={onPreview} disabled={verifying}>
            <Eye size={14} />
            {preview ? "Refresh preview" : "Preview"}
          </SecondaryButton>
          {verifying ? (
            <span
              role="status"
              className="ds-pulse text-[13px]"
              style={{ color: "var(--muted)" }}
            >
              Running your solution against the tests, the first run can take a
              moment while the database engine loads…
            </span>
          ) : null}
        </div>
      </div>
    </BuilderSplit>
  );
}
