import type { ReactNode } from "react";

export const metadata = {
  title: "SQLite Playground",
  description: "Run SQLite queries against in-browser sample databases via sqlite-wasm.",
};

export default function SqliteLayout({ children }: { children: ReactNode }) {
  return children;
}
