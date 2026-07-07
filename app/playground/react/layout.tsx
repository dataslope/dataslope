import type { ReactNode } from "react";

export const metadata = {
  title: "React Playground",
  description:
    "Write React with TypeScript JSX — compiled and bundled entirely in your browser with a live preview.",
};

export default function ReactLayout({ children }: { children: ReactNode }) {
  return children;
}
