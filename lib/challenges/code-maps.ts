/**
 * Single-step code challenges: hash maps, sets and counting.
 *
 * Every problem here turns "search the list again" into "look it up". A
 * dictionary of last positions, of counts, or of canonical keys replaces a
 * rescan per element, so an O(n²) answer becomes one pass. The algorithm is
 * rarely the hard part; choosing the key is. A normalized address, the letter
 * offsets of a shifted word, a suffix cut at a label boundary: each prompt
 * names the edge where the obvious key goes wrong, and the large-input checks
 * are sized so the quadratic version cannot finish in time.
 *
 * Each is written once with `dualChallenge`, so the Python and JavaScript
 * variants are graded on identical cases, and `__tests__/challengeSolutions`
 * runs both reference solutions for real.
 */

import { dualChallenge } from "./authoring";
import type { Challenge } from "./types";

const NEARBY_DUPLICATES = dualChallenge({
  slug: "nearby-duplicates",
  title: "Nearby Duplicates",
  difficulty: "Beginner",
  topic: "Last-seen index",
  description: "Decide whether some value repeats within k positions of itself.",
  prompt: [
    "Given a list of integers `nums` and a distance `k`, return whether some value appears at two different positions `i` and `j` with `abs(i - j) <= k`.",
    "A value can occur many times, and only its closest pair of copies matters. When `k` is 0, no two different positions are close enough. The list can hold two hundred thousand values and `k` can be just as large, so checking the next `k` values after every position is too slow.",
  ],
  params: ["nums", "k"],
  constraints: [
    "`0 ≤ len(nums) ≤ 2 × 10⁵`",
    "`0 ≤ k ≤ 2 × 10⁵`",
    "Values are integers, possibly negative",
  ],
  solutionNote:
    "Keep a dictionary from each value to the index where it was last seen: the nearest earlier copy of any position is always the most recent one, so a single comparison per position settles it and the scan is O(n). Recording the first index instead misses a value whose early copies are far apart but whose later copies sit side by side.",
  python: {
    fn: "has_nearby_duplicate",
    signature: "def has_nearby_duplicate(nums: list[int], k: int) -> bool",
    starter: `def has_nearby_duplicate(nums: list[int], k: int) -> bool:
    # Remember the last index where each value was seen.
    return False
`,
    solution: `def has_nearby_duplicate(nums: list[int], k: int) -> bool:
    last_seen = {}
    for i, value in enumerate(nums):
        if value in last_seen and i - last_seen[value] <= k:
            return True
        last_seen[value] = i
    return False
`,
  },
  javascript: {
    fn: "hasNearbyDuplicate",
    signature: "function hasNearbyDuplicate(nums: number[], k: number): boolean",
    starter: `function hasNearbyDuplicate(nums, k) {
  // Remember the last index where each value was seen.
  return false;
}
`,
    solution: `function hasNearbyDuplicate(nums, k) {
  const lastSeen = new Map();
  for (const [i, value] of nums.entries()) {
    if (lastSeen.has(value) && i - lastSeen.get(value) <= k) return true;
    lastSeen.set(value, i);
  }
  return false;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A repeat within reach",
      args: [[1, 2, 3, 1], 3],
      expected: true,
      example: "The two 1s are exactly three positions apart.",
    },
    {
      id: "example2",
      name: "Every repeat too far away",
      args: [[1, 2, 3, 1, 2, 3], 2],
      expected: false,
      example: "Each value's copy is three positions away, one more than k allows.",
    },
    {
      id: "latest-copy",
      name: "The later copies are the close ones",
      description: "Remembering only the first index of each value misses this.",
      args: [[7, 0, 7, 7], 1],
      expected: true,
    },
    { id: "zero-k", name: "A distance of zero", args: [[5, 5], 0], expected: false },
    { id: "empty", name: "An empty list", args: [[], 3], expected: false },
    { id: "negatives", name: "Negative values", args: [[-4, 2, -4], 2], expected: true },
    {
      id: "large",
      name: "Two hundred thousand values",
      description:
        "The only repeat is one position too far apart, and scanning k positions ahead of every value is quadratic here.",
      pyArgs: "list(range(200000)) + [0], 199999",
      jsArgs: "[...Array.from({ length: 200000 }, (_, i) => i), 0], 199999",
      expected: false,
    },
  ],
});

const MULTISET_INTERSECTION = dualChallenge({
  slug: "multiset-intersection",
  title: "Intersection With Counts",
  difficulty: "Beginner",
  topic: "Multisets",
  description:
    "Find the values two lists share, keeping as many copies as both of them hold.",
  prompt: [
    "Return the values that appear in both `a` and `b`, each repeated as many times as it appears in both: a value that occurs three times in `a` and twice in `b` appears twice in the result.",
    "Return the result sorted ascending, and leave both input lists unchanged.",
  ],
  params: ["a", "b"],
  constraints: [
    "`0 ≤ len(a), len(b) ≤ 10⁵`",
    "Values are integers, possibly negative",
    "Sort the result numerically, smallest first",
  ],
  solutionNote:
    "Count one list, then walk the other and take a value only while its count is above zero: each match spends one copy, so every value lands in the result min(count in `a`, count in `b`) times. A set intersection throws the repeats away, and deleting matches from a list with `remove` keeps them but costs O(n) per match. In JavaScript, sort with a comparator; the default sort compares numbers as text.",
  python: {
    fn: "intersect_with_counts",
    signature: "def intersect_with_counts(a: list[int], b: list[int]) -> list[int]",
    starter: `def intersect_with_counts(a: list[int], b: list[int]) -> list[int]:
    # Count one list, then spend those counts while walking the other.
    return []
`,
    solution: `from collections import Counter


def intersect_with_counts(a: list[int], b: list[int]) -> list[int]:
    return sorted((Counter(a) & Counter(b)).elements())
`,
  },
  javascript: {
    fn: "intersectWithCounts",
    signature: "function intersectWithCounts(a: number[], b: number[]): number[]",
    starter: `function intersectWithCounts(a, b) {
  // Count one list, then spend those counts while walking the other.
  return [];
}
`,
    solution: `function intersectWithCounts(a, b) {
  const available = new Map();
  for (const x of a) available.set(x, (available.get(x) ?? 0) + 1);
  const shared = [];
  for (const x of b) {
    const left = available.get(x) ?? 0;
    if (left > 0) {
      shared.push(x);
      available.set(x, left - 1);
    }
  }
  return shared.sort((x, y) => x - y);
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A repeat shared by both",
      args: [[1, 2, 2, 1], [2, 2]],
      expected: [2, 2],
      example: "2 appears twice in both lists; 1 is only in the first.",
    },
    {
      id: "example2",
      name: "Capped by the shorter supply",
      args: [[4, 9, 5], [9, 4, 9, 8, 4]],
      expected: [4, 9],
      example: "The second list has two 9s and two 4s, but the first has only one of each.",
    },
    {
      id: "min-count",
      name: "Each value capped at the smaller count",
      description: "Both inputs must come back unchanged.",
      args: [[3, 3, 3, 1], [3, 3, 1, 1]],
      expected: [1, 3, 3],
      noMutation: true,
    },
    { id: "disjoint", name: "Nothing in common", args: [[1, 2], [3, 4]], expected: [] },
    { id: "empty", name: "An empty list", args: [[], [1, 2]], expected: [] },
    {
      id: "numeric-sort",
      name: "Sorted by value, not as text",
      args: [[10, -2, 9, 10, 100], [100, 9, 10, -2, 10, 10]],
      expected: [-2, 9, 10, 10, 100],
    },
    {
      id: "large",
      name: "A hundred thousand values each",
      description: "Removing each match from a list one at a time is quadratic here.",
      pyArgs: "list(range(100000)), list(range(149999, 49999, -1))",
      jsArgs:
        "Array.from({ length: 100000 }, (_, i) => i), Array.from({ length: 100000 }, (_, i) => 149999 - i)",
      pyExpected: "list(range(50000, 100000))",
      jsExpected: "Array.from({ length: 50000 }, (_, i) => 50000 + i)",
    },
  ],
});

