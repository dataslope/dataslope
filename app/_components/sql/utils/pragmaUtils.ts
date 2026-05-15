import type { SqliteEngine } from "../../runtime/sqlite";
import type { PragmaSettings } from "../stores/usePragmaStore";

const PRAGMA_SYNC_MAP: Record<string, string> = {
  off: "0",
  normal: "1",
  full: "2",
};

const PRAGMA_PAGE_SIZE_MIN = 512;
const PRAGMA_PAGE_SIZE_MAX = 65536;

export async function applyPragmasToEngine(
  engine: SqliteEngine,
  p: PragmaSettings,
): Promise<void> {
  const statements: string[] = [
    `PRAGMA foreign_keys = ${p.foreignKeys ? "ON" : "OFF"}`,
    `PRAGMA journal_mode = ${p.journalMode}`,
    `PRAGMA synchronous = ${PRAGMA_SYNC_MAP[p.synchronous] ?? "2"}`,
    `PRAGMA page_size = ${Math.max(PRAGMA_PAGE_SIZE_MIN, Math.min(PRAGMA_PAGE_SIZE_MAX, p.pageSize))}`,
    `PRAGMA automatic_index = ${p.automaticIndex ? "ON" : "OFF"}`,
    `PRAGMA case_sensitive_like = ${p.caseSensitiveLike ? "ON" : "OFF"}`,
  ];
  for (const sql of statements) {
    try {
      await engine.exec(sql);
    } catch {
      // Silently ignore unsupported pragmas (e.g. page_size on a non-empty db).
    }
  }
}
