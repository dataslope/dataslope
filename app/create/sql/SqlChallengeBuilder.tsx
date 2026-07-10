"use client";

/**
 * Builder for a custom SQL challenge. Produces a SqlChallengePayload
 * (lib/custom-content/types.ts) rendered by the same `<SqlChallengeCard>`
 * the courses use; the preview pane mounts the real card (booting the
 * in-browser SQL engine), so it's rendered on demand rather than live.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CustomItemRenderer from "@/app/_components/customContent/CustomItemRenderer";
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
          placeholder="e.g. Top customers by revenue"
          maxLength={120}
        />
        <SelectField
          label="Dialect"
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
        value={instructions}
        onChange={(v) => {
          setInstructions(v);
          saveState.clearError();
          setFormError(null);
        }}
        rows={4}
        placeholder="What should the learner's query return? Markdown supported."
        hint="Markdown supported: paragraphs, bullet lists, **bold**, and `inline code`."
      />

      <TextAreaField
        label="Setup SQL (optional)"
        value={initSql}
        onChange={(v) => setInitSql(v)}
        rows={8}
        mono
        placeholder={"CREATE TABLE orders (id INTEGER, amount REAL);\nINSERT INTO orders VALUES (1, 19.99), (2, 5.00);"}
        hint="Runs once before the learner's first query, create tables and seed data here."
      />

      <TextAreaField
        label="Starter SQL (optional)"
        value={starterCode}
        onChange={(v) => setStarterCode(v)}
        rows={3}
        mono
        placeholder={"-- Write a query that…\nSELECT "}
        hint="Pre-filled in the learner's editor."
      />

      <TextAreaField
        label="Solution SQL"
        value={solutionSql}
        onChange={(v) => setSolutionSql(v)}
        rows={4}
        mono
        placeholder="SELECT customer, SUM(amount) AS total FROM orders GROUP BY customer ORDER BY total DESC;"
        hint={
          'Required. Saving runs this solution against your tests, the challenge only publishes when it passes. Also enables the "Show Solution" button and the "matches the solution" check.'
        }
      />

      <Fieldset
        legend="Tests"
        actions={
          <SmallButton
            onClick={() => setTests((prev) => [...prev, { ...NEW_TEST }])}
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
                placeholder={`e.g. Returns one row per customer`}
                maxLength={200}
              />
              <SelectField
                label="Check"
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
              {test.assertion === "matchesSolution" ? (
                <label className="flex items-center gap-2 text-sm text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-200)]">
                  <input
                    type="checkbox"
                    checked={test.ordered}
                    onChange={(e) => updateTest(i, { ordered: e.target.checked })}
                    className="accent-[var(--ds-green-600)]"
                  />
                  Row order must match too
                </label>
              ) : (
                <TextField
                  label={
                    test.assertion === "expectedRowCount" ||
                    test.assertion === "rowCountAtLeast"
                      ? "Row count"
                      : "Column names (comma-separated)"
                  }
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
            take a moment while the database engine loads…
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
          {/* Keyed remount: the SQL engine re-seeds with the new setup SQL. */}
          <div key={preview.version}>
            <CustomItemRenderer title={preview.title} payload={preview.payload} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
