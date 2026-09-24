/**
 * Single-step code challenges: numbers, bits and dates.
 *
 * Each of these is arithmetic that fits on an index card and still goes wrong
 * in practice, for one of two reasons. Either the obvious loop is too slow
 * (trial division all the way to n, one multiplication per unit of exponent, a
 * scan of the whole list for every candidate), or the obvious formula is
 * quietly inexact (a floating-point square root, `p / 100 * n`, a product that
 * passes 2^53 in a JavaScript number). The large cases are sized so that the
 * first kind cannot finish, and the precise cases sit exactly where the second
 * kind rounds the wrong way.
 *
 * Every challenge ships in Python and JavaScript through `dualChallenge`, so
 * both languages are graded on identical inputs. JavaScript numbers are
 * doubles, so every input and intermediate stays within
 * Number.MAX_SAFE_INTEGER unless the challenge is about that edge, and its
 * constraints say so.
 */

import { dualChallenge } from "./authoring";
import type { Challenge } from "./types";

// ─── Divisibility ────────────────────────────────────────────────────

const LCM_OF_LIST = dualChallenge({
  slug: "lcm-of-list",
  title: "Least Common Multiple",
  difficulty: "Beginner",
  topic: "Euclid's algorithm",
  description:
    "Find the smallest number that every value in a list divides evenly.",
  prompt: [
    "Return the least common multiple of `nums`: the smallest positive integer that every value in the list divides with no remainder.",
    "The list always holds at least one value. Work it out a pair at a time, using the greatest common divisor of each pair; counting up through multiples of the largest value is far too slow once the answer gets big.",
  ],
  params: ["nums"],
  constraints: [
    "`1 ≤ len(nums) ≤ 10⁴`",
    "`1 ≤ nums[i] ≤ 10⁹`",
    "The answer is below `2⁵³`, so it is exact in a JavaScript number, but the product of two values may not be",
  ],
  solutionNote:
    "Fold the list with `lcm(a, b) = a / gcd(a, b) * b`, finding each GCD with Euclid's loop, which replaces `(a, b)` with `(b, a % b)` until the remainder is zero and needs only a few dozen steps even near a billion. Divide before you multiply: two values near 10⁹ multiply to about 10¹⁷, past the last exact integer in JavaScript, even when their LCM is small. Python has had `math.lcm` since 3.9.",
  python: {
    fn: "least_common_multiple",
    signature: "def least_common_multiple(nums: list[int]) -> int",
    starter: `from math import gcd


def least_common_multiple(nums: list[int]) -> int:
    # Combine the values a pair at a time, using the GCD of each pair.
    return max(nums)
`,
    solution: `from functools import reduce
from math import gcd


def least_common_multiple(nums: list[int]) -> int:
    return reduce(lambda acc, n: acc // gcd(acc, n) * n, nums)
`,
  },
  javascript: {
    fn: "leastCommonMultiple",
    signature: "function leastCommonMultiple(nums: number[]): number",
    starter: `function leastCommonMultiple(nums) {
  // Combine the values a pair at a time, using the GCD of each pair.
  return Math.max(...nums);
}
`,
    solution: `function gcd(a, b) {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function leastCommonMultiple(nums) {
  return nums.reduce((acc, n) => (acc / gcd(acc, n)) * n);
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Two values sharing a factor",
      args: [[4, 6]],
      expected: 12,
      example: "4 is 2 × 2 and 6 is 2 × 3, so the LCM needs two 2s and one 3.",
    },
    {
      id: "example2",
      name: "Values with no factor in common",
      args: [[3, 5, 7]],
      expected: 105,
      example: "Nothing is shared, so the LCM is the product.",
    },
    { id: "single", name: "A single value", args: [[9]], expected: 9 },
    {
      id: "multiple",
      name: "One value is a multiple of the others",
      args: [[2, 8, 4]],
      expected: 8,
    },
    {
      id: "repeats",
      name: "Repeated values",
      args: [[12, 18, 12, 30]],
      expected: 180,
    },
    {
      id: "big-product",
      name: "Two values whose product passes 2⁵³",
      description:
        "200000014 × 500000035 is about 10¹⁷, beyond exact integers in JavaScript, though the LCM is only 1000000070.",
      args: [[200000014, 500000035]],
      expected: 1000000070,
    },
    {
      id: "one-to-forty",
      name: "Every number from 1 to 40",
      description:
        "Counting up through multiples of 40 would take over 10¹⁴ steps.",
      pyArgs: "list(range(1, 41))",
      jsArgs: "Array.from({ length: 40 }, (_, i) => i + 1)",
      expected: 5342931457063200,
    },
  ],
});

const PRIME_FACTORS = dualChallenge({
  slug: "prime-factors",
  title: "Prime Factorization",
  difficulty: "Beginner",
  topic: "Trial division",
  description:
    "Break a number into the primes that multiply to make it, smallest first.",
  prompt: [
    "Return the prime factors of `n` in ascending order, with each prime repeated as many times as it divides `n`, so that multiplying the list back together gives `n`.",
    "`1` has no prime factors and returns an empty list. `n` can be as large as 10¹², which rules out trying every possible divisor up to `n` itself.",
  ],
  params: ["n"],
  constraints: [
    "`1 ≤ n ≤ 10¹²`",
    "Factors in ascending order, repeats included",
  ],
  solutionNote:
    "Divide out each candidate `d` for as long as it divides, and stop once `d * d > n`: whatever is left above 1 at that point has no factor below its square root, so it is prime and goes on the end. Stopping at `d * d < n` instead misses the second factor of a prime squared, and running `d` all the way to `n` takes a million times longer on a large prime.",
  python: {
    fn: "prime_factors",
    signature: "def prime_factors(n: int) -> list[int]",
    starter: `def prime_factors(n: int) -> list[int]:
    factors = []
    # Divide out each candidate for as long as it divides n.
    return factors
`,
    solution: `def prime_factors(n: int) -> list[int]:
    factors = []
    d = 2
    while d * d <= n:
        while n % d == 0:
            factors.append(d)
            n //= d
        d += 1 if d == 2 else 2
    if n > 1:
        factors.append(n)
    return factors
`,
  },
  javascript: {
    fn: "primeFactors",
    signature: "function primeFactors(n: number): number[]",
    starter: `function primeFactors(n) {
  const factors = [];
  // Divide out each candidate for as long as it divides n.
  return factors;
}
`,
    solution: `function primeFactors(n) {
  const factors = [];
  for (let d = 2; d * d <= n; d += d === 2 ? 1 : 2) {
    while (n % d === 0) {
      factors.push(d);
      n /= d;
    }
  }
  if (n > 1) factors.push(n);
  return factors;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Repeated primes",
      args: [360],
      expected: [2, 2, 2, 3, 3, 5],
      example: "360 is 2 × 2 × 2 × 3 × 3 × 5.",
    },
    {
      id: "example2",
      name: "A prime",
      args: [97],
      expected: [97],
      example: "A prime's only prime factor is itself.",
    },
    { id: "one", name: "One has no prime factors", args: [1], expected: [] },
    {
      id: "square",
      name: "A prime squared",
      description: "The second 7 is exactly at the square root.",
      args: [49],
      expected: [7, 7],
    },
    {
      id: "power-of-two",
      name: "Forty factors of 2",
      args: [1099511627776],
      pyExpected: "[2] * 40",
      jsExpected: "Array(40).fill(2)",
    },
    {
      id: "large-prime",
      name: "The largest prime below 10¹²",
      description:
        "Trying every divisor up to n takes 10¹² steps; stopping at the square root takes about 10⁶.",
      args: [999999999989],
      expected: [999999999989],
    },
    {
      id: "large-square",
      name: "A large prime squared",
      description: "999983 × 999983, where the last factor sits exactly at the square root.",
      args: [999966000289],
      expected: [999983, 999983],
    },
  ],
});

