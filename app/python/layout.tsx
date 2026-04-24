import type { ReactNode } from "react";

export const metadata = {
  title: "Python Playground",
  description: "Run Python in the browser via Pyodide.",
};

export default function PythonLayout({ children }: { children: ReactNode }) {
  return children;
}
