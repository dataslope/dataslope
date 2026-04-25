// CodeMirror v5 ships without TypeScript types; declare the bare module
// names so dynamic / static imports type-check. The narrow runtime shape we
// actually consume is described in `runtime/globals.ts` (`CodeMirrorAPI`).
declare module "codemirror" {
  const CodeMirror: unknown;
  export default CodeMirror;
}
declare module "codemirror/mode/python/python";
declare module "codemirror/mode/r/r";
declare module "codemirror/mode/javascript/javascript";
declare module "codemirror/mode/php/php";
declare module "codemirror/mode/htmlmixed/htmlmixed";
declare module "codemirror/mode/xml/xml";
declare module "codemirror/mode/clike/clike";
declare module "codemirror/mode/css/css";
declare module "codemirror/addon/edit/closebrackets";
declare module "codemirror/addon/edit/matchbrackets";
declare module "codemirror/addon/comment/comment";
declare module "codemirror/keymap/sublime";

// plotly.js-dist-min has no shipped types either; we only use a tiny slice
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
