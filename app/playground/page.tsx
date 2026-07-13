// The playground index moved into the dashboard (sidebar + top bar chrome,
// paginated workspaces): /dashboard/playground. This route stays only so old
// links and bookmarks keep working; the per-language playgrounds
// (/playground/python, /playground/sqlite, …) are unaffected.
import { permanentRedirect } from "next/navigation";

export default function PlaygroundIndexPage() {
  permanentRedirect("/dashboard/playground");
}
