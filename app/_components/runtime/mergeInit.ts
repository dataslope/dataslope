// Merge an adapter's "initialization code" with the learner's entry code
// into a single source string for one `run()`.
//
// Every adapter resets state at the start of run(), so init can't be a
// separate execution, it's prepended so it shares the same fresh scope as
// the user code. For most languages that's a plain newline join.
//
// PHP is special: both the init block and the user's snippet conventionally
// open with `<?php`. Concatenating them verbatim yields two `<?php` tags in
// one script, and a second `<?php` while already in PHP mode is a parse
// error (`<` is the less-than operator there), so the whole run aborts
// before producing any output. We strip the redundant leading open tag from
// the entry code so the merged script stays in the PHP mode that init opened.
export function mergeInitAndEntry(
  adapterId: string,
  init: string,
  entry: string,
): string {
  if (adapterId === "php") {
    const withoutOpenTag = entry.replace(/^﻿?\s*<\?php\b/, "");
    return `${init}\n${withoutOpenTag}`;
  }
  return `${init}\n${entry}`;
}
