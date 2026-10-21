import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { COUNTS_AFTER, REFUSED, ruleTag } from "./data";
import { Badge, Chip, Code, Drift, ErrorBox, Headline, lerp, LISTING_PAPER, pulse, SpanBracket, Spot, Strike, X0 } from "./parts";

const BLOCK_Y = 312;
const BLOCK_STEP = 180;
const BOX_W = 1270;
const RIGHT_X = 1470;
/** The building every program comes in through, and the programs under it. */
const BUILDING_Y = 300;
const BUILDING_H = 200;
const CHIP_Y0 = 492;
const CHIP_STEP = 58;
const CHIP_H = 50;
/** The bracket that shows how far a rule reaches. */
const REACH_X = RIGHT_X - 30;
const PROGRAMS = ["web app", "admin dashboard", "import job", "reporting script"] as const;

/**
 * Bad data starts small: three rows of the video's own, one for each rule
 * the lesson's shop schema already has. Postgres refuses each and names the
 * constraint (tagged as Fig. 4 marks it: UK, CHECK, FK); nothing gets in, as
 * the counts after show; and because the rule lives in the schema, its reach
 * is not one program's door but the whole building every program enters.
 */
export const GateScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const gateFrom = n.beat("gate").from;
  const getsAt = n.word("gate", "gets");
  const badAt = n.word("gate", "Bad");
  const kinds = [
    { label: "A customer entered twice", at: n.word("gate", "customer", { nth: 1 }) },
    { label: "A quantity of zero", at: n.word("gate", "quantity") },
    { label: "An order for a customer who isn't there", at: n.word("gate", "order") },
  ];
  const eachAt = n.word("refused", "each");
  const bouncesAt = n.word("refused", "bounces");
  const namesAt = n.word("refused", "names");
  const ruleAt = n.word("refused", "rule");
  const brokeAt = n.word("refused", "broke");
  const schemaAt = n.word("building", "schema");
  const appAt = n.word("building", "app's");
  const doorAt = n.word("building", "door");
  const wholeAt = n.word("building", "whole");
  const end = n.beat("orbiter").from;

  const blockY = (i: number) => y(BLOCK_Y + i * BLOCK_STEP);
  // One refusal at a time, from "each one bounces", so each can be read.
  const errAt = (i: number) => eachAt - 4 + i * 20;
  const nameAt = [namesAt, ruleAt, brokeAt];
  const wholeIn = ease(frame, wholeAt - 2, 14);
  const chipY = (i: number) => y(CHIP_Y0 + i * CHIP_STEP);
  const buildingTop = y(BUILDING_Y) + 12;
  // How far the rule reaches: one door (dashed, what it is not), then the building.
  const reachOne = ease(frame, doorAt - 4, 10) * (1 - ease(frame, wholeAt - 4, 10));
  const reachAll = ease(frame, wholeAt - 2, 16);

  return (
    <AbsoluteFill>
      {/* ── Sound: the building, each refusal, the reach of the rule ── */}
      <Sfx name="el-pop" at={getsAt - 4} level={-30} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="el-scratch" at={errAt(i) + 2} level={-34} />
      ))}
      <Sfx name="el-pencil" at={wholeAt - 2} level={-34} />

      {/* The beat's first sentence, then the one the blocks illustrate. */}
      <Headline lead="Design decides" turn="what gets in." at={gateFrom - 6} turnAt={getsAt - 4} out={badAt - 8} size={72} />
      <Headline lead="Bad data starts small." turn="It bounces." at={badAt - 2} turnAt={bouncesAt - 4} size={72} />

      <Drift from={gateFrom} to={end} amount={0.016} origin="35% 55%">
        {REFUSED.map((r, i) => {
          const tag = ruleTag(r);
          return (
            <React.Fragment key={r.sql}>
              <Ink at={kinds[i].at - 4} dur={14} style={{ left: X0, top: blockY(i), whiteSpace: "nowrap" }}>
                <span style={{ ...label(22, INK), fontWeight: 600 }}>{kinds[i].label}</span>
              </Ink>
              {/* The rule it broke, in the diagram's own marks, as Postgres names it. */}
              <Note at={nameAt[i] - 2} x={X0 + BOX_W} y={blockY(i) - 2} align="right">
                {/* "That rule lives in the schema": the three rules swell once, together. */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "baseline",
                    gap: 10,
                    whiteSpace: "nowrap",
                    transform: `scale(${1 + pulse(frame, schemaAt - 2 + i * 4, 20) * 0.08})`,
                    transformOrigin: "100% 50%",
                  }}
                >
                  <span style={note(21, INK_SOFT)}>breaks</span>
                  <Badge>{tag.badge}</Badge>
                  <span style={{ fontFamily: MONO, fontSize: 21, color: INK }}>{tag.text}</span>
                </span>
              </Note>
              <Ink at={kinds[i].at} dur={16} style={{ left: X0, top: blockY(i) + 38, width: BOX_W }}>
                <div style={{ background: LISTING_PAPER, borderTop: `2px solid ${INK}`, padding: "6px 20px", whiteSpace: "nowrap", fontSize: 22 }}>
                  <Strike at={errAt(i) + 4} tilt={-0.3}>
                    <Code line={r.sql} size={22} />
                  </Strike>
                </div>
              </Ink>
              <ErrorBox
                x={X0}
                top={blockY(i) + 92}
                width={BOX_W}
                at={errAt(i)}
                message={r.message}
                detail={r.detail}
                constraint={r.constraint}
                nameAt={nameAt[i]}
              />
            </React.Fragment>
          );
        })}
        {/* What the tables hold afterwards: what they held before. */}
        <Note at={brokeAt + 6} x={X0} y={blockY(2) + 212}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <span style={{ ...label(21, INK_SOFT), marginRight: 14 }}>Afterwards</span>
            {COUNTS_AFTER.customers} customers, {COUNTS_AFTER.orders} orders and {COUNTS_AFTER.order_items} order lines, as before.{" "}
            <span style={{ color: ACCENT_INK }}>Not one bad row got in.</span>
          </span>
        </Note>
      </Drift>

      {/* The building every program enters, from "what gets in", and the programs, under it. */}
      <Spot id="db-why-design-building" at={getsAt - 4} left={RIGHT_X} top={y(BUILDING_Y)} width={340} height={BUILDING_H} />
      {PROGRAMS.map((p, i) => {
        const lit = i === 0 ? ease(frame, doorAt - 4, 10) : wholeIn;
        return (
          <Chip
            key={p}
            at={appAt - 4 + i * 3}
            dim={i === 0 ? undefined : appAt + 6}
            x={RIGHT_X}
            y={chipY(i)}
            width={320}
            glow={Math.min(1, lit * 0.8 + pulse(frame, wholeAt + i * 4, 18) * 0.4)}
          >
            {p}
          </Chip>
        );
      })}
      {/* The dimmed three come back for the whole building. */}
      {PROGRAMS.slice(1).map((p, i) => (
        <Chip key={p} at={wholeAt - 2 + i * 4} x={RIGHT_X} y={chipY(i + 1)} width={320} glow={0.8}>
          {p}
        </Chip>
      ))}
      <SpanBracket x={REACH_X} y0={chipY(0) - 4} y1={chipY(0) + CHIP_H + 4} at={doorAt - 4} color={INK_SOFT} dashed opacity={reachOne > 0 ? 1 : 0} />
      <SpanBracket
        x={REACH_X}
        y0={lerp(chipY(0) - 4, buildingTop, reachAll)}
        y1={lerp(chipY(0) + CHIP_H + 4, chipY(3) + CHIP_H + 4, reachAll)}
        at={wholeAt - 2}
      />
    </AbsoluteFill>
  );
};
