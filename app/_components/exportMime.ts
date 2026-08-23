/**
 * One answer to "what type is this file?", for every path that hands the
 * browser a download.
 *
 * The Export dropdown was reading the adapter's declared MIME type while
 * the Files rail's Download hard-coded `text/plain`, so the same `Main.java`
 * arrived as `text/x-java-source` from one menu and `text/plain` from the
 * other — and an OS that files downloads by type put them in two places.
 */

import type { LanguageAdapter } from "./types";

/** MIME type the adapter declares for a file, falling back to plain text. */
export function mimeTypeForFilename(
  adapter: LanguageAdapter,
  filename: string,
): string {
  const formats =
    adapter.exportFormatsForFile?.(filename) ?? adapter.exportFormats;
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return "text/plain";
  const extension = filename.slice(dot + 1).toLowerCase();
  const match = formats.find((f) => f.extension.toLowerCase() === extension);
  return match?.mimeType ?? "text/plain";
}
