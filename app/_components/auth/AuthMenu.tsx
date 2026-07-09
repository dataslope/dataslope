"use client";

/**
 * Header auth control: a "Sign in" link when signed out, and an avatar menu
 * (account / sign out) when signed in.
 *
 * The session is read client-side via `useSession()` so the header can sit on
 * statically prerendered pages without making them dynamic, the server ships
 * the same anonymous HTML to everyone and this swaps in after hydration. While
 * the first session fetch is in flight we render a neutral skeleton (not the
 * "Sign in" button), so the markup is stable on first paint (no hydration
 * mismatch) and a signed-in visitor doing a full-page load never sees "Sign in"
 * flash before the avatar resolves.
 */
import { useState } from "react";
import { Menu } from "@base-ui-components/react/menu";
import { LogIn, LogOut, Shield, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "../Link";
import { signOut, useSession } from "@/lib/auth/client";

const TRIGGER_CLASS =
  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#121212] transition-colors hover:text-[var(--ds-blue-700)] dark:text-white dark:hover:text-[var(--ds-blue-400)]";

/** Solid "Sign in" button: near-black on light (#121212 fill, white text),
 *  inverted to white-on-#121212 on dark. Shared with the mobile drawer's
 *  sign-in row so the two match. */
export const SIGN_IN_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-lg bg-[#121212] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] dark:bg-white dark:text-[#121212] dark:hover:bg-[var(--ds-gray-200)]";

/** Circular avatar: the provider image when present, otherwise an initial. */
function Avatar({ image, name }: { image?: string | null; name?: string | null }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        aria-hidden="true"
        className="size-6 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex size-6 items-center justify-center rounded-full bg-[var(--ds-blue-600)] text-xs font-semibold text-white"
    >
      {initial}
    </span>
  );
}

export function AuthMenu() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  // Still loading the first session: render a size-matched skeleton rather than
  // the "Sign in" button, so a signed-in visitor doing a full-page load doesn't
  // see "Sign in" flash before the avatar swaps in. The server always prerenders
  // this (isPending) state, so the placeholder is hydration-stable.
  if (isPending) {
    return (
      <span
        aria-hidden="true"
        className="inline-block h-8 w-[4.5rem] animate-pulse rounded-lg bg-[var(--ds-gray-100)] dark:bg-white/10"
      />
    );
  }

  // Signed out: a solid, subtly filled button linking to /sign-in.
  if (!session) {
    return (
      <Link
        href="/sign-in"
        className={SIGN_IN_BUTTON_CLASS}
      >
        <LogIn size={14} aria-hidden="true" />
        Sign in
      </Link>
    );
  }

  const { user } = session;
  // Admins see a shortcut to /admin. Config-listed admins (ADMIN_EMAILS /
  // ADMIN_USER_IDS) have their `role` column promoted to "admin" at sign-in
  // (sign-in hooks in lib/auth/server.ts), so this role check covers them
  // too; either way the dashboard's actions are server-enforced.
  const isAdmin = user.role === "admin";

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      // Re-render anything reading the session; the menu collapses to "Sign in".
      router.refresh();
    } catch {
      // Network failure, leave the session as-is; the item re-enables.
    }
    setSigningOut(false);
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        className={`${TRIGGER_CLASS} px-1.5`}
        aria-label="Account menu"
      >
        <Avatar image={user.image} name={user.name} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50">
          <Menu.Popup className="min-w-56 rounded-xl border border-[var(--ds-gray-200)] bg-white p-1.5 shadow-xl shadow-black/5 outline-none transition-[opacity,transform] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 dark:border-white/10 dark:bg-[#1a1a1a] dark:shadow-black/40">
            <div className="border-b border-[var(--ds-gray-200)] px-2.5 py-2 dark:border-white/10">
              <div className="truncate text-sm font-medium text-[var(--ds-gray-900)] dark:text-white">
                {user.name}
              </div>
              <div className="truncate text-xs text-[var(--ds-gray-500)]">
                {user.email}
              </div>
            </div>
            <Menu.Item
              className="mt-1 flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--ds-gray-900)] outline-none transition-colors data-[highlighted]:bg-[var(--ds-gray-100)] dark:text-white dark:data-[highlighted]:bg-white/10"
              render={<Link href="/account" />}
            >
              <UserIcon size={16} />
              Account
            </Menu.Item>
            {isAdmin && (
              <Menu.Item
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--ds-gray-900)] outline-none transition-colors data-[highlighted]:bg-[var(--ds-gray-100)] dark:text-white dark:data-[highlighted]:bg-white/10"
                render={<Link href="/admin" />}
              >
                <Shield size={16} />
                Admin
              </Menu.Item>
            )}
            <Menu.Item
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--ds-gray-900)] outline-none transition-colors data-[highlighted]:bg-[var(--ds-gray-100)] dark:text-white dark:data-[highlighted]:bg-white/10"
              onClick={handleSignOut}
              disabled={signingOut}
              closeOnClick={false}
            >
              <LogOut size={16} />
              {signingOut ? "Signing out…" : "Sign out"}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
