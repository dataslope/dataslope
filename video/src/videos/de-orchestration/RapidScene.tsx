import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note, svgText } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FRESH } from "./data";
import { Cross, Drift, Edge, Headline, Kicker, OK, OK_INK, Pill, Spot, TaskBox, X0 } from "./parts";

const R_X = 820;
const LIST_TOP = 340;
const ROW = 64;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 12. Dependencies between pipelines ──────────────────────────────────────

const Deps: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const offsetAt = c.w("r-deps", "don't guess with a cron offset");
  const breaksAt = c.w("r-deps", "it breaks the first night");
  const lateAt = c.w("r-deps", "the upstream runs late");
  const opts = [
    { text: "a sensor on its output", at: c.w("r-deps", "Use a sensor on its output") },
    { text: "a trigger on the dataset it publishes", at: c.w("r-deps", "a trigger on the dataset it publishes") },
    { text: "one DAG, if tightly coupled", at: c.w("r-deps", "or one DAG") },
  ];
  const T0 = 1010;
  const PH = 130;
  const tx = (hr: number) => T0 + hr * PH;
  const aY = c.y(400);
  const bY = c.y(468);
  const axisY = c.y(520);
  const barH = c.h(38);
  const aEnd = 3.4 + (4.6 - 3.4) * ease(frame, lateAt, 24);
  const bBad = ease(frame, lateAt + 18, 10);
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <line x1={tx(0)} x2={tx(6)} y1={axisY} y2={axisY} stroke={INK} strokeWidth={1.6} />
        {[0, 2, 4, 6].map((hr) => (
          <text key={hr} x={tx(hr)} y={axisY + 30} textAnchor="middle" style={svgText({ ...label(19, INK_SOFT), fontWeight: 500 })}>
            {`0${hr}:00`}
          </text>
        ))}
        <rect x={tx(1)} y={aY - barH / 2} width={(Math.min(aEnd, 4) - 1) * PH} height={barH} rx={4} fill={BAR} opacity={0.85} />
        {aEnd > 4 ? <rect x={tx(4)} y={aY - barH / 2} width={(aEnd - 4) * PH} height={barH} rx={4} fill={ACCENT} opacity={0.85} /> : null}
        <rect
          x={tx(4)}
          y={bY - barH / 2}
          width={0.9 * PH * ease(frame, offsetAt + 6, 12)}
          height={barH}
          rx={4}
          fill={`color-mix(in srgb, ${ACCENT} ${bBad * 100}%, ${BAR})`}
          opacity={0.85}
        />
        <line x1={tx(4)} x2={tx(4)} y1={aY - c.h(40)} y2={axisY} stroke={INK} strokeWidth={2} strokeDasharray="6 5" opacity={ease(frame, offsetAt, 10)} />
      </svg>
      <div style={{ position: "absolute", left: R_X, top: aY - 15, ...note(23, INK), fontWeight: 600 }}>pipeline A</div>
      <div style={{ position: "absolute", left: R_X, top: bY - 15, ...note(23, INK), fontWeight: 600, opacity: ease(frame, offsetAt, 10) }}>pipeline B</div>
      <Note at={offsetAt + 4} x={tx(4) + 10} y={aY - c.h(64)}>
        <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>B at 04:00: a cron offset</span>
      </Note>
      <Note at={lateAt + 20} x={tx(4) + 0.9 * PH + 12} y={bY - 14}>
        <span style={{ ...note(22, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>reads A half-done</span>
      </Note>
      <Note at={breaksAt} x={R_X} y={c.y(580)}>
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>breaks the first night A runs late</span>
      </Note>
      <Note at={opts[0].at - 4} x={R_X} y={c.y(640)}>
        <span style={{ ...label(22, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>instead, wait on the data:</span>
      </Note>
      {opts.map((o, i) => (
        <Pill key={o.text} x={R_X} y={c.y(684) + i * c.h(54)} at={o.at - 2} ink={OK_INK} size={23}>
          {o.text}
        </Pill>
      ))}
    </>
  );
};

// ── 13. What to monitor and alert on ────────────────────────────────────────

const Alerts: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const monAt = c.w("r-alerts", "Monitor more than success");
  const tiles = [
    { text: "success", at: monAt, base: true },
    { text: "runtime", at: c.w("r-alerts", "runtime") },
    { text: "freshness", at: c.w("r-alerts", "freshness") },
    { text: "volume", at: c.w("r-alerts", "volume") },
    { text: "quality pass rates", at: c.w("r-alerts", "quality pass rates") },
    { text: "consumer SLAs", at: c.w("r-alerts", "the SLAs consumers see") },
  ];
  const alertAt = c.w("r-alerts", "Alert once");
  const teamAt = c.w("r-alerts", "to the owning team");
  const fields = [
    { k: "table", v: "daily_orders", at: c.w("r-alerts", "naming the table") },
    { k: "partition", v: FRESH.stale.now.slice(0, 10), at: c.w("r-alerts", "partition and check") },
    { k: "check", v: "freshness", at: c.w("r-alerts", "and check") + 4 },
  ];
  const pageAt = c.w("r-alerts", "don't page on retries");
  const healAt = c.w("r-alerts", "heal themselves");
  const cardX = R_X;
  const cardTop = c.y(560);
  return (
    <>
      {tiles.map((t, i) => {
        const p = ease(frame, t.at - 2, 10);
        const col = i % 3;
        const row = Math.floor(i / 3);
        return (
          <div
            key={t.text}
            style={{
              position: "absolute",
              left: R_X + col * 310,
              top: c.y(350) + row * c.h(78),
              width: 290,
              height: c.h(62),
              boxSizing: "border-box",
              border: `2px solid ${t.base ? INK_SOFT : BAR}`,
              borderRadius: 10,
              background: t.base ? PAPER : `color-mix(in srgb, ${BAR} 10%, ${PAPER})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...note(24, t.base ? INK_SOFT : BLUE_INK),
              fontWeight: 650,
              whiteSpace: "nowrap",
              opacity: p,
              transform: `translateY(${(1 - p) * 10}px)`,
            }}
          >
            {t.base ? "success / failure" : t.text}
          </div>
        );
      })}
      {/* One alert, actionable. */}
      <div
        style={{
          position: "absolute",
          left: cardX,
          top: cardTop,
          width: 600,
          boxSizing: "border-box",
          border: `2.4px solid ${ACCENT}`,
          borderRadius: 10,
          background: PAPER,
          padding: "10px 20px 12px",
          opacity: ease(frame, alertAt, 12),
        }}
      >
        <div style={{ ...note(24, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap", borderBottom: `1px solid ${HAIRLINE}`, paddingBottom: 8 }}>
          one alert<span style={{ color: INK, opacity: ease(frame, teamAt, 10) }}> → orders team</span>
        </div>
        {fields.map((f) => {
          const p = ease(frame, f.at - 2, 10);
          return (
            <div key={f.k} style={{ display: "flex", gap: 14, marginTop: 8, opacity: p, alignItems: "baseline" }}>
              <span style={{ ...label(21, INK_SOFT), width: 110 }}>{f.k}</span>
              <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: INK, fontVariantLigatures: "none", background: p > 0.5 ? HIGHLIGHT : undefined, padding: "0 6px", borderRadius: 3 }}>{f.v}</span>
            </div>
          );
        })}
      </div>
      {/* A retry that healed: no page. */}
      <div
        style={{
          position: "absolute",
          left: cardX + 640,
          top: cardTop,
          width: 330,
          boxSizing: "border-box",
          border: `2px dashed ${INK_SOFT}`,
          borderRadius: 10,
          padding: "10px 16px",
          opacity: ease(frame, pageAt, 12),
        }}
      >
        <div style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>try 1 failed, try 2 ran</div>
        <div style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap", marginTop: 6, opacity: ease(frame, healAt, 10) }}>healed itself: no page</div>
      </div>
    </>
  );
};

// ── 14. Observable and debuggable ───────────────────────────────────────────

const Observe: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const logsAt = c.w("r-observe", "structured logs");
  const idsAt = c.w("r-observe", "run and partition IDs");
  const linAt = c.w("r-observe", "lineage from source to dashboard");
  const metaAt = c.w("r-observe", "run metadata");
  const metas = [
    { text: "rows", at: c.w("r-observe", "like rows") },
    { text: "duration", at: c.w("r-observe", "duration") },
    { text: "check results", at: c.w("r-observe", "check results") },
  ];
  const dataAt = c.w("r-observe", "kept as data");
  const failAt = c.w("r-observe", "a failure at two in the morning");
  const sliceAt = c.w("r-observe", "one slice to rerun");
  const day = FRESH.stale.now.slice(0, 10);
  const LOG = [
    `{"run_id": "daily_orders__${day}", "partition": "${day}",`,
    ` "task": "load", "rows": 0, "status": "success"}`,
  ];
  const lin = ["source", "raw_orders", "daily_orders", "dashboard"];
  const linY = c.y(520);
  const linX = (i: number) => R_X + 110 + i * 250;
  const sliceY = c.y(760);
  const bad = 4;
  const rerun = ease(frame, sliceAt + 6, 10);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: R_X,
          top: c.y(350),
          padding: "12px 18px",
          background: `color-mix(in srgb, ${INK} 5%, ${PAPER})`,
          borderTop: `2px solid ${INK}`,
          opacity: ease(frame, logsAt, 12),
        }}
      >
        {LOG.map((l, i) => (
          <div key={i} style={{ fontFamily: MONO, fontSize: 20, color: INK, whiteSpace: "pre", fontVariantLigatures: "none", lineHeight: 1.6 }}>
            {i === 0 ? (
              <>
                {"{"}
                <span style={{ background: ease(frame, idsAt, 8) > 0.5 ? HIGHLIGHT : undefined }}>{`"run_id": "daily_orders__${day}"`}</span>
                {", "}
                <span style={{ background: ease(frame, idsAt + 8, 8) > 0.5 ? HIGHLIGHT : undefined }}>{`"partition": "${day}"`}</span>
                {","}
              </>
            ) : (
              l
            )}
          </div>
        ))}
      </div>
      {lin.map((name, i) => (
        <TaskBox key={name} cx={linX(i)} cy={linY} w={210} h={c.h(48)} at={linAt + i * 4} mono={i === 1 || i === 2} size={21}>
          {name}
        </TaskBox>
      ))}
      {lin.slice(1).map((name, i) => (
        <Edge
          key={name}
          points={[
            [linX(i) + 107, linY],
            [linX(i + 1) - 108, linY],
          ]}
          at={linAt + 2 + i * 4}
          dur={8}
          head={10}
        />
      ))}
      <Note at={linAt} x={R_X} y={linY - c.h(66)}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>lineage</span>
      </Note>
      <Note at={metaAt} x={R_X} y={c.y(616)}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>run metadata</span>
      </Note>
      {metas.map((m, i) => (
        <Pill key={m.text} x={R_X + 160 + i * 170} y={c.y(606)} at={m.at - 2} ink={BLUE_INK} size={22}>
          {m.text}
        </Pill>
      ))}
      <Note at={dataAt} x={R_X + 700} y={c.y(616)}>
        <span style={{ ...label(21, BLUE_INK), whiteSpace: "nowrap" }}>kept as data</span>
      </Note>
      {/* One failed slice, rerun alone. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {Array.from({ length: 7 }, (_, i) => {
          const p = ease(frame, failAt + i * 1.5, 8);
          const fill = i === bad ? `color-mix(in srgb, ${OK} ${rerun * 100}%, ${ACCENT})` : BAR;
          return <rect key={i} x={R_X + i * 66} y={sliceY} width={56} height={c.h(44)} rx={5} fill={fill} opacity={0.85 * p} stroke={i === bad ? INK : undefined} strokeWidth={i === bad ? 2.4 * ease(frame, sliceAt, 8) : 0} />;
        })}
      </svg>
      {frame >= failAt + 8 && rerun < 1 ? (
        <div style={{ position: "absolute", left: R_X + bad * 66 + 15, top: sliceY + c.h(44) + 8, opacity: 1 - rerun }}>
          <Cross at={failAt + 8} size={26} />
        </div>
      ) : null}
      <Note at={failAt + 4} x={R_X + 7 * 66 + 20} y={sliceY + 6}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          a 2 a.m. failure:{" "}
          <span style={{ color: OK_INK, fontWeight: 700, opacity: ease(frame, sliceAt, 10) }}>rerun one slice</span>
        </span>
      </Note>
    </>
  );
};

/**
 * The quick round: three questions down the left, each answer on the right
 * while it is read, then the bridge into pipelines for AI.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const threeAt = n.word("rapid-in", "Three more");
  const manyAt = n.word("rapid-in", "about many pipelines at once");
  const end = n.beat("next").from - 4;
  const feedAt = n.word("next", "All of these pipelines feed tables and dashboards");
  const aiAt = n.word("next", "The newest ones feed AI systems");
  const nextAt = n.word("next", "Next:");

  const items: RapidItem[] = [
    { n: 12, label: "Dependencies between pipelines", at: n.word("r-deps", "Between pipelines"), body: <Deps c={c} /> },
    { n: 13, label: "What to monitor and alert on", at: n.word("r-alerts", "Monitor more than success"), body: <Alerts c={c} /> },
    { n: 14, label: "Observable and debuggable", at: n.word("r-observe", "And make it observable"), body: <Observe c={c} /> },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={threeAt} level={-36} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-37} />
      ))}
      <Sfx name="el-pop" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40}>
        <Kicker at={threeAt}>Quick round</Kicker>
        <Headline lead="Three more." turn="Many pipelines at once." at={threeAt} turnAt={manyAt - 2} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={620} at={threeAt + 6} end={end} />
        <Spot id="de-orchestration-collie" at={feedAt} left={1180} top={y(380)} width={560} height={338} />

        {/* The bridge. */}
        <Note at={feedAt} x={X0} y={y(LIST_TOP) + 3 * h(ROW) + h(60)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            These pipelines feed <b style={{ color: BLUE_INK }}>tables and dashboards</b>.
          </span>
        </Note>
        <Note at={aiAt} x={X0} y={y(LIST_TOP) + 3 * h(ROW) + h(112)}>
          <span style={{ ...note(27, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>The newest ones feed AI systems.</span>
        </Note>
        <NextLine at={nextAt} x={X0} y={y(760)} width={900}>
          pipelines for AI
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
