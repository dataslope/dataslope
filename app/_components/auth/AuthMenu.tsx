"use client";

/**
 * Header auth control: "Sign in" link when signed out, avatar menu when
 * signed in. Session is read client-side so the header can sit on statically
 * prerendered pages; a neutral skeleton renders while the first fetch is in
 * flight so "Sign in" never flashes for signed-in visitors.
 */
import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { LayoutDashboard, LogIn, LogOut, Shield, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "../Link";
import { signOut, useSession } from "@/lib/auth/client";

const TRIGGER_CLASS =
  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#121212] transition-colors hover:text-[var(--ds-blue-700)] dark:text-white dark:hover:text-[var(--ds-blue-400)]";

/** "Sign in" button styles minus the vertical padding, split out so the
 *  compacted header can tighten the box. `whitespace-nowrap` keeps the label
 *  on one line in the header's tightest band. */
const SIGN_IN_BUTTON_BASE =
  "inline-flex items-center gap-2 whitespace-nowrap rounded-sm bg-[#121212] px-3 text-sm font-medium tracking-tight text-white transition-colors hover:bg-[#2a2a2a] dark:bg-white dark:text-[#121212] dark:hover:bg-[var(--ds-gray-200)]";

/** The button at its normal size; shared with the mobile drawer. */
export const SIGN_IN_BUTTON_CLASS = `${SIGN_IN_BUTTON_BASE} py-1.5`;

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

/** @param compact Header scrolled past its threshold; only the box tightens,
 *  the type stays 14px. */
export function AuthMenu({ compact }: { compact?: boolean } = {}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  // Size-matched skeleton while the session loads; the server always
  // prerenders this state, so the placeholder is hydration-stable.
  if (isPending) {
    return (
      <span
        aria-hidden="true"
        className={`inline-block w-[4.5rem] animate-pulse rounded-lg bg-[var(--ds-gray-100)] transition-[height] duration-200 dark:bg-white/10 ${
          compact ? "h-[30px]" : "h-8"
        }`}
      />
    );
  }

  if (!session) {
    return (
      // Steps down in the header's tightest band (md–lg) and back up from lg.
      <Link
        href="/sign-in"
        className={`${SIGN_IN_BUTTON_BASE} transition-[padding] duration-200 md:text-[13px] lg:text-sm ${
          compact ? "py-[5px]" : "py-1.5"
        }`}
      >
        {/* Sized in CSS so it can follow the label's responsive size. */}
        <LogIn
          size={14}
          aria-hidden="true"
          className="md:size-[13px] lg:size-[14px]"
        />
        Sign in
      </Link>
    );
  }

  const { user } = session;
  // Config-listed admins get `role` promoted at sign-in (lib/auth/server.ts),
  // so this check covers them too; dashboard actions are server-enforced.
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
              render={<Link href="/dashboard/create" />}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </Menu.Item>
            <Menu.Item
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--ds-gray-900)] outline-none transition-colors data-[highlighted]:bg-[var(--ds-gray-100)] dark:text-white dark:data-[highlighted]:bg-white/10"
              render={<Link href="/dashboard/account" />}
            >
              <UserIcon size={16} />
              Account
            </Menu.Item>
            {isAdmin && (
              <Menu.Item
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--ds-gray-900)] outline-none transition-colors data-[highlighted]:bg-[var(--ds-gray-100)] dark:text-white dark:data-[highlighted]:bg-white/10"
                render={<Link href="/dashboard/admin" />}
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
