/**
 * Content for the home page hero's interactive "try it" panel: one runnable
 * coding challenge per non-SQL language, one SQL challenge per dialect, a set
 * of runnable Web (HTML/CSS/JS and React) code blocks, and a handful of
 * conceptual multiple-choice questions. Kept as plain data so the hero
 * component stays presentational.
 */

import type { ChallengeTest } from "../challengeHarness";
import type { ChallengeFile } from "../ChallengeCard";
import type { CodeBlockFile } from "../CodeBlock";
import type { AdapterId } from "../runtime/adapters";
import type { SqlChallengeTest, SqlDialect } from "../SqlChallengeCard";

export interface HomeCodeChallenge {
  adapter: AdapterId;
  /** Label shown in the language dropdown. */
  label: string;
  title: string;
  instructions: string;
  files: ChallengeFile[];
  /** Entry file for multi-file workspaces (the one with `main`). */
  entryFilename?: string;
  tests: ChallengeTest[];
}

// Every language solves the same task, graded on stdout so it works on every
// runtime. [1, 1, 2, 3, 3, 3, 2, 2] has a longest run of three → "3".
const LONGEST_RUN_TESTS: ChallengeTest[] = [
  {
    id: "longest_run",
    name: "Prints the longest run length",
    description: "The program outputs `3` (the three 3s in a row).",
    expect: { stdoutEquals: "3" },
  },
];

function longestRunInstructions(printHint: string): string {
  return `\`nums\` holds a sequence of integers. A **run** is a group of consecutive equal values.

Print the length of the **longest run** with ${printHint}. For \`[1, 1, 2, 3, 3, 3, 2, 2]\` the longest run is the three \`3\`s, so the answer is \`3\`.`;
}

/** The non-SQL code challenges, in dropdown order; every language solves the
 *  same "longest consecutive run" task so the demo reads consistently. */
