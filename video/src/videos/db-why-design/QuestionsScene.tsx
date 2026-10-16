import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, HAIRLINE, INK, INK_SOFT, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Code, Drift, Headline, Kicker, Mark, X0 } from "./parts";

const ROW_Y0 = 372;
const ROW_STEP = 90;
const Q_X = X0 + 54;
const R_X = 1210;

/**
 * Part 2 opens: what database design is. The lesson's five questions, each
 * with the part of a schema it decides, then the same answers as SQL writes
 * them down; the questions are the design.
 */
export const QuestionsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const whatFrom = n.beat("what").from;
  const hardAt = n.word("what", "hard");
  const softwareAt = n.word("what", "software");
  const inconsistentlyAt = n.word("what", "inconsistently");
  const sqlAt = n.word("sql", "SQL");
  const writeAt = n.word("sql", "write");
  const downAt = n.word("sql", "down");
  const isntAt = n.word("sql", "isn't");
  const designAt = n.word("sql", "design");
  const end = n.beat("library").from;

  const ROWS = [
    { q: "Which things become tables?", decides: "tables", sql: "CREATE TABLE", at: n.word("questions", "things"), key: n.word("questions", "tables") },
    { q: "Which facts become columns?", decides: "columns", sql: "email text", at: n.word("questions", "facts"), key: n.word("questions", "columns") },
    { q: "Which rows need an identity?", decides: "keys", sql: "PRIMARY KEY", at: n.word("questions", "rows"), key: n.word("questions", "identity") },
    { q: "Which tables point to which?", decides: "relationships", sql: "REFERENCES", at: n.word("questions", "tables", { nth: 2 }), key: n.word("questions", "point") },
    {
      q: "Which values must be present, unique, or limited?",
      decides: "constraints",
      sql: "NOT NULL, UNIQUE, CHECK",
      at: n.word("questions", "values"),
      key: n.word("questions", "limited"),
    },
  ];
  const rowY = (i: number) => y(ROW_Y0 + i * ROW_STEP);
  const toSql = (i: number) => writeAt - 2 + i * 4;
  const heads = ease(frame, ROWS[0].at - 10, 12);
  const sqlHead = ease(frame, sqlAt - 2, 12);

  return (
    <AbsoluteFill>
      {/* ── Sound: one tap per question, a stroke as the answers turn into SQL ── */}
      {ROWS.map((r) => (
        <Sfx key={r.at} name="el-tap" at={r.at - 4} level={-30} />
      ))}
      <Sfx name="el-pencil" at={writeAt - 2} level={-34} />

      <Kicker at={whatFrom - 10}>What design is</Kicker>
      <Headline lead="Design is answering" turn="the hard questions." at={whatFrom - 6} turnAt={hardAt - 4} size={72} />
      <Ink at={softwareAt - 4} dur={18} style={{ left: 96, top: y(248), whiteSpace: "nowrap" }}>
        <span style={{ ...body(34, true), color: INK_SOFT }}>
          before your software answers them for you,{" "}
          <Mark at={inconsistentlyAt}>
            <span style={{ color: ACCENT_INK }}>inconsistently</span>
          </Mark>
          .
        </span>
      </Ink>

      <Drift from={whatFrom} to={end} amount={0.018} origin="40% 60%">
        {/* Column heads, and a rule under them. */}
        <div style={{ position: "absolute", left: Q_X, top: rowY(0) - 64, opacity: heads, ...label(21, INK_SOFT) }}>The question</div>
        <div style={{ position: "absolute", left: R_X, top: rowY(0) - 64, opacity: heads * (1 - sqlHead), ...label(21, INK_SOFT) }}>
          What it decides
        </div>
        <div style={{ position: "absolute", left: R_X, top: rowY(0) - 64, opacity: sqlHead, ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
          How SQL writes it down
        </div>
        <div style={{ position: "absolute", left: X0, top: rowY(0) - 26, width: 1680 * heads, height: 2, background: INK }} />

        {ROWS.map((r, i) => {
          const gone = ease(frame, toSql(i), 8);
          const sw = ease(frame, toSql(i) + 6, 12);
          return (
            <React.Fragment key={r.q}>
              <Ink at={r.at - 6} dur={14} style={{ left: X0, top: rowY(i) + 4, whiteSpace: "nowrap" }}>
                <span style={{ ...label(24, ACCENT_INK), fontWeight: 700 }}>{i + 1}</span>
              </Ink>
              <Ink at={r.at - 4} dur={16} style={{ left: Q_X, top: rowY(i) - 4, whiteSpace: "nowrap" }}>
                <span style={{ ...body(38), color: INK }}>
                  <Mark at={designAt - 4 + i * 4}>{r.q}</Mark>
                </span>
              </Ink>
              <Ink at={r.key - 2} dur={14} style={{ left: R_X, top: rowY(i) + 2, whiteSpace: "nowrap", opacity: 1 - gone }}>
                <span style={{ ...label(28, INK), fontWeight: 600 }}>{r.decides}</span>
              </Ink>
              {sw > 0 ? (
                <div
                  style={{
                    position: "absolute",
                    left: R_X,
                    top: rowY(i) + 4,
                    opacity: sw * (1 - ease(frame, isntAt, 16) * 0.5),
                    transform: `translateX(${(1 - sw) * 14}px)`,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Code line={r.sql} size={26} />
                </div>
              ) : null}
              <div
                style={{
                  position: "absolute",
                  left: X0,
                  top: rowY(i) + 66,
                  width: 1680,
                  height: 1,
                  background: HAIRLINE,
                  opacity: 0.45 * ease(frame, r.at, 12),
                }}
              />
            </React.Fragment>
          );
        })}
        <Ink at={downAt} dur={16} style={{ left: R_X, top: rowY(5) - 2, whiteSpace: "nowrap" }}>
          <span style={{ ...body(30, true), color: INK_SOFT }}>The answers, written down.</span>
        </Ink>
        <Ink at={designAt} dur={16} style={{ left: Q_X, top: rowY(5) - 2, whiteSpace: "nowrap" }}>
          <span style={{ ...body(30, true), color: ACCENT_INK }}>The design.</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
