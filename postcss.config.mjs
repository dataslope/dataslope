/**
 * Only the Tailwind v4 plugin (Fumadocs UI relies on it). Tailwind activates
 * only in stylesheets that `@import 'tailwindcss'`, so app/globals.css and
 * the per-component CSS modules are unaffected.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
