/**
 * Starter repo fixtures, referenced by string id so MDX can name one without
 * importing a module. Each is a command script replayed through the same shell
 * the learner types into — no privileged seeding path, so a scenario can never
 * reach a state the learner could not.
 */

export interface GitScenario {
  id: string;
  label: string;
  description: string;
  /** Shell commands run at seed time, in order. */
  setup: string[];
}

export const SCENARIOS: GitScenario[] = [
  {
    id: "empty",
    label: "Empty folder",
    description: "No repository yet. Start with git init.",
    setup: [],
  },
  {
    id: "linear-history",
    label: "Linear history",
    description: "Three commits on main, plus one unstaged edit.",
    setup: [
      "git init",
      `printf '# Project\\n\\nA small demo repository.\\n' > README.md`,
      "git add README.md",
      `git commit -m "Add README"`,
      `printf 'export const add = (a, b) => a + b;\\n' > math.js`,
      "git add math.js",
      `git commit -m "Add add()"`,
      `printf 'node_modules/\\n' > .gitignore`,
      "git add .gitignore",
      `git commit -m "Ignore node_modules"`,
      `printf '# Project\\n\\nA small demo repository.\\n\\nEdited but not staged.\\n' > README.md`,
    ],
  },
  {
    id: "staged-and-unstaged",
    label: "Staged and unstaged",
    description: "One file staged, one modified, one untracked: three areas at once.",
    setup: [
      "git init",
      `printf '# Notes\\n' > notes.md`,
      `printf 'const version = 1;\\n' > app.js`,
      "git add .",
      `git commit -m "Initial commit"`,
      `printf '# Notes\\n\\nA staged addition.\\n' > notes.md`,
      "git add notes.md",
      `printf 'const version = 2;\\n' > app.js`,
      `printf 'scratch\\n' > scratch.txt`,
    ],
  },
  {
    id: "branching",
    label: "Two branches",
    description: "A feature branch one commit ahead of main.",
    setup: [
      "git init",
      `printf '# App\\n' > README.md`,
      "git add README.md",
      `git commit -m "Initial commit"`,
      "git checkout -b feature",
      `printf 'export const feature = true;\\n' > feature.js`,
      "git add feature.js",
      `git commit -m "Add feature flag"`,
      "git checkout main",
    ],
  },
  {
    id: "conflict-pending",
    label: "Conflict waiting to happen",
    description: "Two branches editing the same line. Merge them and see.",
    setup: [
      "git init",
      `printf 'title: Draft\\nauthor: unknown\\n' > config.yml`,
      "git add config.yml",
      `git commit -m "Add config"`,
      "git checkout -b rename",
      `printf 'title: Final\\nauthor: unknown\\n' > config.yml`,
      "git add config.yml",
      `git commit -m "Rename title to Final"`,
      "git checkout main",
      `printf 'title: Release\\nauthor: unknown\\n' > config.yml`,
      "git add config.yml",
      `git commit -m "Rename title to Release"`,
    ],
  },
];

export const DEFAULT_SCENARIO = "linear-history";

export const scenarioById = (id: string): GitScenario =>
  SCENARIOS.find((s) => s.id === id) ?? SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO)!;
