// Opt this route into Tailwind + the Magic UI components. Importing the shared
// stylesheet here scopes it to the /magicui-demo bundle (see app/magicui.css).
import "@/app/magicui.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Magic UI Demo",
  description: "Magic UI components rendering outside /learn and /playground.",
};

export default function MagicUIDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
