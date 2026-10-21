import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { MONO } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { WIDE_COLUMNS, WIDE_ROWS } from "./data";
import { Chip, clamp01, Drift, Head, Kicker, Mark, MARK_BAD, RowWash, Spot } from "./parts";
import { useStoreLayout } from "./StoreErd";

const HEAD_SIZE = 21;
const CELL_SIZE = 20;
const PAD = 14;
/** JetBrains Mono's advance, in em. */
const ADVANCE = 0.6;
const shown = (v: string | null) => v ?? "null";
/** The store's tables, in the order the wide table lays their columns out. */
const TABLES = [...new Set(WIDE_COLUMNS.map((c) => c.table))];
/** Each column as wide as its name or its longest value. */
const WIDTHS = WIDE_COLUMNS.map((c, i) =>
  Math.ceil(Math.max(c.name.length * ADVANCE * HEAD_SIZE, ...WIDE_ROWS.map((r) => shown(r[i]).length * ADVANCE * CELL_SIZE)) + 2 * PAD),
);
const XS = WIDTHS.map((_, i) => WIDTHS.slice(0, i).reduce((a, b) => a + b, 0));
const STRIP_W = WIDTHS.reduce((a, b) => a + b, 0);
/** The strip's left edge at rest, and the widest it shows at once. */
const STRIP_X = 120;
const VIEW_W = 1700;

// What the one wide table does to the store, counted from its rows.
const ID_COLUMNS = WIDE_COLUMNS.filter((c) => c.name === "id").length;
const EMAIL = WIDE_COLUMNS.findIndex((c) => c.table === "customers" && c.name === "email");
const emailCounts = new Map<string, number>();
for (const r of WIDE_ROWS) if (r[EMAIL] !== null) emailCounts.set(r[EMAIL]!, (emailCounts.get(r[EMAIL]!) ?? 0) + 1);
/** The email copied onto most rows, and how many. */
const [COPIED_EMAIL, EMAIL_ROWS] = [...emailCounts].sort((a, b) => b[1] - a[1])[0];
const NULLS = WIDE_ROWS.flat().filter((v) => v === null).length;

/** The spread chips, then crammed edge to edge where the wide table's header goes. */
const CHIP_W = 200;
const CHIP_PITCH = 300;

/**
 * The close, after design-and-scale: the store's tables, then the whole store
 * crammed into one wide table (every column of the five tables, and its rows
 * for Ana's order and for Ben, who has none, from one LEFT JOIN): one email
 * copied onto every line, four columns called id, and a row of nulls. Then
 * the same store kept apart and joined by keys, the diagram Part 2 built; and
 * the bridge to where the relational model came from.
 */
