import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Playground",
  description: "Browser-based language playgrounds.",
};

// Runs before React hydrates. Reads the persisted editor theme from
// localStorage and applies the matching UI palette + data-theme attribute
// to <html> synchronously, so the rest of the UI never paints in the
// "wrong" (default dracula/dark) palette while the editor loads with a
// different one.
const themeBootstrapScript = `
(function () {
  try {
    // --text-dim and --text-muted are derived from --text and --bg via
    // color-mix in playground.css and retint automatically. --text-soft
    // and --text-accent are theme-driven (the same fields that drive the
    // editor's comments and atoms) and DO need to be set inline so the
    // first paint matches the persisted theme.
    var palettes = {
      "dracula":         {bg:"#282a36",bg2:"#21222c",bg3:"#343746",border:"#44475a",text:"#f8f8f2",soft:"#6272a4",accent:"#bd93f9"},
      "monokai":         {bg:"#272822",bg2:"#1e1f1c",bg3:"#3e3d32",border:"#49483e",text:"#f8f8f2",soft:"#75715e",accent:"#ae81ff"},
      "material-darker": {bg:"#212121",bg2:"#1a1a1a",bg3:"#2d2d2d",border:"#3d3d3d",text:"#eeffff",soft:"#546e7a",accent:"#82aaff"},
      "nord":            {bg:"#2e3440",bg2:"#272c36",bg3:"#3b4252",border:"#434c5e",text:"#d8dee9",soft:"#4c566a",accent:"#88c0d0"},
      "tomorrow-night-eighties":{bg:"#2d2d2d",bg2:"#252525",bg3:"#393939",border:"#515151",text:"#cccccc",soft:"#777777",accent:"#cc99cc"},
      "solarized dark":  {bg:"#002b36",bg2:"#00212b",bg3:"#073642",border:"#094b5a",text:"#839496",soft:"#586e75",accent:"#657b83"},
      "solarized light": {bg:"#fdf6e3",bg2:"#eee8d5",bg3:"#f5efdc",border:"#ddd6c0",text:"#657b83",soft:"#93a1a1",accent:"#586e75"},
      "eclipse":         {bg:"#ffffff",bg2:"#f5f5f5",bg3:"#ebebeb",border:"#d8d8d8",text:"#1a1a1a",soft:"#aaaaaa",accent:"#555555"},
      "mdn-like":        {bg:"#ffffff",bg2:"#f9f9fb",bg3:"#f0f0f4",border:"#dcdce0",text:"#333333",soft:"#aaaaaa",accent:"#666666"}
    };
    var lightThemes = {"eclipse":1,"mdn-like":1,"solarized light":1};
    if (!/^\/playground(?:\/|$)/.test(location.pathname)) return;
    var theme = localStorage.getItem("pg_editor_theme");
    if (!theme || !palettes[theme]) return;
    var p = palettes[theme];
    var r = document.documentElement;
    r.style.setProperty("--bg", p.bg);
    r.style.setProperty("--bg2", p.bg2);
    r.style.setProperty("--bg3", p.bg3);
    r.style.setProperty("--border", p.border);
    r.style.setProperty("--text", p.text);
    r.style.setProperty("--text-soft", p.soft);
    r.style.setProperty("--text-accent", p.accent);
    r.setAttribute("data-theme", lightThemes[theme] ? "light" : "dark");
  } catch (e) { /* localStorage unavailable — fall back to default theme */ }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/dataslope-logo-blue.svg" type="image/svg+xml" />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
