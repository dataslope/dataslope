import type { ReactNode } from "react";

export const metadata = {
  title: "PHP Playground",
  description: "Run PHP in the browser via php-wasm.",
};

export default function PhpLayout({ children }: { children: ReactNode }) {
  return children;
}
