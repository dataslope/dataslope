import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, headline, HIGHLIGHT, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Leader, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { DEPT_INK, EXAMPLE, ILLUSTRATIONS, pct, ROWS, SHARE_SUMS, SHARES, TOTALS, VIDEO } from "./data";
import {
  A_X,
  CARD_W,
  Code,
  Fig,
  FRAME_COLS,
  GAP,
  Header,
  HEADER_Y,
  LABEL_Y,
  RH,
  ROW0,
  RowCard,
  S_W,
  S_X,
  T_W,
  T_X,
  ValueCell,
} from "./kit";

/** The example's note, right of the share column. */
const NOTE_X = 850;

/**
 * The payoff: because transform's totals sit beside the salaries row for
 * row, one division gives every row its share of its department. The
 * narration reads one of them out.
 */
export const ShareScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  const start = n.beat("share").from;
  const lineAt = n.word("share", "line up");
  const divideAt = n.word("share", "divide");
  const shareAt = n.word("share", "share of its group");
  const hundredAt = n.word("example", "hundred and forty");
  const pctAt = n.word("example", "thirty-six percent");
  const engAt = n.word("example", "engineering");

  const cardH = h(RH - GAP);
  const ex = EXAMPLE.index;
  const exMid = y(ROW0 + ex * RH) + cardH / 2;
  const band = ease(frame, hundredAt - 4, 12);
  const cake = pop(frame, shareAt - 6, fps, 16);

  return (
    <AbsoluteFill>
      <Ink at={start - 2} dur={14} style={{ left: 124, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>Transform, then divide</span>
      </Ink>
      <div style={{ position: "absolute", left: 118, top: y(146), display: "flex", gap: "0.26em", ...headline(66) }}>
        <Ink at={start + 2} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Salary over group total
        </Ink>
        <Ink at={shareAt - 2} dur={18} style={{ position: "relative", ...headline(66, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
          is each row&apos;s share.
        </Ink>
      </div>

      <Fig n="3" at={start} x={124} y={y(250)}>
        <Code
          parts={[
            { text: 'df["salary"]', mark: { at: lineAt - 2, out: shareAt } },
            { text: " / " },
            { text: 'df.groupby("dept")["salary"].transform("sum")', mark: { at: lineAt + 4, out: shareAt } },
          ]}
        />
      </Fig>

      {/* ── the frame and its group totals, where the last scene left them ── */}
      <Ink at={start - 14} dur={10} style={{ left: A_X, top: y(LABEL_Y) }}>
        <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600 }}>df</span>
      </Ink>
      <Header x={A_X} top={y(HEADER_Y)} width={CARD_W} at={start - 14} cols={FRAME_COLS} />
      <Header x={T_X} top={y(HEADER_Y)} width={T_W} at={start - 14} cols={[{ text: "group total", right: 18 }]} />
      <Header x={S_X} top={y(HEADER_Y)} width={S_W} at={divideAt - 4} cols={[{ text: "share", right: 18 }]} />
      {/* The row the narration reads, marked across all three columns: a
          highlighter stroke laid down behind the cards, so it shows around them. */}
      {band > 0 ? (
        <div
          style={{
            position: "absolute",
            left: A_X - 16,
            top: exMid - cardH / 2 - 9,
            width: (S_X + S_W + 16 - (A_X - 16)) * band,
            height: cardH + 18,
            background: HIGHLIGHT,
          }}
        />
      ) : null}
      {ROWS.map((r, i) => {
        const top = y(ROW0 + i * RH);
        const s = ease(frame, divideAt + i * 4, 12);
        return (
          <React.Fragment key={r.index}>
            <RowCard row={r} height={cardH} pose={{ x: A_X, top }} />
            <ValueCell
              dept={r.dept}
              index={r.index}
              showIndex={1}
              text={String(TOTALS[i])}
              pose={{ x: T_X, top }}
              width={T_W}
              height={cardH}
            />
            {s > 0 ? (
              <ValueCell
                dept={r.dept}
                text={pct(SHARES[i])}
                pose={{ x: S_X - (1 - s) * 22, top, opacity: s }}
                width={S_W}
                height={cardH}
                strong
              />
            ) : null}
          </React.Fragment>
        );
      })}

      <Leader points={[[NOTE_X - 16, exMid], [S_X + S_W + 10, exMid]]} at={pctAt - 6} dur={10} />
      <Note at={pctAt - 4} x={NOTE_X} y={exMid - 44}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, whiteSpace: "nowrap" }}>
          <span style={{ ...headline(64), color: DEPT_INK[EXAMPLE.dept] }}>{pct(SHARES[ex])}</span>
          <span style={{ ...body(30), opacity: ease(frame, engAt - 4, 12) }}>
            {EXAMPLE.salary} of engineering&apos;s {TOTALS[ex]}
          </span>
        </div>
      </Note>

      <Note at={engAt + 14} x={A_X} y={y(ROW0 + 7 * RH + 18)}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          Within each department, the shares add up to {pct(Math.min(...SHARE_SUMS))}.
        </span>
      </Note>

      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="pandas-groupby-cake-slice"
          style={{
            position: "absolute",
            left: 1400,
            top: y(380),
            width: 380,
            height: 400,
            opacity: cake,
            transform: `translateY(${bob(frame, 4, 120) + (1 - cake) * 26}px)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
