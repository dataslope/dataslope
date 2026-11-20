import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, Tick, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Headline, Kicker, Mark, OK_INK, Spot, VRule, X0 } from "./parts";

const R_X = 780;
const LIST_TOP = 380;
const ROW = 66;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 10. Eviction ────────────────────────────────────────────────────────────

/** Five cached entries under each policy: what the policy reads off each,
 *  and the one it drops. */
const POLICIES = [
  { name: "LRU, least recently used", rule: "Drops the entry untouched longest", tags: ["2 s ago", "9 s", "1 s", "40 s", "4 s"], drop: 3 },
  { name: "LFU, least frequently used", rule: "Keeps popular keys through a quiet spell", tags: ["12 hits", "3", "40", "1", "7"], drop: 3 },
  { name: "First in, first out", rule: "Drops in insertion order, used or not", tags: ["1st in", "2nd", "3rd", "4th", "5th"], drop: 0 },
  { name: "TTL", rule: "Expires on a timer, whatever the memory", tags: ["5 s left", "0 s", "12 s", "30 s", "8 s"], drop: 1 },
];
const PANEL = { w: 482, h: 210, gapX: 78, gapY: 30 };

const Evict: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const at = [
    c.w("r-evict", "LRU, least recently used"),
    c.w("r-evict", "LFU, least frequently used"),
    c.w("r-evict", "First in, first out"),
    c.w("r-evict", "a TTL expires entries"),
  ];
  const defaultAt = c.w("r-evict", "a good default");
  const pairAt = c.w("r-evict", "Most systems pair LRU with a TTL");
  const px = (i: number) => R_X + (i % 2) * (PANEL.w + PANEL.gapX);
  const py = (i: number) => c.y(360) + Math.floor(i / 2) * (c.h(PANEL.h) + PANEL.gapY);
  return (
    <>
      {POLICIES.map((p, i) => {
        const shown = ease(frame, at[i] - 4, 12);
        if (shown <= 0) return null;
        const until = at[i + 1] ?? pairAt;
        const drop = ease(frame, at[i] + 14, 10);
        return (
          <div key={i} style={{ position: "absolute", left: px(i), top: py(i), width: PANEL.w, opacity: shown }}>
            <div style={{ ...label(22, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
              <Mark at={at[i]} out={until}>
                {p.name}
              </Mark>
            </div>
            <div style={{ ...note(20, INK_SOFT), marginTop: 6, whiteSpace: "nowrap" }}>{p.rule}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              {p.tags.map((t, k) => {
                const out = k === p.drop ? drop : 0;
                return (
                  <div
                    key={k}
                    style={{
                      width: 90,
                      height: 52,
                      boxSizing: "border-box",
                      borderRadius: 5,
                      // No border, only the tint (the owner, 2026-11-13: "Remove
                      // the borders around the badges").
                      background: out > 0.5 ? `color-mix(in srgb, ${ACCENT} 10%, ${PAPER})` : `color-mix(in srgb, ${BAR} 10%, ${PAPER})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      ...label(19, out > 0.5 ? ACCENT_INK : BLUE_INK),
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      opacity: 1 - out * 0.35,
                      transform: `translateY(${out * 8}px)`,
                    }}
                  >
                    {t}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <VRule x={R_X + 482 + 39} top={c.y(360)} bottom={c.y(360) + 2 * c.h(PANEL.h) + PANEL.gapY - 20} at={at[1] - 4} />
      <Ink at={defaultAt} dur={12} style={{ left: px(0), top: py(0) + 150, whiteSpace: "nowrap" }}>
        <span style={{ ...note(20, OK_INK), fontWeight: 500 }}>A good default</span>
      </Ink>
      <Ink at={pairAt} dur={14} style={{ left: R_X, top: c.y(360) + 2 * (c.h(PANEL.h) + PANEL.gapY) + 4, whiteSpace: "nowrap" }}>
        <span style={{ ...note(24, INK), fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 12 }}>
          <Tick at={pairAt + 6} size={26} />
          Most systems pair them: <span style={{ color: OK_INK }}>LRU + TTL</span>
        </span>
      </Ink>
    </>
  );
};

// ── 11. Consistency models ──────────────────────────────────────────────────

const Consist: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const strongAt = c.w("r-consist", "Strong: every read reflects");
  const eventualAt = c.w("r-consist", "Eventual: replicas converge");
  const staleAt = c.w("r-consist", "a read can be stale meanwhile");
  const ryAt = c.w("r-consist", "read-your-writes");
  const monoAt = c.w("r-consist", "monotonic reads");
  const backAt = c.w("r-consist", "never see time go backwards");
  const feedAt = c.w("r-consist", "A feed can be eventual");
  const bankAt = c.w("r-consist", "a bank balance usually needs strong");
  const lineY = c.y(560);
  const x0 = R_X + 40;
  const x1 = 1760;
  const mid = (x0 + x1) / 2;
  // The two ends are ordered; the two session guarantees between them are
  // not ordered against each other (neither implies the other), so they
  // share one point, stacked, under one label.
  const ends = [
    { x: x0, t: "eventual", at: eventualAt, sub: "replicas converge once writes stop", sub2: "a read can be stale meanwhile", sub2At: staleAt, align: "left" as const },
    { x: x1, t: "strong", at: strongAt, sub: "every read reflects", sub2: "the latest write", sub2At: strongAt + 6, align: "right" as const },
  ];
  const session = [
    { t: "read-your-writes", at: ryAt, sub: "the fix from question 5", subAt: ryAt },
    { t: "monotonic reads", at: monoAt, sub: "time never goes backwards", subAt: backAt },
  ];
  const lineP = ease(frame, strongAt - 6, 18);
  const midP = ease(frame, ryAt, 12);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: lineP }}>
        <line x1={x0} x2={x1} y1={lineY} y2={lineY} stroke={INK_SOFT} strokeWidth={3} strokeLinecap="round" />
      </svg>
      {ends.map((m, i) => {
        const p = ease(frame, m.at, 12);
        if (p <= 0) return null;
        const left = m.align === "left" ? m.x - 10 : m.x - 300;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: m.x - 11, top: lineY - 11, width: 22, height: 22, borderRadius: 11, background: INK, opacity: p, border: `3px solid ${PAPER}`, boxSizing: "border-box" }} />
            <div style={{ position: "absolute", left, top: lineY - 64, width: 300, textAlign: m.align, opacity: p, ...label(23, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
              {m.t}
            </div>
            <div style={{ position: "absolute", left, top: lineY + 28, width: 300, textAlign: m.align, opacity: p, ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>
              {m.sub}
            </div>
            <div style={{ position: "absolute", left, top: lineY + 58, width: 300, textAlign: m.align, opacity: ease(frame, m.sub2At, 10), ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>
              {m.sub2}
            </div>
          </React.Fragment>
        );
      })}
      {midP > 0 ? (
        <>
          <div style={{ position: "absolute", left: mid - 0.75, top: lineY + 14, width: 1.5, height: 68, background: INK_SOFT, opacity: 0.5 * midP }} />
          <div style={{ position: "absolute", left: mid - 11, top: lineY - 11, width: 22, height: 22, borderRadius: 11, background: BAR, opacity: midP, border: `3px solid ${PAPER}`, boxSizing: "border-box" }} />
          <div style={{ position: "absolute", left: mid - 150, top: lineY - 64, width: 300, textAlign: "center", opacity: midP, ...label(23, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>
            session guarantees
          </div>
        </>
      ) : null}
      {session.map((m, i) => (
        <React.Fragment key={m.t}>
          <div style={{ position: "absolute", left: mid - 150, top: lineY + 92 + i * 74, width: 300, textAlign: "center", opacity: ease(frame, m.at, 12), ...label(23, INK), fontWeight: 500, whiteSpace: "nowrap" }}>
            {m.t}
          </div>
          <div style={{ position: "absolute", left: mid - 150, top: lineY + 124 + i * 74, width: 300, textAlign: "center", opacity: ease(frame, m.subAt, 10), ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>
            {m.sub}
          </div>
        </React.Fragment>
      ))}
      {/* What each end suits. */}
      <Ink at={feedAt} dur={12} style={{ left: x0 - 10, top: lineY + c.h(250), whiteSpace: "nowrap" }}>
        <span style={{ ...note(23, INK), fontWeight: 500 }}>A feed can be eventual</span>
      </Ink>
      <Ink at={bankAt} dur={12} style={{ left: x1 - 380, top: lineY + c.h(250), whiteSpace: "nowrap" }}>
        <span style={{ ...note(23, INK), fontWeight: 500 }}>A bank balance usually needs strong</span>
      </Ink>
    </>
  );
};

/**
 * The quick round: two questions down the left, each answer on the right
 * while it is read, and the bison under the list.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const moreAt = n.word("rapid-in", "Two more");
  const end = n.beat("r-consist").to + 20;

  const items: RapidItem[] = [
    { n: 10, label: "Cache eviction policies", at: n.word("r-evict", "When a cache fills"), body: <Evict c={c} /> },
    { n: 11, label: "Consistency models", at: n.word("r-consist", "And the consistency models to know"), body: <Consist c={c} /> },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={moreAt} level={-32} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-32} />
      ))}
      <Sfx name="el-pop" at={moreAt + 8} level={-30} />

      <Drift from={from} to={end + 30}>
        <Kicker at={moreAt}>Quick round</Kicker>
        <Headline lead="Two more," turn="quickly." at={moreAt} turnAt={moreAt + 8} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={560} at={moreAt + 6} end={end} />
        <Spot id="bison" at={moreAt + 8} x={X0 + 40} y={y(640)} w={320} />
      </Drift>
    </AbsoluteFill>
  );
};
