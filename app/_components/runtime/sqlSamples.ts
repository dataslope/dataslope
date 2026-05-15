"use client";

export interface QueryTabSeed {
  /** Human-readable title shown in the tab strip. */
  title: string;
  /** Initial SQL contents of the tab. */
  code: string;
}

export interface SqlSampleCatalogEntry {
  id: string;
  label: string;
  filename: string;
  description: string;
  defaultTabs: QueryTabSeed[];
}

export function findSqlSample<T extends SqlSampleCatalogEntry>(
  samples: readonly T[],
  blankSample: T | null,
  id: string,
): T {
  if (blankSample && id === blankSample.id) return blankSample;
  return samples.find((sample) => sample.id === id) ?? samples[0];
}

export function createBlankSqlSample<T extends SqlSampleCatalogEntry>(
  sample: Omit<T, "defaultTabs"> & { defaultTabs?: QueryTabSeed[] },
): T {
  return {
    ...sample,
    defaultTabs: sample.defaultTabs ?? [{ title: "Query 1", code: "" }],
  } as T;
}
