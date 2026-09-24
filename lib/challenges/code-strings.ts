/**
 * Single-step code challenges: strings and text.
 *
 * Every problem here takes a string that came from somewhere real (a config
 * file, a receipt, an article title, an identifier in someone's codebase) and
 * either reshapes it or decides whether it is well formed. What ties them
 * together is that the easy reading of each prompt is almost right: splitting
 * on one space instead of runs of them, trusting a language's number parser to
 * say what a digit is, counting characters where the rule is about letters or
 * digits, checking a mapping in one direction only. The cases are chosen to
 * land exactly on those gaps, and the last few carry inputs large enough that
 * the brute-force version does not finish.
 *
 * All fifteen are `dualChallenge`s, so Python and JavaScript are graded on the
 * same cases, and `__tests__/challengeSolutions` runs both reference solutions
 * for real.
 */

import { dualChallenge } from "./authoring";
import type { Challenge } from "./types";

// ─── Caesar Cipher ───────────────────────────────────────────────────

const CAESAR_CIPHER = dualChallenge({
  slug: "caesar-cipher",
  title: "Caesar Cipher",
  difficulty: "Beginner",
  topic: "Character codes",
  description:
    "Shift every letter a fixed number of places along the alphabet, wrapping around at the ends.",
  prompt: [
    "Shift each letter of `text` by `k` places along the alphabet, wrapping from `z` back round to `a`. With `k = 3`, `a` becomes `d`, `x` becomes `a`, and `Z` becomes `C`.",
    "A negative `k` shifts backwards, and `k` can be larger than 26: a shift of 29 is the same as a shift of 3. Letters keep their case. Only the 26 ASCII letters move; digits, spaces, punctuation and accented letters such as `é` are copied through unchanged.",
  ],
  params: ["text", "k"],
  constraints: [
    "`0 ≤ len(text) ≤ 10⁴`",
    "`-10⁶ ≤ k ≤ 10⁶`",
    "Only `A` to `Z` and `a` to `z` are shifted",
  ],
  solutionNote:
    "Reduce `k` to a shift from 0 to 25 once, and the cipher is a rotation of the alphabet: the Python solution bakes that rotation into a translation table, and the JavaScript one computes `(offset + shift) % 26` per letter. The trap is JavaScript's `%`, which keeps the sign of the left operand (`-3 % 26` is `-3`), so a negative `k` needs `((k % 26) + 26) % 26`; in Python the trap is `isalpha()`, which is true for `é` as well.",
  python: {
    fn: "caesar",
    signature: "def caesar(text: str, k: int) -> str",
    starter: `def caesar(text: str, k: int) -> str:
    # Move each letter k places, wrapping around within its own case.
    return text
`,
    solution: `import string


def caesar(text: str, k: int) -> str:
    k %= 26
    lower, upper = string.ascii_lowercase, string.ascii_uppercase
    table = str.maketrans(
        lower + upper,
        lower[k:] + lower[:k] + upper[k:] + upper[:k],
    )
    return text.translate(table)
`,
  },
  javascript: {
    fn: "caesar",
    signature: "function caesar(text: string, k: number): string",
    starter: `function caesar(text, k) {
  // Move each letter k places, wrapping around within its own case.
  return text;
}
`,
    solution: `function caesar(text, k) {
  const shift = ((k % 26) + 26) % 26;
  return text.replace(/[a-z]/gi, (ch) => {
    const base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + shift) % 26) + base);
  });
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Shift by three",
      args: ["Hello, World!", 3],
      expected: "Khoor, Zruog!",
      example: "The comma, the space and the ! are copied through.",
    },
    {
      id: "example2",
      name: "Wrapping past z",
      args: ["xyz XYZ", 4],
      expected: "bcd BCD",
      example: "Shifting past z wraps round to a, in both cases.",
    },
    {
      id: "negative",
      name: "A negative shift wraps backwards",
      description: "A and a move back past the start of the alphabet to X and x.",
      args: ["Attack at dawn", -3],
      expected: "Xqqxzh xq axtk",
    },
    {
      id: "large-shift",
      name: "A shift larger than the alphabet",
      description: "55 places is two full laps plus 3.",
      args: ["Hello", 55],
      expected: "Khoor",
    },
    {
      id: "large-negative",
      name: "A large negative shift",
      description: "Back 53 places lands in the same spot as forward 25.",
      args: ["abc", -53],
      expected: "zab",
    },
    {
      id: "non-ascii",
      name: "Only ASCII letters move",
      description: "Digits, punctuation and accented letters stay as they are.",
      args: ["Room 101: café, naïve!", 1],
      expected: "Sppn 101: dbgé, obïwf!",
    },
    {
      id: "full-lap",
      name: "A shift of 26 changes nothing",
      args: ["Same", 26],
      expected: "Same",
    },
    { id: "empty", name: "An empty string", args: ["", 5], expected: "" },
  ],
});

// ─── Ransom Note ─────────────────────────────────────────────────────

const RANSOM_NOTE = dualChallenge({
  slug: "ransom-note",
  title: "Ransom Note",
  difficulty: "Beginner",
  topic: "Counting letters",
  description:
    "Decide whether a note can be cut out of a magazine's letters, using each letter once.",
  prompt: [
    "A note is being assembled from letters cut out of a magazine. Return whether every letter of `note` can be found in `magazine`, where each letter cut from the magazine can be used only once: a note with three `e`s needs a magazine with at least three `e`s.",
    "Spaces in the note are the gaps between cut-out letters, not letters, so they cost nothing. Order does not matter, only how many of each letter the magazine holds.",
  ],
  params: ["note", "magazine"],
  constraints: [
    "Both strings hold lowercase letters and spaces only",
    "`0 ≤ len(note), len(magazine) ≤ 3 × 10⁵`",
    "An empty note can always be made",
  ],
  solutionNote:
    "Count the magazine's letters once, then check that the note never needs more of a letter than the magazine holds: two linear passes. Searching the magazine for each letter and deleting it once used gives the right answer too, but every search and every delete walks the magazine again, which is quadratic on the large case.",
  python: {
    fn: "can_construct",
    signature: "def can_construct(note: str, magazine: str) -> bool",
    starter: `def can_construct(note: str, magazine: str) -> bool:
    # Count what the magazine offers, then spend it letter by letter.
    return False
`,
    solution: `from collections import Counter


def can_construct(note: str, magazine: str) -> bool:
    need = Counter(note.replace(" ", ""))
    return need <= Counter(magazine)
`,
  },
  javascript: {
    fn: "canConstruct",
    signature: "function canConstruct(note: string, magazine: string): boolean",
    starter: `function canConstruct(note, magazine) {
  // Count what the magazine offers, then spend it letter by letter.
  return false;
}
`,
    solution: `function canConstruct(note, magazine) {
  const have = new Map();
  for (const ch of magazine) have.set(ch, (have.get(ch) ?? 0) + 1);
  for (const ch of note) {
    if (ch === " ") continue;
    const left = have.get(ch) ?? 0;
    if (left === 0) return false;
    have.set(ch, left - 1);
  }
  return true;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Enough of every letter",
      args: ["meet at noon", "on time at the new moon"],
      expected: true,
      example: "Every letter is there, with some to spare, and the spaces cost nothing.",
    },
    {
      id: "example2",
      name: "One letter short",
      args: ["free coffee", "offer ends friday"],
      expected: false,
      example: "The note needs four e's; the magazine has two.",
    },
    {
      id: "reuse",
      name: "A letter cannot be used twice",
      args: ["aa", "a"],
      expected: false,
    },
    {
      id: "spaces",
      name: "Spaces in the note are free",
      description: "The magazine has no spaces, and the note does not need any.",
      args: ["a b c", "abc"],
      expected: true,
    },
    { id: "empty-note", name: "An empty note", args: ["", "abc"], expected: true },
    { id: "empty-magazine", name: "An empty magazine", args: ["a", ""], expected: false },
    {
      id: "large",
      name: "A long note and a longer magazine",
      description: "Searching the magazine for each letter of the note is quadratic here.",
      pyArgs: `"ab" * 50000, "z" * 200000 + "ba" * 50000`,
      jsArgs: `"ab".repeat(50000), "z".repeat(200000) + "ba".repeat(50000)`,
      expected: true,
    },
  ],
});

