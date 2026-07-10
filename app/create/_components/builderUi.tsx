"use client";

/**
 * Shared form primitives for the /create builders: labelled inputs and
 * textareas (SignInClient-style controlled fields, Tailwind-only), the
 * save bar, the minted-link panel, and the guest notice. Kept small and
 * dependency-free so every builder reads the same.
 */

import { useCallback, useId, useState } from "react";
import { useSession } from "@/lib/auth/client";

const LABEL_CLS =
  "block text-sm font-medium text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-200)]";
const INPUT_CLS =
  "mt-1.5 w-full rounded-lg border border-[var(--ds-gray-200)] bg-white px-3 py-2 text-sm text-[var(--ds-gray-900)] outline-none transition-colors placeholder:text-[var(--ds-gray-400)] focus:border-[var(--ds-green-600)] dark:border-white/10 dark:bg-white/5 dark:text-[var(--ds-gray-100)] dark:focus:border-[var(--ds-green-400)]";
const HINT_CLS =
  "mt-1 text-xs leading-relaxed text-[var(--ds-gray-400)] dark:text-[var(--ds-gray-500)]";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLS}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLS}
      />
      {hint ? <p className={HINT_CLS}>{hint}</p> : null}
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 4,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
  mono?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLS}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={!mono}
        className={`${INPUT_CLS} resize-y ${
          mono ? "font-mono text-[13px] leading-relaxed" : ""
        }`}
      />
      {hint ? <p className={HINT_CLS}>{hint}</p> : null}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLS}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLS}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <p className={HINT_CLS}>{hint}</p> : null}
    </div>
  );
}

/** Card-style group with a heading, used for files / tests / choices. */
export function Fieldset({
  legend,
  actions,
  children,
}: {
  legend: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--ds-gray-200)] p-4 dark:border-white/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--ds-gray-800)] dark:text-[var(--ds-gray-100)]">
          {legend}
        </h2>
        {actions}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function SmallButton({
  onClick,
  children,
  tone = "neutral",
  disabled,
  type = "button",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        tone === "danger"
          ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
          : "border-[var(--ds-gray-200)] text-[var(--ds-gray-600)] hover:bg-[var(--ds-gray-50)] dark:border-white/10 dark:text-[var(--ds-gray-300)] dark:hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  onClick,
  children,
  disabled,
  type = "button",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center rounded-lg bg-[var(--ds-green-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-green-700)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  onClick,
  children,
  disabled,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center rounded-lg border border-[var(--ds-gray-200)] px-4 py-2 text-sm font-semibold text-[var(--ds-gray-700)] transition-colors hover:bg-[var(--ds-gray-50)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-[var(--ds-gray-200)] dark:hover:bg-white/5"
    >
      {children}
    </button>
  );
}

export function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
    >
      {message}
    </p>
  );
}

/** "Not signed in" banner: creating still works, but the link expires and
 *  can't be edited later. Renders nothing while the session is loading or
 *  when signed in. */
export function GuestNotice() {
  const { data: session, isPending } = useSession();
  if (isPending || session) return null;
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      You&apos;re not signed in, you can still create and share, but the link
      expires after ~30 days and can&apos;t be edited later.{" "}
      <a href="/sign-in" className="font-medium underline underline-offset-2">
        Sign in
      </a>{" "}
      to keep and edit your creations.
    </p>
  );
}

export function useCopyToClipboard(): [copied: boolean, copy: (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }, []);
  return [copied, copy];
}

/** Success panel shown after a save: the shareable link with copy/open
 *  actions. `editable` toggles the "future saves update this link" note. */
export function SharedLinkPanel({
  url,
  editable,
}: {
  url: string;
  editable: boolean;
}) {
  const [copied, copy] = useCopyToClipboard();
  return (
    <div
      role="status"
      className="rounded-xl border border-[var(--ds-green-600)]/30 bg-[var(--ds-green-600)]/5 p-4"
    >
      <p className="text-sm font-semibold text-[var(--ds-gray-800)] dark:text-[var(--ds-gray-100)]">
        Saved! Share this link:
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border border-[var(--ds-gray-200)] bg-white px-2.5 py-1.5 font-mono text-[13px] text-[var(--ds-gray-800)] dark:border-white/10 dark:bg-white/5 dark:text-[var(--ds-gray-200)]">
          {url}
        </code>
        <SmallButton onClick={() => copy(url)}>
          {copied ? "Copied!" : "Copy link"}
        </SmallButton>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-md border border-[var(--ds-gray-200)] px-2.5 py-1 text-xs font-medium text-[var(--ds-gray-600)] transition-colors hover:bg-[var(--ds-gray-50)] dark:border-white/10 dark:text-[var(--ds-gray-300)] dark:hover:bg-white/5"
        >
          Open
        </a>
      </div>
      <p className="mt-2 text-xs text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
        {editable
          ? "Saving again updates what this link shows."
          : "Guest links are snapshots, saving again mints a fresh link."}
      </p>
    </div>
  );
}
