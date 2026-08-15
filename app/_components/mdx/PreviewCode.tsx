"use client";

/**
 * The labeled, copyable source panel shared by <LivePreview> and
 * <ReactPreview>. Highlighted after mount with the Lezer parsers the editors
 * already ship (`staticHighlight`), so nothing joins the Worker/SSR bundle;
 * plain source is the first paint and the no-parser fallback.
 */

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import styles from "./livePreview.module.css";
import { highlightSource, type HighlightToken } from "./staticHighlight";

export function PreviewCode({ lang, source }: { lang: string; source: string }) {
  const [copied, setCopied] = useState(false);
  const [tokens, setTokens] = useState<HighlightToken[] | null>(null);

  // Highlight in an effect only, so the parser modules stay in client chunks
  // and out of the Worker bundle. Unknown languages resolve null → plain text.
  useEffect(() => {
    let cancelled = false;
    void highlightSource(source, lang)
      .then((result) => {
        if (!cancelled) setTokens(result);
      })
      .catch(() => {
        if (!cancelled) setTokens(null);
      });
    return () => {
      cancelled = true;
    };
  }, [lang, source]);

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
        <code>
          {tokens
            ? tokens.map((token, i) =>
                token.className ? (
                  <span key={i} className={token.className}>
                    {token.text}
                  </span>
                ) : (
                  <span key={i}>{token.text}</span>
                ),
              )
            : source}
        </code>
      </pre>
    </div>
  );
}

export default PreviewCode;
