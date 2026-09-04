"use client";

/**
 * The Bash playground's "All commands": the coreutils a shell lesson leans
 * on, grouped by what they are for. Like the Git palette, a row **fills the
 * prompt** and never runs; the reader presses Enter. Templates name the seed
 * files when the scenario has them, so a composed line is runnable as-is.
 *
 * The classes are the Git palette's (`gitx-palette-*`, rules in
 * gitPanels.css), and the same stylesheet test pins them.
 */

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface Entry {
  label: string;
  template: string;
}

interface Group {
  name: string;
  entries: Entry[];
}

/** `{file}` and `{dir}` are filled from the working directory. */
export const BASH_PALETTE_GROUPS: Group[] = [
  {
    name: "Look around",
    entries: [
      { label: "List files", template: "ls -la" },
      { label: "Where am I", template: "pwd" },
      { label: "Show a file", template: "cat {file}" },
      { label: "First lines", template: "head -n 3 {file}" },
      { label: "Count lines, words, bytes", template: "wc {file}" },
      { label: "Find files by name", template: "find . -name '*.txt'" },
      { label: "Tree of a directory", template: "find {dir} -type f" },
    ],
  },
  {
    name: "Move and make",
    entries: [
      { label: "Change directory", template: "cd {dir}" },
      { label: "Make a directory", template: "mkdir -p build/out" },
      { label: "Create an empty file", template: "touch new.txt" },
      { label: "Write a file", template: "echo 'hello' > hello.txt" },
      { label: "Append a line", template: "echo 'more' >> hello.txt" },
      { label: "Write several lines", template: "cat > notes.md <<'EOF'\n# Notes\n\n- one\nEOF" },
      { label: "Copy, move, remove", template: "cp {file} copy.txt && mv copy.txt moved.txt && rm moved.txt" },
    ],
  },
  {
    name: "Filter and transform",
    entries: [
      { label: "Search for a word", template: "grep -n 'the' {file}" },
      { label: "Search every file", template: "grep -rl 'the' ." },
      { label: "Replace text", template: "sed 's/old/new/g' {file}" },
      { label: "Pick a column", template: "cut -d, -f2 {file}" },
      { label: "Sort and dedupe", template: "sort {file} | uniq -c | sort -rn" },
      { label: "Sum a column with awk", template: "awk -F, 'NR>1 {s+=$3} END {print s}' {file}" },
      { label: "Upper-case it", template: "tr a-z A-Z < {file}" },
    ],
  },
  {
    name: "Variables and loops",
    entries: [
      { label: "Set and use a variable", template: 'name="world"; echo "hello $name"' },
      { label: "Arithmetic", template: "n=6; echo $((n * 7))" },
      { label: "Loop over files", template: 'for f in *; do echo "$f"; done' },
      { label: "Loop over numbers", template: "for i in $(seq 1 5); do echo $i; done" },
      { label: "A condition", template: 'if [ -f {file} ]; then echo "exists"; else echo "missing"; fi' },
      { label: "A while loop", template: "i=0; while [ $i -lt 3 ]; do echo $i; i=$((i+1)); done" },
      { label: "Command output in a variable", template: 'count=$(ls | wc -l); echo "$count entries"' },
    ],
  },
  {
    name: "Functions and scripts",
    entries: [
      { label: "Define a function", template: 'greet() { echo "hi $1"; }; greet there' },
      { label: "Make an alias", template: "alias ll='ls -la'; ll" },
      { label: "Write a script", template: "printf '#!/bin/bash\\necho \"args: $@\"\\n' > run.sh && chmod +x run.sh" },
      { label: "Run it", template: "bash run.sh one two" },
      { label: "Exit status of the last command", template: "false; echo $?" },
      { label: "Chain on success or failure", template: "mkdir tmp && echo made || echo failed" },
    ],
  },
];

export function fillBashTemplate(template: string, tree: string[], dirs: string[]): string {
  const file = tree.find((p) => !p.includes("/")) ?? tree[0] ?? "README.md";
  const dir = dirs.find((d) => !d.includes("/")) ?? "src";
  return template.replace(/\{file\}/g, file).replace(/\{dir\}/g, dir);
}

export function BashCommandPalette({
  tree,
  dirs,
  onCompose,
  onClose,
}: {
  tree: string[];
  dirs: string[];
  onCompose: (command: string) => void;
  onClose: () => void;
}) {
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    first.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      className="gitx-palette-panel"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="gitx-palette-head">
        <h2 className="gitx-palette-title">All commands</h2>
        <button type="button" className="gitx-btn quiet small" onClick={onClose} aria-label="Close the command list">
          <X size={14} aria-hidden="true" />
        </button>
      </header>
      <p className="gitx-palette-note">Fills the prompt. You press Enter.</p>
      <div className="gitx-palette-groups">
        {BASH_PALETTE_GROUPS.map((group, gi) => (
          <div key={group.name} className="gitx-palette-group">
            <h3>{group.name}</h3>
            <ul className="gitx-palette-list">
              {group.entries.map((entry, ei) => {
                const command = fillBashTemplate(entry.template, tree, dirs);
                return (
                  <li key={entry.label}>
                    <button
                      type="button"
                      className="gitx-palette-btn"
                      ref={gi === 0 && ei === 0 ? first : undefined}
                      onClick={() => onCompose(command)}
                      title={command}
                    >
                      <span className="gitx-palette-label">{entry.label}</span>
                      <code className="gitx-palette-cmd">{command.split("\n")[0]}</code>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
