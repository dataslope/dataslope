import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CONDITIONS, PIVOT, printed } from "./data";
import { Drift, FormulaBar, MARK_BAD, Sheet, sheetGeometry, X0 } from "./parts";

const LIST_Y = 360;
const PITCH = 64;
const RIGHT_X = 980;

type Item = { text: React.ReactNode; at: number };

/** A column of points, each inking in as it is said, under a heading. */
const Column: React.FC<{ x: number; top: number; title: React.ReactNode; titleAt: number; items: readonly Item[]; pitch: number; out?: number; mark?: "tick" | "dot" }> = ({
  x,
  top,
  title,
  titleAt,
  items,
  pitch,
  out,
  mark = "dot",
}) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (o >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - o }}>
      <div style={{ position: "absolute", left: x, top, ...label(26, INK), opacity: ease(frame, titleAt, 12) }}>{title}</div>
      {items.map((it, i) => {
        const p = ease(frame, it.at - 2, 12);
        if (p <= 0) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: top + 54 + i * pitch,
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: p,
              transform: `translateX(${(1 - p) * -14}px)`,
            }}
          >
            {mark === "tick" ? <Tick at={it.at + 4} size={24} /> : <span style={{ width: 10, height: 10, borderRadius: 5, background: INK_SOFT }} />}
            <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>{it.text}</span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Questions 9 and 10. Where a spreadsheet wins and where SQL does, point by
 * point; then the risks, with the one a sheet can show: the video's own
 * revenue column with order 3's 150 typed as text, which SUM skips, 1,070
 * where the column holds 1,220.
 */
export const ToolScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("tool").from;
  const qAt = n.word("tool", "Question");
  const textAt = n.word("tool", "When should you use");
  const asked = n.beat("tool").to;
  const winsAt = n.word("tool-when", "A spreadsheet wins");
  const quickAt = n.word("tool-when", "quick exploration");
  const smallAt = n.word("tool-when", "small data");
  const handAt = n.word("tool-when", "hand a stakeholder");
  const moveAt = n.word("tool-when", "Move to SQL");
  const outgrowAt = n.word("tool-when", "the data outgrows it");
  const repeatAt = n.word("tool-when", "repeatable and audited");
  const joinsAt = n.word("tool-when", "joins several tables");
  const weeklyAt = n.word("tool-when", "the same manual steps every week");
  const q10At = n.word("risks", "Question ten");
  const q10TextAt = n.word("risks", "What are the main risks");
  const manualAt = n.word("risks", "Manual steps nobody can rerun");
  const breakAt = n.word("risks", "break quietly when rows move");
  const schemaAt = n.word("risks", "No schema");
  const textNumAt = n.word("risks", "typed as text");
  const dropsAt = n.word("risks", "drops out of the sum");
  const readsAt = n.word("risks", "ten seventy");
  const insteadAt = n.word("risks", "twelve twenty");
  const crawlAt = n.word("risks", "big files that crawl");
  const end = n.beat("rapid-in").from;

  const out9 = q10At - 4;
  // The revenue column, order 3's value typed as text.
  const textRow = 1 + PIVOT.orders.findIndex((r) => r[0] === 3);
  const g = sheetGeometry({ x: RIGHT_X + 60, top: y(LIST_Y) - h(20), widths: [120], rows: 11, rowH: h(38), firstCol: 3 });
  const revenue = PIVOT.orders.map((r) => [String(r[3])]);
  const C = CONDITIONS;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={winsAt} level={-34} />
      <Sfx name="el-tap" at={moveAt} level={-34} />
      <Sfx name="el-pop" at={weeklyAt + 4} level={-32} />
      <Sfx name="el-scratch" at={dropsAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} out={out9}>
          When should you use a spreadsheet, and when SQL or a database?
        </QuestionCard>
        <QuestionCard n={10} at={q10At} textAt={q10TextAt - 2}>
          What are the main risks of analysis in a spreadsheet?
        </QuestionCard>

        {/* ── Question 9 ── */}
        <Column
          x={X0}
          top={y(LIST_Y)}
          title="A spreadsheet"
          titleAt={asked - 6}
          pitch={h(PITCH)}
          out={out9}
          items={[
            { at: quickAt, text: "quick exploration" },
            { at: smallAt, text: "small data" },
            { at: handAt, text: "something to hand a stakeholder" },
          ]}
        />
        <Column
          x={RIGHT_X}
          top={y(LIST_Y)}
          title="SQL or a database"
          titleAt={asked - 2}
          pitch={h(PITCH)}
          out={out9}
          items={[
            { at: outgrowAt, text: "data past what a sheet handles" },
            { at: repeatAt, text: "work that's repeated and audited" },
            { at: joinsAt, text: "joins across several tables" },
          ]}
        />
        <Note at={outgrowAt + 10} x={RIGHT_X + 24} y={y(LIST_Y) + h(54) + h(PITCH) * 3} out={out9}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>sheets slow down well before a million rows</span>
        </Note>
        <Note at={weeklyAt - 2} x={X0} y={y(LIST_Y) + h(54) + h(PITCH) * 4 + h(20)} out={out9}>
          <span style={{ ...note(28, BLUE_INK), fontWeight: 600, whiteSpace: "nowrap" }}>the same manual steps every week? it belongs in SQL</span>
        </Note>

        {/* ── Question 10 ── */}
        <Column
          x={X0}
          top={y(LIST_Y)}
          title="The risks"
          titleAt={q10TextAt + 10}
          pitch={h(PITCH)}
          items={[
            { at: manualAt, text: "manual steps nobody can rerun" },
            { at: breakAt, text: "formulas that break when rows move" },
            { at: schemaAt, text: "no schema: a number can be text" },
            { at: crawlAt, text: "big files that crawl, then crash" },
          ]}
        />
        <Sheet
          g={g}
          values={revenue}
          at={q10TextAt + 10}
          cellAt={(r) => q10TextAt + 12 + r}
          bold={(r) => r === 1}
          align={(r) => (r === textRow ? "left" : undefined)}
          ink={(r) => (r === textRow ? ACCENT_INK : undefined)}
          fills={[{ r: textRow, c: 0, at: textNumAt, color: MARK_BAD }]}
        />
        <Note at={textNumAt + 4} x={g.right + 24} y={g.rowTop(textRow)}>
          <span style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap" }}>typed as text</span>
        </Note>
        <FormulaBar
          x={g.right + 24}
          top={g.rowTop(8)}
          width={420}
          formula={C.textTotal.formula ?? ""}
          at={dropsAt}
          typeDur={8}
          result={printed(C.textTotal.value)}
          resultAt={readsAt - 2}
          tone="bad"
        />
        <Note at={insteadAt - 2} x={g.right + 24} y={g.rowTop(8) + h(60)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>
            with it as a number: <b>{printed(C.total.value)}</b>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
