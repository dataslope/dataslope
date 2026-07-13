"use client";

/**
 * The /create hub ("My Creations"): the signed-in member's challenges &
 * questions and their quiz sets, in the design's two-table layout with
 * per-row view / copy-link / edit / delete. Auth gates actions, not content
 * (the repo convention), so the page itself stays static and this component
 * reads the session client-side via useSession(). Data comes from the real
 * /api/custom endpoints; chrome comes from the /create layout's Studio shell.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Eye,
  Layers,
  Link2,
  ListChecks,
  Pencil,
  Trash2,
} from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { customItemShortLabel } from "@/lib/custom-content/labels";
import type { CustomItemKind, CustomItemMeta, CustomSetMeta } from "@/lib/custom-content/types";
import {
  CustomApiError,
  deleteItem,
  deleteSet,
  listItems,
  listSets,
} from "./_components/api";
import { useCopyToClipboard } from "./_components/builderUi";

const PAGE_SIZE = 6;

function editHref(kind: CustomItemKind, id: string): string {
  const path = kind === "code" ? "challenge" : kind === "sql" ? "sql" : "mcq";
  return `/create/${path}?edit=${id}`;
}

interface Row {
  id: string;
  title: string;
  chip: string;
  viewUrl: string;
  editUrl: string;
  onDelete: () => void;
}

export default function CreateHomeClient() {
  const { data: session, isPending } = useSession();
  const [items, setItems] = useState<CustomItemMeta[] | null>(null);
  const [sets, setSets] = useState<CustomSetMeta[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [page, setPage] = useState(1);

  const refresh = useCallback(() => {
    Promise.all([listItems(), listSets()])
      .then(([i, s]) => {
        setItems(i);
        setSets(s);
        setListError(null);
        setUnauthorized(false);
      })
      .catch((err) => {
        // A cached client session can outlive the server cookie (e.g. on a
        // preview domain), so the API 401s even though useSession() reports a
        // user. Treat that as signed-out and show the sign-in prompt rather
        // than a hard error stuck next to a perpetual "Loading…".
        if (err instanceof CustomApiError && err.status === 401) {
          setUnauthorized(true);
        } else {
          setListError("Couldn't load your creations, try reloading.");
        }
      });
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

  const itemRows: Row[] = useMemo(
    () =>
      (items ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        chip: customItemShortLabel(item.kind),
        viewUrl: `/c/${item.id}`,
        editUrl: editHref(item.kind, item.id),
        onDelete: () => onDeleteItem(item.id),
      })),
    [items],
  );

  const setRows: Row[] = useMemo(
    () =>
      (sets ?? []).map((set) => ({
        id: set.id,
        title: set.title,
        chip: `Quiz · ${set.itemCount} ${set.itemCount === 1 ? "item" : "items"}`,
        viewUrl: `/quiz/${set.id}`,
        editUrl: `/create/quiz?edit=${set.id}`,
        onDelete: () => onDeleteSet(set.id),
      })),
    [sets],
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
        My Creations
      </h1>
      <p className="mt-2.5 text-[15px] leading-relaxed" style={{ color: "var(--muted)" }}>
        Everything you have built, in one place. Start something new from the
        Create menu.
      </p>

      {isPending ? null : !session || unauthorized ? (
        <SignInNotice />
      ) : listError && items === null ? (
        // Initial load failed (no data yet): offer a reload instead of tables.
        <div className="mt-8 flex items-center gap-3">
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {listError}
          </p>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium"
            style={{ border: "1px solid var(--divider)", color: "var(--ink)" }}
          >
            Reload
          </button>
        </div>
      ) : (
        <>
          {/* Transient error (e.g. a failed delete): non-blocking, keeps the lists. */}
          {listError ? (
            <p className="mt-4 text-sm" style={{ color: "var(--danger)" }}>
              {listError}
            </p>
          ) : null}
          <Section icon={<ListChecks size={17} />} title="Your challenges & questions">
            <CreationsTable
              rows={itemRows}
              loading={items === null}
              emptyText="Nothing yet, pick a builder from the Create menu to make your first one."
              page={page}
              onPageChange={setPage}
            />
          </Section>

          <Section icon={<Layers size={17} />} title="Your quiz sets">
            <CreationsTable
              rows={setRows}
              loading={sets === null}
              emptyText="No quiz sets yet, bundle your items into one shareable quiz."
            />
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <h2
        className="mt-12 flex items-center gap-2.5 text-[17px] font-semibold"
        style={{ color: "var(--ink)" }}
      >
        <span style={{ color: "var(--green-text)" }}>{icon}</span>
        {title}
      </h2>
      {children}
    </>
  );
}

