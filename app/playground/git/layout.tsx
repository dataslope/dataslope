import type { ReactNode } from "react";

export const metadata = {
  title: "Git Playground",
  description:
    "Learn Git in your browser: a real shell, a real repository, and live views of the working tree, index, and commit graph. Nothing to install.",
};

export default function GitLayout({ children }: { children: ReactNode }) {
  return children;
}
