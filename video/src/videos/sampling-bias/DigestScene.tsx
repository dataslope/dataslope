import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, HAIRLINE, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { H, ILLUSTRATIONS, PER_SQUARE, RETURNED_SQUARES, SQUARES, VIDEO } from "./data";
import { Bracket, DOT, EASY, EASY_INK, RANDOM, RANDOM_INK, RAW, Underline } from "./parts";
import { Marker } from "../sampling/emphasis";

/** The ballot grid: ten rows of ten squares. */
const GRID = { x: 160, y: 452, cell: 31, gap: 6 };
const COLS = 10;
/** Fig. 5's scale, Roosevelt's share of the two-party vote. */
const SHARE = { lo: 35, hi: 70, x0: 1100, x1: 1720 };
const px = (v: number) => SHARE.x0 + ((v - SHARE.lo) / (SHARE.hi - SHARE.lo)) * (SHARE.x1 - SHARE.x0);
const ROWS = { digest: 506, gallup: 612, result: 718 };
const SCALE_Y = 778;
const LABEL_X = 740;

/**
 * 1936: the Literary Digest's ten million ballots and 2.4 million replies
 * against Gallup's far smaller, matched sample, and the election.
 */
export const DigestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  const digestFrom = n.beat("digest").from;
  const yearAt = n.word("digest", "nineteen thirty-six");
  const mailedAt = n.word("digest", "mailed");
  const tenAt = n.word("digest", "ten million");
  const backFrom = n.beat("back").from;
  const hugeAt = n.word("back", "huge");
  const leanedAt = n.word("back", "leaned");
  const callFrom = n.beat("call").from;
  const fortyAt = n.word("call", "forty-three");
  const gallupFrom = n.beat("gallup").from;
  const fiftyAt = n.word("gallup", "fifty-six");
  const resultFrom = n.beat("result").from;
  const sixtyAt = n.word("result", "sixty-two");
  const statesAt = n.word("result", "every state");
  const lessonFrom = n.beat("lesson").from;
  const whoAt = n.word("lesson", "who");

  // The sack arrives with the poll's name, the ballots with "mailed".
  const digestNameAt = n.word("digest", "Literary Digest");
  const sack = ILLUSTRATIONS ? pop(frame, digestNameAt - 4, fps, 16) : 0;
  const scaleIn = ease(frame, callFrom - 6, 16);

  return (
    <AbsoluteFill>
      {/* The ballots riffle out, the replies tap in one square at a time, each
          forecast and the result land on the scale, and the gap is drawn. */}
      <Sfx name="riffle" at={tenAt - 4} level={-31} />
      <Sfx name="swish" at={leanedAt} level={-34} />
      <Sfx name="fill-roll" at={backFrom + 6} level={-29} />
      <Sfx name="tock-high" at={fortyAt - 2} level={-24} />
      <Sfx name="tock-mid" at={fiftyAt - 2} level={-24} />
      <Sfx name="tock-low" at={sixtyAt - 2} level={-24} />
      <Sfx name="swish-long" at={sixtyAt + 8} level={-37} />
      <Sfx name="swish" at={lessonFrom - 2} level={-34} />

      <Ink at={digestFrom - 4} dur={14} style={{ left: 96, top: y(112) }}>
        <span style={label(20, INK_SOFT)}>
          The <Marker at={yearAt - 2}>1936</Marker> presidential race
        </span>
      </Ink>
      <Ink at={digestFrom - 2} dur={20} style={{ left: 92, top: y(150), ...headline(84), whiteSpace: "nowrap" }}>
        Ten million ballots.
      </Ink>
      <Ink at={backFrom - 2} dur={20} style={{ left: 92, top: y(246), ...headline(84, true), whiteSpace: "nowrap" }}>
        Who sent them <Underline at={leanedAt}>back?</Underline>
      </Ink>
      {sack > 0.001 ? (
        <Illustration
          video={VIDEO}
          id="sampling-bias-mail-sack"
          style={{
            position: "absolute",
            left: 1330,
            top: y(100),
            width: 450,
            height: 300,
            opacity: sack,
            transform: `translateY(${bob(frame, 5, 110) + (1 - sack) * 30}px)`,
          }}
        />
      ) : null}

      {/* ── Fig. 4: the ballots ── */}
      <FigLabel n="4" title="The Literary Digest's poll" at={mailedAt - 6} x={160} y={y(384)} />
      <Ballots mailedAt={tenAt - 4} backAt={backFrom} />
      <Note at={tenAt + 6} x={GRID.x} y={y(GRID.y + COLS * (GRID.cell + GRID.gap) + 12)}>
        <div style={note(21, INK_SOFT)}>Each square: {PER_SQUARE.toLocaleString("en-US")} ballots mailed</div>
      </Note>
      <Note at={backFrom + 4} x={GRID.x} y={y(GRID.y + COLS * (GRID.cell + GRID.gap) + 46)}>
        <div style={{ ...note(22, INK), fontWeight: 650 }}>
          {RETURNED_SQUARES} came back: nearly {fmt(H.digestReturned / 1e6, 1)} million replies
        </div>
      </Note>
      <Note at={hugeAt + 2} x={GRID.x + COLS * (GRID.cell + GRID.gap) + 24} y={y(GRID.y + 4)} out={callFrom - 12}>
        <div style={{ ...body(30, true), color: INK }}>A huge sample,</div>
        <div style={{ ...body(30, true), color: INK }}>
          and a <span style={{ color: EASY_INK }}>self-chosen</span> one.
        </div>
      </Note>

      {/* ── Fig. 5: the forecasts and the result ── */}
      <FigLabel n="5" title="Roosevelt's share of the votes for him and Landon" at={callFrom - 6} x={LABEL_X} y={y(384)} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: scaleIn }}>
        <line x1={SHARE.x0} x2={SHARE.x1} y1={y(SCALE_Y)} y2={y(SCALE_Y)} stroke={INK} strokeWidth={1.6} />
        {[40, 50, 60, 70].map((v) => (
          <g key={v}>
            <line x1={px(v)} x2={px(v)} y1={y(SCALE_Y)} y2={y(SCALE_Y) + 7} stroke={INK} strokeWidth={1.2} />
            {v === 50 ? (
              <line
                x1={px(v)}
                x2={px(v)}
                y1={y(ROWS.digest - 44)}
                y2={y(SCALE_Y)}
                stroke={HAIRLINE}
                strokeWidth={1.4}
                strokeDasharray="2 6"
              />
            ) : null}
          </g>
        ))}
      </svg>
      {[40, 50, 60, 70].map((v) => (
        <div
          key={v}
          style={{
            position: "absolute",
            left: px(v),
            top: y(SCALE_Y) + 12,
            transform: "translateX(-50%)",
            opacity: scaleIn,
            ...note(21, INK_SOFT),
          }}
        >
          {v}%
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          right: 1920 - SHARE.x1,
          top: y(SCALE_Y) + 44,
          opacity: scaleIn,
          whiteSpace: "nowrap",
          ...note(20, INK_SOFT),
        }}
      >
        Roosevelt&apos;s share of the two-party vote
      </div>
      <Note at={callFrom + 6} x={px(50) + 10} y={y(ROWS.digest - 62)} out={lessonFrom - 6}>
        <span style={{ ...note(20, INK_SOFT), ...halo }}>Roosevelt wins</span>
      </Note>
      <Note at={callFrom + 6} x={px(50) - 10} y={y(ROWS.digest - 62)} align="right" from="right" out={lessonFrom - 6}>
        <span style={{ ...note(20, INK_SOFT), ...halo }}>Landon wins</span>
      </Note>

      <Row
        y={ROWS.digest}
        at={callFrom}
        dotAt={fortyAt - 4}
        name="Literary Digest"
        sub="2.4 million replies"
        value={H.digestRooseveltShare}
        color={EASY}
        ink={EASY_INK}
        named
      />
      <Row
        y={ROWS.gallup}
        at={gallupFrom}
        dotAt={fiftyAt - 4}
        name="Gallup"
        sub="far fewer, matched to voters"
        value={H.gallupRooseveltShare}
        color={RANDOM}
        ink={RANDOM_INK}
      />
      <Row
        y={ROWS.result}
        at={resultFrom}
        dotAt={sixtyAt - 4}
        name="The election"
        sub={`Roosevelt won ${H.statesRoosevelt} of ${H.statesTotal} states`}
        subAt={statesAt}
        value={H.resultRooseveltShare}
        color={INK}
        ink={INK}
      />

      {/* The truth, carried up through the forecasts, and the Digest's miss. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line
          x1={px(H.resultRooseveltShare)}
          x2={px(H.resultRooseveltShare)}
          y1={y(ROWS.result)}
          y2={y(ROWS.result) + (y(ROWS.digest - 40) - y(ROWS.result)) * ease(frame, sixtyAt + 8, 18)}
          stroke={INK}
          strokeWidth={2}
          strokeDasharray="7 6"
          opacity={frame >= sixtyAt + 8 ? 1 : 0}
        />
      </svg>
      <Bracket
        x0={px(H.digestRooseveltShare)}
        x1={px(H.resultRooseveltShare)}
        y={y(ROWS.digest - 34)}
        at={lessonFrom - 2}
        color={EASY}
      />
      <Note at={lessonFrom + 4} x={(px(H.digestRooseveltShare) + px(H.resultRooseveltShare)) / 2} y={y(ROWS.digest - 74)} from="up">
        <span style={{ display: "inline-block", transform: "translateX(-50%)", whiteSpace: "nowrap", ...halo }}>
          <span style={{ ...note(24, EASY_INK), fontWeight: 700 }}>
            {fmt(H.resultRooseveltShare - H.digestRooseveltShare, 1)} points
          </span>
          <span style={note(21, INK_SOFT)}> off</span>
        </span>
      </Note>

      <Ink at={whoAt - 8} dur={20} style={{ left: LABEL_X, top: y(842), ...body(36, true), color: INK, whiteSpace: "nowrap" }}>
        Size could not fix <span style={{ color: EASY_INK }}>who was answering.</span>
      </Ink>
    </AbsoluteFill>
  );
};

/** One hundred squares, each a hundred thousand ballots: drawn as outlines
 *  on "ten million", and the first 24 filled in as the replies come back. */
const Ballots: React.FC<{ mailedAt: number; backAt: number }> = ({ mailedAt, backAt }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: SQUARES }, (_, i) => {
        const p = ease(frame, mailedAt + i * 0.35, 8);
        if (p <= 0) return null;
        const r = Math.floor(i / COLS);
        const c = i % COLS;
        const x = GRID.x + c * (GRID.cell + GRID.gap);
        const top = GRID.y + r * (GRID.cell + GRID.gap);
        const filled = i < RETURNED_SQUARES ? ease(frame, backAt + 4 + i * 1.2, 8) : 0;
        return (
          <g key={i} opacity={p}>
            <rect
              x={x + 0.75}
              y={y(top) + 0.75}
              width={GRID.cell - 1.5}
              height={h(GRID.cell) - 1.5}
              fill={RAW}
              fillOpacity={0.35}
              stroke={INK_SOFT}
              strokeWidth={1.5}
            />
            {filled > 0 ? (
              <rect x={x} y={y(top)} width={GRID.cell} height={h(GRID.cell)} fill={DOT} opacity={filled} />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};

/** A forecast or a result: its name, and a dot on the share scale. */
const Row: React.FC<{
  y: number;
  at: number;
  dotAt: number;
  name: string;
  sub: string;
  subAt?: number;
  value: number;
  color: string;
  ink: string;
  /** Name whose share the value is, left of the dot. */
  named?: boolean;
}> = ({ y: rowY, at, dotAt, name, sub, subAt, value, color, ink, named = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { y } = useLayout();
  const dot = pop(frame, dotAt, fps, 13);
  const x = px(value);
  return (
    <>
      <Note at={at} x={LABEL_X} y={y(rowY) - 26}>
        <div style={{ ...label(24, ink) }}>{name}</div>
      </Note>
      <Note at={subAt ?? at + 6} x={LABEL_X} y={y(rowY) + 6}>
        <div style={note(20, INK_SOFT)}>{sub}</div>
      </Note>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: ease(frame, at, 12) }}>
        <line x1={SHARE.x0} x2={SHARE.x1} y1={y(rowY)} y2={y(rowY)} stroke={HAIRLINE} strokeWidth={1} opacity={0.6} />
        {dot > 0.01 ? <circle cx={x} cy={y(rowY)} r={12 * dot} fill={color} /> : null}
      </svg>
      {/* A share under 50% sits on the "Landon wins" side, where a bare
          42.9% reads as Landon's. So that row says whose share it is, and
          sits left of its dot, clear of the 50% line. */}
      <div
        style={{
          position: "absolute",
          ...(named ? { right: 1920 - (x - 22) } : { left: x + 22 }),
          top: y(rowY) - 17,
          opacity: ease(frame, dotAt + 6, 10),
          whiteSpace: "nowrap",
          ...halo,
        }}
      >
        {named ? <span style={note(22, INK_SOFT)}>Roosevelt </span> : null}
        <span style={{ ...note(26, ink), fontWeight: 700 }}>{fmt(value, 1)}%</span>
      </div>
    </>
  );
};
