// Shared chrome for every /create route: the "Studio" dashboard shell
// (persistent sidebar + top bar + AI assist), replacing the old
// HomeNav/HomeFooter CreatePageShell. Server component so it can render the
// pre-hydration theme script (no light/dark flash) and load the CSS the shell
// needs; the client shell lives in StudioProviders.
import "@/app/tailwind.css";
import "./_studio/studio.css";
import { THEME_BOOTSTRAP } from "@/app/_components/home/themeBootstrap";
import { StudioProviders } from "./_studio/StudioProviders";

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <StudioProviders>{children}</StudioProviders>
    </>
  );
}
