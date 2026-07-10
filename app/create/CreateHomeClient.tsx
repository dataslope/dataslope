"use client";

/**
 * The /create hub: builder launch cards + the signed-in member's existing
 * creations (items and quiz sets) with view / copy-link / edit / delete
 * actions. Auth gates actions, not content (the repo convention), so the
 * page itself stays static and this component reads the session
 * client-side via useSession().
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth/client";
import { customItemShortLabel } from "@/lib/custom-content/labels";
import type { CustomItemMeta, CustomSetMeta } from "@/lib/custom-content/types";
import {
  deleteItem,
  deleteSet,
  listItems,
  listSets,
} from "./_components/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmallButton, useCopyToClipboard } from "./_components/builderUi";

const BUILDERS = [
  {
    href: "/create/challenge",
    title: "Code challenge",
    description:
      "An executable coding exercise with starter code, hidden tests, and an optional reference solution. Python, JavaScript, Java, C++, and more.",
  },
  {
    href: "/create/sql",
    title: "SQL challenge",
    description:
      "A query exercise against tables you define, checked against your solution query or declarative rules. SQLite, DuckDB, or PostgreSQL.",
  },
  {
    href: "/create/mcq",
    title: "Multiple-choice question",
    description:
      "A quiz question with per-choice feedback. Markdown, code blocks, and math all work.",
  },
  {
    href: "/create/quiz",
    title: "Quiz set",
    description:
      "Bundle challenges and questions into one ordered quiz with a single shareable link.",
  },
];

function editHref(kind: CustomItemMeta["kind"], id: string): string {
  const path =
    kind === "code" ? "challenge" : kind === "sql" ? "sql" : "mcq";
  return `/create/${path}?edit=${id}`;
}

function CreationRow({
  title,
  chip,
  viewUrl,
  editUrl,
  onDelete,
}: {
  title: string;
  chip: string;
  viewUrl: string;
  editUrl: string;
  onDelete: () => void;
}) {
  const [copied, copy] = useCopyToClipboard();
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
      <Badge variant="outline" className="text-muted-foreground shrink-0 rounded-full text-[11px]">
        {chip}
      </Badge>
      <span className="flex shrink-0 flex-wrap gap-1">
        <Button asChild variant="outline" size="sm" className="border-border h-7 px-2.5 text-xs font-medium">
          <a href={viewUrl} target="_blank" rel="noreferrer">
            View
          </a>
        </Button>
        <SmallButton onClick={() => copy(`${window.location.origin}${viewUrl}`)}>
          {copied ? "Copied!" : "Copy link"}
        </SmallButton>
        <Button asChild variant="outline" size="sm" className="border-border h-7 px-2.5 text-xs font-medium">
          <Link href={editUrl}>Edit</Link>
        </Button>
        {confirming ? (
          <>
            <SmallButton tone="danger" onClick={onDelete}>
              Confirm delete
            </SmallButton>
            <SmallButton onClick={() => setConfirming(false)}>Keep</SmallButton>
          </>
        ) : (
          <SmallButton tone="danger" onClick={() => setConfirming(true)}>
            Delete
          </SmallButton>
        )}
      </span>
    </li>
  );
}

export default function CreateHomeClient() {
  const { data: session, isPending } = useSession();
  const [items, setItems] = useState<CustomItemMeta[] | null>(null);
  const [sets, setSets] = useState<CustomSetMeta[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    Promise.all([listItems(), listSets()])
      .then(([i, s]) => {
        setItems(i);
        setSets(s);
        setListError(null);
      })
      .catch(() => setListError("Couldn't load your creations, try reloading."));
  }, []);

  useEffect(() => {
    if (session) refresh();
  }, [session, refresh]);

  const onDeleteItem = async (id: string) => {
    try {
      await deleteItem(id);
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
    } catch {
      setListError("Couldn't delete that, try again.");
    }
  };

  const onDeleteSet = async (id: string) => {
    try {
      await deleteSet(id);
      setSets((prev) => prev?.filter((s) => s.id !== id) ?? null);
    } catch {
      setListError("Couldn't delete that, try again.");
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-4 sm:grid-cols-2">
        {BUILDERS.map((b) => (
          <Link
            key={b.href}
            href={b.href}
            className="group bg-card text-card-foreground border-border rounded-xl border p-5 shadow-xs transition-colors hover:border-[var(--ds-green-600)]/50 hover:bg-accent/50"
          >
            <h2 className="text-base font-semibold group-hover:text-[var(--ds-green-600)] dark:group-hover:text-[var(--ds-green-400)]">
              {b.title} →
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {b.description}
            </p>
          </Link>
        ))}
      </div>

      {isPending ? null : session ? (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold">
              Your challenges &amp; questions
            </h2>
            {listError ? (
              <p className="text-destructive mt-2 text-sm">
                {listError}
              </p>
            ) : items === null ? (
              <p className="text-muted-foreground mt-2 text-sm">
                Loading…
              </p>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground mt-2 text-sm">
                Nothing yet, pick a builder above to create your first one.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {items.map((item) => (
                  <CreationRow
                    key={item.id}
                    title={item.title}
                    chip={customItemShortLabel(item.kind)}
                    viewUrl={`/c/${item.id}`}
                    editUrl={editHref(item.kind, item.id)}
                    onDelete={() => onDeleteItem(item.id)}
                  />
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold">
              Your quiz sets
            </h2>
            {sets === null ? (
              <p className="text-muted-foreground mt-2 text-sm">
                Loading…
              </p>
            ) : sets.length === 0 ? (
              <p className="text-muted-foreground mt-2 text-sm">
                No quiz sets yet, bundle your items into one shareable quiz.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {sets.map((set) => (
                  <CreationRow
                    key={set.id}
                    title={set.title}
                    chip={`Quiz · ${set.itemCount} ${set.itemCount === 1 ? "item" : "items"}`}
                    viewUrl={`/quiz/${set.id}`}
                    editUrl={`/create/quiz?edit=${set.id}`}
                    onDelete={() => onDeleteSet(set.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground bg-muted/50 rounded-lg px-4 py-3 text-sm">
          You can create and share without an account (links last ~30 days).{" "}
          <a
            href="/sign-in"
            className="font-medium text-[var(--ds-green-600)] underline underline-offset-2 dark:text-[var(--ds-green-400)]"
          >
            Sign in
          </a>{" "}
          to keep your creations, edit them later, and manage them here.
        </p>
      )}
    </div>
  );
}
