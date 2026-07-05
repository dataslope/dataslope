import type { ReactNode } from "react";

export const metadata = {
  title: "JavaScript Playground",
  description: "Run JavaScript natively in the browser.",
};

export default function JavascriptLayout({ children }: { children: ReactNode }) {
  return children;
}
