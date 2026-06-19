/**
 * Content for the home page hero's interactive "try it" panel: one runnable
 * coding challenge per non-SQL language, one SQL challenge per dialect, and a
 * conceptual multiple-choice question. Kept as plain data so the hero
 * component stays presentational.
 */

import type { ChallengeTest } from "../challengeHarness";
import type { ChallengeFile } from "../ChallengeCard";
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

const GREETING_TESTS: ChallengeTest[] = [
  {
    id: "greeting",
    name: "Prints the greeting",
    description: "The program outputs exactly `Hello, Grace!`",
    expect: { stdoutEquals: "Hello, Grace!" },
  },
];

function greetInstructions(printPhrase: string): string {
  return `Write code that outputs exactly:

\`Hello, Grace!\`

Don't hardcode the whole string — a variable \`name\` is already set to \`"Grace"\`. Build the greeting from it using ${printPhrase}.`;
}

function greetMultiFile(file: string, callPhrase: string): string {
  return `Open \`${file}\` and implement \`greet\` so the program prints exactly:

\`Hello, Grace!\`

\`Main\` is provided — it ${callPhrase} and prints the result.`;
}

/**
 * The non-SQL code challenges, in dropdown order. The single-file languages
 * share the same "greet a name" task (graded on stdout, so it works on every
 * runtime); Java and C# use a small two-file workspace to show multi-file
 * support.
 */
