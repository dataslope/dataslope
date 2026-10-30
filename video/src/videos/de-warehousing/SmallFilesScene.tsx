import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { count, FILES, KB, MB, SMALL } from "./data";
import { COLUMN_TINT, Drift, OK, OK_INK, X0 } from "./parts";

const GRID_Y = 312;
const COLS = 30;
const CELL = 19;
const PITCH = 24;
const PANEL_X = 930;
const RULER_Y = 790;
const LOG0 = 4;
const LOG1 = 9.7;
const RX0 = 230;
const RX1 = 1720;

const YEAR0 = Date.UTC(2024, 0, 1);
/** The month (0 to 11) of the year's n-th day. */
const monthOf = (day: number) => new Date(YEAR0 + day * 86_400_000).getUTCMonth();
const rx = (bytes: number) => RX0 + ((Math.log10(bytes) - LOG0) / (LOG1 - LOG0)) * (RX1 - RX0);

/**
 * Question 7 (and the Pipelines page's small-files question). The made-up
 * year partitioned by day, 366 Parquet files, drawn one square each with its
 * footer; what that costs, from DuckDB's own runs (366 footers, 366 files
 * opened for a year's scan); every size so far on one log ruler against the
 * page's target of about 128 MB to 1 GB; then compaction, the day files
 * folding into the twelve month files.
 */
