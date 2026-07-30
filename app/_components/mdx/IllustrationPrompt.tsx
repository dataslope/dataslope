"use client";

/**
 * A placeholder slot for a custom illustration that hasn't been drawn yet.
 * Authored inline in a lesson by referencing a prompt id defined in
 * `data/illustration-prompts.json`:
 *
 * ```mdx
 * <IllustrationPrompt id="python-basics-hello-world" />
 * ```
 *
 * It renders a dashed "to be illustrated" card carrying the exact GPT Image 2
 * generation prompt (a risograph of the subject, in the four brand colors) plus
 * a copy button, so the prompt can be dropped straight into the image tool or
 * generated in bulk with scripts/generate-illustrations.mjs. Centralising the
 * definitions in the JSON keeps the lesson card, the `/illustration-prompts`
 * gallery, and the generator perfectly in sync; authors only supply the id.
 */
import { useCallback, useState } from "react";
import { Check, Copy, ImageIcon } from "lucide-react";
import { getIllustrationPromptById } from "@/lib/illustrationPromptsGallery";
import styles from "./IllustrationPrompt.module.css";

interface IllustrationPromptProps {
  /** Prompt id defined in `data/illustration-prompts.json` (e.g.
   *  "python-basics-hello-world"). */
  id: string;
}

export function IllustrationPrompt({ id }: IllustrationPromptProps) {
  const entry = getIllustrationPromptById(id);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!entry) return;
    void navigator.clipboard.writeText(entry.prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [entry]);

  // An unknown id renders nothing rather than breaking the lesson build.
  if (!entry) return null;

  return (
    <div
      id={entry.id}
      data-illustration-file={entry.file}
      className={styles.placeholder}
      role="group"
      aria-label="Illustration placeholder"
    >
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
      <p className={styles.prompt}>{entry.prompt}</p>
    </div>
  );
}

export default IllustrationPrompt;
