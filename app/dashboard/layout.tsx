// Shared chrome for every /dashboard route: the "Studio" shell (persistent
// sidebar + top bar). A server component that loads the CSS the shell needs;
// the shell itself is the client component StudioShell. The theme is applied
// to <html> before first paint by app/layout.tsx.
import "@/app/tailwind.css";
import "./_studio/studio.css";
import { StudioShell } from "./_studio/StudioShell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StudioShell>{children}</StudioShell>
    </>
  );
}