const MISSING_NUMBER = dualChallenge({
  slug: "missing-number",
  title: "The Missing Number",
  difficulty: "Beginner",
  topic: "Arithmetic series",
  description: "Find the one number missing from a shuffled run of 0 to n.",
  prompt: [
    "`nums` holds `n` distinct integers taken from the range `0` to `n` inclusive. That range has `n + 1` numbers, so exactly one of them is missing. Return it.",
    "The numbers arrive in no particular order, and the missing one can be at either end of the range: `0`, or `n` itself.",
  ],
  params: ["nums"],
  constraints: [
    "`1 ≤ n ≤ 2 × 10⁵`, where `n` is `len(nums)`",
    "Every value is distinct and between `0` and `n`",
  ],
  solutionNote:
    "The numbers `0` to `n` add up to `n * (n + 1) / 2`, so the missing one is that total minus the sum of the list: one pass and no extra memory. Checking each candidate with `in` or `includes` scans the whole list every time, which is quadratic and far too slow at 200,000 numbers.",
  python: {
    fn: "missing_number",
    signature: "def missing_number(nums: list[int]) -> int",
    starter: `def missing_number(nums: list[int]) -> int:
    # Compare what 0..n should add up to with what is actually here.
    return 0
`,
    solution: `def missing_number(nums: list[int]) -> int:
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)
`,
  },
  javascript: {
    fn: "missingNumber",
    signature: "function missingNumber(nums: number[]): number",
    starter: `function missingNumber(nums) {
  // Compare what 0..n should add up to with what is actually here.
  return 0;
}
`,
    solution: `function missingNumber(nums) {
  const n = nums.length;
  const total = nums.reduce((sum, x) => sum + x, 0);
  return (n * (n + 1)) / 2 - total;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A gap in the middle",
      args: [[3, 0, 1]],
      expected: 2,
      example: "n is 3, so the range is 0 to 3, and 2 is absent.",
    },
    {
      id: "example2",
      name: "The top of the range is missing",
      args: [[0, 1]],
      expected: 2,
      example: "The missing number can be n itself.",
    },
    { id: "zero", name: "Zero is missing", args: [[1]], expected: 0 },
    { id: "only-zero", name: "Only zero is present", args: [[0]], expected: 1 },
    {
      id: "shuffled",
      name: "A shuffled range",
      args: [[9, 6, 4, 2, 3, 5, 7, 0, 1]],
      expected: 8,
    },
    {
      id: "large",
      name: "Two hundred thousand numbers",
      description:
        "Checking each candidate against the whole list is quadratic and too slow here.",
      pyArgs: "[i for i in range(200000, -1, -1) if i != 123457]",
      jsArgs:
        "Array.from({ length: 200001 }, (_, i) => 200000 - i).filter((x) => x !== 123457)",
      expected: 123457,
    },
  ],
});

// ─── Digits and loops ────────────────────────────────────────────────

const HAPPY_NUMBERS = dualChallenge({
  slug: "happy-numbers",
  title: "Happy Numbers",
  difficulty: "Beginner",
  topic: "Cycle detection",
  description:
    "Decide whether summing squared digits over and over ever reaches 1.",
  prompt: [
    "Replace a positive integer with the sum of the squares of its digits, and repeat. A number is happy if this process reaches `1`. If it does not, it settles into a loop that goes round forever without touching `1`.",
    "Return whether `n` is happy. Your loop has to notice when a number comes round a second time, or it will never stop on an unhappy input.",
  ],
  params: ["n"],
  constraints: ["`1 ≤ n ≤ 2³¹ - 1`"],
  solutionNote:
    "Keep a set of the numbers already seen, and stop when the next one is `1` or is in the set. The sequence cannot grow without limit (a number with d digits maps to at most 81 × d), so it always either reaches `1` or repeats; Floyd's tortoise and hare finds the repeat without the set. A single digit other than `1` is not the end: 7 goes on to 49, 97, 130, 10 and then 1.",
  python: {
    fn: "is_happy",
    signature: "def is_happy(n: int) -> bool",
    starter: `def is_happy(n: int) -> bool:
    # Replace n with the sum of its squared digits until it hits 1 or repeats.
    return n == 1
`,
    solution: `def is_happy(n: int) -> bool:
    seen = set()
    while n != 1 and n not in seen:
        seen.add(n)
        n = sum(int(digit) ** 2 for digit in str(n))
    return n == 1
`,
  },
  javascript: {
    fn: "isHappy",
    signature: "function isHappy(n: number): boolean",
    starter: `function isHappy(n) {
  // Replace n with the sum of its squared digits until it hits 1 or repeats.
  return n === 1;
}
`,
    solution: `function isHappy(n) {
  const seen = new Set();
  while (n !== 1 && !seen.has(n)) {
    seen.add(n);
    n = [...String(n)].reduce((sum, digit) => sum + Number(digit) ** 2, 0);
  }
  return n === 1;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A happy number",
      args: [19],
      expected: true,
      example: "1 + 81 = 82, then 64 + 4 = 68, then 36 + 64 = 100, then 1.",
    },
    {
      id: "example2",
      name: "An unhappy number",
      args: [2],
      expected: false,
      example: "2, 4, 16, 37, 58, 89, 145, 42, 20, and back to 4 forever.",
    },
    { id: "one", name: "One is happy", args: [1], expected: true },
    {
      id: "seven",
      name: "A single digit that keeps going",
      description: "7 reaches 1 by way of 49, 97, 130 and 10.",
      args: [7],
      expected: true,
    },
    { id: "zeros", name: "Zero digits add nothing", args: [100], expected: true },
    { id: "ones", name: "Seven ones", args: [1111111], expected: true },
    {
      id: "largest",
      name: "The largest input",
      args: [2147483647],
      expected: false,
    },
  ],
});

