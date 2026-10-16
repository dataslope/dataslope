// Font files imported from JS resolve to a URL (Remotion's bundler serves
// them as asset modules), for faces registered with the FontFace API.
declare module "*.woff2" {
  const url: string;
  export default url;
}
