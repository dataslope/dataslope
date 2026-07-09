// Same self-contained, flat auth chrome as /sign-in (design option "2a"): a
// top-left brand lockup plus a single centered card, styled with the shared
// auth CSS module, no tailwind.css / HomeNav / HomeFooter. Global resets come
// from app/globals.css (imported in the root layout). This is where a user
// sets a new password from an emailed reset link (the request form lives at
// /forgot-password).
import type { Metadata } from "next";
import { ResetPasswordClient } from "./ResetPasswordClient";
import { AuthPageShell } from "../_components/auth/AuthPageShell";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new password for your Dataslope account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthPageShell>
      <ResetPasswordClient />
    </AuthPageShell>
  );
}
