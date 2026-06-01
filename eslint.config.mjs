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
