// Public landing page for one custom item (/c/<id>): a user-created code
// challenge, SQL challenge, or multiple-choice question, rendered with the
// same interactive components the courses use.
//
// Server-rendered per request (the row lives in D1 and guest-row expiry is
// enforced at read time, an expired or deleted link 404s here exactly like
// the API). Mirrors app/s/[shareId]/page.tsx: custom items are user
// content behind unguessable slugs, so `robots` is noindex (and /c/ is
// disallowed in robots.ts).
import "@/app/tailwind.css";
import "@/app/home.css";
import "@/app/hljs.css";
import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { HomeNav } from "@/app/_components/home/HomeNav";
import { HomeFooter } from "@/app/_components/home/HomeFooter";
import { THEME_BOOTSTRAP } from "@/app/_components/home/themeBootstrap";
import CustomItemRenderer from "@/app/_components/customContent/CustomItemRendererLazy";
import { isValidCustomId } from "@/lib/custom-content/policy";
import {
  getLiveItemRow,
  parseItemPayload,
} from "@/lib/custom-content/store";
import { customItemKindLabel } from "@/lib/custom-content/labels";
import type { CustomItemPayload } from "@/lib/custom-content/types";

export const dynamic = "force-dynamic";

interface ItemView {
  id: string;
  kind: "code" | "sql" | "mcq";
  title: string;
  payload: CustomItemPayload;
  createdAt: string;
  expiresAt: string | null;
}

// One D1 read shared by generateMetadata + the page render.
const loadItemView = cache(async (id: string): Promise<ItemView | null> => {
  if (!isValidCustomId(id)) return null;
  const { env } = getCloudflareContext();
  const row = await getLiveItemRow(env, id, Date.now());
  if (!row) return null;
  const payload = parseItemPayload(row.payload);
  if (!payload) return null;
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    payload,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await loadItemView(id);
  if (!item) {
    return { title: "Shared challenge", robots: { index: false } };
  }
  const kindLabel = customItemKindLabel(item.kind, item.payload);
  const title = `${item.title}, a shared ${kindLabel}`;
  const description = `Try “${item.title}”, a ${kindLabel} created on DataSlope. Runs entirely in your browser.`;
  return {
    title: { absolute: title },
    description,
    robots: { index: false },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
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

export default async function CustomItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await loadItemView(id);
  if (!item) notFound();

  const kindLabel = customItemKindLabel(item.kind, item.payload);

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
            <div className="mx-auto max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-green-600)] dark:text-[var(--ds-green-400)]">
                Shared {kindLabel}
              </p>
              {/* The challenge cards render the title in their own header;
                  the MCQ card has no title slot, so the page provides it. */}
              {item.kind === "mcq" ? (
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-4xl dark:text-white">
                  {item.title}
                </h1>
              ) : null}
              <p className="mt-2 text-sm text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
                Created {formatDate(item.createdAt)}
                {item.expiresAt
                  ? ` · link expires ${formatDate(item.expiresAt)}`
                  : ""}
              </p>

              <div className="mt-6">
                <CustomItemRenderer title={item.title} payload={item.payload} />
              </div>

              <p className="mt-8 text-sm leading-relaxed text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
                This {kindLabel} was created by a DataSlope user, everything
                runs in your browser, no server executes your code. Want to
                make your own?{" "}
                <a
                  href="/create"
                  className="font-medium text-[var(--ds-green-600)] underline underline-offset-2 dark:text-[var(--ds-green-400)]"
                >
                  Create a challenge
                </a>
                .
              </p>
            </div>
          </section>
        </main>
        <HomeFooter />
      </div>
    </>
  );
}
