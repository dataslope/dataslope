"use client";

/**
 * Placeholder card for a not-yet-drawn illustration, showing the generation
 * prompt (defined in data/illustration-prompts.json) with a copy button.
 * Centralising the definitions in the JSON keeps the lesson card, the admin
 * gallery, and scripts/generate-illustrations.mjs in sync.
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
