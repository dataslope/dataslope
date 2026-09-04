/**
 * The single entry point for running a line in the embedded shells.
 *
 * Two jobs. just-bash lets a filesystem exception escape its redirect layer,
 * so a write rejected by the size caps in `gitFs.ts` would otherwise reject
 * `exec()` and take the terminal down with it; converting here keeps a failed
 * write looking like every other failed command.
 *
 * And `exec()` is scoped to one call — `cwd`, variables and functions are all
 * restored afterwards — so a session that wants to behave like a terminal has
 * to carry that state itself and pass it back in. `ShellSession` is that
 * carrier.
 */

import { Bash, InMemoryFs } from "just-bash/browser";

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  /**
   * The line could not be run because it is not finished: an `if` without
   * its `fi`, an open quote, a trailing `|`. Nothing was executed. A host
   * that can offer a continuation prompt keeps the line and asks for the
   * next; one that cannot shows the `stderr`, which carries bash's own
   * wording for the same situation.
   */
  incomplete?: boolean;
}

interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  rawScript?: boolean;
}

interface ExecCapable {
  exec: (
    command: string,
    options?: ExecOptions,
  ) => Promise<{
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    env?: Record<string, string>;
  }>;
}

/**
 * just-bash's execution limits are named for the option that raises them,
 * which is a fine message for the developer who set them and a baffling one
 * for a learner at a prompt. Reworded here, in both places a line can be run.
 */
function humaniseLimits(stderr: string): string {
  return stderr
    .replace(
      /too many commands executed \(>(\d+)\), increase executionLimits\.maxCommandCount/g,
      (_m, n: string) => `stopped after ${Number(n).toLocaleString("en-US")} commands to keep the page responsive`,
    )
    .replace(
      /(\S+) exceeded execution deadline \((\d+)ms\)/g,
      (_m, what: string, ms: string) =>
        `${what} stopped after ${Math.round(Number(ms) / 1000)} seconds to keep the page responsive`,
    )
    .replace(/(\S+) exceeded its execution deadline/g, "$1 stopped: the command ran too long for this playground")
    .replace(/, increase executionLimits\.\w+/g, "");
}

export async function runCommand(
  bash: ExecCapable,
  command: string,
  options?: ExecOptions,
): Promise<ShellResult> {
  try {
    const result = await bash.exec(command, options);
    return {
      stdout: result.stdout ?? "",
      stderr: humaniseLimits(result.stderr ?? ""),
      exitCode: result.exitCode ?? 0,
    };
  } catch (e) {
    return { stdout: "", stderr: `bash: ${(e as Error).message ?? String(e)}\n`, exitCode: 1 };
  }
}

// ─── Reading a line before it runs ────────────────────────────────────────

/** The parts of just-bash's AST this file looks at. Structural, because the
 *  browser entry point exports the parser only through `transform()`. */
interface WordPart {
  type: string;
  value?: string;
}
interface Word {
  type: "Word";
  parts: WordPart[];
}
interface Redirection {
  type: "Redirection";
  operator: string;
  target?: { type: string; terminated?: boolean };
}
interface FunctionDef {
  type: "FunctionDef";
  name: string;
}
interface SimpleCommand {
  type: "SimpleCommand";
  name: Word | null;
  args: Word[];
  redirections: Redirection[];
}
interface Group {
  type: "Group";
  body: Statement[];
}
type Command = FunctionDef | SimpleCommand | Group | { type: string };
interface Pipeline {
  type: "Pipeline";
  commands: Command[];
  negated: boolean;
}
interface Statement {
  type: "Statement";
  pipelines: Pipeline[];
  operators: string[];
  background: boolean;
}
interface Script {
  type: "Script";
  statements: Statement[];
}

/**
 * A parser and a printer, borrowed from a Bash instance that never runs
 * anything. `transform()` parses a script and serialises the AST back to
 * source, and a transform plugin can swap the AST out on the way: parking one
 * command node in `pending` and transforming a placeholder prints exactly
 * that command, in canonical form. It is how a definition gets remembered as
 * a definition rather than as the line it was typed on.
 */