const INVERT_MAPPING = dualChallenge({
  slug: "invert-mapping",
  title: "Invert a Mapping",
  difficulty: "Beginner",
  topic: "Inverting a dictionary",
  description:
    "Turn a key-to-value dictionary around, collecting the keys that share each value.",
  prompt: [
    "A dictionary maps each key to a string value, and several keys can share a value: users to their role, files to their owner. Return the inverse, a dictionary (a plain object in JavaScript) from each value to the list of keys that had it.",
    "Sort each list of keys ascending as plain strings, whatever order they were inserted in. Every value in the input becomes exactly one key in the output, and the input itself is left unchanged.",
  ],
  params: ["mapping"],
  constraints: [
    "Keys and values are strings",
    "`0 ≤ len(mapping) ≤ 10⁵`",
    "Each list of keys is sorted ascending",
  ],
  solutionNote:
    "Walk the items once and append each key to its value's list, creating the list the first time the value turns up; sort the lists at the end. Collecting the distinct values first and then scanning the whole mapping once per value gives the same answer in O(n²).",
  python: {
    fn: "invert_mapping",
    signature: "def invert_mapping(mapping: dict[str, str]) -> dict[str, list[str]]",
    starter: `def invert_mapping(mapping: dict[str, str]) -> dict[str, list[str]]:
    # Append each key to the list for its value.
    return {}
`,
    solution: `def invert_mapping(mapping: dict[str, str]) -> dict[str, list[str]]:
    inverted = {}
    for key, value in mapping.items():
        inverted.setdefault(value, []).append(key)
    return {value: sorted(keys) for value, keys in inverted.items()}
`,
  },
  javascript: {
    fn: "invertMapping",
    signature:
      "function invertMapping(mapping: Record<string, string>): Record<string, string[]>",
    starter: `function invertMapping(mapping) {
  // Append each key to the list for its value.
  return {};
}
`,
    solution: `function invertMapping(mapping) {
  const groups = new Map();
  for (const [key, value] of Object.entries(mapping)) {
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(key);
  }
  return Object.fromEntries(
    [...groups].map(([value, keys]) => [value, keys.sort()]),
  );
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Two keys share a value",
      description: "The input must come back unchanged.",
      args: [{ alice: "admin", bob: "viewer", carol: "admin" }],
      expected: { admin: ["alice", "carol"], viewer: ["bob"] },
      noMutation: true,
      example: "alice and carol are both admins, so admin collects both.",
    },
    {
      id: "example2",
      name: "Keys come out sorted",
      args: [{ zoe: "ops", adam: "ops", mia: "ops" }],
      expected: { ops: ["adam", "mia", "zoe"] },
      example: "Sorted ascending, not in the order the keys were inserted.",
    },
    {
      id: "one-to-one",
      name: "Every value distinct",
      args: [{ a: "x", b: "y" }],
      expected: { x: ["a"], y: ["b"] },
    },
    {
      id: "swap",
      name: "A value that is also a key",
      args: [{ up: "down", down: "up" }],
      expected: { down: ["up"], up: ["down"] },
    },
    { id: "empty", name: "An empty mapping", args: [{}], expected: {} },
    {
      id: "large",
      name: "Forty thousand keys",
      description: "Scanning the whole mapping once per distinct value is quadratic here.",
      pyArgs: `{f"user{i}": f"team{i % 20000}" for i in range(40000)}`,
      jsArgs: `Object.fromEntries(Array.from({ length: 40000 }, (_, i) => ["user" + i, "team" + (i % 20000)]))`,
      pyExpected: `{f"team{i}": sorted([f"user{i}", f"user{i + 20000}"]) for i in range(20000)}`,
      jsExpected: `Object.fromEntries(Array.from({ length: 20000 }, (_, i) => ["team" + i, ["user" + i, "user" + (i + 20000)].sort()]))`,
    },
  ],
});

const MERGE_COUNTERS = dualChallenge({
  slug: "merge-counters",
  title: "Merge Counters",
  difficulty: "Beginner",
  topic: "Combining maps",
  description: "Add up counts from several dictionaries, dropping the keys that cancel out.",
  prompt: [
    "Each dictionary in `counters` counts something per key, such as stock movements per product from one warehouse. Counts can be negative. Merge them into one dictionary (a plain object in JavaScript) holding each key's total across all of them.",
    "Leave out any key whose total comes to exactly zero; a negative total stays. Do not modify the input dictionaries.",
  ],
  params: ["counters"],
  constraints: [
    "Keys are strings and counts are integers",
    "`0 ≤ len(counters) ≤ 10⁴`",
    "Keys with a total of 0 are left out",
  ],
  solutionNote:
    "Add every count into one fresh accumulator and filter out the zeros once, at the end. In Python the tempting shortcut is `Counter`'s `+` operator, and it is the trap: it drops negative totals as well as zeros, where `update` keeps them. Accumulating into the first input dictionary instead of a new one quietly changes the caller's data.",
  python: {
    fn: "merge_counters",
    signature: "def merge_counters(counters: list[dict[str, int]]) -> dict[str, int]",
    starter: `def merge_counters(counters: list[dict[str, int]]) -> dict[str, int]:
    # Sum each key's counts into a new dictionary.
    return {}
`,
    solution: `from collections import Counter


def merge_counters(counters: list[dict[str, int]]) -> dict[str, int]:
    totals = Counter()
    for counts in counters:
        totals.update(counts)
    return {key: total for key, total in totals.items() if total != 0}
`,
  },
  javascript: {
    fn: "mergeCounters",
    signature:
      "function mergeCounters(counters: Record<string, number>[]): Record<string, number>",
    starter: `function mergeCounters(counters) {
  // Sum each key's counts into a new object.
  return {};
}
`,
    solution: `function mergeCounters(counters) {
  const totals = new Map();
  for (const counts of counters) {
    for (const [key, n] of Object.entries(counts)) {
      totals.set(key, (totals.get(key) ?? 0) + n);
    }
  }
  return Object.fromEntries([...totals].filter(([, total]) => total !== 0));
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A key that cancels out",
      description: "The input dictionaries must come back unchanged.",
      args: [[{ apples: 3, pears: 1 }, { apples: 2, plums: 4 }, { pears: -1 }]],
      expected: { apples: 5, plums: 4 },
      noMutation: true,
      example: "The pears cancel out, so that key is dropped.",
    },
    {
      id: "example2",
      name: "A negative total is kept",
      args: [[{ returns: -2 }, { returns: -1, sales: 5 }]],
      expected: { returns: -3, sales: 5 },
      example: "Only a total of exactly zero is dropped.",
    },
    {
      id: "zero-entry",
      name: "A zero already in the input",
      args: [[{ a: 0, b: 2 }]],
      expected: { b: 2 },
    },
    {
      id: "through-zero",
      name: "A total that passes through zero",
      args: [[{ a: 1 }, { a: -1 }, { a: 2 }]],
      expected: { a: 2 },
    },
    { id: "empty-list", name: "No counters at all", args: [[]], expected: {} },
    { id: "empty-dicts", name: "Only empty counters", args: [[{}, {}]], expected: {} },
  ],
});

