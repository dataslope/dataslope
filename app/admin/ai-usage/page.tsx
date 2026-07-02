// /admin/ai-usage — per-user and site-wide AI spend (Ask AI chat + inline
// completions), backed by the admin-only /api/admin/ai-usage endpoint.
import type { Metadata } from "next";
import { AiUsageClient } from "./AiUsageClient";

export const metadata: Metadata = {
  title: "AI usage",
};

export default function AdminAiUsagePage() {
  return <AiUsageClient />;
}
