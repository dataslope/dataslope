import type { ReactNode } from "react";

export const metadata = {
  title: "HTML Playground",
  description:
    "Build web pages with a live sandboxed preview, HTML, CSS, and JavaScript run natively in your browser.",
};

export default function WebLayout({ children }: { children: ReactNode }) {
  return children;
}
