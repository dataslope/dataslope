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
// variables on <html>. This is the ONLY place webfonts load — stylesheets
// reference var(--font-sans)/var(--font-mono) and must not re-import faces.
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

// `metadataBase` resolves relative OG/canonical URLs to absolute production
// URLs; `title.template` appends "· DataSlope". Routes without their own
// openGraph/twitter inherit this site-level card, so every page is shareable.
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

// Runs before React hydrates, on EVERY route. Normalizes localStorage
// "theme" to the site's binary "light" | "dark" contract (anything else is
// removed so every consumer resolves a missing value to light). Then, on
// /playground routes only, applies the choice to the playground CSS custom
// properties + `data-playground-theme` so the chrome never paints in the
// wrong palette; the palettes mirror THEME_PALETTES in playgroundTheme.ts.
const themeBootstrapScript = `
(function () {
  try {
    var stored = null;
    try {
      stored = localStorage.getItem("theme");
      if (stored !== null && stored !== "dark" && stored !== "light") {
        localStorage.removeItem("theme");
        stored = null;
      }
    } catch (e) {}
    if (location.pathname.indexOf("/playground") !== 0) return;
    var dark = stored === "dark" ||
      (stored !== "light" && document.documentElement.classList.contains("dark"));
    var p = dark
      ? {bg:"#121212",bg2:"#0a0a0a",bg3:"#1c1c1c",border:"#2a2a2a",text:"#c9d1d9",dim:"#8b949e",muted:"#79c0ff",fn:"#d2a8ff",kw:"#ff7b72",a1:"#d2a8ff",a2:"#79c0ff"}
      : {bg:"#ffffff",bg2:"#f6f8fa",bg3:"#eaeef2",border:"#d0d7de",text:"#24292f",dim:"#6e7781",muted:"#0550ae",fn:"#8250df",kw:"#cf222e",a1:"#8250df",a2:"#0550ae"};
    var r = document.documentElement;
    r.classList.toggle("dark", dark);
    r.classList.toggle("light", !dark);
    r.style.colorScheme = dark ? "dark" : "light";
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
        {/* Warm up the WASM-runtime/dataset CDNs so the first boot skips
            DNS + TLS. Full preconnect for the two hosts almost every page
            hits; cheap dns-prefetch for the language-specific rest. */}
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
        {/* "Ask AI" chat pane; pathname-gated inside to /learn and
            /playground, heavy deps dynamically imported. */}
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
