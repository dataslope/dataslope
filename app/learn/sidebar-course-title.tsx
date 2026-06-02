"use client";

/**
 * Course title shown at the top of the sidebar (below the search bar) for
 * every page nested inside a course. The course is derived from the current
 * pathname (`/learn/<courseSlug>/...`); the slug→title map is built on the
 * server in the layout from each course's meta.json. Demo/index pages that
 * aren't courses resolve to no title and render nothing.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarCourseTitle({ titles }: { titles: Record<string, string> }) {
  const pathname = usePathname();
  const segments = pathname?.split("/").filter(Boolean) ?? [];
  const slug = segments[0] === "learn" ? segments[1] : undefined;
  const title = slug ? titles[slug] : undefined;

  if (!slug || !title) return null;

  return (
    <Link href={`/learn/${slug}`} data-course-label="">
      {title}
    </Link>
  );
}
