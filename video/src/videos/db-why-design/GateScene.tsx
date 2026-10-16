import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COUNTS_AFTER, REFUSED } from "./data";
import { Chip, Code, Drift, ErrorBox, Headline, LISTING_PAPER, pulse, Spot, Strike, X0 } from "./parts";

const BLOCK_Y = 312;
const BLOCK_STEP = 180;
const BOX_W = 1270;
const RIGHT_X = 1470;
const PROGRAMS = ["web app", "admin dashboard", "import job", "reporting script"] as const;

/**
 * Bad data starts small: three rows of the video's own, one for each rule
 * the lesson's shop schema already has. Postgres refuses each and names the
 * constraint; nothing gets in; and because the rule lives in the schema, it
 * guards every program at once.
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
    { label: "A customer entered twice", at: n.word("gate", "customer") },
    { label: "A quantity of zero", at: n.word("gate", "quantity") },
    { label: "An order for a customer who isn't there", at: n.word("gate", "order") },
  ];
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
  const errAt = (i: number) => bouncesAt - 4 + i * 6;
  const nameAt = [namesAt, ruleAt, brokeAt];
  const wholeIn = ease(frame, wholeAt - 2, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: each bad row offered, each refusal, the building ── */}
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="el-scratch" at={errAt(i) + 2} level={-32} />
      ))}
      <Sfx name="el-pop" at={schemaAt - 4} level={-30} />

      <Headline lead="Bad data starts small." turn="It bounces." at={gateFrom - 6} turnAt={bouncesAt - 4} size={72} />
      <Ink at={getsAt - 4} dur={16} out={badAt + 4} style={{ left: 96, top: y(248), whiteSpace: "nowrap" }}>
        <span style={{ ...body(32, true), color: INK_SOFT }}>Design decides what gets in.</span>
      </Ink>

      <Drift from={gateFrom} to={end} amount={0.016} origin="35% 55%">
        {REFUSED.map((r, i) => (
          <React.Fragment key={r.sql}>
            <Ink at={kinds[i].at - 4} dur={14} style={{ left: X0, top: blockY(i), whiteSpace: "nowrap" }}>
              <span style={{ ...label(22, INK), fontWeight: 600 }}>{kinds[i].label}</span>
            </Ink>
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
        ))}
      </Drift>

      {/* What the tables hold afterwards, then the building every program enters. */}
      <Note at={brokeAt + 4} x={RIGHT_X} y={blockY(0) + 4} out={schemaAt - 6}>
        <div style={label(21, INK_SOFT)}>Still in the tables</div>
        <div style={{ ...note(24, INK), marginTop: 12, lineHeight: 1.5 }}>
          {COUNTS_AFTER.customers} customers
          <br />
          {COUNTS_AFTER.orders} orders
          <br />
          {COUNTS_AFTER.order_items} order lines
        </div>
        <div style={{ ...note(21, INK_SOFT), marginTop: 12, whiteSpace: "nowrap" }}>Not one bad row got in.</div>
      </Note>
      <Spot id="db-why-design-building" at={schemaAt - 4} left={RIGHT_X} top={y(300)} width={340} height={200} />
      {PROGRAMS.map((p, i) => {
        const lit = i === 0 ? ease(frame, doorAt - 4, 10) : wholeIn;
        return (
          <Chip
            key={p}
            at={appAt - 4 + i * 3}
            dim={i === 0 ? undefined : appAt + 6}
            x={RIGHT_X}
            y={y(588 + i * 60)}
            width={320}
            glow={Math.min(1, lit * 0.8 + pulse(frame, wholeAt + i * 4, 18) * 0.4)}
          >
            {p}
          </Chip>
        );
      })}
      {/* The dimmed three come back for the whole building. */}
      {PROGRAMS.slice(1).map((p, i) => (
        <Chip key={p} at={wholeAt - 2 + i * 4} x={RIGHT_X} y={y(588 + (i + 1) * 60)} width={320} glow={0.8}>
          {p}
        </Chip>
      ))}
    </AbsoluteFill>
  );
};
