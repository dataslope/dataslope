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

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
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

export async function runCommand(
  bash: ExecCapable,
  command: string,
  options?: ExecOptions,
): Promise<ShellResult> {
  try {
    const result = await bash.exec(command, options);
    return {
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: result.exitCode ?? 0,
    };
  } catch (e) {
    return { stdout: "", stderr: `bash: ${(e as Error).message ?? String(e)}\n`, exitCode: 1 };
  }
}

/** A function definition is a pure declaration, so replaying it before the
 *  next command is safe in a way replaying arbitrary history is not. */
const FUNCTION_DEF = /^\s*(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)\s*\{/;

/** Cap on remembered definitions, so a session cannot grow an unbounded
 *  prelude that is re-parsed before every command. */
const MAX_FUNCTIONS = 32;

/**
 * Shell state that outlives a single `exec`: the working directory, the
 * environment, and any functions the learner defined. Without this, `cd src`
 * followed by `ls` would list the directory they started in.
 */
export class ShellSession {
  cwd: string;
  env: Record<string, string>;
  private functions = new Map<string, string>();

  /** `home` is what `~` and a bare `cd` mean: the session's root unless the
   *  caller says otherwise. Seeded here because the browser build of
   *  just-bash defaults HOME to `/` over a custom filesystem. */
  constructor(cwd: string, home = cwd) {
    this.cwd = cwd;
    this.env = { HOME: home };
  }

  async run(bash: ExecCapable, command: string): Promise<ShellResult> {
    const prelude = [...this.functions.values()].join("\n");
    const script = prelude ? `${prelude}\n${command}` : command;

    let result: ShellResult;
    let env: Record<string, string> | undefined;
    try {
      const raw = await bash.exec(script, { cwd: this.cwd, env: this.env });
      result = {
        stdout: raw.stdout ?? "",
        stderr: raw.stderr ?? "",
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

    const declared = FUNCTION_DEF.exec(command);
    if (declared && result.exitCode === 0) {
      // Re-setting an existing name keeps the latest definition, and keeps
      // insertion order stable for everything else.
      this.functions.delete(declared[1]);
      this.functions.set(declared[1], command);
      while (this.functions.size > MAX_FUNCTIONS) {
        this.functions.delete(this.functions.keys().next().value as string);
      }
    }
    return result;
  }
}
