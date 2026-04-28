/**
 * Centralized lookup of the language adapters keyed by their stable
 * id (matching the entries in `playgrounds.ts` and the adapter
 * implementations under `runtime/`).
 *
 * Used by `MdxCodeBlock` so MDX content can reference an adapter by
 * its short id string (e.g. `"python"`) instead of importing the
 * adapter module directly — MDX content has no TypeScript import
 * surface of its own.
 */
import type { LanguageAdapter } from "../types";
import { pythonAdapter } from "./python";
import { rAdapter } from "./r";
import { javascriptAdapter } from "./javascript";
import { typescriptAdapter } from "./typescript";
import { phpAdapter } from "./php";
import { cAdapter } from "./c";
import { cppAdapter } from "./cpp";
import { javaAdapter } from "./java";
import { csharpAdapter } from "./csharp";

export const ADAPTERS: Record<string, LanguageAdapter> = {
  python: pythonAdapter,
  r: rAdapter,
  javascript: javascriptAdapter,
  typescript: typescriptAdapter,
  php: phpAdapter,
  c: cAdapter,
  cpp: cppAdapter,
  java: javaAdapter,
  csharp: csharpAdapter,
};

export type AdapterId = keyof typeof ADAPTERS;

export function getAdapterById(id: string): LanguageAdapter | undefined {
  return ADAPTERS[id];
}