let parser: Bash | null = null;
let printer: Bash | null = null;
const pending: { node: Command | null } = { node: null };

function tools(): { parser: Bash; printer: Bash } {
  if (!parser || !printer) {
    parser = new Bash({ fs: new InMemoryFs(), commands: [] });
    printer = new Bash({ fs: new InMemoryFs(), commands: [] });
    printer.registerTransformPlugin({
      name: "print-one-command",
      transform: ({ ast }) =>
        pending.node
          ? {
              ast: {
                ...ast,
                statements: [
                  {
                    type: "Statement",
                    pipelines: [{ type: "Pipeline", commands: [pending.node], negated: false }],
                    operators: [],
                    background: false,
                  },
                ],
              } as never,
            }
          : { ast },
    });
  }
  return { parser, printer };
}

/** Parse a line the way the shell will. Throws just-bash's parse error. */
export function parseLine(source: string): Script {
  return tools().parser.transform(source).ast as unknown as Script;
}

function print(node: Command): string {
  pending.node = node;
  try {
    return tools().printer.transform("true").script.trim();
  } finally {
    pending.node = null;
  }
}

/** The literal text of a word, or null when any part of it needs expanding. */
function literal(word: Word | null | undefined): string | null {
  if (!word) return null;
  let out = "";
  for (const part of word.parts) {
    if (part.type === "Literal" || part.type === "SingleQuoted") out += part.value ?? "";
    else if (part.type === "DoubleQuoted") return null;
    else return null;
  }
  return out;
}

/** The literal text a word starts with: `ll` in `ll='ls -l'`. */
function literalPrefix(word: Word): string {
  let out = "";
  for (const part of word.parts) {
    if (part.type !== "Literal") break;
    out += part.value ?? "";
  }
  return out;
}

const nameOf = (c: Command): string | null =>
  c.type === "SimpleCommand" ? literal((c as SimpleCommand).name) : null;

/** Every command at the top level of a script, and inside `{ }` groups, in
 *  source order. Bodies of `if`, loops and subshells are left alone: what a
 *  branch defines depends on whether it ran, and a subshell's definitions die
 *  with it. */
function topLevelCommands(statements: Statement[]): Command[] {
  const out: Command[] = [];
  for (const s of statements) {
    for (const p of s.pipelines) {
      for (const c of p.commands) {
        if (c.type === "Group") out.push(...topLevelCommands((c as Group).body));
        else out.push(c);
      }
    }
  }
  return out;
}

/**
 * Bash asks for more when a line cannot be complete: the parser ran out of
 * input inside a construct, or the line ends on an operator that needs a
 * right-hand side. Either reads as "incomplete" rather than as an error.
 */
const EOF_ERROR = /got EOF|unexpected EOF|unterminated here-document/i;

/** A trailing `|`, `&&`, `||` or an odd number of backslashes: the next
 *  line continues this one. Real bash prompts for it; just-bash accepts the
 *  line as it stands, so it is checked here first. */
function endsOpen(command: string): boolean {
  const line = command.replace(/\s+$/, "");
  if (/(\|\||&&|\|)$/.test(line)) return true;
  const slashes = /\\+$/.exec(line)?.[0].length ?? 0;
  return slashes % 2 === 1;
}

/**
 * Translate a just-bash parse error into what bash would print. The line
 * and column the parser reports are of the script it was handed, which here
 * is exactly the line the learner typed, so they need no correction.
 */
function syntaxError(message: string): string {
  const bare = message.replace(/^Parse error at \d+:\d+:\s*/, "").replace(/^line \d+:\s*/, "");
  if (EOF_ERROR.test(bare)) {
    const quote = /matching `(.)'/.exec(bare);
    return quote
      ? `bash: unexpected EOF while looking for matching \`${quote[1]}'\nbash: syntax error: unexpected end of file\n`
      : "bash: syntax error: unexpected end of file\n";
  }
  const expected = /^Expected (\w+), got (\w+)$/.exec(bare);
  if (expected) return `bash: syntax error near unexpected token \`${expected[2].toLowerCase()}'\n`;
  return `bash: ${bare}\n`;
}

