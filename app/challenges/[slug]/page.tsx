// Full-page challenge workspace (/challenges/<slug>).
//
// A LeetCode-shaped problem screen with the Dataslope difference: a problem
// can be broken into gated steps, each with its own brief, editor and checks.
// Built from the Claude Design handoff; see
// `app/challenges/_components/ChallengeWorkspace.tsx` for the layout contract
// and `lib/challenges` for the content.
//
// Statically rendered: the catalog is a module, so every challenge prerenders
// and the route ships no server work. When challenges move to a database this
// grows a loader, the same way /quiz/<id> reads D1.
//
// Deliberately no HomeNav/HomeFooter: the workspace is a full-viewport tool
// with its own top bar, like the playground routes.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChallenge, getChallengeSlugs } from "@/lib/challenges";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import { ChallengeWorkspace } from "../_components/ChallengeWorkspace";

export function generateStaticParams() {
  return getChallengeSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const challenge = getChallenge(slug);
  if (!challenge) return {};

  const title = `${challenge.title}, ${challenge.difficulty} ${challenge.languageLabel} challenge`;
  return {
    // Bare string so the root template renders "… · DataSlope".
    title: challenge.title,
    description: challenge.description,
    alternates: { canonical: `/challenges/${challenge.slug}` },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/challenges/${challenge.slug}`,
      siteName: "DataSlope",
      title,
      description: challenge.description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: challenge.description,
      images: [OG_IMAGE],
    },
  };
}

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const challenge = getChallenge(slug);
  if (!challenge) notFound();

  return (
    <main id="main">
      <ChallengeWorkspace challenge={challenge} />
    </main>
  );
}
