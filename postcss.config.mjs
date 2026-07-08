/**
 * PostCSS config, only loads the Tailwind v4 plugin, which Fumadocs UI
 * relies on. Tailwind only activates for stylesheets that explicitly
 * `@import 'tailwindcss'` (currently just `app/learn/learn.css`), so the
 * existing `app/globals.css` and the per-component CSS modules under
 * `app/_components/` are unaffected.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
