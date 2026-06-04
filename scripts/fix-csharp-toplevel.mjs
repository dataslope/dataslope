// C# top-level programs require statements to PRECEDE type declarations
// (CS8803). Several csharp-linq-functional blocks declare a `record`/`class`/
// etc. before the statements that use it. Move every depth-0 type declaration
// (single-line positional record OR multi-line type with a body) to the end of
// its CodeBlock, after the statements. Brace-depth aware so nested/local types
// are left in place. Only csharp starterCode props are touched.
import * as fs from "node:fs";

function findClose(s, openBacktick) {
  for (let i = openBacktick + 1; i < s.length; i++) {
    if (s[i] === "\\") { i++; continue; }
    if (s[i] === "`") return i;
  }
  return -1;
}

const TYPE_OPEN =
  /^(?:public |internal |private |abstract |sealed |static |partial )*(record|class|struct|enum|interface)\b/;

function netBraces(line) {
  const code = line.replace(/\/\/.*$/, "");
  let d = 0;
  for (const ch of code) {
    if (ch === "{") d++;
    else if (ch === "}") d--;
  }
  return d;
}

// Returns { rebuilt, moved } — moves depth-0 type declarations to the end.
function reorder(body) {
  const lines = body.split("\n");
  const typeLineFlags = new Array(lines.length).fill(false);
  let depth = 0;
  let moved = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (depth === 0 && TYPE_OPEN.test(t)) {
      // Determine the span of this type declaration.
      let d = depth;
      let j = i;
      let sawBrace = false;
      for (; j < lines.length; j++) {
        const nb = netBraces(lines[j]);
        d += nb;
        if (lines[j].includes("{")) sawBrace = true;
        if (sawBrace && d <= depth) break; // body closed
        if (!sawBrace && /;\s*$/.test(lines[j].replace(/\/\/.*$/, ""))) break; // single-line decl
      }
      for (let k = i; k <= j && k < lines.length; k++) typeLineFlags[k] = true;
      moved++;
      depth += netBraces(lines[i]);
      // advance loop past this declaration
      for (let k = i + 1; k <= j && k < lines.length; k++) {
        depth += netBraces(lines[k]);
      }
      i = j;
      continue;
    }
    depth += netBraces(lines[i]);
  }
  if (moved === 0) return { rebuilt: body, moved: 0 };
  const kept = [];
  const types = [];
  for (let i = 0; i < lines.length; i++) {
    (typeLineFlags[i] ? types : kept).push(lines[i]);
  }
  while (kept.length && kept[kept.length - 1].trim() === "") kept.pop();
  while (types.length && types[0].trim() === "") types.shift();
  const rebuilt = kept.join("\n") + "\n\n" + types.join("\n") + "\n";
  return { rebuilt, moved };
}

const PROP = /\bstarterCode\s*=\s*\{\s*`/g;
const ADAPTER = /adapter="([^"]+)"/g;
let totalMoved = 0;

for (const file of process.argv.slice(2)) {
  let s = fs.readFileSync(file, "utf8");
  const adapters = [];
  let am;
  ADAPTER.lastIndex = 0;
  while ((am = ADAPTER.exec(s))) adapters.push({ i: am.index, a: am[1] });
  const edits = [];
  PROP.lastIndex = 0;
  let m;
  while ((m = PROP.exec(s))) {
    const open = m.index + m[0].length - 1;
    const close = findClose(s, open);
    if (close === -1) break;
    let a = null;
    for (const x of adapters) { if (x.i < m.index) a = x.a; else break; }
    if (a === "csharp") edits.push({ start: open + 1, end: close });
    PROP.lastIndex = close + 1;
  }
  let fileMoved = 0;
  edits
    .sort((x, y) => y.start - x.start)
    .forEach(({ start, end }) => {
      const { rebuilt, moved } = reorder(s.slice(start, end));
      if (moved) {
        s = s.slice(0, start) + rebuilt + s.slice(end);
        fileMoved += moved;
      }
    });
  if (fileMoved) {
    fs.writeFileSync(file, s);
    totalMoved += fileMoved;
    console.log(`${file}: moved ${fileMoved} type decl(s)`);
  }
}
console.log(`\nTotal type declarations relocated: ${totalMoved}`);
