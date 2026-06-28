"use client";

/**
 * A placeholder slot for a custom line-art illustration that hasn't been
 * drawn yet. Authored inline in a lesson wherever an illustration of a person
 * or object would fit:
 *
 * ```mdx
 * <IllustrationPrompt subject="Brendan Eich" photo />
 * <IllustrationPrompt subject="a Gentoo penguin standing on ice" />
 * ```
 *
 * It renders a dashed "to be illustrated" card carrying the exact generation
 * prompt plus a copy button, so the prompt can be dropped straight into the
 * image tool. Centralising the prompt template here keeps every request
 * consistent (Recraft Vector V4.1, transparent background, light/dark safe);
 * authors only supply the subject and whether a reference photo is attached.
 */
import { useCallback, useState } from "react";
import { Check, Copy, ImageIcon } from "lucide-react";
import styles from "./IllustrationPrompt.module.css";

interface IllustrationPromptProps {
  /** What to illustrate, phrased to read naturally after "illustration of"
   *  (e.g. "Brendan Eich", "a person punching holes in a paper punch card"). */
  subject: string;
  /** Set for a specific real person — appends "(photo attached)" so the prompt
   *  signals that a reference photo accompanies the request. Omit for generic
   *  objects/scenes that need no reference image. */
  photo?: boolean;
}

function buildPrompt(subject: string, photo: boolean): string {
  const reference = photo ? " (photo attached)" : "";
  return (
    `Create a line art-styled illustration of ${subject}${reference}. ` +
    `Use Recraft Vector V4.1. Use a transparent background. ` +
    `The illustration should work well in both light (#ffffff) and dark backgrounds (#121212).`
  );
}

export function IllustrationPrompt({ subject, photo = false }: IllustrationPromptProps) {
  const prompt = buildPrompt(subject, photo);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [prompt]);

  return (
    <div className={styles.placeholder} role="group" aria-label="Illustration placeholder">
      <div className={styles.header}>
        <span className={styles.label}>
          <ImageIcon className={styles.labelIcon} aria-hidden="true" />
          Illustration prompt
        </span>
        <button
          type="button"
          className={styles.copyButton}
          onClick={handleCopy}
          aria-label={copied ? "Prompt copied" : "Copy illustration prompt"}
          title={copied ? "Copied" : "Copy prompt"}
        >
          {copied ? (
            <Check className={styles.copyIcon} aria-hidden="true" />
          ) : (
            <Copy className={styles.copyIcon} aria-hidden="true" />
          )}
        </button>
      </div>
      <p className={styles.prompt}>{prompt}</p>
    </div>
  );
}

export default IllustrationPrompt;
