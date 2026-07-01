# Magic UI components

[Magic UI](https://magicui.design) components live here. They are plain
Tailwind + Motion React components (the same delivery model as shadcn/ui).

## Using them in a route

Magic UI components are built from Tailwind utility classes, and this app does
**not** load Tailwind globally (only `/learn` does, for Fumadocs). To render
Magic UI components in any other route, import the shared stylesheet once from
that route's `layout.tsx` (or page):

```tsx
import "@/app/tailwind.css";
```

This is scoped by Next.js to that route's bundle, so other routes stay
Tailwind-free. See `app/magicui-demo/` for a working example, live at
`/magicui-demo`.

`app/tailwind.css` intentionally includes Tailwind's Preflight reset and uses
`@source "..."` globbing (Tailwind's automatic content scan is disabled with
`source(none)` for compile speed). **If you use Tailwind/Magic UI classes in a
new directory, add an `@source` line for it in `app/tailwind.css`.**

## Adding more components

Two equivalent options:

1. **shadcn CLI** (one-off, works in any session):

   ```bash
   npx shadcn@latest add "https://magicui.design/r/<component>.json"
   ```

   `components.json` is already configured (components → `@/components/ui`,
   `cn` → `@/lib/utils`, css → `app/tailwind.css`).

2. **Magic UI MCP server** — configured in `.mcp.json` at the repo root. It is
   picked up by Claude Code at the start of a **new** session (MCP servers load
   at startup, so it won't appear mid-session). In Claude Code on the web, only
   project-scoped servers committed to `.mcp.json` are available — `claude mcp
   add` / local user config is not.

After adding a component, check `app/tailwind.css`: components that ship custom
keyframes/animations (e.g. Marquee, ShimmerButton) need their `@keyframes` and
`--animate-*` theme entries present there. The shadcn CLI usually injects these
into the configured css file; verify after running it.
