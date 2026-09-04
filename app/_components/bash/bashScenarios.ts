/**
 * Starting filesystems for shell lessons, referenced by string id so MDX can
 * name one without importing a module.
 *
 * `files` is written directly through the filesystem rather than replayed as
 * heredocs: a scenario is scenery, not something the learner is meant to read
 * as commands. Anything that *should* be visible as a command belongs in
 * `setup`, which runs through the same shell the learner types into.
 *
 * `tryThis` is the on-ramp: a few short steps shown in the playground and
 * ticked as the reader runs them, the same device the Git playground uses.
 * Not a level system; the first things worth typing here.
 */

export interface BashScenario {
  id: string;
  label: string;
  description: string;
  /** Path (relative to the working directory) to contents. */
  files: Record<string, string>;
  /** Commands run after the files land, through the learner's own shell. */
  setup?: string[];
  /** A suggested first move, ticked off as the reader does it. */
  tryThis: { label: string; command: string }[];
}

const CSV = `date,region,units,revenue
2026-01-04,north,12,340.50
2026-01-04,south,7,198.00
2026-01-05,north,19,540.25
2026-01-05,east,3,84.75
2026-01-06,south,22,611.00
2026-01-06,north,5,142.25
2026-01-07,east,14,395.50
`;

const LOG = `2026-01-06 08:12:04 INFO  starting scheduler
2026-01-06 08:12:05 INFO  loaded 42 jobs
2026-01-06 08:13:11 WARN  job 17 retried once
2026-01-06 08:14:02 ERROR job 17 failed: timeout
2026-01-06 08:14:02 INFO  job 18 ok
2026-01-06 08:15:40 ERROR job 23 failed: connection refused
2026-01-06 08:16:00 INFO  scheduler idle
`;

export const BASH_SCENARIOS: BashScenario[] = [
  {
    id: "small-project",
    label: "Explore files",
    description: "A handful of files and one nested directory. Look around, then make something.",
    files: {
      "README.md": "# Demo project\n\nA few files to poke at.\n",
      "notes.txt": "buy milk\ncall the bank\nship the release\n",
      "src/app.js": "export const version = 1;\n",
      "src/util.js": "export const noop = () => {};\n",
      "src/lib/parse.js": "export const parse = (s) => JSON.parse(s);\n",
    },
    tryThis: [
      { label: "See what is here", command: "ls -la" },
      { label: "Read a file", command: "cat README.md" },
      { label: "Look inside src", command: "find src -type f" },
      { label: "Add a line to the notes", command: "echo 'water the plants' >> notes.txt" },
    ],
  },
  {
    id: "log-files",
    label: "Pipes and filters",
    description: "A log to filter, count, and slice with grep, cut, sort and uniq.",
    files: {
      "app.log": LOG,
      "app.log.1": LOG.replace(/2026-01-06/g, "2026-01-05"),
    },
    tryThis: [
      { label: "Only the errors", command: "grep ERROR app.log" },
      { label: "Count them", command: "grep -c ERROR app.log" },
      { label: "Which levels, how often", command: "cut -c21-25 app.log | sort | uniq -c" },
      { label: "The last two lines of both logs", command: "tail -n 2 app.log app.log.1" },
    ],
  },
  {
    id: "sales-csv",
    label: "Variables and loops",
    description: "Tabular data for awk, plus variables, arithmetic and a loop over rows.",
    files: { "sales.csv": CSV },
    tryThis: [
      { label: "Total units with awk", command: "awk -F, 'NR>1 {s+=$3} END {print s}' sales.csv" },
      { label: "Keep a value in a variable", command: "rows=$(tail -n +2 sales.csv | wc -l); echo \"$rows rows\"" },
      { label: "Loop over the regions", command: "for r in north south east; do echo \"$r: $(grep -c \",$r,\" sales.csv)\"; done" },
      { label: "Arithmetic", command: "echo $(( 340 + 198 ))" },
    ],
  },
  {
    id: "messy-names",
    label: "Write a script",
    description: "Mixed filenames to tidy with globs and find, then a script that does it for you.",
    files: {
      "report-2026-01.txt": "january\n",
      "report-2026-02.txt": "february\n",
      "report-2026-03.md": "march\n",
      "draft.tmp": "scratch\n",
      "archive/report-2025-12.txt": "december\n",
      "archive/old.tmp": "older scratch\n",
    },
    tryThis: [
      { label: "Match with a glob", command: "ls report-*.txt" },
      { label: "Find the scratch files", command: "find . -name '*.tmp'" },
      { label: "Define a function", command: "tidy() { find . -name '*.tmp' -delete; echo cleaned; }" },
      { label: "Write it as a script and run it", command: "printf '#!/bin/bash\\nls *.txt | wc -l\\n' > count.sh && bash count.sh" },
    ],
  },
  {
    id: "empty",
    label: "Empty directory",
    description: "Nothing here yet. Create what you need.",
    files: {},
    tryThis: [
      { label: "Make a directory", command: "mkdir -p project/src" },
      { label: "Create a file in it", command: "echo 'hello' > project/src/main.txt" },
      { label: "See the tree", command: "find project" },
    ],
  },
];

export const DEFAULT_BASH_SCENARIO = "small-project";

export const bashScenarioById = (id: string): BashScenario =>
  BASH_SCENARIOS.find((s) => s.id === id) ??
  BASH_SCENARIOS.find((s) => s.id === DEFAULT_BASH_SCENARIO)!;

/** What this shell is and is not, for the reader who wonders why `python3`
 *  is missing or why `cat > file` returns at once. */
export const BASH_ABOUT = {
  shell: "bash 5.1, running in your browser tab. Nothing leaves it and nothing is installed on your machine.",
  installed: [
    "ls", "cd", "pwd", "cat", "echo", "printf", "touch", "mkdir", "rm", "cp", "mv", "head", "tail", "wc",
    "grep", "sed", "awk", "sort", "uniq", "cut", "tr", "find", "xargs", "diff", "jq", "tee", "du", "seq",
    "date", "basename", "dirname", "which", "env", "test", "sleep", "time", "git",
  ],
  missing: ["python3", "node", "curl", "ssh", "uname", "yes", "vim", "less"],
  notes: [
    "There is no standard input: cat > file and read wait for nothing. Use echo, printf or a heredoc (cat > file <<'EOF' … EOF) to write.",
    "A line that is not finished (an open if, quote or pipe) gets a > prompt for the rest, as in a terminal.",
    "Functions, aliases and variables you define stay for the rest of the session in that terminal.",
    "Every terminal shares the same files; each has its own directory, variables and history.",
    "This tab remembers your session across a reload. Reset starts over with the scenario's files.",
  ],
};
