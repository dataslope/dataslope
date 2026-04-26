import type { ReactNode } from "react";

export const metadata = {
  title: "C# Playground",
  description:
    "Run C# in the browser via Roslyn on the .NET WebAssembly runtime.",
};

export default function CSharpLayout({ children }: { children: ReactNode }) {
  return children;
}
