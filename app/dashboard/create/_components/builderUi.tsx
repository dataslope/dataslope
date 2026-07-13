"use client";

/**
 * Shared form primitives for the /dashboard/create builders, ported from the
 * Create Studio design handoff: borderless filled inputs, labels with small
 * blue lead-in icons, hairline-separated sections, pill-shaped small actions,
 * and the green primary CTA. Field wrappers keep a small local API
 * (label + value + onChange + hint) so builder code stays terse. Styles come
 * from the `.ds-*` classes in app/dashboard/_studio/studio.css plus the
 * studio's semantic tokens.
 *
 * Also home to the split builder layout (`BuilderSplit`): the form on the
 * left, the live-preview column on the right, driven by the shell's top-bar
 * Live Preview / full-preview controls (StudioPreviewContext).
 */

import { useCallback, useId, useState } from "react";
import { ChevronDown, Eye, type LucideIcon } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { useStudioPreview } from "@/app/dashboard/_studio/StudioPreviewContext";
import { cn } from "@/lib/utils";

const HINT_CLS = "text-xs leading-relaxed";

function FieldLabel({
  htmlFor,
  icon: Icon,
  children,
  note,
}: {
  htmlFor?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="ds-label">
      {Icon ? (
        <span className="ds-label-icon">
          <Icon size={13} />
        </span>
      ) : null}
      {children}
      {note ? <span className="ds-label-note">· {note}</span> : null}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className={HINT_CLS} style={{ color: "var(--faint)" }}>
      {children}
    </p>
  );
}

