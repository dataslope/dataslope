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
import {
  buildIllustrationPrompt,
  illustrationFileSlug,
} from "@/lib/illustrationPrompt";
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

export function IllustrationPrompt({ subject, photo = false }: IllustrationPromptProps) {
  const prompt = buildIllustrationPrompt(subject, photo);
  // Deep-link target: the `/illustration-prompts` gallery links back here using
  // the same semantic file slug, so each placeholder is addressable by anchor.
  const slug = illustrationFileSlug(subject, photo);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [prompt]);

  return (
    <div
      id={slug}
      data-illustration-file={`${slug}.svg`}
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
      <p className={styles.prompt}>{prompt}</p>
    </div>
  );
}

export default IllustrationPrompt;
