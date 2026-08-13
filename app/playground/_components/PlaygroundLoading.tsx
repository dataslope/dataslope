"use client";

/**
 * Loading fallback for the playground pages' `dynamic(…, { ssr: false })`
 * imports (every `app/playground/<id>/page.tsx`).
 *
 * Two facts shape it:
 *
 *   1. The playground graph — and `playground.css` with it — lives entirely
 *      inside the lazy chunk, so while that chunk downloads none of the
 *      `.playground-boot-*` classes exist yet. This component carries its own
 *      module CSS mirroring the boot overlay's geometry and default dark
 *      palette, and renders the same brand diamond, so chunk-download →
 *      runtime-boot reads as one continuous loading screen rather than two.
 *   2. `loading` components are included in the server render even when the
 *      target module is `ssr: false`, so this is also what the prerendered
 *      HTML paints — the page is never blank before hydration.
 *
 * The background is the playground's default dark `--bg` on purpose: the real
 * boot overlay also paints that default until `applyThemePalette` runs inside
 * the chunk, so a light-theme user sees exactly the flash they see today, not
 * a new one.
 */

import { DiamondAssembleTurnLoader } from "../../_components/mdx/loadingAnimations";
import styles from "./PlaygroundLoading.module.css";

export default function PlaygroundLoading() {
  return (
    <div
      className={styles.overlay}
      role="status"
      aria-label="Loading playground"
    >
      <div className={styles.card}>
        <DiamondAssembleTurnLoader size={64} label="Loading playground…" />
        <div className={styles.title} aria-hidden="true">
          Loading playground
          <span className={styles.ellipsis}>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>
      </div>
    </div>
  );
}