const HUMAN_FILE_SIZE = dualChallenge({
  slug: "human-file-size",
  title: "Human-Readable File Sizes",
  difficulty: "Beginner",
  topic: "Unit scaling",
  description:
    "Format a byte count the way a file manager shows it, from B up to TB.",
  prompt: [
    "Format a file size given in bytes the way a file manager shows it. The units step up by 1024: `KB` is 1024 bytes, `MB` is 1024 KB, and then come `GB` and `TB`.",
    "Use the largest unit in which the size is at least 1, choosing it from the exact size before any rounding, and show the value with exactly one digit after the decimal point, as in `\"1.5 KB\"`. `TB` is the largest unit, so a size of 2048 TB is `\"2048.0 TB\"`.",
    "A size under 1024 bytes is a whole number already and is shown with no decimal, as in `\"512 B\"`. A single space always separates the number from the unit.",
  ],
  params: ["size"],
  constraints: [
    "`0 ≤ size ≤ 2⁵³ - 1`",
    "One digit after the decimal point for every unit except `B`",
    "No size in the tests lands exactly halfway between two one-decimal values, so any standard rounding gives the same answer",
  ],
  solutionNote:
    "Divide by 1024 while the value is at least 1024 and a bigger unit remains, then round once at the end with `f\"{value:.1f}\"` or `value.toFixed(1)`. A loop over a list of units keeps the 1024 boundary in one place instead of in a chain of `if`s, and bytes are a separate case because they never have a fraction.",
  python: {
    fn: "format_size",
    signature: "def format_size(size: int) -> str",
    starter: `def format_size(size: int) -> str:
    # Step up through KB, MB, GB and TB while the value is at least 1024.
    return f"{size} B"
`,
    solution: `UNITS = ["KB", "MB", "GB", "TB"]


def format_size(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    value = size / 1024
    unit = 0
    while value >= 1024 and unit < len(UNITS) - 1:
        value /= 1024
        unit += 1
    return f"{value:.1f} {UNITS[unit]}"
`,
  },
  javascript: {
    fn: "formatSize",
    signature: "function formatSize(size: number): string",
    starter: `function formatSize(size) {
  // Step up through KB, MB, GB and TB while the value is at least 1024.
  return \`\${size} B\`;
}
`,
    solution: `const UNITS = ["KB", "MB", "GB", "TB"];

function formatSize(size) {
  if (size < 1024) return \`\${size} B\`;
  let value = size / 1024;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return \`\${value.toFixed(1)} \${UNITS[unit]}\`;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Bytes",
      args: [512],
      expected: "512 B",
      example: "Under 1024 bytes: a whole number, no decimal.",
    },
    {
      id: "example2",
      name: "Kilobytes",
      args: [1536],
      expected: "1.5 KB",
      example: "1536 / 1024 = 1.5.",
    },
    { id: "zero", name: "An empty file", args: [0], expected: "0 B" },
    {
      id: "just-under",
      name: "The largest size still in bytes",
      args: [1023],
      expected: "1023 B",
    },
    {
      id: "one-kb",
      name: "Exactly one kilobyte keeps its decimal",
      args: [1024],
      expected: "1.0 KB",
    },
    {
      id: "megabytes",
      name: "Five million bytes",
      description: "4.77 MB, shown to one decimal place.",
      args: [5000000],
      expected: "4.8 MB",
    },
    {
      id: "carry",
      name: "Rounding carries into the whole part",
      description: "114.98 GB rounds to 115.0, and the decimal stays.",
      args: [123456789012],
      expected: "115.0 GB",
    },
    {
      id: "terabytes",
      name: "Past 1024 TB the unit stays TB",
      args: [1234567890123456],
      expected: "1122.8 TB",
    },
  ],
});

const DAY_OF_YEAR = dualChallenge({
  slug: "day-of-year",
  title: "Day of the Year",
  difficulty: "Beginner",
  topic: "Leap years",
  description:
    "Turn a calendar date into its day number within the year, leap years included.",
  prompt: [
    "Given a date written as `\"YYYY-MM-DD\"`, return which day of its year it is: January 1st is day `1`, and December 31st is day `365`, or `366` in a leap year.",
    "Use the Gregorian rules. A year is a leap year when it is divisible by 4, except that a year divisible by 100 is not, except that a year divisible by 400 is. So 2024 and 2000 are leap years, and 1900 is not.",
  ],
  params: ["date"],
  constraints: [
    "Every date is a real calendar date",
    "`1600 ≤ year ≤ 9999`, with the month and day always two digits",
  ],
  solutionNote:
    "Add up the lengths of the months before this one, add the day, and add one more when the date is past February in a leap year. The leap test is `year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)`: checking divisibility by 4 alone gets 1900 wrong, and the century rule is what trips most hand-written date code. In real Python code, `date.fromisoformat(s).timetuple().tm_yday` does the whole job.",
  python: {
    fn: "day_of_year",
    signature: "def day_of_year(date: str) -> int",
    starter: `def day_of_year(date: str) -> int:
    year, month, day = map(int, date.split("-"))
    # Add the days in every month before this one.
    return day
`,
    solution: `DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


def is_leap(year: int) -> bool:
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def day_of_year(date: str) -> int:
    year, month, day = map(int, date.split("-"))
    days = sum(DAYS_IN_MONTH[: month - 1]) + day
    if month > 2 and is_leap(year):
        days += 1
    return days
`,
  },
  javascript: {
    fn: "dayOfYear",
    signature: "function dayOfYear(date: string): number",
    starter: `function dayOfYear(date) {
  const [year, month, day] = date.split("-").map(Number);
  // Add the days in every month before this one.
  return day;
}
`,
    solution: `const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const isLeap = (year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

function dayOfYear(date) {
  const [year, month, day] = date.split("-").map(Number);
  const before = DAYS_IN_MONTH.slice(0, month - 1).reduce((sum, d) => sum + d, 0);
  return before + day + (month > 2 && isLeap(year) ? 1 : 0);
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "March 1st in a leap year",
      args: ["2024-03-01"],
      expected: 61,
      example: "31 days of January, 29 of February (2024 is a leap year), then day 1.",
    },
    {
      id: "example2",
      name: "March 1st in a common year",
      args: ["2023-03-01"],
      expected: 60,
      example: "February has 28 days in 2023.",
    },
    { id: "first", name: "New Year's Day", args: ["2024-01-01"], expected: 1 },
    { id: "leap-day", name: "The leap day itself", args: ["2024-02-29"], expected: 60 },
    {
      id: "last-leap",
      name: "The last day of a leap year",
      args: ["2024-12-31"],
      expected: 366,
    },
    {
      id: "last-common",
      name: "The last day of a common year",
      args: ["2023-12-31"],
      expected: 365,
    },
    {
      id: "century",
      name: "A century year that is not a leap year",
      description: "1900 is divisible by 100 but not by 400.",
      args: ["1900-03-01"],
      expected: 60,
    },
    {
      id: "four-hundred",
      name: "A century year that is a leap year",
      description: "2000 is divisible by 400.",
      args: ["2000-03-01"],
      expected: 61,
    },
  ],
});

const PASCAL_ROW = dualChallenge({
  slug: "pascal-row",
  title: "Pascal's Triangle Row",
  difficulty: "Beginner",
  topic: "Building from the previous row",
  description: "Return one row of Pascal's triangle, exactly, up to row 50.",
  prompt: [
    "Return row `n` of Pascal's triangle, counting from row `0`, which is `[1]`. Each row starts and ends with `1`, and every other entry is the sum of the two entries above it in the previous row.",
    "Row `n` holds `n + 1` numbers, and they grow quickly: the middle of row 50 is 126,410,606,437,752. Every entry must be exact.",
  ],
  params: ["n"],
  constraints: [
    "`0 ≤ n ≤ 50`",
    "Every entry is below `2⁵³`, so it is exact in a JavaScript number",
  ],
  solutionNote:
    "Start from `[1]` and build each row from the one before, adding neighbouring pairs and putting a `1` on each end: about n²/2 additions in all, every one exact. Computing entries as `n! / (k! (n - k)!)` breaks in JavaScript from row 23 onwards, since the factorials pass 2⁵³ and stop being exact, and recursing on the definition without saving results makes over 10¹⁴ calls for the middle of row 50.",
  python: {
    fn: "pascal_row",
    signature: "def pascal_row(n: int) -> list[int]",
    starter: `def pascal_row(n: int) -> list[int]:
    row = [1]
    # Build each row from the one before it, n times.
    return row
`,
    solution: `def pascal_row(n: int) -> list[int]:
    row = [1]
    for _ in range(n):
        row = [1] + [a + b for a, b in zip(row, row[1:])] + [1]
    return row
`,
  },
  javascript: {
    fn: "pascalRow",
    signature: "function pascalRow(n: number): number[]",
    starter: `function pascalRow(n) {
  let row = [1];
  // Build each row from the one before it, n times.
  return row;
}
`,
    solution: `function pascalRow(n) {
  let row = [1];
  for (let i = 0; i < n; i++) {
    row = [1, ...row.slice(1).map((x, j) => x + row[j]), 1];
  }
  return row;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Row 4",
      args: [4],
      expected: [1, 4, 6, 4, 1],
      example: "Row 3 is [1, 3, 3, 1]; its neighbours sum to 4, 6 and 4.",
    },
    {
      id: "example2",
      name: "Row 0",
      args: [0],
      expected: [1],
      example: "The top of the triangle.",
    },
    { id: "one", name: "Row 1", args: [1], expected: [1, 1] },
    { id: "five", name: "Row 5", args: [5], expected: [1, 5, 10, 10, 5, 1] },
    {
      id: "ten",
      name: "Row 10",
      args: [10],
      expected: [1, 10, 45, 120, 210, 252, 210, 120, 45, 10, 1],
    },
    {
      id: "fifty",
      name: "Row 50",
      description:
        "The middle entry is 126410606437752. Factorials lose precision here, and plain recursion never finishes.",
      args: [50],
      expected: [
        1, 50, 1225, 19600, 230300, 2118760, 15890700, 99884400, 536878650,
        2505433700, 10272278170, 37353738800, 121399651100, 354860518600,
        937845656300, 2250829575120, 4923689695575, 9847379391150,
        18053528883775, 30405943383200, 47129212243960, 67327446062800,
        88749815264600, 108043253365600, 121548660036300, 126410606437752,
        121548660036300, 108043253365600, 88749815264600, 67327446062800,
        47129212243960, 30405943383200, 18053528883775, 9847379391150,
        4923689695575, 2250829575120, 937845656300, 354860518600,
        121399651100, 37353738800, 10272278170, 2505433700, 536878650,
        99884400, 15890700, 2118760, 230300, 19600, 1225, 50, 1,
      ],
    },
  ],
});