const FIRST_REPEATED_WORD = dualChallenge({
  slug: "first-repeated-word",
  title: "First Repeated Word",
  difficulty: "Beginner",
  topic: "Seen sets",
  description: "Find the first word to appear a second time, ignoring case and punctuation.",
  prompt: [
    "Reading `text` from the left, return the first word that appears for a second time: of all the words that repeat, the one whose second occurrence comes earliest. Compare words case-insensitively and return the word in lowercase.",
    "Words are separated by whitespace. Strip every character that is not a letter or digit from both ends of a word, so `times,` is `times` and `(yes)` is `yes`; punctuation inside a word stays, so `don't` and `dont` are different words. A token that is nothing but punctuation, like a lone `-`, is not a word at all.",
    "Return `None` (`null` in JavaScript) when no word repeats.",
  ],
  params: ["text"],
  constraints: [
    "The text is ASCII",
    "`0 ≤ len(text) ≤ 10⁶`",
    "Return the word in lowercase",
  ],
  solutionNote:
    "Keep a set of the words seen so far and return the first word that is already in it: that is, by construction, the word whose second occurrence comes first. Checking membership in a list of earlier words makes the scan O(n²), and forgetting to skip tokens that strip down to nothing makes two stray dashes the first repeated word.",
  python: {
    fn: "first_repeated_word",
    signature: "def first_repeated_word(text: str) -> str | None",
    starter: `def first_repeated_word(text: str) -> str | None:
    # Clean each word, then check it against the words already seen.
    return None
`,
    solution: `import string


def first_repeated_word(text: str) -> str | None:
    seen = set()
    for token in text.split():
        word = token.strip(string.punctuation).lower()
        if not word:
            continue
        if word in seen:
            return word
        seen.add(word)
    return None
`,
  },
  javascript: {
    fn: "firstRepeatedWord",
    signature: "function firstRepeatedWord(text: string): string | null",
    starter: `function firstRepeatedWord(text) {
  // Clean each word, then check it against the words already seen.
  return null;
}
`,
    solution: `function firstRepeatedWord(text) {
  const seen = new Set();
  for (const token of text.split(/\\s+/)) {
    const word = token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "").toLowerCase();
    if (!word) continue;
    if (seen.has(word)) return word;
    seen.add(word);
  }
  return null;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Case is ignored",
      args: ["It was the best of times, it was the worst of times."],
      expected: "it",
      example: "The capitalized It and the later it are the same word.",
    },
    {
      id: "example2",
      name: "The earliest second occurrence wins",
      args: ["one two three two one"],
      expected: "two",
      example: "one repeats too, but its second occurrence comes later.",
    },
    {
      id: "punctuation",
      name: "Punctuation and line breaks around words",
      args: ["Stop.\nStop! Hammer time."],
      expected: "stop",
    },
    {
      id: "inner",
      name: "Punctuation inside a word counts",
      args: ["don't dont DON'T"],
      expected: "don't",
    },
    {
      id: "dash",
      name: "A lone dash is not a word",
      description: "Stripping it leaves nothing, and nothing cannot repeat.",
      args: ["wait - what - wait"],
      expected: "wait",
    },
    { id: "none", name: "No word repeats", args: ["every word here is different"], expected: null },
    { id: "empty", name: "An empty text", args: [""], expected: null },
    {
      id: "large",
      name: "A hundred thousand words",
      description: "Checking each word against a list of the earlier ones is quadratic here.",
      pyArgs: `" ".join(f"w{i}" for i in range(100000)) + " W500."`,
      jsArgs: `Array.from({ length: 100000 }, (_, i) => "w" + i).join(" ") + " W500."`,
      expected: "w500",
    },
  ],
});

const UNIQUE_EMAILS = dualChallenge({
  slug: "unique-emails",
  title: "Unique Email Addresses",
  difficulty: "Beginner",
  topic: "Normalizing keys",
  description:
    "Count the inboxes a list of addresses reaches once dots and plus tags are normalized.",
  prompt: [
    "A mail provider delivers several spellings of an address to the same inbox. In the local part (everything before the `@`), dots are ignored and everything from the first `+` onward is dropped, so `maya.chen+news@inbox.io` reaches `mayachen@inbox.io`.",
    "The domain is taken exactly as written: dots and `+` signs there are significant. Return how many distinct inboxes the list of addresses reaches.",
  ],
  params: ["emails"],
  constraints: [
    "Every address holds exactly one `@`",
    "Addresses are lowercase",
    "`0 ≤ len(emails) ≤ 10⁵`",
  ],
  solutionNote:
    "Normalize each address into the inbox it reaches and put that in a set; the answer is the size of the set. Split at the `@` first and rewrite only the local part: applying the dot and plus rules to the whole address merges inboxes whose domains differ.",
  python: {
    fn: "count_unique_emails",
    signature: "def count_unique_emails(emails: list[str]) -> int",
    starter: `def count_unique_emails(emails: list[str]) -> int:
    # Rewrite each address into the inbox it reaches.
    return 0
`,
    solution: `def count_unique_emails(emails: list[str]) -> int:
    inboxes = set()
    for email in emails:
        local, domain = email.split("@")
        local = local.split("+", 1)[0].replace(".", "")
        inboxes.add(f"{local}@{domain}")
    return len(inboxes)
`,
  },
  javascript: {
    fn: "countUniqueEmails",
    signature: "function countUniqueEmails(emails: string[]): number",
    starter: `function countUniqueEmails(emails) {
  // Rewrite each address into the inbox it reaches.
  return 0;
}
`,
    solution: `function countUniqueEmails(emails) {
  const inboxes = new Set(
    emails.map((email) => {
      const [local, domain] = email.split("@");
      return local.split("+")[0].replaceAll(".", "") + "@" + domain;
    }),
  );
  return inboxes.size;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Three spellings, one inbox",
      args: [["maya.chen+news@inbox.io", "mayachen@inbox.io", "m.a.y.a.chen+shop.promo@inbox.io"]],
      expected: 1,
      example: "All three reach mayachen@inbox.io.",
    },
    {
      id: "example2",
      name: "Dots in the domain still count",
      args: [["dev.ops@team.example.org", "devops@teamexample.org", "dev+ops@team.example.org"]],
      expected: 3,
      example: "The first two differ in the domain, and the third is just dev@team.example.org.",
    },
    {
      id: "domain-plus",
      name: "A plus sign in the domain is kept",
      args: [["li+work@a+b.net", "li@a+b.net", "li@a.net"]],
      expected: 2,
    },
    {
      id: "first-plus",
      name: "Everything from the first plus is dropped",
      args: [["sam+one+two@x.io", "s.a.m@x.io", "sam+@x.io"]],
      expected: 1,
    },
    { id: "duplicates", name: "The same address twice", args: [["a@b.co", "a@b.co"]], expected: 1 },
    { id: "empty", name: "No addresses", args: [[]], expected: 0 },
    {
      id: "large",
      name: "A hundred thousand addresses",
      description: "Checking each inbox against a list of the ones already found is quadratic here.",
      pyArgs: `[f"user.{i % 50000}+tag{i}@site.io" for i in range(100000)]`,
      jsArgs: `Array.from({ length: 100000 }, (_, i) => "user." + (i % 50000) + "+tag" + i + "@site.io")`,
      expected: 50000,
    },
  ],
});