/** Commands that read standard input when given nothing else. */
const STDIN_READERS = new Set([
  "cat", "sort", "uniq", "wc", "head", "tail", "nl", "tac", "rev", "tee", "less", "more",
  "tr", "cut", "paste", "column", "fold", "fmt", "od", "xxd", "base64", "md5sum", "sha256sum",
]);
/** Ones whose first positional argument is a pattern or expression, not a
 *  file, so a lone argument still means "read stdin". */
const PATTERN_FIRST = new Set(["grep", "egrep", "fgrep", "sed", "awk", "jq", "xargs", "tr", "cut", "paste"]);

/**
 * The first command of a pipeline that would wait on a keyboard. This
 * playground has no stdin, so `cat > notes.txt` returns at once with an empty
 * file and `read name` sets nothing, both silently. Returns the command's
 * name when a note about that is worth printing.
 */
function wantsStdin(script: Script): string | null {
  for (const s of script.statements) {
    for (const p of s.pipelines) {
      const first = p.commands[0];
      if (!first || first.type !== "SimpleCommand") continue;
      const cmd = first as SimpleCommand;
      const name = literal(cmd.name);
      if (!name) continue;
      if (cmd.redirections.some((r) => r.operator.startsWith("<"))) continue;
      const positional = cmd.args.filter((a) => !literalPrefix(a).startsWith("-"));
      if (name === "read") return name;
      const needed = PATTERN_FIRST.has(name) ? 1 : 0;
      if ((STDIN_READERS.has(name) || PATTERN_FIRST.has(name)) && positional.length <= needed) return name;
    }
  }
  return null;
}

// ─── The session ──────────────────────────────────────────────────────────

/** Caps on remembered definitions, so a session cannot grow an unbounded
 *  prelude that is re-parsed before every command. */
const MAX_DEFINITIONS = 64;
const MAX_PRELUDE_BYTES = 48 * 1024;

/** A shell's own idea of who is using it. `HOME` is added per session. */
const BASE_ENV: Record<string, string> = {
  USER: "user",
  LOGNAME: "user",
  SHELL: "/bin/bash",
  TERM: "xterm-256color",
  LANG: "C.UTF-8",
};

/**
 * Shell state that outlives a single `exec`: the working directory, the
 * environment, and any functions and aliases the learner defined. Without
 * this, `cd src` followed by `ls` would list the directory they started in.
 *
 * Definitions are remembered as definitions, printed from the parsed AST,
 * never as the line they arrived on. `greet(){ echo "hi $1"; }; greet a`
 * remembers `greet() { echo "hi $1"; }` and nothing else; an earlier version
 * kept the whole line and re-ran `greet a` (and any `>>` beside it) before
 * every later command.
 */
export class ShellSession {
  cwd: string;
  env: Record<string, string>;
  private functions = new Map<string, string>();
  private aliases = new Map<string, string>();

  /** `home` is what `~` and a bare `cd` mean: the session's root unless the
   *  caller says otherwise. Seeded here because the browser build of
   *  just-bash defaults HOME to `/` over a custom filesystem. */
  constructor(cwd: string, home = cwd) {
    this.cwd = cwd;
    this.env = { ...BASE_ENV, HOME: home };
  }

  /** What is run ahead of every line: aliases on, then every alias and
   *  function still defined, oldest first. */
  private prelude(): string {
    return ["shopt -s expand_aliases", ...this.aliases.values(), ...this.functions.values()].join("\n");
  }