// ─── Bits and bases ──────────────────────────────────────────────────

const UNPAIRED_NUMBER = dualChallenge({
  slug: "unpaired-number",
  title: "The Unpaired Number",
  difficulty: "Intermediate",
  topic: "XOR",
  description:
    "Find the one value in a list that appears once when every other appears twice.",
  prompt: [
    "Every value in `nums` appears exactly twice, except one value that appears only once. Return that value.",
    "The two copies of a value are not necessarily next to each other, values can be negative or zero, and the list can hold 200,001 numbers. Leave `nums` unchanged. There is an answer that makes one pass and needs no extra memory at all.",
  ],
  params: ["nums"],
  constraints: [
    "`1 ≤ len(nums) ≤ 200001`, and the length is odd",
    "`-10⁹ ≤ nums[i] ≤ 10⁹`, so every value fits in a 32-bit signed integer",
    "Leave `nums` unchanged",
  ],
  solutionNote:
    "XOR every value together: `x ^ x` is `0`, `x ^ 0` is `x`, and the order does not matter, so each pair cancels wherever its two copies sit and only the unpaired value survives. A set of values seen an odd number of times also works in one pass, but can hold half the list at once, and counting each value with `nums.count` is quadratic and far too slow at this size.",
  python: {
    fn: "find_unpaired",
    signature: "def find_unpaired(nums: list[int]) -> int",
    starter: `def find_unpaired(nums: list[int]) -> int:
    # Find a way for each pair to cancel itself out.
    return 0
`,
    solution: `from functools import reduce
from operator import xor


def find_unpaired(nums: list[int]) -> int:
    return reduce(xor, nums, 0)
`,
  },
  javascript: {
    fn: "findUnpaired",
    signature: "function findUnpaired(nums: number[]): number",
    starter: `function findUnpaired(nums) {
  // Find a way for each pair to cancel itself out.
  return 0;
}
`,
    solution: `function findUnpaired(nums) {
  return nums.reduce((acc, x) => acc ^ x, 0);
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "One value without a partner",
      args: [[4, 1, 2, 1, 2]],
      expected: 4,
      example: "1 and 2 each appear twice; 4 appears once.",
    },
    {
      id: "example2",
      name: "A negative unpaired value",
      args: [[5, -3, 5]],
      expected: -3,
      example: "Negative values cancel the same way.",
    },
    { id: "single", name: "A single value", args: [[7]], expected: 7 },
    { id: "zero", name: "Zero is the unpaired value", args: [[0, 9, 9]], expected: 0 },
    {
      id: "scattered",
      name: "Pairs far apart",
      args: [[2, 3, 5, 3, 2]],
      expected: 5,
    },
    {
      id: "unchanged",
      name: "Leaves the list unchanged",
      description: "Sorting the list in place to pair up neighbours changes the caller's data.",
      args: [[8, -1, 3, -1, 8]],
      expected: 3,
      noMutation: true,
    },
    {
      id: "large",
      name: "Two hundred thousand and one values",
      description: "Counting each value across the whole list is quadratic and too slow here.",
      pyArgs: "[*range(1, 100001), *range(100000, 0, -1), 123456789]",
      jsArgs:
        "[...Array.from({ length: 100000 }, (_, i) => i + 1), ...Array.from({ length: 100000 }, (_, i) => 100000 - i), 123456789]",
      expected: 123456789,
    },
  ],
});

const INTEGER_SQUARE_ROOT = dualChallenge({
  slug: "integer-square-root",
  title: "Integer Square Root",
  difficulty: "Intermediate",
  topic: "Binary search on the answer",
  description:
    "Find the whole-number square root exactly, where floating point runs out of precision.",
  prompt: [
    "Return the integer square root of `n`: the largest integer `r` with `r * r ≤ n`, which is `floor(sqrt(n))`.",
    "`n` goes up to `2⁵³ - 1`, the largest integer a JavaScript number holds exactly. Near the top of that range a floating-point square root can round up across a whole number, so taking the floor of `sqrt(n)` is off by one for some inputs. Python's `math.isqrt` does this job; write it yourself, using only integer arithmetic.",
  ],
  params: ["n"],
  constraints: [
    "`0 ≤ n ≤ 2⁵³ - 1` (9,007,199,254,740,991)",
    "Do not trust a floating-point square root to be exact",
  ],
  solutionNote:
    "`r * r ≤ n` holds for every `r` up to the answer and fails for every `r` after it, so a binary search over `0` to `n` finds the boundary in about 53 steps using only exact integer comparisons. `Math.floor(Math.sqrt(n))` and `int(n ** 0.5)` are right for most inputs and wrong just below large perfect squares, where the true root is closer to the next integer than a double can tell apart.",
  python: {
    fn: "integer_sqrt",
    signature: "def integer_sqrt(n: int) -> int",
    starter: `def integer_sqrt(n: int) -> int:
    lo, hi = 0, n
    # Narrow [lo, hi] until it holds only the answer.
    return lo
`,
    solution: `def integer_sqrt(n: int) -> int:
    lo, hi = 0, n
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if mid * mid <= n:
            lo = mid
        else:
            hi = mid - 1
    return lo
`,
  },
  javascript: {
    fn: "integerSqrt",
    signature: "function integerSqrt(n: number): number",
    starter: `function integerSqrt(n) {
  let lo = 0;
  let hi = n;
  // Narrow [lo, hi] until it holds only the answer.
  return lo;
}
`,
    solution: `function integerSqrt(n) {
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = lo + Math.ceil((hi - lo) / 2);
    // mid * mid is inexact only above 2^53, where it is far above n anyway.
    if (mid * mid <= n) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Between two squares",
      args: [17],
      expected: 4,
      example: "4 × 4 = 16 fits under 17; 5 × 5 = 25 does not.",
    },
    {
      id: "example2",
      name: "A perfect square",
      args: [16],
      expected: 4,
      example: "A perfect square returns its exact root.",
    },
    { id: "zero", name: "Zero", args: [0], expected: 0 },
    { id: "one", name: "One", args: [1], expected: 1 },
    { id: "quadrillion", name: "10¹⁵", args: [1000000000000000], expected: 31622776 },
    {
      id: "top-square",
      name: "A perfect square near the top",
      description: "94906265 × 94906265.",
      args: [9007199136250225],
      expected: 94906265,
    },
    {
      id: "below-top-square",
      name: "One below a large perfect square",
      description:
        "A floating-point square root rounds up to 94906265 here, but 94906265 squared is larger than n.",
      args: [9007199136250224],
      expected: 94906264,
    },
    {
      id: "max",
      name: "The largest safe integer",
      args: [9007199254740991],
      expected: 94906265,
    },
  ],
});

