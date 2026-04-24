import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1117",
        color: "#e2e8f0",
        fontFamily:
          'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: 560, width: "100%" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
          Playground
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
          Browser-based language playgrounds.
        </p>
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
          <li>
            <Link
              href="/python"
              style={{
                display: "block",
                padding: "16px 20px",
                border: "1px solid #2a3347",
                borderRadius: 8,
                background: "#161b27",
                color: "#e2e8f0",
                textDecoration: "none",
              }}
            >
              <strong>Python</strong>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                Run Python in the browser via Pyodide.
              </div>
            </Link>
          </li>
          <li>
            <span
              style={{
                display: "block",
                padding: "16px 20px",
                border: "1px dashed #2a3347",
                borderRadius: 8,
                color: "#64748b",
              }}
            >
              <strong>PostgreSQL</strong>
              <div style={{ fontSize: 13, marginTop: 4 }}>Coming soon at /postgres.</div>
            </span>
          </li>
        </ul>
      </div>
    </main>
  );
}
