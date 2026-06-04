// Detect C# CodeBlocks that violate CS8803: a top-level program where a
// type declaration appears before a top-level statement. Brace-depth aware so
// statements *inside* a class/method body don't count as top-level.
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
  // crude: ignore braces in // comments; good enough for these snippets
  const code = line.replace(/\/\/.*$/, "");
  let d = 0;
  for (const ch of code) {
    if (ch === "{") d++;
    else if (ch === "}") d--;
  }
  return d;
}

function classifyBlock(body) {
  const lines = body.split("\n");
  let depth = 0;
  let firstTypeDecl = -1; // line idx of first depth-0 type declaration
  let lastStmt = -1; // line idx of last depth-0 executable statement
  lines.forEach((raw, i) => {
    const t = raw.trim();
    const atTop = depth === 0;
    if (atTop && t) {
      if (TYPE_OPEN.test(t)) {
        if (firstTypeDecl === -1) firstTypeDecl = i;
      } else if (
        !t.startsWith("using ") &&
        !t.startsWith("//") &&
        t !== "{" &&
        t !== "}" &&
        !/^namespace\b/.test(t)
      ) {
        lastStmt = i;
      }
    }
    depth += netBraces(raw);
  });
  const violates =
    firstTypeDecl !== -1 && lastStmt !== -1 && firstTypeDecl < lastStmt;
  return { violates, firstTypeDecl, lastStmt };
}

const PROP = /\bstarterCode\s*=\s*\{\s*`/g;
const ADAPTER = /adapter="([^"]+)"/g;

for (const file of process.argv.slice(2)) {
  const s = fs.readFileSync(file, "utf8");
  const adapters = [];
  let am;
  ADAPTER.lastIndex = 0;
  while ((am = ADAPTER.exec(s))) adapters.push({ i: am.index, a: am[1] });
  PROP.lastIndex = 0;
  let m;
  let idx = 0;
  const bad = [];
  while ((m = PROP.exec(s))) {
    idx++;
    const open = m.index + m[0].length - 1;
    const close = findClose(s, open);
    if (close === -1) break;
    let a = null;
    for (const x of adapters) { if (x.i < m.index) a = x.a; else break; }
    if (a === "csharp") {
      const { violates } = classifyBlock(s.slice(open + 1, close));
      if (violates) bad.push(idx);
    }
    PROP.lastIndex = close + 1;
  }
  if (bad.length) console.log(`${file}  → CS8803 in block(s) ${bad.join(", ")}`);
}
