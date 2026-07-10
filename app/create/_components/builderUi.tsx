"use client";

/**
 * Shared form primitives for the /create builders, composed from the
 * repo's shadcn-style components/ui primitives (Button, Input, Textarea,
 * Label, NativeSelect, Card, Badge) so the builders read like the rest
 * of the shadcn surfaces (/admin). Field wrappers keep a small local API
 * (label + value + onChange + hint) so builder code stays terse.
 *
 * The primary CTA keeps the site's brand green (the neutral `--ui-*`
 * shadcn palette would render it near-black); everything else uses the
 * stock token-driven variants.
 */

import { useCallback, useId, useState } from "react";
import { useSession } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const HINT_CLS = "text-muted-foreground text-xs leading-relaxed";

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
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
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
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={!mono}
        className={cn(
          "field-sizing-fixed resize-y",
          mono && "font-mono text-[13px] leading-relaxed md:text-[13px]",
        )}
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
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
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
    <Card>
      <CardHeader>
        <CardTitle>{legend}</CardTitle>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
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
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      variant="outline"
      size="sm"
      className={cn(
        "border-border h-7 px-2.5 text-xs font-medium",
        tone === "danger" &&
          "text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10",
      )}
    >
      {children}
    </Button>
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
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="bg-[var(--ds-green-600)] font-semibold text-white hover:bg-[var(--ds-green-700)]"
    >
      {children}
    </Button>
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
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant="outline"
      className="border-border"
    >
      {children}
    </Button>
  );
}

export function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm dark:bg-destructive/15"
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
    <p className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
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
    <Card
      role="status"
      className="border-[var(--ds-green-600)]/30 bg-[var(--ds-green-600)]/5 gap-2"
    >
      <CardHeader>
        <CardTitle>Saved! Share this link:</CardTitle>
      </CardHeader>
      <CardContent className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <code className="border-input min-w-0 flex-1 truncate rounded-md border bg-background px-2.5 py-1.5 font-mono text-[13px] dark:bg-input/30">
            {url}
          </code>
          <SmallButton onClick={() => copy(url)}>
            {copied ? "Copied!" : "Copy link"}
          </SmallButton>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-border h-7 px-2.5 text-xs font-medium"
          >
            <a href={url} target="_blank" rel="noreferrer">
              Open
            </a>
          </Button>
        </div>
        <p className={HINT_CLS}>
          {editable
            ? "Saving again updates what this link shows."
            : "Guest links are snapshots, saving again mints a fresh link."}
        </p>
      </CardContent>
    </Card>
  );
}
