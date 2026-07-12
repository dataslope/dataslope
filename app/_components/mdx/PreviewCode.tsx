"use client";

/**
 * The labeled, copyable source panel shared by <LivePreview> (CSS course)
 * and <ReactPreview> (React course). Renders a language chip, a copy button,
 * and the verbatim source. Deliberately un-highlighted, these widgets are
 * about the *rendered result* sitting right above the code, so the source is
 * shown plainly (mono, theme-aware) rather than competing for attention with
 * syntax colors.
 */

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import styles from "./livePreview.module.css";

export function PreviewCode({ lang, source }: { lang: string; source: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard denied, non-fatal */
    }
  };
  return (
    <div className={styles.codeSection}>
      <div className={styles.codeHeader}>
        <span className={styles.lang}>{lang}</span>
        <button
          type="button"
          className={styles.copyBtn}
          onClick={copy}
          aria-label={`Copy ${lang} source`}
        >
          {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className={styles.code}>
        <code>{source}</code>
      </pre>
    </div>
  );
}

export default PreviewCode;