const PALINDROME_FROM_LETTERS = dualChallenge({
  slug: "palindrome-from-letters",
  title: "Longest Palindrome From Letters",
  difficulty: "Beginner",
  topic: "Counting parity",
  description: "Work out the longest palindrome a handful of letters can be rearranged into.",
  prompt: [
    "Given a string of `letters`, return the length of the longest palindrome that can be built by rearranging some or all of them. Each letter can be used at most once.",
    "Case matters: `A` and `a` are different letters and cannot pair with each other.",
  ],
  params: ["letters"],
  constraints: [
    "ASCII letters only, `a` to `z` and `A` to `Z`",
    "`0 ≤ len(letters) ≤ 2 × 10⁵`",
  ],
  solutionNote:
    "A palindrome is pairs mirrored around at most one unpaired letter in the middle, so the answer is every letter that can be paired, plus one if any letter is left over. Summing only the even counts forgets that a letter seen three times still gives a pair, and adding one for every odd count forgets that only a single letter fits in the middle.",
  python: {
    fn: "longest_palindrome_length",
    signature: "def longest_palindrome_length(letters: str) -> int",
    starter: `def longest_palindrome_length(letters: str) -> int:
    # Count how many letters can be paired up.
    return 0
`,
    solution: `from collections import Counter


def longest_palindrome_length(letters: str) -> int:
    counts = Counter(letters).values()
    paired = sum(n - n % 2 for n in counts)
    has_middle = any(n % 2 for n in counts)
    return paired + (1 if has_middle else 0)
`,
  },
  javascript: {
    fn: "longestPalindromeLength",
    signature: "function longestPalindromeLength(letters: string): number",
    starter: `function longestPalindromeLength(letters) {
  // Count how many letters can be paired up.
  return 0;
}
`,
    solution: `function longestPalindromeLength(letters) {
  // A letter sits here while it is waiting for its partner.
  const unpaired = new Set();
  for (const ch of letters) {
    if (unpaired.has(ch)) unpaired.delete(ch);
    else unpaired.add(ch);
  }
  return letters.length - unpaired.size + (unpaired.size > 0 ? 1 : 0);
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "One letter left over",
      args: ["racecars"],
      expected: 7,
      example: "racecar uses seven of the letters; the s has no partner.",
    },
    {
      id: "example2",
      name: "Case matters",
      args: ["Aa"],
      expected: 1,
      example: "A and a do not pair, so only one of them can be used.",
    },
    {
      id: "all-odd",
      name: "Every count is odd",
      description: "Each letter still gives a pair, and only one can sit in the middle.",
      args: ["aaabbbccc"],
      expected: 7,
    },
    { id: "all-even", name: "Nothing left for the middle", args: ["aabb"], expected: 4 },
    { id: "single", name: "A single letter", args: ["z"], expected: 1 },
    { id: "empty", name: "No letters", args: [""], expected: 0 },
    {
      id: "large",
      name: "Two hundred thousand letters",
      description: "Counting each letter with a fresh scan of the string is quadratic here.",
      pyArgs: `"a" * 99999 + "B" * 100000`,
      jsArgs: `"a".repeat(99999) + "B".repeat(100000)`,
      expected: 199999,
    },
  ],
});

const PAIRS_WITH_DIFFERENCE = dualChallenge({
  slug: "pairs-with-difference",
  title: "Pairs With a Given Difference",
  difficulty: "Intermediate",
  topic: "Complement lookups",
  description: "Count the distinct value pairs in a list that differ by exactly k.",
  prompt: [
    "Count the distinct pairs of values `(a, b)` from `nums` with `b - a == k`. Pairs are counted by value, not by position: however many copies of 1 and 3 the list holds, `(1, 3)` is one pair.",
    "`k` is never negative. When `k` is 0, a pair needs two copies of the same value, so the answer is how many distinct values appear at least twice.",
  ],
  params: ["nums", "k"],
  constraints: [
    "`0 ≤ len(nums) ≤ 2 × 10⁵`",
    "`0 ≤ k ≤ 10⁹`",
    "Values are integers between `-10⁹` and `10⁹`",
  ],
  solutionNote:
    "Put the distinct values in a set and ask, for each one, whether `value + k` is also there: every pair is found exactly once, from its smaller end, in O(n). `k = 0` breaks that rule because every value finds itself, so there the question becomes which values occur at least twice. Trying every pair of positions is O(n²), and it counts duplicates unless you dedupe the pairs afterwards.",
  python: {
    fn: "count_pairs_with_difference",
    signature: "def count_pairs_with_difference(nums: list[int], k: int) -> int",
    starter: `def count_pairs_with_difference(nums: list[int], k: int) -> int:
    # For each distinct value, look up the value k above it.
    return 0
`,
    solution: `from collections import Counter


def count_pairs_with_difference(nums: list[int], k: int) -> int:
    counts = Counter(nums)
    if k == 0:
        return sum(1 for n in counts.values() if n > 1)
    return sum(1 for value in counts if value + k in counts)
`,
  },
  javascript: {
    fn: "countPairsWithDifference",
    signature: "function countPairsWithDifference(nums: number[], k: number): number",
    starter: `function countPairsWithDifference(nums, k) {
  // For each distinct value, look up the value k above it.
  return 0;
}
`,
    solution: `function countPairsWithDifference(nums, k) {
  if (k === 0) {
    const seen = new Set();
    const repeated = new Set();
    for (const x of nums) (seen.has(x) ? repeated : seen).add(x);
    return repeated.size;
  }
  const values = new Set(nums);
  let pairs = 0;
  for (const x of values) if (values.has(x + k)) pairs++;
  return pairs;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Copies do not add pairs",
      args: [[3, 1, 4, 1, 5], 2],
      expected: 2,
      example: "The pairs are (1, 3) and (3, 5); the second 1 adds nothing new.",
    },
    {
      id: "example2",
      name: "A difference of zero",
      args: [[1, 3, 1, 5, 4], 0],
      expected: 1,
      example: "Only 1 appears twice.",
    },
    {
      id: "zero-no-repeats",
      name: "Zero with nothing repeated",
      description: "A single copy of a value does not pair with itself.",
      args: [[1, 2, 3], 0],
      expected: 0,
    },
    { id: "negatives", name: "Negative values", args: [[-3, -1, 1, 3], 2], expected: 3 },
    {
      id: "duplicates",
      name: "Many copies, one pair",
      args: [[2, 2, 2, 4, 4], 2],
      expected: 1,
    },
    { id: "empty", name: "An empty list", args: [[], 1], expected: 0 },
    {
      id: "large",
      name: "Two hundred thousand values",
      description: "Trying every pair of positions is quadratic here.",
      pyArgs: "list(range(199999, -1, -1)), 7",
      jsArgs: "Array.from({ length: 200000 }, (_, i) => 199999 - i), 7",
      expected: 199993,
    },
  ],
});