export const CODE_CHALLENGES: HomeCodeChallenge[] = [
  {
    adapter: "python",
    label: "Python",
    title: "Longest consecutive run",
    instructions: longestRunInstructions("`print()`"),
    files: [
      {
        filename: "main.py",
        starterCode: "nums = [1, 1, 2, 3, 3, 3, 2, 2]\n# your code here\n",
        solutionCode:
          "nums = [1, 1, 2, 3, 3, 3, 2, 2]\nlongest = current = 1\nfor i in range(1, len(nums)):\n    current = current + 1 if nums[i] == nums[i - 1] else 1\n    longest = max(longest, current)\nprint(longest)\n",
      },
    ],
    tests: LONGEST_RUN_TESTS,
  },
  {
    adapter: "r",
    label: "R",
    title: "Longest consecutive run",
    instructions: longestRunInstructions("`cat()`"),
    files: [
      {
        filename: "main.R",
        starterCode: "nums <- c(1, 1, 2, 3, 3, 3, 2, 2)\n# your code here\n",
        solutionCode:
          "nums <- c(1, 1, 2, 3, 3, 3, 2, 2)\ncat(max(rle(nums)$lengths))\n",
      },
    ],
    tests: LONGEST_RUN_TESTS,
  },
  {
    adapter: "javascript",
    label: "JavaScript",
    title: "Longest consecutive run",
    instructions: longestRunInstructions("`console.log()`"),
    files: [
      {
        filename: "main.js",
        starterCode:
          "const nums = [1, 1, 2, 3, 3, 3, 2, 2];\n// your code here\n",
        solutionCode:
          "const nums = [1, 1, 2, 3, 3, 3, 2, 2];\nlet longest = 1;\nlet current = 1;\nfor (let i = 1; i < nums.length; i++) {\n  current = nums[i] === nums[i - 1] ? current + 1 : 1;\n  longest = Math.max(longest, current);\n}\nconsole.log(longest);\n",
      },
    ],
    tests: LONGEST_RUN_TESTS,
  },
  {
    adapter: "typescript",
    label: "TypeScript",
    title: "Longest consecutive run",
    instructions: longestRunInstructions("`console.log()`"),
    files: [
      {
        filename: "main.ts",
        starterCode:
          "const nums: number[] = [1, 1, 2, 3, 3, 3, 2, 2];\n// your code here\n",
        solutionCode:
          "const nums: number[] = [1, 1, 2, 3, 3, 3, 2, 2];\nlet longest = 1;\nlet current = 1;\nfor (let i = 1; i < nums.length; i++) {\n  current = nums[i] === nums[i - 1] ? current + 1 : 1;\n  longest = Math.max(longest, current);\n}\nconsole.log(longest);\n",
      },
    ],
    tests: LONGEST_RUN_TESTS,
  },
  {
    adapter: "php",
    label: "PHP",
    title: "Longest consecutive run",
    instructions: longestRunInstructions("`echo`"),
    files: [
      {
        filename: "main.php",
        starterCode:
          "<?php\n$nums = [1, 1, 2, 3, 3, 3, 2, 2];\n// your code here\n",
        solutionCode:
          '<?php\n$nums = [1, 1, 2, 3, 3, 3, 2, 2];\n$longest = 1;\n$current = 1;\nfor ($i = 1; $i < count($nums); $i++) {\n    $current = $nums[$i] === $nums[$i - 1] ? $current + 1 : 1;\n    if ($current > $longest) {\n        $longest = $current;\n    }\n}\necho $longest, "\\n";\n',
      },
    ],
    tests: LONGEST_RUN_TESTS,
  },
  {
    adapter: "c",
    label: "C",
    title: "Longest consecutive run",
    instructions: longestRunInstructions("`printf`"),
    files: [
      {
        filename: "main.c",
        starterCode:
          "#include <stdio.h>\n\nint main(void) {\n    int nums[] = {1, 1, 2, 3, 3, 3, 2, 2};\n    int n = sizeof(nums) / sizeof(nums[0]);\n    /* your code here */\n    return 0;\n}\n",
        solutionCode:
          '#include <stdio.h>\n\nint main(void) {\n    int nums[] = {1, 1, 2, 3, 3, 3, 2, 2};\n    int n = sizeof(nums) / sizeof(nums[0]);\n    int longest = 1, current = 1;\n    for (int i = 1; i < n; i++) {\n        current = nums[i] == nums[i - 1] ? current + 1 : 1;\n        if (current > longest) longest = current;\n    }\n    printf("%d\\n", longest);\n    return 0;\n}\n',
      },
    ],
    tests: LONGEST_RUN_TESTS,
  },
  {
    adapter: "cpp",
    label: "C++",
    title: "Longest consecutive run",
    instructions: longestRunInstructions("`std::cout`"),
    files: [
      {
        filename: "main.cpp",
        starterCode:
          "#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> nums = {1, 1, 2, 3, 3, 3, 2, 2};\n    // your code here\n    return 0;\n}\n",
        solutionCode:
          "#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> nums = {1, 1, 2, 3, 3, 3, 2, 2};\n    int longest = 1, current = 1;\n    for (std::size_t i = 1; i < nums.size(); i++) {\n        current = nums[i] == nums[i - 1] ? current + 1 : 1;\n        longest = std::max(longest, current);\n    }\n    std::cout << longest << std::endl;\n    return 0;\n}\n",
      },
    ],
    tests: LONGEST_RUN_TESTS,
  },
  {
    adapter: "java",
    label: "Java",
    title: "Longest consecutive run",
    instructions: longestRunInstructions("`System.out.println`"),
    files: [
      {
        filename: "Main.java",
        starterCode:
          "public class Main {\n  public static void main(String[] args) {\n    int[] nums = {1, 1, 2, 3, 3, 3, 2, 2};\n    // your code here\n  }\n}\n",
        solutionCode:
          "public class Main {\n  public static void main(String[] args) {\n    int[] nums = {1, 1, 2, 3, 3, 3, 2, 2};\n    int longest = 1, current = 1;\n    for (int i = 1; i < nums.length; i++) {\n      current = nums[i] == nums[i - 1] ? current + 1 : 1;\n      longest = Math.max(longest, current);\n    }\n    System.out.println(longest);\n  }\n}\n",
      },
    ],
    tests: LONGEST_RUN_TESTS,
  },
  {
    adapter: "csharp",
    label: "C#",
    title: "Longest consecutive run",
    instructions: longestRunInstructions("`System.Console.WriteLine`"),
    files: [
      {
        filename: "main.cs",
        starterCode:
          "int[] nums = {1, 1, 2, 3, 3, 3, 2, 2};\n// your code here\n",
        solutionCode:
          "int[] nums = {1, 1, 2, 3, 3, 3, 2, 2};\nint longest = 1, current = 1;\nfor (int i = 1; i < nums.Length; i++)\n{\n    current = nums[i] == nums[i - 1] ? current + 1 : 1;\n    longest = System.Math.Max(longest, current);\n}\nSystem.Console.WriteLine(longest);\n",
      },
    ],
    tests: LONGEST_RUN_TESTS,
  },
];

