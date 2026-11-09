import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Illustration } from "../../components/Illustration";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONTY, pct, VIDEO } from "./data";
import { Drift, ElbowArrow, lerp, OK, OK_INK, pulse, Svg } from "./parts";

/** Three slots `w` wide; each door is painted `h` tall at its own aspect. */
const DOOR = { w: 220, h: 300, top: 430, xs: [160, 480, 800] };
/** How far the mats under your pick and the winning door reach past it. */
const MAT = 12;

/** A painting by its size and the box its drawn content fills (x0, y0, x1,
 *  y1, in the WebP's own pixels). */
type Art = { id: string; w: number; h: number; box: readonly [number, number, number, number] };
/** The door shut (ds-probability-door) and swung open onto a goat
 *  (ds-probability-door-goat): one blue frame, so each is placed by it and
 *  the one crossfades into the other as the door opens. */
const SHUT: Art = { id: "ds-probability-door", w: 635, h: 1022, box: [32, 14, 603, 1001] };
const OPEN: Art = { id: "ds-probability-door-goat", w: 653, h: 1024, box: [32, 15, 621, 1003] };
const DOOR_ASPECT = (SHUT.box[2] - SHUT.box[0]) / (SHUT.box[3] - SHUT.box[1]);

const fitArt = (art: Art, left: number, top: number, width: number, height: number): React.CSSProperties => {
  const [x0, y0, x1, y1] = art.box;
  const sx = width / (x1 - x0);
  const sy = height / (y1 - y0);
  return { position: "absolute", left: left - x0 * sx, top: top - y0 * sy, width: art.w * sx, height: art.h * sy, objectFit: "fill" };
};

/** A painted door, its frame `height` tall, centered on `cx`, swinging open
 *  on `open`: the open painting fades in over the shut one. */
const PaintedDoor: React.FC<{ cx: number; top: number; height: number; open: number; opacity: number }> = ({ cx, top, height, open, opacity }) => {
  const width = height * DOOR_ASPECT;
  const left = cx - width / 2;
  return (
    <>
      {open < 1 ? <Illustration video={VIDEO} id={SHUT.id} style={{ ...fitArt(SHUT, left, top, width, height), opacity: opacity * Math.min(1, 2 * (1 - open)) }} /> : null}
      {open > 0 ? <Illustration video={VIDEO} id={OPEN.id} style={{ ...fitArt(OPEN, left, top, width, height), opacity: opacity * open }} /> : null}
    </>
  );
};
const SIM = { x: 1200, w: 560, top: 470, row: 120, bar: 54 };

/**
 * Question 11. Three doors: yours lit, the host opening the third onto a
 * goat, and the switch drawn under them. The 1/3 sits over your door and the
 * 2/3 over the other two, then closes onto the one the host left shut. The
 * page's own 100,000 games (seed 7) close it: 33% against 67%.
 */
