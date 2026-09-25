/**
 * The challenge workspace's editor highlighter.
 *
 * Deliberately not Shiki. The design colors tokens against the brand ramp
 * (keywords `--ds-purple-700`, builtins/functions `--ds-blue-700`, strings
 * `--ds-green-800`, numbers `--ds-orange-700`) rather than any published
 * theme, and the editor shows short authored snippets, not arbitrary user
 * code. A keyword-table tokenizer reproduces the mockup exactly in a few
 * dozen lines and adds nothing to the route's bundle.
 *
 * Replacing the fixtures with a real editor means dropping this for the
 * CodeMirror setup in `challengeShared`, which brings its own highlighting.
 */

import type { CodeLanguage } from "@/lib/challenges/types";

export type TokenKind =
  | "plain"
  | "keyword"
  | "builtin"
  | "string"
  | "number"
  | "comment";

export interface Token {
  kind: TokenKind;
  text: string;
}

/** One source line, already split into tokens. Blank lines yield `[]`. */
export type HighlightedLine = Token[];

interface Grammar {
  keywords: Set<string>;
  builtins: Set<string>;
  /**
   * Bare literals (`nil`, `True`, `null`). They read as values rather than
   * control flow, so the prototypes color them like numbers, not keywords.
   */
  literals: Set<string>;
  /** Multi-word keywords, matched before single words. */
  phrases: string[];
  lineComment?: string;
  /** Quote characters that open a string literal. */
  quotes: string[];
}

const words = (s: string) => new Set(s.split(/\s+/));

/**
 * JavaScript and TypeScript share a grammar: the keyword sets differ only in
 * type syntax, which the reference solutions do not use.
 */
const JS_GRAMMAR: Grammar = {
  keywords: words(`function const let var return for of in if else while
    new class extends import export from default typeof instanceof await
    async try catch finally throw delete this interface type`),
  // Constructors and globals only: chained array methods (.sort, .slice,
  // .map) stay in the body color, as the prototypes had them.
  builtins: words(`Map Set Array Object JSON Math Number String Boolean
    Promise console`),
  literals: words("null undefined true false"),
  phrases: [],
  lineComment: "//",
  quotes: ['"', "'", "`"],
};

const GRAMMARS: Record<CodeLanguage, Grammar> = {
  sql: {
    keywords: words(`select from join using where group by order partition
      with as on and or not in is case when then else end union all
      desc asc over inner left right outer having limit offset distinct`),
    // Aggregates and window functions only. The prototypes leave scalar
    // functions (strftime, cast, coalesce) in the body color.
    builtins: words(`sum count avg min max rank row_number dense_rank`),
    literals: words("null true false"),
    // Matched before single words, so "group by" wins over "group".
    phrases: ["GROUP BY", "ORDER BY", "PARTITION BY"],
    quotes: ["'"],
  },
  python: {
    keywords: words(`from import def return lambda for in if elif else while
      class with as pass raise try except finally yield not and or is
      global nonlocal assert del await async`),
    builtins: words(`Counter defaultdict list str int float dict set tuple
      sorted len sum min max range enumerate zip map filter print bool any
      all abs round reversed`),
    literals: words("None True False"),
    phrases: [],
    lineComment: "#",
    quotes: ['"', "'"],
  },
  javascript: JS_GRAMMAR,
  typescript: JS_GRAMMAR,
};

const IDENT = /[A-Za-z_][A-Za-z0-9_]*/y;
const NUMBER = /\d+(\.\d+)?/y;

/**
 * Tokenize one line. Strings and comments are line-local: none of the
 * authored snippets use block comments or multi-line strings, and a
 * per-line pass keeps the gutter and the code in lockstep.
 */
function tokenizeLine(line: string, grammar: Grammar): HighlightedLine {
  const tokens: Token[] = [];
  let plain = "";

  const flush = () => {
    if (plain) {
      tokens.push({ kind: "plain", text: plain });
      plain = "";
    }
  };
  const push = (kind: TokenKind, text: string) => {
    flush();
    tokens.push({ kind, text });
  };

  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i);

    if (grammar.lineComment && rest.startsWith(grammar.lineComment)) {
      push("comment", rest);
      break;
    }

    const quote = grammar.quotes.find((q) => rest.startsWith(q));
    if (quote) {
      // Unterminated quotes run to end of line rather than throwing.
      const close = line.indexOf(quote, i + quote.length);
      const end = close === -1 ? line.length : close + quote.length;
      push("string", line.slice(i, end));
      i = end;
      continue;
    }

    const phrase = grammar.phrases.find(
      (p) => rest.slice(0, p.length).toUpperCase() === p,
    );
    if (phrase) {
      push("keyword", line.slice(i, i + phrase.length));
      i += phrase.length;
      continue;
    }

    IDENT.lastIndex = i;
    const ident = IDENT.exec(line);
    if (ident) {
      const text = ident[0];
      const lower = text.toLowerCase();
      // A case-insensitive builtin only reads as one when it is actually
      // called, so `month` stays plain while `SUM(` goes blue. Names matched
      // exactly (`Counter`, `list`, `string`) need no call to qualify.
      const called = line[i + text.length] === "(";
      const isBuiltin =
        grammar.builtins.has(text) || (grammar.builtins.has(lower) && called);

      if (grammar.literals.has(text) || grammar.literals.has(lower)) {
        push("number", text);
      } else if (grammar.keywords.has(lower) || grammar.keywords.has(text)) {
        push("keyword", text);
      } else if (isBuiltin) {
        push("builtin", text);
      } else {
        plain += text;
      }
      i += text.length;
      continue;
    }

    NUMBER.lastIndex = i;
    const num = NUMBER.exec(line);
    if (num) {
      push("number", num[0]);
      i += num[0].length;
      continue;
    }

    plain += line[i];
    i += 1;
  }

  flush();
  return tokens;
}

/**
 * Split source into highlighted lines. The caller renders the gutter from
 * `lines.length`, so a trailing newline never yields a phantom line number.
 */
export function highlight(
  source: string,
  language: CodeLanguage,
): HighlightedLine[] {
  const grammar = GRAMMARS[language] ?? GRAMMARS.sql;
  return source.replace(/\n$/, "").split("\n").map((line) => tokenizeLine(line, grammar));
}
