import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { CASCADE, goneRows, RESTRICT, SETNULL, type Table } from "./data";
import {
  type Col,
  Code,
  DataTable,
  Drift,
  ElbowArrow,
  ErrorBox,
  FIG_Y,
  Headline,
  KEY_INK,
  Kicker,
  MARK,
  MARK_KEY,
  Reply,
  TableName,
  type TableGeometry,
  tableGeometry,
} from "./parts";

const COL_X = [150, 735, 1320];
const COL_W = 500;
/** One figure in three columns: its label at FIG_Y, each column's heading
 *  under it, then the parent table over its child. */
const TAG_Y = 338;
const PARENT_Y = 422;
const HEAD_H = 40;
const ROW_H = 48;
const SIZES = { headSize: 20, bodySize: 24, pad: 14 };
/** Room between a parent table's bottom rule and its child's top rule. */
const STACK = 66;

const cols = (t: Table, keys: readonly string[]): Col[] =>
  t.cols.map((name) => ({ name, numeric: !/name|title/.test(name), ink: keys.includes(name) ? KEY_INK : undefined }));

/**
 * An elbow from a child row, out to the right and back into its parent row.
 * Every child table here ends on its foreign key, so the pointer leaves from
 * beside the value it holds, as every earlier scene's does.
 */
const pointer = (child: TableGeometry, row: number, parent: TableGeometry, prow: number, out = 44) => {
  const x = Math.max(child.right, parent.right) + out;
  return [
    [child.right + 6, child.rowMid(row)],
    [x, child.rowMid(row)],
    [x, parent.rowMid(prow)],
    [parent.right + 6, parent.rowMid(prow)],
  ] as const;
};

/**
 * Part 4 opens: delete a parent with children, three ways, each the lesson's
 * own tables as PGlite ran them. The first pair (accounts and invoices) is
 * the picture of "every pointer points at something real"; each of the
 * other two is drawn as its rule is named. RESTRICT refuses (Ada Co keeps
 * its invoice); CASCADE takes post 1's two comments along; SET NULL keeps
 * Sam's ticket and clears its pointer.
 */
