import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label } from "../../editorial/style";
import { Badge, ColumnRule, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO, SANS } from "../../theme/fonts";
import { DASHBOARDS, FAN, money, POSTGRES } from "./data";
import { Drift, Headline, Kicker, Listing, noteLine, pulse, SERIES, Spot, spotH, Tile, X0 } from "./parts";

/** The four tests the opening shows, by the check that ran each one. */
const TESTS: Record<(typeof FAN.tests)[number]["id"], { test: string; on: string }> = {
  testUnique: { test: "unique", on: "orders.order_id" },
  testNotNull: { test: "not_null", on: "orders.order_id" },
  testItemsNotNull: { test: "not_null", on: "order_items.order_id" },
  testRelationships: { test: "relationships", on: "order_items.order_id" },
};

const TESTS_Y = 290;
const COL = 320;
const TILE_Y = 420;
const TILE_W = 400;
const TILE_H = 160;
const TILE_B = 860;
const DIALS = { x: 600, w: 180 };
const HERO = { x: 1530, w: 290 };
const SQUARES_Y = 800;
const SQ = 48;
const SMALL = 36;
const DEEP = 8;
const QUICK = 11;

/**
 * The opening, the plan's bridge from Part 7: every test on the page's two
 * tables passes (four checks, each "pass" in neutral ink, since passing is
 * not the right answer here), and two dashboards titled "Revenue" read
 * 1,949.25 and 4,555.25. Under them, the two queries, small and unmarked as
 * wrong: orders alone, and the page's join. Then the promise, counted from
 * what the video does: eight numbered squares and ten smaller ones. The
 * pelican, the hero, holds its one catch on the right.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const testsAt = n.word("hook", "Every test passes");
  const twoAt = n.word("hook", "Two dashboards");
  const aAt = n.word("hook", "nineteen hundred forty-nine");
  const bAt = n.word("hook", "forty-five hundred fifty-five");
  const errorsAt = n.word("hook-meaning", "Neither query errors");
  const wrongAt = n.word("hook-meaning", "neither looks wrong");
  const definesAt = n.word("hook-meaning", "who defines a number");
  const joinsAt = n.word("hook-meaning", "the joins that quietly change it");
  const eighteenAt = n.word("plan", "Nineteen questions");
  const eightAt = n.word("plan", "Eight are worked through");
  const pageAt = n.word("plan", "the page's own orders in Postgres");
  const tenAt = n.word("plan", "eleven come quickly");
  const end = n.beat("plan").to;

  const testsTop = y(TESTS_Y);
  const tileTop = y(TILE_Y);
  const listTop = tileTop + TILE_H + 44;
  const sqTop = y(SQUARES_Y);
  const sqX = (i: number) => (i < DEEP ? X0 + i * (SQ + 10) : X0 + DEEP * (SQ + 10) + 22 + (i - DEEP) * (SMALL + 8));
  const squaresEnd = sqX(DEEP + QUICK - 1) + SMALL;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={from + 12} level={-30} />
      <Sfx name="el-sprinkle" at={testsAt + 2} level={-34} />
      <Sfx name="el-pop" at={twoAt} level={-30} />
      <Sfx name="el-tap" at={aAt} level={-32} />
      <Sfx name="el-tap" at={bAt} level={-32} />
      <Sfx name="el-pencil" at={errorsAt} level={-35} />
      <Sfx name="el-sprinkle" at={eighteenAt} level={-33} />
      <Sfx name="el-tap" at={eightAt} level={-33} />
      <Sfx name="el-tap" at={tenAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>{SERIES}</Kicker>
        <Headline lead="Every test passes." turn="Two revenues." at={testsAt - 4} turnAt={twoAt - 2} size={70} />

        <Spot art="pelican" at={from + 12} left={HERO.x} top={y(TESTS_Y)} width={HERO.w} />

        {/* ── Four tests on the page's two tables, every one passing ── */}
        {FAN.tests.map((t, i) => {
          const at = testsAt + i * 4;
          const x = X0 + i * COL;
          if (!t.passes) throw new Error(`${t.id} returned rows: the opening says every test passes`);
          return (
            <React.Fragment key={t.id}>
              {i > 0 ? <ColumnRule x={x - 30} top={testsTop + 4} height={h(64)} at={at} /> : null}
              <Ink at={at} dur={12} style={{ left: x, top: testsTop }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5em", fontSize: 22, whiteSpace: "nowrap" }}>
                  <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 500, color: INK }}>{TESTS[t.id].test}</span>
                  <Badge tone="gray" size={22} style={{ fontFamily: SANS, opacity: ease(frame, at + 6, 8) }}>
                    pass
                  </Badge>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 20, color: INK_SOFT, marginTop: 12, whiteSpace: "nowrap" }}>{TESTS[t.id].on}</div>
              </Ink>
            </React.Fragment>
          );
        })}

        {/* ── Two dashboards, both "Revenue" ── */}
        <Tile x={X0} y={tileTop} w={TILE_W} h={TILE_H} at={twoAt - 2} title="Revenue" value={money(DASHBOARDS.a.value)} valueAt={aAt} titleMark={{ at: definesAt, out: joinsAt + 20 }} />
        <Spot art="dials" at={twoAt} left={DIALS.x} top={tileTop + TILE_H / 2 - spotH("dials", DIALS.w) / 2} width={DIALS.w} />
        <Tile x={TILE_B} y={tileTop} w={TILE_W} h={TILE_H} at={twoAt + 4} title="Revenue" value={money(DASHBOARDS.b.value)} valueAt={bAt} titleMark={{ at: definesAt + 3, out: joinsAt + 20 }} />
        {/* The outlines swell once as the narration says neither looks wrong. */}
        {[X0, TILE_B].map((x) => (
          <div
            key={`p${x}`}
            style={{
              position: "absolute",
              left: x - 4,
              top: tileTop - 4,
              width: TILE_W + 8,
              height: TILE_H + 8,
              boxSizing: "border-box",
              border: `2px solid ${BAR}`,
              borderRadius: 10,
              opacity: pulse(frame, wrongAt, 26) * 0.8,
            }}
          />
        ))}

        {/* ── Their queries, small: neither errors ── */}
        <Listing lines={DASHBOARDS.a.sql} x={X0} top={listTop} width={TILE_W} size={19} at={errorsAt - 2} />
        <Listing
          lines={DASHBOARDS.b.sql}
          x={TILE_B}
          top={listTop}
          width={560}
          size={19}
          at={errorsAt + 4}
          marks={[{ line: "JOIN", text: "JOIN", at: joinsAt + 4, out: end }]}
        />

        {/* ── Eighteen questions: eight worked through, ten quick ── */}
        {Array.from({ length: DEEP + QUICK }, (_, i) => {
          const deep = i < DEEP;
          const at = eighteenAt - 2 + i * 1.5;
          const p = ease(frame, at, 10);
          if (p <= 0) return null;
          const tone = deep ? ease(frame, eightAt + i * 1.5, 10) : ease(frame, tenAt + (i - DEEP) * 2, 10);
          const size = deep ? SQ : SMALL;
          const glow = deep ? pulse(frame, eightAt + i * 1.5, 16) : pulse(frame, tenAt + (i - DEEP) * 2, 16);
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
        <Note at={eightAt} x={squaresEnd + 34} y={sqTop - h(36)}>
          <span style={noteLine(23, INK)}>
            <b>{DEEP}</b> worked through
          </span>
        </Note>
        <Note at={tenAt} x={squaresEnd + 34} y={sqTop + h(4)}>
          <span style={noteLine(23, INK)}>
            <b>{QUICK}</b> quickly, at the end
          </span>
        </Note>
        <Note at={pageAt} x={squaresEnd + 34} y={sqTop + h(44)}>
          <span style={noteLine(21, INK_SOFT)}>Most on the page&rsquo;s own orders, in {POSTGRES.replace(/ \(.*\)$/, "")}</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
