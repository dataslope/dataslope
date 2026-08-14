/**
 * Language adapters keyed by stable id (matching playgrounds.ts). Lets
 * MDX content reference an adapter by id string — MDX has no TypeScript
 * import surface of its own.
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
import { webAdapter } from "./web";
import { reactAdapter } from "./react";

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
  web: webAdapter,
  react: reactAdapter,
};

export type AdapterId = keyof typeof ADAPTERS;

export function getAdapterById(id: string): LanguageAdapter | undefined {
  return ADAPTERS[id];
}
