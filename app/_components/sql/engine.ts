"use client";

import type { SqliteEngine } from "../runtime/sqlite";

let _engine: SqliteEngine | null = null;

export function getEngine(): SqliteEngine | null {
  return _engine;
}

export function setEngine(engine: SqliteEngine | null): void {
  _engine = engine;
}
