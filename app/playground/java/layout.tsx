import type { ReactNode } from "react";

export const metadata = {
  title: "Java Playground",
  description: "Compile and run Java in the browser via CheerpJ (OpenJDK).",
};

export default function JavaLayout({ children }: { children: ReactNode }) {
  return children;
}
