// Shared chrome for every /dashboard route: the "Studio" shell (persistent
// sidebar + top bar). A server component so it can render the pre-hydration
// theme script (no light/dark flash) and load the CSS the shell needs; the
// shell itself is the client component StudioShell.
import "@/app/tailwind.css";
import "./_studio/studio.css";
import { THEME_BOOTSTRAP } from "@/app/_components/home/themeBootstrap";
import { StudioShell } from "./_studio/StudioShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <StudioShell>{children}</StudioShell>
    </>
  );
}
