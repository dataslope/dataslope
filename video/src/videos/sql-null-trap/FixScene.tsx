import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { EXISTS_SQL, FILTER_SQL, FIX_ROWS, ORDER_CUSTOMER_IDS } from "./data";
import { Fig, Listing, listingHeight, Mono, SqlValue, Table, TRUTH, TruthWord, Underline, UNKNOWN_INK } from "./kit";

const LEFT = 120;
const CODE = 28;
const CELL = 26;
/** Layout rows, before `y()`. */
const FIG_Y = 350;
const PANEL_Y = 400;
const LIST_Y = 446;
/** Each panel: its listing, then the rows it returned. */
const PANELS = [
  { x: LEFT, listW: 590, resultX: LEFT + 620 },
  { x: 950, listW: 660, resultX: 950 + 690 },
] as const;

/** The ids the filtered subquery leaves: 1 and 3. */
const KNOWN_IDS = ORDER_CUSTOMER_IDS.filter((v) => v !== null);

/**
 * The two ways out, side by side, each with the rows Postgres returned for
 * it, and the habit that catches the trap.
 */
export const FixScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  const start = n.beat("exists").from;
  const existsAt = n.word("exists", "NOT EXISTS");
  const yesNoAt = n.word("exists", "yes or no");
  const otherAt = n.word("filter", "The other");
  const filterAt = n.word("filter", "filter the NULLs");
  const subqueryAt = n.word("filter", "subquery");
  const bothAt = n.word("filter", "Both return");
  const fewerAt = n.word("rule", "fewer rows");
  const unknownsAt = n.word("rule", "unknowns");

  const top = y(LIST_Y);
  const listBottom = top + listingHeight(6, CODE);
  const panels = [
    {
      ...PANELS[0],
      letter: "a",
      title: <>Ask whether a matching order exists</>,
      lines: EXISTS_SQL,
      at: existsAt - 10,
      mark: { line: 2, at: existsAt - 2, start: 6, chars: 10 },
      resultAt: yesNoAt + 6,
    },
    {
      ...PANELS[1],
      letter: "b",
      title: (
        <>
          Filter the <Mono>NULL</Mono>s out of the list first
        </>
      ),
      lines: FILTER_SQL,
      at: otherAt - 6,
      mark: { line: 4, at: filterAt - 2, start: 2, chars: 29 },
      resultAt: bothAt - 2,
    },
  ];

  return (
    <AbsoluteFill>
      <Ink at={start - 14} dur={14} style={{ left: LEFT + 4, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>Two fixes</span>
      </Ink>
      <Ink
        at={start - 12}
        dur={20}
        style={{
          left: LEFT - 4,
          top: y(150),
          ...headline(80),
          whiteSpace: "nowrap",
        }}
      >
        Take the unknown out.
      </Ink>
      <Ink
        at={fewerAt - 6}
        dur={22}
        style={{
          left: LEFT - 2,
          top: y(240),
          ...headline(54, true),
          color: ACCENT_INK,
          whiteSpace: "nowrap",
        }}
      >
        Fewer rows than you expected? Look for the{" "}
        <Underline at={unknownsAt} color={TRUTH.unknown.lamp}>
          unknowns.
        </Underline>
      </Ink>

      <Fig n="5" at={start - 8} x={LEFT} y={y(FIG_Y)}>
        Two queries that find the customers with no orders
      </Fig>
      {panels.map((p) => (
        <React.Fragment key={p.letter}>
          <Ink
            at={p.at - 4}
            dur={14}
            style={{
              left: p.x,
              top: y(PANEL_Y),
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ ...label(22, ACCENT_INK), fontWeight: 700 }}>{p.letter}</span>
            <span style={label(22, INK)}>{p.title}</span>
          </Ink>
          <Listing
            lines={p.lines}
            x={p.x}
            top={top}
            width={p.listW}
            size={CODE}
            at={p.at}
            lineAt={p.lines.map((_, i) => p.at + 4 + i * 4)}
            marks={[p.mark]}
          />
          <Table
            x={p.resultX}
            top={top}
            size={CELL}
            at={p.resultAt}
            cols={[{ title: "name", width: 170 }]}
            rows={FIX_ROWS.map((v) => [<SqlValue key="v" value={v} />])}
            footer={{ text: `(${FIX_ROWS.length} rows)`, at: p.resultAt + 10 }}
          />
        </React.Fragment>
      ))}

      <Note at={yesNoAt} x={PANELS[0].x} y={listBottom + 22} width={760} from="up">
        <span
          style={{
            ...note(21, INK_SOFT),
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4em",
            whiteSpace: "nowrap",
          }}
        >
          <Mono color={INK}>EXISTS</Mono> came back
          <TruthWord value={true} size={21} /> or <TruthWord value={false} size={21} /> for every customer
        </span>
      </Note>
      <Note at={subqueryAt} x={PANELS[1].x} y={listBottom + 22} width={800} from="up">
        <span style={note(21, INK_SOFT)}>
          The list is now <Mono color={INK}>({KNOWN_IDS.join(", ")})</Mono>, with no{" "}
          <Mono color={UNKNOWN_INK} weight={700}>
            NULL
          </Mono>{" "}
          to compare against
        </span>
      </Note>
    </AbsoluteFill>
  );
};
