import React from "react";
import { syntax } from "../../theme/brand";
import { MONO } from "../../theme/fonts";

const KEYWORDS = new Set([
  "SELECT",
  "FROM",
  "WHERE",
  "GROUP",
  "BY",
  "HAVING",
  "ORDER",
  "LIMIT",
  "AS",
  "DESC",
  "DISTINCT",
]);
const FUNCTIONS = new Set(["SUM"]);

type Token = { text: string; color: string };

/** Splits a line of SQL into colored tokens. Enough for the clauses in this
 *  video, not a general SQL lexer. */
export function tokenize(sql: string): Token[] {
  return [...sql.matchAll(/[A-Za-z_]+|\d+|\s+|[^\sA-Za-z_\d]/g)].map(([t]) => {
    if (KEYWORDS.has(t)) return { text: t, color: syntax.keyword };
    if (FUNCTIONS.has(t)) return { text: t, color: syntax.fn };
    if (/^\d+$/.test(t)) return { text: t, color: syntax.number };
    if (/^[A-Za-z_]+$/.test(t)) return { text: t, color: syntax.plain };
    return { text: t, color: syntax.operator };
  });
}

/**
 * One highlighted line. `mark` draws a highlight box behind every token equal
 * to it (the alias `total`, say), with `markProgress` 0 → 1 growing it in.
 */
export const SqlLine: React.FC<{
  sql: string;
  fontSize: number;
  mark?: string;
  markColor?: string;
  markProgress?: number;
  /** Only mark the nth occurrence (from 1); all of them when unset. */
  markNth?: number;
  style?: React.CSSProperties;
}> = ({ sql, fontSize, mark, markColor, markProgress = 0, markNth, style }) => {
  let seen = 0;
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize,
        fontWeight: 600,
        whiteSpace: "pre",
        ...style,
      }}
    >
      {tokenize(sql).map((t, i) => {
        const isMark = mark !== undefined && t.text === mark && (markNth === undefined || ++seen === markNth);
        if (!isMark) {
          return (
            <span key={i} style={{ color: t.color }}>
              {t.text}
            </span>
          );
        }
        return (
          <span key={i} style={{ position: "relative", color: t.color }}>
            <span
              style={{
                position: "absolute",
                left: -6,
                right: -6,
                top: "8%",
                bottom: "8%",
                borderRadius: 8,
                background: markColor,
                opacity: 0.32 * markProgress,
                transform: `scaleX(${markProgress})`,
                transformOrigin: "left",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: -6,
                right: -6,
                top: "8%",
                bottom: "8%",
                borderRadius: 8,
                border: `3px solid ${markColor}`,
                opacity: markProgress,
              }}
            />
            <span style={{ position: "relative" }}>{t.text}</span>
          </span>
        );
      })}
    </span>
  );
};
