/**
 * POST /api/email-preview, send a live test copy of one auth email design to
 * the requester's own inbox, so the /email-preview page can preview the real
 * rendered result in a real email client (not just an on-page iframe).
 *
 * Guardrails, this is a dev/design tool, not a mailer:
 *   - Admin-only (requireAdmin): 401 without a session, 403 for non-admins.
 *   - Sends ONLY to the admin's own account email, never a caller-supplied
 *     address, so it can't be turned into an open relay or spam vector.
 *   - Uses the fake SAMPLE_URL, so the test link verifies nothing.
 *
 * Fail-safe: if no sender is configured (RESEND_API_KEY unset) it returns a
 * clear 400 instead of throwing, matching the rest of the email surface.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { sendEmail } from "@/lib/auth/email";
import { EMAIL_TEMPLATES, SAMPLE_URL } from "@/app/dashboard/admin/email-preview/samples";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();

  const gate = await requireAdmin(env, request);
  if (!gate.ok) return json({ error: gate.message }, gate.status);

  if (!env.RESEND_API_KEY) {
    return json(
      { error: "Email sending isn't configured (RESEND_API_KEY is not set)." },
      400,
    );
  }

  let body: { template?: unknown };
  try {
    body = (await request.json()) as { template?: unknown };
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const template = EMAIL_TEMPLATES.find((t) => t.key === body.template);
  if (!template) {
    return json(
      {
        error: `Unknown template. Expected one of: ${EMAIL_TEMPLATES.map((t) => t.key).join(", ")}.`,
      },
      400,
    );
  }

  const to = gate.user.email;
  if (!to) return json({ error: "Your account has no email address." }, 400);

  try {
    await sendEmail(env, { to, ...template.build(SAMPLE_URL) });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "Failed to send." },
      502,
    );
  }

  return json({ to, message: `Sent the “${template.name}” email to ${to}.` });
}
