import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { F, FLAT_COLS, FLAT_ROWS, ILLUSTRATIONS, VIDEO } from "./data";
import {
  BODY_Y,
  Bracket,
  DbTable,
  Fig,
  FIG_Y,
  HEAD_H,
  Headline,
  Mono,
  RIGHT_X,
  ROW_H,
  tableGeometry,
  X0,
} from "./kit";

/** The three anomalies the rest of the video takes in turn. */
const ANOMALIES = [
  { name: "Update anomaly", gist: "Change one copy, and the rows disagree." },
  { name: "Insertion anomaly", gist: "No order, no customer." },
  { name: "Deletion anomaly", gist: "Delete the order, lose the customer." },
] as const;
const ROADMAP_Y = 680;
const ROADMAP_STEP = 560;

/**
 * Hook, copies and traps: the shop's one wide table, Ada's email on two of
 * its rows, and the three anomalies that follow from that.
 */
export const FlatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  // The page opens just ahead of the first word, so a longer lead-in moves it too.
  const open = Math.max(0, n.beat("hook").from - 13);
  const tableAt = n.word("hook", "keeps");
  const rowsAt = n.word("hook", "every order");
  const repeatsAt = n.word("copies", "repeats");
  const adaAt = n.word("copies", "Ada's");
  const twiceAt = n.word("copies", "stored twice");
  const threeAt = n.word("traps", "three");

  const g = tableGeometry({
    x: X0,
    top: y(BODY_Y),
    cols: FLAT_COLS,
    rows: FLAT_ROWS,
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  const right = g.x + g.width;
  const env = pop(frame, repeatsAt - 6, fps, 16);

  return (
    <AbsoluteFill>
      <Headline kicker="Database design" lead="One fact," turn="stored twice." at={open} underlineAt={twiceAt} />
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="why-normalization-envelopes"
          style={{
            position: "absolute",
            left: 1330,
            top: y(84),
            width: 470,
            height: 300,
            opacity: env,
            transform: `translateY(${bob(frame, 5, 110) + (1 - env) * 30}px)`,
          }}
        />
      ) : null}

      <Fig n="1" at={tableAt - 6} y={y(FIG_Y)}>
        <Mono>orders_flat</Mono>, the shop&apos;s only table
      </Fig>
      <DbTable
        g={g}
        cols={FLAT_COLS}
        rows={FLAT_ROWS.map((cells, i) => ({ cells, at: rowsAt + i * 5 }))}
        at={tableAt}
        numeric={[F.id]}
        marks={[
          { row: 0, col: F.email, at: adaAt + 2 },
          { row: 1, col: F.email, at: adaAt + 7 },
        ]}
      />
      <Bracket x={right + 18} y0={g.rowTop(0) + 10} y1={g.rowTop(2) - 10} at={twiceAt} />
      <Note at={twiceAt + 6} x={RIGHT_X} y={g.rowTop(1) - 16}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>Ada&apos;s email, on orders 1 and 2</span>
      </Note>

      {ANOMALIES.map((a, k) => (
        <Ink
          key={a.name}
          at={threeAt - 2 + k * 7}
          dur={16}
          style={{ left: X0 + k * ROADMAP_STEP, top: y(ROADMAP_Y), width: ROADMAP_STEP - 60 }}
        >
          <div style={{ height: 2, width: 56, background: INK, marginBottom: 18 }} />
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ ...label(24, ACCENT_INK), fontWeight: 700 }}>{k + 1}</span>
            <span style={{ ...body(38), color: INK }}>{a.name}</span>
          </div>
          <div style={{ ...note(22, INK_SOFT), marginTop: 12 }}>{a.gist}</div>
        </Ink>
      ))}
    </AbsoluteFill>
  );
};
