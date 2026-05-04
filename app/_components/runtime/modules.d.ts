// plotly.js-dist-min has no shipped types; we only use a tiny slice
// (described in `Playground.tsx` as `PlotlyAPI`).
declare module "plotly.js-dist-min" {
  const Plotly: unknown;
  export default Plotly;
}

// php-wasm ships ESM JavaScript with no TypeScript types. We only consume
// the `PhpWeb` class — its narrow runtime shape is described locally in
// `runtime/php.tsx` (`PhpWebInstance`).
declare module "php-wasm/PhpWeb.mjs" {
  const PhpWeb: unknown;
  export { PhpWeb };
}
