import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO, SANS } from "../../theme/fonts";
import { BAD, BAD_SQL, LISTING, ORDERS_AFTER_BAD, VERSION_REST, VERSION_SHORT, VERSION_SQL } from "./data";
import { Code, ErrorBox, Headline, InlineArrow, LISTING_PAPER, Listing, Mark, pulse, Svg, Tag } from "./parts";

/**
 * Part 2 closes the course in the reader's own tab: PostgreSQL compiled to
 * WebAssembly as PGlite, asked who it is, and, in a beat of its own,
 * refusing an order for a customer who does not exist, under the same two
 * tables the video opened on.
 */
export const TabScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const compileAt = n.word("tab", "Compile");
  const wasmAt = n.word("tab", "WebAssembly");
  const pgliteAt = n.word("tab", "PGlite");
  const runningAt = n.word("tab", "running");
  const browserAt = n.word("tab", "browser");
  const everyAt = n.word("tab", "every query");
  const courseAt = n.word("tab", "course");
  const askAt = n.word("version", "Ask");
  const tellsAt = n.word("version", "tells");
  const eighteenAt = n.word("version", "eighteen");
  const upbringingAt = n.word("upbringing", "upbringing");
  const keptAt = n.word("upbringing", "kept");
  const labAt = n.word("upbringing", "lab");
  const volunteersAt = n.word("upbringing", "volunteers");
  const salesAt = n.word("upbringing", "sales team");
  const rowsAt = n.word("upbringing", "rows");
  const rulesAt = n.word("upbringing", "rules");
  const storeAt = n.word("refuse", "store an order");
  const twentyFiveAt = n.word("refuse", "twenty-five");
  const existAt = n.word("refuse", "doesn't exist");
  const refusesAt = n.word("refuse", "refuses");
  const easierAt = n.word("close", "easier");
  const takesAt = n.word("close", "takes your rules");
  const seriouslyAt = n.word("close", "seriously");
  const knowAt = n.word("close", "now you know");
  const doesAt = n.word("close", "does", { edge: "end" });

  // ── The browser tab ──
  const FX = 96;
  const FW = 900;
  const FTOP = y(340);
  const FH = h(300);
  const BAR_H = 50;
  const frameIn = ease(frame, compileAt - 4, 18);
  const frameDim = ease(frame, easierAt - 2, 16) * 0.5;

  // ── The two tables, as the video opened on them ──
  const customers = useEntityLayout({
    x: 1070,
    y: y(470),
    width: 290,
    name: "customers",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "name", type: "text" },
    ],
  });
  const orders = useEntityLayout({
    x: 1480,
    y: y(430),
    width: 340,
    name: "orders",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "customer_id", type: "integer", key: "FK" },
      { name: "total", type: "numeric" },
    ],
  });
  const c = customers.anchor("right", "id");
  const o = orders.anchor("left", "customer_id");
  const midX = (c[0] + o[0]) / 2;
  const refuse = pulse(frame, rulesAt - 2, 26);

  // The bad row and Postgres's refusal, under the tab.
  const ITOP = FTOP + FH + h(30);
  const ETOP = ITOP + h(84);
  const settle = ease(frame, doesAt + 4, 40);

  return (
    <AbsoluteFill>
      {/* ── Sound: the build chain, the tab, the reply, the refusal, a last bell ── */}
      <Sfx name="el-pop" at={compileAt - 4} level={-30} />
      <Sfx name="el-pencil" at={wasmAt - 2} level={-34} />
      <Sfx name="el-pop" at={pgliteAt - 2} level={-29} />
      <Sfx name="el-whoosh" at={compileAt - 4} level={-33} />
      <Sfx name="el-sprinkle" at={everyAt - 2} level={-35} />
      <Sfx name="el-tap" at={tellsAt} level={-28} />
      <Sfx name="el-pop" at={upbringingAt - 4} level={-30} />
      <Sfx name="el-pop" at={storeAt - 6} level={-31} />
      <Sfx name="el-scratch" at={refusesAt - 2} level={-30} />
      <Sfx name="el-chime" at={doesAt + 8} level={-32} />

      {/* The tab and the build chain open the scene on "Compile"; the headline
          lands on the words it repeats. */}
      <Headline at={runningAt - 6} lead="Postgres, in your browser." out={keptAt - 6} />
      <Headline at={keptAt - 2} lead="It kept its upbringing." out={takesAt - 6} />
      <Headline at={takesAt - 2} lead="It takes your rules" turn="seriously." turnAt={seriouslyAt - 4} out={knowAt - 6} />
      <Headline at={knowAt - 2} lead="Now you know" turn="why this one does." turnAt={knowAt + 8} />

      {/* ── PostgreSQL, compiled to WebAssembly, is PGlite: one row of
          words, so the two arrows between them are the same length ── */}
      <div
        style={{
          position: "absolute",
          left: 1070,
          top: y(330),
          display: "flex",
          alignItems: "center",
          gap: 18,
          opacity: 1 - ease(frame, upbringingAt - 4, 12) * 0.6,
        }}
      >
        {(
          [
            ["PostgreSQL", compileAt - 4],
            ["WebAssembly", wasmAt - 2],
            ["PGlite", pgliteAt - 2],
          ] as const
        ).map(([t, at], i) => (
          <React.Fragment key={t}>
            {i ? <InlineArrow at={at - 6} /> : null}
            <span
              style={{
                opacity: ease(frame, at, 12),
                transform: `translateY(${(1 - ease(frame, at, 12)) * 8}px)`,
                fontFamily: SANS,
                fontSize: i === 2 ? 26 : 23,
                fontWeight: 650,
                color: i === 2 ? BLUE_INK : INK,
                whiteSpace: "nowrap",
              }}
            >
              {t}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* ── The tab ── */}
      {frameIn > 0 ? (
        <div
          style={{
            position: "absolute",
            left: FX,
            top: FTOP,
            width: FW,
            height: FH,
            opacity: frameIn * (1 - frameDim),
            transform: `translateY(${(1 - frameIn) * 16}px)`,
            border: `2px solid ${INK}`,
            borderRadius: 12,
            background: `color-mix(in srgb, ${PAPER} 70%, white)`,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <div style={{ height: BAR_H, borderBottom: `1.5px solid ${HAIRLINE}`, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", background: `color-mix(in srgb, ${INK} 6%, ${PAPER})` }}>
            {[0, 1, 2].map((k) => (
              <div key={k} style={{ width: 13, height: 13, borderRadius: 7, border: `1.5px solid ${INK_SOFT}` }} />
            ))}
            <div
              style={{
                marginLeft: 18,
                padding: "6px 18px",
                borderRadius: "8px 8px 0 0",
                background: LISTING_PAPER,
                border: `1.5px solid ${HAIRLINE}`,
                borderBottom: "none",
                ...label(20, INK),
                // "in your browser" and "this course": the tab the reader has open.
                transform: `scale(${1 + (pulse(frame, browserAt - 2, 18) + pulse(frame, courseAt - 2, 18)) * 0.08})`,
              }}
            >
              PGlite, in this tab
            </div>
          </div>
          {/* Every query in this course has run here: one of them flickers past. */}
          {LISTING.map((line, i) => {
            const p = ease(frame, everyAt - 4 + i * 4, 10) * (1 - ease(frame, askAt - 8, 10));
            return p > 0 ? (
              <div key={i} style={{ position: "absolute", left: 30, top: BAR_H + 26 + i * 36, opacity: p * 0.55 }}>
                <Code line={line} size={21} />
              </div>
            ) : null;
          })}
        </div>
      ) : null}
      <Listing
        lines={[VERSION_SQL]}
        x={FX + 24}
        top={FTOP + BAR_H + 22}
        width={FW - 48}
        size={24}
        at={askAt - 4}
        lineAt={[askAt]}
        dim={easierAt - 2}
      />
      <Ink at={tellsAt - 2} dur={16} style={{ left: FX + 30, top: FTOP + BAR_H + 22 + 96, width: FW - 70, opacity: 1 - frameDim }}>
        <div style={{ fontFamily: MONO, fontSize: 22, lineHeight: 1.55, color: INK }}>
          <Mark at={eighteenAt - 4}>
            <span style={{ fontWeight: 700 }}>{VERSION_SHORT}</span>
          </Mark>{" "}
          <span style={{ color: INK_SOFT }}>{VERSION_REST}, …</span>
        </div>
      </Ink>

      {/* ── The two tables, and the rule they hold ── */}
      <Entity
        layout={customers}
        at={upbringingAt - 4}
        marks={{ id: { at: existAt - 2, tone: "note", out: knowAt } }}
      />
      <Entity
        layout={orders}
        at={upbringingAt + 2}
        marks={{ customer_id: { at: rowsAt - 2, tone: "warn", out: knowAt } }}
      />
      <Relation
        name="customers place orders"
        points={[c, [midX, c[1]], [midX, o[1]], o]}
        from="exactly-one"
        to="zero-or-many"
        at={upbringingAt + 6}
        color={BLUE_INK}
        width={2.4 + refuse * 2}
      />
      <Tag x={1070} y={y(700)} at={labAt - 2} out={refusesAt + 4} size={23} color={INK}>
        raised in a Berkeley <Mark at={labAt}>lab</Mark>, then by <Mark at={volunteersAt}>volunteers</Mark>
      </Tag>
      <Tag x={1070} y={y(742)} at={salesAt - 2} out={refusesAt + 4} size={23} color={INK_SOFT}>
        not by a sales team
      </Tag>

      {/* ── Its own beat: an order for customer 25, who does not exist ── */}
      <Listing
        lines={[BAD_SQL]}
        x={FX}
        top={ITOP}
        width={FW}
        size={22}
        at={storeAt - 6}
        lineAt={[storeAt - 2]}
        marks={[{ line: 0, at: twentyFiveAt - 2, out: refusesAt }]}
        dim={doesAt}
      />
      <ErrorBox
        x={FX}
        top={ETOP}
        width={FW}
        at={refusesAt - 2}
        detailAt={refusesAt + 10}
        message={BAD.message}
        detail={BAD.detail ?? ""}
        dim={doesAt}
      />
      <Tag x={1070} y={y(700)} at={refusesAt + 14} size={23} color={INK}>
        Nothing stored: orders still holds {ORDERS_AFTER_BAD} rows.
      </Tag>

      {/* A last stroke under the final words, after the voice ends. */}
      <Svg opacity={1}>
        <line x1={96} x2={96 + 1100 * settle} y1={y(262)} y2={y(262)} stroke={ACCENT} strokeWidth={3} strokeLinecap="round" opacity={settle > 0 ? 0.8 : 0} />
      </Svg>
    </AbsoluteFill>
  );
};
