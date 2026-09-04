/**
 * What bash would offer for a partly typed path.
 *
 * The word is resolved the way the reader typed it: its directory part
 * against the working directory, then one level of entries inside that.
 * `cat sr<Tab>` gives `src/`, and a second Tab walks into it, because the
 * lookup re-runs against `src/` rather than against a list fixed at the
 * current directory. Directories keep their trailing slash so completion
 * knows not to finish the word.
 *
 * Files and directories both count: an empty directory has no file beneath
 * it to infer it from, which is why the session reports directories too.
 * Absolute and `..` paths are left alone; a lesson types relative ones.
 */
export function makePathCompleter(
  files: string[],
  dirs: string[],
  cwd: string,
  root: string,
): (word: string) => string[] {
  const rel = cwd.startsWith(root) ? cwd.slice(root.length + 1) : "";
  return (word: string) => {
    const slash = word.lastIndexOf("/");
    const dir = slash === -1 ? "" : word.slice(0, slash + 1);
    const stem = slash === -1 ? word : word.slice(slash + 1);
    const base = `${rel ? `${rel}/` : ""}${dir}`;
    const entries = new Set<string>();
    const consider = (path: string, isDir: boolean) => {
      if (!path.startsWith(base)) return;
      const under = path.slice(base.length);
      const cut = under.indexOf("/");
      // Anything with a separator still in it lives deeper: only its first
      // segment belongs here, and that segment is a directory.
      const entry = cut === -1 ? (isDir ? `${under}/` : under) : `${under.slice(0, cut)}/`;
      if (entry && entry !== "/" && entry.startsWith(stem)) entries.add(dir + entry);
    };
    for (const path of files) consider(path, false);
    for (const path of dirs) consider(path, true);
    return [...entries];
  };
}
