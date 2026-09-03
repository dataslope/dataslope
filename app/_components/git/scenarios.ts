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
  /**
   * A suggested first move: a few short steps shown once on load, ticked as
   * the reader does them. A sandbox with no suggested first move is a blank
   * page; this is not a level system, just the first things to try.
   */
  tryThis: { label: string; command: string }[];
}

export const SCENARIOS: GitScenario[] = [
  {
    id: "empty",
    label: "Empty folder",
    description: "No repository yet. Start with git init.",
    setup: [],
    tryThis: [
      { label: "Create a repository", command: "git init" },
      { label: "Create a file", command: "printf 'hello\\n' > notes.txt" },
      { label: "Stage it", command: "git add notes.txt" },
      { label: "Commit it", command: 'git commit -m "First commit"' },
    ],
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
    tryThis: [
      { label: "Stage the edit to README.md", command: "git add README.md" },
      { label: "Commit it", command: 'git commit -m "Describe the edit"' },
      { label: "See the history", command: "git log --oneline" },
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
    tryThis: [
      { label: "See where everything is", command: "git status" },
      { label: "Stage app.js too", command: "git add app.js" },
      { label: "Commit both", command: 'git commit -m "Bump version"' },
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
    tryThis: [
      { label: "Look at both branches", command: "git log --oneline --all" },
      { label: "Switch to feature", command: "git checkout feature" },
      { label: "Come back and merge it", command: "git merge feature" },
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
    tryThis: [
      { label: "Merge rename into main", command: "git merge rename" },
      { label: "Fix config.yml, then mark it resolved", command: "git add config.yml" },
      { label: "Finish the merge", command: 'git commit -m "Merge rename"' },
    ],
  },
];

export const DEFAULT_SCENARIO = "linear-history";

export const scenarioById = (id: string): GitScenario =>
  SCENARIOS.find((s) => s.id === id) ?? SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO)!;
