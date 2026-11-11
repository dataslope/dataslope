import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { artBox, Drift, Flow, Headline, Kicker, Mark, Node, Pill, SERIES, Spot, X0 } from "./parts";

/** The three boxes of a backend, and the gaps their APIs cross. */
const ROW = 330;
const BOX_H = 96;
const BOXES = [
  { x: X0, w: 220, title: "client", tone: "plain" as const },
  { x: 560, w: 250, title: "service", tone: "data" as const },
  { x: 1060, w: 250, title: "service", tone: "data" as const },
];
const GAPS = [0, 1].map((i) => ({ from: BOXES[i].x + BOXES[i].w, to: BOXES[i + 1].x }));

/** The plan: ten worked through, six quick. */
const BIG = 44;
const SMALL = 30;

/**
 * The opening: any backend drawn as boxes, every arrow between two of them an
 * API, one side asking and the other answering; the three things the
 * interview tests the design for; the page's blog, its two resources; and the
 * round, sixteen questions as ten squares and six smaller ones.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const backendAt = n.word("hook", "Draw any backend");
  const arrowAt = n.word("hook", "every arrow between two boxes");
  const apiAt = n.word("hook", "is an API");
  const asksAt = n.word("hook", "one side asks");
  const answersAt = n.word("hook", "the other answers");
  const agreeAt = n.word("hook", "both must agree on how");
  const predAt = n.word("hook", "predictable");
  const consAt = n.word("hook", "consistent");
  const misuseAt = n.word("hook", "hard to misuse");
  const blogAt = n.word("hook-blog", "a blog");
  const articlesAt = n.word("hook-blog", "with articles");
  const commentsAt = n.word("hook-blog", "their comments");
  const sixteenAt = n.word("plan", "Sixteen questions");
  const tenAt = n.word("plan", "Ten are worked through");
  const sixAt = n.word("plan", "six go quickly");
  const end = n.beat("plan").to;

  const top = y(ROW);
  const mid = top + BOX_H / 2;
  // A request rides each top arrow on "asks", a reply each bottom one on
  // "answers".
  const ride = (at: number) => ease(frame, at, 22);
  const ask = ride(asksAt);
  const answer = ride(answersAt);
  const rideOn = (at: number) => (frame >= at && frame < at + 26 ? 1 : 0);

  const blogTop = y(590);
  const puffin = artBox("puffin", 360);
  const planTop = y(800);

  return (
    <AbsoluteFill>
      {BOXES.map((b, i) => (
        <Sfx key={i} name="el-tap" at={backendAt + 2 + i * 6} level={-31} />
      ))}
      <Sfx name="el-pencil" at={arrowAt} level={-34} />
      <Sfx name="el-tap" at={apiAt + 2} level={-30} />
      <Sfx name="el-whoosh" at={asksAt} level={-36} />
      <Sfx name="el-whoosh" at={answersAt} level={-36} />
      <Sfx name="el-pop" at={backendAt + 20} level={-30} />
      <Sfx name="el-sprinkle" at={tenAt} level={-31} />
      <Sfx name="el-chime" at={sixteenAt} level={-32} />

      <Drift from={0} to={end + 20}>
        <Kicker at={backendAt}>{SERIES} · API design</Kicker>
        <Headline lead="Every arrow between two boxes" turn="is an API." at={arrowAt - 4} turnAt={apiAt} size={64} />

        {/* The backend: a client and two services. */}
        {BOXES.map((b, i) => (
          <Node key={i} x={b.x} y={top} w={b.w} h={BOX_H} at={backendAt + 2 + i * 6} tone={b.tone} title={b.title} size={28} />
        ))}
        {GAPS.map((g, i) => (
          <React.Fragment key={i}>
            <Flow points={[[g.from + 8, mid - 14], [g.to - 10, mid - 14]]} at={arrowAt + i * 6} color={INK} width={2.6} head={14} />
            <Flow points={[[g.to - 8, mid + 14], [g.from + 10, mid + 14]]} at={arrowAt + 8 + i * 6} color={BAR} width={2.6} head={14} />
            <Pill x={(g.from + g.to) / 2 - 36} y={top - h(64)} at={apiAt + i * 5} tone="lit" size={22}>
              API
            </Pill>
            {/* The request, then the reply, riding the arrows. */}
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <circle cx={g.from + 14 + (g.to - g.from - 34) * ask} cy={mid - 14} r={7} fill={INK} opacity={rideOn(asksAt)} />
              <circle cx={g.to - 14 - (g.to - g.from - 34) * answer} cy={mid + 14} r={7} fill={BAR} opacity={rideOn(answersAt)} />
            </svg>
          </React.Fragment>
        ))}
        <Note at={asksAt} x={GAPS[0].from + 26} y={top + BOX_H + h(16)}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>asks →</span>
        </Note>
        <Note at={answersAt} x={GAPS[0].from + 26} y={top + BOX_H + h(52)}>
          <span style={{ ...label(21, BLUE_INK), whiteSpace: "nowrap" }}>← answers</span>
        </Note>
        {/* Both sides agree on how: a bracket under the whole row. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, agreeAt, 12) }}>
          <path
            d={`M${GAPS[1].from - 10},${top + BOX_H + h(26)} v${h(14)} H${BOXES[2].x + BOXES[2].w} v${-h(14)}`}
            fill="none"
            stroke={HAIRLINE}
            strokeWidth={1.6}
          />
        </svg>
        <Note at={agreeAt + 4} x={GAPS[1].from + 40} y={top + BOX_H + h(52)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>both sides agree on how</span>
        </Note>

        {/* What the interview tests the design for. */}
        <Note at={predAt - 4} x={X0} y={y(510)}>
          <span style={{ ...note(36, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            <Mark at={predAt}>Predictable,</Mark> <Mark at={consAt}>consistent,</Mark> <Mark at={misuseAt}>hard to misuse.</Mark>
          </span>
        </Note>

        <Spot id="puffin" at={backendAt + 20} left={1450} top={y(232)} {...puffin} />

        {/* The page's example: a blog's two resources. */}
        <Note at={blogAt} x={X0} y={blogTop}>
          <span style={{ ...label(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>The example: a blog</span>
        </Note>
        {[
          { name: "articles", sub: "the blog's posts", at: articlesAt, x: X0 },
          { name: "comments", sub: "on each article", at: commentsAt, x: X0 + 330 },
        ].map((r) => (
          <Note key={r.name} at={r.at} x={r.x} y={blogTop + h(50)}>
            <div style={{ ...label(32, BLUE_INK), fontWeight: 500, whiteSpace: "nowrap" }}>{r.name}</div>
            <div style={{ ...note(22, INK_SOFT), marginTop: 4, whiteSpace: "nowrap" }}>{r.sub}</div>
          </Note>
        ))}
        <Flow points={[[X0 + 190, blogTop + h(50) + 22], [X0 + 300, blogTop + h(50) + 22]]} at={commentsAt - 2} color={BAR} />

        {/* The round: sixteen questions, ten big and six small. */}
        <div style={{ position: "absolute", left: X0, top: planTop, display: "flex", alignItems: "center", gap: 10, fontSize: 21 }}>
          {Array.from({ length: 16 }, (_, i) => {
            const big = i < 10;
            const at = big ? tenAt + i * 2 : sixAt + (i - 10) * 2;
            const p = ease(frame, Math.max(at, sixteenAt), 8);
            const s = big ? BIG : SMALL;
            return (
              <React.Fragment key={i}>
                {i === 10 ? <span style={{ width: 18 }} /> : null}
                <span
                  style={{
                    width: s,
                    height: s,
                    borderRadius: 5,
                    boxSizing: "border-box",
                    border: `2px solid ${BAR}`,
                    background: big ? `color-mix(in srgb, ${BAR} 16%, ${PAPER})` : PAPER,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...label(big ? 21 : 19, BLUE_INK),
                    fontWeight: 500,
                    opacity: p,
                    transform: `scale(${0.6 + 0.4 * p})`,
                  }}
                >
                  {big ? i + 1 : ""}
                </span>
              </React.Fragment>
            );
          })}
        </div>
        <Note at={tenAt + 6} x={X0} y={planTop + BIG + h(14)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>
              <Num>10</Num>
            </b>{" "}
            worked through
          </span>
        </Note>
        <Note at={sixAt + 6} x={X0 + 10 * (BIG + 10) + 18} y={planTop + BIG + h(14)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>
              <Num>6</Num>
            </b>{" "}
            quick
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
