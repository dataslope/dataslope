import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Serve the standalone Python playground HTML at /python.
      // The file lives in public/python.html and is served as-is so its
      // inline scripts (Pyodide, CodeMirror, Plotly) work without any
      // changes from the original app.
      { source: "/python", destination: "/python.html" },
    ];
  },
};

export default nextConfig;
