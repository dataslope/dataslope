import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/site";
import PlaygroundIndex from "./PlaygroundIndex";

const PLAYGROUND_DESCRIPTION =
  "Free online coding playgrounds that run entirely in your browser, Python, R, SQL, JavaScript, TypeScript, HTML/CSS, React, PHP, C, C++, Java, and C#. No sign-up, no install, powered by WebAssembly. Your workspaces save on this device and back up to the cloud.";

export const metadata: Metadata = {
  title: "Online Coding Playgrounds",
  description: PLAYGROUND_DESCRIPTION,
  alternates: { canonical: "/playground" },
  openGraph: {
    type: "website",
    url: "/playground",
    siteName: "DataSlope",
    title: "Online Coding Playgrounds · DataSlope",
    description: PLAYGROUND_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Coding Playgrounds · DataSlope",
    description: PLAYGROUND_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

// The interactive workspace manager + language launcher is a client component
// (it reads the local OPFS registry, the signed-in user's cloud saves, and
// personalizes after hydration). This server component keeps the page's
// metadata + canonical URL so the route stays a strong search-landing page.
export default function PlaygroundHome() {
  return <PlaygroundIndex />;
}
