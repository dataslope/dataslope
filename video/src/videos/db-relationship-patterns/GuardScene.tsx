import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK } from "../../editorial/style";
import { NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SR } from "./data";
import {
  Caption,
  DbTable,
  Drift,
  HEAD_H,
  Head,
  KEY_INK,
  KeyArrow,
  Kicker,
  Listing,
  MARK,
  MARK_BAD,
  MARK_KEY,
  Pulse,
  Reply,
  ROW_H,
  tableGeometry,
} from "./parts";

const TABLES_Y = 410;
const E_X = 120;
const M_X = 640;
const RESULT_X = 1010;
const LIST_Y = 720;
const LIST_SIZE = 24;

/**
 * The closing scene: the table joined to itself, once as the employee and
 * once as the manager, with a LEFT JOIN that keeps Ada; then what the
 * foreign key does not check, Ada made her own manager and accepted, and the
 * bridge to constraints.
 */
export const GuardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("alias").from;
  const itselfAt = n.word("alias", "itself");
  const asEmployeeAt = n.word("alias", "as employee");
  const asManagerAt = n.word("alias", "as manager");
  const leftAt = n.word("alias", "left join");
  const keepsAt = n.word("alias", "keeps Ada");
  const noManagerAt = n.word("alias", "no manager");
  const checksAt = n.word("guard", "only checks");
  const existsAt = n.word("guard", "exists");
  const whatIfAt = n.word("guard", "what if");
  const adaAgainAt = n.word("guard", "Ada", { nth: 2 });
  const takesAt = n.word("accepted", "takes it");
  const updatedAt = n.word("accepted", "One row updated");
  const linksAt = n.word("next", "links");
  const whatGoesAt = n.word("next", "what goes");
  const constraintsAt = n.word("next", "constraints");

  const headH = h(HEAD_H);
  const rowH = h(ROW_H);
  const top = y(TABLES_Y);
  const rows = SR.firstRows;
  const eCols = [...SR.aliasCols];
  const mCols = eCols.slice(0, 2);
  const eg = tableGeometry({ x: E_X, top, cols: eCols, rows, extra: [["", "", SR.adaAfter]], headH, rowH });
  const mg = tableGeometry({ x: M_X, top, cols: mCols, rows: rows.map((r) => r.slice(0, 2)), headH, rowH });
  const rg = tableGeometry({ x: RESULT_X, top, cols: SR.joinCols, rows: SR.joinRows.slice(0, rows.length), extra: [SR.joinAfter[0]], headH, rowH });
  const MGR = 2;
  const managerRow = (r: (typeof rows)[number]) => rows.findIndex((m) => m[0] === r[MGR]);
  const withManager = rows.flatMap((r, i) => (r[MGR] === null ? [] : [i]));
  const ada = 0;

  const listTop = y(LIST_Y);
  const settle = 1 - ease(frame, linksAt, 18) * 0.35;

  return (
    <AbsoluteFill>
      {/* ── Sound: the two roles, the result, the update, the reply ── */}
      <Sfx name="el-whoosh" at={asEmployeeAt} level={-34} />
      <Sfx name="el-pencil" at={asManagerAt + 4} level={-35} />
      <Sfx name="el-tap" at={leftAt} level={-29} />
      <Sfx name="el-pencil" at={adaAgainAt} level={-33} />
      <Sfx name="el-pop" at={takesAt} level={-29} />
      {/* The chime rings out in the tail, after the last word. */}
      <Sfx name="el-chime" at={n.beat("next").to + 8} level={-32} />

      <Kicker at={from - 10}>Self-reference</Kicker>
      <Head lead="One table, two roles." leadAt={from - 6} out={adaAgainAt - 10} />
      <Head lead="Ada manages Ada:" leadAt={adaAgainAt} turn="accepted." turnAt={takesAt} />

      <Drift from={from} to={constraintsAt + 40} scale={0.014} origin={[960, y(560)]}>
        <div style={{ position: "absolute", inset: 0, opacity: settle }}>
          {/* ── e and m: one table, read twice ── */}
          <Caption at={asEmployeeAt - 2} x={eg.x} y={top - 48}>
            e, the employee
          </Caption>
          <DbTable
            g={eg}
            cols={eCols}
            rows={rows.map((cells, i) => ({ cells, at: itselfAt + i * 3 }))}
            at={itselfAt - 4}
            numeric={[0, MGR]}
            colInk={{ 0: KEY_INK, [MGR]: KEY_INK }}
            marks={[
              { row: ada, col: MGR, at: keepsAt, color: MARK },
              { row: ada, col: MGR, at: whatGoesAt, color: MARK_BAD },
            ]}
            swaps={[{ row: ada, col: MGR, at: adaAgainAt, value: SR.adaAfter, color: ACCENT_INK }]}
          />
          <Caption at={asManagerAt - 2} x={mg.x} y={top - 48}>
            m, the manager
          </Caption>
          <DbTable
            g={mg}
            cols={mCols}
            rows={rows.map((r, i) => ({ cells: r.slice(0, 2), at: asManagerAt + i * 3 }))}
            at={asManagerAt - 4}
            numeric={[0]}
            colInk={{ 0: KEY_INK }}
            marks={rows.map((_, i) => ({ row: i, col: 0, at: existsAt + i * 3, out: whatIfAt, color: MARK_KEY }))}
          />
          {withManager.map((i, k) => (
            <KeyArrow key={i} from={[eg.x + eg.width + 10, eg.rowMid(i)]} to={[mg.x - 8, mg.rowMid(managerRow(rows[i]))]} at={asManagerAt + 4 + k * 5} />
          ))}
          <KeyArrow from={[eg.x + eg.width + 10, eg.rowMid(ada)]} to={[mg.x - 8, mg.rowMid(ada)]} at={adaAgainAt + 4} color={ACCENT_INK} />
          {rows.map((_, i) => (
            <Pulse key={i} x={mg.x + 30} y={mg.rowMid(i)} at={existsAt + i * 3} r={10} color={KEY_INK} />
          ))}

          {/* ── The self-join's result: a left join keeps Ada ── */}
          <Caption at={leftAt - 4} x={rg.x} y={top - 48}>
            the self-join, as a left join
          </Caption>
          <DbTable
            g={rg}
            cols={SR.joinCols}
            rows={SR.joinRows.slice(0, rows.length).map((cells, i) => ({ cells, at: leftAt + 2 + i * 3 }))}
            at={leftAt - 2}
            marks={[
              { row: ada, col: 2, at: noManagerAt, color: MARK },
              { row: ada, col: 2, at: updatedAt, color: MARK_BAD },
            ]}
            bands={[{ row: ada, at: keepsAt, out: checksAt, color: MARK }]}
            swaps={[{ row: ada, col: 2, at: updatedAt, value: SR.joinAfter[0][2] ?? "", color: ACCENT_INK }]}
          />

          {/* ── What the key does not check ── */}
          <Listing
            lines={SR.updateSql}
            x={E_X}
            top={listTop}
            width={800}
            size={LIST_SIZE}
            at={whatIfAt - 4}
            lineAt={[whatIfAt]}
            marks={[{ line: 0, at: adaAgainAt, color: MARK_BAD }]}
          />
          <Reply x={RESULT_X} y={listTop + 22} at={takesAt} text={SR.updateTag}>
            no complaint
          </Reply>
        </div>
      </Drift>
      <NextLine at={constraintsAt - 2} x={RESULT_X} y={y(820)} width={700}>
        constraints.
      </NextLine>
    </AbsoluteFill>
  );
};
