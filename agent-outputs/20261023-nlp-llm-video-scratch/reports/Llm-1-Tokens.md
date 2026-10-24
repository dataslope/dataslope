# Llm-1-Tokens ("What the model reads"): builder report

Composition `Llm-1-Tokens`, folder `video/src/videos/llm-tokens/`. Unit 1 of How Large Language Models Work, voiced by Drew.

## Length, voice

- **Length:** 323.1 s (5:23) on the voiced timeline (`npm run cues -- llm-tokens`), 39 beats, 740 words, 137 wpm overall.
- **Voiced:** 4,094 characters (cap 4,800), in 3 takes: take 1 hook to bpe-in (17 beats, 1,766 chars), take 2 bpe to azul (14 beats, 1,354), take 3 formats to next (8 beats, 974). One run, no 429s, nothing re-voiced, no `--force`.

## Checks

All run on my entry (`VIDEO_ENTRY=out/entries/Llm-1-Tokens.tsx`) through `out/render-slot.sh`, on the final code.

- **Typecheck** (`tsc --noEmit`): no errors in `src/videos/llm-tokens/` (the whole package exits 0). **Lint** (`eslint src/videos/llm-tokens`): clean.
- **check:cues**: nothing for llm-tokens. **npm test**: 59 of 59 pass.
- **check:frames**: pass. 4 illustrations, largest stretch 0.68 (none drawn past its pixels); 6 arrows, worst 5.4° of bend under a head. Run before voicing (art not in yet) and twice after, with the art.
- **check:sync**: pass. 39 beats, worst +0.03 s (formats, at 4:08.3); every beat within ±0.12 s.
- **check:motion**: pass. Longest still 2.3 s (counts-in, formats). The first run failed three stretches (2:18.8 bpe 4.8 s, 2:24.0 bpe/corpus 3.0 s, 4:55.3 chat/turns 3.3 s); fixed by writing the training text out word by word, set large until it moves up on "training text", and by drawing the chart's axis and turn numbers on "every turn". Preview kept at `out/Llm-1-Tokens-preview.mp4`.
- **check:mix** (informational): effects -45.4 LUFS against narration -20.1 LUFS, **25.3 LU under**; effects peak -21.1 dBFS at 0:00.6 (the series intro's logo); where both sound, speech a median 28.1 dB above the effects (5th percentile 13.2 dB). Closest: 2:47.8 and 3:04.1, merge pops landing on "Merge" and "E and S", 8.8 and 10.4 dB in a 50 ms window, after I lowered the BPE merge pops from -28 to -31 (they were 5.8 and 7.4 dB).

## Scenes

0. SeriesIntro: "How Large Language Models Work, Unit 1 / What the model reads" (title kept).
1. **ModelScene** (hook, vocab, pick): Fig. 1, one step of a model: "the" into a box, the lesson's illustrative next-token table out (cat 0.31, dog 0.14, man 0.09, first 0.04), "and 199,996 more tokens, sharing the other 0.42"; the die for "picking is a separate step".
2. **LoopScene** (loop to token-in): Fig. 2, the lesson's toy loop as a staircase (each pick flies down into the next row's context, through `<end>`); Fig. 3, the same loop as a ring (run the model, pick a token, add it to the end) with a dot circling per new token; then "No plan, no database", the yarn ball as the weights, and a well known fact and an invented citation leading out of the same ball.
3. **StrawScene** (token to letters): Fig. 4, five rows of o200k_base's vocabulary (id and piece, whole word or piece, a legend for the leading-space dot); Fig. 5, strawberry splitting into st | raw | berry with ids 302, 1618, 19772 inked on their spoken numbers, then ·strawberry as one id 101830; the letters with their three R's, dimmed under "the letters never arrive: only 302, 1618, 19772". Watercolor strawberry in three chunks.
4. **RateScene** (rate, newer, bpe-in): Fig. 6, the rule of thumb (1 token ≈ 4 characters ≈ 0.75 words; 1,000 tokens ≈ 750 words); Fig. 7, the lesson's own opening paragraph inking token by token (190 characters, a live count to 36 tokens, 5.3 characters a token); st | raw | berry with the cuts marked, "Nobody chose these cuts. They were learned."
5. **BpeScene** (bpe to counts-in): Fig. 8, the lesson's training text and its four words as tiles (one per character plus a dashed `</w>`); Fig. 9, the first pair count (l o 7, o w 7, ...) with brackets under the pairs as they are said; Fig. 10, the ten merges in the lesson's order, each fusing its tiles in every word at once; widest left as w i d est`</w>`, "= the tokenizer", the list replayed in order.
6. **BytesScene** (bytes, hello, azul): Fig. 11, hello in four scripts as UTF-8 byte squares wrapped by o200k token outlines: English 5 bytes / 1 token, Japanese 15 / 1, Hindi 18 / 4, Tifinagh 12 / 12 (one token a byte, in red).
7. **FormatScene** (formats, json, models, price): Fig. 12, characters a token on the lesson's prose (4.5) and code (2.4) samples, each with its first repeat drawn as tokens; Fig. 13, the lesson's three records as one cell per token, JSON 89 against CSV 33; Fig. 14, the same JSON on four tiktoken encodings (89, 89, 102, 120) with Anthropic's 30% beneath (cited as the lesson cites it); the price check 0.8 × 1.3 = 1.04.
8. **ChatScene** (chat, turns, number, next): Fig. 15, the lesson's ten-turn conversation as bars of what each turn sends, the system prompt and the 7,000-token length marked, a counter that climbs with the bars to 43,500 ("6.2× the conversation's length"); Fig. 16, berry 19772 and ·cherry 60225 under the strawberry and cherries; `NextLine` "Next: turning ids into meaning".