export interface HomeSqlChallenge {
  dialect: SqlDialect;
  /** Label shown in the dialect dropdown. */
  label: string;
  title: string;
  instructions: string;
  initSql: string;
  starterCode: string;
  solutionSql: string;
  tables: string[];
  tests: SqlChallengeTest[];
}

// Schema + seed shared by every dialect (portable DDL: INTEGER PRIMARY KEY +
// TEXT columns run identically on PostgreSQL, SQLite, and DuckDB).
const EMPLOYEES_INIT = `CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  salary INTEGER NOT NULL
);

INSERT INTO employees (id, name, department, salary) VALUES
  (1, 'Ada',    'Engineering', 145000),
  (2, 'Grace',  'Engineering', 152000),
  (3, 'Linus',  'Engineering',  98000),
  (4, 'Mary',   'Design',      120000),
  (5, 'Alan',   'Design',       89000),
  (6, 'Edsger', 'Research',    134000),
  (7, 'Kofi', 'Finance', 90000),
  (8, 'Nina', 'Design', 136000),
  (9, 'Mary', 'Marketing', 182000),
  (10, 'Margaret', 'Engineering', 81000),
  (11, 'John', 'Data', 127000),
  (12, 'Niklaus', 'Engineering', 173000),
  (13, 'Ruth', 'Research', 72000),
  (14, 'Priya', 'Operations', 118000),
  (15, 'Tobias', 'Engineering', 164000),
  (16, 'Marcus', 'Sales', 63000),
  (17, 'Theo', 'Engineering', 109000),
  (18, 'Katherine', 'Product', 155000),
  (19, 'Bjarne', 'Finance', 201000),
  (20, 'Donald', 'Design', 100000),
  (21, 'Carol', 'Marketing', 146000),
  (22, 'Marvin', 'Engineering', 192000),
  (23, 'Yusuf', 'Data', 91000),
  (24, 'Freya', 'Engineering', 137000),
  (25, 'Oscar', 'Research', 183000),
  (26, 'Linus', 'Operations', 82000),
  (27, 'Guido', 'Engineering', 128000),
  (28, 'Shafi', 'Sales', 174000),
  (29, 'Adele', 'Engineering', 73000),
  (30, 'Andrew', 'Product', 119000),
  (31, 'Omar', 'Finance', 165000),
  (32, 'Lena', 'Design', 64000),
  (33, 'Elena', 'Marketing', 110000),
  (34, 'Clara', 'Engineering', 156000),
  (35, 'Edsger', 'Data', 202000),
  (36, 'Radia', 'Engineering', 101000),
  (37, 'James', 'Research', 147000),
  (38, 'Robert', 'Operations', 193000),
  (39, 'Ellen', 'Engineering', 92000),
  (40, 'Mei', 'Sales', 138000),
  (41, 'Pablo', 'Engineering', 184000),
  (42, 'Fatima', 'Product', 83000),
  (43, 'Grace', 'Finance', 129000),
  (44, 'Barbara', 'Design', 175000),
  (45, 'Tim', 'Marketing', 74000),
  (46, 'Vint', 'Engineering', 120000),
  (47, 'Joan', 'Data', 166000),
  (48, 'Hedy', 'Engineering', 65000),
  (49, 'Hassan', 'Research', 111000),
  (50, 'Sanjay', 'Operations', 157000),
  (51, 'Raj', 'Engineering', 203000),
  (52, 'Alan', 'Sales', 102000),
  (53, 'Ken', 'Engineering', 148000),
  (54, 'Frances', 'Product', 194000),
  (55, 'Sophie', 'Finance', 93000),
  (56, 'Peter', 'Design', 139000),
  (57, 'Diego', 'Marketing', 185000),
  (58, 'Aisha', 'Engineering', 84000),
  (59, 'Wei', 'Data', 130000),
  (60, 'Ada', 'Engineering', 176000),
  (61, 'Dennis', 'Research', 75000),
  (62, 'Anita', 'Operations', 121000),
  (63, 'Leslie', 'Engineering', 167000),
  (64, 'Brian', 'Sales', 66000),
  (65, 'Nadia', 'Engineering', 112000),
  (66, 'Ingrid', 'Product', 158000),
  (67, 'Kofi', 'Finance', 204000),
  (68, 'Nina', 'Design', 103000),
  (69, 'Mary', 'Marketing', 149000),
  (70, 'Margaret', 'Engineering', 195000),
  (71, 'John', 'Data', 94000),
  (72, 'Niklaus', 'Engineering', 140000),
  (73, 'Ruth', 'Research', 186000),
  (74, 'Priya', 'Operations', 85000),
  (75, 'Tobias', 'Engineering', 131000),
  (76, 'Marcus', 'Sales', 177000),
  (77, 'Theo', 'Engineering', 76000),
  (78, 'Katherine', 'Product', 122000),
  (79, 'Bjarne', 'Finance', 168000),
  (80, 'Donald', 'Design', 67000),
  (81, 'Carol', 'Marketing', 113000),
  (82, 'Marvin', 'Engineering', 159000),
  (83, 'Yusuf', 'Data', 205000),
  (84, 'Freya', 'Engineering', 104000),
  (85, 'Oscar', 'Research', 150000),
  (86, 'Linus', 'Operations', 196000),
  (87, 'Guido', 'Engineering', 95000),
  (88, 'Shafi', 'Sales', 141000),
  (89, 'Adele', 'Engineering', 187000),
  (90, 'Andrew', 'Product', 86000),
  (91, 'Omar', 'Finance', 132000),
  (92, 'Lena', 'Design', 178000),
  (93, 'Elena', 'Marketing', 77000),
  (94, 'Clara', 'Engineering', 123000),
  (95, 'Edsger', 'Data', 169000),
  (96, 'Radia', 'Engineering', 68000),
  (97, 'James', 'Research', 114000),
  (98, 'Robert', 'Operations', 160000),
  (99, 'Ellen', 'Engineering', 206000),
  (100, 'Mei', 'Sales', 105000),
  (101, 'Pablo', 'Engineering', 151000),
  (102, 'Fatima', 'Product', 197000),
  (103, 'Grace', 'Finance', 96000),
  (104, 'Barbara', 'Design', 142000),
  (105, 'Tim', 'Marketing', 188000),
  (106, 'Vint', 'Engineering', 87000),
  (107, 'Joan', 'Data', 133000),
  (108, 'Hedy', 'Engineering', 179000),
  (109, 'Hassan', 'Research', 78000),
  (110, 'Sanjay', 'Operations', 124000),
  (111, 'Raj', 'Engineering', 170000),
  (112, 'Alan', 'Sales', 69000),
  (113, 'Ken', 'Engineering', 115000),
  (114, 'Frances', 'Product', 161000),
  (115, 'Sophie', 'Finance', 207000),
  (116, 'Peter', 'Design', 106000),
  (117, 'Diego', 'Marketing', 152000),
  (118, 'Aisha', 'Engineering', 198000),
  (119, 'Wei', 'Data', 97000),
  (120, 'Ada', 'Engineering', 143000);`;

