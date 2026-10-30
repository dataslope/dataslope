import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, body, headline, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { Curve, Drift, fly, Headline, Kicker, Machine, OK_INK, Spot, X0 } from "./parts";

const ROWS = 12;
const BOX_X = X0;
const BOX_W = 250;
const BOX_TOP = 330;
const BOX_BOTTOM = 640;
const ROW_X = BOX_X + 20;
const ROW_W = 210;
const ROW_TOP = 372;
const PITCH = 30;
const ROW_H = 22;

const W_X = 650;
const W_W = 260;
const W_TOP = 330;
const W_PITCH = 82;
const W_H = 64;
const PIECE_X = W_X + 128;
const PIECE_W = 112;

const RES_X = 1160;
const RES_W = 170;
const RES_TOP = 522;
const RES_H = 92;

/** The machine that will be slow, or die, when the narration says so. */
const SLOW = 4;

/**
 * The opening: a table too tall for the one machine it sits on, cut into six
 * pieces that fly to six machines, whose answers come back together into one
 * result. The three things every answer turns on are then pinned to the
 * figure where they happen: the split, the network, the machine that is slow
 * or dies. Then the round: seventeen questions, fourteen worked through.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const startAt = n.word("hook", "The table");
  const fitsAt = n.word("hook", "no longer fits");
  const cutAt = n.word("hook", "cut it into pieces");
  const giveAt = n.word("hook", "give each machine one");
  const bringAt = n.word("hook", "bring their answers back together");
  const splitAt = n.word("hook-three", "how the work is split");
  const netAt = n.word("hook-three", "what has to cross the network");
  const slowAt = n.word("hook-three", "a machine is slow");
  const diesAt = n.word("hook-three", "dies");
  const planAt = n.word("plan", "Seventeen questions");
  const workedAt = n.word("plan", "fourteen worked through");
  const quickAt = n.word("plan", "three quick ones");
  const end = n.beat("plan").to;

  const workerTop = (k: number) => y(W_TOP + k * W_PITCH);
  const workerMid = (k: number) => workerTop(k) + h(W_H) / 2;
  const resMid = y(RES_TOP) + h(RES_H) / 2;
  const slow = ease(frame, slowAt, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={startAt + 4} level={-37} />
      <Sfx name="el-scratch" at={fitsAt + 4} level={-36} />
      <Sfx name="el-whoosh" at={cutAt + 4} level={-35} />
      <Sfx name="el-pencil" at={bringAt} level={-37} />
      <Sfx name="el-tap" at={splitAt} level={-36} />
      <Sfx name="el-tap" at={netAt} level={-36} />
      <Sfx name="el-tap" at={slowAt} level={-35} />
      <Sfx name="el-chime" at={planAt} level={-35} />

      <Drift from={0} to={end + 30}>
        <Kicker at={startAt}>Data engineer interview prep · Distributed processing</Kicker>
        <Headline lead="Too big for one machine." turn="Cut it into pieces." at={startAt + 2} turnAt={cutAt - 2} size={70} />
        <Spot id="de-distributed-honeybee" at={startAt + 14} left={1430} top={y(268)} width={400} height={313} />

        {/* The one machine, and a table that no longer fits on it. */}
        <Machine
          x={BOX_X}
          top={y(BOX_TOP)}
          width={BOX_W}
          height={y(BOX_BOTTOM) - y(BOX_TOP)}
          at={startAt}
          name="one machine"
          tone="bad"
          toneAt={fitsAt + 2}
          dim={giveAt + 20}
        />
        <Note at={fitsAt + 6} x={BOX_X + BOX_W + 14} y={y(BOX_BOTTOM) + h(20)} out={cutAt + 10}>
          <span style={{ ...label(22, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>doesn&apos;t fit</span>
        </Note>

        {/* Six machines, a piece each. */}
        {Array.from({ length: 6 }, (_, k) => (
          <React.Fragment key={k}>
            <Machine
              x={W_X}
              top={workerTop(k)}
              width={W_W}
              height={h(W_H)}
              at={giveAt - 6 + k * 2}
              tone={k === SLOW ? "bad" : "plain"}
              toneAt={k === SLOW ? slowAt : undefined}
            />
            <Note at={giveAt - 2 + k * 2} x={W_X + 16} y={workerMid(k) - 14}>
              <span style={{ ...label(21, k === SLOW && slow > 0.5 ? ACCENT_INK : INK_SOFT), whiteSpace: "nowrap" }}>machine {k + 1}</span>
            </Note>
            <Curve from={[BOX_X + BOX_W + 6, y(485)]} to={[W_X - 8, workerMid(k)]} at={giveAt + k * 2} dur={16} color={INK_SOFT} width={1.6} head={11} />
            <Curve
              from={[W_X + W_W + 8, workerMid(k)]}
              to={[RES_X - 8, resMid + (k - 2.5) * 10]}
              at={bringAt + k * 2}
              dur={16}
              color={BAR}
              width={1.8}
              head={11}
              dim={k === SLOW ? diesAt : undefined}
            />
          </React.Fragment>
        ))}

        {/* The table's rows: first on the one machine, then a piece on each of six. */}
        {Array.from({ length: ROWS }, (_, i) => {
          const appear = ease(frame, startAt + 6 + i * 2, 10);
          const k = Math.floor(i / 2);
          const go = ease(frame, cutAt + 4 + k * 4, 24);
          const over = y(ROW_TOP + i * PITCH) + h(ROW_H) > y(BOX_BOTTOM);
          const red = over ? ease(frame, fitsAt + 4, 10) * (1 - go) : 0;
          const a: [number, number] = [ROW_X, y(ROW_TOP + i * PITCH)];
          const b: [number, number] = [PIECE_X, workerTop(k) + h(13) + (i % 2) * h(22)];
          const pose = go > 0 ? fly(go, a, b, 24) : { x: a[0], top: a[1] };
          const w = ROW_W + (PIECE_W - ROW_W) * go;
          const color = slow > 0 && k === SLOW ? `color-mix(in srgb, ${ACCENT} ${slow * 100}%, ${BAR})` : BAR;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: pose.x,
                top: pose.top,
                width: w,
                height: h(ROW_H) * (1 - 0.18 * go),
                borderRadius: 3,
                background: `color-mix(in srgb, ${red > 0 ? `color-mix(in srgb, ${ACCENT} ${red * 100}%, ${color})` : color} 38%, ${PAPER})`,
                borderLeft: `4px solid ${red > 0 ? ACCENT : color}`,
                opacity: appear * (k === SLOW ? 1 - 0.55 * ease(frame, diesAt, 12) : 1),
                transform: pose.turn ? `rotate(${pose.turn}deg)` : undefined,
              }}
            />
          );
        })}
        {/* One result. */}
        <Machine x={RES_X} top={y(RES_TOP)} width={RES_W} height={h(RES_H)} at={bringAt + 10} tone="ok" fill={`color-mix(in srgb, ${ds("green", 100)} 60%, ${PAPER})`} />
        <Note at={bringAt + 14} x={RES_X} y={resMid - 16} width={RES_W} align="left" style={{ textAlign: "center" }}>
          <span style={{ ...label(23, OK_INK), fontWeight: 700 }}>one result</span>
        </Note>

        {/* What every answer turns on, where it happens. */}
        <Note at={splitAt - 2} x={BOX_X + BOX_W + 14} y={y(278)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: ACCENT_INK }}>1</b> how the work is split
          </span>
        </Note>
        <Note at={netAt - 2} x={W_X + W_W + 20} y={y(278)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: ACCENT_INK }}>2</b> what crosses the network
          </span>
        </Note>
        <Note at={slowAt - 2} x={W_X} y={y(W_TOP + 6 * W_PITCH) + h(4)}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: ACCENT_INK }}>3</b> a machine slow, or dead
          </span>
        </Note>

        {/* The round. */}
        <Note at={planAt - 2} x={RES_X} y={y(680)}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 12, whiteSpace: "nowrap" }}>
            <span style={{ ...headline(56), color: BLUE_INK }}>17</span>
            <span style={body(30)}>questions</span>
          </span>
        </Note>
        <Note at={workedAt - 2} x={RES_X} y={y(752)}>
          <span style={{ ...label(24, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>14</b> worked through
            <span style={{ opacity: ease(frame, quickAt - 2, 10), color: INK_SOFT }}>
              {" · "}
              <b style={{ color: INK }}>3</b> quick ones
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