function CreationsTable({
  rows,
  loading,
  emptyText,
  page,
  onPageChange,
}: {
  rows: Row[];
  loading: boolean;
  emptyText: string;
  page?: number;
  onPageChange?: (page: number) => void;
}) {
  const paged = page != null;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page ?? 1, pageCount);
  const visible = paged
    ? rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
    : rows;

  if (loading) {
    return (
      <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
        Loading…
      </p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
        {emptyText}
      </p>
    );
  }

  const first = paged ? (current - 1) * PAGE_SIZE + 1 : 1;
  const last = paged ? Math.min(current * PAGE_SIZE, rows.length) : rows.length;

  return (
    <>
      <div
        className="mt-5 overflow-hidden rounded-[10px]"
        style={{ border: "1px solid var(--divider)" }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Title</Th>
              <Th>Type</Th>
              <Th align="right" />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <CreationRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      {paged && pageCount > 1 ? (
        <div className="mt-3.5 flex items-center gap-1.5 px-1">
          <span className="text-[13px]" style={{ color: "var(--muted)" }}>
            {first}–{last} of {rows.length}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <PageNavButton
              disabled={current <= 1}
              onClick={() => onPageChange?.(Math.max(1, current - 1))}
            >
              Previous
            </PageNavButton>
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onPageChange?.(i + 1)}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1 text-[13px] font-medium"
                style={{
                  background: current === i + 1 ? "var(--panel)" : "transparent",
                  color: current === i + 1 ? "var(--ink)" : "var(--muted)",
                }}
              >
                {i + 1}
              </button>
            ))}
            <PageNavButton
              disabled={current >= pageCount}
              onClick={() => onPageChange?.(Math.min(pageCount, current + 1))}
            >
              Next
            </PageNavButton>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Th({
  children,
  align = "left",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className="h-10 whitespace-nowrap px-4 text-[13px] font-medium"
      style={{ color: "var(--muted)", textAlign: align }}
    >
      {children}
    </th>
  );
}

function CreationRow({ row }: { row: Row }) {
  const router = useRouter();
  const [copied, copy] = useCopyToClipboard();
  const [confirming, setConfirming] = useState(false);

  return (
    <tr
      onClick={() => router.push(row.editUrl)}
      className="cursor-pointer transition-colors"
      style={{ borderTop: "1px solid var(--divider)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--rail-group)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <td
        className="whitespace-nowrap px-4 py-3 font-mono text-xs"
        style={{ color: "var(--faint)" }}
      >
        {row.id.slice(0, 8)}
      </td>
      <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--ink)" }}>
        {row.title}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: "var(--chip-bg)", color: "var(--muted)" }}
        >
          {row.chip}
        </span>
      </td>
      <td className="px-3 py-2">
        <span className="flex justify-end gap-0.5">
          <IconAction
            label="View"
            href={row.viewUrl}
            onClick={(e) => e.stopPropagation()}
          >
            <Eye size={15} />
          </IconAction>
          <IconAction
            label={copied ? "Copied" : "Copy link"}
            onClick={(e) => {
              e.stopPropagation();
              copy(`${window.location.origin}${row.viewUrl}`);
            }}
          >
            {copied ? (
              <Check size={15} strokeWidth={2.5} style={{ color: "var(--green-text)" }} />
            ) : (
              <Link2 size={15} />
            )}
          </IconAction>
          <IconAction label="Edit" href={row.editUrl} onClick={(e) => e.stopPropagation()}>
            <Pencil size={15} />
          </IconAction>
          {confirming ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  row.onDelete();
                }}
                className="inline-flex h-[30px] items-center rounded-md px-2 text-[11px] font-semibold"
                style={{ color: "var(--danger)", background: "var(--danger-hover)" }}
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirming(false);
                }}
                className="inline-flex h-[30px] items-center rounded-md px-2 text-[11px] font-semibold"
                style={{ color: "var(--muted)" }}
              >
                Keep
              </button>
            </>
          ) : (
            <IconAction
              label="Delete"
              danger
              onClick={(e) => {
                e.stopPropagation();
                setConfirming(true);
              }}
            >
              <Trash2 size={15} />
            </IconAction>
          )}
        </span>
      </td>
    </tr>
  );
}

function IconAction({
  label,
  href,
  onClick,
  danger,
  children,
}: {
  label: string;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "inline-flex h-[30px] w-[30px] items-center justify-center rounded-md";
  const color = danger ? "var(--danger)" : "var(--muted)";
  if (href) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noreferrer"
        title={label}
        aria-label={label}
        onClick={onClick}
        className={cls}
        style={{ color }}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cls}
      style={{ color }}
    >
      {children}
    </button>
  );
}

function PageNavButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium disabled:opacity-40"
      style={{ border: "1px solid var(--divider)", color: "var(--ink)" }}
    >
      {children}
    </button>
  );
}

function SignInNotice() {
  return (
    <p
      className="mt-8 rounded-lg px-4 py-3 text-sm"
      style={{ background: "var(--panel)", color: "var(--muted)" }}
    >
      You can create and share without an account (links last ~30 days).{" "}
      <a href="/sign-in" className="font-medium underline underline-offset-2" style={{ color: "var(--green-text)" }}>
        Sign in
      </a>{" "}
      to keep your creations, edit them later, and manage them here.
    </p>
  );
}