const SORT_BY_FREQUENCY = dualChallenge({
  slug: "sort-by-frequency",
  title: "Sort Characters by Frequency",
  difficulty: "Intermediate",
  topic: "Counting then sorting",
  description: "Reorder a string so its most frequent characters come first.",
  prompt: [
    "Rearrange the characters of `text` so the most frequent come first, with every copy of a character kept together in one run.",
    "Break ties between equally frequent characters by the character itself, ascending by code point: a space comes before `A`, which comes before `a`. Every character counts, including spaces and digits, and case matters.",
  ],
  params: ["text"],
  constraints: ["The text is ASCII", "`0 ≤ len(text) ≤ 10⁵`"],
  solutionNote:
    "Count once, then sort only the distinct characters (at most 128 of them in ASCII text) by count descending and character ascending, and write each one out as a run. Sorting the whole string with a key that calls `count` for every character is the trap: that is a full scan per character, O(n²).",
  python: {
    fn: "sort_by_frequency",
    signature: "def sort_by_frequency(text: str) -> str",
    starter: `def sort_by_frequency(text: str) -> str:
    # Count the characters, then order the distinct ones.
    return text
`,
    solution: `from collections import Counter


def sort_by_frequency(text: str) -> str:
    counts = Counter(text)
    order = sorted(counts, key=lambda ch: (-counts[ch], ch))
    return "".join(ch * counts[ch] for ch in order)
`,
  },
  javascript: {
    fn: "sortByFrequency",
    signature: "function sortByFrequency(text: string): string",
    starter: `function sortByFrequency(text) {
  // Count the characters, then order the distinct ones.
  return text;
}
`,
    solution: `function sortByFrequency(text) {
  const counts = new Map();
  for (const ch of text) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return [...counts]
    .sort(([a, countA], [b, countB]) => countB - countA || (a < b ? -1 : 1))
    .map(([ch, n]) => ch.repeat(n))
    .join("");
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Most frequent first",
      args: ["tree"],
      expected: "eert",
      example: "e appears twice; r and t tie at one each, so r comes first.",
    },
    {
      id: "example2",
      name: "Case matters",
      args: ["Aabb"],
      expected: "bbAa",
      example: "A and a are different characters, and A sorts first by code point.",
    },
    { id: "all-tied", name: "Every character tied", args: ["cba"], expected: "abc" },
    {
      id: "spaces",
      name: "Spaces count as characters",
      description: "A space ties with the letter a and sorts before it.",
      args: ["a b a"],
      expected: "  aab",
    },
    { id: "digits", name: "Digits", args: ["112233311"], expected: "111133322" },
    { id: "empty", name: "An empty string", args: [""], expected: "" },
    {
      id: "large",
      name: "A hundred thousand characters",
      description: "Counting a character afresh every time it is compared is quadratic here.",
      pyArgs: `"ab" * 50000 + "c"`,
      jsArgs: `"ab".repeat(50000) + "c"`,
      pyExpected: `"a" * 50000 + "b" * 50000 + "c"`,
      jsExpected: `"a".repeat(50000) + "b".repeat(50000) + "c"`,
    },
  ],
});

const GROUP_SHIFTED_STRINGS = dualChallenge({
  slug: "group-shifted-strings",
  title: "Group Shifted Strings",
  difficulty: "Intermediate",
  topic: "Canonical keys",
  description:
    "Group words that turn into one another when every letter shifts by the same amount.",
  prompt: [
    "Shifting a word moves every letter the same number of places along the alphabet, wrapping from `z` back around to `a`: shifting `abc` by 1 gives `bcd`, and shifting `xyz` by 3 gives `abc`. Group together the words that can be shifted into one another. Words of different lengths never share a group.",
    "Return the groups with each group's words sorted ascending, and the groups ordered by their first word. A word that appears twice in the input appears twice in its group.",
  ],
  params: ["words"],
  constraints: [
    "Every word is non-empty and holds lowercase letters `a` to `z` only",
    "`0 ≤ len(words) ≤ 10⁵`",
    "Sort within each group, then order the groups by their first word",
  ],
  solutionNote:
    "Describe each word by how far every letter sits past its first letter, modulo 26. That key is the same for every shift of a word and different for anything else, so one dictionary pass collects the groups. Without the modulo, `az` and `ba` get different keys even though shifting `az` by 1 wraps around to `ba`; and comparing each word with every group found so far, instead of keying it, is quadratic.",
  python: {
    fn: "group_shifted",
    signature: "def group_shifted(words: list[str]) -> list[list[str]]",
    starter: `def group_shifted(words: list[str]) -> list[list[str]]:
    # Give every shift of a word the same key.
    return []
`,
    solution: `def group_shifted(words: list[str]) -> list[list[str]]:
    groups = {}
    for word in words:
        key = tuple((ord(ch) - ord(word[0])) % 26 for ch in word)
        groups.setdefault(key, []).append(word)
    return sorted((sorted(group) for group in groups.values()), key=lambda g: g[0])
`,
  },
  javascript: {
    fn: "groupShifted",
    signature: "function groupShifted(words: string[]): string[][]",
    starter: `function groupShifted(words) {
  // Give every shift of a word the same key.
  return [];
}
`,
    solution: `function groupShifted(words) {
  const groups = new Map();
  for (const word of words) {
    const base = word.charCodeAt(0);
    const key = Array.from(word, (ch) => (ch.charCodeAt(0) - base + 26) % 26).join(",");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()]
    .map((group) => group.sort())
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Groups, sorted inside and out",
      args: [["ace", "bdf", "yac", "ab", "za", "cat", "q"]],
      expected: [["ab", "za"], ["ace", "bdf", "yac"], ["cat"], ["q"]],
      example: "yac is ace shifted by 24, wrapping past z; za is ab shifted by 25.",
    },
    {
      id: "example2",
      name: "A shift by one",
      args: [["hello", "ifmmp", "world"]],
      expected: [["hello", "ifmmp"], ["world"]],
      example: "Moving every letter of hello on by one gives ifmmp.",
    },
    {
      id: "wrap",
      name: "Wrapping from z to a",
      description: "Shifting az by one gives ba.",
      args: [["az", "ba", "za"]],
      expected: [["az", "ba"], ["za"]],
    },
    {
      id: "lengths",
      name: "Different lengths never match",
      args: [["a", "b", "ab"]],
      expected: [["a", "b"], ["ab"]],
    },
    {
      id: "duplicates",
      name: "A repeated word is kept",
      args: [["bcd", "abc", "abc"]],
      expected: [["abc", "abc", "bcd"]],
    },
    { id: "empty", name: "No words", args: [[]], expected: [] },
    {
      id: "large",
      name: "Seventy thousand words",
      description:
        "17,576 groups of four; comparing each word with every group found so far is too slow here.",
      pyArgs: `[''.join(chr(97 + (s + d) % 26) for d in (0, a, b, c)) for s in range(3, -1, -1) for a in range(25, -1, -1) for b in range(25, -1, -1) for c in range(25, -1, -1)]`,
      jsArgs: `(() => { const words = []; for (let s = 3; s >= 0; s--) for (let a = 25; a >= 0; a--) for (let b = 25; b >= 0; b--) for (let c = 25; c >= 0; c--) words.push(String.fromCharCode(...[0, a, b, c].map((d) => 97 + ((s + d) % 26)))); return words; })()`,
      pyExpected: `[[''.join(chr(97 + (s + d) % 26) for d in (0, a, b, c)) for s in range(4)] for a in range(26) for b in range(26) for c in range(26)]`,
      jsExpected: `(() => { const groups = []; for (let a = 0; a < 26; a++) for (let b = 0; b < 26; b++) for (let c = 0; c < 26; c++) groups.push([0, 1, 2, 3].map((s) => String.fromCharCode(...[0, a, b, c].map((d) => 97 + ((s + d) % 26))))); return groups; })()`,
    },
  ],
});

