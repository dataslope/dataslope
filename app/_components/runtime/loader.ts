// Tiny CDN loader helpers. We deliberately load Pyodide / CodeMirror / Plotly
// / WebR from CDNs rather than bundling them so they stay out of the Next.js
// build output (per AGENTS.md).

const loadedScripts = new Map<string, Promise<void>>();
const loadedStyles = new Set<string>();

export function loadScript(src: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const existing = loadedScripts.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    // Reuse a script tag that some other code may have already injected.
    const found = document.querySelector(
      `script[src="${CSS.escape(src)}"]`,
    ) as HTMLScriptElement | null;
    if (found && found.dataset.loaded === "true") {
      resolve();
      return;
    }
    const el = found ?? document.createElement("script");
    if (!found) {
      el.src = src;
      el.async = true;
      document.head.appendChild(el);
    }
    el.addEventListener(
      "load",
      () => {
        el.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    el.addEventListener(
      "error",
      () => reject(new Error(`Failed to load script: ${src}`)),
      { once: true },
    );
  });

  loadedScripts.set(src, promise);
  return promise;
}

export async function loadScripts(urls: string[]): Promise<void> {
  for (const url of urls) {
    await loadScript(url);
  }
}

export function loadStylesheet(href: string): void {
  if (typeof document === "undefined") return;
  if (loadedStyles.has(href)) return;
  if (document.querySelector(`link[href="${CSS.escape(href)}"]`)) {
    loadedStyles.add(href);
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  loadedStyles.add(href);
}

export function loadStylesheets(urls: string[]): void {
  for (const url of urls) loadStylesheet(url);
}
