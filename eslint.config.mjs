import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      // The other two gitignored generated trees, which `.next` was covering
      // for alone. `.open-next` is ~800 MB of bundled server JS; `.wrangler` is
      // miniflare's local state, and after a `populateCache local` it holds the
      // whole incremental cache as loose files. Linting either is meaningless,
      // and `.wrangler` in particular does not fail politely: `eslint .` walks
      // into it and dies with a V8 out-of-memory abort and a stack trace
      // instead of a lint result.
      //
      // CI never sees either directory (nothing there runs a Cloudflare build
      // before linting), so this only bit whoever had just run
      // `opennextjs-cloudflare build` or `preview` locally — which is anyone
      // working on the incremental cache.
      ".open-next/**",
      ".wrangler/**",
      "node_modules/**",
      "cdn-assets/_dotnet/**",
      ".source/**",
      // Generated, minified worker bundles (build-almostnode-workers.mjs;
      // gitignored).
      "public/_workers/**",
      // Generated brand-token fallback map (build-brand-fallbacks.mjs;
      // gitignored). The committed .d.ts sibling is linted normally.
      "lib/generated/brand-fallbacks.js",
    ],
  },
  {
    rules: {
      // Allow underscore-prefixed and rest-sibling bindings to be unused.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default eslintConfig;