const MOST_FREQUENT_SPAN = dualChallenge({
  slug: "most-frequent-span",
  title: "Shortest Span at Full Degree",
  difficulty: "Intermediate",
  topic: "First and last positions",
  description:
    "Find the shortest stretch of a list that holds every copy of one of its most frequent values.",
  prompt: [
    "The degree of a list is the highest number of times any one value occurs in it. Return the length of the shortest contiguous stretch of `nums` that has the same degree as the whole list.",
    "Several values can tie for the highest count; the answer is the shortest stretch for any of them. An empty list has degree 0, and the answer for it is 0.",
  ],
  params: ["nums"],
  constraints: [
    "`0 ≤ len(nums) ≤ 2 × 10⁵`",
    "Values are integers, possibly negative",
  ],
  solutionNote:
    "A stretch with the full degree has to contain every copy of some most-frequent value, and the shortest such stretch runs from that value's first position to its last. So record each value's count and first and last index in one pass, then take the smallest span among the values tied for the top count. Checking every stretch, or calling `count` once per value, is quadratic; taking the first most-frequent value found ignores the ties.",
  python: {
    fn: "shortest_degree_span",
    signature: "def shortest_degree_span(nums: list[int]) -> int",
    starter: `def shortest_degree_span(nums: list[int]) -> int:
    # Record each value's count, first index and last index.
    return 0
`,
    solution: `from collections import Counter


def shortest_degree_span(nums: list[int]) -> int:
    counts = Counter(nums)
    first, last = {}, {}
    for i, value in enumerate(nums):
        first.setdefault(value, i)
        last[value] = i
    degree = max(counts.values(), default=0)
    return min(
        (last[v] - first[v] + 1 for v, n in counts.items() if n == degree),
        default=0,
    )
`,
  },
  javascript: {
    fn: "shortestDegreeSpan",
    signature: "function shortestDegreeSpan(nums: number[]): number",
    starter: `function shortestDegreeSpan(nums) {
  // Record each value's count, first index and last index.
  return 0;
}
`,
    solution: `function shortestDegreeSpan(nums) {
  // One pass: a value reaches the final degree only at its last copy,
  // so the span measured there is its full span.
  const seen = new Map();
  let degree = 0;
  let best = 0;
  nums.forEach((value, i) => {
    const entry = seen.get(value) ?? { first: i, count: 0 };
    entry.count += 1;
    seen.set(value, entry);
    const span = i - entry.first + 1;
    if (entry.count > degree || (entry.count === degree && span < best)) {
      degree = entry.count;
      best = span;
    }
  });
  return best;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A tie for the top count",
      args: [[1, 2, 2, 3, 1]],
      expected: 2,
      example: "1 and 2 both occur twice; the two 2s sit side by side.",
    },
    {
      id: "example2",
      name: "The shorter of two spans",
      args: [[4, 7, 4, 7, 7, 1, 4]],
      expected: 4,
      example: "4 and 7 both occur three times. The 7s span positions 1 to 4; the 4s span the whole list.",
    },
    { id: "distinct", name: "Every value occurs once", args: [[5, 6, 7]], expected: 1 },
    { id: "single", name: "A single value", args: [[9]], expected: 1 },
    { id: "empty", name: "An empty list", args: [[]], expected: 0 },
    {
      id: "negatives",
      name: "Negative values, and the tie found second",
      args: [[-1, 0, -1, 0, 0, -1]],
      expected: 4,
    },
    {
      id: "large",
      name: "Two hundred thousand values",
      description: "Counting each distinct value with its own scan is quadratic here.",
      pyArgs: "list(range(100000)) * 2 + [99999]",
      jsArgs: "Array.from({ length: 200001 }, (_, i) => (i === 200000 ? 99999 : i % 100000))",
      expected: 100002,
    },
  ],
});

const SUBDOMAIN_VISITS = dualChallenge({
  slug: "subdomain-visits",
  title: "Subdomain Visit Counts",
  difficulty: "Intermediate",
  topic: "Aggregating hierarchical keys",
  description: "Total visit counts for every domain and each parent domain above it.",
  prompt: [
    "Each record is a visit count and a domain separated by a space, like `9001 discuss.example.com`. A visit to a domain is also a visit to every domain it sits under, so that record counts 9001 visits for `discuss.example.com`, 9001 for `example.com` and 9001 for `com`.",
    "Return a dictionary (a plain object in JavaScript) from every domain and parent domain that appears to its total visit count. Parents are made of whole labels only: `myexample.com` sits under `com`, not under `example.com`.",
  ],
  params: ["records"],
  constraints: [
    "Counts are positive integers",
    "Domains are lowercase labels joined by single dots",
    "`0 ≤ len(records) ≤ 10⁴`",
  ],
  solutionNote:
    "Split each domain on its dots and add the count to every suffix that starts at a label; the dictionary merges the repeats across records. Deciding parenthood with `endswith` goes wrong on names like `myexample.com`, which ends with `example.com` without sitting under it.",
  python: {
    fn: "subdomain_visits",
    signature: "def subdomain_visits(records: list[str]) -> dict[str, int]",
    starter: `def subdomain_visits(records: list[str]) -> dict[str, int]:
    # Add each count to the domain and to every parent above it.
    return {}
`,
    solution: `from collections import Counter


def subdomain_visits(records: list[str]) -> dict[str, int]:
    totals = Counter()
    for record in records:
        count, domain = record.split()
        labels = domain.split(".")
        for i in range(len(labels)):
            totals[".".join(labels[i:])] += int(count)
    return dict(totals)
`,
  },
  javascript: {
    fn: "subdomainVisits",
    signature: "function subdomainVisits(records: string[]): Record<string, number>",
    starter: `function subdomainVisits(records) {
  // Add each count to the domain and to every parent above it.
  return {};
}
`,
    solution: `function subdomainVisits(records) {
  const totals = new Map();
  for (const record of records) {
    const [count, domain] = record.split(" ");
    let suffix = domain;
    while (true) {
      totals.set(suffix, (totals.get(suffix) ?? 0) + Number(count));
      const dot = suffix.indexOf(".");
      if (dot === -1) break;
      suffix = suffix.slice(dot + 1);
    }
  }
  return Object.fromEntries(totals);
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "One record, three domains",
      args: [["9001 discuss.example.com"]],
      expected: { "discuss.example.com": 9001, "example.com": 9001, com: 9001 },
      example: "A visit to discuss.example.com is also a visit to example.com and to com.",
    },
    {
      id: "example2",
      name: "Siblings add up under their parent",
      args: [["900 mail.corvid.io", "50 docs.corvid.io", "5 blog.orchard.dev"]],
      expected: {
        "mail.corvid.io": 900,
        "docs.corvid.io": 50,
        "corvid.io": 950,
        io: 950,
        "blog.orchard.dev": 5,
        "orchard.dev": 5,
        dev: 5,
      },
      example: "Both corvid.io subdomains count towards corvid.io and io.",
    },
    {
      id: "repeat",
      name: "The same domain in two records",
      args: [["3 api.fern.app", "4 api.fern.app"]],
      expected: { "api.fern.app": 7, "fern.app": 7, app: 7 },
    },
    {
      id: "label-boundary",
      name: "Parents end at a dot",
      description: "myexample.com does not sit under example.com.",
      args: [["10 myexample.com", "5 example.com"]],
      expected: { "myexample.com": 10, "example.com": 5, com: 15 },
    },
    {
      id: "single-label",
      name: "A domain with no dots",
      args: [["12 localhost"]],
      expected: { localhost: 12 },
    },
    {
      id: "deep",
      name: "Four levels deep",
      args: [["2 a.b.c.d"]],
      expected: { "a.b.c.d": 2, "b.c.d": 2, "c.d": 2, d: 2 },
    },
    { id: "empty", name: "No records", args: [[]], expected: {} },
  ],
});

