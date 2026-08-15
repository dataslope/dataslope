/**
 * The single entry point for running a line in the Git playground's shell.
 *
 * just-bash lets a filesystem exception escape its redirect layer, so a write
 * rejected by the size caps in `gitFs.ts` would otherwise reject `exec()` and
 * take the terminal down with it. Converting here keeps a failed write looking
 * like every other failed command: stderr plus a non-zero exit code.
 */

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface ExecCapable {
  exec: (command: string) => Promise<{ stdout?: string; stderr?: string; exitCode?: number }>;
}

export async function runCommand(bash: ExecCapable, command: string): Promise<ShellResult> {
  try {
    const result = await bash.exec(command);
    return {
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: result.exitCode ?? 0,
    };
  } catch (e) {
    return { stdout: "", stderr: `bash: ${(e as Error).message ?? String(e)}\n`, exitCode: 1 };
  }
}
