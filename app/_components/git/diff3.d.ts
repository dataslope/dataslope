/** Minimal typing for the `diff3` package isomorphic-git already depends on
 *  and the playground's merge driver reuses for its three-way file merge. */
declare module "diff3" {
  interface Diff3Region {
    ok?: string[];
    conflict?: { a: string[]; aIndex: number; o: string[]; oIndex: number; b: string[]; bIndex: number };
  }
  export default function diff3Merge(a: string[], o: string[], b: string[]): Diff3Region[];
}
