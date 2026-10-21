import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, halo, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { EXPERIMENT, TINY } from "./data";
import { Check, Cross, Headline, Marker, Ring, STAT, STAT_INK, Svg } from "./parts";

const X: XScale = { lo: -0.5, hi: 3.5, x0: 160, x1: 1060 };
const BASE = 836;
const OURS = 500;
const HUGE = 660;
/** The huge test's interval, magnified under its row: 0 to 0.04 points. */
const ZOOM: XScale = { lo: 0, hi: 0.04, x0: 360, x1: 960 };
const ZOOM_FRAME = { x0: 330, x1: 1000 };
const COL = [1160, 1440];
const HEAD_Y = 384;
const pp = (v: number) => v * 100;

/** One result's interval on the scale of points: a bar with end ticks, and
 *  its estimate. Drawn at least `min` px wide, so a sliver still shows. */
const Interval: React.FC<{ lo: number; hi: number; mid: number; y: number; t: number; min?: number }> = ({ lo, hi, mid, y, t, min = 0 }) => {
  if (t <= 0) return null;
  const c = sx(X, mid);
  let a = sx(X, lo);
  let b = sx(X, hi);
  if (b - a < min) {
    a = c - min / 2;
    b = c + min / 2;
  }
  const a1 = c + (a - c) * t;
  const b1 = c + (b - c) * t;
  return (
    <Svg>
      <line x1={a1} x2={b1} y1={y} y2={y} stroke={STAT} strokeWidth={6} strokeLinecap="round" />
      <line x1={a1} x2={a1} y1={y - 14} y2={y + 14} stroke={STAT} strokeWidth={3.5} strokeLinecap="round" />
      <line x1={b1} x2={b1} y1={y - 14} y2={y + 14} stroke={STAT} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={c} cy={y} r={min > 0 ? 6 : 10} fill={STAT} stroke={PAPER} strokeWidth={2} opacity={t} />
    </Svg>
  );
};

/**
 * The decision, on two questions: significant (the interval clears zero) and
 * big enough to matter (a question about money). This test passes the first,
 * and the second turns on its interval's low end, about one point: ship only
 * if that is worth it (ab-testing, "Decide": the CI's lower bound against
 * the level that justifies the rollout). The lesson's huge test passes the
 * first and fails the second; its interval is a sliver beside zero at this
 * scale, so it is magnified underneath to show it clear.
 */