**Illustrations** (`illustrations.json`, watercolor, `gpt-image-2.5-flare`, quality low, transparent): `llm-tokens-strawberry` (hero), `llm-tokens-cherries`, `llm-tokens-yarn`, `llm-tokens-die` (icons). The batch sat at 0 of 4 for an hour; it was cancelled (`batch_6adafb07eb408190a64f3c7fb828ae0a`, status cancelling, 0 completed) and the four were made with the generator's `sync` command (about $0.02), then imported. All four are right first time (no redraws).

## Facts

Everything on screen comes from `measure.py` (run with the scratch pyenv: Python 3.13.16, tiktoken 0.12.0), its `measurements.json`, and `data.ts`. `measure.py` reads the lessons' code blocks straight out of the .mdx files, runs them, and exits if any prints something other than the site's recorded output in `lib/generated/block-outputs.json` (keyed with `lib/blockOutputKey.ts`'s FNV-1a, re-implemented). Seven blocks are checked that way: the toy loop and the next-token table, the pair count and the training loop (and every intermediate step of the merge walk, re-run with the lesson's own `pair_counts`/`merge_pair`), the estimate block, the JSON/CSV block and the conversation block. All seven agree with the page.

- The next-token probabilities (0.31, 0.14, 0.09, 0.04) are the lesson's illustration, not a model's output; the figure says "Scores as the lesson illustrates them". Their o200k ids and the vocabulary size (199,998 merged + 2 special = 200,000) are measured.
- Token counts for the lesson's prose and code samples and the JSON/CSV records are real o200k_base counts; the lesson's blocks only estimate them by dividing characters by a ratio (225 and 413; 93 and 22). The video shows the measured numbers (201 and 520; 89 and 33).
- The four greetings (hello, konnichiwa, namaste, azul) are the video's own example, measured. Their scripts are not drawn on screen: the video's bundled fonts have no Japanese, Devanagari or Tifinagh glyphs, and a system fallback would render differently on every machine. Each row shows the language, a romanization, its bytes and its tokens.
- "About thirty percent more tokens" for Anthropic's newer tokenizer is the lesson's cited claim (its footnote: Anthropic, Pricing, as of October 2026), shown with that attribution; it cannot be computed here.
- Which model each tiktoken encoding belongs to comes from tiktoken's own table (`encoding_name_for_model`): gpt-4o, gpt-4, text-davinci-003, davinci ("GPT-3's tokenizer").
- "st" is respelled "ess-tee" in the narration for the voice; the screen keeps "st".

## Lesson discrepancies (not fixed)

- `content/courses/how-llms-work/token-counts-in-practice.mdx:190`: "Ten turns, and you paid for roughly five times the conversation's length." The lesson's own block just above prints "Conversation is 7000 tokens long. You were billed for 43500 input tokens, 6.2x that." (site recorded output, key e9200518). The video says "over six times" and shows 6.2×.
- `token-counts-in-practice.mdx:68-69`: "Wrapping data in JSON roughly doubles its token cost compared with a compact tabular format". The lesson's own block below it prints "Ratio: 4.3 x" (from its estimates), and the records measured with o200k_base are 89 tokens as JSON against 33 as CSV, 2.7 times. Neither is "roughly doubles". The video shows 89 and 33 and does not state a ratio.
- `tokens.mdx:130` (and `token-counts-in-practice.mdx:268`, `:311`): "Estimate code at about three characters per token." The lesson's own code sample (tokens.mdx estimate block) measures 2.38 characters a token on o200k_base (1,240 characters, 520 tokens), so the block's "~413 tokens" undercounts it by a fifth. The video shows the measured 2.4 ("under two and a half"). Mild: it is a rule of thumb.
- `tokens.mdx:98-100`: "The same sentence in Japanese or Thai can take two to three times as many tokens as in English". Not checked: the lesson gives no sentence to measure. Measured on single words, o200k_base encodes こんにちは as one token, the same as "hello", so the claim may be dated for o200k_base. The video does not repeat it.

## Kit suggestions

- `TokenRun` (parts.tsx): a run of text drawn as its tokens, neighbours in two tints, newlines honoured, inked in order. Any LLM or NLP video showing tokenization could use it.
- `Chip`/`ChipFace` (parts.tsx): a token chip with an optional id under it and a red focus state, the leading space drawn as a soft middle dot.
- `PathArrow`/`CurveArrow`/`ElbowArrow`/`InlineArrow` (parts.tsx): arrows that draw in along any sampled line with the head from `arrowHead()` on the drawn part; `InlineArrow` sits in a row of text where a "→" glyph would otherwise go.
- `Kicker`, `Headline`, `Mark`, `Drift`, `Spot` are copied from DbDesign-1's parts.tsx, as most course videos do; they belong in `editorial/`.
- `out/Llm-1-Tokens-stills.mjs` renders a list of stills from one bundle and one browser, much cheaper than one `remotion still` per frame; a shared `npm run stills -- <id> f1 f2 ...` would save every builder time.

## Left undone

Nothing required is left. Notes for the coordinator:

- The art batch stalled (0 of 4 after an hour) and was cancelled and replaced by `sync`, as approved; the cancelled batch reported 0 completed, so it cannot bill a second set.
- `tiktoken-cache` in the scratch folder now holds o200k_base, cl100k_base, p50k_base and r50k_base (fetched by tiktoken on first use). `measure.py` needs them (`TIKTOKEN_CACHE_DIR`).
- Lesson discrepancies above are reported only; no lesson was edited.
- I did not commit; `git status` shows my folders already captured in the coordinator's snapshot commits.
