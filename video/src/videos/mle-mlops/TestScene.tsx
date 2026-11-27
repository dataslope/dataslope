import { Crown, MousePointerClick, ScrollText, Users } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HIGHLIGHT, INK, INK_SOFT } from "../../editorial/style";
import { ColumnRule } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { BadgeRow, BLOCK, Box, CornerLoop, Drift, lerp, Line, Mark, OK_INK, Q_SIZE, Q_W, X0, YELLOW_INK } from "./parts";

const PANEL_B = 1000;
const RULE_X = 930;
const LIST_W = 180;
const SHOWN = BLOCK;
const UNSHOWN = ds("gray", 200);

/** A model's recommendations: three items as filled blocks, one under another. */
const List: React.FC<{ x: number; y: number; rowH: number; at: number; color: string; fade?: number; clicks?: readonly number[]; clickAt?: number }> = ({
  x,
  y,
  rowH,
  at,
  color,
  fade = -1,
  clicks = [],
  clickAt,
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {[0, 1, 2].map((i) => {
        const p = ease(frame, at + i * 3, 10);
        if (p <= 0) return null;
        const c = clickAt !== undefined && clicks.includes(i) ? ease(frame, clickAt + i * 4, 10) : 0;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: x,
                top: y + i * (rowH + 10),
                width: LIST_W,
                height: rowH,
                borderRadius: 4,
                background: color,
                opacity: p * (i === fade ? 0.4 : 1),
              }}
            />
            {c > 0 ? (
              <div style={{ position: "absolute", left: x + LIST_W + 12, top: y + i * (rowH + 10) + rowH / 2 - 13, opacity: c }}>
                <MousePointerClick size={26} strokeWidth={2.2} color={BLUE_INK} />
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

/**
 * Question 12: a shadow test checks parity (outputs, latency) but never
 * impact, since users only see the champion's list and nobody clicks an item
 * they were never shown; an A/B test shows each variant to real users and
 * compares click-through and conversion: impact, at the price of exposure.
 * Then champion and challenger: the champion serves, challengers run beside
 * it in shadow or on a canary slice, and one takes the crown only by beating
 * it on live traffic.
 */
export const TestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q12").from;
  const qAt = n.word("q12", "Question twelve");
  const textAt = n.word("q12", "What is A B testing");
  const parityAt = n.word("q12", "A shadow test can check parity");
  const outputsAt = n.word("q12", "in outputs and latency");
  const neverAt = n.word("q12", "but never impact");
  const onlyAt = n.word("q12", "users only see the current model's predictions");
  const nobodyAt = n.word("q12", "Nobody can click a recommendation");
  const abAt = n.word("q12-ab", "An A B test serves each variant");
  const realAt = n.word("q12-ab", "to real users");
  const metricsAt = n.word("q12-ab", "compares business metrics");
  const clickAt = n.word("q12-ab", "click-through or conversion");
  const impactAt = n.word("q12-ab", "It measures impact");
  const exposureAt = n.word("q12-ab", "at the price of exposure");
  const routineAt = n.word("q12-champ", "Champion and challenger names the routine");
  const servesAt = n.word("q12-champ", "the champion serves production");
  const besideAt = n.word("q12-champ", "challengers run beside it");
  const shadowAt = n.word("q12-champ", "in shadow");
  const canaryAt = n.word("q12-champ", "or on a canary slice");
  const takesAt = n.word("q12-champ", "one takes over");
  const liveAt = n.word("q12-champ", "beating it on live traffic");
  const offlineAt = n.word("q12-champ", "not just on an offline benchmark");
  const end = n.beat("q12-champ").to;

  const rowH = h(30);
  const listTop = y(420);
  const listsBottom = listTop + 3 * rowH + 20;
  const champTop = y(746);
  const champH = h(84);
  const crown = ease(frame, liveAt, 24);
  const C = [
    { x: X0, w: 290 },
    { x: X0 + 360, w: 290 },
    { x: X0 + 720, w: 290 },
  ];
  const crownX = lerp(C[0].x + C[0].w / 2, C[2].x + C[2].w / 2, crown);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={parityAt} level={-32} />
      <Sfx name="el-tap" at={nobodyAt} level={-31} />
      <Sfx name="el-tap" at={abAt} level={-32} />
      <Sfx name="el-sprinkle" at={clickAt} level={-33} />
      <Sfx name="el-tap" at={impactAt} level={-31} />
      <Sfx name="el-tap" at={exposureAt} level={-31} />
      <Sfx name="el-tap" at={servesAt} level={-31} />
      <Sfx name="el-whoosh" at={liveAt} level={-36} />
      <Sfx name="el-chime" at={offlineAt + 30} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={12} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={Q_W}>
          What is A/B testing for models, and how does it differ from shadow testing?
        </QuestionCard>
        <CornerLoop at={qAt} lit="ship" />

        {/* ── A shadow test ── */}
        <Line at={parityAt - 2} x={X0} y={y(300)} size={26} color={INK}>
          Shadow test
        </Line>
        <Line at={parityAt + 2} x={X0} y={y(356)} size={22} color={INK_SOFT}>
          <Users size={21} strokeWidth={2.2} color={INK_SOFT} style={{ verticalAlign: "-0.15em", marginRight: 8 }} />
          users <Mark at={onlyAt}>only</Mark> see the current model&apos;s
        </Line>
        <List x={X0} y={listTop} rowH={rowH} at={parityAt + 4} color={SHOWN} />
        <Line at={parityAt + 8} x={X0 + 450} y={y(356)} size={22} color={INK_SOFT}>
          <ScrollText size={21} strokeWidth={2.2} color={INK_SOFT} style={{ verticalAlign: "-0.15em", marginRight: 8 }} />
          the new model&apos;s, to a log
        </Line>
        {/* The new model's pick nobody saw: lit while it is named. The names
            champion and challenger wait for q12-champ, which defines them. */}
        <div
          style={{
            position: "absolute",
            left: X0 + 450 - 10,
            top: listTop + rowH + 10 - 8,
            width: LIST_W + 20,
            height: rowH + 16,
            borderRadius: 6,
            background: HIGHLIGHT,
            opacity: ease(frame, nobodyAt, 12),
          }}
        />
        <List x={X0 + 450} y={listTop} rowH={rowH} at={parityAt + 10} color={UNSHOWN} fade={ease(frame, nobodyAt, 12) > 0.5 ? 1 : -1} />
        <BadgeRow
          x={X0}
          y={listsBottom + h(30)}
          size={22}
          gap={14}
          items={[
            { text: "parity: outputs, latency", at: outputsAt - 2, tone: "blue" },
            { text: "impact: never", at: neverAt - 2, tone: "red" },
          ]}
        />
        <Line at={nobodyAt + 4} x={X0 + 450 + LIST_W + 20} y={listTop + rowH + 10 - 4} size={22} color={YELLOW_INK}>
          never shown,
        </Line>
        <Line at={nobodyAt + 10} x={X0 + 450 + LIST_W + 20} y={listTop + rowH + 10 + 26} size={22} color={YELLOW_INK}>
          so never clicked
        </Line>

        {/* ── An A/B test ── */}
        <ColumnRule x={RULE_X + 45} top={y(300)} height={listsBottom + h(80) - y(300)} at={abAt} />
        <Line at={abAt - 2} x={PANEL_B} y={y(300)} size={26} color={INK}>
          A/B test
        </Line>
        <Line at={realAt - 2} x={PANEL_B} y={y(356)} size={22} color={INK_SOFT}>
          <Users size={21} strokeWidth={2.2} color={INK_SOFT} style={{ verticalAlign: "-0.15em", marginRight: 8 }} />
          half the users: current
        </Line>
        <List x={PANEL_B} y={listTop} rowH={rowH} at={realAt} color={SHOWN} clicks={[0, 2]} clickAt={clickAt} />
        <Line at={realAt + 6} x={PANEL_B + 340} y={y(356)} size={22} color={INK_SOFT}>
          <Users size={21} strokeWidth={2.2} color={INK_SOFT} style={{ verticalAlign: "-0.15em", marginRight: 8 }} />
          half: new
        </Line>
        <List x={PANEL_B + 340} y={listTop} rowH={rowH} at={realAt + 6} color={SHOWN} clicks={[1]} clickAt={clickAt + 6} />
        <Line at={metricsAt - 2} x={PANEL_B} y={listsBottom + h(34)} size={22} color={INK}>
          Compare business metrics<span style={{ opacity: ease(frame, clickAt - 2, 10) }}>: click-through, conversion</span>
        </Line>
        <BadgeRow
          x={PANEL_B}
          y={listsBottom + h(82)}
          size={22}
          gap={14}
          items={[
            { text: "impact", at: impactAt - 2, tone: "green" },
            { text: "at the price of exposure", at: exposureAt - 2, tone: "yellow" },
          ]}
        />

        {/* ── Champion and challenger ── */}
        <Line at={routineAt - 2} x={X0} y={champTop - h(100)} size={24} color={INK}>
          Champion and challenger<span style={{ color: INK_SOFT, opacity: ease(frame, besideAt - 2, 10) }}>: challengers run beside it</span>
        </Line>
        <Box x={C[0].x} y={champTop} w={C[0].w} h={champH} at={servesAt - 2} title="Champion" sub="serves production" size={24} to="plain" toAt={liveAt} />
        <Box x={C[1].x} y={champTop} w={C[1].w} h={champH} at={shadowAt - 2} title="Challenger" sub="in shadow" size={24} />
        <Box x={C[2].x} y={champTop} w={C[2].w} h={champH} at={canaryAt - 2} title="Challenger" sub="on a canary slice" size={24} tone="plain" to="ok" toAt={liveAt + 20} />
        {ease(frame, servesAt, 10) > 0 ? (
          <div style={{ position: "absolute", left: crownX - 18, top: champTop - 44 - Math.sin(crown * Math.PI) * 30, opacity: ease(frame, servesAt + 4, 10) }}>
            <Crown size={36} strokeWidth={2.2} color={ds("yellow", 700)} fill={ds("yellow", 300)} />
          </div>
        ) : null}
        <Line at={takesAt - 2} x={C[2].x + C[2].w + 70} y={champTop + h(4)} size={24} color={OK_INK}>
          Takes over by beating it on live traffic
        </Line>
        <Line at={offlineAt - 2} x={C[2].x + C[2].w + 70} y={champTop + h(4) + 38} size={22} color={INK_SOFT}>
          not just on an offline benchmark
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
