/**
 * `next/dynamic` for a component registered in the MDX component map.
 *
 * Why the map's widgets are lazy at all is documented at the top of
 * `mdx-components.tsx`; this module exists only to keep one type assertion in
 * one explained place.
 *
 * The assertion: `dynamic()` returns `ComponentType`, a union whose
 * `ComponentClass` half MDX's `MDXComponents` map rejects (it wants something
 * callable, and a class has no string index signature). Every component routed
 * through here is a function component, so narrowing the type back loses
 * nothing and is checked by the `load` parameter, which still has to resolve to
 * a real component module.
 *
 * CALL THIS FROM A `"use client"` MODULE — `lazyWidgets.ts` or
 * `lazyReactDemos.ts`, which is where the split points live. The `import()`
 * has to be evaluated inside the client graph to become one; called from a
 * Server Component it type-checks, builds, and splits nothing. That module has
 * the full explanation. This file carries no directive of its own so either
 * graph can pull it in.
 */
import dynamic from "next/dynamic";
import type { ComponentType, JSX } from "react";

export function lazyWidget<P>(
  load: () => Promise<ComponentType<P> | { default: ComponentType<P> }>,
): (props: P) => JSX.Element {
  return dynamic(load) as (props: P) => JSX.Element;
}
