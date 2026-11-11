import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { inkOf } from "../../theme/brand";
import { OPENING, thousands } from "./data";
import { Bar, Cylinder, Drift, Flow, Headline, Kicker, Node, pulse, Spot, X0 } from "./parts";

const FIG_TOP = 290;
const API = { x: X0, w: 170 };
/** The database, painted, centred where the drawn one stood. */
const DB = { x: 680, w: 210 };
const BARS_TOP = 562;
const CHIPS_Y = 733;
const SQUARES_Y = 794;
const SQ = 48;
const SQ_GAP = 10;
const SMALL = 36;
const DEEP = 11;
const QUICK = 5;

/**
 * The opening. An API on the left, its requests going into a database: a
 * read that has to be fast, a write that has to be right, and a second write
 * landing beside the first at the same moment. The database takes its name,
 * PostgreSQL 18.3, as the narration says every number here ran on it, and
 * the tables the video runs against arrive as row counts: the two big ones
 * as bars, the small ones as chips. Then the promise, counted from what the
 * video does: eleven numbered squares for the questions worked through, five
 * smaller ones for the quick round, and the first square carrying a second
 * question, from system design. The chipmunk, the video's hero, sits on the
 * right.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const apiAt = n.word("hook", "Behind an API");
  const dbAt = n.word("hook", "usually that's a database");
  const readsAt = n.word("hook", "Its reads have to be fast");
  const fastAt = n.word("hook", "fast", { nth: 1 });
  const writesAt = n.word("hook", "its writes have to be right");
  const rightAt = n.word("hook", "right", { nth: 1 });
  const anotherAt = n.word("hook", "another write lands");
  const momentAt = n.word("hook", "the same moment");
  const postgresAt = n.word("hook-run", "a run in Postgres");
  const usersAt = n.word("hook-run", "a million users");
  const ordersAt = n.word("hook-run", "a million orders");
  const smallAt = n.word("hook-run", "a few small tables");
  const sixteenAt = n.word("plan", "Sixteen questions");
  const plusAt = n.word("plan", "plus one from system design");
  const elevenAt = n.word("plan", "Eleven are worked through");
  const fiveAt = n.word("plan", "five go quickly");
  const end = n.beat("plan").to;

  const top = y(FIG_TOP);
  const apiH = h(150);
  // Raised so its foot stands well clear of the note under it.
  const dbTop = top - h(32);
  const readY = top + h(44);
  const writeY = top + h(104);
  const otherTop = top + h(178);
  const otherH = h(56);
  const otherY = otherTop + otherH / 2;
  const sqTop = y(SQUARES_Y);
  const sqX = (i: number) => (i < DEEP ? X0 + i * (SQ + SQ_GAP) : X0 + DEEP * (SQ + SQ_GAP) + 22 + (i - DEEP) * (SMALL + 8));
  const squaresEnd = sqX(DEEP + QUICK - 1) + SMALL;

  const chips: { name: string; rows: number; at: number }[] = [
    { name: "accounts", rows: 2, at: smallAt },
    { name: "items", rows: 1, at: smallAt + 4 },
    { name: "customers", rows: 24, at: smallAt + 8 },
    { name: "orders", rows: 24, at: smallAt + 12 },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={from + 12} level={-30} />
      <Sfx name="el-pop" at={dbAt} level={-32} />
      <Sfx name="el-pencil" at={readsAt + 2} level={-35} />
      <Sfx name="el-pencil" at={writesAt + 2} level={-35} />
      <Sfx name="el-whoosh" at={anotherAt + 2} level={-35} />
      <Sfx name="el-tap" at={postgresAt + 2} level={-33} />
      <Sfx name="el-tap" at={usersAt} level={-33} />
      <Sfx name="el-tap" at={ordersAt} level={-33} />
      <Sfx name="el-sprinkle" at={smallAt + 2} level={-34} />
      <Sfx name="el-sprinkle" at={sixteenAt} level={-33} />
      <Sfx name="el-tap" at={plusAt + 4} level={-33} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Backend engineer interview questions</Kicker>
        <Headline lead="Fast reads," turn="right writes." at={from + 4} turnAt={writesAt} size={70} />

        <Spot art="chipmunk" at={from + 12} left={1230} top={y(292)} width={540} />

        {/* ── An API, a database, and the requests between them ── */}
        <Node x={API.x} y={top} w={API.w} h={apiH} at={apiAt - 2} tone="plain" title="API" sub="requests" size={30} bare />
        <Cylinder x={DB.x} y={dbTop} w={DB.w} at={dbAt - 2} title="database" swapTo="PostgreSQL" swapAt={postgresAt + 2} size={24} />
        <Flow points={[[API.x + API.w + 8, readY], [DB.x - 12, readY]]} at={readsAt} color={BAR} width={3} />
        <Note at={fastAt - 4} x={API.x + API.w + 40} y={readY - h(44)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            read: <b style={{ color: BLUE_INK }}>fast</b>
          </span>
        </Note>
        <Flow points={[[API.x + API.w + 8, writeY], [DB.x - 12, writeY]]} at={writesAt} color={INK} width={3} />
        <Note at={rightAt - 4} x={API.x + API.w + 40} y={writeY - h(44)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            write: <b>right</b>
          </span>
        </Note>
        {/* A second request, writing at the same moment as the first. */}
        <Node x={API.x} y={otherTop} w={API.w} h={otherH} at={anotherAt - 4} tone="look" title="another request" size={21} bare />
        <Flow
          points={[
            [API.x + API.w + 8, otherY],
            [API.x + API.w + 150, otherY],
            [API.x + API.w + 150, writeY + h(24)],
            [DB.x - 12, writeY + h(24)],
          ]}
          at={anotherAt}
          color={inkOf.yellow}
          width={3}
        />
        {/* Well clear of the painted cylinder's foot, which stands above it. */}
        <Note at={momentAt - 2} x={API.x + API.w + 176} y={top + h(218)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>another write, at the same moment</span>
        </Note>

        {/* ── The tables every number ran on ── */}
        <Bar
          x={X0}
          y={y(BARS_TOP)}
          width={560}
          max={OPENING.users}
          at={usersAt - 2}
          label={
            <>
              <b>users</b>
            </>
          }
          shown={
            <>
              <Num>{thousands(OPENING.users)}</Num> rows
            </>
          }
          segments={[{ value: OPENING.users, color: BAR }]}
        />
        <Bar
          x={X0}
          y={y(BARS_TOP) + h(84)}
          width={560}
          max={OPENING.orders}
          at={ordersAt - 2}
          label={
            <>
              <b>orders</b>
              <span style={{ color: INK_SOFT }}>
                , <Num>{OPENING.perCustomer}</Num> each for <Num>{thousands(OPENING.customers)}</Num> customers
              </span>
            </>
          }
          shown={
            <>
              <Num>{thousands(OPENING.orders)}</Num> rows
            </>
          }
          segments={[{ value: OPENING.orders, color: BAR }]}
        />
        <div style={{ position: "absolute", left: X0, top: y(CHIPS_Y), display: "flex", alignItems: "baseline", gap: "0.5em", fontSize: 22, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK_SOFT), opacity: ease(frame, smallAt - 2, 10) }}>and small ones:</span>
          {chips.map((c, i) => (
            <span key={c.name} style={{ ...note(22, INK), opacity: ease(frame, c.at, 10) }}>
              {i > 0 ? <span style={{ color: INK_SOFT, marginRight: "0.5em" }}>·</span> : null}
              <b>{c.name}</b> <span style={{ ...TABULAR, color: BLUE_INK, fontWeight: 500 }}>{c.rows}</span>
            </span>
          ))}
        </div>

        {/* ── Sixteen questions: eleven worked through, five quick ── */}
        {Array.from({ length: DEEP + QUICK }, (_, i) => {
          const deep = i < DEEP;
          const at = sixteenAt - 2 + i * 1.5;
          const p = ease(frame, at, 10);
          if (p <= 0) return null;
          const tone = deep ? ease(frame, elevenAt + i * 1.5, 10) : ease(frame, fiveAt + (i - DEEP) * 2, 10);
          const size = deep ? SQ : SMALL;
          const glow = deep ? pulse(frame, elevenAt + i * 1.5, 16) : pulse(frame, fiveAt + (i - DEEP) * 2, 16);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: sqX(i),
                top: sqTop + (SQ - size) / 2,
                width: size,
                height: size,
                borderRadius: 4,
                boxSizing: "border-box",
                border: `2px solid ${BAR}`,
                background: `color-mix(in srgb, ${BAR} ${12 + 78 * tone}%, ${PAPER})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...label(deep ? 21 : 19, tone > 0.5 ? PAPER : BLUE_INK),
                fontWeight: 500,
                ...TABULAR,
                opacity: p,
                transform: `scale(${(0.7 + 0.3 * p) * (1 + 0.12 * glow)})`,
              }}
            >
              {i + 1}
            </div>
          );
        })}
        {/* Question 1 carries system design's question too. */}
        <div
          style={{
            position: "absolute",
            left: sqX(0) + SQ - 14,
            top: sqTop - 16,
            ...label(19, INK),
            fontWeight: 500,
            background: HIGHLIGHT,
            borderRadius: 999,
            padding: "0 7px",
            lineHeight: 1.3,
            opacity: ease(frame, plusAt, 10),
            transform: `scale(${0.7 + 0.3 * ease(frame, plusAt, 10)})`,
          }}
        >
          +1
        </div>
        <Note at={elevenAt} x={squaresEnd + 34} y={sqTop - h(30)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <b>11</b> worked through
          </span>
        </Note>
        <Note at={fiveAt} x={squaresEnd + 34} y={sqTop + h(4)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            <b>5</b> quickly, at the end
          </span>
        </Note>
        <Note at={plusAt + 4} x={squaresEnd + 34} y={sqTop + h(38)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            <b style={{ color: INK }}>+1</b> from system design, with question 1
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