const PIVOT_LONG_TO_WIDE = dualChallenge({
  slug: "pivot-long-to-wide",
  title: "Pivot Long to Wide",
  difficulty: "Intermediate",
  topic: "Reshaping records",
  description: "Reshape id, field, value rows into one record per id with every field filled in.",
  prompt: [
    "Long-format data stores one fact per row, `[id, field, value]`. Reshape it into wide format: one dictionary per id (a plain object in JavaScript) holding the key `\"id\"` and one key for every field that appears anywhere in the input.",
    "A record that never mentions a field gets `None` (`null` in JavaScript) for it. When the same id and field appear on more than one row, the last row wins. Return the records sorted by id, ascending.",
  ],
  params: ["rows"],
  constraints: [
    "Ids are integers",
    "Field names are strings, and none of them is `\"id\"`",
    "Values are strings or numbers",
    "`0 ≤ len(rows) ≤ 10⁵`",
  ],
  solutionNote:
    "Collect two things in the same pass: each id's own values, and the set of every field seen anywhere, because a field that first turns up on the last row still has to appear, empty, on the first record. Fill the gaps with a lookup that has a default rather than with `or` (`||` in JavaScript), which turns a real `0` into a missing value, and sort the ids as numbers (in JavaScript, with a comparator). Scanning all the rows again for every id is quadratic.",
  python: {
    fn: "pivot_wide",
    signature: "def pivot_wide(rows: list[list]) -> list[dict]",
    starter: `def pivot_wide(rows: list[list]) -> list[dict]:
    # Collect each id's values and every field name seen anywhere.
    return []
`,
    solution: `def pivot_wide(rows: list[list]) -> list[dict]:
    records = {}
    fields = set()
    for record_id, field, value in rows:
        records.setdefault(record_id, {})[field] = value
        fields.add(field)
    return [
        {"id": record_id, **{field: values.get(field) for field in fields}}
        for record_id, values in sorted(records.items())
    ]
`,
  },
  javascript: {
    fn: "pivotWide",
    signature:
      "function pivotWide(rows: [number, string, string | number][]): Record<string, string | number | null>[]",
    starter: `function pivotWide(rows) {
  // Collect each id's values and every field name seen anywhere.
  return [];
}
`,
    solution: `function pivotWide(rows) {
  const records = new Map();
  const fields = new Set();
  for (const [id, field, value] of rows) {
    if (!records.has(id)) records.set(id, new Map());
    records.get(id).set(field, value);
    fields.add(field);
  }
  return [...records]
    .sort(([a], [b]) => a - b)
    .map(([id, values]) => {
      const record = { id };
      for (const field of fields) record[field] = values.get(field) ?? null;
      return record;
    });
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A field one record never mentions",
      args: [[[2, "city", "Oslo"], [1, "city", "Lima"], [1, "age", 34]]],
      expected: [
        { id: 1, city: "Lima", age: 34 },
        { id: 2, city: "Oslo", age: null },
      ],
      example: "Record 2 has no age row, so its age is None; the records come out in id order.",
    },
    {
      id: "example2",
      name: "The last row wins",
      args: [[[7, "plan", "trial"], [7, "plan", "paid"]]],
      expected: [{ id: 7, plan: "paid" }],
      example: "The same id and field twice: the later value is kept.",
    },
    {
      id: "every-field",
      name: "Every field on every record",
      args: [[[1, "a", "x"], [2, "b", "y"], [3, "c", "z"]]],
      expected: [
        { id: 1, a: "x", b: null, c: null },
        { id: 2, a: null, b: "y", c: null },
        { id: 3, a: null, b: null, c: "z" },
      ],
    },
    {
      id: "numeric-order",
      name: "Ids sort as numbers",
      args: [[[10, "k", "x"], [9, "k", "y"], [100, "k", "z"]]],
      expected: [
        { id: 9, k: "y" },
        { id: 10, k: "x" },
        { id: 100, k: "z" },
      ],
    },
    {
      id: "zero",
      name: "Zero is a value, not a gap",
      args: [[[1, "score", 0], [2, "score", 3], [2, "bonus", 0]]],
      expected: [
        { id: 1, score: 0, bonus: null },
        { id: 2, score: 3, bonus: 0 },
      ],
    },
    { id: "empty", name: "No rows", args: [[]], expected: [] },
    {
      id: "large",
      name: "A hundred thousand rows",
      description: "Scanning every row again for each id is quadratic here.",
      pyArgs: `[[i, field, value] for i in range(49999, -1, -1) for field, value in (("clicks", i), ("views", 2 * i))]`,
      jsArgs: `Array.from({ length: 100000 }, (_, j) => { const i = 49999 - (j >> 1); return j % 2 ? [i, "views", 2 * i] : [i, "clicks", i]; })`,
      pyExpected: `[{"id": i, "clicks": i, "views": 2 * i} for i in range(50000)]`,
      jsExpected: `Array.from({ length: 50000 }, (_, i) => ({ id: i, clicks: i, views: 2 * i }))`,
    },
  ],
});

const DENSE_RANK_SCORES = dualChallenge({
  slug: "dense-rank-scores",
  title: "Rank Scores With Ties",
  difficulty: "Intermediate",
  topic: "Dense ranking",
  description: "Rank scores highest first, with ties sharing a rank and no gaps after them.",
  prompt: [
    "Rank a list of scores the way a leaderboard with ties does. The highest score gets rank 1, equal scores share a rank, and the next lower score takes the next rank with no gap: after a tie for first, the next score is 2nd, not 3rd.",
    "Return the ranks in the same order as the input scores, and leave the input list as it was.",
  ],
  params: ["scores"],
  constraints: [
    "`0 ≤ len(scores) ≤ 2 × 10⁵`",
    "Scores are integers or decimals, possibly negative",
  ],
  solutionNote:
    "Sort only the distinct scores, highest first; a score's rank is its position in that list plus one, and a dictionary from score to rank then answers every entry in O(1), for O(n log n) overall. Counting the distinct higher scores separately for every entry is O(n²), and sorting the input in place destroys the order the answer has to come back in.",
  python: {
    fn: "dense_rank",
    signature: "def dense_rank(scores: list[float]) -> list[int]",
    starter: `def dense_rank(scores: list[float]) -> list[int]:
    # Rank the distinct scores once, then look each score up.
    return []
`,
    solution: `def dense_rank(scores: list[float]) -> list[int]:
    distinct = sorted(set(scores), reverse=True)
    rank = {score: i for i, score in enumerate(distinct, start=1)}
    return [rank[score] for score in scores]
`,
  },
  javascript: {
    fn: "denseRank",
    signature: "function denseRank(scores: number[]): number[]",
    starter: `function denseRank(scores) {
  // Rank the distinct scores once, then look each score up.
  return [];
}
`,
    solution: `function denseRank(scores) {
  const distinct = [...new Set(scores)].sort((a, b) => b - a);
  const rank = new Map(distinct.map((score, i) => [score, i + 1]));
  return scores.map((score) => rank.get(score));
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Ties share a rank",
      description: "The input list must come back unchanged.",
      args: [[88, 95, 70, 95, 88]],
      expected: [2, 1, 3, 1, 2],
      noMutation: true,
      example: "Both 95s rank first, so the 88s are second, not third.",
    },
    {
      id: "example2",
      name: "Everyone tied",
      args: [[50, 50, 50]],
      expected: [1, 1, 1],
      example: "One distinct score, one rank.",
    },
    { id: "no-gap", name: "No gap after a tie", args: [[100, 90, 90, 80]], expected: [1, 2, 2, 3] },
    {
      id: "numeric",
      name: "Scores compare as numbers",
      description: "Compared as text, 9 would outrank 100.",
      args: [[9, 10, 100, 10]],
      expected: [3, 2, 1, 2],
    },
    {
      id: "decimals",
      name: "Decimals and negatives",
      args: [[-1.5, 0, -1.5, 2.25]],
      expected: [3, 2, 3, 1],
    },
    { id: "single", name: "A single score", args: [[7]], expected: [1] },
    { id: "empty", name: "No scores", args: [[]], expected: [] },
    {
      id: "large",
      name: "Two hundred thousand scores",
      description: "Counting the higher scores separately for every entry is quadratic here.",
      pyArgs: "[i // 2 for i in range(200000)]",
      jsArgs: "Array.from({ length: 200000 }, (_, i) => Math.floor(i / 2))",
      pyExpected: "[100000 - i // 2 for i in range(200000)]",
      jsExpected: "Array.from({ length: 200000 }, (_, i) => 100000 - Math.floor(i / 2))",
    },
  ],
});

