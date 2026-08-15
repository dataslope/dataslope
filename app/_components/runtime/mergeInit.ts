// Merge an adapter's init code with the learner's entry code for one
// run() — adapters reset state per run, so init must share the same fresh
// scope. PHP is special: a second `<?php` while already in PHP mode is a
// parse error, so the entry's leading open tag is stripped.
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
