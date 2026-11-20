import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { money } from "./data";
import { acme, Axis, Band, Drift, Headline, Kicker, Mark, Pin, Spot, VMark, X0 } from "./parts";

/** The hook's timeline stops short of the crab on the right. */
const TL_X1 = 1180;
const LABEL_Y = 290;
const BAND_Y = 400;
const BAND_H = 58;
const CRAB = { left: 1230, top: 560, width: 580 } as const;

/**
 * The opening, on the page's own customer 42: Acme Corp's East years as a
 * band on a timeline, order 5001 placed inside them, the move West on
 * 2023-06-15, and today's question of which region the order belongs to.
 * Both answers are set down in plain ink (neither is the right one), then
 * the name of the thing and the round: nine questions, seven worked through.
 * The hermit crab, which moves into a new shell, sits beside the line.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const startAt = n.word("hook", "In May 2022");
  const acmeAt = n.word("hook", "Acme Corp");
  const orderAt = n.word("hook", "placed a twelve hundred dollar order");
  const eastAt = n.word("hook", "from the East");
  const summerAt = n.word("hook", "The next summer");
  const westAt = n.word("hook", "it moved West");
  const todayAt = n.word("hook", "Today");
  const whichAt = n.word("hook", "which region");
  const bothAt = n.word("hook-both", "Both answers can be right");
  const wasAt = n.word("hook-both", "the East, as it was");
  const isAt = n.word("hook-both", "the West, as it is");
  const dependsAt = n.word("hook-both", "depends on how");
  const scdAt = n.word("plan", "a slowly changing dimension");
  const orAt = n.word("plan", "or SCD");
  const nineAt = n.word("plan", "Nine questions");
  const lateAt = n.word("plan", "on data that arrives late");
  const sevenAt = n.word("plan", "seven worked through");
  const twoAt = n.word("plan", "two quick ones");
  const end = n.beat("plan").to;

  const A = acme(X0, TL_X1);
  const [east, west] = A.versions;
  const order = A.orders[0];
  const bandTop = y(BAND_Y);
  const bandH = h(BAND_H);
  const axisTop = bandTop + bandH + h(14);
  const labelTop = y(LABEL_Y);
  const aboveBand = bandTop - h(48);
  const rule = y(548);
  const colTop = y(578);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={startAt + 12} level={-31} />
      <Sfx name="el-whoosh" at={acmeAt} level={-36} />
      <Sfx name="el-tap" at={orderAt + 6} level={-33} />
      <Sfx name="el-whoosh" at={westAt + 2} level={-36} />
      <Sfx name="el-tap" at={whichAt + 2} level={-34} />
      <Sfx name="el-pencil" at={bothAt} level={-36} />
      <Sfx name="el-chime" at={nineAt} level={-37} />

      <Drift from={0} to={end + 20}>
        <Kicker at={startAt}>Analytics engineer interview questions</Kicker>
        <Headline lead="Dimensions that change" at={startAt + 4} size={72} />
        <Spot art="crab" at={startAt + 12} left={CRAB.left} top={y(CRAB.top)} width={CRAB.width} />

        {/* Whose line this is. */}
        <Note at={acmeAt - 2} x={X0} y={aboveBand}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>
            Acme Corp, customer <Num>42</Num>
          </span>
        </Note>

        <Axis tl={A} top={axisTop} at={startAt + 2} years={["2020", "2021", "2022", "2023", "2024"]} />
        <Band
          x0={east.x0}
          x1={east.x1}
          top={bandTop}
          h={bandH}
          at={acmeAt}
          label={east.region}
          size={24}
          tones={[
            { at: eastAt, tone: "look" },
            { at: summerAt, tone: "plain" },
            { at: wasAt, tone: "look" },
            { at: isAt, tone: "plain" },
          ]}
        />
        <Band
          x0={west.x0 + 3}
          x1={TL_X1}
          top={bandTop}
          h={bandH}
          at={westAt + 2}
          label={west.region}
          size={24}
          tones={[
            { at: isAt, tone: "look" },
            { at: dependsAt + 10, tone: "plain" },
          ]}
        />

        {/* The order, pinned to its date inside the East years. */}
        <Pin
          x={order.x}
          top={labelTop}
          bottom={bandTop}
          at={orderAt}
          title={
            <Mark at={whichAt + 2} out={bothAt}>
              Order <Num>{order.id}</Num>
            </Mark>
          }
          sub={
            <>
              {order.date} · $<Num>{money(order.amount)}</Num>
            </>
          }
          tones={[{ at: wasAt, tone: "look" }, { at: isAt, tone: "plain" }]}
        />

        {/* The move, on its date. */}
        <VMark x={A.moveX} top={bandTop - h(26)} bottom={bandTop + bandH + h(8)} at={westAt} />
        <Note at={westAt + 4} x={A.moveX + 12} y={aboveBand}>
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Moved {west.from}</span>
        </Note>

        {/* Today, at the far end. */}
        <VMark x={TL_X1} top={bandTop - h(26)} bottom={bandTop + bandH} at={todayAt} solid width={3} />
        <Note at={todayAt + 2} x={TL_X1 - 12} y={aboveBand} align="right" from="right">
          <span style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Today</span>
        </Note>

        {/* The question, beside the order. */}
        <Note at={whichAt} x={order.x + 190} y={labelTop + h(4)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>East or West?</span>
        </Note>

        {/* Both answers, in plain ink: neither is the right one. */}
        <div style={{ position: "absolute", left: X0, top: rule, width: (TL_X1 - X0) * ease(frame, bothAt, 16), height: 1, background: HAIRLINE }} />
        <Note at={wasAt} x={X0} y={colTop}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>As it was: East</span>
        </Note>
        <ColumnRule x={X0 + 300} top={colTop + 2} height={h(36)} at={isAt} />
        <Note at={isAt} x={X0 + 340} y={colTop}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>As it is: West</span>
        </Note>
        <Note at={dependsAt} x={X0} y={colTop + h(62)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>Depends on how the customer&rsquo;s row took the move</span>
        </Note>

        {/* What it is called, and the round. */}
        <Note at={scdAt} x={X0} y={y(728)}>
          <span style={{ ...note(32, INK), whiteSpace: "nowrap" }}>
            A slowly changing dimension<span style={{ opacity: ease(frame, orAt, 10) }}> (<b style={{ color: BLUE_INK }}>SCD</b>)</span>
          </span>
        </Note>
        <Note at={nineAt - 2} x={X0} y={y(788)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>
              <Num>9</Num> questions
            </b>{" "}
            on dimensions that change
            <span style={{ opacity: ease(frame, lateAt, 10) }}>, and on data that arrives late</span>
          </span>
        </Note>
        <Note at={sevenAt - 2} x={X0} y={y(838)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>
              <Num>7</Num>
            </b>{" "}
            worked through
            <span style={{ opacity: ease(frame, twoAt - 2, 10) }}>
              , then <b style={{ color: BLUE_INK }}><Num>2</Num></b> quick ones
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
