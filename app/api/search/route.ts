/**
 * Fumadocs built-in search API route (Orama).
 *
 * Handles GET /api/search requests from the Fumadocs search UI.
 * `createFromSource` builds the Orama search index from every page
 * in the `/learn` source and serves it through a standard Next.js
 * Route Handler.
 *
 * The site is English-only, so the Orama English stemmer is used.
 */
import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

export const { GET } = createFromSource(source, {
  language: "english",
});
