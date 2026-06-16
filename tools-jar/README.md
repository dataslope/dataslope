# dataslope-tools-jar

OpenJDK 8 `tools.jar` (containing `com.sun.tools.javac.Main`) packaged as a
standalone npm package so it can be delivered over a CDN to the Dataslope
in-browser Java playground.

## Why this package exists

The Java playground compiles and runs code entirely in the browser via
[CheerpJ](https://cheerpj.com/) (OpenJDK in WebAssembly). CheerpJ does not
ship `tools.jar`, so the playground supplies its own copy of `javac` and loads
it into CheerpJ's filesystem at runtime.

Hosting the ~18 MB jar on a CDN instead of the app's own origin keeps it off
the Vercel bandwidth bill. We use **unpkg** specifically because:

- **jsDelivr** refuses `.jar` files (returns HTTP 403).
- **GitHub release assets** send no `Access-Control-Allow-Origin` header, so a
  browser `fetch()` is blocked by CORS.
- **unpkg** serves the jar with `access-control-allow-origin: *` and, when the
  version is pinned, an immutable 1-year cache.

The app fetches it from `https://unpkg.com/dataslope-tools-jar@<version>/tools.jar`
— see `TOOLS_JAR_CDN` in `app/_components/runtime/cdn.ts`.

## Provenance & license

`tools.jar` is taken unmodified from OpenJDK 8 and is distributed under the
**GPL v2 with the Classpath Exception**, the same license as OpenJDK itself.
The corresponding source is OpenJDK 8 (https://openjdk.org/).

## Publishing a new version

1. Replace `tools-jar/tools.jar` with the new jar.
2. Bump `version` in `tools-jar/package.json`.
3. From the repo root, publish (you must be logged in to npm with publish
   rights for this package):
   ```bash
   npm run publish:tools-jar
   ```
   This runs `npm publish ./tools-jar`; `publishConfig.access` makes it public.
4. Bump `TOOLS_JAR_VERSION` in `app/_components/runtime/cdn.ts` to match the
   new version so the app fetches the new jar. Pinning the version is what
   yields the immutable 1-year CDN cache.

> **Deploy ordering:** publish the npm package *before* deploying an app build
> that points `TOOLS_JAR_VERSION` at it — the playground fetches the jar from
> unpkg at runtime, so the version must already exist on npm or Java will fail
> to start.
