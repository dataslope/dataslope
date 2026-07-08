import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./brand.css";
import "./globals.css";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import AskAi from "@/app/_components/ai/AskAi";
import NavigationLoadingIndicator from "@/app/_components/NavigationLoadingIndicator";
import SkipToContent from "@/app/_components/SkipToContent";
import { ReturnToTracker } from "@/app/_components/auth/returnTo";

// The app's two typefaces, self-hosted by next/font and published as CSS
// variables on <html> so every route (and every portal, portals stay inside
// <html>) can consume them. This is the ONLY place the webfonts are loaded;
// stylesheets reference var(--font-sans) / var(--font-mono) and must not
// re-import the faces (the old per-stylesheet Google Fonts @imports
// double-loaded Inter alongside next/font and forced a render-blocking
// third-party request).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const SITE_DESCRIPTION =
  "Free, interactive, no sign-up. Browser-based playgrounds and courses for Python, SQL, C++, and more, all running on WebAssembly.";

// `metadataBase` makes every relative OpenGraph/canonical URL resolve to an
// absolute production URL. The `title.template` appends "· DataSlope" to each
// page's own title (e.g. "SQLite Playground" → "SQLite Playground · DataSlope")
// while `default` covers routes that set no title of their own. Routes without
// their own `openGraph`/`twitter` (the playground layouts, /terms, /privacy)
// inherit this site-level card + share image, so every page is shareable.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DataSlope, Learn Python, SQL, C++ in your browser",
    template: "%s · DataSlope",
  },
  description: SITE_DESCRIPTION,
  applicationName: "DataSlope",
  openGraph: {
    type: "website",
    siteName: "DataSlope",
    url: SITE_URL,
    title: "DataSlope, Learn Python, SQL, C++ in your browser",
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "DataSlope, Learn Python, SQL, C++ in your browser",
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

// Runs before React hydrates. On /playground routes it applies the SITE
// light/dark choice (the shared `theme` localStorage key + `.dark`/`.light`
// class, the same one /learn and the home page use) to the playground's CSS
// custom properties + `data-playground-theme`, so the chrome never paints in
// the wrong palette before the React app (and usePlaygroundThemeSync) takes
// over. The two GitHub palettes mirror THEME_PALETTES in playgroundTheme.ts.
const themeBootstrapScript = `
(function () {
  try {
    if (location.pathname.indexOf("/playground") !== 0) return;
    var stored = null;
    try { stored = localStorage.getItem("theme"); } catch (e) {}
    var dark = stored === "dark" ||
      (stored !== "light" && document.documentElement.classList.contains("dark"));
    var p = dark
      ? {bg:"#121212",bg2:"#0a0a0a",bg3:"#1c1c1c",border:"#2a2a2a",text:"#c9d1d9",dim:"#8b949e",muted:"#79c0ff",fn:"#d2a8ff",kw:"#ff7b72",a1:"#d2a8ff",a2:"#79c0ff"}
      : {bg:"#ffffff",bg2:"#f6f8fa",bg3:"#eaeef2",border:"#d0d7de",text:"#24292f",dim:"#6e7781",muted:"#0550ae",fn:"#8250df",kw:"#cf222e",a1:"#8250df",a2:"#0550ae"};
    var r = document.documentElement;
    r.classList.toggle("dark", dark);
    r.classList.toggle("light", !dark);
    r.style.setProperty("--bg", p.bg);
    r.style.setProperty("--bg2", p.bg2);
    r.style.setProperty("--bg3", p.bg3);
    r.style.setProperty("--border", p.border);
    r.style.setProperty("--text", p.text);
    r.style.setProperty("--text-dim", p.dim);
    r.style.setProperty("--text-muted", p.muted);
    r.style.setProperty("--text-complementary", p.fn);
    r.style.setProperty("--theme-primary", p.kw);
    r.style.setProperty("--accent1", p.a1);
    r.style.setProperty("--accent2", p.a2);
    r.setAttribute("data-playground-theme", dark ? "dark" : "light");
  } catch (e) { /* localStorage unavailable, fall back to default theme */ }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/dataslope-logo-blue.svg" type="image/svg+xml" />
        {/* Warm up the CDNs the WASM runtimes and sample datasets load
            from, so the first runtime boot skips the DNS + TLS round
            trips. Full preconnect for the two hosts almost every page
            hits (jsDelivr serves Pyodide, sqlite-wasm, PGlite, the .NET
            assemblies, browsercc and the datasets; raw.githubusercontent
            is the datasets fallback); cheap dns-prefetch for the
            language-specific rest. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://raw.githubusercontent.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://webr.r-wasm.org" />
        <link rel="dns-prefetch" href="https://cjrtnc.leaningtech.com" />
        <link rel="dns-prefetch" href="https://esm.sh" />
        <link rel="dns-prefetch" href="https://unpkg.com" />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        {/* First tab stop on every page, playground headers alone have ~10
            stops before the editor. Visually hidden until focused. */}
        <SkipToContent />
        {children}
        {/* Signed-in "Ask AI" chat pane. Renders only on /learn and
            /playground (pathname-gated inside), and its heavy deps are
            dynamically imported so other pages don't pay for them. */}
        <AskAi />
        {/* Corner badge with the brand diamond loader, shown while a slow
            client-side navigation (playgrounds, course pages) is pending. */}
        <NavigationLoadingIndicator />
        {/* Records the last non-auth page per tab so /sign-in can send
            the user back where they came from after authenticating. */}
        <ReturnToTracker />
      </body>
    </html>
  );
}
