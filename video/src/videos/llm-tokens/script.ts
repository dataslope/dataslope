import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "What the model reads" (16:9), Unit 1 of How Large Language
 * Models Work, the course's first video. One argument in four parts, after
 * content/courses/how-llms-work/what-a-language-model-is.mdx, tokens.mdx,
 * building-a-tokenizer.mdx and token-counts-in-practice.mdx:
 *
 *   1. A next-token machine ("hook" to "token-in"): the model returns a
 *      probability for every token in its vocabulary, not a word; picking one
 *      is a separate step; generation is that step repeated, each pick
 *      appended; there is no plan, and no database: what it knows is in its
 *      weights.
 *   2. Tokens ("token" to "bpe-in"): a chunk of text with one id; strawberry
 *      as three pieces and three ids, one id with a space in front; why
 *      counting its letters is not something it can do by looking; the rough
 *      conversion rate, checked on the lesson's own opening.
 *   3. Byte-pair encoding by hand ("bpe" to "counts-in"): the lesson's
 *      training text, the first pair count, the merges in the order the
 *      lesson's code learns them, and the rule that comes out of it.
 *   4. Counts in practice ("bytes" to "next"): bytes under tokens, one word in
 *      four scripts; prose against code, JSON against CSV; four tokenizers on
 *      the same JSON, Anthropic's thirty percent and the price check; the
 *      conversation that resends its history. It ends on Unit 2's question:
 *      an id is only a number.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every token, piece, id and count on screen is what measure.py
 * computed (Python 3.13, tiktoken 0.12.0, the site's Pyodide versions) into
 * measurements.json, which data.ts reads. measure.py runs the lessons' own
 * code blocks out of their .mdx files and stops if any prints something other
 * than the site's recorded output (lib/generated/block-outputs.json); the
 * tokenizer is the lessons' o200k_base.
 *   - what-a-language-model-is: the toy loop's six steps ("the", then cat,
 *     sat, on, the, mat, then <end>, "a token that means done") and the
 *     lesson's next-token table (cat 0.31, dog 0.14, man 0.09, first 0.04,
 *     summing to 0.58), which the lesson gives as an illustration ("Something
 *     like:"); the figure says so. Their o200k ids (cat 9059, dog 6446, man
 *     873, first 1577) are measured. o200k_base has 199,998 merged tokens and
 *     2 special ones: "two hundred thousand". The hook glosses tokens as
 *     "chunks of text, often whole words", ahead of their definition. "No plan", "no database", and
 *     "the same mechanism" for a fact and an invented citation are the
 *     lesson's.
 *   - tokens: "strawberry" alone is st, raw, berry, ids 302, 1618 and 19772
 *     ("three oh two, sixteen eighteen, nineteen seven seven two"); with its
 *     leading space it is one id, 101830; measure.py also asserts the lesson's
 *     claim that cl100k_base, p50k_base and r50k_base give the same counts.
 *     "st" is respelled "ess-tee" for the voice. Four characters or three
 *     quarters of a word a token, and 1,000 tokens as 750 words, are the
 *     lesson's rule of thumb. The lesson's own first paragraph (190
 *     characters, 31 words) is 36 o200k tokens: 5.3 characters a token,
 *     which is why the narration says newer tokenizers "often pack more text
 *     into each token". Fig. 4's six vocabulary rows are ids the video
 *     measures elsewhere: Fig. 1's four candidates with their leading
 *     spaces, and " Token" (17951) and "ization" (2860), the two pieces of
 *     "Tokenization" in that opening paragraph.
 *   - building-a-tokenizer: the training text ("low" five times, "lower"
 *     twice, "newest" three times, "widest" twice), the end-of-word marker
 *     </w>, the first count (l o and o w both 7), and all ten merges in the
 *     lesson's order (lo, low, low</w>, es, est, est</w>, ne, new,
 *     newest</w>, lowe), every one named as it happens (the last four in
 *     "rest"; l o and o w tie at 7 and Python's Counter keeps the first
 *     counted, as the figure notes; the first count finds 14 distinct pairs), ending low -> low</w>, newest -> newest</w>, widest
 *     -> w i d est</w> ("still four pieces"; "wid was not frequent enough to
 *     earn a merge"). measure.py re-runs the lesson's pair_counts and
 *     merge_pair a step at a time and checks each merge and the final splits
 *     against what the page prints.
 *   - token-counts-in-practice and tokens: one byte for an English letter and
 *     three for a Japanese or Hindi character are UTF-8's rule (tokens.mdx's
 *     chart utf8-bytes-per-script). The four greetings are the video's own,
 *     measured: hello 5 bytes, 1 token; konnichiwa 15 bytes, 1 token; namaste
 *     18 bytes, 4 tokens; azul, the Tamazight greeting, in Tifinagh 12 bytes,
 *     12 tokens, one per byte. Their scripts are never drawn: the video's
 *     fonts have no Japanese, Devanagari or Tifinagh, and a system fallback
 *     would render differently on every machine, so each row shows its bytes
 *     and its romanization. The prose and code samples are
 *     tokens.mdx's estimate block, counted: 900 characters in 201 tokens
 *     (4.48, "four and a half"), 1,240 in 520 (2.38, "under two and a
 *     half"); the page's block only estimates them at 4 and 3. The three
 *     records are token-counts-in-practice's JSON-against-CSV block, counted:
 *     89 tokens as JSON, 33 as CSV (the page estimates 93 and 22), both drawn
 *     token by token with the 12 key-name tokens (customer, _id, region,
 *     amount on each of 3 records) lit against the CSV header's 4. The
 *     lesson's prose says JSON "costs several times" as much (it once said
 *     "roughly doubles"), which its block's 4.3 and the measured 2.7 bear
 *     out; the video states no ratio. The same
 *     JSON on cl100k_base (gpt-4), p50k_base (text-davinci-003) and r50k_base
 *     (davinci, "GPT-3's tokenizer"): 89, 102 and 120, from tiktoken's own
 *     model table. "About thirty percent more tokens" is Anthropic's, as the
 *     lesson cites it (footnote anthropic-tokenizer). The price check is the
 *     lesson's concept check: 1.3 times 0.8 is 1.04, "about four percent
 *     more". The conversation is the lesson's block (a 2,000-token system
 *     prompt, 100 a message, 400 a reply): ten turns leave it 7,000 tokens
 *     long and bill 43,500 input tokens, 6.2 times its length ("over six
 *     times"; the lesson's prose now says "more than six times"). Each bar
 *     is drawn in its three parts: the system prompt, the earlier turns sent
 *     again, the new message.
 *   - The bridge: berry's id is 19772; " cherry" is one id, 60225.
 *
 * Written for Drew's voice, casual and curious: short spoken sentences, no
 * symbols or parentheses, numbers as words, contractions, questions the next
 * sentence answers, an ellipsis where a speaker would hold, one audio tag.
 */
export const script: NarrationScript = {
  id: "llm-tokens",
  voice: "drew",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Part 1. A next-token machine ──────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Here's the whole job of a language model. It takes a sequence of tokens, chunks of text, often whole words, and gives back a probability for every token that could come next.",
      pauseAfter: 0.7,
    },
    {
      id: "vocab",
      text: "Not one word. A score for every token in its vocabulary, and this one has two hundred thousand.",
      pauseAfter: 0.8,
    },
    { id: "pick", text: "Picking one is a separate step... and how it picks is a knob you control.", pauseAfter: 0.6 },
    {
      id: "loop",
      scene: true,
      text: "To write, it picks a token, adds it to the end, and runs again on the longer input.",
      pauseAfter: 0.8,
    },
    { id: "again", text: "The, cat, sat, on, the, mat, and then a token that means done.", pauseAfter: 0.8 },
    {
      id: "plan",
      text: "Notice what's missing from that loop: a plan. The sentence shows up because each step was reasonable, not because anything decided it in advance.",
      pauseAfter: 0.8,
    },
    {
      id: "weights",
      text: "There's no database, either. What it knows lives in its weights, numbers tuned in training until its guesses matched real text.",
      pauseAfter: 0.6,
    },
    {
      id: "same",
      text: "That's why a well known fact and an invented citation come out of the same machinery, and sound just as sure.",
      pauseAfter: 0.9,
    },
    { id: "token-in", text: "So what is a token, exactly?" },

    // ── Part 2. Tokens ────────────────────────────────────────────────────
    {
      id: "token",
      scene: true,
      text: "It's a chunk of text that the vocabulary gives a single number, called its id. Sometimes a whole word, often just a piece.",
      pauseAfter: 0.8,
    },
    { id: "straw", text: "Take strawberry. On its own, GPT-4o's tokenizer cuts it in three: ess-tee, raw, berry.", pauseAfter: 0.6 },
    {
      id: "ids",
      text: "And the model gets three ids: three oh two, sixteen eighteen, nineteen seven seven two.",
      pauseAfter: 0.8,
    },
    // Split at its comma (cut from the take, nothing re-voiced), so the
    // leading space gets a breath before its payoff.
    { id: "space", text: "Put a space in front, the way it sits inside a sentence,", pauseAfter: 0.6 },
    { id: "space-id", text: "and the whole word is one id.", pauseAfter: 0.8 },
    {
      id: "letters",
      text: "[curious] So how many R's are in strawberry? The model never saw the letters. It has to recall facts about the spelling, instead of looking.",
      pauseAfter: 1.0,
    },
    {
      id: "rate",
      scene: true,
      text: "For English, the rule of thumb is about four characters a token, or three quarters of a word. So a thousand tokens is roughly seven hundred and fifty words.",
      pauseAfter: 0.7,
    },
    { id: "newer", text: "Newer tokenizers often pack more text into each token.", pauseAfter: 0.6 },
    {
      id: "opening",
      text: "This one turns the lesson's opening, a hundred and ninety characters, into thirty-six tokens.",
      pauseAfter: 0.8,
    },
    { id: "bpe-in", text: "But who decided where strawberry gets cut? Nobody did. The vocabulary was learned." },

    // ── Part 3. Byte-pair encoding, by hand ───────────────────────────────
    {
      id: "bpe",
      scene: true,
      text: "The usual way is called byte pair encoding, or BPE, and you can run it by hand.",
      pauseAfter: 0.6,
    },
    {
      id: "corpus",
      text: "Here's a tiny training text. Low, five times. Lower, twice. Newest, three times. And widest, twice.",
      pauseAfter: 0.5,
    },
    { id: "split", text: "Split every word into characters, with a marker for where the word ends.", pauseAfter: 0.6 },
    {
      id: "count",
      text: "Now count every pair of neighbours. L and O sit side by side seven times, and so do O and W.",
      pauseAfter: 0.6,
    },
    {
      id: "merge",
      text: "Merge the most frequent pair into one new symbol, write the merge down, and count again.",
      pauseAfter: 0.9,
    },
    { id: "order", text: "L and O first. Then that with W, making low. Then low at the end of a word.", pauseAfter: 0.5 },
    {
      id: "suffix",
      text: "Then E and S, then T, then the word end. Nobody told it about suffixes. Est ends both newest and widest, so it earned its merges early.",
      pauseAfter: 0.9,
    },
    // The last four merges, one word each, so none lands unspoken.
    {
      id: "rest",
      text: "Next come N and E, then W, then newest as one piece, and last, low picks up an E.",
      pauseAfter: 0.9,
    },
    {
      id: "after",
      text: "After ten merges, low and newest are single tokens. Widest is still four pieces, because wid never came up often enough.",
      pauseAfter: 0.9,
    },
    {
      id: "list",
      text: "And that list of merges is the tokenizer. New text gets split into characters, and the merges are replayed in order.",
      pauseAfter: 0.8,
    },
    { id: "rule", text: "Frequent text ends up as cheap, whole tokens. Rare text stays in pieces.", pauseAfter: 0.9 },
    { id: "counts-in", text: "And the pieces are what you pay for." },

    // ── Part 4. Counts in practice ────────────────────────────────────────
    {
      id: "bytes",
      scene: true,
      text: "Underneath every token there are bytes. An English letter is one byte. A Japanese or Hindi character is three.",
      pauseAfter: 0.6,
    },
    {
      id: "hello",
      text: "This tokenizer starts from bytes, and merges what it saw often. Hello in Japanese is fifteen bytes, and just one token. In Hindi, eighteen bytes make four.",
      pauseAfter: 0.6,
    },
    {
      id: "azul",
      text: "But in Tifinagh, a Berber script it rarely saw, hello is twelve bytes... and twelve tokens.",
      pauseAfter: 1.0,
    },
    {
      id: "formats",
      scene: true,
      text: "What the text is matters too. The lesson's prose sample runs four and a half characters a token. Its Python, under two and a half.",
      pauseAfter: 0.7,
    },
    {
      id: "json",
      text: "Three records cost eighty-nine tokens as JSON, but thirty-three as CSV, because JSON repeats every key on every record.",
      pauseAfter: 0.8,
    },
    {
      id: "models",
      text: "And every model family has its own tokenizer. GPT-3's counts that same JSON as a hundred and twenty. Anthropic says its newest one makes about thirty percent more tokens of the same text than the last.",
      pauseAfter: 0.7,
    },
    {
      id: "price",
      text: "So a model that's twenty percent cheaper per token, but counts thirty percent more tokens, costs you about four percent more.",
      pauseAfter: 0.9,
    },
    { id: "chat", scene: true, text: "One more trap. A chat resends its whole history on every turn.", pauseAfter: 0.6 },
    {
      id: "turns",
      text: "In the lesson's example, ten turns build a conversation seven thousand tokens long. But you're billed for forty-three thousand five hundred input tokens... over six times its length.",
      pauseAfter: 1.0,
    },
    {
      id: "number",
      text: "And each of those tokens reaches the model as an id, which is just a number.",
      pauseAfter: 0.7,
    },
    { id: "next", text: "Nothing in nineteen seven seven two says berry is anything like cherry." },
  ],
};
