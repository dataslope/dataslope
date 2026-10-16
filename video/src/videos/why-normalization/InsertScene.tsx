import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { F, FLAT_COLS, FLAT_ROWS, INSERT_ERROR, INSERT_FAILING_ROW, INSERT_SQL } from "./data";
import {
  BODY_Y,
  DbTable,
  ErrorBox,
  Fig,
  FIG_Y,
  HEAD_H,
  Headline,
  Listing,
  MARK_BAD,
  RIGHT_X,
  ROW_H,
  TABLE_Y,
  tableGeometry,
  X0,
} from "./kit";

const SIZE = 28;
/** Out to the page's right margin. */
const ERROR_W = 1824 - RIGHT_X;

/**
 * The insertion anomaly: Alan has no order, so there is no row to put him
 * in. The attempt is drawn as the failing row Postgres names in its DETAIL
 * line, inside a dashed outline, and struck when it is refused.
 */
export const InsertScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("insert").from - 10;
  const alanAt = n.word("insert", "Alan");
  const signsAt = n.word("insert", "signs up");
  const yetAt = n.word("insert", "hasn't");
  const noIdAt = n.word("refused", "no order ID");
  const refusedAt = n.word("refused", "refused");

  const rows = [...FLAT_ROWS, INSERT_FAILING_ROW];
  const g = tableGeometry({ x: X0, top: y(TABLE_Y), cols: FLAT_COLS, rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const ghost = FLAT_ROWS.length;

  return (
    <AbsoluteFill>
      <Headline kicker="Insertion anomaly" lead="No order," turn="no customer." at={open} underlineAt={refusedAt} />

      <Fig n="3" at={open + 6} y={y(FIG_Y)}>
        Adding Alan, who has not ordered yet
      </Fig>
      <Listing
        lines={INSERT_SQL}
        x={X0}
        top={y(BODY_Y)}
        width={g.width}
        size={SIZE}
        at={open + 4}
        lineAt={[alanAt - 4, alanAt + 2, signsAt]}
      />
      <ErrorBox
        x={RIGHT_X}
        top={y(BODY_Y)}
        width={ERROR_W}
        at={refusedAt - 2}
        message={INSERT_ERROR.message}
        detail={INSERT_ERROR.detail}
      />

      <DbTable
        g={g}
        cols={FLAT_COLS}
        rows={[
          ...FLAT_ROWS.map((cells, i) => ({ cells, at: open + 8 + i * 3 })),
          { cells: INSERT_FAILING_ROW, at: yetAt, ghost: true, grow: true, strikeAt: refusedAt + 2, dimAt: refusedAt + 12 },
        ]}
        at={open + 6}
        numeric={[F.id]}
        marks={[{ row: ghost, col: F.id, at: noIdAt, color: MARK_BAD }]}
      />
      <Note at={refusedAt + 8} x={RIGHT_X} y={g.rowMid(ghost) - 15}>
        <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>Refused, so Alan is not stored</span>
      </Note>
    </AbsoluteFill>
  );
};
