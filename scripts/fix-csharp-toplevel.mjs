// One-off: C# top-level programs require statements to PRECEDE type
// declarations (CS8803). Several csharp-linq-functional blocks declare a
// positional `record` right after the usings, before the statements. Move
// any single-line top-level type declaration to the end of the block.
import * as fs from "node:fs";

function findClose(s, openBacktick) {
  for (let i = openBacktick + 1; i < s.length; i++) {
    if (s[i] === "\\") { i++; continue; }
    if (s[i] === "`") return i;
  }
  return -1;
}

const TYPE_DECL =
  /^(?:public |internal |abstract |sealed )*(?:record|class|struct|enum|interface)\b.*;\s*$/;
const PROP = /\bstarterCode\s*=\s*\{\s*`/g;
let moved = 0;

for (const file of process.argv.slice(2)) {
  let s = fs.readFileSync(file, "utf8");
  const edits = [];
  PROP.lastIndex = 0;
  let m;
  while ((m = PROP.exec(s))) {
    const open = m.index + m[0].length - 1;
    const close = findClose(s, open);
    if (close === -1) break;
    edits.push({ start: open + 1, end: close });
    PROP.lastIndex = close + 1;
  }
  edits
    .sort((a, b) => b.start - a.start)
    .forEach(({ start, end }) => {
      const body = s.slice(start, end);
      const lines = body.split("\n");
      const decls = [];
      const kept = [];
      for (const ln of lines) {
        if (TYPE_DECL.test(ln.trim())) decls.push(ln.trim());
        else kept.push(ln);
      }
      if (decls.length === 0) return;
      // Trim trailing blank lines, then append the declarations.
      while (kept.length && kept[kept.length - 1].trim() === "") kept.pop();
      const rebuilt =
        kept.join("\n") + "\n\n" + decls.join("\n") + "\n";
      s = s.slice(0, start) + rebuilt + s.slice(end);
      moved += decls.length;
    });
  fs.writeFileSync(file, s);
}
console.log(`Moved ${moved} top-level type declaration(s) to end of block.`);
