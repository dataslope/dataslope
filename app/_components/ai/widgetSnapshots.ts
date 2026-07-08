/**
 * Plain-text formatters for Ask AI widget snapshots. Each widget kind packs
 * its live state (instructions, the user's current code, output, test/answer
 * state) into one readable block; the server clips it against the token
 * budget, so the formatters aim for signal-density, not completeness.
 */

const MAX_OUTPUT_CHARS = 2000;

function fence(code: string): string {
  return "```\n" + code.replace(/\n+$/, "") + "\n```";
}

function tail(text: string, max: number): string {
  return text.length <= max ? text : `…${text.slice(text.length - max)}`;
}

export interface SnapshotFile {
  filename: string;
  code: string;
  /** Read-only setup code that runs before the editable code. */
  initCode?: string;
}

export interface SnapshotTest {
  name: string;
  state: string; // "pass" | "fail" | "pending"
  detail?: string | null;
}

export function describeChallenge(args: {
  instructions?: string;
  files: SnapshotFile[];
  outputs?: string[];
  tests?: SnapshotTest[];
  banner?: "pass" | "fail" | null;
}): string {
  const parts: string[] = [];
  if (args.instructions?.trim()) {
    parts.push(`Instructions:\n${args.instructions.trim()}`);
  }
  for (const f of args.files) {
    if (f.initCode?.trim()) {
      parts.push(
        `Read-only setup code for \`${f.filename}\` (runs before the user's code):\n${fence(f.initCode)}`,
      );
    }
    parts.push(`User's current code in \`${f.filename}\`:\n${fence(f.code)}`);
  }
  const output = (args.outputs ?? []).filter(Boolean).join("\n");
  if (output.trim()) {
    parts.push(`Latest output:\n${fence(tail(output, MAX_OUTPUT_CHARS))}`);
  }
  const tests = args.tests ?? [];
  if (args.banner !== null && args.banner !== undefined && tests.length) {
    const passed = tests.filter((t) => t.state === "pass").length;
    const lines = tests.map((t) => {
      const detail =
        t.state === "fail" && t.detail?.trim() ? `, ${t.detail.trim()}` : "";
      return `- [${t.state}] ${t.name}${detail}`;
    });
    parts.push(
      `Last "Check Answer" run: ${passed}/${tests.length} tests passed\n${lines.join("\n")}`,
    );
  } else if (tests.length === 0 || args.banner === null) {
    parts.push("The user has not run \"Check Answer\" yet.");
  }
  return parts.join("\n\n");
}

export function describeCodeBlock(args: {
  files: SnapshotFile[];
  outputs?: string[];
}): string {
  const parts: string[] = [];
  for (const f of args.files) {
    if (f.initCode?.trim()) {
      parts.push(
        `Read-only setup code for \`${f.filename}\`:\n${fence(f.initCode)}`,
      );
    }
    parts.push(`User's current code in \`${f.filename}\`:\n${fence(f.code)}`);
  }
  const output = (args.outputs ?? []).filter(Boolean).join("\n");
  if (output.trim()) {
    parts.push(`Latest output:\n${fence(tail(output, MAX_OUTPUT_CHARS))}`);
  }
  return parts.join("\n\n");
}

export function describeMcq(args: {
  body: string;
  choices: { text: string; correct: boolean; selected: boolean }[];
  submitted: boolean;
  explanation?: string;
}): string {
  const parts: string[] = [`Question:\n${args.body.trim()}`];
  const lines = args.choices.map((c, i) => {
    const flags: string[] = [];
    if (c.correct) flags.push("correct answer");
    if (c.selected) flags.push("selected by the user");
    return `${i + 1}. ${c.text.trim()}${flags.length ? ` [${flags.join("; ")}]` : ""}`;
  });
  parts.push(`Choices:\n${lines.join("\n")}`);
  if (args.submitted) {
    const picked = args.choices.find((c) => c.selected);
    parts.push(
      picked?.correct
        ? "The user answered correctly."
        : "The user answered incorrectly.",
    );
    if (args.explanation?.trim()) {
      parts.push(`Author's explanation:\n${args.explanation.trim()}`);
    }
  } else {
    parts.push("The user has not answered yet, nudge, don't reveal the answer.");
  }
  return parts.join("\n\n");
}

export function describeSqlSurface(args: {
  dialect: string;
  /** Editor label, e.g. a tab or file name. */
  sqlLabel?: string;
  sql?: string;
  instructions?: string;
  error?: string;
  resultSummary?: string;
  tests?: SnapshotTest[];
  banner?: "pass" | "fail" | null;
}): string {
  const parts: string[] = [`SQL dialect: ${args.dialect}`];
  if (args.instructions?.trim()) {
    parts.push(`Instructions:\n${args.instructions.trim()}`);
  }
  if (args.sql?.trim()) {
    const label = args.sqlLabel ? ` (${args.sqlLabel})` : "";
    parts.push(`User's current SQL${label}:\n${fence(args.sql)}`);
  }
  if (args.error?.trim()) {
    parts.push(`Latest error:\n${fence(tail(args.error, MAX_OUTPUT_CHARS))}`);
  } else if (args.resultSummary?.trim()) {
    parts.push(`Latest result: ${args.resultSummary.trim()}`);
  }
  const tests = args.tests ?? [];
  if (args.banner != null && tests.length) {
    const passed = tests.filter((t) => t.state === "pass").length;
    const lines = tests.map((t) => {
      const detail =
        t.state === "fail" && t.detail?.trim() ? `, ${t.detail.trim()}` : "";
      return `- [${t.state}] ${t.name}${detail}`;
    });
    parts.push(
      `Last "Check Answer" run: ${passed}/${tests.length} tests passed\n${lines.join("\n")}`,
    );
  }
  return parts.join("\n\n");
}
