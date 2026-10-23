import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { FigLabel, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { LOGITS, MOE, PARAMS, PROMPT, thousands } from "./data";
import {
  Arrow,
  DATA,
  DATA_SOFT,
  DATA_TINT,
  Fade,
  FAINT,
  FIG_Y,
  fix,
  Headline,
  Kicker,
  lerp,
  LINE,
  Mark,
  POINT,
  POINT_INK,
  pulse,
  Spot,
  Svg,
  Tag,
  TokenChip,
  X0,
} from "./parts";

/** A strip of empty cells: a token's vector, drawn without numbers. */
const Strip: React.FC<{ cells: number; w?: number; h?: number; at: number; frame: number; strong?: boolean }> = ({
  cells,
  w = 22,
  h = 30,
  at,
  frame,
  strong = false,
}) => (
  <span style={{ display: "inline-flex" }}>
    {Array.from({ length: cells }, (_, i) => {
      const f = ease(frame, at + i * 1.5, 8);
      return (
        <span
          key={i}
          style={{
            width: w - 3,
            height: h,
            marginRight: 3,
            borderRadius: 3,
            border: `1.5px solid ${strong ? DATA : DATA_SOFT}`,
            background: `color-mix(in srgb, ${DATA} ${Math.round(f * (strong ? 34 : 20))}%, ${PAPER})`,
            opacity: 0.35 + 0.65 * f,
          }}
        />
      );
    })}
  </span>
);

/** A circled plus, where a residual connection adds its input back in. */
const Plus: React.FC<{ x: number; y: number; at: number; glow?: number }> = ({ x, y, at, glow = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (p <= 0) return null;
  const r = 14 + 4 * glow;
  return (
    <g opacity={p}>
      <circle cx={x} cy={y} r={r} fill={PAPER} stroke={POINT} strokeWidth={2.4} />
      <line x1={x - 7} x2={x + 7} y1={y} y2={y} stroke={POINT} strokeWidth={2.4} />
      <line x1={x} x2={x} y1={y - 7} y2={y + 7} stroke={POINT} strokeWidth={2.4} />
    </g>
  );
};

// ═══ Scene 11: the full path of a prompt ═══════════════════════════════════

export const PathScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("path").from;
  const textAt = n.word("path", "text");
  const idsAt = n.word("path", "token ids");
  const embeddingAt = n.word("path", "embedding");
  const positionAt = n.word("path", "position");
  const blockAt = n.word("block", "block");
  const mixesAt = n.word("block", "mixes");
  const ffAt = n.word("block", "feed-forward");
  const aloneAt = n.word("block", "alone");
  const aroundAt = n.word("residual", "Around");
  const addedAt = n.word("residual", "added");
  const lostAt = n.word("residual", "lost");
  const repeatsAt = n.word("repeat", "repeats");
  const thirtyAt = n.word("repeat", "Thirty-two");
  const modelAt = n.word("repeat", "model");

  const toks = PROMPT.tokens;
  const ROW = 64;
  const top0 = y(470);
  const rowY = (i: number) => top0 + i * ROW;
  const mid = top0 + (toks.length * ROW) / 2 - ROW / 2 + 20;
  const X = { text: X0, ids: 330, emb: 520, att: 900, ff: 1200, stack: 1590 };
  const blockTop = top0 - 30;
  const blockBot = rowY(toks.length - 1) + 64;
  const blockL = X.att - 34;
  const blockR = X.ff + 230;
  const SLABS = 8;

  return (
    <AbsoluteFill>
      {toks.map((_, i) => (
        <Sfx key={i} name="el-tap" at={idsAt + i * 3} level={-30} />
      ))}
      <Sfx name="el-pencil" at={blockAt - 4} level={-34} />
      <Sfx name="el-pencil" at={mixesAt} level={-35} />
      <Sfx name="el-pencil" at={aroundAt - 2} level={-35} />
      <Sfx name="el-tap" at={addedAt} level={-25} />
      <Sfx name="el-whoosh" at={repeatsAt} level={-33} />
      <Sfx name="el-tap" at={thirtyAt} level={-24} />

      <Kicker at={from - 10}>The shape of a transformer</Kicker>
      <Headline lead="The full path" turn="of a prompt." at={from} turnAt={from + 14} />

      <FigLabel n="18" title="One block of a transformer, and the steps before it" at={from} x={X0} y={y(FIG_Y)} />
      {/* Column titles. */}
      {(
        [
          [X.text, "Text", textAt],
          [X.ids, "Token ids", idsAt],
          [X.emb, "Embedding + position", embeddingAt],
          [X.att + 10, "Attention", mixesAt - 4],
          [X.ff + 10, "Feed-forward", ffAt - 2],
        ] as const
      ).map(([x, t, at]) => (
        <Fade key={t} at={at - 2} style={{ left: x, top: top0 - 76 }}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>{t}</span>
        </Fade>
      ))}
      {toks.map((t, i) => (
        <React.Fragment key={i}>
          <Fade at={textAt - 2 + i * 2} style={{ left: X.text, top: rowY(i) }}>
            <TokenChip text={t.piece} size={23} />
          </Fade>
          <Fade at={idsAt + i * 3} style={{ left: X.ids, top: rowY(i) + 8 }}>
            <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: 24, color: INK, ...TABULAR }}>{t.id}</span>
          </Fade>
          <Fade at={embeddingAt - 2 + i * 2} style={{ left: X.emb, top: rowY(i) + 6, display: "flex", alignItems: "center", gap: 10 }}>
            <Strip cells={8} at={embeddingAt + i * 2} frame={frame} />
            <span style={{ ...note(20, POINT_INK), fontWeight: 650, opacity: ease(frame, positionAt + i * 2, 8), ...TABULAR }}>+{i + 1}</span>
          </Fade>
          {/* Feed-forward: each token through its own small box. */}
          <Fade at={aloneAt - 6 + i * 2} style={{ left: X.ff + 10, top: rowY(i) + 4 }}>
            <div style={{ width: 200, height: 40, borderRadius: 8, border: `2px solid ${DATA}`, background: DATA_TINT }} />
          </Fade>
        </React.Fragment>
      ))}
      <Svg>
        {/* Attention: every row reaches every other. */}
        {toks.map((_, i) =>
          toks.map((__, j) => {
            if (i === j) return null;
            const p = ease(frame, mixesAt - 2 + (i + j) * 1.2, 14);
            if (p <= 0) return null;
            const x1 = X.att + 10;
            const x2 = X.att + 230;
            const y1 = rowY(i) + 22;
            const y2 = rowY(j) + 22;
            return (
              <line
                key={`${i}-${j}`}
                x1={x1}
                y1={y1}
                x2={lerp(x1, x2, p)}
                y2={lerp(y1, y2, p)}
                stroke={DATA}
                strokeWidth={1.4}
                opacity={0.55}
              />
            );
          }),
        )}
        {toks.map((_, i) => (
          <g key={i} opacity={ease(frame, mixesAt - 4, 10)}>
            <circle cx={X.att + 10} cy={rowY(i) + 22} r={6} fill={DATA} />
            <circle cx={X.att + 230} cy={rowY(i) + 22} r={6} fill={DATA} />
          </g>
        ))}
        {/* The block repeats: a tower of the same block, one slab each. */}
        {Array.from({ length: SLABS }, (_, k) => {
          const p = ease(frame, repeatsAt + k * 3, 10);
          if (p <= 0) return null;
          const h = 30;
          const top = blockBot - (k + 1) * (h + 10) + 10;
          return (
            <rect
              key={k}
              x={X.stack}
              y={top + (1 - p) * 12}
              width={220}
              height={h}
              rx={6}
              fill={k === 0 ? DATA : DATA_TINT}
              stroke={k === 0 ? INK : DATA}
              strokeWidth={k === 0 ? 2 : 1.6}
              opacity={p}
            />
          );
        })}
        <rect
          x={blockL}
          y={blockTop}
          width={blockR - blockL}
          height={blockBot - blockTop}
          rx={16}
          fill="none"
          stroke={INK}
          strokeWidth={2.4}
          pathLength={1}
          strokeDasharray={`${ease(frame, blockAt - 4, 20)} 1`}
        />
        {/* Residuals: around each half, the input added back in. */}
        {(
          [
            [X.att - 10, X.ff - 30],
            [X.ff - 10, blockR + 34],
          ] as const
        ).map(([a, b], k) => {
          const p = ease(frame, aroundAt - 2 + k * 8, 16);
          if (p <= 0) return null;
          const yy = blockBot + 40;
          const d = `M${a},${blockBot - 10} L${a},${yy} L${lerp(a, b, p)},${yy}`;
          return (
            <g key={k}>
              <path d={d} fill="none" stroke={POINT} strokeWidth={2.2} strokeDasharray="7 6" />
              {p > 0.98 ? <line x1={b} x2={b} y1={yy} y2={blockBot + 2} stroke={POINT} strokeWidth={2.2} strokeDasharray="7 6" /> : null}
            </g>
          );
        })}
        <Plus x={X.ff - 30} y={blockBot - 12} at={addedAt - 2} glow={pulse(frame, lostAt, 24)} />
        <Plus x={blockR + 34} y={blockBot - 12} at={addedAt + 6} glow={pulse(frame, lostAt + 6, 24)} />
      </Svg>
      <Arrow from={[X.text + 118, mid]} to={[X.ids - 22, mid]} at={idsAt - 4} color={INK_SOFT} />
      <Arrow from={[X.ids + 96, mid]} to={[X.emb - 22, mid]} at={embeddingAt - 4} color={INK_SOFT} />
      <Arrow from={[X.emb + 230, mid]} to={[blockL - 14, mid]} at={blockAt - 2} color={INK_SOFT} />
      <Arrow from={[blockR + 70, mid]} to={[X.stack - 20, mid]} at={repeatsAt - 4} color={INK_SOFT} />
      <Fade at={aroundAt + 4} style={{ left: X.att - 10, top: blockBot + 52 }}>
        <Tag size={21} color={POINT_INK}>
          The input, added back in
        </Tag>
      </Fade>
      <Fade at={thirtyAt - 2} style={{ left: X.stack, top: blockBot - SLABS * 40 - 118 }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 44, color: INK, ...TABULAR }}>×{PARAMS.layers}</div>
        <div style={{ ...label(21, INK_SOFT), marginTop: 6, opacity: ease(frame, modelAt - 4, 10), whiteSpace: "nowrap" }}>in the lesson&apos;s</div>
        <div style={{ ...label(21, INK_SOFT), opacity: ease(frame, modelAt - 4, 10), whiteSpace: "nowrap" }}>mid-sized model</div>
      </Fade>
    </AbsoluteFill>
  );
};