export const SmallFilesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("sm").from;
  const qAt = n.word("sm", "Question seven");
  const qTextAt = n.word("sm", "What is the tradeoff");
  const dayAt = n.word("sm-day", "Partition the same year by day");
  const filesAt = n.word("sm-day", "three hundred sixty-six files");
  const kbAt = n.word("sm-day", "twenty-seven kilobytes each");
  const footerAt = n.word("sm-day", "its own footer");
  const openAt = n.word("sm-day", "must be listed and opened");
  const timeAt = n.word("sm-day", "spends its time on files");
  const largeAt = n.word("sm-large", "Too large hurts too");
  const workersAt = n.word("sm-large", "fewer pieces to spread across workers");
  const pruneAt = n.word("sm-large", "coarser pruning");
  const targetAt = n.word("sm-large", "The usual target");
  const gbAt = n.word("sm-large", "to a gigabyte a file");
  const fixAt = n.word("sm-fix", "Fix them with compaction");
  const rewriteAt = n.word("sm-fix", "rewrites many small files into a few large ones");
  const formatAt = n.word("sm-fix", "let a table format");
  const end = n.beat("sm-fix").to;

  const gridY = y(GRID_Y);
  const pitchY = h(PITCH);
  const cellH = h(CELL);
  // Compaction: each month's days fold into one block of a 6 by 2 grid.
  const fold = ease(frame, rewriteAt, 30);
  const BLOCK_W = 112;
  const BLOCK_H = h(110);
  const blockX = (m: number) => X0 + (m % 6) * (BLOCK_W + 9);
  const blockY = (m: number) => gridY + h(30) + Math.floor(m / 6) * (BLOCK_H + h(24));
  const [fewest, most] = SMALL.day.rowsPerFile;

  const marker = (bytes: number, at: number, text: React.ReactNode, color: string, row: number) => {
    const p = ease(frame, at, 12);
    if (p <= 0) return null;
    const x = rx(bytes);
    return (
      <>
        <div style={{ position: "absolute", left: x - 7, top: y(RULER_Y) - 7, width: 14, height: 14, borderRadius: 7, background: color, opacity: p }} />
        <div
          style={{
            position: "absolute",
            left: x - 150,
            width: 300,
            top: y(RULER_Y) - h(46) - row * h(30),
            textAlign: "center",
            ...note(21, INK),
            whiteSpace: "nowrap",
            opacity: p,
          }}
        >
          {text}
        </div>
      </>
    );
  };

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={filesAt} level={-32} />
      <Sfx name="el-tap" at={footerAt + 4} level={-36} />
      <Sfx name="el-tap" at={largeAt + 4} level={-36} />
      <Sfx name="el-pencil" at={targetAt + 4} level={-35} />
      <Sfx name="el-whoosh" at={rewriteAt} level={-35} />
      <Sfx name="el-pop" at={rewriteAt + 30} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={qTextAt - 2} size={60}>
          What is the tradeoff between file size and the small files problem?
        </QuestionCard>

        {/* ── A year, one file a day ── */}
        <div style={{ position: "absolute", left: X0, top: gridY - h(40), ...label(22, INK), whiteSpace: "nowrap", opacity: ease(frame, dayAt, 12) }}>
          by day <span style={{ color: INK_SOFT, fontWeight: 500 }}>· one Parquet file per day</span>
        </div>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {Array.from({ length: SMALL.day.files }, (_, d) => {
            const p = ease(frame, filesAt - 6 + (d / SMALL.day.files) * 24, 8);
            if (p <= 0) return null;
            const x0 = X0 + (d % COLS) * PITCH;
            const y0 = gridY + Math.floor(d / COLS) * pitchY;
            const m = monthOf(d);
            const tx = blockX(m) + BLOCK_W / 2 - CELL / 2;
            const ty = blockY(m) + BLOCK_H / 2 - cellH / 2;
            const x = x0 + (tx - x0) * fold;
            const yy = y0 + (ty - y0) * fold;
            const footer = ease(frame, footerAt + (d % 30) * 0.4, 8);
            return (
              <g key={d} opacity={p * (1 - ease(frame, rewriteAt + 18, 12))}>
                <rect x={x} y={yy} width={CELL} height={cellH} rx={2} fill={COLUMN_TINT.sale_id} stroke={INK} strokeOpacity={0.3} strokeWidth={1} />
                <rect x={x + CELL - 5} y={yy} width={5} height={cellH} rx={1} fill={ds("blue", 700)} opacity={footer} />
              </g>
            );
          })}
          {/* The month files compaction writes. */}
          {Array.from({ length: SMALL.month.files }, (_, m) => {
            const p = ease(frame, rewriteAt + 16 + m, 12);
            if (p <= 0) return null;
            return (
              <g key={m} opacity={p}>
                <rect x={blockX(m)} y={blockY(m)} width={BLOCK_W} height={BLOCK_H} rx={4} fill={COLUMN_TINT.sale_id} stroke={INK} strokeOpacity={0.35} />
                <rect x={blockX(m) + BLOCK_W - 7} y={blockY(m)} width={7} height={BLOCK_H} rx={2} fill={ds("blue", 700)} />
              </g>
            );
          })}
        </svg>

        {/* ── What a file a day costs ── */}
        <Note at={kbAt} x={PANEL_X} y={gridY} out={rewriteAt}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <b>
              <Num>{SMALL.day.files}</Num> files
            </b>{" "}
            of about <Num>{KB(SMALL.day.avg)}</Num>, <Num>{count(fewest)}</Num> or <Num>{count(most)}</Num> rows each
          </span>
        </Note>
        <Note at={footerAt + 4} x={PANEL_X} y={gridY + h(56)} out={rewriteAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-block", width: 10, height: 20, background: ds("blue", 700), borderRadius: 2, marginRight: 10, verticalAlign: "-3px" }} />
            <Num>{SMALL.day.files}</Num> footers, <Num>{KB(SMALL.day.footers)}</Num>
            <span style={{ color: INK_SOFT }}>
              {" "}
              · one file of the year has one, <Num>{(SMALL.one.footers / 1e3).toFixed(1)}</Num> KB
            </span>
          </span>
        </Note>
        <Note at={openAt + 4} x={PANEL_X} y={gridY + h(106)} out={rewriteAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            a scan of the year opens <b style={{ color: ACCENT_INK }}>{SMALL.day.read} files</b>
            <span style={{ color: INK_SOFT }}>
              {" "}
              · by month <Num>{SMALL.month.read}</Num> · as one file <Num>{SMALL.one.read}</Num>
            </span>
          </span>
        </Note>
        <Note at={timeAt} x={PANEL_X} y={gridY + h(156)} out={rewriteAt}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>time on files, not data</span>
        </Note>

        {/* ── Compaction ── */}
        <Note at={fixAt} x={PANEL_X} y={gridY}>
          <span style={{ ...note(26, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>Compaction</span>
        </Note>
        <Note at={rewriteAt + 20} x={PANEL_X} y={gridY + h(48)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            rewrites the <Num>{SMALL.day.files}</Num> day files as <Num>{SMALL.month.files}</Num> of about <Num>{KB(SMALL.month.avg)}</Num>
          </span>
        </Note>
        <Note at={formatAt} x={PANEL_X} y={gridY + h(98)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            or a table format, like Delta Lake or Iceberg, <span style={{ color: OK_INK, fontWeight: 650 }}>compacts for you</span>
          </span>
        </Note>

        {/* ── Every size on one ruler ── */}
        <div style={{ position: "absolute", left: X0, top: y(RULER_Y) - h(124), ...label(22, INK), whiteSpace: "nowrap", opacity: ease(frame, largeAt - 4, 12) }}>
          file size <span style={{ color: INK_SOFT, fontWeight: 500 }}>· log scale</span>
        </div>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <g opacity={ease(frame, largeAt - 4, 12)}>
            <line x1={RX0} x2={RX1} y1={y(RULER_Y)} y2={y(RULER_Y)} stroke={INK} strokeWidth={1.6} />
            {[1e4, 1e5, 1e6, 1e7, 1e8, 1e9].map((b) => (
              <line key={b} x1={rx(b)} x2={rx(b)} y1={y(RULER_Y)} y2={y(RULER_Y) + 9} stroke={INK} strokeWidth={1.6} />
            ))}
          </g>
          {/* Too large: past a gigabyte. */}
          <rect x={rx(SMALL.target.hi)} y={y(RULER_Y) - h(12)} width={(RX1 - rx(SMALL.target.hi)) * ease(frame, largeAt, 14)} height={h(12)} fill={ACCENT} opacity={0.35} />
          {/* The target: about 128 MB to 1 GB. */}
          <rect
            x={rx(SMALL.target.lo)}
            y={y(RULER_Y) - h(12)}
            width={(rx(SMALL.target.hi) - rx(SMALL.target.lo)) * ease(frame, targetAt, 14)}
            height={h(12)}
            fill={OK}
            opacity={0.85}
          />
        </svg>
        {[
          { b: 1e4, t: "10 KB" },
          { b: 1e5, t: "100 KB" },
          { b: 1e6, t: "1 MB" },
          { b: 1e7, t: "10 MB" },
          { b: 1e8, t: "100 MB" },
          { b: 1e9, t: "1 GB" },
        ].map(({ b, t }) => (
          <div
            key={b}
            style={{ position: "absolute", left: rx(b) - 60, width: 120, top: y(RULER_Y) + 14, textAlign: "center", ...label(19, INK_SOFT), opacity: ease(frame, largeAt - 4, 12) }}
          >
            {t}
          </div>
        ))}
        {marker(SMALL.day.avg, largeAt - 2, <>a day&apos;s file, <Num>{KB(SMALL.day.avg)}</Num></>, ACCENT, 0)}
        {marker(SMALL.month.avg, largeAt + 2, <>a month&apos;s, <Num>{KB(SMALL.month.avg)}</Num></>, ds("blue", 500), 0)}
        {marker(FILES.parquet, largeAt + 6, <>the whole year, <Num>{MB(FILES.parquet)}</Num></>, ds("blue", 700), 0)}
        <div
          style={{
            position: "absolute",
            left: rx(SMALL.target.lo),
            width: rx(SMALL.target.hi) - rx(SMALL.target.lo),
            top: y(RULER_Y) - h(46),
            textAlign: "center",
            ...note(21, OK_INK),
            fontWeight: 700,
            whiteSpace: "nowrap",
            opacity: ease(frame, targetAt + 4, 10),
          }}
        >
          target: 128 MB to 1 GB
        </div>
        <div
          style={{
            position: "absolute",
            left: rx(SMALL.target.hi) + 8,
            top: y(RULER_Y) - h(46),
            ...note(21, ACCENT_INK),
            fontWeight: 700,
            whiteSpace: "nowrap",
            opacity: ease(frame, largeAt + 4, 10),
          }}
        >
          too large
        </div>
        <div
          style={{
            position: "absolute",
            left: RX1 - 760,
            width: 760,
            top: y(RULER_Y) + h(50),
            textAlign: "right",
            ...note(22, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, workersAt, 10),
          }}
        >
          fewer pieces to spread across workers
          <span style={{ opacity: ease(frame, pruneAt, 10) }}>, coarser pruning</span>
        </div>
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(RULER_Y) + h(50),
            ...note(20, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, gbAt + 10, 10),
          }}
        >
          a million rows is small: the target is for tables far larger than this one
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
