"use client";

/**
 * Header auth control: a "Sign in" link when signed out, and an avatar menu
 * (account / sign out) when signed in.
 *
 * The session is read client-side via `useSession()` so the header can sit on
 * statically prerendered pages without making them dynamic — the server ships
 * the same anonymous HTML to everyone and this swaps in after hydration. While
 * the first session fetch is in flight we render the signed-out control, so the
 * markup is stable on first paint (no hydration mismatch) and only upgrades to
 * the avatar once a session is confirmed.
 */
import { useState } from "react";
import { Menu } from "@base-ui-components/react/menu";
import { LogOut, Shield, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "../Link";
import { signOut, useSession } from "@/lib/auth/client";

const TRIGGER_CLASS =
  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#121212] transition-colors hover:text-[var(--ds-blue-700)] dark:text-white dark:hover:text-[var(--ds-blue-400)]";

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

  // Signed out (or still loading the first session): a plain link to /sign-in.
  if (isPending || !session) {
    return (
      <Link
        href="/sign-in"
        className="inline-flex items-center rounded-lg border border-[var(--ds-gray-200)] px-3 py-1.5 text-sm font-medium text-[#121212] transition-colors hover:bg-[var(--ds-gray-100)] dark:border-white/15 dark:text-white dark:hover:bg-white/10"
      >
        Sign in
      </Link>
    );
  }

  const { user } = session;
  // Role-based admins see a shortcut to /admin. `adminUserIds` admins (pinned
  // by config, role still "user") won't see the link but can navigate directly;
  // either way the dashboard's actions are server-enforced.
  const isAdmin = user.role === "admin";

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    // Re-render anything reading the session; the menu collapses to "Sign in".
    router.refresh();
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
