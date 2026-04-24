import type { ReactNode } from "react";

export const metadata = {
  title: "R Playground",
  description: "Run R in the browser via WebR.",
};

export default function RLayout({ children }: { children: ReactNode }) {
  return children;
}