  /**
   * Is this line finished? `null` when it is; otherwise the reason it is not,
   * for a host that wants to explain a continuation prompt. Pure: nothing is
   * run.
   */
  static incomplete(command: string): boolean {
    if (endsOpen(command)) return true;
    try {
      parseLine(command);
      return false;
    } catch (e) {
      return EOF_ERROR.test((e as Error).message ?? "");
    }
  }

  async run(bash: ExecCapable, command: string): Promise<ShellResult> {
    // Read the line first. An unfinished one is not run at all; a broken one
    // gets bash's wording rather than the parser's, and neither has to know
    // how long the prelude is.
    let script: Script | null = null;
    if (endsOpen(command)) {
      return { stdout: "", stderr: syntaxError("Expected more, got EOF"), exitCode: 2, incomplete: true };
    }
    try {
      script = parseLine(command);
    } catch (e) {
      const message = (e as Error).message ?? String(e);
      return {
        stdout: "",
        stderr: syntaxError(message),
        exitCode: 2,
        ...(EOF_ERROR.test(message) ? { incomplete: true } : {}),
      };
    }

    const source = `${this.prelude()}\n${command}`;
    let result: ShellResult;
    let env: Record<string, string> | undefined;
    try {
      const raw = await bash.exec(source, { cwd: this.cwd, env: this.env, rawScript: true });
      result = {
        stdout: raw.stdout ?? "",
        stderr: humaniseLimits(raw.stderr ?? ""),
        exitCode: raw.exitCode ?? 0,
      };
      env = raw.env;
    } catch (e) {
      return { stdout: "", stderr: `bash: ${(e as Error).message ?? String(e)}\n`, exitCode: 1 };
    }

    if (env) {
      this.env = { ...env };
      // `cd` is only visible through PWD, since exec restores its own cwd.
      if (env.PWD) this.cwd = env.PWD;
    }

    this.remember(script, env ?? {});

    const reader = wantsStdin(script);
    if (reader && !result.stdout && !result.stderr) {
      result.stderr = `bash: ${reader}: this playground has no standard input; give it a file, or pipe something into it\n`;
    }
    return result;
  }

  /** Update the definitions from what the line declared, in order, so a
   *  redefinition wins and an `unset -f` / `unalias` after it takes effect. */
  private remember(script: Script, env: Record<string, string>) {
    for (const c of topLevelCommands(script.statements)) {
      if (c.type === "FunctionDef") {
        const def = c as FunctionDef;
        this.functions.delete(def.name);
        this.functions.set(def.name, print(c));
        continue;
      }
      const name = nameOf(c);
      if (!name) continue;
      const cmd = c as SimpleCommand;
      if (name === "alias") {
        for (const arg of cmd.args) {
          const prefix = literalPrefix(arg);
          const eq = prefix.indexOf("=");
          if (eq <= 0) continue;
          const alias = prefix.slice(0, eq);
          this.aliases.delete(alias);
          this.aliases.set(alias, print({ ...cmd, args: [arg], redirections: [] }));
        }
      } else if (name === "unalias") {
        const words = cmd.args.map((a) => literal(a) ?? "");
        if (words.includes("-a")) this.aliases.clear();
        for (const w of words) this.aliases.delete(w);
      } else if (name === "unset") {
        const words = cmd.args.map((a) => literal(a) ?? "");
        const explicit = words.includes("-f");
        for (const w of words) {
          if (w.startsWith("-")) continue;
          // `unset name` takes the variable when there is one, else the
          // function; the environment that came back says which it was.
          if (explicit || !(w in env)) this.functions.delete(w);
        }
      }
    }
    this.trim();
  }

  private trim() {
    const drop = (map: Map<string, string>) => map.delete(map.keys().next().value as string);
    while (this.functions.size + this.aliases.size > MAX_DEFINITIONS) {
      drop(this.functions.size ? this.functions : this.aliases);
    }
    while (this.prelude().length > MAX_PRELUDE_BYTES && this.functions.size + this.aliases.size) {
      drop(this.functions.size ? this.functions : this.aliases);
    }
  }
}