const CONVERT_BASE = dualChallenge({
  slug: "convert-base",
  title: "Convert Between Bases",
  difficulty: "Intermediate",
  topic: "Positional notation",
  description:
    "Rewrite a number from one base to another, anywhere from binary to base 36.",
  prompt: [
    "`digits` is a whole number written in base `from_base`. Return the same number written in base `to_base`.",
    "Both bases are between 2 and 36. Digits above 9 are the uppercase letters `A` to `Z`, so base 16 uses `0` to `9` and `A` to `F`, and base 36 uses every letter. A negative number has a single leading `-`, which the answer keeps.",
    "The input may carry leading zeros; the answer never does, and zero is always `\"0\"`. If `digits` holds a character that is not a digit of `from_base`, such as a `2` in binary, raise an error (`ValueError` in Python, any `Error` in JavaScript).",
  ],
  params: ["digits", "from_base", "to_base"],
  constraints: [
    "`2 ≤ from_base, to_base ≤ 36`",
    "The value lies within `±(2⁵³ - 1)`, so it is exact in a JavaScript number",
    "`digits` has at least one character after any leading `-`",
    "Letters are uppercase, in the input and in the answer",
  ],
  solutionNote:
    "Read the digits left to right with `value = value * from_base + digit`, checking that each digit is below the base, then write the value back out by repeatedly taking `value % to_base` as the next digit from the right (JavaScript's `value.toString(toBase)` does this half for you); zero needs its own case, because that loop never runs for it. Do not hand the reading to `parseInt`: `parseInt(\"12\", 2)` stops quietly at the `2` and returns `1` instead of failing.",
  python: {
    fn: "convert_base",
    signature: "def convert_base(digits: str, from_base: int, to_base: int) -> str",
    starter: `DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def convert_base(digits: str, from_base: int, to_base: int) -> str:
    # Read the digits into a number, then write that number in the new base.
    return digits
`,
    solution: `DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def convert_base(digits: str, from_base: int, to_base: int) -> str:
    negative = digits.startswith("-")
    value = 0
    for ch in digits[1:] if negative else digits:
        d = DIGITS.find(ch)
        if not 0 <= d < from_base:
            raise ValueError(f"{ch!r} is not a base-{from_base} digit")
        value = value * from_base + d
    if value == 0:
        return "0"
    out = []
    while value:
        value, d = divmod(value, to_base)
        out.append(DIGITS[d])
    return ("-" if negative else "") + "".join(reversed(out))
`,
  },
  javascript: {
    fn: "convertBase",
    signature: "function convertBase(digits: string, fromBase: number, toBase: number): string",
    starter: `const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function convertBase(digits, fromBase, toBase) {
  // Read the digits into a number, then write that number in the new base.
  return digits;
}
`,
    solution: `const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function convertBase(digits, fromBase, toBase) {
  const negative = digits.startsWith("-");
  let value = 0;
  for (const ch of negative ? digits.slice(1) : digits) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= fromBase) {
      throw new Error(\`"\${ch}" is not a base-\${fromBase} digit\`);
    }
    value = value * fromBase + d;
  }
  if (value === 0) return "0";
  return (negative ? "-" : "") + value.toString(toBase).toUpperCase();
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Decimal to hexadecimal",
      args: ["255", 10, 16],
      expected: "FF",
      example: "255 is 15 × 16 + 15, and 15 is the digit F.",
    },
    {
      id: "example2",
      name: "A negative binary number to octal",
      args: ["-1010", 2, 8],
      expected: "-12",
      example: "Binary 1010 is ten, which is 12 in octal; the sign carries over.",
    },
    { id: "zero", name: "Zero stays zero", args: ["0", 7, 3], expected: "0" },
    {
      id: "leading-zeros",
      name: "Leading zeros are dropped",
      args: ["000Z", 36, 10],
      expected: "35",
    },
    {
      id: "max",
      name: "The largest safe integer to base 36",
      args: ["9007199254740991", 10, 36],
      expected: "2GOSA7PA2GV",
    },
    {
      id: "negative-max",
      name: "The most negative value, base 36 to base 16",
      args: ["-2GOSA7PA2GV", 36, 16],
      expected: "-1FFFFFFFFFFFFF",
    },
    {
      id: "invalid",
      name: "A digit the base does not have",
      description: "2 is not a binary digit, so this must raise rather than stop early and return 1.",
      args: ["12", 2, 10],
      throws: { py: "ValueError" },
    },
  ],
});

const SPREADSHEET_COLUMNS = dualChallenge({
  slug: "spreadsheet-columns",
  title: "Spreadsheet Column Names",
  difficulty: "Intermediate",
  topic: "Bijective base 26",
  description:
    "Turn a column number into its spreadsheet letters: A to Z, then AA onwards.",
  prompt: [
    "Spreadsheets label their columns `A` to `Z`, then `AA`, `AB` and so on up to `ZZ`, then `AAA`. Given a column number `n`, counting from `1` for `A`, return its label.",
    "It looks like base 26 with letters for digits, but there is no zero digit: the letters stand for 1 to 26. A plain base-26 conversion has a digit for zero and none for 26, so it goes wrong at every multiple of 26.",
  ],
  params: ["n"],
  constraints: ["`1 ≤ n ≤ 2⁵³ - 1`", "Uppercase letters only"],
  solutionNote:
    "Subtract one before each step: `(n - 1) % 26` runs from 0 to 25 and maps straight onto `A` to `Z`, and `(n - 1) // 26` is the column number for the letters to its left. Without the shift, 26 comes out as `A` followed by a letter for zero, because a plain base-26 remainder of 0 has nowhere to go.",
  python: {
    fn: "column_name",
    signature: "def column_name(n: int) -> str",
    starter: `def column_name(n: int) -> str:
    # Peel off one letter at a time, starting from the right.
    return "A"
`,
    solution: `def column_name(n: int) -> str:
    letters = []
    while n > 0:
        n, r = divmod(n - 1, 26)
        letters.append(chr(ord("A") + r))
    return "".join(reversed(letters))
`,
  },
  javascript: {
    fn: "columnName",
    signature: "function columnName(n: number): string",
    starter: `function columnName(n) {
  // Peel off one letter at a time, starting from the right.
  return "A";
}
`,
    solution: `function columnName(n) {
  let name = "";
  while (n > 0) {
    n -= 1;
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26);
  }
  return name;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "The last single letter",
      args: [26],
      expected: "Z",
      example: "There is no zero digit, so 26 is Z on its own.",
    },
    {
      id: "example2",
      name: "The first double letter",
      args: [27],
      expected: "AA",
      example: "One full run of 26 letters, then one more.",
    },
    { id: "first", name: "The first column", args: [1], expected: "A" },
    {
      id: "multiple",
      name: "A multiple of 26 in two letters",
      args: [52],
      expected: "AZ",
    },
    { id: "zz", name: "The last double letter", args: [702], expected: "ZZ" },
    { id: "aaa", name: "The first triple letter", args: [703], expected: "AAA" },
    { id: "wide-sheet", name: "Column 16,384", args: [16384], expected: "XFD" },
    {
      id: "max",
      name: "The largest safe integer",
      args: [9007199254740991],
      expected: "BKTXHSOGHKKE",
    },
  ],
});

// ─── Money and order statistics ──────────────────────────────────────

const SPLIT_THE_BILL = dualChallenge({
  slug: "split-the-bill",
  title: "Split a Bill Fairly",
  difficulty: "Intermediate",
  topic: "Integer cents",
  description:
    "Divide a total in cents between people so the shares add up to the exact total.",
  prompt: [
    "Split a bill of `total_cents` cents between `people` people. Return one share per person, in cents, such that the shares add up to exactly `total_cents`, no two shares differ by more than one cent, and the larger shares come first. Those three rules leave only one possible answer.",
    "The total can be negative, for a refund, and the same rules hold. Larger still means numerically larger, so -1000 split three ways is `[-333, -333, -334]`.",
  ],
  params: ["total_cents", "people"],
  constraints: [
    "`1 ≤ people ≤ 10⁴`",
    "`-10¹² ≤ total_cents ≤ 10¹²`",
    "Work in whole cents: every share is an integer",
  ],
  solutionNote:
    "Floor-divide once: every share starts at `total // people`, and the remainder, which is between `0` and `people - 1` when the division rounds down, is how many people pay one cent more. Rounding each share of `total / people` separately breaks the sum, and for a negative total JavaScript's `%` and `Math.trunc` round toward zero, so take `Math.floor(total / people)` and work the remainder out from that.",
  python: {
    fn: "split_bill",
    signature: "def split_bill(total_cents: int, people: int) -> list[int]",
    starter: `def split_bill(total_cents: int, people: int) -> list[int]:
    # Give everyone the same share, then hand out the cents left over.
    return [total_cents // people] * people
`,
    solution: `def split_bill(total_cents: int, people: int) -> list[int]:
    share, extra = divmod(total_cents, people)
    return [share + 1] * extra + [share] * (people - extra)
`,
  },
  javascript: {
    fn: "splitBill",
    signature: "function splitBill(totalCents: number, people: number): number[]",
    starter: `function splitBill(totalCents, people) {
  // Give everyone the same share, then hand out the cents left over.
  return Array(people).fill(Math.floor(totalCents / people));
}
`,
    solution: `function splitBill(totalCents, people) {
  const share = Math.floor(totalCents / people);
  const extra = totalCents - share * people;
  return Array.from({ length: people }, (_, i) => (i < extra ? share + 1 : share));
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "One cent left over",
      args: [1000, 3],
      expected: [334, 333, 333],
      example: "333 each leaves one cent, which goes to the first share.",
    },
    {
      id: "example2",
      name: "Fewer cents than people",
      args: [2, 5],
      expected: [1, 1, 0, 0, 0],
      example: "Two people pay a cent and three pay nothing.",
    },
    { id: "even", name: "An even split", args: [1000, 4], expected: [250, 250, 250, 250] },
    { id: "zero", name: "Nothing to pay", args: [0, 3], expected: [0, 0, 0] },
    { id: "alone", name: "One person pays it all", args: [9999, 1], expected: [9999] },
    {
      id: "five-over",
      name: "Several cents left over",
      args: [10001, 7],
      expected: [1429, 1429, 1429, 1429, 1429, 1428, 1428],
    },
    {
      id: "refund",
      name: "A negative total",
      description:
        "Rounding toward zero gives -333 three times, which adds up to -999, not -1000.",
      args: [-1000, 3],
      expected: [-333, -333, -334],
    },
  ],
});

const COUNT_PRIMES_BELOW = dualChallenge({
  slug: "count-primes-below",
  title: "Count Primes Below n",
  difficulty: "Intermediate",
  topic: "Sieve of Eratosthenes",
  description: "Count the primes below a limit of up to five million, quickly.",
  prompt: [
    "Return how many prime numbers are strictly less than `n`.",
    "`n` goes up to 5,000,000, so testing each number for divisors on its own is too slow. Instead, work out which numbers are composite for the whole range at once.",
  ],
  params: ["n"],
  constraints: [
    "`0 ≤ n ≤ 5 × 10⁶`",
    "Only primes strictly below `n` count, so `n` itself never does",
  ],
  solutionNote:
    "The sieve of Eratosthenes crosses out composites instead of testing primes: for each `p` still unmarked, mark `p * p`, `p * p + p` and so on up to `n`, then count what is left. Starting at `p * p` is safe because every smaller multiple of `p` has a smaller prime factor that already crossed it out, and a `bytearray` in Python or a `Uint8Array` in JavaScript keeps five million flags compact and fast.",
  python: {
    fn: "count_primes",
    signature: "def count_primes(n: int) -> int",
    starter: `def count_primes(n: int) -> int:
    # Cross out the multiples of each prime, then count what is left.
    return 0
`,
    solution: `from math import isqrt


def count_primes(n: int) -> int:
    if n < 3:
        return 0
    is_prime = bytearray([1]) * n
    is_prime[0] = is_prime[1] = 0
    for p in range(2, isqrt(n - 1) + 1):
        if is_prime[p]:
            is_prime[p * p :: p] = bytes(len(range(p * p, n, p)))
    return is_prime.count(1)
`,
  },
  javascript: {
    fn: "countPrimes",
    signature: "function countPrimes(n: number): number",
    starter: `function countPrimes(n) {
  // Cross out the multiples of each prime, then count what is left.
  return 0;
}
`,
    solution: `function countPrimes(n) {
  if (n < 3) return 0;
  const composite = new Uint8Array(n);
  let count = 0;
  for (let p = 2; p < n; p++) {
    if (composite[p]) continue;
    count++;
    for (let q = p * p; q < n; q += p) composite[q] = 1;
  }
  return count;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Primes below 10",
      args: [10],
      expected: 4,
      example: "2, 3, 5 and 7.",
    },
    {
      id: "example2",
      name: "A prime limit is not counted",
      args: [11],
      expected: 4,
      example: "11 is prime, but it is not below 11.",
    },
    { id: "below-two", name: "Nothing below 2", args: [2], expected: 0 },
    { id: "three", name: "Just the 2", args: [3], expected: 1 },
    { id: "hundred", name: "Primes below 100", args: [100], expected: 25 },
    { id: "million", name: "Primes below a million", args: [1000000], expected: 78498 },
    {
      id: "five-million",
      name: "Primes below five million",
      description: "Testing each number for divisors takes seconds here; a sieve takes a fraction of a second.",
      args: [5000000],
      expected: 348513,
    },
  ],
});

const NEAREST_RANK_PERCENTILE = dualChallenge({
  slug: "nearest-rank-percentile",
  title: "Nearest-Rank Percentile",
  difficulty: "Intermediate",
  topic: "Order statistics",
  description:
    "Pick the value at a given percentile, the way a latency report computes p50 and p95.",
  prompt: [
    "Return the `p`th percentile of `values` by the nearest-rank method: sort the values and take the one at rank `ceil(p / 100 × n)`, where `n` is the number of values and ranks count from 1.",
    "The answer is always one of the values, never an average of two. `p` is a whole number from 1 to 100, so the 100th percentile is the largest value. An empty list has no percentile: return `None` in Python and `null` in JavaScript. Leave `values` unchanged.",
  ],
  params: ["values", "p"],
  constraints: [
    "`0 ≤ len(values) ≤ 10⁵`",
    "`1 ≤ p ≤ 100`, an integer",
    "Values are numbers, in any order, and may repeat",
  ],
  solutionNote:
    "Compute the rank from the whole number `p * n`: `(p * n + 99) // 100` in Python, or `Math.ceil(p * n / 100)` in JavaScript, which rounds correctly because it makes a single division of an exact integer. `p / 100 * n` looks the same but goes through a fraction such as `0.07`, which floating point cannot hold exactly: `7 / 100 * 100` is `7.000000000000001`, which rounds up to rank 8. Sort a copy with `sorted(values)` or `[...values].sort((a, b) => a - b)`, since JavaScript's default sort compares numbers as text.",
  python: {
    fn: "percentile",
    signature: "def percentile(values: list[float], p: int) -> float | None",
    starter: `def percentile(values: list[float], p: int) -> float | None:
    # Sort a copy, then pick the value at the nearest rank.
    return None
`,
    solution: `def percentile(values: list[float], p: int) -> float | None:
    if not values:
        return None
    rank = (p * len(values) + 99) // 100
    return sorted(values)[rank - 1]
`,
  },
  javascript: {
    fn: "percentile",
    signature: "function percentile(values: number[], p: number): number | null",
    starter: `function percentile(values, p) {
  // Sort a copy, then pick the value at the nearest rank.
  return null;
}
`,
    solution: `function percentile(values, p) {
  if (values.length === 0) return null;
  const rank = Math.ceil((p * values.length) / 100);
  return [...values].sort((a, b) => a - b)[rank - 1];
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "The 30th percentile of five values",
      args: [[15, 20, 35, 40, 50], 30],
      expected: 20,
      example: "Rank ceil(0.3 × 5) = 2, the second smallest.",
    },
    {
      id: "example2",
      name: "No values",
      args: [[], 50],
      expected: null,
      example: "An empty list has no percentile.",
    },
    {
      id: "hundredth",
      name: "The 100th percentile is the maximum",
      args: [[15, 20, 35, 40, 50], 100],
      expected: 50,
    },
    { id: "single", name: "A single value", args: [[7], 1], expected: 7 },
    {
      id: "unsorted",
      name: "Unsorted values with repeats",
      description: "Sort a copy: the caller's list must come back unchanged.",
      args: [[3, 1, 4, 1, 5, 9, 2, 6, 5, 3], 50],
      expected: 3,
      noMutation: true,
    },
    {
      id: "numeric-sort",
      name: "Values of different lengths",
      description: "Sorted as numbers, 9 comes before 25 and 100; sorted as text, it comes last.",
      args: [[100, 9, 25, 3], 50],
      expected: 9,
    },
    {
      id: "float-rank",
      name: "The 7th percentile of 100 values",
      description:
        "7 / 100 × 100 is 7.000000000000001 in floating point, which rounds up to rank 8.",
      pyArgs: "list(range(100, 0, -1)), 7",
      jsArgs: "Array.from({ length: 100 }, (_, i) => 100 - i), 7",
      expected: 7,
    },
    {
      id: "decimals",
      name: "Decimal values",
      args: [[0.5, 2.25, 1.75], 50],
      expected: 1.75,
    },
  ],
});

// ─── Modular arithmetic ──────────────────────────────────────────────

const MODULAR_POWER = dualChallenge({
  slug: "modular-power",
  title: "Modular Exponentiation",
  difficulty: "Advanced",
  topic: "Exponentiation by squaring",
  description:
    "Raise a number to a power of up to 10¹⁵ modulo m, in about fifty steps.",
  prompt: [
    "Return `base` raised to the power `exp`, modulo `m`: the remainder when `base` to the power `exp` is divided by `m`.",
    "`exp` can be as large as 10¹⁵, which rules out multiplying by `base` once per unit of the exponent, and also rules out computing the full power first: it can run to quadrillions of digits.",
    "Keep every intermediate value below `m`, so that every product stays below `m²`. With `m` at most 10⁷, that keeps each product under 10¹⁴, exact in a JavaScript number.",
  ],
  params: ["base", "exp", "m"],
  constraints: [
    "`0 ≤ base ≤ 10¹²`",
    "`0 ≤ exp ≤ 10¹⁵`",
    "`1 ≤ m ≤ 10⁷`",
    "Any number to the power `0` is `1`, but everything is `0` modulo `1`",
  ],
  solutionNote:
    "Square and multiply: reduce `base` modulo `m` first, then walk the bits of `exp` from the lowest, squaring `base` at every step and multiplying it into the result when the bit is set, reducing modulo `m` after each product; that is about 50 steps for an exponent of 10¹⁵. In JavaScript, halve with `Math.floor(exp / 2)` rather than `exp >> 1`, because bitwise operators cut numbers to 32 bits. In Python, the built-in three-argument `pow(base, exp, m)` does all of this and is what real code should call.",
  python: {
    fn: "mod_pow",
    signature: "def mod_pow(base: int, exp: int, m: int) -> int",
    starter: `def mod_pow(base: int, exp: int, m: int) -> int:
    result = 1 % m
    # Square the base and halve the exponent on each pass.
    return result
`,
    solution: `def mod_pow(base: int, exp: int, m: int) -> int:
    result = 1 % m
    base %= m
    while exp > 0:
        if exp & 1:
            result = result * base % m
        base = base * base % m
        exp >>= 1
    return result
`,
  },
  javascript: {
    fn: "modPow",
    signature: "function modPow(base: number, exp: number, m: number): number",
    starter: `function modPow(base, exp, m) {
  let result = 1 % m;
  // Square the base and halve the exponent on each pass.
  return result;
}
`,
    solution: `function modPow(base, exp, m) {
  let result = 1 % m;
  base %= m;
  while (exp > 0) {
    if (exp % 2 === 1) result = (result * base) % m;
    base = (base * base) % m;
    exp = Math.floor(exp / 2);
  }
  return result;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A small power",
      args: [2, 10, 1000],
      expected: 24,
      example: "2 to the 10th is 1024, which leaves 24.",
    },
    {
      id: "example2",
      name: "A repeating pattern",
      args: [3, 200, 13],
      expected: 9,
      example: "27 leaves 1 modulo 13, so 3 to the 200th leaves the same as 3 × 3.",
    },
    { id: "zero-exp", name: "An exponent of zero", args: [7, 0, 13], expected: 1 },
    {
      id: "mod-one",
      name: "Modulo 1",
      description: "Even an exponent of zero gives 0 here.",
      args: [7, 0, 1],
      expected: 0,
    },
    {
      id: "big-base",
      name: "A base far larger than m",
      description: "Reduce the base first: 10¹² squared is far past exact integers in JavaScript.",
      args: [1000000000000, 3, 9999991],
      expected: 590490,
    },
    {
      id: "huge-exp",
      name: "An exponent of 10¹⁵",
      description: "One multiplication per unit of the exponent would take years.",
      args: [123456789, 1000000000000000, 9999991],
      expected: 3601003,
    },
    {
      id: "past-32-bits",
      name: "An odd exponent past 32 bits",
      description: "Halving with a bitwise shift would cut this exponent to 32 bits.",
      args: [2, 999999999999999, 10000000],
      expected: 3554688,
    },
  ],
});

export const CODE_NUMBERS: Challenge[] = [
  LCM_OF_LIST,
  PRIME_FACTORS,
  MISSING_NUMBER,
  HAPPY_NUMBERS,
  HUMAN_FILE_SIZE,
  DAY_OF_YEAR,
  PASCAL_ROW,
  UNPAIRED_NUMBER,
  INTEGER_SQUARE_ROOT,
  CONVERT_BASE,
  SPREADSHEET_COLUMNS,
  SPLIT_THE_BILL,
  COUNT_PRIMES_BELOW,
  NEAREST_RANK_PERCENTILE,
  MODULAR_POWER,
];
