import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, body, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DELETE, F, FAILING_ROW, FLAT_AFTER, INSERT_ERROR, LOOKUP, NEW_EMAIL } from "./data";
import {
  BODY_Y,
  DbTable,
  ErrorBox,
  Fig,
  FIG_Y,
  HEAD_H,
  Headline,
  Listing,
  listingHeight,
  MARK_BAD,
  Mono,
  ROW_H,
  tableGeometry,
  X0,
} from "./kit";
import { Drift, pulse, Reply } from "./parts";

const RIGHT = 1250;
const LIST_Y = 742;
const STEP = 560;

/** The three anomalies, in the lesson's own words (its first diagram). */
const ANOMALIES = [
  { name: "Update anomaly", gist: "One fact changes, many rows must change." },
  { name: "Insertion anomaly", gist: "Can't record one fact without another." },
  { name: "Deletion anomaly", gist: "Removing one fact removes another." },
] as const;

/**
 * The update anomaly's two siblings, on the same table: a product that can't
 * be stored before someone orders it, and a customer deleted along with her
 * only order.
 */
export const AnomalyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("siblings").from;
  const updateAt = n.word("siblings", "update anomaly");
  const siblingsAt = n.word("siblings", "siblings");
  const mugAt = n.word("insert", "mug");
  const refusedAt = n.word("insert", "Refused");
  const everyAt = n.word("insert", "every row");
  const orderAt = n.word("insert", "an order");
  const deleteFrom = n.beat("delete").from;
  const graceAt = n.word("delete", "Grace", { nth: 1 });
  const deletingAt = n.word("delete", "deleting");
  const tooAt = n.word("delete", "Grace", { nth: 2 });
  const end = n.beat("delete").to;

  const g = tableGeometry({
    x: X0,
    top: y(BODY_Y),
    cols: FLAT_AFTER.cols,
    rows: [...FLAT_AFTER.rows, FAILING_ROW],
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const grace = FLAT_AFTER.rows.findIndex((r) => r[F.name] === "Grace");
  const ghost = FLAT_AFTER.rows.length;
  // The refused row and its error clear before the deletion.
  const ghostOut = 1 - Math.min(1, Math.max(0, (frame - deleteFrom) / 10));
  const keySwell = pulse(frame, everyAt, 24);
  const anomalyAt = [updateAt, refusedAt, tooAt];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={mugAt - 2} level={-30} />
      <Sfx name="el-tap" at={refusedAt - 2} level={-28} />
      <Sfx name="el-scratch" at={deletingAt} level={-30} />
      <Sfx name="el-tap" at={tooAt - 2} level={-29} />

      <Headline kicker="Why normalize" lead="One table," turn="three anomalies." at={from - 6} turnAt={siblingsAt - 6} underlineAt={siblingsAt + 4} />

      <Drift from={from} to={end + 40} amount={0.012} origin="30% 50%">
        <Fig n="1" at={from - 6} y={y(FIG_Y)}>
          <Mono>orders_flat</Mono>, after the update
        </Fig>
        <div style={{ position: "absolute", inset: 0 }}>
          <DbTable
            g={g}
            cols={FLAT_AFTER.cols}
            rows={[
              ...FLAT_AFTER.rows.map((cells, i) => ({
                cells,
                at: from - 30,
                ...(i === grace ? { strikeAt: deletingAt + 2, collapseAt: deletingAt + 22 } : {}),
              })),
              { cells: FAILING_ROW, at: mugAt, ghost: true, grow: true, collapseAt: deleteFrom - 4 },
            ]}
            at={from - 30}
            numeric={[F.id, F.price]}
            marks={[
              { row: 0, col: F.email, at: from - 30, color: MARK_BAD },
              { row: 1, col: F.email, at: from - 30, color: MARK_BAD },
              // "every row here has to be an order": the refused row's empty order_id.
              { row: ghost, col: F.id, at: orderAt - 2, color: MARK_BAD },
            ]}
            bands={[{ row: grace, at: graceAt }]}
            swaps={[{ row: 0, col: F.email, at: from - 30, value: NEW_EMAIL, color: ACCENT_INK }]}
          />
        </div>
        {/* "every row here is an order": its key, the column no row may leave empty. */}
        <div
          style={{
            position: "absolute",
            left: g.xs[F.id] + 6,
            top: g.top + 6,
            width: g.widths[F.id] - 12,
            height: g.headH - 12,
            borderRadius: 4,
            background: `color-mix(in srgb, ${BAR} ${Math.round(keySwell * 22)}%, transparent)`,
          }}
        />

        <div style={{ position: "absolute", inset: 0, opacity: ghostOut }}>
          <ErrorBox
            x={RIGHT}
            top={y(BODY_Y)}
            width={560}
            at={refusedAt - 4}
            message={INSERT_ERROR.message}
            detail={INSERT_ERROR.detail}
          />
        </div>

        {/* Grace's only order, deleted, and the question that now finds nothing. */}
        <Reply at={deletingAt + 4} x={g.x + g.width + 20} y={g.rowMid(grace) - 20} out={deletingAt + 24}>
          {DELETE.tag}
        </Reply>
        <Listing
          lines={LOOKUP.lines}
          x={RIGHT}
          top={y(BODY_Y)}
          width={560}
          size={22}
          at={tooAt - 14}
          lineAt={[tooAt - 10, tooAt - 6, tooAt - 2]}
          marks={[{ line: 2, at: tooAt + 2 }]}
        />
        <Note at={tooAt + 8} x={RIGHT} y={y(BODY_Y) + listingHeight(LOOKUP.lines.length, 22) + 18}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>({LOOKUP.rows} rows)</span>
        </Note>

        {/* The three anomalies, each as it is named. */}
        {ANOMALIES.map((a, k) => (
          <Ink key={a.name} at={anomalyAt[k] - 2} dur={16} style={{ left: X0 + k * STEP, top: y(LIST_Y), width: STEP - 60 }}>
            <div style={{ height: 2, width: 56, background: INK, marginBottom: 16 }} />
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span style={{ ...label(24, ACCENT_INK), fontWeight: 700 }}>{k + 1}</span>
              <span style={{ ...body(36), color: INK }}>{a.name}</span>
            </div>
            <div style={{ ...note(22, INK_SOFT), marginTop: 10 }}>{a.gist}</div>
          </Ink>
        ))}
      </Drift>
    </AbsoluteFill>
  );
};
