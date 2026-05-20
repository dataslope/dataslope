// plotly.js-dist-min has no shipped types; we only use a tiny slice
// (described in `Playground.tsx` as `PlotlyAPI`).
declare module "plotly.js-dist-min" {
  const Plotly: unknown;
  export default Plotly;
}
