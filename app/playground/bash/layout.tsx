import type { ReactNode } from "react";

export const metadata = {
  title: "Bash Playground",
  description:
    "A real shell in your browser, in memory. Split it into terminals that share one filesystem, and learn the command line by using it. Nothing to install.",
};

export default function BashLayout({ children }: { children: ReactNode }) {
  return children;
}
