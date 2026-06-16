import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names, resolving conflicts so the last-wins rule of
 * Tailwind utilities is respected (e.g. `cn("px-2", "px-4")` → `"px-4"`).
 *
 * This is the standard shadcn / Magic UI helper. Magic UI component files
 * import it as `@/lib/utils`, which the `@/*` tsconfig path maps here.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