// ═══ Scene 12: where the parameters are; width and depth ═══════════════════

const BAR_X0 = X0;
const BAR_X1 = 1800;
const SHADES = [ds("blue", 200), ds("blue", 400), ds("blue", 600), ds("blue", 200)];

export const ParamsScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("params").from;
  const sevenAt = n.word("params", "seven billion");
  const parametersAt = n.word("params", "parameters");
  const liveAt = n.word("params", "live");
  const embAt = n.word("split", "embedding");
  const halfAt = n.word("split", "half");
  const outputAt = n.word("split", "output");
  const againAt = n.word("split", "again");
  const attnAt = n.word("split", "Attention");
  const ffAt = n.word("ff", "feed-forward");
  const threeAt = n.word("ff", "three point eight");
  const fiftyAt = n.word("ff", "Fifty-four");
  const wholeAt = n.word("ff", "whole");
  const muchAt = n.word("knowledge", "much");
  const knowsAt = n.word("knowledge", "knows");
  const noAt = n.word("knowledge", "no");
  const justAt = n.word("knowledge", "Just");
  const widthAt = n.word("wide", "Width");
  const holdAt = n.word("wide", "hold");
  const depthAt = n.word("wide", "Depth");
  const refinedAt = n.word("wide", "refined");
  const bothAt = n.word("wide", "both");

  const scale = (BAR_X1 - BAR_X0) / PARAMS.total;
  const segAt = [embAt, attnAt, ffAt, outputAt];
  const valueAt = [halfAt, attnAt + 6, threeAt, againAt];
  let x = BAR_X0;
  const segs = PARAMS.parts.map((p, i) => {
    const s = { ...p, x0: x, x1: x + p.b * scale, at: segAt[i], valueAt: valueAt[i] };
    x = s.x1;
    return s;
  });
  const BY = y(420);
  const BH = 84;

  // Fig. 20.
  const WY = y(760);
  const DX = 1240;
  const DY = y(890);

  return (
    <AbsoluteFill>
      {segs.map((s) => (
        <Sfx key={s.name} name="el-tap" at={s.at} level={-25} />
      ))}
      <Sfx name="el-pencil" at={from + 6} level={-35} />
      <Sfx name="el-pencil" at={widthAt - 2} level={-34} />
      <Sfx name="el-pencil" at={depthAt - 2} level={-34} />

      <Kicker at={from - 10}>The shape of a transformer</Kicker>
      <Headline lead="About seven billion parameters." at={from} out={fiftyAt - 8} />
      <Headline lead="Most of them" turn="in feed-forward." at={fiftyAt - 4} turnAt={fiftyAt + 8} />

      {/* ── Fig. 19: the lesson's sums, as one bar ── */}
      <FigLabel n="19" title="Where the lesson's mid-sized model keeps its parameters" at={from} x={X0} y={y(FIG_Y)} />
      <Fade at={sevenAt - 2} style={{ left: BAR_X1, top: y(FIG_Y) + 2, transform: "translateX(-100%)" }}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>
          <Mark at={wholeAt}>Total: {PARAMS.total.toFixed(2)} billion</Mark>
        </span>
      </Fade>
      <Svg>
        {/* The empty bar, drawn as the parameters are named, washed as the narration asks where they live. */}
        <rect
          x={BAR_X0}
          y={BY}
          width={(BAR_X1 - BAR_X0) * ease(frame, liveAt - 8, 24)}
          height={BH}
          fill={DATA_TINT}
          rx={4}
        />
        <rect
          x={BAR_X0}
          y={BY}
          width={(BAR_X1 - BAR_X0) * ease(frame, parametersAt - 4, 24)}
          height={BH}
          fill="none"
          stroke={INK_SOFT}
          strokeWidth={2}
          strokeDasharray="8 6"
          rx={4}
        />
        {segs.map((s, i) => {
          const p = ease(frame, s.at - 2, 16);
          if (p <= 0) return null;
          const glow = i === 2 ? pulse(frame, fiftyAt, 30) + pulse(frame, muchAt, 30) : 0;
          return (
            <rect
              key={s.name}
              x={s.x0}
              y={BY - 6 * glow}
              width={(s.x1 - s.x0) * p - 3}
              height={BH + 12 * glow}
              fill={SHADES[i]}
              rx={3}
            />
          );
        })}
      </Svg>
      {segs.map((s, i) => {
        const above = i === 1 || i === 2;
        const right = i === 3;
        return (
          <Fade
            key={s.name}
            at={s.at}
            style={{
              left: right ? s.x1 - 2 : s.x0 + 4,
              top: above ? BY - 66 : BY + BH + 14,
              transform: right ? "translateX(-100%)" : undefined,
              textAlign: right ? "right" : "left",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ ...label(22, INK) }}>{i === 3 ? "Output layer" : s.name}</span>{" "}
            <span style={{ ...note(22, INK_SOFT), opacity: ease(frame, s.valueAt - 2, 10), ...TABULAR }}>{s.b.toFixed(2)} billion</span>
          </Fade>
        );
      })}
      <Fade at={fiftyAt - 2} style={{ left: segs[2].x0 + 24, top: BY + 20 }}>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 36, color: PAPER, ...TABULAR }}>{PARAMS.ffShare}%</span>
      </Fade>
      <Note at={knowsAt - 4} x={X0} y={y(580)}>
        <div style={{ ...body(34), color: INK, whiteSpace: "nowrap" }}>
          Much of what it knows. <span style={{ opacity: ease(frame, noAt - 2, 10) }}>No fact database.</span>{" "}
          <span style={{ opacity: ease(frame, justAt - 2, 10) }}>
            <Mark at={justAt}>Just weights.</Mark>
          </span>
        </div>
      </Note>

      {/* ── Fig. 20: width and depth ── */}
      <FigLabel n="20" title="Width and depth" at={widthAt - 4} x={X0} y={y(670)} />
      <Fade at={widthAt - 2} style={{ left: X0, top: WY }}>
        <Strip cells={30} w={26} h={34} at={widthAt} frame={frame} strong />
      </Fade>
      <Arrow from={[X0 + 380, WY + 72]} to={[X0 + 30 * 26 - 4, WY + 72]} at={widthAt} color={INK_SOFT} />
      <Arrow from={[X0 + 380, WY + 72]} to={[X0 + 4, WY + 72]} at={widthAt} color={INK_SOFT} />
      <Fade at={holdAt - 4} style={{ left: X0, top: WY + 92 }}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <b style={{ fontWeight: 650 }}>Width:</b> what one token&apos;s vector can hold <span style={{ color: INK_SOFT, ...TABULAR }}>({thousands(PARAMS.dModel)} numbers)</span>
        </span>
      </Fade>
      <Svg>
        {Array.from({ length: 8 }, (_, k) => {
          const p = ease(frame, depthAt - 2 + k * 3, 10);
          if (p <= 0) return null;
          return (
            <rect key={k} x={DX} y={DY - k * 30 - 24} width={250} height={22} rx={5} fill={k === 7 ? DATA : DATA_TINT} stroke={DATA} strokeWidth={1.6} opacity={p} />
          );
        })}
      </Svg>
      <Arrow from={[DX + 290, DY - 4]} to={[DX + 290, DY - 8 * 30 + 6]} at={depthAt} color={INK_SOFT} />
      <Fade at={refinedAt - 4} style={{ left: DX + 320, top: DY - 150 }}>
        <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <b style={{ fontWeight: 650 }}>Depth:</b> how many times
        </div>
        <div style={{ ...note(24, INK), whiteSpace: "nowrap" }}>it gets refined</div>
        <div style={{ ...note(22, INK_SOFT), marginTop: 6, whiteSpace: "nowrap", ...TABULAR }}>({PARAMS.layers} blocks)</div>
      </Fade>
      <Note at={bothAt - 2} x={X0 + 30 * 26 + 60} y={WY - 6}>
        <span style={{ ...note(26, POINT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>You need both.</span>
      </Note>
    </AbsoluteFill>
  );
};

// ═══ Scene 13: mixture of experts ═════════════════════════════════════════

/** Which two of the sixteen experts light for each passing token: a fixed,
 *  schematic routing, not any real router's choice. */
const ROUTES = [
  [1, 10],
  [6, 13],
  [3, 8],
  [11, 4],
  [0, 15],
  [9, 2],
];

export const ExpertsScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("experts").from;
  const splitAt = n.word("experts", "split");
  const expertsAt = n.word("experts", "experts");
  const fewAt = n.word("experts", "few");
  const storesAt = n.word("deepseek", "stores");
  const sixAt = n.word("deepseek", "six hundred seventy-one billion");
  const usesAt = n.word("deepseek", "uses");
  const thirtyAt = n.word("deepseek", "thirty-seven billion");

  const GX = 560;
  const GY = y(430);
  const EW = 92;
  const EH = 70;
  const EG = 16;
  const STEP = 22;
  const routeT = Math.max(0, frame - (fewAt - 6));
  const k = Math.floor(routeT / STEP) % ROUTES.length;
  const lit = frame >= fewAt - 6 ? ROUTES[k] : [];
  const tok = PROMPT.tokens[k % PROMPT.tokens.length];
  const tp = ease(frame, fewAt - 6 + Math.floor(routeT / STEP) * STEP, 5);

  const BX = 1100;
  const BW = 480;
  const ds3 = MOE.deepseek;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={from + 6} level={-31} />
      {Array.from({ length: 16 }, (_, i) => (
        <Sfx key={i} name="el-tap" at={expertsAt - 4 + i} level={-34} />
      ))}
      <Sfx name="el-pencil" at={sixAt - 2} level={-34} />
      <Sfx name="el-tap" at={thirtyAt} level={-24} />

      <Kicker at={from - 10}>The shape of a transformer</Kicker>
      <Headline lead="Many experts," turn="a few at a time." at={from} turnAt={fewAt - 2} />
      <Spot id="llm-meaning-drawers" at={splitAt - 4} left={X0 + 40} top={y(380)} width={288} height={470} />

      {/* ── Fig. 21: experts, a few per token ── */}
      <FigLabel n="21" title="Experts, a few per token" at={expertsAt - 6} x={GX - 40} y={y(FIG_Y)} />
      <Svg>
        {Array.from({ length: 16 }, (_, i) => {
          const r = Math.floor(i / 4);
          const c = i % 4;
          const p = ease(frame, expertsAt - 4 + i, 10);
          if (p <= 0) return null;
          const on = lit.includes(i) ? tp : 0;
          return (
            <rect
              key={i}
              x={GX + c * (EW + EG)}
              y={GY + r * (EH + EG)}
              width={EW}
              height={EH}
              rx={8}
              fill={on > 0 ? `color-mix(in srgb, ${ds("yellow", 400)} ${Math.round(on * 100)}%, ${PAPER})` : PAPER}
              stroke={on > 0.5 ? INK : DATA}
              strokeWidth={on > 0.5 ? 2.6 : 1.8}
              opacity={p}
            />
          );
        })}
      </Svg>
      {frame >= fewAt - 6 ? (
        <div style={{ position: "absolute", left: GX + 2 * (EW + EG) - 8 - 40, top: GY - 64, opacity: tp, transform: `translateY(${(1 - tp) * -10}px)` }}>
          <TokenChip text={tok.piece} size={24} border={POINT} />
        </div>
      ) : null}
      <Fade at={fewAt + 4} style={{ left: GX, top: GY + 4 * (EH + EG) + 6 }}>
        <Tag size={21}>Each token: two of sixteen</Tag>
      </Fade>

      {/* ── Fig. 22: DeepSeek-V3's two counts ── */}
      <FigLabel n="22" title="DeepSeek-V3, as the lesson cites it" at={storesAt - 6} x={BX} y={y(FIG_Y)} />
      {(
        [
          ["Stored", ds3.total, sixAt],
          ["Used for each token", ds3.active, thirtyAt],
        ] as const
      ).map(([name, v, at], i) => {
        const p = ease(frame, at - 2, 20);
        const top = y(440 + i * 170);
        return (
          <React.Fragment key={name}>
            <Fade at={i ? usesAt - 4 : storesAt - 2} style={{ left: BX, top }}>
              <span style={{ ...label(22, INK) }}>{name}</span>
            </Fade>
            <Svg opacity={p > 0 ? 1 : 0}>
              <rect x={BX} y={top + 44} width={Math.max(4, (v / ds3.total) * BW * p)} height={46} rx={3} fill={i ? POINT : DATA} />
            </Svg>
            <Fade at={at} style={{ left: BX + (v / ds3.total) * BW + 16, top: top + 50 }}>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: i ? POINT_INK : INK, whiteSpace: "nowrap", ...TABULAR }}>
                {v} billion
              </span>
            </Fade>
          </React.Fragment>
        );
      })}
      <Fade at={thirtyAt + 10} style={{ left: BX, top: y(440 + 2 * 170) - 10 }}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>{ds3.share}% of it runs per token</span>
      </Fade>
    </AbsoluteFill>
  );
};