export const DecideScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const decideFrom = n.beat("decide").from;
  const significantAt = n.word("decide", "significant");
  const yesAt = n.word("decide", "Yes");
  const wholeAt = n.word("decide", "whole interval");
  const zeroAt = n.word("decide", "zero");
  const bigAt = n.word("matter", "big enough");
  const moneyAt = n.word("matter", "money");
  const littleAt = n.word("verdict", "as little as");
  const onlyAt = n.word("verdict", "only if");
  const worthAt = n.word("verdict", "worth it");
  const testAt = n.word("tiny", "big enough test");
  const eightAt = n.word("tiny", "eight percent");
  const ohTwoAt = n.word("tiny", "point oh two");
  const sigAt = n.word("tiny", "significant");
  const realAt = n.word("tiny", "real");
  const worthlessAt = n.word("tiny", "worthless");
  const permissionAt = n.word("permit", "permission");
  const sizeAt = n.word("permit", "size");
  const shipAt = n.word("permit", "ship");

  const ours = ease(frame, decideFrom - 6, 16);
  const zoomIn = ease(frame, ohTwoAt + 2, 16);
  const zoomBar = ease(frame, ohTwoAt + 10, 18);
  const zoomTop = y(HUGE) + 52;
  const zoomRow = zoomTop + 58;
  const huge = ease(frame, eightAt - 4, 14);
  const lift = pp(EXPERIMENT.absLift);
  const sigDim = 1 - 0.5 * ease(frame, shipAt - 6, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: each answer as it lands, and the huge test's sliver ── */}
      <Sfx name="el-tap" at={yesAt - 4} level={-28} />
      <Sfx name="el-pencil" at={moneyAt - 4} level={-34} />
      <Sfx name="el-tap" at={littleAt - 2} level={-30} />
      <Sfx name="el-whoosh" at={ohTwoAt + 2} level={-35} />
      <Sfx name="el-pop" at={eightAt - 4} level={-30} />
      <Sfx name="el-tap" at={realAt - 4} level={-29} />
      <Sfx name="el-scratch" at={worthlessAt - 4} level={-30} />

      <Headline lead="Two questions." at={decideFrom - 6} out={permissionAt - 6} />
      <Headline lead="Permission to look," turn="not to ship." at={permissionAt - 2} turnAt={shipAt - 8} />

      <FigLabel n="5" title="Two results, each lift with its 95% interval, in points" at={decideFrom - 4} x={160} y={y(300)} />
      <Axis scale={X} base={y(BASE)} ticks={[0, 1, 2, 3]} format={(v) => (v > 0 ? `+${v}` : "0")} at={decideFrom - 4} />
      <Svg opacity={ease(frame, decideFrom - 2, 14)}>
        <line x1={sx(X, 0)} x2={sx(X, 0)} y1={y(392)} y2={y(BASE)} stroke={INK} strokeWidth={1.8} strokeDasharray="6 5" />
      </Svg>
      <Note at={decideFrom + 2} x={sx(X, 0)} y={y(362)} from="up">
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
          no difference
        </span>
      </Note>

      {/* ── This test ── */}
      <Ink at={decideFrom - 2} dur={14} style={{ left: 320, top: y(OURS) - 62, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK), fontWeight: 600 }}>This test</span>
        <span style={{ ...note(21, INK_SOFT), marginLeft: 12 }}>
          {fmt(pp(EXPERIMENT.pA))}% to {fmt(pp(EXPERIMENT.pB))}%
        </span>
      </Ink>
      <Interval lo={pp(EXPERIMENT.ciLow)} hi={pp(EXPERIMENT.ciHigh)} mid={lift} y={y(OURS)} t={ours} />
      <Note at={wholeAt - 4} x={sx(X, pp(EXPERIMENT.ciLow))} y={y(OURS) + 22}>
        <span style={{ ...note(21, STAT_INK), fontWeight: 650, whiteSpace: "nowrap", ...halo }}>
          the whole interval clears zero
        </span>
      </Note>
      <Ring x={sx(X, pp(EXPERIMENT.ciLow))} y={y(OURS)} at={zeroAt - 4} />
      {/* Its low end: what the size question turns on. */}
      <Ring x={sx(X, pp(EXPERIMENT.ciLow))} y={y(OURS)} at={littleAt - 2} r1={56} />
      <Note at={littleAt} x={sx(X, pp(EXPERIMENT.ciLow))} y={y(OURS) + 58}>
        <span style={{ ...note(21, INK), fontWeight: 600, whiteSpace: "nowrap", ...halo }}>
          but it could be as little as +{fmt(pp(EXPERIMENT.ciLow))}
        </span>
      </Note>

      {/* ── The lesson's huge test ── */}
      <Ink at={testAt - 4} dur={14} style={{ left: 320, top: y(HUGE) - 62, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK), fontWeight: 600 }}>A huge test</span>
      </Ink>
      <Ink at={eightAt - 4} dur={18} style={{ left: 470, top: y(HUGE) - 66, whiteSpace: "nowrap" }}>
        <span style={{ ...note(26, INK), fontWeight: 600 }}>
          {fmt(pp(TINY.pA))}% to {fmt(pp(TINY.pB))}%
        </span>
      </Ink>
      {ease(frame, eightAt - 6, 16) > 0 ? (
        <Svg opacity={ease(frame, eightAt - 6, 16)}>
          <rect x={150} y={y(HUGE) - 74} width={(COL[1] + 300 - 150) * ease(frame, eightAt - 6, 22)} height={110} rx={10} fill={STAT} opacity={0.1} />
        </Svg>
      ) : null}
      <Interval lo={pp(TINY.ciLow)} hi={pp(TINY.ciHigh)} mid={pp(TINY.pB - TINY.pA)} y={y(HUGE)} t={huge} min={8} />
      <Ring x={sx(X, pp(TINY.pB - TINY.pA))} y={y(HUGE)} at={ohTwoAt - 4} r1={70} />

      {/* ── The sliver, magnified: 0 to 0.04 points, where it clears zero ── */}
      {zoomIn > 0 ? (
        <Svg opacity={zoomIn}>
          {/* The zoom's sides, from the sliver to the frame. */}
          <path
            d={`M${sx(X, pp(TINY.ciLow))},${y(HUGE) + 16} L${ZOOM_FRAME.x0},${zoomTop} M${sx(X, pp(TINY.ciHigh))},${y(HUGE) + 16} L${ZOOM_FRAME.x1},${zoomTop}`}
            fill="none"
            stroke={HAIRLINE}
            strokeWidth={1.2}
          />
          <rect x={ZOOM_FRAME.x0} y={zoomTop} width={ZOOM_FRAME.x1 - ZOOM_FRAME.x0} height={86} rx={8} fill={PAPER} stroke={HAIRLINE} strokeWidth={1.2} />
          <line x1={sx(ZOOM, 0)} x2={sx(ZOOM, 0)} y1={zoomTop + 36} y2={zoomTop + 78} stroke={INK} strokeWidth={1.8} strokeDasharray="6 5" />
        </Svg>
      ) : null}
      <Note at={ohTwoAt + 6} x={sx(ZOOM, 0) - 10} y={zoomRow - 14} align="right">
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>0</span>
      </Note>
      {zoomBar > 0 ? (
        <Svg>
          {(() => {
            const c = sx(ZOOM, pp(TINY.pB - TINY.pA));
            const a = c + (sx(ZOOM, pp(TINY.ciLow)) - c) * zoomBar;
            const b = c + (sx(ZOOM, pp(TINY.ciHigh)) - c) * zoomBar;
            return (
              <>
                <line x1={a} x2={b} y1={zoomRow} y2={zoomRow} stroke={STAT} strokeWidth={6} strokeLinecap="round" />
                <line x1={a} x2={a} y1={zoomRow - 14} y2={zoomRow + 14} stroke={STAT} strokeWidth={3.5} strokeLinecap="round" />
                <line x1={b} x2={b} y1={zoomRow - 14} y2={zoomRow + 14} stroke={STAT} strokeWidth={3.5} strokeLinecap="round" />
                <circle cx={c} cy={zoomRow} r={8} fill={STAT} stroke={PAPER} strokeWidth={2} />
              </>
            );
          })()}
        </Svg>
      ) : null}
      <Note at={sigAt - 6} x={sx(ZOOM, 0) + 22} y={zoomTop + 6}>
        <span style={{ ...note(21, STAT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          magnified: {fmt(pp(TINY.ciLow), 3)} to {fmt(pp(TINY.ciHigh), 3)} points, clear of zero too
        </span>
      </Note>

      {/* ── The two questions, answered for each ── */}
      <div style={{ opacity: sigDim }}>
        <Ink at={significantAt - 6} dur={14} style={{ left: COL[0], top: y(HEAD_Y), whiteSpace: "nowrap" }}>
          <span style={{ ...body(32, true), color: INK }}>Significant?</span>
        </Ink>
        <Check x={COL[0] + 20} y={y(OURS)} at={yesAt - 4} />
        <Ink at={yesAt} dur={12} style={{ left: COL[0] + 62, top: y(OURS) - 16, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK), fontWeight: 600 }}>yes</span>
        </Ink>
        <Check x={COL[0] + 20} y={y(HUGE)} at={sigAt - 4} />
        <Ink at={realAt - 4} dur={12} style={{ left: COL[0] + 62, top: y(HUGE) - 16, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK), fontWeight: 600 }}>yes, real</span>
        </Ink>
      </div>
      <Ink at={bigAt - 6} dur={14} style={{ left: COL[1], top: y(HEAD_Y), whiteSpace: "nowrap" }}>
        <span style={{ ...body(32, true), color: INK }}>
          <Marker at={sizeAt - 4}>Big enough to matter?</Marker>
        </span>
      </Ink>
      <Ink at={moneyAt - 6} dur={16} style={{ left: COL[1], top: y(OURS) - 16, whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, INK) }}>a call about money,</span>
      </Ink>
      <Ink at={moneyAt + 6} dur={16} style={{ left: COL[1], top: y(OURS) + 16, whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, INK_SOFT) }}>not math</span>
      </Ink>
      <Ink at={onlyAt - 4} dur={16} style={{ left: COL[1], top: y(OURS) + 58, whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, STAT_INK), fontWeight: 650 }}>
          ship only if <Marker at={worthAt - 4}>1 point is worth it</Marker>
        </span>
      </Ink>
      <Cross x={COL[1] + 16} y={y(HUGE)} at={worthlessAt - 4} />
      <Ink at={worthlessAt - 2} dur={12} style={{ left: COL[1] + 46, top: y(HUGE) - 16, whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, STAT_INK), fontWeight: 650 }}>no: worthless</span>
      </Ink>
    </AbsoluteFill>
  );
};