export const CODE_CHALLENGES: HomeCodeChallenge[] = [
  {
    adapter: "python",
    label: "Python",
    title: "Greet a name",
    instructions: greetInstructions("an f-string, concatenation, or `.format()`"),
    files: [
      {
        filename: "main.py",
        starterCode: 'name = "Grace"\n# your code here\n',
        solutionCode: 'name = "Grace"\nprint(f"Hello, {name}!")\n',
      },
    ],
    tests: GREETING_TESTS,
  },
  {
    adapter: "r",
    label: "R",
    title: "Greet a name",
    instructions: greetInstructions("`paste0()` / `sprintf()` with `cat()`"),
    files: [
      {
        filename: "main.R",
        starterCode: 'name <- "Grace"\n# your code here\n',
        solutionCode: 'name <- "Grace"\ncat(sprintf("Hello, %s!\\n", name))\n',
      },
    ],
    tests: GREETING_TESTS,
  },
  {
    adapter: "javascript",
    label: "JavaScript",
    title: "Greet a name",
    instructions: greetInstructions("a template literal or concatenation"),
    files: [
      {
        filename: "main.js",
        starterCode: 'const name = "Grace";\n// your code here\n',
        solutionCode: 'const name = "Grace";\nconsole.log(`Hello, ${name}!`);\n',
      },
    ],
    tests: GREETING_TESTS,
  },
  {
    adapter: "typescript",
    label: "TypeScript",
    title: "Greet a name",
    instructions: greetInstructions("a template literal or concatenation"),
    files: [
      {
        filename: "main.ts",
        starterCode: 'const name: string = "Grace";\n// your code here\n',
        solutionCode:
          'const name: string = "Grace";\nconsole.log(`Hello, ${name}!`);\n',
      },
    ],
    tests: GREETING_TESTS,
  },
  {
    adapter: "php",
    label: "PHP",
    title: "Greet a name",
    instructions: greetInstructions("`echo` with string interpolation"),
    files: [
      {
        filename: "main.php",
        starterCode: '<?php\n$name = "Grace";\n// your code here\n',
        solutionCode: '<?php\n$name = "Grace";\necho "Hello, $name!\\n";\n',
      },
    ],
    tests: GREETING_TESTS,
  },
  {
    adapter: "c",
    label: "C",
    title: "Greet a name",
    instructions: greetInstructions("`printf` with a `%s` format specifier"),
    files: [
      {
        filename: "main.c",
        starterCode:
          '#include <stdio.h>\n\nint main(void) {\n    const char *name = "Grace";\n    /* your code here */\n    return 0;\n}\n',
        solutionCode:
          '#include <stdio.h>\n\nint main(void) {\n    const char *name = "Grace";\n    printf("Hello, %s!\\n", name);\n    return 0;\n}\n',
      },
    ],
    tests: GREETING_TESTS,
  },
  {
    adapter: "cpp",
    label: "C++",
    title: "Greet a name",
    instructions: greetInstructions("`std::cout` and the `<<` operator"),
    files: [
      {
        filename: "main.cpp",
        starterCode:
          '#include <iostream>\n#include <string>\n\nint main() {\n    std::string name = "Grace";\n    // your code here\n    return 0;\n}\n',
        solutionCode:
          '#include <iostream>\n#include <string>\n\nint main() {\n    std::string name = "Grace";\n    std::cout << "Hello, " << name << "!" << std::endl;\n    return 0;\n}\n',
      },
    ],
    tests: GREETING_TESTS,
  },
  {
    adapter: "java",
    label: "Java",
    title: "Greet a name",
    instructions: greetMultiFile("Greeter.java", "constructs a `Greeter`"),
    entryFilename: "Main.java",
    files: [
      {
        filename: "Main.java",
        starterCode:
          'public class Main {\n  public static void main(String[] args) {\n    Greeter greeter = new Greeter();\n    System.out.println(greeter.greet("Grace"));\n  }\n}\n',
      },
      {
        filename: "Greeter.java",
        starterCode:
          'public class Greeter {\n  public String greet(String name) {\n    // your code here\n    return "";\n  }\n}\n',
        solutionCode:
          'public class Greeter {\n  public String greet(String name) {\n    return "Hello, " + name + "!";\n  }\n}\n',
      },
    ],
    tests: GREETING_TESTS,
  },
  {
    adapter: "csharp",
    label: "C#",
    title: "Greet a name",
    instructions: greetMultiFile("Greeter.cs", "constructs a `Greeter`"),
    entryFilename: "Main.cs",
    files: [
      {
        filename: "Main.cs",
        starterCode:
          'var greeter = new Greeter();\nSystem.Console.WriteLine(greeter.Greet("Grace"));\n',
      },
      {
        filename: "Greeter.cs",
        starterCode:
          'public class Greeter\n{\n    public string Greet(string name)\n    {\n        // your code here\n        return "";\n    }\n}\n',
        solutionCode:
          'public class Greeter\n{\n    public string Greet(string name)\n    {\n        return $"Hello, {name}!";\n    }\n}\n',
      },
    ],
    tests: GREETING_TESTS,
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
  (6, 'Edsger', 'Research',    134000);`;

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

/**
 * One conceptual data-science / NLP multiple-choice question, authored in the
 * `<MultipleChoiceQuestion>` markdown format (`[o]` marks the correct choice;
 * `>` lines are per-choice explanations shown to every learner after they
 * answer). Per the repo's authoring rule, no explanation opens with an
 * affirmative word.
 */
export const CONCEPT_QUESTION = `In NLP, what does the **IDF** (inverse document frequency) factor in TF-IDF do?

- It boosts terms that appear many times within a single document
  > That effect comes from the TF (term-frequency) factor, which counts occurrences *within* one document. IDF is computed across the whole corpus and ignores within-document counts.
- [o] It down-weights terms that appear in many documents across the corpus
  > IDF, typically \`log(N / df)\`, scales a term's weight inversely to how many documents contain it, so ubiquitous words like "the" contribute little while rare, distinctive words count for more.
- It rescales each document vector to unit length
  > Length normalization (e.g. L2) is a separate, optional step applied after weighting — it is not what IDF computes.
- It turns raw counts into probabilities that sum to one
  > TF-IDF weights are not a probability distribution and need not sum to one.

TF-IDF multiplies a term's frequency in a document (TF) by its inverse document frequency (IDF). The IDF factor shrinks the influence of terms spread across many documents and amplifies rare, discriminative ones — which is why it is a workhorse weighting for search and text classification.`;