export function TextField({
  label,
  icon,
  note,
  value,
  onChange,
  placeholder,
  hint,
  maxLength,
  mono,
}: {
  label: string;
  icon?: LucideIcon;
  note?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  mono?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2.5">
      <FieldLabel htmlFor={id} icon={icon} note={note}>
        {label}
      </FieldLabel>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn("ds-input", mono && "ds-mono")}
      />
      {hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}

export function TextAreaField({
  label,
  icon,
  note,
  value,
  onChange,
  placeholder,
  hint,
  rows = 4,
  mono = false,
}: {
  label: string;
  icon?: LucideIcon;
  note?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
  mono?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2.5">
      <FieldLabel htmlFor={id} icon={icon} note={note}>
        {label}
      </FieldLabel>
      <textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={!mono}
        className={cn("ds-textarea", mono && "ds-mono")}
      />
      {hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}

export function SelectField({
  label,
  icon,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  icon?: LucideIcon;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2.5">
      <FieldLabel htmlFor={id} icon={icon}>
        {label}
      </FieldLabel>
      <div className="relative w-full">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="ds-select"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-[11px] top-1/2 -translate-y-1/2"
          style={{ color: "var(--faint)" }}
        />
      </div>
      {hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className="flex w-fit cursor-pointer items-center gap-2 text-sm"
      style={{ color: "var(--text)" }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[var(--green-btn)]"
      />
      {label}
    </label>
  );
}

/** Hairline-separated form section with a small heading + right-side actions
 *  (the design's stacked groups; replaces the old card Fieldset). */
export function Section({
  icon: Icon,
  title,
  note,
  actions,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  note?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="ds-section">
      <div className="flex flex-wrap items-center gap-2">
        <h3
          className="m-0 flex items-center gap-[7px] text-sm font-semibold"
          style={{ color: "var(--ink)" }}
        >
          {Icon ? (
            <span className="inline-flex flex-shrink-0" style={{ color: "var(--muted)" }}>
              <Icon size={14} />
            </span>
          ) : null}
          {title}
          {note ? (
            <span className="font-normal" style={{ color: "var(--faint)" }}>
              · {note}
            </span>
          ) : null}
        </h3>
        {actions ? <span className="ml-auto flex gap-1.5">{actions}</span> : null}
      </div>
      <div className="mt-5 flex flex-col gap-7">{children}</div>
    </div>
  );
}

/** The uppercase "FILE 1" / "TEST 2" row heading with its Remove action. */
export function ItemHeader({
  label,
  onRemove,
  removeDisabled,
}: {
  label: string;
  onRemove?: () => void;
  removeDisabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.05em]"
        style={{ color: "var(--faint)" }}
      >
        {label}
      </span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={removeDisabled}
          className="ds-btn-danger-chip ml-auto"
        >
          Remove
        </button>
      ) : null}
    </div>
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
      className={tone === "danger" ? "ds-btn-danger-chip" : "ds-btn-chip"}
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
    <button type={type} onClick={onClick} disabled={disabled} className="ds-btn-primary">
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
    <button type="button" onClick={onClick} disabled={disabled} className="ds-btn-secondary">
      {children}
    </button>
  );
}

export function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-[10px] px-3.5 py-2.5 text-sm"
      style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
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
    <p className="rounded-[10px] border border-amber-300/60 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
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
      className="rounded-[14px] px-4 py-3.5"
      style={{ background: "var(--green-soft)" }}
    >
      <div className="text-[13px] font-semibold" style={{ color: "var(--green-text)" }}>
        Saved! Share this link:
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code
          className="ds-mono min-w-0 flex-1 truncate rounded-lg px-2.5 py-[7px]"
          style={{ background: "var(--input)", color: "var(--ink)" }}
        >
          {url}
        </code>
        <button
          type="button"
          onClick={() => copy(url)}
          className="inline-flex h-[30px] items-center gap-1.5 rounded-md px-[11px] text-xs font-semibold transition-[filter] hover:brightness-[0.97]"
          style={{ background: "var(--input)", color: "var(--ink)" }}
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-[30px] items-center gap-1.5 rounded-md px-[11px] text-xs font-semibold transition-[filter] hover:brightness-[0.97]"
          style={{ background: "var(--input)", color: "var(--ink)" }}
        >
          Open
        </a>
      </div>
      <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
        {editable
          ? "Saving again updates what this link shows."
          : "Guest links are snapshots, saving again mints a fresh link."}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Split builder layout + live preview column
// ---------------------------------------------------------------------------

/**
 * The design's side-by-side builder layout: the form on the left, the live
 * preview column on the right (sticky on wide viewports, stacked below 900px).
 * Both columns respond to the shell's top-bar controls: the Live Preview
 * switch hides the column, the expand button hides the form instead. The form
 * stays mounted (display:none) in full preview so field state and any running
 * challenge runtime survive the toggle.
 */
export function BuilderSplit({
  children,
  preview,
}: {
  children: React.ReactNode;
  preview: React.ReactNode;
}) {
  const { previewOpen, fullPreview } = useStudioPreview();
  return (
    <div className="flex flex-col items-stretch gap-7 min-[900px]:flex-row min-[900px]:items-start min-[900px]:gap-9">
      <div
        className="min-w-0 flex-[1_1_460px]"
        style={{ display: fullPreview ? "none" : undefined }}
      >
        {children}
      </div>
      {previewOpen ? (
        <div
          className={cn(
            "min-w-0",
            fullPreview
              ? "flex-1"
              : "flex-[1_1_320px] min-[900px]:sticky min-[900px]:top-1 min-[900px]:min-w-[260px] min-[900px]:max-w-[560px]",
          )}
        >
          <div
            className="flex items-center gap-[7px] text-[11px] font-semibold uppercase tracking-[0.06em]"
            style={{ color: "var(--faint)" }}
          >
            <Eye size={13} />
            Live preview
          </div>
          <div className="mt-3">{preview}</div>
        </div>
      ) : null}
    </div>
  );
}

/** Pulsing skeleton shown in the preview column before a real preview is
 *  rendered (the design's placeholder panel). */
export function PreviewPlaceholder({ note }: { note: string }) {
  const bars: { h: number; w: string; r: number }[] = [
    { h: 18, w: "45%", r: 5 },
    { h: 12, w: "100%", r: 4 },
    { h: 12, w: "80%", r: 4 },
    { h: 120, w: "100%", r: 8 },
  ];
  return (
    <div className="rounded-xl p-[22px]" style={{ background: "var(--panel)" }}>
      <div className="flex flex-col gap-3">
        {bars.map((b, i) => (
          <div
            key={i}
            style={{
              height: b.h,
              width: b.w,
              borderRadius: b.r,
              background: "var(--chip-bg)",
              animation: `ds-pulse 1.8s ease-in-out ${i * 0.1}s infinite`,
            }}
          />
        ))}
        <div className="flex gap-2">
          {[88, 124].map((w, i) => (
            <div
              key={w}
              style={{
                height: 28,
                width: w,
                borderRadius: 6,
                background: "var(--chip-bg)",
                animation: `ds-pulse 1.8s ease-in-out ${0.4 + i * 0.1}s infinite`,
              }}
            />
          ))}
        </div>
        {["60%", "70%"].map((w, i) => (
          <div
            key={w}
            style={{
              height: 12,
              width: w,
              borderRadius: 4,
              background: "var(--chip-bg)",
              animation: `ds-pulse 1.8s ease-in-out ${0.6 + i * 0.1}s infinite`,
            }}
          />
        ))}
      </div>
      <p className="mt-[18px] text-xs leading-normal" style={{ color: "var(--faint)" }}>
        {note}
      </p>
    </div>
  );
}
