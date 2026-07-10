// Public landing page for a quiz set (/quiz/<id>): an ordered collection
// of user-created challenges and multiple-choice questions, rendered as a
// single scrolling worksheet with the same interactive components the
// courses use.
//
// Server-rendered per request, mirroring /c/<id>: the set row and its item
// rows live in D1, guest-row expiry is enforced at read time, and items
// deleted after the set was published are simply skipped (the set stays
// usable). User content behind unguessable slugs → noindex + robots.ts
// disallow.
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
  getLiveItemRows,
  getLiveSetRow,
  parseItemPayload,
  parseSetItemIds,
} from "@/lib/custom-content/store";
import type { CustomItemPayload } from "@/lib/custom-content/types";

export const dynamic = "force-dynamic";

interface QuizItemView {
  id: string;
  title: string;
  payload: CustomItemPayload;
}

interface QuizView {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  expiresAt: string | null;
  items: QuizItemView[];
}

// One D1 read pair shared by generateMetadata + the page render.
const loadQuizView = cache(async (id: string): Promise<QuizView | null> => {
  if (!isValidCustomId(id)) return null;
  const { env } = getCloudflareContext();
  const nowMs = Date.now();
  const row = await getLiveSetRow(env, id, nowMs);
  if (!row) return null;
  const itemRows = await getLiveItemRows(env, parseSetItemIds(row.item_ids), nowMs);
  const items: QuizItemView[] = [];
  for (const item of itemRows) {
    const payload = parseItemPayload(item.payload);
    if (!payload) continue;
    items.push({ id: item.id, title: item.title, payload });
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    items,
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const quiz = await loadQuizView(id);
  if (!quiz) {
    return { title: "Shared quiz", robots: { index: false } };
  }
  const title = `${quiz.title}, a shared quiz`;
  const description =
    quiz.description ||
    `Try “${quiz.title}”, a quiz with ${quiz.items.length} ${
      quiz.items.length === 1 ? "question" : "questions"
    } created on DataSlope. Runs entirely in your browser.`;
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

export default async function QuizSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quiz = await loadQuizView(id);
  if (!quiz) notFound();

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
                Shared quiz · {quiz.items.length}{" "}
                {quiz.items.length === 1 ? "question" : "questions"}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-4xl dark:text-white">
                {quiz.title}
              </h1>
              {quiz.description ? (
                <p className="mt-3 text-base leading-relaxed text-[var(--ds-gray-600)] dark:text-[var(--ds-gray-300)]">
                  {quiz.description}
                </p>
              ) : null}
              <p className="mt-3 text-sm text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
                Created {formatDate(quiz.createdAt)}
                {quiz.expiresAt
                  ? ` · link expires ${formatDate(quiz.expiresAt)}`
                  : ""}
              </p>

              {quiz.items.length === 0 ? (
                <p className="mt-10 rounded-xl border border-[var(--ds-gray-200)] px-4 py-6 text-sm text-[var(--ds-gray-500)] dark:border-white/10 dark:text-[var(--ds-gray-400)]">
                  The items in this quiz are no longer available, they may
                  have been deleted by their creator or expired.
                </p>
              ) : (
                <div className="mt-10 flex flex-col gap-10">
                  {quiz.items.map((item, i) => (
                    <div key={item.id}>
                      <CustomItemRenderer
                        title={item.title}
                        payload={item.payload}
                        badge={`Question ${i + 1} of ${quiz.items.length}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-12 text-sm leading-relaxed text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
                This quiz was created by a DataSlope user, everything runs in
                your browser, no server executes your code. Want to make your
                own?{" "}
                <a
                  href="/create"
                  className="font-medium text-[var(--ds-green-600)] underline underline-offset-2 dark:text-[var(--ds-green-400)]"
                >
                  Create a quiz
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
