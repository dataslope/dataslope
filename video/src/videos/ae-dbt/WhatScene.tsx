import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, OutlineBadge } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { SANS } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { MATERIALIZE, MODEL_SQL } from "./data";
import { Arrow, Code, Drift, Listing, listingHeight, listingWidth, Mark, X0 } from "./parts";

const SIZE = 21;
const R_X = 1040;

/** A bracket under a span of the ELT row, from `x0` to `x1`, drawn on `at`. */
const Bracket: React.FC<{ x0: number; x1: number; y: number; at: number; color?: string }> = ({ x0, x1, y, at, color = HAIRLINE }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p }}>
      <path d={`M${x0},${y} v12 H${x0 + (x1 - x0) * p} v${-12 * Math.min(1, p * 1.2)}`} fill="none" stroke={color} strokeWidth={1.8} />
    </svg>
  );
};

/**
 * Question 1. dbt is the T in ELT: three letters, the T marked, each word
 * spelled under its letter. A model is a SELECT (the warehousing page's
 * dim_customer); dbt decides how its result is stored by wrapping it, once
 * in CREATE VIEW and once in CREATE TABLE, the wrapper marked. Then what it
 * is not: the E and the L are other tools' (a bracket under them), the T is
 * dbt's; and what it adds, four software practices.
 */
