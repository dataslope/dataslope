// Registry of available language playgrounds. Used by the header
// dropdown so users can navigate between playgrounds, and by any other
// component that needs the canonical list (e.g. the landing page in the
// future). Keep in sync with the routes defined under `app/<id>/`.

export interface PlaygroundEntry {
  /** Stable id matching the LanguageAdapter id and the route segment. */
  id: string;
  /** Human-readable name shown in the dropdown / header. */
  label: string;
  /** Route the dropdown navigates to. */
  href: string;
}

export const PLAYGROUNDS: PlaygroundEntry[] = [
  { id: "python", label: "Python Playground", href: "/python" },
  { id: "r", label: "R Playground", href: "/r" },
  { id: "javascript", label: "JavaScript Playground", href: "/javascript" },
  { id: "typescript", label: "TypeScript Playground", href: "/typescript" },
  { id: "php", label: "PHP Playground", href: "/php" },
  { id: "c", label: "C Playground", href: "/c" },
];
