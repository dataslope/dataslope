import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, INK, INK_SOFT, label } from "../../editorial/style";
import { NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { WIDE_COLUMNS } from "./data";
import { Chip, clamp01, Drift, Head, Kicker, MARK_BAD, RowWash, Spot } from "./parts";
import { useStoreLayout } from "./StoreErd";

const HEAD_SIZE = 22;
/** The store's tables, in the order the wide table lays their columns out. */
const TABLES = [...new Set(WIDE_COLUMNS.map((c) => c.table))];
const PAD = 18;
const cellW = (name: string) => Math.ceil(name.length * 0.6 * HEAD_SIZE + 2 * PAD);

/**
 * The close, after design-and-scale: the whole store crammed into one wide
 * table (every column of every store table, from information_schema), whose
 * names collide and whose rules tangle; then the same store kept apart and
 * joined by keys, the diagram Part 2 built; and the bridge to where the
 * relational model came from.
 */
export const ScaleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const L = useStoreLayout();

  const scaleFrom = n.beat("scale").from;
  const growAt = n.word("scale", "grow");
  const crammAt = n.word("scale", "Cram");
  const wideAt = n.word("scale", "one wide table");
  const tangledAt = n.word("scale", "tangled");
  const apartFrom = n.beat("apart").from;
  const keysAt = n.word("apart", "joined by keys");
  const ownRulesAt = n.word("apart", "own rules");
  const rescueFrom = n.beat("rescue").from;
  const easyAt = n.word("rescue", "EASY");
  const clearAt = n.word("rescue", "clear one");
  const nextFrom = n.beat("next").from;
  const paperAt = n.word("next", "paper");
  const seventyAt = n.word("next", "nineteen seventy");

  // ── The one wide table: every store column side by side, panning past ──
  const widths = WIDE_COLUMNS.map((c) => cellW(c.name));
  const xs = widths.map((_, i) => widths.slice(0, i).reduce((a, b) => a + b, 0));
  const stripW = widths.reduce((a, b) => a + b, 0);
  const counts = new Map<string, number>();
  for (const c of WIDE_COLUMNS) counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
  const pan = clamp01((frame - (wideAt - 6)) / Math.max(1, apartFrom - wideAt));
  const panX = 120 - (stripW - 1680) * (pan * pan * (3 - 2 * pan));
  const stripIn = ease(frame, wideAt - 8, 16);
  const stripOut = ease(frame, apartFrom - 4, 14);
  const stripTop = y(420);

  // ── The store, kept apart ──
  const box = (k: number) => apartFrom + 4 + k * 4;
  const rel = (k: number) => keysAt - 4 + k * 4;
  const own = [L.customers, L.orders, L.orderItems, L.categories, L.productCategories, L.products];

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={wideAt - 8} level={-33} />
      <Sfx name="el-scratch" at={tangledAt} level={-31} />
      <Sfx name="el-sprinkle" at={apartFrom + 4} level={-34} />
      <Sfx name="el-pencil" at={keysAt - 4} level={-34} />
      <Sfx name="el-chime" at={nextFrom - 16} level={-32} />
      <Sfx name="el-pop" at={paperAt - 4} level={-30} />

      <Kicker at={scaleFrom - 10}>Design and growth</Kicker>
      <Head at={scaleFrom - 6} second={tangledAt - 4} out={apartFrom - 6} italic="every rule tangles.">
        One wide table,
      </Head>
      <Head at={apartFrom - 2} second={keysAt - 2} out={rescueFrom - 6} italic="joined by keys.">
        Kept apart,
      </Head>
      <Head at={rescueFrom - 2} second={easyAt - 4} italic="easy to improve.">
        A clear model is
      </Head>

      {/* "As you grow": the store's tables named, then crammed together into one row. */}
      {TABLES.map((t, k) => {
        const inP = ease(frame, growAt - 4 + k * 4, 12);
        const cram = ease(frame, crammAt - 2, 18);
        const gone = ease(frame, wideAt - 6, 10);
        if (inP <= 0 || gone >= 1) return null;
        const x0 = 120 + k * 330;
        const x = x0 + (120 + k * 60 - x0) * cram;
        return (
          <div key={t} style={{ position: "absolute", left: x, top: stripTop + 6, opacity: inP * (1 - gone), transform: `translateY(${(1 - inP) * 12}px)` }}>
            <Chip>{t}</Chip>
          </div>
        );
      })}
      {stripIn > 0 && stripOut < 1 ? (
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, opacity: stripIn * (1 - stripOut), overflow: "hidden" }}>
          <div style={{ position: "absolute", left: panX, top: stripTop, width: stripW, height: 150 }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: stripW, height: 2, background: INK }} />
            <div style={{ position: "absolute", left: 0, top: 58, width: stripW, height: 1.5, background: INK }} />
            {WIDE_COLUMNS.map((c, i) => {
              const dup = (counts.get(c.name) ?? 0) > 1;
              const hot = dup ? ease(frame, tangledAt - 4 + (i % 5) * 2, 10) : 0;
              const first = i === 0 || WIDE_COLUMNS[i - 1].table !== c.table;
              return (
                <React.Fragment key={i}>
                  <div
                    style={{
                      position: "absolute",
                      left: xs[i],
                      top: 2,
                      width: widths[i],
                      height: 56,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: hot > 0 ? `color-mix(in srgb, ${MARK_BAD} ${Math.round(hot * 100)}%, transparent)` : undefined,
                      fontFamily: MONO,
                      fontSize: HEAD_SIZE,
                      fontWeight: 600,
                      color: INK,
                      whiteSpace: "nowrap",
                      borderLeft: i ? `1px solid color-mix(in srgb, ${INK} 14%, transparent)` : undefined,
                    }}
                  >
                    {c.name}
                  </div>
                  {first ? (
                    <div style={{ position: "absolute", left: xs[i] + 6, top: 74, ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
                      from {c.table}
                    </div>
                  ) : null}
                </React.Fragment>
              );
            })}
            <div style={{ position: "absolute", left: 0, top: 66, width: stripW, height: 1, background: HAIRLINE, opacity: 0.5 }} />
          </div>
          <div
            style={{
              position: "absolute",
              left: 120,
              top: stripTop + 140,
              ...label(24, INK),
              fontWeight: 560,
              whiteSpace: "nowrap",
              opacity: ease(frame, tangledAt, 12),
            }}
          >
            {WIDE_COLUMNS.length} columns, and {counts.get("id")} of them called id
          </div>
        </div>
      ) : null}

      {/* ── The store, kept apart and joined by keys ── */}
      <Drift from={rescueFrom - 10} to={nextFrom + 150} amount={0.02} origin={`${L.customers.left}px ${L.customers.top}px`}>
        <Entity layout={L.customers} at={box(0)} rowGap={2} />
        <Entity layout={L.orders} at={box(1)} rowGap={2} />
        <Entity layout={L.orderItems} at={box(2)} rowGap={2} />
        <Entity layout={L.products} at={box(3)} rowGap={2} />
        <Entity layout={L.productCategories} at={box(4)} rowGap={2} />
        <Entity layout={L.categories} at={box(5)} rowGap={2} />
        <Relation name="customers places orders, again" points={L.lines.places} from="exactly-one" to="zero-or-many" at={rel(0)} dur={14} />
        <Relation name="orders contain order_items, again" points={L.lines.contains} from="exactly-one" to="zero-or-many" at={rel(1)} dur={14} />
        <Relation name="products sold, again" points={L.lines.sold} from="exactly-one" to="zero-or-many" at={rel(2)} dur={14} />
        <Relation name="products classified, again" points={L.lines.classified} from="exactly-one" to="zero-or-many" at={rel(3)} dur={14} />
        <Relation name="categories group, again" points={L.lines.groups} from="exactly-one" to="zero-or-many" at={rel(4)} dur={14} />
        {own.map((e, k) => (
          <RowWash key={k} e={e} rows={e.columns.map((_, i) => i)} at={ownRulesAt - 6 + k * 5} out={ownRulesAt + 12 + k * 5} />
        ))}
        {/* "A clear one": the whole store, framed as one model. */}
        <div
          style={{
            position: "absolute",
            left: L.customers.left - 24,
            top: L.customers.top - 24,
            width: L.lines.sold[1][0] + 24 - (L.customers.left - 24),
            height: L.products.bottom + 24 - (L.customers.top - 24),
            boxSizing: "border-box",
            border: `2px dashed ${INK_SOFT}`,
            borderRadius: 12,
            clipPath: `inset(0 ${(1 - ease(frame, clearAt - 4, 18)) * 100}% 0 0)`,
            opacity: ease(frame, clearAt - 4, 6),
          }}
        />
      </Drift>

      <Spot id="db-designing-schemas-blueprint" at={paperAt - 6} left={1480} top={y(330)} width={330} height={330} />
      <NextLine at={seventyAt - 6} x={L.customers.left} y={y(846)} width={760}>
        where relational databases came from
      </NextLine>
    </AbsoluteFill>
  );
};
