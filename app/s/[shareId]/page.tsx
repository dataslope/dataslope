// Public landing page for a playground share link (/s/<id>).
//
// Server-rendered per request (the share row lives in D1 and expiry is
// enforced at read time, an expired or revoked link 404s here exactly like
// the API). The page shows only the D1 metadata (name, playground, manifest
// summary), the bundle payload is fetched from R2 only when the visitor
// clicks "Open a copy".
//
// Shares are user content: `robots` is noindex (and /s/ is disallowed in
// robots.ts) so links people share privately never end up in search results.
import "@/app/tailwind.css";
import "@/app/home.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { HomeNav } from "@/app/_components/home/HomeNav";
import { HomeFooter } from "@/app/_components/home/HomeFooter";
import { THEME_BOOTSTRAP } from "@/app/_components/home/themeBootstrap";
import { PLAYGROUNDS } from "@/app/_components/playgrounds";
import { isValidShareId } from "@/lib/workspaces/policy";
import {
  loadLiveShare,
  workspacesBucket,
} from "@/lib/workspaces/server";
import { parseManifest, type BundleManifest } from "@/lib/workspaces/types";
import { OpenShareCopy } from "./OpenShareCopy";

export const dynamic = "force-dynamic";

interface ShareView {
  id: string;
  name: string;
  playground: string;
  playgroundLabel: string;
  sizeBytes: number;
  createdAt: string;
  expiresAt: string | null;
  manifest: BundleManifest | null;
}

// One D1 read shared by generateMetadata + the page render.
const loadShareView = cache(async (shareId: string): Promise<ShareView | null> => {
  if (!isValidShareId(shareId)) return null;
  const { env, ctx } = getCloudflareContext();
  const bucket = workspacesBucket(env);
  if (!bucket) return null;
  const row = await loadLiveShare(
    env,
    bucket,
    shareId,
    Date.now(),
    ctx?.waitUntil ? (p) => ctx.waitUntil(p) : undefined,
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    playground: row.playground,
    playgroundLabel:
      PLAYGROUNDS.find((p) => p.id === row.playground)?.label ??
      row.playground,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    manifest: parseManifest(row.manifest),
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const share = await loadShareView(shareId);
  if (!share) {
    return { title: "Shared playground", robots: { index: false } };
  }
  const title = `${share.name}, shared ${share.playgroundLabel} playground`;
  const description = `Open your own copy of “${share.name}”, a ${share.playgroundLabel} playground shared on DataSlope. Runs entirely in your browser.`;
  return {
    title: { absolute: title },
    description,
    robots: { index: false },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ManifestSummary({ manifest }: { manifest: BundleManifest | null }) {
  if (!manifest) return null;
  const entries =
    manifest.kind === "code"
      ? (manifest.files ?? []).map((f) => ({
          label: f.name,
          detail: formatBytes(f.size),
        }))
      : (manifest.tabs ?? []).map((t) => ({ label: t, detail: "query" }));
  if (entries.length === 0) return null;
  return (
    <div className="mt-8 rounded-xl border border-[var(--ds-gray-200)] dark:border-white/10">
      <div className="border-b border-[var(--ds-gray-200)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--ds-gray-500)] dark:border-white/10 dark:text-[var(--ds-gray-400)]">
        {manifest.kind === "code" ? "Files" : "Queries"}
        {manifest.database ? ` · database: ${manifest.database}` : ""}
      </div>
      <ul className="divide-y divide-[var(--ds-gray-100)] dark:divide-white/5">
        {entries.slice(0, 20).map((e, i) => (
          <li
            key={`${e.label}-${i}`}
            className="flex items-center justify-between px-4 py-2 text-sm"
          >
            <span className="truncate font-mono text-[13px] text-[var(--ds-gray-800)] dark:text-[var(--ds-gray-200)]">
              {e.label}
            </span>
            <span className="ml-4 shrink-0 text-xs text-[var(--ds-gray-400)]">
              {e.detail}
            </span>
          </li>
        ))}
        {entries.length > 20 && (
          <li className="px-4 py-2 text-xs text-[var(--ds-gray-400)]">
            …and {entries.length - 20} more
          </li>
        )}
      </ul>
    </div>
  );
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const share = await loadShareView(shareId);
  if (!share) notFound();

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="ds-home min-h-screen bg-white text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <HomeNav />
        <main className="overflow-x-clip">
          <section className="px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
            <div className="mx-auto max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-green-600)] dark:text-[var(--ds-green-400)]">
                Shared {share.playgroundLabel} playground
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-4xl dark:text-white">
                {share.name}
              </h1>
              <p className="mt-3 text-sm text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
                Shared {formatDate(share.createdAt)} ·{" "}
                {formatBytes(share.sizeBytes)} compressed
                {share.expiresAt
                  ? ` · link expires ${formatDate(share.expiresAt)}`
                  : ""}
              </p>

              <div className="mt-8">
                <OpenShareCopy
                  shareId={share.id}
                  playground={share.playground}
                  name={share.name}
                />
              </div>

              <ManifestSummary manifest={share.manifest} />

              <p className="mt-8 text-sm leading-relaxed text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
                DataSlope playgrounds run entirely in your browser, nothing to
                install, no server executing your code. This link holds a
                snapshot the sharer chose to publish; it may stop working if
                they revoke it or it expires.
              </p>
            </div>
          </section>
        </main>
        <HomeFooter />
      </div>
    </>
  );
}