// ─── Reverse the Words ───────────────────────────────────────────────

const REVERSE_WORDS = dualChallenge({
  slug: "reverse-words",
  title: "Reverse the Words",
  difficulty: "Beginner",
  topic: "Splitting and joining",
  description: "Reverse the order of the words in a sentence, tidying the spacing as you go.",
  prompt: [
    "Return the words of `s` in reverse order, joined by single spaces. A word is any run of characters other than a space, so punctuation stays attached to the word it touches: `\"Wait, what?\"` becomes `\"what? Wait,\"`.",
    "The input may have spaces at either end and several spaces between words. The output has neither: no leading or trailing space, and exactly one space between words. A string with no words returns an empty string.",
  ],
  params: ["s"],
  constraints: [
    "`0 ≤ len(s) ≤ 10⁴`",
    "Words are separated by spaces only, never tabs or newlines",
    "The characters inside each word keep their order",
  ],
  solutionNote:
    "Splitting on a single space is the trap: `\"a  b\".split(\" \")` puts an empty string between the two spaces, and joining those back produces doubled spaces. Python's `split()` with no argument, or JavaScript's `split(\" \")` followed by `filter(Boolean)`, keeps only the real words, and reversing that list is the whole job.",
  python: {
    fn: "reverse_words",
    signature: "def reverse_words(s: str) -> str",
    starter: `def reverse_words(s: str) -> str:
    # Find the words, then put them back in the opposite order.
    return s
`,
    solution: `def reverse_words(s: str) -> str:
    return " ".join(reversed(s.split()))
`,
  },
  javascript: {
    fn: "reverseWords",
    signature: "function reverseWords(s: string): string",
    starter: `function reverseWords(s) {
  // Find the words, then put them back in the opposite order.
  return s;
}
`,
    solution: `function reverseWords(s) {
  return s.split(" ").filter(Boolean).reverse().join(" ");
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A plain sentence",
      args: ["the sky is blue"],
      expected: "blue is sky the",
      example: "Each word keeps its spelling; only the order changes.",
    },
    {
      id: "example2",
      name: "Extra spaces",
      args: ["  hello   world  "],
      expected: "world hello",
      example: "The extra spaces go, both between the words and at the ends.",
    },
    {
      id: "punctuation",
      name: "Punctuation travels with its word",
      args: ["Wait, what?"],
      expected: "what? Wait,",
    },
    { id: "single", name: "A single word", args: ["alone"], expected: "alone" },
    { id: "spaces-only", name: "Nothing but spaces", args: ["     "], expected: "" },
    { id: "empty", name: "An empty string", args: [""], expected: "" },
  ],
});

// ─── Camel Case to Snake Case ────────────────────────────────────────

const CAMEL_TO_SNAKE = dualChallenge({
  slug: "camel-to-snake",
  title: "Camel Case to Snake Case",
  difficulty: "Beginner",
  topic: "Case conversion",
  description:
    "Convert a camelCase identifier to snake_case, keeping acronyms and numbers in one piece.",
  prompt: [
    "Convert a camelCase or PascalCase identifier to snake_case: split it into words, lowercase them, and join them with underscores. `parseHTTPResponse` becomes `parse_http_response`.",
    "A new word starts at a capital letter that follows a lowercase letter or a digit (`userId`, `utf8String`), and at the last capital of a run of capitals when a lowercase letter comes next: in `HTTPResponse` the `R` starts `Response`, so the acronym stays whole. Digits never start a word; they belong to the word before them, so `base64Encode` becomes `base64_encode`.",
    "A name that is already all lowercase comes back unchanged.",
  ],
  params: ["name"],
  constraints: [
    "`1 ≤ len(name) ≤ 100`",
    "ASCII letters and digits only, starting with a letter",
    "No underscores in the input",
  ],
  solutionNote:
    "Putting an underscore before every capital turns `HTTP` into `h_t_t_p`, so the rule has to look at both neighbours. Two boundaries cover it: a lowercase letter or digit followed by a capital, and a capital followed by a capital that is itself followed by a lowercase letter, which is where an acronym hands over to the next word.",
  python: {
    fn: "camel_to_snake",
    signature: "def camel_to_snake(name: str) -> str",
    starter: `def camel_to_snake(name: str) -> str:
    # Find where each new word starts, then join the lowercased words with "_".
    return name.lower()
`,
    solution: `import re

# Zero-width boundaries: lowercase or digit then a capital, or a capital then
# a capital-and-lowercase pair (the last letter of an acronym).
BOUNDARY = re.compile(r"(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])")


def camel_to_snake(name: str) -> str:
    return BOUNDARY.sub("_", name).lower()
`,
  },
  javascript: {
    fn: "camelToSnake",
    signature: "function camelToSnake(name: string): string",
    starter: `function camelToSnake(name) {
  // Find where each new word starts, then join the lowercased words with "_".
  return name.toLowerCase();
}
`,
    solution: `function camelToSnake(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "An acronym in the middle",
      args: ["parseHTTPResponse"],
      expected: "parse_http_response",
      example: "HTTP stays together, and its last capital hands over to Response.",
    },
    {
      id: "example2",
      name: "A digit after an acronym",
      args: ["HTML5Parser"],
      expected: "html5_parser",
      example: "The 5 stays with HTML, and the capital after it starts a new word.",
    },
    {
      id: "pascal",
      name: "PascalCase gets no leading underscore",
      args: ["UserAccount"],
      expected: "user_account",
    },
    { id: "trailing-acronym", name: "An acronym at the end", args: ["userID"], expected: "user_id" },
    {
      id: "digits",
      name: "Digits stay with the word before them",
      args: ["base64Encode"],
      expected: "base64_encode",
    },
    {
      id: "one-letter",
      name: "A one-letter word",
      description: "X is a word of its own between get and Coordinate.",
      args: ["getXCoordinate"],
      expected: "get_x_coordinate",
    },
    { id: "lowercase", name: "Already lowercase", args: ["timeout"], expected: "timeout" },
  ],
});

