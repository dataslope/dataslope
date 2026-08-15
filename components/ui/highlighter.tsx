"use client";

import { useLayoutEffect, useRef } from "react";
import type React from "react";
import { useInView } from "motion/react";
import { annotate } from "rough-notation";

type AnnotationAction =
  | "highlight"
  | "underline"
  | "box"
  | "circle"
  | "strike-through"
  | "crossed-off"
  | "bracket";

interface HighlighterProps {
  children: React.ReactNode;
  action?: AnnotationAction;
  color?: string;
  strokeWidth?: number;
  animationDuration?: number;
  iterations?: number;
  padding?: number;
  multiline?: boolean;
  isView?: boolean;
}

export function Highlighter({
  children,
  action = "highlight",
  color = "#ffd1dc",
  strokeWidth = 1.5,
  animationDuration = 600,
  iterations = 2,
  padding = 2,
  multiline = true,
  isView = false,
}: HighlighterProps) {
  const elementRef = useRef<HTMLSpanElement>(null);

  const isInView = useInView(elementRef, {
    once: true,
    margin: "-10%",
  });

  const shouldShow = !isView || isInView;

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!shouldShow || !element) return;

    const opts = {
      type: action,
      color,
      strokeWidth,
      iterations,
      padding,
      multiline,
    } as const;

    // Only the first draw animates; later repositions are instant.
    const annotation = annotate(element, { ...opts, animationDuration });
    annotation.show();

    // rough-notation doesn't follow the element after later reflows (font
    // loads, wrapping, resizes), so re-draw when its geometry changes.
    // Measure in document space so scrolling alone never triggers, and compare
    // with 1px tolerance: rect/scrollY drift sub-pixel during scroll, so
    // rounding would flip values and force a re-draw nearly every frame.
    const geometry = (): [number, number, number, number] => {
      const r = element.getBoundingClientRect();
      return [r.left + window.scrollX, r.top + window.scrollY, r.width, r.height];
    };
    const moved = (
      a: [number, number, number, number],
      b: [number, number, number, number],
    ) => a.some((v, i) => Math.abs(v - b[i]) > 1);

    let cancelled = false;
    let frame = 0;
    let last = geometry();
    const redraw = () => {
      cancelAnimationFrame(frame);
      // Coalesce bursts (e.g. continuous resize) into a single re-draw.
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        const next = geometry();
        if (!moved(last, next)) return;
        last = next;
        // Re-show the SAME annotation instance: it redraws instantly with the
        // same random seed, so the shape just snaps to the new box. A fresh
        // annotation would roll a new seed and visibly re-sketch (flicker).
        annotation.show();
      });
    };

    const resizeObserver = new ResizeObserver(redraw);
    resizeObserver.observe(element);
    // Catch reflows that move the element without resizing it.
    resizeObserver.observe(document.body);
    window.addEventListener("resize", redraw);
    // Late-loading web fonts can shift the text; reposition once ready.
    document.fonts?.ready.then(redraw).catch(() => {});

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", redraw);
      resizeObserver.disconnect();
      annotation.remove();
    };
  }, [
    shouldShow,
    action,
    color,
    strokeWidth,
    animationDuration,
    iterations,
    padding,
    multiline,
  ]);

  // Annotate the INNER span: rough-notation inserts its absolute <svg> as a
  // sibling, so it lands inside the outer `relative` span and stays anchored
  // to the text. Annotating the outer span would anchor the svg to whichever
  // ancestor is the containing block — which changes when a motion wrapper
  // clears its inline transform on settle, snapping the drawing far from the
  // text without the text ever moving (so the geometry watcher can't catch it).
  return (
    <span className="relative inline-block bg-transparent">
      <span ref={elementRef}>{children}</span>
    </span>
  );
}