export const WhatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("what").from;
  const qAt = n.word("what", "Question one");
  const textAt = n.word("what", "What is dbt");
  const tAt = n.word("what", "the T in ELT");
  const extractAt = n.word("what", "extract");
  const loadAt = n.word("what", "load");
  const transformAt = n.word("what", "transform");
  const selectAt = n.word("what", "a select statement");
  const modelAt = n.word("what", "called a model");
  const orderAt = n.word("what", "builds the models in order");
  const storedAt = n.word("what-wrap", "how each result is stored");
  const viewAt = n.word("what-wrap", "a create view");
  const tableAt = n.word("what-wrap", "a create table");
  const testsAt = n.word("what-wrap", "runs your tests");
  const docsAt = n.word("what-wrap", "writes your docs");
  const moveAt = n.word("what-not", "It doesn't move data");
  const elAt = n.word("what-not", "extract and load tools");
  const addsAt = n.word("what-not", "What it adds");
  const vcAt = n.word("what-not", "version control");
  const modularAt = n.word("what-not", "modular models");
  const testAt = n.word("what-not", "tests, and continuous");
  const ciAt = n.word("what-not", "continuous integration");
  const end = n.beat("what-not").to;

  // ── The ELT row ──
  const lettersY = y(300);
  const LETTER_W = 190;
  const letters = [
    { l: "E", word: "Extract", at: extractAt },
    { l: "L", word: "Load", at: loadAt },
    { l: "T", word: "Transform", at: transformAt },
  ];
  const notOurs = ease(frame, moveAt, 14);
  const bracketY = lettersY + h(106);

  // ── The model and its two wrappers ──
  const listTop = y(566);
  const modelW = listingWidth(MODEL_SQL, SIZE);
  const viewTop = y(318);
  const viewH = listingHeight(MATERIALIZE.createView.length, SIZE);
  const tableTop = viewTop + viewH + h(46);
  const wrapW = listingWidth(MATERIALIZE.createTable, SIZE);
  const modelMid = listTop + listingHeight(MODEL_SQL.length, SIZE) / 2;
  const viewMid = viewTop + viewH / 2;
  const tableMid = tableTop + viewH / 2;
  const turn = X0 + modelW + 60;
  const practicesY = listTop + listingHeight(MODEL_SQL.length, SIZE) + h(64);
  const alongY = tableTop + viewH + h(34);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={tAt + 2} level={-31} />
      <Sfx name="el-pencil" at={selectAt} level={-35} />
      <Sfx name="el-pencil" at={viewAt - 2} level={-35} />
      <Sfx name="el-pencil" at={tableAt - 2} level={-35} />
      <Sfx name="el-whoosh" at={moveAt} level={-36} />
      <Sfx name="el-tap" at={vcAt} level={-33} />
      <Sfx name="el-tap" at={ciAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={58}>
          What is dbt, and what does it actually do?
        </QuestionCard>

        {/* E, L, T: the T is dbt's. */}
        {letters.map((L, i) => {
          const x = X0 + i * LETTER_W;
          const dimmed = i < 2 ? notOurs : 0;
          return (
            <React.Fragment key={L.l}>
              <Note at={tAt - 2 + i * 3} x={x} y={lettersY}>
                <span style={{ ...label(60, INK), fontWeight: 600, whiteSpace: "nowrap", opacity: 1 - 0.5 * dimmed }}>
                  {i === 2 ? <Mark at={tAt + 6}>{L.l}</Mark> : L.l}
                </span>
              </Note>
              <Note at={L.at} x={x} y={lettersY + h(78)}>
                <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", opacity: 1 - 0.4 * dimmed }}>{L.word}</span>
              </Note>
            </React.Fragment>
          );
        })}
        <Bracket x0={X0} x1={X0 + LETTER_W + 110} y={bracketY} at={elAt} />
        <Note at={elAt + 4} x={X0} y={bracketY + h(24)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Extract and load tools</span>
        </Note>
        <Bracket x0={X0 + 2 * LETTER_W} x1={X0 + 2 * LETTER_W + 150} y={bracketY} at={moveAt + 4} color={BLUE_INK} />
        <Note at={moveAt + 8} x={X0 + 2 * LETTER_W} y={bracketY + h(24)}>
          <span style={{ ...note(22, BLUE_INK), fontWeight: 600, whiteSpace: "nowrap" }}>dbt</span>
        </Note>

        {/* A model is a SELECT. */}
        <Note at={modelAt} x={X0} y={listTop - h(44)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            A model: <Code>dim_customer</Code>, a <Code>SELECT</Code>
          </span>
        </Note>
        <Listing lines={MODEL_SQL} x={X0} top={listTop} width={modelW} size={SIZE} at={selectAt} />
        <Note at={orderAt} x={turn + 24} y={modelMid + h(34)} out={storedAt}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Built in order, in your warehouse</span>
        </Note>

        {/* dbt wraps it: once as a view, once as a table. */}
        <Note at={storedAt} x={turn + 22} y={viewMid - h(44)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>dbt wraps it</span>
        </Note>
        <Arrow points={[[X0 + modelW + 10, modelMid], [turn, modelMid], [turn, viewMid], [R_X - 12, viewMid]]} at={viewAt - 6} />
        <Arrow points={[[X0 + modelW + 10, modelMid], [turn, modelMid], [turn, tableMid], [R_X - 12, tableMid]]} at={tableAt - 6} />
        <Listing
          lines={MATERIALIZE.createView}
          x={R_X}
          top={viewTop}
          width={wrapW}
          size={SIZE}
          at={viewAt - 2}
          marks={[{ line: "CREATE VIEW", at: viewAt + 6 }]}
        />
        <Listing
          lines={MATERIALIZE.createTable}
          x={R_X}
          top={tableTop}
          width={wrapW}
          size={SIZE}
          at={tableAt - 2}
          marks={[{ line: "CREATE TABLE", at: tableAt + 6 }]}
        />
        <Note at={testsAt} x={R_X} y={alongY}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            Alongside: <Mark at={testsAt + 4}>your tests</Mark>
            <span style={{ opacity: ease(frame, docsAt, 10) }}>
              {" "}and <Mark at={docsAt + 4}>your docs</Mark>
            </span>
          </span>
        </Note>

        {/* What it adds: software practice for SQL. */}
        <Note at={addsAt} x={X0} y={practicesY}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Software practice for SQL</span>
        </Note>
        <div style={{ position: "absolute", left: X0, top: practicesY + h(46), display: "flex", gap: 14, fontSize: 23 }}>
          {[
            { t: "Version control", at: vcAt },
            { t: "Modular models", at: modularAt },
            { t: "Tests", at: testAt },
            { t: "CI", at: ciAt },
          ].map((b) => (
            <OutlineBadge key={b.t} tone="ink" size={23} style={{ fontFamily: SANS, opacity: ease(frame, b.at, 10), transform: `translateY(${(1 - ease(frame, b.at, 10)) * 8}px)` }}>
              {b.t}
            </OutlineBadge>
          ))}
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
