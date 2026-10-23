import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { headline, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { billFor, DOUBLINGS, NAME, times, usd } from "./data";
import { Bracket, COST, FIG_Y, HBar, Headline, INK, INK_SOFT, POINT, POINT_INK, SENT, Spot, X0 } from "./kit";

const TILE_X = 330;
const TILE = 15;
const TILE_GAP = 3;
const BILL_X = 1180;
/** px per dollar: the 40-turn bill fills 440 px. */
const PX = 440 / billFor(40).plain;
const ROW = [470, 610];
const ROW_H = 56;
const ROWS = [20, 40] as const;

/**
 * The puzzle: two chats on Sonnet, one twice as long as the other. The chat
 * doubles; its bill more than triples, past where a doubled bill would end.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("hook").from;
  const chatAt = n.word("hook", "chat");
  const twiceAt = n.word("hook", "twice as long");
  const billAt = n.word("hook", "bill");
  const roughlyAt = n.word("hook", "roughly");
  const triplesAt = n.word("hook", "triples");
  const doubleAt = n.word("why", "double");

  const doubling = DOUBLINGS.find((d) => d.from === 20 && d.to === 40)!;
  const tilesAt = [chatAt - 4, twiceAt - 2];
  const barAt = [billAt - 4, roughlyAt - 2];
  const rowY = (k: number) => y(ROW[k]);
  const ghostW = 2 * billFor(20).plain * PX;
  const realW = billFor(40).plain * PX;

  return (
    <AbsoluteFill>
      {/* ── Sound: tiles, bars, the question ── */}
      <Sfx name="el-sprinkle" at={tilesAt[0]} level={-33} />
      <Sfx name="el-sprinkle" at={tilesAt[1]} level={-33} />
      <Sfx name="el-pop" at={barAt[0]} level={-30} />
      <Sfx name="el-pop" at={barAt[1]} level={-30} />
      <Sfx name="el-pencil" at={doubleAt - 2} level={-35} />

      <Headline at={from - 6} second={triplesAt - 4} italic="three times the bill.">
        Twice the turns,
      </Headline>
      <Spot id="receipt" at={from + 2} left={1460} top={y(40)} width={330} height={220} />

      <FigLabel n="1" title={`Two chats, priced on ${NAME}`} at={from - 2} x={X0} y={y(FIG_Y)} />

      {/* Column heads. */}
      <Note at={chatAt - 6} x={TILE_X} y={y(384)}>
        <span style={label(22, INK_SOFT)}>The chat, one block a turn</span>
      </Note>
      <Note at={billAt - 6} x={BILL_X} y={y(384)}>
        <span style={label(22, INK_SOFT)}>Its bill</span>
      </Note>

      {ROWS.map((turns, k) => {
        const top = rowY(k);
        return (
          <React.Fragment key={turns}>
            <Note at={tilesAt[k] - 2} x={X0} y={top + h(ROW_H) / 2 - 18}>
              <span style={{ ...note(28, INK), fontWeight: 650, ...TABULAR, whiteSpace: "nowrap" }}>{turns} turns</span>
            </Note>
            {/* One block a turn, laid down left to right. */}
            {Array.from({ length: turns }, (_, i) => {
              const p = ease(frame, tilesAt[k] + i * (k === 0 ? 0.9 : 0.6), 6);
              if (p <= 0) return null;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: TILE_X + i * (TILE + TILE_GAP),
                    top: top + (1 - p) * 10,
                    width: TILE,
                    height: h(ROW_H),
                    borderRadius: 3,
                    background: SENT,
                    opacity: p,
                  }}
                />
              );
            })}
            <HBar x={BILL_X} y={top} w={billFor(turns).plain * PX} h={h(ROW_H)} at={barAt[k]} dur={k ? 22 : 14} fill={COST} />
            <Note at={barAt[k] + (k ? 16 : 10)} x={BILL_X + billFor(turns).plain * PX + 16} y={top + h(ROW_H) / 2 - 18}>
              <span style={{ ...note(28, INK), fontWeight: 650, ...TABULAR }}>{usd(billFor(turns).plain)}</span>
            </Note>
          </React.Fragment>
        );
      })}

      {/* Twice the turns; three times the bill. */}
      <Note at={twiceAt + 4} x={TILE_X} y={y(744)}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 14, whiteSpace: "nowrap" }}>
          <span style={{ ...headline(56), ...TABULAR }}>×2</span>
          <span style={note(24, INK_SOFT)}>the turns</span>
        </span>
      </Note>
      <Note at={triplesAt - 2} x={BILL_X} y={y(744)}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 14, whiteSpace: "nowrap" }}>
          <span style={{ ...headline(56), color: POINT_INK, ...TABULAR }}>{times(doubling.times)}</span>
          <span style={note(24, INK_SOFT)}>the bill</span>
        </span>
      </Note>

      {/* Where a doubled bill would stop, and the part past it. */}
      <HBar x={BILL_X} y={rowY(1)} w={ghostW} h={h(ROW_H)} at={doubleAt - 6} dur={12} fill="transparent" outline={INK} dashed />
      <Note at={doubleAt - 2} x={BILL_X + ghostW} y={rowY(1) + h(ROW_H) + 10} align="right">
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>if it just doubled</span>
      </Note>
      <Bracket x0={BILL_X + ghostW + 2} x1={BILL_X + realW} y={rowY(1) - 12} at={doubleAt + 6} up={false} color={POINT} tick={-10} />
      <Note at={doubleAt + 10} x={(BILL_X + ghostW + BILL_X + realW) / 2 - 8} y={rowY(1) - 52} from="up">
        <span style={{ ...note(30, POINT_INK), fontWeight: 700 }}>?</span>
      </Note>
    </AbsoluteFill>
  );
};
