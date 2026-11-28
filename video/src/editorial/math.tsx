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

/**
 * Accents over a math variable: x̄, p̂, θ̂, ẋ, x̃. They are drawn, never left to
 * the font. The serif is loaded as Unicode subsets (Fontsource), and no
 * subset of Source Serif 4 maps the combining circumflex (U+0302) or the dot
 * (U+0307); the Greek subset maps no combining mark at all. A letter and a
 * mark the browser cannot find in one file are not shaped together: p̂ fell
 * back whole to another font, a heavier p beside the serif, and θ̂ kept the
 * serif's θ with a fallback hat loose to its right (MLE Part 4's review,
 * 2026-11-26). The macron happens to be in the Latin subset, so x̄ rendered
 * properly; it is drawn too, so every accent reads the same in every face.
 *
 * Each mark is sized and placed to match Source Serif 4's own accents
 * (its precomposed â, Â, ā, Ā side by side with these): anchored to the
 * baseline, not to the line box, so a face with other metrics or another
 * line-height does not move it; raised to clear the letter's x-height,
 * cap height or ascender; and shifted right along the 12° italic slant, so
 * it sits over the letter's ink rather than its advance.
 */
type AccentMark = "hat" | "bar" | "dot" | "tilde";
const COMBINING: Record<string, AccentMark> = {
  "̂": "hat",
  "̄": "bar",
  "̅": "bar",
  "̇": "dot",
  "̃": "tilde",
};
/** Letters whose tops reach the ascender (0.74em, above a capital's 0.67). */
const ASCENDER = /[bdfhklθδλβζξ]/;
/** Capitals, Latin and Greek. */
const CAPITAL = /[A-ZΑ-Ω]/;
/**
 * Each mark's width, height, the height of its bottom above the baseline, and
 * how far right of the letter's centre it sits (the italic slant), in em, for
 * an x-height letter, a capital and an ascender letter. Measured from Source
 * Serif 4 Italic's own precomposed letters: â and Â for the hat, ā and Ā for
 * the bar, ã and Ã for the tilde; an ascender takes the capital's mark raised
 * by the 0.07em an ascender stands above a capital. The font has no dotted
 * Latin letter in these subsets, so the dot follows the bar's placement.
 */
type Fit = { w: number; h: number; bottom: number; dx: number };
const fits = (lower: Fit, cap: Fit, dxAsc = cap.dx + 0.015): [Fit, Fit, Fit] => [
  lower,
  cap,
  { ...cap, bottom: cap.bottom + 0.07, dx: dxAsc },
];
const MARKS: Record<AccentMark, { fit: [Fit, Fit, Fit]; draw: (w: number, h: number) => React.ReactNode }> = {
  hat: {
    fit: fits({ w: 0.29, h: 0.19, bottom: 0.546, dx: 0.095 }, { w: 0.3, h: 0.14, bottom: 0.717, dx: 0.094 }),
    // In units of 0.01em: a chevron stroked 5.4 (the font's circumflex weight).
    draw: (w, h) => (
      <polyline
        points={`2.7,${h - 2.2} ${w / 2},3 ${w - 2.7},${h - 2.2}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={5.4}
        strokeLinejoin="miter"
      />
    ),
  },
  bar: {
    fit: fits({ w: 0.24, h: 0.06, bottom: 0.613, dx: 0.104 }, { w: 0.29, h: 0.058, bottom: 0.759, dx: 0.097 }),
    draw: (w, h) => <rect x={0} y={0} width={w} height={h} fill="currentColor" />,
  },
  dot: {
    fit: fits({ w: 0.085, h: 0.085, bottom: 0.6, dx: 0.104 }, { w: 0.09, h: 0.09, bottom: 0.75, dx: 0.097 }),
    draw: (w, h) => <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="currentColor" />,
  },
  tilde: {
    fit: fits({ w: 0.33, h: 0.14, bottom: 0.575, dx: 0.104 }, { w: 0.36, h: 0.14, bottom: 0.724, dx: 0.099 }),
    draw: (w, h) => (
      <path
        d={`M3,${h - 3} C${w * 0.2},3 ${w * 0.38},3 ${w / 2},${h / 2} S${w * 0.8},${h - 3} ${w - 3},3`}
        fill="none"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
      />
    ),
  },
};

/** Splits "p̂" into its letter and accent, or returns null for anything else. */
const splitAccent = (text: string): [string, AccentMark] | null => {
  const m = /^([A-Za-zΑ-Ωα-ω])([̂-̇])$/u.exec(text.normalize("NFD"));
  return m && COMBINING[m[2]] ? [m[1], COMBINING[m[2]]] : null;
};

/**
 * One italic letter with an accent drawn over it. Write `<I>{"p̂"}</I>`
 * (or `<I>p̂</I>`, or "p̂" inside `<M>`): both find this. An inline grid holds
 * the letter and the mark in one cell, baseline-aligned; the mark's own
 * baseline is its bottom edge, so the transform raises it from the text's
 * baseline exactly. Its negative margins keep it from widening the letter.
 */
export const Accent: React.FC<{ mark: AccentMark; children: string }> = ({ mark, children }) => {
  const { w, h, bottom, dx } = MARKS[mark].fit[ASCENDER.test(children) ? 2 : CAPITAL.test(children) ? 1 : 0];
  const [vw, vh] = [w * 100, h * 100];
  return (
    <span style={{ display: "inline-grid", verticalAlign: "baseline" }}>
      <i style={{ gridArea: "1 / 1", alignSelf: "baseline", fontStyle: "italic" }}>{children}</i>
      <svg
        aria-hidden
        viewBox={`0 0 ${vw} ${vh}`}
        style={{
          gridArea: "1 / 1",
          alignSelf: "baseline",
          justifySelf: "center",
          width: `${w}em`,
          height: `${h}em`,
          margin: "0 -1em",
          overflow: "visible",
          transform: `translate(${dx}em, -${bottom}em)`,
        }}
      >
        {MARKS[mark].draw(vw, vh)}
      </svg>
    </span>
  );
};

/** One expression, tokenized: letters, digits, superscripts, the rest. */
const tokens = (expr: string): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  const re = /([A-Za-zΑ-Ωα-ω][̂-̇])|([A-Za-z]+)|([0-9]+(?:\.[0-9]+)?)|([²³ⁿᵏ])|\^(\{[^}]*\}|.)|(\s+)|(.)/gu;
  const text = expr.normalize("NFD");
  let k = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const [, accented, word, num, sup, caret, space, other] = m;
    const key = k++;
    const acc = accented ? splitAccent(accented) : null;
    if (acc) {
      out.push(
        <Accent key={key} mark={acc[1]}>
          {acc[0]}
        </Accent>,
      );
    } else if (word) {
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

/** An italic math variable inside a MathRun (or beside M). A letter with a
 *  combining accent (`<I>{"x\u0304"}</I>`, `<I>p̂</I>`) gets it drawn: see
 *  `Accent`. */
export const I: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const acc = typeof children === "string" ? splitAccent(children) : null;
  if (acc) return <Accent mark={acc[1]}>{acc[0]}</Accent>;
  return <i style={{ fontStyle: "italic" }}>{children}</i>;
};

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