export const ScaleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const L = useStoreLayout();

  const scaleFrom = n.beat("scale").from;
  const growAt = n.word("scale", "grow");
  const crammAt = n.word("scale", "Cram");
  const wideAt = n.word("scale", "one wide table");
  const everyAt = n.word("scale", "every rule");
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

  // ── The one wide table: it lands still, is marked, then pans past ──
  const stripIn = ease(frame, wideAt - 6, 16);
  const stripOut = ease(frame, apartFrom - 4, 14);
  const panFrom = tangledAt + 4;
  const pan = clamp01((frame - panFrom) / Math.max(1, apartFrom - 4 - panFrom));
  const panX = STRIP_X - Math.max(0, STRIP_W - VIEW_W) * (pan * pan * (3 - 2 * pan));
  const stripTop = y(400);
  const headH = 52;
  const rowH = h(42);
  const rowTop = (r: number) => headH + 2 + r * rowH;
  const bottom = rowTop(WIDE_ROWS.length);

  // ── The store, kept apart ──
  const box = (k: number) => apartFrom + 4 + k * 4;
  const rel = (k: number) => keysAt - 4 + k * 4;
  const own = [L.customers, L.orders, L.orderItems, L.categories, L.productCategories, L.products];

  return (
    <AbsoluteFill>
      {TABLES.map((t, k) => (
        <Sfx key={t} name="el-tap" at={scaleFrom + 10 + k * 5} level={-31 - (k % 2)} />
      ))}
      <Sfx name="el-whoosh" at={crammAt - 2} level={-33} />
      <Sfx name="el-sprinkle" at={wideAt - 6} level={-34} />
      <Sfx name="el-scratch" at={tangledAt} level={-31} />
      <Sfx name="el-sprinkle" at={apartFrom + 4} level={-34} />
      <Sfx name="el-pencil" at={keysAt - 4} level={-34} />
      <Sfx name="el-chime" at={nextFrom - 16} level={-32} />
      <Sfx name="el-pop" at={paperAt - 4} level={-30} />

      <Kicker at={scaleFrom - 10}>Design and growth</Kicker>
      <Head at={scaleFrom - 6} second={growAt - 4} out={crammAt - 8} italic="as you grow.">
        Clear design keeps paying off
      </Head>
      <Head at={crammAt - 2} second={tangledAt - 4} out={apartFrom - 6} italic="every rule tangles.">
        One wide table,
      </Head>
      <Head at={apartFrom - 2} second={keysAt - 2} out={rescueFrom - 6} italic="joined by keys.">
        Kept apart,
      </Head>
      <Head at={rescueFrom - 2} second={easyAt - 4} italic="easy to improve.">
        A clear model is
      </Head>
      <FigLabel n="6" title="The whole store as one wide table" at={wideAt - 6} x={STRIP_X} y={y(262)} out={apartFrom - 6} />
      <FigLabel n="7" title="The same store, kept apart" at={apartFrom + 2} x={L.customers.left} y={y(262)} />

      {/* "As you grow": the store's tables, spread out; "Cram": pushed together into one row. */}
      {TABLES.map((t, k) => {
        const inP = ease(frame, scaleFrom + 10 + k * 5, 12);
        const cram = ease(frame, crammAt - 2, 18);
        const gone = ease(frame, wideAt - 16, 10);
        if (inP <= 0 || gone >= 1) return null;
        const x = STRIP_X + k * (CHIP_PITCH + (CHIP_W - CHIP_PITCH) * cram);
        return (
          <div key={t} style={{ position: "absolute", left: x, top: stripTop + 5, opacity: inP * (1 - gone), transform: `translateY(${(1 - inP) * 12}px)` }}>
            <Chip width={CHIP_W}>{t}</Chip>
          </div>
        );
      })}

      {stripIn > 0 && stripOut < 1 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1920,
            height: 1080,
            opacity: stripIn * (1 - stripOut),
            overflow: "hidden",
            // Columns panning off either side fade at the margins rather than at the frame.
            WebkitMaskImage: "linear-gradient(90deg, transparent 40px, black 104px, black 1824px, transparent 1888px)",
            maskImage: "linear-gradient(90deg, transparent 40px, black 104px, black 1824px, transparent 1888px)",
          }}
        >
          <div style={{ position: "absolute", left: panX, top: stripTop, width: STRIP_W, height: bottom }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: STRIP_W, height: 2, background: INK }} />
            <div style={{ position: "absolute", left: 0, top: headH, width: STRIP_W, height: 1.5, background: INK }} />
            <div style={{ position: "absolute", left: 0, top: bottom, width: STRIP_W, height: 1.5, background: INK }} />
            {WIDE_COLUMNS.map((c, i) => {
              const dup = c.name === "id";
              const hot = dup ? ease(frame, tangledAt - 4 + (i % 5) * 2, 10) : 0;
              const first = i === 0 || WIDE_COLUMNS[i - 1].table !== c.table;
              return (
                <React.Fragment key={i}>
                  {/* Each table's columns under its name, a firmer rule between tables. */}
                  {first ? (
                    <div style={{ position: "absolute", left: XS[i] + 6, top: -36, ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>from {c.table}</div>
                  ) : null}
                  {i > 0 ? (
                    <div
                      style={{
                        position: "absolute",
                        left: XS[i],
                        top: first ? -8 : 2,
                        width: first ? 1.5 : 1,
                        height: (first ? bottom + 8 : bottom - 2),
                        background: first ? HAIRLINE : `color-mix(in srgb, ${INK} 12%, transparent)`,
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      position: "absolute",
                      left: XS[i],
                      top: 2,
                      width: WIDTHS[i],
                      height: headH - 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: hot > 0 ? `color-mix(in srgb, ${MARK_BAD} ${Math.round(hot * 100)}%, transparent)` : undefined,
                      fontFamily: MONO,
                      fontSize: HEAD_SIZE,
                      fontWeight: 600,
                      color: INK,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.name}
                  </div>
                  {WIDE_ROWS.map((r, j) => {
                    const v = r[i];
                    const rowIn = ease(frame, wideAt + 2 + j * 4, 10);
                    // "Every rule": the one email, on every line of the order.
                    const copied = i === EMAIL && v === COPIED_EMAIL ? ease(frame, everyAt - 2 + j * 3, 10) : 0;
                    // "Tangled": the nulls a customer with no order is made of.
                    const empty = v === null ? ease(frame, tangledAt + 2 + i, 10) : 0;
                    return (
                      <div
                        key={j}
                        style={{
                          position: "absolute",
                          left: XS[i],
                          top: rowTop(j),
                          width: WIDTHS[i],
                          height: rowH,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderTop: j ? `1px solid color-mix(in srgb, ${INK} 10%, transparent)` : undefined,
                          background:
                            copied > 0
                              ? `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(copied * 100)}%, transparent)`
                              : empty > 0
                                ? `color-mix(in srgb, ${MARK_BAD} ${Math.round(empty * 100)}%, transparent)`
                                : undefined,
                          opacity: rowIn,
                          fontFamily: MONO,
                          fontSize: CELL_SIZE,
                          fontStyle: v === null ? "italic" : undefined,
                          color: v === null ? ACCENT_INK : INK,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {shown(v)}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
          {/* What it costs, as it is marked. */}
          <div style={{ position: "absolute", left: STRIP_X, top: stripTop + bottom + 30, display: "flex", gap: "0.4em", ...label(24, INK), fontWeight: 560, whiteSpace: "nowrap" }}>
            <span style={{ opacity: ease(frame, everyAt, 12) }}>
              One email on <Mark at={everyAt + 4}>{EMAIL_ROWS} rows</Mark>,
            </span>
            <span style={{ opacity: ease(frame, tangledAt, 12) }}>
              <Mark at={tangledAt + 2} color={MARK_BAD}>
                {ID_COLUMNS} columns
              </Mark>{" "}
              called id,
            </span>
            <span style={{ opacity: ease(frame, tangledAt + 8, 12) }}>
              and <Mark at={tangledAt + 12} color={MARK_BAD}>{NULLS} nulls</Mark> for a customer with no order
            </span>
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
