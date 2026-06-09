import type { ReactNode } from "react";

export const metadata = {
  title: "PostgreSQL Playground",
  description:
    "Browser-based PostgreSQL playground powered by PGlite — run real Postgres queries against sample databases entirely in your browser.",
};

export default function PostgresLayout({ children }: { children: ReactNode }) {
  return children;
}
