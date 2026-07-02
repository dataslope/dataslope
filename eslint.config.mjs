import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "cdn-assets/_dotnet/**",
      ".source/**",
      // Generated, minified worker bundles (rebuilt on every build by
      // scripts/build-almostnode-workers.mjs; gitignored). Linting them
      // produces thousands of meaningless errors/warnings.
      "public/_workers/**",
      // Generated server-side search index (a multi-MB `export default [...]`
      // emitted by scripts/build-search-index.mjs; gitignored). The committed
      // .d.ts sibling is linted normally.
      "lib/generated/search-index.js",
      // Generated brand-token fallback map (emitted from app/brand.css by
      // scripts/build-brand-fallbacks.mjs; gitignored). The committed .d.ts
      // sibling is linted normally.
      "lib/generated/brand-fallbacks.js",
    ],
  },
  {
    rules: {
      // Allow underscore-prefixed and rest-sibling bindings to be unused,
      // e.g. `const { seed: _seed, ...meta } = active` to omit a field.
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
