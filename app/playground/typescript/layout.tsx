import type { ReactNode } from "react";

export const metadata = {
  title: "TypeScript Playground",
  description: "Transpile TypeScript in the browser, then run it natively.",
};

export default function TypescriptLayout({ children }: { children: ReactNode }) {
  return children;
}
