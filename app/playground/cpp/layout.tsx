import type { ReactNode } from "react";

export const metadata = {
  title: "C++ Playground",
  description: "Compile and run C++ in the browser via clang (WebAssembly).",
};

export default function CppLayout({ children }: { children: ReactNode }) {
  return children;
}