const BULLS_AND_COWS = dualChallenge({
  slug: "bulls-and-cows",
  title: "Bulls and Cows",
  difficulty: "Intermediate",
  topic: "Counting mismatches",
  description: "Score a guess against a secret code as bulls in place and cows out of place.",
  prompt: [
    "In Bulls and Cows, one player writes a secret string of digits and the other guesses a string of the same length. A bull is a guessed digit in exactly the right position. A cow is a guessed digit that occurs in the secret, but not in that position.",
    "Each digit of the secret can be matched at most once. A digit already matched as a bull is not available as a cow, and a digit the guess repeats more often than the secret holds earns only as many cows as the secret has unmatched copies of it.",
    "Return the hint as `xAyB`, where `x` is the number of bulls and `y` the number of cows.",
  ],
  params: ["secret", "guess"],
  constraints: [
    "`secret` and `guess` have the same length",
    "Both hold the digits `0` to `9` only, and either may repeat a digit",
    "`0 ≤ len(secret) ≤ 1000`",
  ],
  solutionNote:
    "Count the bulls position by position. The number of digits the two strings share, bulls included, is the sum over each digit of the smaller of its two counts, so the cows are that total minus the bulls. Asking whether each guessed digit appears anywhere in the secret counts the same secret digit several times over, and counts every bull a second time as a cow.",
  python: {
    fn: "bulls_and_cows",
    signature: "def bulls_and_cows(secret: str, guess: str) -> str",
    starter: `def bulls_and_cows(secret: str, guess: str) -> str:
    # Count exact matches, then the digits shared regardless of position.
    return "0A0B"
`,
    solution: `from collections import Counter


def bulls_and_cows(secret: str, guess: str) -> str:
    bulls = sum(s == g for s, g in zip(secret, guess))
    shared = sum((Counter(secret) & Counter(guess)).values())
    return f"{bulls}A{shared - bulls}B"
`,
  },
  javascript: {
    fn: "bullsAndCows",
    signature: "function bullsAndCows(secret: string, guess: string): string",
    starter: `function bullsAndCows(secret, guess) {
  // Count exact matches, then the digits shared regardless of position.
  return "0A0B";
}
`,
    solution: `function bullsAndCows(secret, guess) {
  // balance[d] > 0: the secret has unmatched d's waiting for the guess;
  // balance[d] < 0: the guess has unmatched d's waiting for the secret.
  const balance = new Array(10).fill(0);
  let bulls = 0;
  let cows = 0;
  for (let i = 0; i < secret.length; i++) {
    const s = Number(secret[i]);
    const g = Number(guess[i]);
    if (s === g) {
      bulls++;
      continue;
    }
    if (balance[s] < 0) cows++;
    if (balance[g] > 0) cows++;
    balance[s]++;
    balance[g]--;
  }
  return \`\${bulls}A\${cows}B\`;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Bulls and cows together",
      args: ["3721", "1723"],
      expected: "2A2B",
      example: "7 and 2 are in place; 1 and 3 are in the secret but swapped.",
    },
    {
      id: "example2",
      name: "A repeated digit in the guess",
      args: ["4412", "2444"],
      expected: "1A2B",
      example:
        "The guess has three 4s, but the secret has two and one is already a bull, so only one 4 is a cow.",
    },
    {
      id: "bull-not-cow",
      name: "A bull is not also a cow",
      description: "Both 2s in the secret are already bulls, so the extra 2 in the guess earns nothing.",
      args: ["1122", "1222"],
      expected: "3A0B",
    },
    { id: "all-bulls", name: "A perfect guess", args: ["2024", "2024"], expected: "4A0B" },
    { id: "all-cows", name: "Every digit misplaced", args: ["1234", "4321"], expected: "0A4B" },
    { id: "nothing", name: "Nothing in common", args: ["1234", "5678"], expected: "0A0B" },
    { id: "empty", name: "Empty strings", args: ["", ""], expected: "0A0B" },
  ],
});

export const CODE_MAPS: Challenge[] = [
  NEARBY_DUPLICATES,
  MULTISET_INTERSECTION,
  INVERT_MAPPING,
  MERGE_COUNTERS,
  FIRST_REPEATED_WORD,
  UNIQUE_EMAILS,
  PALINDROME_FROM_LETTERS,
  PAIRS_WITH_DIFFERENCE,
  SORT_BY_FREQUENCY,
  GROUP_SHIFTED_STRINGS,
  MOST_FREQUENT_SPAN,
  SUBDOMAIN_VISITS,
  PIVOT_LONG_TO_WIDE,
  DENSE_RANK_SCORES,
  BULLS_AND_COWS,
];
