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

  // If isView is false, always show. If isView is true, wait for inView
  const shouldShow = !isView || isInView;

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!shouldShow || !element) return;

    const annotation = annotate(element, {
      type: action,
      color,
      strokeWidth,
      animationDuration,
      iterations,
      padding,
      multiline,
    });
    annotation.show();

    // rough-notation draws the annotation to fit the element's current
    // document-space box. It does NOT follow the element when later reflows
    // (font loads, wrapping changes, window resizes) move or resize it, the
    // drawing is left stranded in its old spot. So we re-draw whenever the
    // element's own geometry actually changes.
    //
    // Geometry is measured in DOCUMENT space (rect + scroll offset), which
    // means: (a) scrolling alone never triggers a re-draw, rough-notation is
    // already positioned in document space, so it tracks scroll for free, and
    // (b) unrelated layout changes that don't move this element (e.g. an FAQ
    // accordion opening further down the page) are correctly ignored.
    const geometry = () => {
      const r = element.getBoundingClientRect();
      return [
        Math.round(r.left + window.scrollX),
        Math.round(r.top + window.scrollY),
        Math.round(r.width),
        Math.round(r.height),
      ].join(",");
    };

    let cancelled = false;
    let frame = 0;
    let last = geometry();
    const redraw = () => {
      cancelAnimationFrame(frame);
      // Coalesce bursts (e.g. continuous resize) into a single re-draw.
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        const next = geometry();
        if (next === last) return;
        last = next;
        annotation.hide();
        annotation.show();
      });
    };

    const resizeObserver = new ResizeObserver(redraw);
    resizeObserver.observe(element);
    // Catch reflows that move the element without resizing it (the geometry
    // guard above keeps this from causing needless re-draws).
    resizeObserver.observe(document.body);
    window.addEventListener("resize", redraw);
    // Web fonts can load after first paint and shift the text; reposition once
    // they're ready.
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

  return (
    <span ref={elementRef} className="relative inline-block bg-transparent">
      {children}
    </span>
  );
}
