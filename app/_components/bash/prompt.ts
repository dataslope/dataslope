import { SESSION_ROOTS } from "../git/protocol";

/** Where a shell session starts, and what `~` stands for in its prompt. */
export const HOME = SESSION_ROOTS.bash;

/**
 * bash's `\w`: the working directory, with the home directory written as `~`.
 *
 * `/home/user` is `~`, `/home/user/src` is `~/src`, and anywhere outside the
 * home directory keeps its absolute path, which is what a real prompt does
 * and why `pwd` still answers with the full path.
 */
export function displayCwd(cwd: string): string {
  if (cwd === HOME) return "~";
  if (cwd.startsWith(`${HOME}/`)) return `~${cwd.slice(HOME.length)}`;
  return cwd;
}