// ─── Run-Length Decoding ─────────────────────────────────────────────

const RUN_LENGTH_DECODE = dualChallenge({
  slug: "run-length-decode",
  title: "Run-Length Decoding",
  difficulty: "Beginner",
  topic: "Parsing numbers in text",
  description: "Expand a run-length code such as 12a3b back into the text it stands for.",
  prompt: [
    "A run-length code writes each run of a repeated letter as a count followed by the letter: `12a3b` stands for twelve `a`s followed by three `b`s. Return the decoded text.",
    "A count can be several digits long, so every digit before a letter belongs to its count. A letter with no count in front of it stands for a single letter, which is how most encoders write a run of one: `a3bc` decodes to `abbbc`. Letters are case-sensitive.",
  ],
  params: ["code"],
  constraints: [
    "`0 ≤ len(code) ≤ 10⁴`",
    "ASCII letters and digits only, and the code never ends with a count",
    "Every count is at least 1 and has no leading zeros",
    "The decoded text is at most 10⁵ characters",
  ],
  solutionNote:
    "Collect digits until a letter arrives, then emit that letter as many times as the digits say and start a fresh count. The usual bug is treating each digit as a complete count, which reads `12a` as a count of 1 followed by a count of 2; the count is every digit since the last letter, and no digits at all means 1.",
  python: {
    fn: "run_length_decode",
    signature: "def run_length_decode(code: str) -> str",
    starter: `def run_length_decode(code: str) -> str:
    # Collect the digits before each letter; no digits means a count of 1.
    return code
`,
    solution: `import re


def run_length_decode(code: str) -> str:
    return "".join(
        letter * int(count or 1)
        for count, letter in re.findall(r"([0-9]*)([A-Za-z])", code)
    )
`,
  },
  javascript: {
    fn: "runLengthDecode",
    signature: "function runLengthDecode(code: string): string",
    starter: `function runLengthDecode(code) {
  // Collect the digits before each letter; no digits means a count of 1.
  return code;
}
`,
    solution: `function runLengthDecode(code) {
  let out = "";
  let count = "";
  for (const ch of code) {
    if (ch >= "0" && ch <= "9") {
      count += ch;
    } else {
      out += ch.repeat(count === "" ? 1 : Number(count));
      count = "";
    }
  }
  return out;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A two-digit count",
      args: ["12a3b"],
      expected: "aaaaaaaaaaaabbb",
      example: "Twelve a's, then three b's.",
    },
    {
      id: "example2",
      name: "Letters without a count",
      args: ["a3bc"],
      expected: "abbbc",
      example: "A letter with no count stands for one.",
    },
    {
      id: "one-and-ten",
      name: "Counts of 1 and of 10",
      args: ["1a10b2c"],
      expected: "abbbbbbbbbbcc",
    },
    { id: "no-counts", name: "No counts at all", args: ["abc"], expected: "abc" },
    {
      id: "case",
      name: "Upper and lower case are different letters",
      args: ["2A3a"],
      expected: "AAaaa",
    },
    {
      id: "three-digits",
      name: "A three-digit count",
      args: ["100x"],
      pyExpected: `"x" * 100`,
      jsExpected: `"x".repeat(100)`,
    },
    { id: "empty", name: "An empty code", args: [""], expected: "" },
  ],
});

// ─── Slugify a Title ─────────────────────────────────────────────────

const SLUGIFY = dualChallenge({
  slug: "slugify",
  title: "Slugify a Title",
  difficulty: "Beginner",
  topic: "Normalizing text",
  description: "Turn an article title into a lowercase, hyphen-separated URL slug.",
  prompt: [
    "Turn a title into the slug used in its URL, so that `\"10 Tips & Tricks\"` becomes `\"10-tips-tricks\"`.",
    "Keep only ASCII letters and digits, lowercased. Every run of anything else (spaces, punctuation, underscores) becomes a single hyphen, and the slug never starts or ends with a hyphen. A title with no letters or digits at all gives an empty slug.",
  ],
  params: ["title"],
  constraints: [
    "`0 ≤ len(title) ≤ 200`",
    "The title holds printable ASCII characters only",
    "The slug holds only `a` to `z`, `0` to `9` and single hyphens between them",
  ],
  solutionNote:
    "Replace each whole run of unwanted characters with one hyphen in a single pass, then strip hyphens from the ends; replacing character by character leaves `--` wherever two separators sat together. Spell the class out as `[^A-Za-z0-9]` rather than `\\W`, because `\\W` counts the underscore as a word character and would leave `snake_case` alone.",
  python: {
    fn: "slugify",
    signature: "def slugify(title: str) -> str",
    starter: `def slugify(title: str) -> str:
    # Collapse each run of other characters into one hyphen.
    return title.lower()
`,
    solution: `import re


def slugify(title: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "-", title).strip("-").lower()
`,
  },
  javascript: {
    fn: "slugify",
    signature: "function slugify(title: string): string",
    starter: `function slugify(title) {
  // Collapse each run of other characters into one hyphen.
  return title.toLowerCase();
}
`,
    solution: `function slugify(title) {
  return title
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A greeting",
      args: ["Hello, World!"],
      expected: "hello-world",
      example: "The comma and space become one hyphen, and the trailing ! is dropped.",
    },
    {
      id: "example2",
      name: "Runs of separators",
      args: ["  10 Tips & Tricks: Python 3.12  "],
      expected: "10-tips-tricks-python-3-12",
      example: "Each run of spaces and punctuation becomes one hyphen, and nothing is left at the ends.",
    },
    {
      id: "underscores",
      name: "Underscores are separators too",
      description: "An underscore is neither a letter nor a digit.",
      args: ["snake_case_is_fine"],
      expected: "snake-case-is-fine",
    },
    { id: "symbols", name: "Symbols vanish", args: ["C++ vs. C#"], expected: "c-vs-c" },
    { id: "mixed-case", name: "Mixed case", args: ["iPhone 15 Pro MAX"], expected: "iphone-15-pro-max" },
    { id: "already", name: "Already a slug", args: ["already-a-slug"], expected: "already-a-slug" },
    { id: "nothing", name: "No letters or digits", args: ["!!! ???"], expected: "" },
  ],
});

// ─── Mask a Card Number ──────────────────────────────────────────────

const MASK_CARD_NUMBER = dualChallenge({
  slug: "mask-card-number",
  title: "Mask a Card Number",
  difficulty: "Beginner",
  topic: "Counting from the end",
  description: "Hide every digit of a card number except the last four, keeping its spacing.",
  prompt: [
    "A receipt shows a card number with every digit replaced by `*` except the last four. Return `number` masked that way.",
    "Spaces and hyphens stay exactly where they are, and so do the last four digits, wherever they fall: a 19-digit number grouped 4, 4, 4, 4, 3 has one of its last four digits before the final space. A number with four digits or fewer has nothing to hide and comes back unchanged.",
  ],
  params: ["number"],
  constraints: [
    "`0 ≤ len(number) ≤ 40`",
    "Only digits, spaces and hyphens",
    "Separators are never masked and never counted as digits",
  ],
  solutionNote:
    "Count digits, not characters: keeping the last four characters breaks as soon as a separator falls among them. Once you know how many digits there are, mask the first `count - 4` as you pass them and copy everything else; that needs no special case for short numbers, whereas building a mask with `\"*\".repeat(count - 4)` throws a `RangeError` in JavaScript when the count is under four.",
  python: {
    fn: "mask_card",
    signature: "def mask_card(number: str) -> str",
    starter: `def mask_card(number: str) -> str:
    # Replace every digit except the last four; leave separators alone.
    return number
`,
    solution: `def mask_card(number: str) -> str:
    to_mask = sum(ch.isdigit() for ch in number) - 4
    out = []
    for ch in number:
        if ch.isdigit() and to_mask > 0:
            ch = "*"
            to_mask -= 1
        out.append(ch)
    return "".join(out)
`,
  },
  javascript: {
    fn: "maskCard",
    signature: "function maskCard(number: string): string",
    starter: `function maskCard(number) {
  // Replace every digit except the last four; leave separators alone.
  return number;
}
`,
    solution: `function maskCard(number) {
  // Walk from the right: the first four digits met are the ones to keep.
  const chars = [...number];
  let kept = 0;
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i] < "0" || chars[i] > "9") continue;
    if (kept < 4) kept++;
    else chars[i] = "*";
  }
  return chars.join("");
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Four groups of four",
      args: ["4111 1111 1111 1234"],
      expected: "**** **** **** 1234",
      example: "Twelve digits are hidden and the spaces stay put.",
    },
    {
      id: "example2",
      name: "The last four digits straddle a space",
      args: ["6304 0000 0000 0000 018"],
      expected: "**** **** **** ***0 018",
      example: "The last four digits are 0, 0, 1 and 8, and the final space falls among them.",
    },
    {
      id: "hyphens",
      name: "Hyphens stay in place",
      args: ["5500-0000-0000-0004"],
      expected: "****-****-****-0004",
    },
    {
      id: "no-separators",
      name: "No separators",
      args: ["4111111111111111"],
      expected: "************1111",
    },
    { id: "five", name: "Five digits", args: ["12345"], expected: "*2345" },
    {
      id: "four-digits",
      name: "Four digits or fewer",
      description: "Four digits leave nothing to hide, even though the string is five characters long.",
      args: ["12-34"],
      expected: "12-34",
    },
    { id: "empty", name: "An empty string", args: [""], expected: "" },
  ],
});

// ─── Isomorphic Strings ──────────────────────────────────────────────

const ISOMORPHIC_STRINGS = dualChallenge({
  slug: "isomorphic-strings",
  title: "Isomorphic Strings",
  difficulty: "Intermediate",
  topic: "Bijections",
  description:
    "Decide whether one string can be turned into another by consistently renaming its characters.",
  prompt: [
    "Two strings are isomorphic when the characters of `s` can be renamed to produce `t`: every occurrence of a character is renamed the same way, and no two different characters are renamed to the same one. `\"egg\"` and `\"add\"` are isomorphic (`e` to `a`, `g` to `d`); `\"foo\"` and `\"bar\"` are not, because `o` would have to become both `a` and `r`.",
    "A character may be renamed to itself. Return whether `s` and `t` are isomorphic; strings of different lengths never are.",
  ],
  params: ["s", "t"],
  constraints: [
    "`0 ≤ len(s), len(t) ≤ 10⁵`",
    "Any characters, including digits, spaces and punctuation",
    "Case matters: `a` and `A` are different characters",
  ],
  solutionNote:
    "Checking only that each character of `s` always maps to the same character of `t` is half the rule, and `\"badc\"` against `\"baba\"` passes it while sending both `b` and `d` to `b`. The mapping has to hold in both directions: keep two dictionaries, or note that `s`, `t` and the pairs `zip(s, t)` must all have the same number of distinct elements.",
  python: {
    fn: "is_isomorphic",
    signature: "def is_isomorphic(s: str, t: str) -> bool",
    starter: `def is_isomorphic(s: str, t: str) -> bool:
    # A renaming has to be consistent in both directions.
    return len(s) == len(t)
`,
    solution: `def is_isomorphic(s: str, t: str) -> bool:
    return len(s) == len(t) and len(set(s)) == len(set(zip(s, t))) == len(set(t))
`,
  },
  javascript: {
    fn: "isIsomorphic",
    signature: "function isIsomorphic(s: string, t: string): boolean",
    starter: `function isIsomorphic(s, t) {
  // A renaming has to be consistent in both directions.
  return s.length === t.length;
}
`,
    solution: `function isIsomorphic(s, t) {
  if (s.length !== t.length) return false;
  const forward = new Map();
  const backward = new Map();
  for (let i = 0; i < s.length; i++) {
    const a = s[i];
    const b = t[i];
    if ((forward.get(a) ?? b) !== b || (backward.get(b) ?? a) !== a) return false;
    forward.set(a, b);
    backward.set(b, a);
  }
  return true;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A consistent renaming",
      args: ["egg", "add"],
      expected: true,
      example: "e becomes a and g becomes d, every time.",
    },
    {
      id: "example2",
      name: "Two characters with one name",
      args: ["badc", "baba"],
      expected: false,
      example: "b and d would both have to become b.",
    },
    { id: "one-to-two", name: "One character, two names", args: ["foo", "bar"], expected: false },
    { id: "longer", name: "A longer match", args: ["paper", "title"], expected: true },
    { id: "swap", name: "Characters can swap names", args: ["ab", "ba"], expected: true },
    { id: "lengths", name: "Different lengths", args: ["ab", "abc"], expected: false },
    { id: "empty", name: "Two empty strings", args: ["", ""], expected: true },
  ],
});

// ─── Wrap Text to a Width ────────────────────────────────────────────

const WRAP_TEXT = dualChallenge({
  slug: "wrap-text",
  title: "Wrap Text to a Width",
  difficulty: "Intermediate",
  topic: "Greedy line breaking",
  description:
    "Break a paragraph into lines no wider than a given width, filling each line as far as it goes.",
  prompt: [
    "Break `text` into lines of at most `width` characters and return them as a list. Fill greedily: put as many words on the current line as fit, with one space between them, and start a new line only when the next word would push it past `width`. A line of exactly `width` characters fits.",
    "Words are separated by one or more spaces, and the extra spaces disappear: no line starts or ends with a space. Only spaces are break points, so a hyphenated word such as `well-known` is one word. A word longer than `width` is never broken; it goes on a line of its own, even though that line is too wide. Text with no words gives an empty list.",
  ],
  params: ["text", "width"],
  constraints: [
    "`0 ≤ len(text) ≤ 10⁴`",
    "`1 ≤ width ≤ 200`",
    "Words are separated by spaces only",
  ],
  solutionNote:
    "Keep the current line and ask of each word whether `len(line) + 1 + len(word)` still fits; if not, close the line and start the next with that word, which is also what puts an overlong word on a line of its own. The traps are at the ends: emitting an empty first line when the first word is already too long, and forgetting the last line after the loop. Python's `textwrap.wrap` splits long words and breaks at hyphens by default, so it only matches with `break_long_words=False` and `break_on_hyphens=False`.",
  python: {
    fn: "wrap_text",
    signature: "def wrap_text(text: str, width: int) -> list[str]",
    starter: `def wrap_text(text: str, width: int) -> list[str]:
    # Add words to the current line until the next one would not fit.
    return [text]
`,
    solution: `def wrap_text(text: str, width: int) -> list[str]:
    lines = []
    line = ""
    for word in text.split():
        if line and len(line) + 1 + len(word) <= width:
            line += " " + word
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines
`,
  },
  javascript: {
    fn: "wrapText",
    signature: "function wrapText(text: string, width: number): string[]",
    starter: `function wrapText(text, width) {
  // Add words to the current line until the next one would not fit.
  return [text];
}
`,
    solution: `function wrapText(text, width) {
  const lines = [];
  for (const word of text.split(" ").filter(Boolean)) {
    const last = lines.length - 1;
    if (last >= 0 && lines[last].length + 1 + word.length <= width) {
      lines[last] += " " + word;
    } else {
      lines.push(word);
    }
  }
  return lines;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A sentence at width 10",
      args: ["the quick brown fox jumps over the lazy dog", 10],
      expected: ["the quick", "brown fox", "jumps over", "the lazy", "dog"],
      example: "jumps over is exactly 10 characters, so it fits on one line.",
    },
    {
      id: "example2",
      name: "A word longer than the width",
      args: ["see supercalifragilistic here", 8],
      expected: ["see", "supercalifragilistic", "here"],
      example: "The long word is not broken; it gets a line to itself.",
    },
    {
      id: "long-first",
      name: "A long first word",
      description: "No empty line comes before it.",
      args: ["encyclopedia is long", 5],
      expected: ["encyclopedia", "is", "long"],
    },
    {
      id: "hyphen",
      name: "A hyphen does not break a word",
      args: ["a well-known fact", 8],
      expected: ["a", "well-known", "fact"],
    },
    {
      id: "spaces",
      name: "Runs of spaces",
      args: ["  spaced   out   words  ", 12],
      expected: ["spaced out", "words"],
    },
    { id: "width-one", name: "Width one", args: ["a b c", 1], expected: ["a", "b", "c"] },
    { id: "no-words", name: "Nothing but spaces", args: ["   ", 5], expected: [] },
  ],
});

// ─── Almost a Palindrome ─────────────────────────────────────────────

const ALMOST_PALINDROME = dualChallenge({
  slug: "almost-palindrome",
  title: "Almost a Palindrome",
  difficulty: "Intermediate",
  topic: "Two pointers",
  description: "Decide whether a string becomes a palindrome after deleting at most one character.",
  prompt: [
    "Return whether `s` reads the same forwards and backwards after deleting at most one character. `\"abca\"` qualifies (delete the `b` or the `c`); `\"abc\"` does not, since no single deletion leaves a palindrome. A string that is already a palindrome qualifies without deleting anything.",
    "Every character counts: the input is lowercase letters only, and nothing is skipped or ignored.",
    "Strings run to a hundred thousand characters, so trying each deletion in turn and re-checking the whole string, which is O(n²), is too slow. Walk inwards from both ends instead.",
  ],
  params: ["s"],
  constraints: ["`0 ≤ len(s) ≤ 2 × 10⁵`", "Lowercase letters `a` to `z` only"],
  solutionNote:
    "Walk two pointers inwards while the ends match. At the first mismatch one of those two characters has to go, so the answer is whether what lies between them is a palindrome with the left one skipped or with the right one skipped; trying only one side fails on `cbbcc`. Nothing before the mismatch needs checking again, so the whole test is linear.",
  python: {
    fn: "is_almost_palindrome",
    signature: "def is_almost_palindrome(s: str) -> bool",
    starter: `def is_almost_palindrome(s: str) -> bool:
    # Walk inwards from both ends; at the first mismatch, try skipping either side.
    return s == s[::-1]
`,
    solution: `def is_almost_palindrome(s: str) -> bool:
    lo, hi = 0, len(s) - 1
    while lo < hi:
        if s[lo] != s[hi]:
            skip_left, skip_right = s[lo + 1:hi + 1], s[lo:hi]
            return skip_left == skip_left[::-1] or skip_right == skip_right[::-1]
        lo += 1
        hi -= 1
    return True
`,
  },
  javascript: {
    fn: "isAlmostPalindrome",
    signature: "function isAlmostPalindrome(s: string): boolean",
    starter: `function isAlmostPalindrome(s) {
  // Walk inwards from both ends; at the first mismatch, try skipping either side.
  return s === [...s].reverse().join("");
}
`,
    solution: `function isAlmostPalindrome(s) {
  const isPalindrome = (lo, hi) => {
    for (; lo < hi; lo++, hi--) if (s[lo] !== s[hi]) return false;
    return true;
  };
  for (let lo = 0, hi = s.length - 1; lo < hi; lo++, hi--) {
    if (s[lo] !== s[hi]) return isPalindrome(lo + 1, hi) || isPalindrome(lo, hi - 1);
  }
  return true;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "One deletion fixes it",
      args: ["abca"],
      expected: true,
      example: "Delete the b (or the c) to get aca.",
    },
    {
      id: "example2",
      name: "No single deletion is enough",
      args: ["abc"],
      expected: false,
      example: "Both ends differ, and removing any one letter leaves them different.",
    },
    { id: "already", name: "Already a palindrome", args: ["racecar"], expected: true },
    {
      id: "skip-right",
      name: "The deletion is on the right",
      description: "At the first mismatch, only skipping the right-hand letter works.",
      args: ["cbbcc"],
      expected: true,
    },
    {
      id: "skip-left",
      name: "The deletion is on the left",
      description: "At the first mismatch, only skipping the left-hand letter works.",
      args: ["ccbbc"],
      expected: true,
    },
    { id: "empty", name: "An empty string", args: [""], expected: true },
    {
      id: "large-true",
      name: "A hundred thousand letters, one out of place",
      description: "Trying every deletion in turn is quadratic here.",
      pyArgs: `"a" * 50000 + "bc" + "a" * 50000`,
      jsArgs: `"a".repeat(50000) + "bc" + "a".repeat(50000)`,
      expected: true,
    },
    {
      id: "large-false",
      name: "A hundred thousand letters that no deletion fixes",
      description: "Every one of the 100,003 possible deletions fails, so trying them all takes far too long.",
      pyArgs: `"a" * 50000 + "bcd" + "a" * 50000`,
      jsArgs: `"a".repeat(50000) + "bcd" + "a".repeat(50000)`,
      expected: false,
    },
  ],
});

// ─── Parse a Duration ────────────────────────────────────────────────

const PARSE_DURATION = dualChallenge({
  slug: "parse-duration",
  title: "Parse a Duration",
  difficulty: "Intermediate",
  topic: "Tokenizing",
  description: "Convert a compact duration such as 1h30m into seconds, rejecting anything malformed.",
  prompt: [
    "Configuration files often write durations compactly: `1h30m`, `90s`, `2d4h`. Return the number of seconds `text` stands for, where `d` is a day (86,400 seconds), `h` an hour, `m` a minute and `s` a second.",
    "A valid duration is one or more parts, each a whole number followed by a unit. The units appear in the order `d`, `h`, `m`, `s`, each at most once, and any of them may be left out. A number is not capped by the next unit up: `90m` is valid and means 5,400 seconds.",
    "Anything else is invalid: an empty string, units out of order or repeated, a number with no unit, a unit with no number, an unknown or uppercase unit, spaces, or signs. Raise `ValueError` in Python and throw an `Error` in JavaScript.",
  ],
  params: ["text"],
  constraints: [
    "`0 ≤ len(text) ≤ 50`",
    "Units are lowercase `d`, `h`, `m` and `s`",
    "Numbers are ASCII digits; leading zeros are allowed",
  ],
  solutionNote:
    "Read the string as a sequence of number-and-unit tokens and make each token prove itself: it must start exactly where the previous one ended, and its unit must come later in `dhms` than the previous unit, which rejects repeats and wrong order in one comparison. Searching for anything that looks like a token (`re.findall`, `matchAll`) skips the junk between matches, so `1h30` and `1h 30m` slip through; the Python solution avoids that with one `fullmatch` against four optional parts, plus a check for the empty string, which that pattern also matches.",
  python: {
    fn: "parse_duration",
    signature: "def parse_duration(text: str) -> int",
    starter: `def parse_duration(text: str) -> int:
    # Read number-and-unit pairs in order; reject anything that is not one.
    return 0
`,
    solution: `import re

DURATION = re.compile(r"(?:([0-9]+)d)?(?:([0-9]+)h)?(?:([0-9]+)m)?(?:([0-9]+)s)?")


def parse_duration(text: str) -> int:
    match = DURATION.fullmatch(text)
    if not text or match is None:
        raise ValueError(f"not a duration: {text!r}")
    days, hours, minutes, seconds = (int(part or 0) for part in match.groups())
    return ((days * 24 + hours) * 60 + minutes) * 60 + seconds
`,
  },
  javascript: {
    fn: "parseDuration",
    signature: "function parseDuration(text: string): number",
    starter: `function parseDuration(text) {
  // Read number-and-unit pairs in order; reject anything that is not one.
  return 0;
}
`,
    solution: `const UNITS = "dhms";
const SECONDS = [86400, 3600, 60, 1];

function parseDuration(text) {
  // Sticky: each token must start exactly where the last one ended.
  const token = /([0-9]+)([a-z])/y;
  let total = 0;
  let prev = -1;
  while (token.lastIndex < text.length) {
    const m = token.exec(text);
    // -1 for no token or an unknown unit; not above prev for a repeat or wrong order.
    const unit = m ? UNITS.indexOf(m[2]) : -1;
    if (unit <= prev) throw new Error("not a duration: " + JSON.stringify(text));
    total += Number(m[1]) * SECONDS[unit];
    prev = unit;
  }
  if (prev === -1) throw new Error("not a duration: an empty string");
  return total;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Hours and minutes",
      args: ["1h30m"],
      expected: 5400,
      example: "One hour and thirty minutes.",
    },
    {
      id: "example2",
      name: "Units out of order",
      args: ["30m1h"],
      throws: { py: "ValueError" },
      example: "Units must come in the order d, h, m, s.",
    },
    { id: "all-four", name: "All four units", args: ["1d2h3m4s"], expected: 93784 },
    {
      id: "uncapped",
      name: "A number larger than the next unit",
      args: ["90m"],
      expected: 5400,
    },
    { id: "repeated", name: "A repeated unit", args: ["2h2h"], throws: { py: "ValueError" } },
    {
      id: "dangling",
      name: "A number with no unit",
      description: "The trailing 30 has no unit, so the whole string is invalid.",
      args: ["1h30"],
      throws: { py: "ValueError" },
    },
    { id: "empty", name: "An empty string", args: [""], throws: { py: "ValueError" } },
    {
      id: "space",
      name: "A space between parts",
      args: ["1h 30m"],
      throws: { py: "ValueError" },
    },
  ],
});

// ─── Compare Version Numbers ─────────────────────────────────────────

const COMPARE_VERSIONS = dualChallenge({
  slug: "compare-versions",
  title: "Compare Version Numbers",
  difficulty: "Intermediate",
  topic: "Parsing",
  description: "Compare two dotted version numbers part by part, the way a package manager does.",
  prompt: [
    "Compare two version numbers such as `1.10` and `1.9`. Return `-1` if `a` is older than `b`, `1` if it is newer, and `0` if they are the same version.",
    "Split each version on dots and compare the parts as numbers, from left to right: the first pair that differs decides. Numeric comparison matters, so `1.10` is newer than `1.9` and `1.01` is the same as `1.1`. A version with fewer parts is padded with zeros: `1.0` and `1` are equal, while `1.0.1` is newer than `1`.",
  ],
  params: ["a", "b"],
  constraints: [
    "Each version is one or more non-negative integers separated by single dots",
    "Each part has at most 9 digits",
    "No letters, signs or pre-release tags such as `-beta`",
  ],
  solutionNote:
    "Comparing the strings directly gets `1.10` against `1.9` backwards, since the character `1` sorts before `9`; the parts have to become numbers first. Then pad the shorter list with zeros (`zip_longest(..., fillvalue=0)` in Python, `?? 0` in JavaScript) instead of stopping when it runs out, or `1` and `1.0.1` compare equal.",
  python: {
    fn: "compare_versions",
    signature: "def compare_versions(a: str, b: str) -> int",
    starter: `def compare_versions(a: str, b: str) -> int:
    # Compare the dot-separated parts as numbers, left to right.
    return 0
`,
    solution: `from itertools import zip_longest


def compare_versions(a: str, b: str) -> int:
    pairs = zip_longest(map(int, a.split(".")), map(int, b.split(".")), fillvalue=0)
    for x, y in pairs:
        if x != y:
            return -1 if x < y else 1
    return 0
`,
  },
  javascript: {
    fn: "compareVersions",
    signature: "function compareVersions(a: string, b: string): number",
    starter: `function compareVersions(a, b) {
  // Compare the dot-separated parts as numbers, left to right.
  return 0;
}
`,
    solution: `function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Ten is more than nine",
      args: ["1.10", "1.9"],
      expected: 1,
      example: "10 is more than 9, even though the text 1.10 sorts before 1.9.",
    },
    {
      id: "example2",
      name: "A missing part is zero",
      args: ["1.0", "1"],
      expected: 0,
      example: "1 is padded to 1.0, so the two are the same version.",
    },
    { id: "older", name: "An older version", args: ["2.3.1", "2.4"], expected: -1 },
    {
      id: "padding-decides",
      name: "Padding decides the answer",
      description: "1 is padded to 1.0.0, which is older than 1.0.1.",
      args: ["1", "1.0.1"],
      expected: -1,
    },
    { id: "leading-zeros", name: "Leading zeros do not matter", args: ["1.01", "1.001"], expected: 0 },
    { id: "major", name: "The first part decides first", args: ["10.0", "9.99"], expected: 1 },
    { id: "identical", name: "Identical versions", args: ["3.14.15", "3.14.15"], expected: 0 },
  ],
});

// ─── Validate an IPv4 Address ────────────────────────────────────────

const VALIDATE_IPV4 = dualChallenge({
  slug: "validate-ipv4",
  title: "Validate an IPv4 Address",
  difficulty: "Intermediate",
  topic: "Input validation",
  description: "Decide whether a string is a well-formed dotted-decimal IPv4 address.",
  prompt: [
    "Return whether `s` is an IPv4 address written in dotted-decimal form, such as `192.168.1.1`.",
    "It must be exactly four parts separated by single dots. Each part is one to three ASCII digits with a value from 0 to 255, and has no leading zero unless the part is `0` itself, so `01` is invalid. Nothing else is allowed anywhere: no spaces, no signs, no empty parts.",
    "Be careful with number parsing, because most languages accept far more than digits: Python's `int()` takes `\" 7\"` and `\"+7\"`, and JavaScript's `Number()` takes `\"\"`, `\"0x1f\"` and `\"1e2\"`.",
  ],
  params: ["s"],
  constraints: [
    "`0 ≤ len(s) ≤ 30`",
    "`s` may contain any printable ASCII characters",
  ],
  solutionNote:
    "Validate the text of each part before converting it: a part must be one to three digits with no leading zero, and only then is its value compared with 255. Converting first and checking the number afterwards lets the parser's leniency through, such as JavaScript's `Number` turning an empty part into `0` and `1e1` into `10`, or Python's `int` ignoring the space in `\"1 \"`.",
  python: {
    fn: "is_valid_ipv4",
    signature: "def is_valid_ipv4(s: str) -> bool",
    starter: `def is_valid_ipv4(s: str) -> bool:
    # Check the number of parts, then each part's characters, then its value.
    return len(s.split(".")) == 4
`,
    solution: `def is_valid_ipv4(s: str) -> bool:
    parts = s.split(".")
    return len(parts) == 4 and all(
        part.isascii()
        and part.isdigit()
        and len(part) <= 3
        and (part == "0" or not part.startswith("0"))
        and int(part) <= 255
        for part in parts
    )
`,
  },
  javascript: {
    fn: "isValidIpv4",
    signature: "function isValidIpv4(s: string): boolean",
    starter: `function isValidIpv4(s) {
  // Check the number of parts, then each part's characters, then its value.
  return s.split(".").length === 4;
}
`,
    solution: `function isValidIpv4(s) {
  const parts = s.split(".");
  return (
    parts.length === 4 &&
    parts.every((part) => /^(0|[1-9][0-9]{0,2})$/.test(part) && Number(part) <= 255)
  );
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A private network address",
      args: ["192.168.1.1"],
      expected: true,
      example: "Four parts, each a plain number from 0 to 255.",
    },
    {
      id: "example2",
      name: "A leading zero",
      args: ["192.168.01.1"],
      expected: false,
      example: "01 has a leading zero, so the address is invalid.",
    },
    { id: "range-ends", name: "0 and 255 are both in range", args: ["0.10.100.255"], expected: true },
    { id: "too-big", name: "A part above 255", args: ["256.8.8.8"], expected: false },
    { id: "three-parts", name: "Only three parts", args: ["10.0.0"], expected: false },
    { id: "empty-part", name: "An empty part", args: ["10..0.1"], expected: false },
    { id: "space", name: "A trailing space", args: ["10.0.0.1 "], expected: false },
    {
      id: "exponent",
      name: "Only digits in a part",
      description: "Some number parsers read 1e1 as 10, but it is not a decimal part.",
      args: ["10.0.0.1e1"],
      expected: false,
    },
  ],
});

// ─── Zigzag Text ─────────────────────────────────────────────────────

const ZIGZAG_TEXT = dualChallenge({
  slug: "zigzag-text",
  title: "Zigzag Text",
  difficulty: "Intermediate",
  topic: "Index arithmetic",
  description: "Write a string in a zigzag across several rows, then read it off row by row.",
  prompt: [
    "Write `text` in a zigzag across `rows` rows: the first character goes on the top row, each following character one row lower until the bottom row, then one row higher until the top, and so on. Then read the rows from top to bottom, each from left to right, and return the result.",
    "With 3 rows, `PAYPALISHIRING` puts `PAHN` on the top row, `APLSIIG` on the middle row and `YIR` on the bottom row, so the answer is `PAHNAPLSIIGYIR`.",
    "With one row there is no zigzag and the text comes back unchanged, as it also does when there are at least as many rows as characters.",
  ],
  params: ["text", "rows"],
  constraints: [
    "`0 ≤ len(text) ≤ 10⁴`",
    "`1 ≤ rows ≤ 1000`",
    "Every character counts, spaces and punctuation included",
  ],
  solutionNote:
    "The pattern repeats every `2 * (rows - 1)` characters, so the row of character `i` is its position in the cycle folded back at the bottom: `r = i % cycle`, then `min(r, cycle - r)`. With one row that cycle is 0, the modulo divides by zero, and a version that bounces between rows steps straight off the only row, which is why one row needs its own early return.",
  python: {
    fn: "zigzag",
    signature: "def zigzag(text: str, rows: int) -> str",
    starter: `def zigzag(text: str, rows: int) -> str:
    # Work out which row each character lands on, then read the rows in order.
    return text
`,
    solution: `def zigzag(text: str, rows: int) -> str:
    if rows == 1:
        return text
    cycle = 2 * (rows - 1)
    lines = [[] for _ in range(rows)]
    for i, ch in enumerate(text):
        r = i % cycle
        lines[min(r, cycle - r)].append(ch)
    return "".join("".join(line) for line in lines)
`,
  },
  javascript: {
    fn: "zigzag",
    signature: "function zigzag(text: string, rows: number): string",
    starter: `function zigzag(text, rows) {
  // Work out which row each character lands on, then read the rows in order.
  return text;
}
`,
    solution: `function zigzag(text, rows) {
  if (rows === 1) return text;
  const lines = Array(rows).fill("");
  let row = 0;
  let step = 1;
  for (const ch of text) {
    lines[row] += ch;
    if (row === 0) step = 1;
    else if (row === rows - 1) step = -1;
    row += step;
  }
  return lines.join("");
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Three rows",
      args: ["PAYPALISHIRING", 3],
      expected: "PAHNAPLSIIGYIR",
      example: "The rows read PAHN, APLSIIG and YIR.",
    },
    {
      id: "example2",
      name: "Four rows",
      args: ["PAYPALISHIRING", 4],
      expected: "PINALSIGYAHRPI",
      example: "The rows read PIN, ALSIG, YAHR and PI.",
    },
    { id: "one-row", name: "One row", args: ["ABC", 1], expected: "ABC" },
    { id: "two-rows", name: "Two rows", args: ["ABCDEF", 2], expected: "ACEBDF" },
    {
      id: "spaces",
      name: "Spaces are characters too",
      args: ["HELLO WORLD", 3],
      expected: "HOREL OLLWD",
    },
    { id: "more-rows", name: "More rows than characters", args: ["AB", 5], expected: "AB" },
    { id: "empty", name: "An empty string", args: ["", 3], expected: "" },
  ],
});

// ─── Longest Palindromic Substring ───────────────────────────────────

const LONGEST_PALINDROMIC_SUBSTRING = dualChallenge({
  slug: "longest-palindromic-substring",
  title: "Longest Palindromic Substring",
  difficulty: "Advanced",
  topic: "Expand around the centre",
  description: "Find the longest run of consecutive characters that reads the same backwards.",
  prompt: [
    "Return the longest substring of `s` (a run of consecutive characters) that reads the same forwards and backwards. In `forgeeksskeegfor` that is `geeksskeeg`.",
    "When several palindromes share the longest length, return the one that starts earliest. Every single character is a palindrome, so a non-empty string always has an answer; an empty string returns an empty string.",
    "Inputs run to about three thousand characters. Checking every substring is O(n³) and far too slow there. Every palindrome has a centre, either a character or the gap between two neighbours, and growing outwards from each centre is O(n²) at worst.",
  ],
  params: ["s"],
  constraints: [
    "`0 ≤ len(s) ≤ 3000`",
    "Lowercase letters `a` to `z` only",
    "Ties go to the palindrome that starts first",
  ],
  solutionNote:
    "Expanding from a centre while the two ends match finds the longest palindrome around it in time proportional to its length, and there are only about `2n` centres: each character for odd lengths and each gap for even ones, where forgetting the gaps misses `bb` in `cbbd`. Visiting centres left to right and replacing the best only when a palindrome is strictly longer gives the earliest one on ties. Reversing the string and taking the longest common substring is a tempting shortcut that is wrong: in `abacdfgdcaba` it finds `abacd`, which is not a palindrome.",
  python: {
    fn: "longest_palindrome",
    signature: "def longest_palindrome(s: str) -> str",
    starter: `def longest_palindrome(s: str) -> str:
    # Grow outwards from every centre: each character, and each gap between two.
    return s[:1]
`,
    solution: `def longest_palindrome(s: str) -> str:
    best_start, best_len = 0, 0
    # Centre c sits on character c // 2, or on the gap after it when c is odd.
    for centre in range(2 * len(s) - 1):
        lo = centre // 2
        hi = lo + centre % 2
        while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
            lo -= 1
            hi += 1
        if hi - lo - 1 > best_len:
            best_start, best_len = lo + 1, hi - lo - 1
    return s[best_start:best_start + best_len]
`,
  },
  javascript: {
    fn: "longestPalindrome",
    signature: "function longestPalindrome(s: string): string",
    starter: `function longestPalindrome(s) {
  // Grow outwards from every centre: each character, and each gap between two.
  return s.slice(0, 1);
}
`,
    solution: `function longestPalindrome(s) {
  let best = [0, 0];
  const expand = (lo, hi) => {
    while (lo >= 0 && hi < s.length && s[lo] === s[hi]) {
      lo--;
      hi++;
    }
    if (hi - lo - 1 > best[1]) best = [lo + 1, hi - lo - 1];
  };
  for (let i = 0; i < s.length; i++) {
    expand(i, i);
    expand(i, i + 1);
  }
  return s.slice(best[0], best[0] + best[1]);
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A tie goes to the first",
      args: ["babad"],
      expected: "bab",
      example: "aba is just as long, but bab starts first.",
    },
    {
      id: "example2",
      name: "An even-length palindrome",
      args: ["cbbd"],
      expected: "bb",
      example: "Its centre is the gap between the two b's.",
    },
    {
      id: "inside",
      name: "A long palindrome inside",
      args: ["forgeeksskeegfor"],
      expected: "geeksskeeg",
    },
    {
      id: "reverse-trap",
      name: "Not the longest substring shared with the reverse",
      description: "abacd appears in the string and in its reverse, but it is not a palindrome.",
      args: ["abacdfgdcaba"],
      expected: "aba",
    },
    {
      id: "all-distinct",
      name: "No palindrome longer than one letter",
      description: "Every single letter ties, so the first one wins.",
      args: ["abcde"],
      expected: "a",
    },
    { id: "single", name: "A single character", args: ["x"], expected: "x" },
    { id: "empty", name: "An empty string", args: [""], expected: "" },
    {
      id: "large",
      name: "About three thousand characters",
      description:
        "A 299-character palindrome sits in the middle; checking every substring is O(n³) here.",
      pyArgs: `"".join("a" * 49 + x for x in "bcd" * 9 + "efgfe" + "bcd" * 9)`,
      jsArgs: `[..."bcd".repeat(9) + "efgfe" + "bcd".repeat(9)].map((x) => "a".repeat(49) + x).join("")`,
      pyExpected: `"a" * 49 + "".join(x + "a" * 49 for x in "efgfe")`,
      jsExpected: `"a".repeat(49) + [..."efgfe"].map((x) => x + "a".repeat(49)).join("")`,
    },
  ],
});

export const CODE_STRINGS: Challenge[] = [
  CAESAR_CIPHER,
  RANSOM_NOTE,
  REVERSE_WORDS,
  CAMEL_TO_SNAKE,
  RUN_LENGTH_DECODE,
  SLUGIFY,
  MASK_CARD_NUMBER,
  ISOMORPHIC_STRINGS,
  WRAP_TEXT,
  ALMOST_PALINDROME,
  PARSE_DURATION,
  COMPARE_VERSIONS,
  VALIDATE_IPV4,
  ZIGZAG_TEXT,
  LONGEST_PALINDROMIC_SUBSTRING,
];
