import type { NarrationScript } from "../../narration/types";

/**
 * Why counting the R's in "strawberry" is tricky for a language model, as a
 * vertical short. Every animation in Video.tsx is cued to a word below, so an
 * edited beat re-times its scene, and a cue naming a word a beat no longer
 * says throws in the Studio.
 *
 * Facts checked with js-tiktoken 1.0.21 (o200k_base is the GPT-4o
 * tokenizer, cl100k_base the GPT-4 one):
 *
 *   o200k_base  "strawberry"   → "st" 302 · "raw" 1618 · "berry" 19772
 *   o200k_base  " strawberry"  → " strawberry" 101830 (one token)
 *   o200k_base  "How many r's are in strawberry?" → 8 tokens:
 *               How 5299 · " many" 1991 · " r" 428 · "'s" 885 · " are" 553 ·
 *               " in" 306 · " strawberry" 101830 · "?" 30
 *   o200k_base  " s t r a w b e r r y" → 10 tokens, three of them " r" 428
 *   cl100k_base "strawberry"   → "str" 496 · "aw" 675 · "berry" 15717
 *   cl100k_base " strawberry"  → 73700 (one token)
 *
 * The rule of thumb (about four characters, or three quarters of a word, per
 * token; 1,000 tokens is roughly 750 words) and "you pay per token" are the
 * lesson's own, from content/courses/how-llms-work/tokens.mdx.
 */
export const script: NarrationScript = {
  id: "llm-tokens",
  leadIn: 0.3,
  tail: 2.4,
  beats: [
    {
      id: "hook",
      text: "How many R's are in strawberry? Three. Yet AI models can get this wrong.",
      pauseAfter: 0.3,
    },
    {
      id: "sees",
      text: "That's because a model never reads letters. It reads tokens.",
      pauseAfter: 0.3,
    },
    {
      id: "split",
      text: "Run strawberry through the GPT-4o tokenizer, and it splits into three chunks.",
      pauseAfter: 0.2,
    },
    {
      id: "ids",
      text: "Each chunk becomes an ID number, and those numbers are all the model gets.",
      pauseAfter: 0.35,
    },
    {
      id: "sentence",
      text: "Inside a question, with its leading space, the whole word is just one token.",
      pauseAfter: 0.3,
    },
    {
      id: "why",
      text: "So to count the R's, it has to recall how that token is spelled, instead of looking.",
      pauseAfter: 0.35,
    },
    {
      id: "spell",
      text: "Newer models often get it right. Spell the word out, and every letter becomes its own token.",
      pauseAfter: 0.4,
    },
    {
      id: "rule",
      text: "For English, one token is about four characters, or three quarters of a word.",
      pauseAfter: 0.25,
    },
    {
      id: "units",
      text: "Tokens are also what you pay for, and what context limits are measured in.",
      pauseAfter: 0.45,
    },
    {
      id: "outro",
      text: "Learn how tokens work, on Dataslope.",
    },
  ],
};
