"use client";

/**
 * Shared pieces of the shadcn-style auth block used by /sign-in, /sign-up,
 * /forgot-password, and /reset-password: the centered card with title +
 * description, a password input with a show/hide toggle, the busy spinner,
 * and the terms footnote. Kept tiny and presentational; all auth logic
 * stays in the route clients.
 */

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card text-card-foreground rounded-xl">
      <div className="flex flex-col gap-1.5 p-6 text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-muted-foreground text-balance text-sm">
          {description}
        </p>
      </div>
      <div className="p-6 pt-0">{children}</div>
    </div>
  );
}

/** The "Or continue with" separator between social buttons and the form. */
export function AuthSeparator({ children }: { children: React.ReactNode }) {
  return (
    <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
      <span className="bg-card text-muted-foreground relative z-10 px-2">
        {children}
      </span>
    </div>
  );
}

/** Password input with a show/hide toggle in the trailing slot. */
export function PasswordInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={show ? "text" : "password"}
        className={`pr-10 ${className ?? ""}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

/** Class for links inside the auth card: brand blue with the block's
 *  underline treatment, laid out to carry a small lead-in icon. */
export const AUTH_LINK_CLS =
  "inline-flex items-center gap-1 font-medium text-[var(--ds-blue-500)] underline-offset-4 hover:underline";

/** Inline text button styled like the block's links (e.g. "Sign up"). */
export function AuthLinkButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={AUTH_LINK_CLS}>
      {icon}
      {children}
    </button>
  );
}

export function TermsNote() {
  return (
    <div className="text-muted-foreground text-balance text-center text-xs [&_a]:text-[var(--ds-blue-500)] [&_a]:underline [&_a]:underline-offset-4">
      By clicking continue, you agree to our <a href="/terms">Terms of Service</a>{" "}
      and <a href="/privacy">Privacy Policy</a>.
    </div>
  );
}