const EMPLOYEES_SOLUTION = `SELECT name, salary
FROM employees
WHERE department = 'Engineering' AND salary > 100000
ORDER BY salary DESC;`;

const EMPLOYEES_STARTER = `SELECT name, salary
FROM employees
-- add a WHERE clause and ORDER BY salary
`;

const EMPLOYEES_TESTS: SqlChallengeTest[] = [
  {
    id: "columns",
    name: "Returns name and salary",
    expectedColumns: ["name", "salary"],
  },
  {
    id: "matches",
    name: "Right rows, highest salary first",
    matchesSolution: true,
    ordered: true,
  },
];

function employeesChallenge(
  dialect: SqlDialect,
  label: string,
): HomeSqlChallenge {
  return {
    dialect,
    label,
    title: "Top earners in Engineering",
    instructions:
      "Return the `name` and `salary` of every employee in the **Engineering** department who earns more than `100000`, with the highest salary first.",
    initSql: EMPLOYEES_INIT,
    starterCode: EMPLOYEES_STARTER,
    solutionSql: EMPLOYEES_SOLUTION,
    tables: ["employees"],
    tests: EMPLOYEES_TESTS,
  };
}

export const SQL_CHALLENGES: HomeSqlChallenge[] = [
  employeesChallenge("sqlite", "SQLite"),
  employeesChallenge("postgres", "PostgreSQL"),
  employeesChallenge("duckdb", "DuckDB"),
];

