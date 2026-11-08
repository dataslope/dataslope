import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, during } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HIGHLIGHT, INK, PAPER, label } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { ACCENT_INK, ArtSpot, Box, Drift, Flow, Headline, Kicker, Line, OK_INK, Pill, pulse, VRule, X0 } from "./parts";

/** The checkout, as the shop's five steps. */
const STEPS = ["cart", "pay", "invoice", "email", "stock"];
const STEP_W = 180;
const STEP_GAP = 56;
const ROW = 296;
const BOX_H = 76;
/** The three requests, as cards. */
const REQUESTS = [
  { id: "ship", text: "A second shipping rule", cue: "a second shipping rule" },
  { id: "text", text: "A text message, beside the email", cue: "a text message" },
  { id: "loyal", text: "A count for the loyalty program", cue: "a count for the loyalty program" },
] as const;
const REQ_TOP = 424;
const REQ_PITCH = 104;
const CARD = { w: 620, h: 64 };
const NEW = { x: 870, w: 160 };
const EDIT = { x: 1070, w: 320 };
const OPT_H = 46;

/**
 * The opening: the shop's checkout as a row of boxes that works, the hero
 * beside it, then the three change requests the video comes back to, each
 * hovering between landing as a new piece and as an edit to working code.
 * Then the round: fifteen questions, eight large and seven small.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const shopAt = n.word("hook", "A small shop's checkout");
  const worksAt = n.word("hook", "works");
  const asksAt = n.word("hook", "Then the business asks");
  const reqAt = REQUESTS.map((r) => n.word("hook", r.cue));
  const landsAt = n.word("hook-ask", "Whether it lands as a new piece");
  const editAt = n.word("hook-ask", "or as an edit to code that already works");
  const drawnAt = n.word("hook-ask", "depends on how the objects were drawn");
  const fifteenAt = n.word("plan", "Fifteen questions");
  const shopOneAt = n.word("plan", "argued on that one shop");
  const eightAt = n.word("plan", "Eight get a figure each");
  const sevenAt = n.word("plan", "seven go quickly at the end");
  const end = n.beat("plan").to;

  const rowTop = y(ROW);
  const mid = rowTop + BOX_H / 2;
  const dim = fifteenAt - 4;
  const lit = pulse(frame, drawnAt + 6, 30);
  // The hover: a yellow band behind one answer, then the other, from "lands"
  // until "depends", each row a little out of step.
  const hover = during(frame, landsAt, drawnAt + 8, 10);

  // The round: eight large chips and seven small ones.
  const chipsTop = y(800);
  const big = 50;
  const small = 36;
  const chipX = (i: number) => (i < 8 ? 800 + i * (big + 10) : 800 + 8 * (big + 10) + 24 + (i - 8) * (small + 10));

  return (
    <AbsoluteFill>
      {STEPS.map((_, i) => (
        <Sfx key={i} name="el-tap" at={shopAt + i * 4} level={-33} />
      ))}
      <Sfx name="el-pencil" at={worksAt} level={-35} />
      {reqAt.map((at, i) => (
        <Sfx key={`r${i}`} name="el-tap" at={at} level={-31} />
      ))}
      <Sfx name="el-pop" at={shopAt + 14} level={-30} />
      <Sfx name="el-whoosh" at={landsAt} level={-36} />
      <Sfx name="el-chime" at={fifteenAt} level={-32} />
      <Sfx name="el-sprinkle" at={eightAt} level={-32} />

      <Drift from={0} to={end + 20}>
        <Kicker at={shopAt}>Backend engineer interview questions · Designing objects</Kicker>
        <Headline lead="One small shop," turn="three small requests." at={shopAt + 4} turnAt={asksAt} />

        {/* The checkout, working. */}
        {STEPS.map((s, i) => {
          const x = X0 + i * (STEP_W + STEP_GAP);
          return (
            <React.Fragment key={s}>
              <Box x={x} y={rowTop} w={STEP_W} h={BOX_H} at={shopAt + i * 4} title={s} lit={lit} dim={dim} />
              {i > 0 ? (
                <Flow points={[[x - STEP_GAP + 6, mid], [x - 8, mid]]} at={shopAt + i * 4 + 2} dur={8} color={BAR} width={2.4} head={12} dim={dim} />
              ) : null}
            </React.Fragment>
          );
        })}
        <Pill x={X0 + 5 * (STEP_W + STEP_GAP) - STEP_GAP + 44} y={mid - 21} at={worksAt} tone="ok" dim={dim}>
          ✓ works
        </Pill>

        {/* The three requests, each between a new piece and an edit. */}
        {REQUESTS.map((r, i) => {
          const top = y(REQ_TOP + i * REQ_PITCH);
          const at = reqAt[i];
          const rowMid = top + CARD.h / 2;
          const phase = (frame - landsAt) / 34 + i * 0.7;
          const k = (1 - Math.cos(Math.PI * Math.max(0, phase))) / 2;
          const bandX = NEW.x + (EDIT.x - NEW.x) * k - 6;
          const bandW = NEW.w + (EDIT.w - NEW.w) * k + 12;
          return (
            <React.Fragment key={r.id}>
              <Line x={X0} y={rowMid - 18} at={at} size={27} weight={600} dim={dim}>
                {r.text}
              </Line>
              <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: hover * (1 - ease(frame, dim, 12)) }}>
                <rect x={bandX} y={rowMid - OPT_H / 2 - 6} width={bandW} height={OPT_H + 12} rx={10} fill={HIGHLIGHT} />
              </svg>
              <Line x={NEW.x + NEW.w / 2} y={rowMid - 15} at={landsAt + i * 3} size={23} weight={600} color={OK_INK} align="center" width={NEW.w} dim={dim}>
                a new piece
              </Line>
              <Line x={EDIT.x + EDIT.w / 2} y={rowMid - 15} at={editAt + i * 3} size={23} weight={600} color={ACCENT_INK} align="center" width={EDIT.w} dim={dim}>
                an edit to working code
              </Line>
            </React.Fragment>
          );
        })}

        {/* Hairlines between the three columns: the requests, then each answer. */}
        <VRule x={735} top={y(REQ_TOP) + 12} bottom={y(REQ_TOP + 2 * REQ_PITCH) + CARD.h / 2 + 20} at={landsAt} dim={dim} />
        <VRule x={(NEW.x + NEW.w + EDIT.x) / 2} top={y(REQ_TOP) + 12} bottom={y(REQ_TOP + 2 * REQ_PITCH) + CARD.h / 2 + 20} at={editAt} dim={dim} />

        <ArtSpot id="armadillo" at={shopAt + 14} left={1494} top={y(468)} h={210} />

        {/* The round. */}
        <Line x={X0} y={chipsTop + 8} at={fifteenAt - 2} size={30} weight={600}>
          Fifteen questions<span style={{ opacity: ease(frame, shopOneAt, 10) }}>, on one shop</span>
        </Line>
        {Array.from({ length: 15 }, (_, i) => {
          const isBig = i < 8;
          const d = isBig ? big : small;
          const p = ease(frame, fifteenAt + 6 + i * 2, 10);
          const fill = isBig ? ease(frame, eightAt + i * 2, 10) : ease(frame, sevenAt + (i - 8) * 2, 10);
          const top = chipsTop + (big - d) / 2 + 4;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: chipX(i),
                top,
                width: d,
                height: d,
                borderRadius: d / 2,
                boxSizing: "border-box",
                border: `2.5px solid ${isBig ? BAR : ds("blue", 300)}`,
                background: isBig ? `color-mix(in srgb, ${BAR} ${Math.round(fill * 100)}%, ${PAPER})` : `color-mix(in srgb, ${ds("blue", 200)} ${Math.round(fill * 100)}%, ${PAPER})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: p,
                transform: `scale(${0.6 + 0.4 * p})`,
              }}
            >
              <span style={{ ...label(isBig ? 21 : 19, isBig && fill > 0.5 ? PAPER : isBig ? BLUE_INK : INK), fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
            </div>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
