/**
 * `next/dynamic` for a component in the MDX component map, keeping one type
 * assertion in one place: `dynamic()` returns `ComponentType`, whose class
 * half MDX's `MDXComponents` rejects; everything routed through here is a
 * function component, so narrowing back loses nothing. CALL THIS FROM A
 * `"use client"` MODULE (lazyWidgets.ts / lazyReactDemos.ts) — from a Server
 * Component it type-checks, builds, and splits nothing. No directive of its
 * own so either graph can pull it in.
 */
import dynamic from "next/dynamic";
import type { ComponentType, JSX } from "react";

export function lazyWidget<P>(
  load: () => Promise<ComponentType<P> | { default: ComponentType<P> }>,
): (props: P) => JSX.Element {
  return dynamic(load) as (props: P) => JSX.Element;
}