export interface HomeWebBlock {
  /** Value stored in the flavor dropdown. */
  flavor: string;
  /** Label shown in the flavor dropdown. */
  label: string;
  adapter: AdapterId;
  entryFilename?: string;
  files: CodeBlockFile[];
  /** Inject the in-browser Tailwind compiler into the preview. */
  tailwind?: boolean;
}

// A small interactive page split across the CodePen-style trio. The web
// adapter auto-composes root-level .css/.js into the HTML, so index.html stays
// a plain body fragment with no <link>/<script src> boilerplate.
const WEB_INDEX_HTML = `<div class="card">
  <h1>Hello, web!</h1>
  <p>Edit the HTML, CSS, or JS and press Run.</p>
  <button id="go">Click me</button>
</div>
`;

const WEB_STYLES_CSS = `body {
  font-family: system-ui, sans-serif;
  display: grid;
  place-items: center;
  min-height: 90vh;
  margin: 0;
  background: #f8fafc;
}

.card {
  background: #fff;
  padding: 2rem 3rem;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  text-align: center;
}

h1 {
  color: #0f172a;
  margin: 0 0 0.5rem;
}

button {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1.25rem;
  font-size: 1rem;
  cursor: pointer;
}

button:hover {
  background: #1d4ed8;
}
`;

const WEB_SCRIPT_JS = `let clicks = 0;
const button = document.querySelector("#go");

button.addEventListener("click", () => {
  clicks += 1;
  button.textContent = "Clicked " + clicks + (clicks === 1 ? " time" : " times");
  console.log("clicks:", clicks);
});
`;

// A React counter split into a mount file, the component, and a CSS import.
// esbuild-wasm bundles the workspace in a worker and the result renders in the
// same sandboxed preview iframe the web block uses.
const REACT_MAIN_TSX = `import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<App />);
`;

const REACT_APP_TSX = `import { useState } from "react";

export function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="card">
      <h1>You clicked {count} times</h1>
      <button onClick={() => setCount(count + 1)}>Click me</button>
      <p>
        Edit <code>App.tsx</code> and press Run, imports between the panes
        bundle right in your browser.
      </p>
    </main>
  );
}
`;

const REACT_STYLES_CSS = `body {
  font-family: system-ui, sans-serif;
  display: grid;
  place-items: center;
  min-height: 90vh;
  margin: 0;
  background: #f8fafc;
}

.card {
  background: #fff;
  padding: 2rem 3rem;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  text-align: center;
  max-width: 26rem;
}

h1 {
  color: #0f172a;
  margin: 0 0 1rem;
}

button {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
}

button:hover {
  background: #1d4ed8;
}

p {
  color: #64748b;
  font-size: 0.9rem;
}
`;

/**
 * The Web preview tab shows runnable code blocks (not graded challenge cards),
 * one per flavor. Each is a small multi-file workspace that renders a live
 * sandboxed preview.
 */
export const WEB_CODE_BLOCKS: HomeWebBlock[] = [
  {
    flavor: "web",
    label: "HTML",
    adapter: "web",
    entryFilename: "index.html",
    files: [
      { filename: "index.html", starterCode: WEB_INDEX_HTML },
      { filename: "styles.css", starterCode: WEB_STYLES_CSS },
      { filename: "script.js", starterCode: WEB_SCRIPT_JS },
    ],
  },
  {
    flavor: "react",
    label: "React",
    adapter: "react",
    entryFilename: "main.tsx",
    files: [
      { filename: "main.tsx", starterCode: REACT_MAIN_TSX },
      { filename: "App.tsx", starterCode: REACT_APP_TSX },
      { filename: "styles.css", starterCode: REACT_STYLES_CSS },
    ],
  },
];

