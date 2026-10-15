// Real tokenizer output, from js-tiktoken 1.0.21 (see script.ts for the
// full run). A leading space is part of a token, so it is kept here and
// drawn as a dot on screen.

export type Tok = { text: string; id: number };

/** o200k_base (GPT-4o), "strawberry" with no leading space. */
export const BARE: Tok[] = [
  { text: "st", id: 302 },
  { text: "raw", id: 1618 },
  { text: "berry", id: 19772 },
];

/** cl100k_base (GPT-4), the same input, for comparison. */
export const BARE_CL100K = ["str", "aw", "berry"];

/** o200k_base, the hook's question. */
export const QUESTION: Tok[] = [
  { text: "How", id: 5299 },
  { text: " many", id: 1991 },
  { text: " r", id: 428 },
  { text: "'s", id: 885 },
  { text: " are", id: 553 },
  { text: " in", id: 306 },
  { text: " strawberry", id: 101830 },
  { text: "?", id: 30 },
];
export const STRAWBERRY_IN_QUESTION = 6;

/** o200k_base, " s t r a w b e r r y": one token per letter. */
export const SPELLED: Tok[] = [
  { text: " s", id: 265 },
  { text: " t", id: 260 },
  { text: " r", id: 428 },
  { text: " a", id: 261 },
  { text: " w", id: 286 },
  { text: " b", id: 287 },
  { text: " e", id: 319 },
  { text: " r", id: 428 },
  { text: " r", id: 428 },
  { text: " y", id: 342 },
];

/** o200k_base, " the": four characters, one token. */
export const THE: Tok = { text: " the", id: 290 };
