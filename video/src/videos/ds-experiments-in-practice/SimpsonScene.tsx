import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { SANS } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { count, SIMPSON } from "./data";
import { at, CONTROL, Drift, OK, OK_INK, type Scale, TREAT, X0 } from "./parts";

const MIX_TOP = 400;
const MIX_W = 560;
const MIX_H = 62;
const MIX_GAP = 140;
const PLOT_X0 = 900;
const PLOT_X1 = 1720;
const ROW_Y = { Mobile: 440, Desktop: 560, Pooled: 720 } as const;
const MOBILE = ds("gray", 300);
const DESKTOP = ds("gray", 500);

/**
 * Question 4. The video's own rollout: the new checkout went mostly to
 * desktop and control mostly to mobile. Left, each arm's mix; right, the
 * rates as a paired dot plot. The new checkout is ahead on mobile (10% to 9%)
 * and on desktop (3.5% to 3%), and behind pooled (4.8% to 7.8%), because
 * desktop converts less and the new checkout got mostly desktop.
 */
export const SimpsonScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("simpson").from;
  const qAt = n.word("simpson", "Question four");
  const textAt = n.word("simpson", "What is Simpson's paradox");
  const unevenAt = n.word("simpson", "rolls out unevenly");
  const desktopMixAt = n.word("simpson", "most of its users are on desktop");
  const mobileMixAt = n.word("simpson", "most of control's are on mobile");
  const mobileAt = n.word("simpson", "On mobile, the new checkout");
  const mobileRatesAt = n.word("simpson", "ten percent against nine");
  const desktopAt = n.word("simpson", "On desktop, three");
  const desktopRatesAt = n.word("simpson", "three and a half against three");
  const bothAt = n.word("simpson", "It wins on both");
  const poolAt = n.word("simpson-pool", "Pool them");
  const losesAt = n.word("simpson-pool", "it loses");
  const becauseAt = n.word("simpson-pool", "because desktop converts less");
  const gotAt = n.word("simpson-pool", "got mostly desktop");
  const checkAt = n.word("simpson-pool", "Check the mix in each arm");
  const segAt = n.word("simpson-pool", "read the segments before the total");
  const end = n.beat("simpson-pool").to;

  const x: Scale = { lo: 0, hi: 12, a: PLOT_X0, b: PLOT_X1 };
  const seg = (s: "Mobile" | "Desktop" | "Pooled") => SIMPSON.find((r) => r.segment === s)!;
  const mob = seg("Mobile");
  const desk = seg("Desktop");

  // Each arm's users by device, from the same counts.
  const mixes = [
    { arm: "new checkout" as const, color: TREAT, mobile: mob.treatment.n, desktop: desk.treatment.n, at: desktopMixAt },
    { arm: "control" as const, color: CONTROL, mobile: mob.control.n, desktop: desk.control.n, at: mobileMixAt },
  ];
  const rows = [
    { key: "Mobile" as const, at: mobileAt, ratesAt: mobileRatesAt, verdictAt: bothAt, wins: true },
    { key: "Desktop" as const, at: desktopAt, ratesAt: desktopRatesAt, verdictAt: bothAt + 4, wins: true },
    { key: "Pooled" as const, at: poolAt, ratesAt: poolAt + 6, verdictAt: losesAt, wins: false },
  ];
  const deskLight = ease(frame, becauseAt, 12) * (1 - ease(frame, checkAt, 12));
  const gotLight = ease(frame, gotAt, 12) * (1 - ease(frame, checkAt, 12));

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={desktopMixAt} level={-37} />
      <Sfx name="el-tap" at={mobileRatesAt} level={-36} />
      <Sfx name="el-tap" at={desktopRatesAt} level={-36} />
      <Sfx name="el-scratch" at={losesAt} level={-34} />
      <Sfx name="el-pop" at={checkAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={62}>
          What is Simpson's paradox in an experiment?
        </QuestionCard>
        <Note at={unevenAt} x={X0} y={y(MIX_TOP) - h(66)}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>a rollout that went out unevenly (the video's own numbers)</span>
        </Note>

        {/* Each arm's users, by device. */}
        {mixes.map((m, i) => {
          const p = ease(frame, m.at - 2, 16);
          if (p <= 0) return null;
          const total = m.mobile + m.desktop;
          const top = y(MIX_TOP) + i * h(MIX_GAP);
          const wm = (m.mobile / total) * MIX_W * p;
          const wd = (m.desktop / total) * MIX_W * p;
          const lit = i === 0 ? gotLight : 0;
          return (
            <React.Fragment key={m.arm}>
              <div style={{ position: "absolute", left: X0, top: top - h(4), ...note(25, INK), fontWeight: 700, whiteSpace: "nowrap", opacity: p }}>
                <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: 8, background: m.color, marginRight: 10 }} />
                {m.arm}
              </div>
              <div style={{ position: "absolute", left: X0, top: top + h(30), width: wm, height: h(MIX_H), background: MOBILE, borderRadius: "4px 0 0 4px" }} />
              <div
                style={{
                  position: "absolute",
                  left: X0 + wm,
                  top: top + h(30),
                  width: wd,
                  height: h(MIX_H),
                  background: DESKTOP,
                  borderRadius: "0 4px 4px 0",
                  boxShadow: lit > 0 ? `0 0 0 ${5 * lit}px ${HIGHLIGHT}` : undefined,
                }}
              />
              {[
                { text: `${count(m.mobile)} mobile`, left: X0 + 12, w: wm, ink: INK },
                { text: `${count(m.desktop)} desktop`, left: X0 + wm + 12, w: wd, ink: PAPER },
              ].map((s) =>
                s.w > 150 ? (
                  <div
                    key={s.text}
                    style={{ position: "absolute", left: s.left, top: top + h(30) + h(MIX_H) / 2 - 13, ...label(20, s.ink), fontWeight: 700, whiteSpace: "nowrap", ...TABULAR, opacity: ease(frame, m.at + 10, 10) }}
                  >
                    {s.text}
                  </div>
                ) : (
                  <div
                    key={s.text}
                    style={{ position: "absolute", left: X0 + 2, top: top + h(30) + h(MIX_H) + 6, ...label(19, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR, opacity: ease(frame, m.at + 10, 10) }}
                  >
                    {s.text}
                  </div>
                ),
              )}
            </React.Fragment>
          );
        })}

        {/* The rates, as pairs on one axis. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <g opacity={ease(frame, mobileAt - 4, 12)}>
            <line x1={x.a} x2={x.b} y1={y(820)} y2={y(820)} stroke={INK} strokeWidth={1.4} />
            {[0, 2, 4, 6, 8, 10, 12].map((v) => (
              <g key={v}>
                <line x1={at(x, v)} x2={at(x, v)} y1={y(400)} y2={y(820)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.45} />
                <text x={at(x, v)} y={y(820) + 30} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 20, fill: INK_SOFT, fontVariantNumeric: "tabular-nums" }}>
                  {v}%
                </text>
              </g>
            ))}
            <text x={x.b} y={y(820) + 58} textAnchor="end" style={{ fontFamily: SANS, fontSize: 19, fontWeight: 650, fill: INK_SOFT }}>
              converted
            </text>
          </g>
          <line x1={x.a - 20} x2={x.b} y1={y(640)} y2={y(640)} stroke={HAIRLINE} strokeWidth={1} opacity={ease(frame, poolAt - 4, 10)} />
          {rows.map((r) => {
            const d = seg(r.key);
            const p = ease(frame, r.ratesAt - 2, 14);
            if (p <= 0) return null;
            const cx = at(x, d.control.rate);
            const tx = at(x, d.treatment.rate);
            const v = ease(frame, r.verdictAt, 12);
            const lit = r.key === "Desktop" ? deskLight : 0;
            return (
              <g key={r.key}>
                {lit > 0 ? <rect x={at(x, 2)} y={y(ROW_Y[r.key]) - 30} width={at(x, 4.5) - at(x, 2)} height={60} rx={8} fill={HIGHLIGHT} opacity={lit} /> : null}
                <line x1={cx} x2={cx + (tx - cx) * p} y1={y(ROW_Y[r.key])} y2={y(ROW_Y[r.key])} stroke={v > 0 ? (r.wins ? OK : ACCENT) : INK_SOFT} strokeWidth={3} />
                <circle cx={cx} cy={y(ROW_Y[r.key])} r={13 * p} fill={CONTROL} />
                <circle cx={tx} cy={y(ROW_Y[r.key])} r={13 * p} fill={TREAT} />
              </g>
            );
          })}
        </svg>
        {rows.map((r) => {
          const d = seg(r.key);
          const left = Math.min(d.control.rate, d.treatment.rate);
          const right = Math.max(d.control.rate, d.treatment.rate);
          const leftIsTreat = d.treatment.rate < d.control.rate;
          const o = ease(frame, r.ratesAt + 4, 10);
          return (
            <React.Fragment key={r.key}>
              <div
                style={{ position: "absolute", left: PLOT_X0 - 20, top: y(ROW_Y[r.key]) - h(64), ...note(25, INK), fontWeight: 700, whiteSpace: "nowrap", opacity: ease(frame, r.at - 2, 10) }}
              >
                {r.key}
              </div>
              <div style={{ position: "absolute", right: 1920 - at(x, left) + 22, top: y(ROW_Y[r.key]) - 15, ...label(21, leftIsTreat ? TREAT : INK_SOFT), fontWeight: 750, ...TABULAR, opacity: o }}>
                {left}%
              </div>
              <div style={{ position: "absolute", left: at(x, right) + 22, top: y(ROW_Y[r.key]) - 15, ...label(21, leftIsTreat ? INK_SOFT : TREAT), fontWeight: 750, ...TABULAR, opacity: o }}>
                {right}%
              </div>
              <Note at={r.verdictAt} x={PLOT_X0 + 130} y={y(ROW_Y[r.key]) - h(64)}>
                <span style={{ ...note(25, r.wins ? OK_INK : ACCENT_INK), fontWeight: 750, whiteSpace: "nowrap" }}>
                  {r.wins ? "new checkout wins" : "new checkout loses"}
                </span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={becauseAt + 4} x={X0} y={y(700)} width={720}>
          <span style={{ ...note(25, INK) }}>desktop converts less, and the new checkout got mostly desktop</span>
        </Note>
        <Note at={checkAt - 2} x={X0} y={y(790)} width={720}>
          <span style={{ ...note(27, OK_INK), fontWeight: 700 }}>
            Check the mix in each arm<span style={{ opacity: ease(frame, segAt - 2, 10) }}>; read the segments before the total.</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