/**
 * Conceptual multiple-choice questions in the `<MultipleChoiceQuestion>`
 * markdown format. Per the repo's authoring rule, no explanation opens with
 * an affirmative word.
 */
export const CONCEPT_QUESTIONS: string[] = [
  // SQL, WHERE vs HAVING
  `In SQL, which clause filters rows **after** aggregation, so it can use the result of a function like \`COUNT()\` or \`SUM()\`?

- [o] The \`HAVING\` clause
  > \`HAVING\` runs after \`GROUP BY\` collapses rows into groups, so a condition like \`HAVING COUNT(*) > 5\` works on the aggregated results.
- The \`ORDER BY\` clause
  > \`ORDER BY\` only sorts the final result set and plays no part in filtering.
- The \`GROUP BY\` clause
  > \`GROUP BY\` defines how rows are collected into groups; it does not filter them.
- The \`WHERE\` clause
  > \`WHERE\` filters individual rows *before* they are grouped, so it cannot reference an aggregate such as \`COUNT(*)\`.

\`WHERE\` filters raw rows before grouping, while \`HAVING\` filters the grouped results afterward. That ordering is why an aggregate condition like \`COUNT(*) > 5\` has to live in \`HAVING\`, not \`WHERE\`.`,

  // Python / pandas, column selection returns a Series
  `In pandas, what does selecting a single column with \`df["age"]\` return?

- A \`DataFrame\`
  > Passing a *list* of columns, like \`df[["age"]]\`, returns a DataFrame; a bare string returns a Series.
- [o] A \`Series\`
  > A single-column selection returns a one-dimensional \`Series\` whose index matches the DataFrame's rows.
- A NumPy \`ndarray\`
  > The values are backed by NumPy, but the object handed back is a \`Series\`; call \`.to_numpy()\` to drop down to a raw array.
- A plain Python \`list\`
  > pandas keeps the data in its own labelled structure, so you still get index labels and vectorized operations, not a built-in list.

Indexing a DataFrame with a single column name gives a \`Series\`; indexing with a list of names gives a \`DataFrame\`. Keeping that distinction straight avoids a lot of shape-related bugs.`,

  // Machine learning, purpose of a train/test split
  `Why split a dataset into separate **training** and **test** sets before fitting a model?

- To remove the need to tune the model
  > A test set measures performance; it does not replace choosing hyperparameters or features.
- To give the model more data to memorize
  > Holding data back *reduces* the training set; the aim is honest evaluation, not memorization.
- [o] To estimate how well the model generalizes to unseen data
  > Scoring on data the model never trained on approximates its performance in production, where every input is new.
- To make training run faster
  > Any speedup is incidental and is not the reason to hold out a test set.

A held-out test set stands in for future, unseen inputs, so its score estimates real-world performance and exposes overfitting when training accuracy is high but test accuracy is low.`,

  // Web development, the CSS box model
  `In the CSS box model, which property adds space **inside** an element, between its content and its border?

- \`gap\`
  > \`gap\` sets spacing *between* flex or grid children, not inside a single element.
- \`margin\`
  > \`margin\` adds space *outside* the border, pushing neighbouring elements away.
- [o] \`padding\`
  > \`padding\` is the space between the content and the border, inside the element's own box.
- \`border\`
  > \`border\` is the line drawn at the edge itself, not the space around the content.

Padding sits inside the border; margin sits outside it. A quick mnemonic: padding pads the content within the box, while margin marks the distance to everything else.`,

  // NLP, tokenization
  `In natural language processing, what does **tokenization** do?

- Reduces every word to its dictionary root
  > That describes stemming or lemmatization, which runs *after* the text has been tokenized.
- Removes common words like "the" and "is"
  > Dropping high-frequency words is stop-word removal, a separate optional cleaning step.
- Converts characters to lowercase
  > Lowercasing is a normalization step; it changes casing but does not divide the text into units.
- [o] Splits text into smaller units such as words or subwords
  > Tokenization breaks a raw string into the discrete pieces (tokens) that later steps like counting, embedding, or tagging operate on.

Tokenization is usually the first step in an NLP pipeline: it turns a continuous string into a sequence of tokens that models and counting methods can work with.`,
];
