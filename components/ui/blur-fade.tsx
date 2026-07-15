"use client"

import { useRef } from "react"
import {
  AnimatePresence,
  motion,
  useInView,
  type MotionProps,
  type UseInViewOptions,
  type Variants,
} from "motion/react"

type MarginType = UseInViewOptions["margin"]

interface BlurFadeProps extends MotionProps {
  children: React.ReactNode
  className?: string
  variant?: {
    hidden: { y: number }
    visible: { y: number }
  }
  duration?: number
  delay?: number
  offset?: number
  direction?: "up" | "down" | "left" | "right"
  inView?: boolean
  inViewMargin?: MarginType
  blur?: string
}

const getFilter = (v: Variants[string]) =>
  typeof v === "function" ? undefined : v.filter

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  offset = 6,
  direction = "down",
  inView = false,
  inViewMargin = "-50px",
  blur = "6px",
  ...props
}: BlurFadeProps) {
  const ref = useRef(null)
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin })
  const isInView = !inView || inViewResult
  // Axis props are built as plain objects (not a computed `[x|y]:` key inside
  // the variant literal): a computed key collapses the variant's type to a
  // string index signature, which can't hold the nested `transitionEnd`
  // object below.
  const offsetAxis =
    direction === "left" || direction === "right"
      ? { x: direction === "right" ? -offset : offset }
      : { y: direction === "down" ? -offset : offset }
  const restAxis =
    direction === "left" || direction === "right" ? { x: 0 } : { y: 0 }
  const defaultVariants: Variants = {
    hidden: {
      ...offsetAxis,
      opacity: 0,
      filter: `blur(${blur})`,
    },
    visible: {
      ...restAxis,
      opacity: 1,
      filter: `blur(0px)`,
      // Once the entrance settles, drop the filter entirely. Motion keeps the
      // last keyframe as an inline style, so without this the wrapper carries
      // `filter: blur(0px)` forever — and any filter, even an identity blur,
      // routes the subtree through a compositor effect node backed by a cached
      // texture. With an infinite composited animation inside (the hero
      // marquee), Chromium can redraw that texture stale and misplaced during
      // unrelated partial repaints (e.g. hovering the sticky header),
      // ghosting a slice of marquee text elsewhere on the page.
      transitionEnd: { filter: "none" },
    },
  }
  const combinedVariants = variant ?? defaultVariants

  const hiddenFilter = getFilter(combinedVariants.hidden)
  const visibleFilter = getFilter(combinedVariants.visible)

  const shouldTransitionFilter =
    hiddenFilter != null &&
    visibleFilter != null &&
    hiddenFilter !== visibleFilter

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        exit="hidden"
        variants={combinedVariants}
        transition={{
          delay: 0.04 + delay,
          duration,
          ease: "easeOut",
          ...(shouldTransitionFilter ? { filter: { duration } } : {}),
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
