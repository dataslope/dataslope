/**
 * Starting filesystems for shell lessons, referenced by string id so MDX can
 * name one without importing a module.
 *
 * `files` is written directly through the filesystem rather than replayed as
 * heredocs: a scenario is scenery, not something the learner is meant to read
 * as commands. Anything that *should* be visible as a command belongs in
 * `setup`, which runs through the same shell the learner types into.
 */

export interface BashScenario {
  id: string;
  label: string;
  description: string;
  /** Path (relative to the working directory) to contents. */
  files: Record<string, string>;
  /** Commands run after the files land, through the learner's own shell. */
  setup?: string[];
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
    id: "empty",
    label: "Empty directory",
    description: "Nothing here yet. Create what you need.",
    files: {},
  },
  {
    id: "small-project",
    label: "Small project",
    description: "A handful of files and one nested directory.",
    files: {
      "README.md": "# Demo project\n\nA few files to poke at.\n",
      "notes.txt": "buy milk\ncall the bank\nship the release\n",
      "src/app.js": "export const version = 1;\n",
      "src/util.js": "export const noop = () => {};\n",
      "src/lib/parse.js": "export const parse = (s) => JSON.parse(s);\n",
    },
  },
  {
    id: "log-files",
    label: "Log files",
    description: "A log to filter, count, and slice.",
    files: {
      "app.log": LOG,
      "app.log.1": LOG.replace(/2026-01-06/g, "2026-01-05"),
    },
  },
  {
    id: "sales-csv",
    label: "Sales CSV",
    description: "Tabular data for cut, sort, and awk.",
    files: { "sales.csv": CSV },
  },
  {
    id: "messy-names",
    label: "Messy filenames",
    description: "Mixed extensions and a couple of stragglers, for globs and find.",
    files: {
      "report-2026-01.txt": "january\n",
      "report-2026-02.txt": "february\n",
      "report-2026-03.md": "march\n",
      "draft.tmp": "scratch\n",
      "archive/report-2025-12.txt": "december\n",
      "archive/old.tmp": "older scratch\n",
    },
  },
];

export const DEFAULT_BASH_SCENARIO = "small-project";

export const bashScenarioById = (id: string): BashScenario =>
  BASH_SCENARIOS.find((s) => s.id === id) ??
  BASH_SCENARIOS.find((s) => s.id === DEFAULT_BASH_SCENARIO)!;