export const DeleteScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("delete").from;
  const pointerAt = n.word("delete", "every pointer");
  const pointsAt = n.word("delete", "points at");
  const realAt = n.word("delete", "something real");
  const deletingAt = n.word("delete", "deleting");
  const choiceAt = n.word("delete", "choice");
  const restrictAt = n.word("restrict", "Restrict");
  const blocksAt = n.word("restrict", "blocks");
  const invoiceAt = n.word("restrict", "an invoice");
  const staysAt = n.word("restrict", "account stays");
  const cascadeAt = n.word("cascade", "Cascade");
  const alongAt = n.word("cascade", "children along");
  const deleteAt = n.word("cascade", "Delete");
  const spamAt = n.word("cascade", "spam post");
  const bothAt = n.word("cascade", "BOTH");
  const tooAt = n.word("cascade", "go too");
  const setNullAt = n.word("setnull", "set null");
  const keepsAt = n.word("setnull", "keeps the child");
  const clearsAt = n.word("setnull", "clears");
  const samAt = n.word("setnull", "Sam leaves");
  const ticketStaysAt = n.word("setnull", "ticket stays");
  const noOneAt = n.word("setnull", "no one");
  const end = n.beat("setnull").to;

  // ── Geometry: each column a parent over its child ──
  const stack = (x: number, parent: Table, child: Table, extra: readonly (readonly string[])[] = []) => {
    const p = tableGeometry({ x, top: y(PARENT_Y), cols: parent.cols.map((name) => ({ name })), rows: parent.rows, headH: h(HEAD_H), rowH: h(ROW_H), ...SIZES });
    const c = tableGeometry({
      x,
      top: p.rowTop(parent.rows.length) + STACK,
      cols: child.cols.map((name) => ({ name })),
      rows: child.rows,
      extra,
      headH: h(HEAD_H),
      rowH: h(ROW_H),
      ...SIZES,
    });
    return { p, c, below: c.rowTop(child.rows.length) + 16 };
  };
  const r = stack(COL_X[0], RESTRICT.accounts, RESTRICT.invoices);
  const k = stack(COL_X[1], CASCADE.posts, CASCADE.comments);
  const s = stack(COL_X[2], SETNULL.employees, SETNULL.tickets, SETNULL.ticketsAfter.rows);

  // One column per rule, each drawn as it is named, so the eye is never
  // asked to find its column among six tables at once.
  const tablesAt = [from + 2, cascadeAt - 12, setNullAt - 12];
  const arrowsAt = [pointsAt + 2, cascadeAt + 6, setNullAt + 4];
  const kinds = [
    { at: restrictAt, name: "RESTRICT" },
    { at: cascadeAt, name: "CASCADE" },
    { at: setNullAt, name: "SET NULL" },
  ];

  // CASCADE: which comments go with post 1, and where 12 points once they have.
  const goneComments = goneRows(CASCADE.comments, CASCADE.commentsAfter);
  const gonePosts = goneRows(CASCADE.posts, CASCADE.postsAfter);
  const postOf = (row: number) => CASCADE.posts.rows.findIndex((p) => p[0] === CASCADE.comments.rows[row][1]);
  const collapseAt = tooAt + 4;
  // Only the comments' closing rows sit above the statement.
  const closed = goneComments.length * h(ROW_H) * ease(frame, collapseAt + 4, 12);

  // SET NULL: Sam's ticket, and the cell the delete clears.
  const ptrCol = SETNULL.tickets.cols.indexOf("assigned_employee_id");
  const samGoneAt = samAt + 16;

  return (
    <AbsoluteFill>
      {/* ── Sound: the three refusals and deletions, in order ── */}
      <Sfx name="el-whoosh" at={tablesAt[0]} level={-34} />
      <Sfx name="el-tap" at={blocksAt + 4} level={-28} />
      <Sfx name="el-whoosh" at={tablesAt[1]} level={-36} />
      <Sfx name="el-whoosh" at={tablesAt[2]} level={-36} />
      <Sfx name="el-scratch" at={spamAt + 2} level={-30} />
      <Sfx name="el-scratch" at={bothAt + 2} level={-31} />
      <Sfx name="el-scratch" at={samAt + 2} level={-30} />
      <Sfx name="el-tap" at={noOneAt} level={-28} />

      <Kicker at={from - 10}>Referential integrity</Kicker>
      <Drift from={from} to={end + 50}>
        <Headline lead="Delete a parent," turn="and then?" at={from - 6} turnAt={choiceAt - 4} />

        {/* One label for the three columns: they are one comparison, and their
            headings arrive together on "deleting". */}
        <FigLabel n="11" title="Deleting a parent, three ways" at={from} x={COL_X[0]} y={y(FIG_Y)} />

        {/* ── The three columns' headings: ON DELETE, then which ── */}
        {kinds.map((kind, i) => (
          <Ink key={kind.name} at={deletingAt - 4 + i * 4} dur={14} style={{ left: COL_X[i], top: y(TAG_Y), whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 25, fontWeight: 700, color: INK_SOFT }}>
              ON DELETE{" "}
              {/* "?" until the narration names this one, then its name in the same place. */}
              <span style={{ position: "relative", display: "inline-block" }}>
                <span style={{ color: ACCENT_INK, opacity: ease(frame, kind.at - 4, 10) }}>{kind.name}</span>
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    color: INK_SOFT,
                    opacity: ease(frame, choiceAt - 2, 10) * (1 - ease(frame, kind.at - 8, 6)),
                  }}
                >
                  ?
                </span>
              </span>
            </span>
          </Ink>
        ))}

        {/* ── RESTRICT: accounts and invoices ── */}
        <TableName g={r.p} at={tablesAt[0]}>
          accounts
        </TableName>
        <DataTable
          g={r.p}
          cols={cols(RESTRICT.accounts, ["account_id"])}
          at={tablesAt[0]}
          rows={[{ cells: RESTRICT.accounts.rows[0], at: tablesAt[0] + 4, outline: { at: blocksAt, out: staysAt } }]}
          marks={[{ row: 0, col: 0, at: realAt, out: blocksAt, color: MARK_KEY }]}
          bands={[{ row: 0, at: staysAt + 2, color: MARK }]}
        />
        <TableName g={r.c} at={tablesAt[0] + 6}>
          invoices
        </TableName>
        <DataTable
          g={r.c}
          cols={cols(RESTRICT.invoices, ["account_id"])}
          at={tablesAt[0] + 6}
          rows={[{ cells: RESTRICT.invoices.rows[0], at: tablesAt[0] + 10 }]}
          marks={[{ row: 0, col: RESTRICT.invoices.cols.indexOf("account_id"), at: pointerAt, out: invoiceAt, color: MARK_KEY }]}
          bands={[{ row: 0, at: invoiceAt, color: MARK_KEY }]}
        />
        <ElbowArrow points={pointer(r.c, 0, r.p, 0)} at={arrowsAt[0]} />
        <Ink at={blocksAt - 4} dur={12} style={{ left: COL_X[0], top: r.below, whiteSpace: "nowrap" }}>
          <Code line={RESTRICT.del.lines[0]} size={19} />
        </Ink>
        <ErrorBox
          x={COL_X[0]}
          top={r.below + 40}
          width={COL_W - 30}
          size={19}
          at={blocksAt + 4}
          message={RESTRICT.del.message}
          detail={RESTRICT.del.detail}
          mark={{ text: RESTRICT.del.detail.slice(RESTRICT.del.detail.indexOf("is referenced")), at: invoiceAt + 4 }}
        />

        {/* ── CASCADE: posts and comments ── */}
        <TableName g={k.p} at={tablesAt[1]}>
          posts
        </TableName>
        <DataTable
          g={k.p}
          cols={cols(CASCADE.posts, ["id"])}
          at={tablesAt[1]}
          rows={CASCADE.posts.rows.map((cells, i) => ({
            cells,
            at: tablesAt[1] + 4 + i * 4,
            strikeAt: gonePosts.includes(i) ? spamAt + 2 : undefined,
            collapseAt: gonePosts.includes(i) ? collapseAt : undefined,
          }))}
        />
        <TableName g={k.c} at={tablesAt[1] + 6}>
          comments
        </TableName>
        <DataTable
          g={k.c}
          cols={cols(CASCADE.comments, ["post_id"])}
          at={tablesAt[1] + 6}
          rows={CASCADE.comments.rows.map((cells, i) => ({
            cells,
            at: tablesAt[1] + 10 + i * 4,
            strikeAt: goneComments.includes(i) ? bothAt + 2 + goneComments.indexOf(i) * 5 : undefined,
            collapseAt: goneComments.includes(i) ? collapseAt : undefined,
          }))}
          bands={goneComments.map((row, j) => ({ row, at: alongAt + j * 5, color: MARK_KEY }))}
        />
        {/* The spam post's two comments point at it; comment 12's own pointer
            is drawn once they have gone, when it and post 2 are each the
            first row (drawn beside theirs, the two would have to cross). */}
        {goneComments.map((row) => (
          <ElbowArrow key={row} points={pointer(k.c, row, k.p, postOf(row))} at={arrowsAt[1]} out={collapseAt - 4} />
        ))}
        <ElbowArrow points={pointer(k.c, 0, k.p, 0)} at={collapseAt + 18} />
        {/* The statement and its answer follow the closing rows up. */}
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${-closed}px)` }}>
          <Ink at={deleteAt - 4} dur={12} style={{ left: COL_X[1], top: k.below, whiteSpace: "nowrap" }}>
            <Code line={CASCADE.del.lines[0]} size={19} />
          </Ink>
          {/* DELETE counts the statement's own rows: the post, not what cascaded. */}
          <Reply
            x={COL_X[1]}
            top={k.below + 40}
            at={tooAt + 8}
            tag={CASCADE.del.tag}
            size={20}
            gloss={
              <span style={{ display: "inline-block", lineHeight: 1.25 }}>
                <div>counts only the post;</div>
                <div>its {goneComments.length} comments went too</div>
              </span>
            }
            glossAt={tooAt + 20}
          />
        </div>

        {/* ── SET NULL: employees and tickets ── */}
        <TableName g={s.p} at={tablesAt[2]}>
          employees
        </TableName>
        <DataTable
          g={s.p}
          cols={cols(SETNULL.employees, ["employee_id"])}
          at={tablesAt[2]}
          rows={[{ cells: SETNULL.employees.rows[0], at: tablesAt[2] + 4, strikeAt: samAt + 2, dimAt: samGoneAt }]}
        />
        <TableName g={s.c} at={tablesAt[2] + 6}>
          tickets
        </TableName>
        <DataTable
          g={s.c}
          cols={cols(SETNULL.tickets, ["assigned_employee_id"])}
          at={tablesAt[2] + 6}
          rows={[{ cells: SETNULL.tickets.rows[0], at: tablesAt[2] + 10 }]}
          bands={[{ row: 0, at: keepsAt, color: MARK }]}
          marks={[{ row: 0, col: ptrCol, at: clearsAt, color: MARK_KEY }]}
          swaps={[{ row: 0, col: ptrCol, at: noOneAt - 2, value: SETNULL.ticketsAfter.rows[0][ptrCol], color: ACCENT_INK }]}
        />
        <ElbowArrow points={pointer(s.c, 0, s.p, 0)} at={arrowsAt[2]} out={samGoneAt - 4} />
        <Ink at={samAt - 4} dur={12} style={{ left: COL_X[2], top: s.below, whiteSpace: "nowrap" }}>
          <Code line={SETNULL.del.lines[0]} size={19} />
        </Ink>
        <Reply x={COL_X[2]} top={s.below + 40} at={ticketStaysAt} tag={SETNULL.del.tag} size={20} />
        <Ink at={noOneAt + 6} dur={14} style={{ left: COL_X[2] + 150, top: s.below + 46, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: MONO, fontSize: 20, color: INK }}>ticket {SETNULL.ticketsAfter.rows[0][0]} stays</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
