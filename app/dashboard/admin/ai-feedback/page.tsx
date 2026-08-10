// /admin/ai-feedback, the thumbs up/down readers leave on Ask AI answers,
// backed by the admin-only /api/admin/ai-feedback endpoint.
import type { Metadata } from "next";
import { AdminNarrow } from "../_components/shared";
import { AiFeedbackClient } from "./AiFeedbackClient";

export const metadata: Metadata = {
  title: "AI Feedback",
};

export default function AdminAiFeedbackPage() {
  return (
    <AdminNarrow>
      <AiFeedbackClient />
    </AdminNarrow>
  );
}
