import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { BUILD_MS, BUILD_SCANS, LIST_BYTES, MILLION, SET_BYTES } from "./data";
import { Code, Fig, LIST, LIST_INK, Listing, SET, SET_INK } from "./kit";

const LEFT = 120;
const BAR_X = 470;
const BAR_W = 1110;
const LABEL_W = BAR_X - LEFT - 30;
/** Rows of Fig. 4, before `y()`. */
const FIG_Y = 410;
const BUILD_Y = 488;
const MEM_Y = 630;
const LOOK_Y = 776;

const MB = (bytes: number) => bytes / 1e6;

/**
 * The rule, and what it costs: building the set is about seven scans of the
 * list and four times its memory, and every lookup after that is the 23 ns
 * of Fig. 3.
 */
export const RuleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();
  const start = n.beat("rule").from;
  const againAt = n.word("rule", "again and again");
  const onceAt = n.word("rule", "set once");
  const buildingAt = n.word("cost", "Building");
  const sevenAt = n.word("cost", "seven scans");
  const memoryAt = n.word("cost", "four times");
  const afterAt = n.word("cost", "After");
  const freeAt = n.word("cost", "nearly free");

  // Time: the build, and seven list scans laid end to end against it.
  const msPx = BAR_W / BUILD_MS;
  const scanPx = MILLION.listMs * msPx;
  const scans = Math.ceil(BUILD_SCANS);
  const build = ease(frame, buildingAt - 2, 22);
  // Memory: bytes on one scale.
  const bytePx = BAR_W / SET_BYTES;
  const memList = ease(frame, memoryAt - 4, 14);
  const memSet = ease(frame, memoryAt + 4, 18);

  return (
    <AbsoluteFill>
      <Ink at={start - 14} dur={14} style={{ left: LEFT + 4, top: y(112) }}>
        <span style={label(21, INK_SOFT)}>Testing membership</span>
      </Ink>
      <Ink at={start - 12} dur={20} style={{ left: LEFT - 2, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        Again and again?
      </Ink>
      <Ink at={onceAt - 6} dur={20} style={{ left: LEFT - 2, top: y(236), ...headline(80, true), color: SET_INK, whiteSpace: "nowrap" }}>
        Build the set once.
      </Ink>
      <Listing
        lines={["big_set = set(big_list)  # once, up front"]}
        x={960}
        top={y(184)}
        width={840}
        size={30}
        at={againAt}
        lineAt={[againAt + 6]}
        marks={[{ line: 0, at: onceAt, chars: 23 }]}
      />

      <Fig n="4" at={buildingAt - 10} x={LEFT} y={y(FIG_Y)}>
        What the set costs, at a million items
      </Fig>

      {/* ── Time to build, against list scans ── */}
      <RowLabel at={buildingAt - 6} y={y(BUILD_Y)} title="Time to build" sub="set(big_list)" />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {Array.from({ length: scans }, (_, i) => {
          const at = sevenAt - 6 + i * 3;
          const p = ease(frame, at, 8);
          if (p <= 0) return null;
          const x = BAR_X + i * scanPx;
          const w = Math.min(scanPx, BAR_W - i * scanPx) * p;
          return (
            <rect
              key={i}
              x={x + 2}
              y={y(BUILD_Y) + 4}
              width={Math.max(0, w - 4)}
              height={30}
              fill={`color-mix(in srgb, ${LIST} 14%, ${PAPER})`}
              stroke={LIST}
              strokeWidth={1.6}
            />
          );
        })}
        <rect x={BAR_X} y={y(BUILD_Y) + 44} width={BAR_W * build} height={34} fill={SET} />
      </svg>
      {Array.from({ length: scans }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: BAR_X + i * scanPx,
            top: y(BUILD_Y) + 4,
            width: Math.min(scanPx, BAR_W - i * scanPx),
            height: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...note(19, LIST_INK),
            fontWeight: 650,
            opacity: ease(frame, sevenAt + i * 3, 8),
          }}
        >
          {i === scans - 1 ? "" : `scan ${i + 1}`}
        </div>
      ))}
      <Ink at={sevenAt + 14} dur={14} style={{ left: BAR_X + BAR_W + 18, top: y(BUILD_Y), whiteSpace: "nowrap" }}>
        <div style={{ ...note(22, SET_INK), fontWeight: 700 }}>{fmt(BUILD_MS, 1)} ms</div>
        <div style={{ ...note(20, INK_SOFT), marginTop: 4 }}>{fmt(BUILD_SCANS, 1)} scans</div>
      </Ink>

      {/* ── Memory ── */}
      <RowLabel at={memoryAt - 8} y={y(MEM_Y)} title="Memory" sub="sys.getsizeof" />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <rect x={BAR_X} y={y(MEM_Y) + 4} width={LIST_BYTES * bytePx * memList} height={26} fill={LIST} />
        <rect x={BAR_X} y={y(MEM_Y) + 44} width={SET_BYTES * bytePx * memSet} height={34} fill={SET} />
      </svg>
      <Ink at={memoryAt} dur={12} style={{ left: BAR_X + LIST_BYTES * bytePx + 16, top: y(MEM_Y) + 4, height: 26, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
        <span style={{ ...note(21, LIST_INK), fontWeight: 650 }}>list {fmt(MB(LIST_BYTES), 1)} MB</span>
      </Ink>
      <Ink at={memoryAt + 16} dur={14} style={{ left: BAR_X + BAR_W + 18, top: y(MEM_Y) + 30, whiteSpace: "nowrap" }}>
        <div style={{ ...note(22, SET_INK), fontWeight: 700 }}>{fmt(MB(SET_BYTES), 1)} MB</div>
        <div style={{ ...note(20, INK_SOFT), marginTop: 4 }}>{fmt(SET_BYTES / LIST_BYTES, 1)}× the list</div>
      </Ink>

      {/* ── Every lookup after ── */}
      <div style={{ position: "absolute", left: LEFT, top: y(LOOK_Y) - 6, width: 1680, height: 1, background: HAIRLINE, opacity: ease(frame, afterAt - 6, 12) }} />
      <RowLabel at={afterAt - 4} y={y(LOOK_Y) + 22} title="Each lookup after" sub="999_999 in big_set" />
      <Ink at={freeAt - 6} dur={16} style={{ left: BAR_X, top: y(LOOK_Y) + 16, display: "flex", alignItems: "baseline", gap: "0.45em", whiteSpace: "nowrap" }}>
        <span style={{ ...headline(58), color: SET_INK, fontVariantNumeric: "tabular-nums lining-nums" }}>
          {fmt(MILLION.setNs, 1)} ns
        </span>
        <span style={{ ...body(30, true), color: INK_SOFT }}>
          where a scan of the list takes {fmt(MILLION.listMs)} ms
        </span>
      </Ink>
    </AbsoluteFill>
  );
};

/** A row's title in Inter, and the code it measures under it. */
const RowLabel: React.FC<{ at: number; y: number; title: string; sub: string }> = ({ at, y, title, sub }) => (
  <Ink at={at} dur={14} style={{ left: LEFT, top: y, width: LABEL_W }}>
    <div style={{ ...label(24, INK) }}>{title}</div>
    <div style={{ marginTop: 8 }}>
      <Code line={sub} size={22} />
    </div>
  </Ink>
);