// ═══ Scene 14: a score for every token, and the bridge ═════════════════════

export const TopScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  const from = n.beat("top").from;
  const lastAt = n.word("top", "last");
  const scoreAt = n.word("top", "score");
  const vocabAt = n.word("top", "vocabulary");
  const allAt = n.word("top", "hundred and twenty-eight thousand");
  const somethingAt = n.word("next", "Something");
  const pickAt = n.word("next", "pick");

  const last = PROMPT.tokens[PROMPT.tokens.length - 1];
  const VY = y(500);
  const LX = 1000;
  const ZERO = 1290;
  const UNIT = 110;
  const rowTop = (i: number) => y(400) + i * 72;
  // After "something still has to pick one", a marker hops among the four.
  const hop = frame >= somethingAt ? Math.floor((frame - somethingAt) / 14) % LOGITS.tokens.length : -1;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={scoreAt - 4} level={-34} />
      {LOGITS.tokens.map((_, i) => (
        <Sfx key={i} name="el-tap" at={scoreAt + i * 5} level={-28} />
      ))}
      <Sfx name="el-tap" at={allAt} level={-24} />

      <Kicker at={from - 10}>The shape of a transformer</Kicker>
      <Headline lead="One score" turn="for every token." at={from} turnAt={scoreAt} />

      <FigLabel n="23" title="At the top: a score for every token in the vocabulary" at={from} x={X0} y={y(FIG_Y)} />
      <Fade at={lastAt - 4} style={{ left: X0, top: VY - 64 }}>
        <span style={{ ...label(22, INK_SOFT) }}>The last token&apos;s vector</span>
      </Fade>
      <Fade at={lastAt - 2} style={{ left: X0, top: VY, display: "flex", alignItems: "center", gap: 16 }}>
        <TokenChip text={last.piece} size={26} />
        <Strip cells={12} w={26} h={34} at={lastAt} frame={frame} strong />
      </Fade>
      <Arrow from={[X0 + 520, VY + 20]} to={[LX - 30, VY + 20]} at={scoreAt - 4} />
      <Fade at={scoreAt - 2} style={{ left: LX, top: y(350) }}>
        <span style={{ ...label(21, INK_SOFT) }}>Token</span>
        <span style={{ ...label(21, INK_SOFT), position: "absolute", left: ZERO - LX + 60 }}>Score</span>
      </Fade>
      <Svg opacity={ease(frame, scoreAt, 12)}>
        <line x1={ZERO} x2={ZERO} y1={rowTop(0) - 6} y2={rowTop(LOGITS.tokens.length) - 18} stroke={LINE} strokeWidth={1.6} />
      </Svg>
      {LOGITS.tokens.map((t, i) => {
        const v = LOGITS.scores[i];
        const p = ease(frame, scoreAt + i * 5, 14);
        if (p <= 0) return null;
        const top = rowTop(i);
        const w = Math.abs(v) * UNIT * p;
        const on = hop === i ? 1 : 0;
        return (
          <React.Fragment key={t}>
            <Fade at={scoreAt + i * 5} style={{ left: LX, top }}>
              <TokenChip text={` ${t}`} size={23} border={on ? POINT : INK} />
            </Fade>
            <Svg>
              <rect x={v >= 0 ? ZERO : ZERO - w} y={top + 8} width={w} height={34} rx={3} fill={on ? POINT : DATA} />
            </Svg>
            <div
              style={{
                position: "absolute",
                left: v >= 0 ? ZERO + w + 14 : ZERO + 14,
                top: top + 10,
                opacity: p,
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 24,
                color: INK,
                ...TABULAR,
              }}
            >
              {fix(v)}
            </div>
          </React.Fragment>
        );
      })}
      <Fade at={vocabAt} style={{ left: LX + 30, top: rowTop(LOGITS.tokens.length) - 8 }}>
        <div style={{ ...note(30, FAINT), lineHeight: 1 }}>⋮</div>
      </Fade>
      <Fade at={allAt - 2} style={{ left: LX + 80, top: rowTop(LOGITS.tokens.length) }}>
        <span style={{ ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
          <Mark at={allAt}>{thousands(PARAMS.vocab)} scores</Mark>
        </span>
      </Fade>
      <Fade at={allAt + 8} style={{ left: LX, top: rowTop(LOGITS.tokens.length) + 56 }}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>Four of them: the sampling lesson&apos;s example scores</span>
      </Fade>
      <NextLine at={pickAt - 4} x={X0} y={y(880)} width={1680}>
        choosing the next token
      </NextLine>
    </AbsoluteFill>
  );
};
