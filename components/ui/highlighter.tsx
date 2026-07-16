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

    const opts = {
      type: action,
      color,
      strokeWidth,
      iterations,
      padding,
      multiline,
    } as const;

    // Only the FIRST draw animates; later repositions are instant (see below).
    const annotation = annotate(element, { ...opts, animationDuration });
    annotation.show();

    // rough-notation draws the annotation to fit the element's current
    // document-space box. It does NOT follow the element when later reflows
    // (font loads, wrapping changes, window resizes) move or resize it, the
    // drawing is left stranded in its old spot. So we re-draw whenever the
    // element's own geometry actually changes.
    //
    // Geometry is measured in DOCUMENT space (rect + scroll offset), so
    // scrolling alone never moves it and unrelated layout changes elsewhere on
    // the page are ignored. The measurements are kept fractional (no rounding)
    // and compared with a 1px tolerance, because getBoundingClientRect() and
    // window.scrollY drift by sub-pixel amounts during a scroll, and rounding
    // that drift would otherwise flip the value by ±1 and trigger a needless
    // re-draw on almost every scroll frame.
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
        // Reposition by re-rendering the SAME annotation instance: calling
        // show() on a mark that's already showing clears and redraws it,
        // without animation, reusing rough-notation's per-instance random
        // seed. So the hand-drawn shape is IDENTICAL and simply snaps to the
        // element's new box. (Creating a fresh annotation, as we used to,
        // rolls a NEW seed and visibly re-sketches the mark, which read as a
        // flicker on every scroll once the sticky header's shrink-on-scroll
        // started moving the text.)
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

  // The annotated element is the INNER span; rough-notation inserts its
  // absolutely-positioned <svg> overlay as a sibling of the annotated element
  // (with top:0/left:0), so the sibling lands inside the OUTER span, whose
  // `relative` makes it the svg's containing block. That anchors the drawing
  // to the text itself. Annotating the outer span instead (as this component
  // originally did) puts the svg outside it, anchored to whatever ancestor
  // happens to be a containing block — and that ancestor can change out from
  // under the finished drawing: while a BlurFade entrance animates, the
  // motion wrapper's inline transform/filter make it the containing block,
  // and when motion clears them on settle the svg re-anchors to the document
  // origin, snapping the drawing hundreds of pixels away from the text (seen
  // on mobile as the hero tagline's underline jumping up into the marquee).
  // The geometry watcher above can't catch that: the text never moves.
  return (
    <span className="relative inline-block bg-transparent">
      <span ref={elementRef}>{children}</span>
    </span>
  );
}
