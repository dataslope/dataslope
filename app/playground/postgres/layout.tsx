import type { ReactNode } from "react";

export const metadata = {
  title: "PostgreSQL Playground",
  description: "Mock PostgreSQL playground shell for future browser-based query execution.",
};

export default function PostgresLayout({ children }: { children: ReactNode }) {
  return children;
}
