import React from "react";
import { SERIF } from "./fonts";

/**
 * Math notation, set the way KaTeX sets it on the site: in the house serif,
 * single-letter variables (and the O of big-O) in italic, digits, operators
 * and named functions (log, ln, max, min) upright, exponents as real
 * superscripts. `O(n²)` written in Inter reads as code; `<M>O(n²)</M>` reads
 * as the notation it is (the owner, 2026-11-11).
 *
 * The serif sits at 1.08em, which brings its x-height up to Inter's, so a
 * formula in a sentence matches the words around it. The root carries
 * `data-math`, which the page audit (audit.tsx) reads to allow math in the
 * serif beside Inter on one line, as it allows code in the mono face.
 *
 *   <M>O(n log n)</M>   <M>O((V + E) log V)</M>   <M>T(n) = 2 T(n/2) + n</M>
 *
 * `mathText()` finds the notation inside an ordinary string ("O(1) extra
 * space", "a heap push of log V") and wraps only those parts.
 */

const FUNCS = new Set(["log", "ln", "lg", "max", "min", "exp"]);
const SUPER: Record<string, string> = { "²": "2", "³": "3", "ⁿ": "n", "ᵏ": "k" };

/** One expression, tokenized: letters, digits, superscripts, the rest. */
const tokens = (expr: string): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  const re = /([A-Za-z]+)|([0-9]+(?:\.[0-9]+)?)|([²³ⁿᵏ])|\^(\{[^}]*\}|.)|(\s+)|(.)/g;
  let k = 0;
  for (let m = re.exec(expr); m; m = re.exec(expr)) {
    const [, word, num, sup, caret, space, other] = m;
    const key = k++;
    if (word) {
      if (FUNCS.has(word) || word.length > 1) out.push(<span key={key}>{word}</span>);
      else out.push(<i key={key}>{word}</i>);
    } else if (num) {
      out.push(<span key={key}>{num}</span>);
    } else if (sup || caret) {
      const raw = sup ? SUPER[sup] : caret.replace(/^\{|\}$/g, "");
      out.push(
        <sup key={key} style={{ fontSize: "0.7em", verticalAlign: "0.45em", lineHeight: 0 }}>
          {tokens(raw)}
        </sup>,
      );
    } else if (space) {
      out.push(" ");
    } else {
      // A hyphen between terms is a minus sign.
      out.push(<span key={key}>{other === "-" ? "−" : other}</span>);
    }
  }
  return out;
};

/** The math face: the house serif at Inter's x-height, upright. */
export const MATH_STYLE: React.CSSProperties = {
  fontFamily: SERIF,
  fontSize: "1.08em",
  fontWeight: 400,
  fontStyle: "normal",
  fontVariantNumeric: "lining-nums",
  letterSpacing: 0,
  whiteSpace: "nowrap",
};

export const M: React.FC<{ children: string; style?: React.CSSProperties }> = ({ children, style }) => (
  <span data-math="" style={{ ...MATH_STYLE, ...style }}>
    {tokens(children)}
  </span>
);

/**
 * A formula whose pieces are not all one string: live numbers, a highlight
 * on one term, a subscript. The run is set in the math face and marked for
 * the audit; inside it, write each variable as `<I>x</I>` and the rest as it
 * reads (digits, operators and named functions stay upright).
 *
 *   <MathRun><I>s</I>² = Σ(<I>x</I> − <I>x̄</I>)² / (<I>n</I> − 1)</MathRun>
 */
export const MathRun: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span data-math="" style={{ ...MATH_STYLE, ...style }}>
    {children}
  </span>
);

/** An italic math variable inside a MathRun (or beside M). */
export const I: React.FC<{ children: React.ReactNode }> = ({ children }) => <i style={{ fontStyle: "italic" }}>{children}</i>;

/** Big-O and its cousins, with one level of nested parentheses, and the bare
 *  growth terms the videos write in prose. */
const NOTATION = /[OΘΩ]\((?:[^()]|\([^()]*\))*\)|\bn log n\b|\blog [nVk]\b|\bn[²³](?:\/2)?/g;

/** A string with its notation set as math and the rest left as it is. */
export const mathText = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(NOTATION)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    parts.push(<M key={k++}>{m[0]}</M>);
    last = at + m[0].length;
  }
  if (last === 0) return text;
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
};
