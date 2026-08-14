/**
 * The orderings the two admin review galleries offer, in one place so both
 * agree on what each ordering means (and so the comparators are testable —
 * neither admin page renders in the Node test environment). Callers project
 * their own rows onto `Orderable`, so nothing here knows about charts or
 * illustrations.
 */

/** The minimum an artefact has to expose to be put in order. */
export interface Orderable {
  /** Stable identity: a chart slug, an illustration prompt id. Used as the
   *  tie-break, so every ordering here is total and therefore stable. */
  id: string;
  /** ISO-8601 UTC of the commit that introduced the artefact, or null when it
   *  has never been committed (or the clone has no history to read). */
  createdAt: string | null;
  /** Course or interview-track name, for the by-course ordering. */
  group: string;
}

/** The orderings, in the order the controls present them. */
export const ORDERINGS = ["alpha", "newest", "oldest", "course"] as const;

export type Ordering = (typeof ORDERINGS)[number];

/** Labels for the buttons, so the two galleries do not drift apart on wording. */
export const ORDERING_LABELS: Record<Ordering, string> = {
  alpha: "A→Z",
  newest: "Newest first",
  oldest: "Oldest first",
  course: "By course",
};

export function isOrdering(value: unknown): value is Ordering {
  return typeof value === "string" && (ORDERINGS as readonly string[]).includes(value);
}

/**
 * Compare by creation date, undated artefacts last, ids ascending.
 * `direction` flips ONLY the date comparison: undated rows are unknown rather
 * than old and belong at the end of both orderings, and same-second ties must
 * read A→Z in both — negating the whole result or swapping the arguments
 * breaks one of those. ISO-8601 UTC strings compare correctly as strings
 * (scripts/build-created-at.mjs normalises offsets away).
 */
export function compareCreated(a: Orderable, b: Orderable, direction: 1 | -1 = 1): number {
  if (a.createdAt && b.createdAt) {
    return direction * a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
  }
  if (a.createdAt) return -1;
  if (b.createdAt) return 1;
  return a.id.localeCompare(b.id);
}

/** The comparator for one ordering. Every one falls back to `id`, so a sort is
 *  stable and two runs over the same data agree. */
export function comparatorFor(ordering: Ordering): (a: Orderable, b: Orderable) => number {
  switch (ordering) {
    case "newest":
      return (a, b) => compareCreated(a, b, -1);
    case "oldest":
      return (a, b) => compareCreated(a, b, 1);
    case "course":
      return (a, b) => a.group.localeCompare(b.group) || a.id.localeCompare(b.id);
    case "alpha":
    default:
      return (a, b) => a.id.localeCompare(b.id);
  }
}

/** Sort a copy. The callers' arrays are fetched payloads and generated
 *  manifests that other code reads, so sorting in place would be a bug. */
export function orderBy<T>(
  rows: readonly T[],
  ordering: Ordering,
  project: (row: T) => Orderable,
): T[] {
  const compare = comparatorFor(ordering);
  return [...rows].sort((a, b) => compare(project(a), project(b)));
}