export const MontyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("monty").from;
  const qAt = n.word("monty", "Question");
  const textAt = n.word("monty", "Explain the Monty Hall problem");
  const doorsAt = n.word("monty-setup", "Three doors");
  const pickAt = n.word("monty-setup", "You pick a door");
  const hostAt = n.word("monty-setup", "The host");
  const goatAt = n.word("monty-setup", "onto a goat");
  const switchAt = n.word("monty-setup", "offers you the switch");
  const takeAt = n.word("monty-switch", "Take it");
  const thirdAt = n.word("monty-switch", "one time in three");
  const neverAt = n.word("monty-host", "never opens the car");
  const twoThirdsAt = n.word("monty-host", "the other two thirds");
  const landAt = n.word("monty-host", "land on the one door");
  const gamesAt = n.word("monty-sim", "A hundred thousand games");
  const stayAt = n.word("monty-sim", "staying wins");
  const switchingAt = n.word("monty-sim", "switching sixty-seven");
  const end = n.beat("monty-sim").to;

  const doorTop = y(DOOR.top);
  const doorH = h(DOOR.h);
  const open = ease(frame, goatAt, 16);
  const mine = ease(frame, pickAt, 12);
  // Clear of the mats round the doors.
  const bracketY = doorTop - 36;
  // The two thirds over doors 2 and 3, closing onto door 2.
  const closeOn = ease(frame, landAt, 18);
  const twoX0 = DOOR.xs[1];
  const twoX1 = lerp(DOOR.xs[2] + DOOR.w, DOOR.xs[1] + DOOR.w, closeOn);
  const twoP = ease(frame, twoThirdsAt, 14);
  const oneP = ease(frame, thirdAt, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={doorsAt + 2} level={-34} />
      <Sfx name="el-tap" at={pickAt + 2} level={-32} />
      <Sfx name="swish" at={goatAt} level={-32} />
      <Sfx name="el-pencil" at={switchAt + 2} level={-34} />
      <Sfx name="slide" at={landAt + 2} level={-30} />
      <Sfx name="el-pop" at={stayAt + 2} level={-34} />
      <Sfx name="el-pop" at={switchingAt + 2} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} size={60}>
          Explain the Monty Hall problem.
        </QuestionCard>

        {/* ── Three doors ── */}
        {DOOR.xs.map((x, i) => {
          const p = ease(frame, doorsAt + i * 3, 12);
          if (p <= 0) return null;
          const isOpen = i === 2 ? open : 0;
          const lit = i === 0 ? mine : 0;
          const won = i === 1 ? closeOn : 0;
          const cx = x + DOOR.w / 2;
          const dw = doorH * DOOR_ASPECT;
          return (
            <React.Fragment key={x}>
              {/* Your pick sits on a highlighter mat; the door the two thirds
                  land on, on a green one. */}
              {lit > 0 || won > 0 ? (
                <Svg opacity={p}>
                  <rect
                    x={cx - dw / 2 - MAT}
                    y={doorTop - MAT}
                    width={dw + 2 * MAT}
                    height={doorH + 2 * MAT}
                    rx={12}
                    fill={`color-mix(in srgb, ${OK} ${won * 40}%, color-mix(in srgb, ${HIGHLIGHT} ${lit * 100}%, transparent))`}
                    stroke={OK}
                    strokeWidth={2 + 2 * won}
                    strokeOpacity={won > 0.5 ? 1 : 0}
                  />
                </Svg>
              ) : null}
              <PaintedDoor cx={cx} top={doorTop} height={doorH} open={isOpen} opacity={p} />
              {/* The door's number, on a card on its bottom rail; it goes with
                  the door when it swings open. */}
              <div
                style={{
                  position: "absolute",
                  left: cx - 19,
                  top: doorTop + doorH - 62,
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  background: PAPER,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: p * (1 - isOpen),
                  ...label(24, INK),
                  fontWeight: 500,
                  ...TABULAR,
                }}
              >
                {i + 1}
              </div>
            </React.Fragment>
          );
        })}
        {/* Under the open door, not over the goat it shows. */}
        <Note at={goatAt + 8} x={DOOR.xs[2]} width={DOOR.w} y={doorTop + doorH + 16} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...note(30, INK), fontWeight: 500 }}>goat</span>
        </Note>
        <Note at={pickAt + 4} x={DOOR.xs[0]} width={DOOR.w} y={doorTop + 40} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...note(26, INK), fontWeight: 500, background: PAPER, padding: "2px 10px", borderRadius: 6 }}>your pick</span>
        </Note>
        <Note at={hostAt + 2} x={DOOR.xs[2]} width={DOOR.w} y={doorTop - 46} from="up" out={thirdAt} style={{ textAlign: "center" }}>
          <span style={{ ...label(22, INK_SOFT) }}>the host opens</span>
        </Note>
        {/* Under the doors, clear of the mats round them. */}
        <ElbowArrow
          points={[
            [DOOR.xs[0] + DOOR.w / 2, doorTop + doorH + MAT + 14],
            [DOOR.xs[0] + DOOR.w / 2, doorTop + doorH + 80],
            [DOOR.xs[1] + DOOR.w / 2, doorTop + doorH + 80],
            [DOOR.xs[1] + DOOR.w / 2, doorTop + doorH + MAT + 16],
          ]}
          at={switchAt}
          dur={20}
          color={INK}
          width={3}
        />
        <Note at={takeAt} x={DOOR.xs[0] + DOOR.w / 2 + 20} y={doorTop + doorH + 88}>
          <span style={{ ...note(26, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>switch</span>
        </Note>

        {/* ── One third on yours, two thirds on the rest ── */}
        <Svg>
          <path
            d={`M${DOOR.xs[0]},${bracketY + 10} L${DOOR.xs[0]},${bracketY} L${DOOR.xs[0] + DOOR.w},${bracketY} L${DOOR.xs[0] + DOOR.w},${bracketY + 10}`}
            fill="none"
            stroke={INK}
            strokeWidth={2.2}
            opacity={oneP}
          />
          <path
            d={`M${twoX0},${bracketY + 10} L${twoX0},${bracketY} L${twoX1},${bracketY} L${twoX1},${bracketY + 10}`}
            fill="none"
            stroke={closeOn > 0.5 ? OK : INK}
            strokeWidth={2.2 + 1.4 * closeOn}
            opacity={twoP}
          />
        </Svg>
        <Note at={thirdAt} x={DOOR.xs[0]} width={DOOR.w} y={bracketY - 46} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...label(30, INK), ...TABULAR }}>1/3</span>
        </Note>
        <Note at={twoThirdsAt} x={(twoX0 + twoX1) / 2 - 100} width={200} y={bracketY - 46} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...label(30 + 4 * pulse(frame, landAt + 10, 20), closeOn > 0.5 ? OK_INK : INK), ...TABULAR }}>2/3</span>
        </Note>
        <Note at={neverAt} x={DOOR.xs[2]} width={DOOR.w} y={doorTop + doorH + 70} from="up" style={{ textAlign: "center" }}>
          <span style={{ ...label(21, INK_SOFT) }}>never the car</span>
        </Note>

        {/* ── The page's 100,000 games ── */}
        <Note at={gamesAt} x={SIM.x} y={y(SIM.top) - 60}>
          <span style={{ ...label(24, INK), ...TABULAR, whiteSpace: "nowrap" }}>{MONTY.trials.toLocaleString("en-US")} games</span>
        </Note>
        {[
          { name: "stay", share: MONTY.stay, at: stayAt, color: ACCENT, ink: INK },
          { name: "switch", share: MONTY.switch, at: switchingAt, color: OK, ink: OK_INK },
        ].map((r, i) => {
          const p = ease(frame, r.at, 18);
          const top = y(SIM.top) + i * SIM.row;
          return (
            <React.Fragment key={r.name}>
              <Note at={r.at - 2} x={SIM.x} y={top}>
                <span style={{ ...note(28, INK), fontWeight: 500 }}>{r.name}</span>
              </Note>
              <Svg>
                <rect x={SIM.x} y={top + 44} width={SIM.w * r.share * p} height={SIM.bar} rx={4} fill={r.color} opacity={0.85} />
              </Svg>
              <Note at={r.at + 10} x={SIM.x + SIM.w * r.share + 16} y={top + 52}>
                <span style={{ ...label(30, r.ink), ...TABULAR }}>{pct(r.share)}</span>
              </Note>
            </React.Fragment>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
