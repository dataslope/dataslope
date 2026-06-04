// One-off: repair under-escaped string escapes in the starterCode/solutionCode
// template literals of the files listed on argv. These pages authored code as
// if it were raw source (single-backslash escapes like `"\n"`), but a JS
// template literal evaluates `\n` to a real newline — so the language received
// an illegal embedded newline. Re-encode each code body as a proper template
// literal (escape backslashes, backticks and ${) so the runtime gets the
// intended source. Only the code props are touched; instructions/prose/mermaid
// are left alone.
import * as fs from "node:fs";

function findClose(s, openBacktick) {
  for (let i = openBacktick + 1; i < s.length; i++) {
    if (s[i] === "\\") {
      i++;
      continue;
    }
    if (s[i] === "`") return i;
  }
  return -1;
}

// Treat the current body as the author's intended raw source and produce its
// correct template-literal encoding.
function encode(body) {
  return body
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

const PROP = /\b(starterCode|solutionCode)\s*=\s*\{\s*`/g;
let total = 0;

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
  let changed = 0;
  edits
    .sort((a, b) => b.start - a.start)
    .forEach(({ start, end }) => {
      const body = s.slice(start, end);
      const fixed = encode(body);
      if (fixed !== body) {
        s = s.slice(0, start) + fixed + s.slice(end);
        changed++;
      }
    });
  if (changed) {
    fs.writeFileSync(file, s);
    total += changed;
    console.log(`fixed ${changed} body(ies): ${file}`);
  }
}
console.log(`\n${total} code bodies re-encoded.`);
