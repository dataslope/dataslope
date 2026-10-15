import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, HAIRLINE, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { CHAIN, GRACE, ORDER_CUSTOMER_IDS, TRAP_ROWS } from "./data";
import { Code, Fig, Mono, SqlValue, Table, tableGeometry, TRUTH, TruthWord, Underline } from "./kit";

const LEFT = 120;
const CODE = 38;
/** Layout rows, before `y()`. */
const FIG3_Y = 270;
const SHORT_Y = 322;
const TERMS_Y = 398;
const FIG4_Y = 566;
const TABLE_Y = 614;
const CELL = 26;
const RULES_X = 1236;
/** Fig. 4's columns; the last is NOT IN's verdict. */
const COLS = [
  { title: "name", width: 150 },
  { title: "id", width: 70, align: "right" },
  { title: "id <> 1", width: 180 },
  { title: "id <> 3", width: 180 },
  { title: "id <> NULL", width: 200 },
  { title: "id NOT IN (subquery)", width: 300 },
] as const;
const NOT_IN_X = COLS.slice(0, -1).reduce((s, c) => s + c.width, 0);
const NOT_IN_W = COLS[COLS.length - 1].width;
const TABLE_W = NOT_IN_X + NOT_IN_W;

/** The subquery's list as Grace's NOT IN reads it: (1, 3, NULL). */
const LIST = ORDER_CUSTOMER_IDS.map((v) => (v === null ? "NULL" : String(v))).join(", ");
const TERMS = ORDER_CUSTOMER_IDS.map((v) => `${GRACE.id} <> ${v === null ? "NULL" : v}`);

/**
 * Inside NOT IN: Grace's test written out as the chain of <> it is shorthand
 * for, the value of each link, why one unknown keeps an AND from ever being
 * true, and then every customer through the same chain.
 */
export const ChainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const start = n.beat("expand").from;
  const shortAt = n.word("expand", "shorthand");
  const termAt = [
    n.word("expand", "two is not one"),
    n.word("expand", "two is not three"),
    n.word("expand", "two is not NULL"),
  ];
  const valueAt = [n.word("chain", "True"), n.word("chain", "true", { nth: 2 }), n.word("chain", "unknown")];
  const oneUnknownAt = n.word("chain", "one unknown");
  const resultAt = n.word("chain", "the result");
  const neverAt = n.word("chain", "never be true");
  const everyFrom = n.beat("every").from;
  const falseAt = n.word("every", "false");
  const placedAt = n.word("every", "placed orders");
  const unknownAt = n.word("every", "unknown");
  const notOneAt = n.word("every", "Not one row");

  const tableTop = y(TABLE_Y);
  const notInCol = COLS.length - 1;

  return (
    <AbsoluteFill>
      <Ink at={start - 14} dur={14} style={{ left: LEFT + 4, top: y(112) }}>
        <span style={label(21, ACCENT_INK)}>Inside NOT IN</span>
      </Ink>
      <div
        style={{
          position: "absolute",
          left: LEFT - 4,
          top: y(150),
          display: "flex",
          gap: "0.24em",
          whiteSpace: "nowrap",
          ...headline(80),
        }}
      >
        <Ink at={start - 12} dur={20} style={{ position: "relative" }}>
          One unknown,
        </Ink>
        <Ink at={neverAt - 4} dur={18} style={{ position: "relative", ...headline(80, true) }}>
          and nothing{" "}
          <Underline at={neverAt + 8} color={ACCENT}>
            passes.
          </Underline>
        </Ink>
      </div>

      <Fig n="3" at={start - 8} x={LEFT} y={y(FIG3_Y)}>
        What <Mono>NOT IN</Mono> asks about Grace, whose id is {GRACE.id}
      </Fig>
      <Ink
        at={shortAt - 6}
        dur={16}
        style={{
          left: LEFT,
          top: y(SHORT_Y),
          display: "flex",
          alignItems: "baseline",
          gap: "0.6em",
          whiteSpace: "nowrap",
        }}
      >
        <Code line={`${GRACE.id} NOT IN (${LIST})`} size={CODE} />
        <span
          style={{
            ...body(32, true),
            color: INK_SOFT,
            opacity: ease(frame, termAt[0] - 10, 12),
          }}
        >
          is shorthand for
        </span>
      </Ink>

      {/* The chain: each link over the value it takes, the ANDs between. */}
      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: y(TERMS_Y),
          display: "flex",
          alignItems: "flex-start",
          gap: 26,
        }}
      >
        {TERMS.map((t, i) => (
          <React.Fragment key={t}>
            {i > 0 ? (
              <Ink at={termAt[i] - 4} dur={12} style={{ position: "relative" }}>
                <Code line="AND" size={CODE} />
              </Ink>
            ) : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Ink at={termAt[i] - 2} dur={14} style={{ position: "relative" }}>
                <Code line={t} size={CODE} />
              </Ink>
              <Ink at={valueAt[i] - 2} dur={12} style={{ position: "relative" }}>
                <TruthWord value={GRACE.terms[i]} size={28} />
              </Ink>
            </div>
          </React.Fragment>
        ))}
        {/* The whole chain's value, set off by a rule. */}
        <div
          style={{
            alignSelf: "stretch",
            width: 1,
            marginLeft: 24,
            background: HAIRLINE,
            opacity: ease(frame, resultAt - 6, 10),
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Ink
            at={resultAt - 4}
            dur={14}
            style={{
              position: "relative",
              height: CODE * 1.25,
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={label(22, INK_SOFT)}>The whole chain</span>
          </Ink>
          <Ink at={resultAt} dur={14} style={{ position: "relative" }}>
            <TruthWord value={GRACE.result} size={28} weight={760} />
          </Ink>
        </div>
      </div>

      {/* Why: an AND that holds an unknown is false or unknown, never true. */}
      <Ink at={oneUnknownAt - 4} dur={14} style={{ left: RULES_X, top: y(SHORT_Y) + 6 }}>
        <span style={label(22, INK_SOFT)}>
          An <Mono color={INK}>AND</Mono> that holds an unknown
        </span>
      </Ink>
      {(
        [
          { line: "true AND NULL", value: null, at: oneUnknownAt + 4 },
          { line: "false AND NULL", value: false, at: oneUnknownAt + 10 },
        ] as const
      ).map((r, i) => (
        <Ink
          key={r.line}
          at={r.at}
          dur={14}
          style={{
            left: RULES_X,
            top: y(TERMS_Y) + i * 56 - 8,
            display: "flex",
            alignItems: "center",
            gap: 22,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ width: `${15 * 0.6}em`, fontSize: 30, flex: "none" }}>
            <Code line={r.line} size={30} />
          </span>
          <TruthWord value={r.value} size={26} />
        </Ink>
      ))}
      <Note at={neverAt} x={RULES_X} y={y(TERMS_Y) + 118} from="up">
        <span style={{ ...note(21, ACCENT_INK), fontWeight: 650 }}>Either way, never true.</span>
      </Note>

      {/* Fig. 4: every customer through the same chain. */}
      <Fig n="4" at={everyFrom - 16} x={LEFT} y={y(FIG4_Y)}>
        Every customer, through the same chain
      </Fig>
      <Table
        x={LEFT}
        top={tableTop}
        size={CELL}
        at={everyFrom - 12}
        cols={COLS}
        rows={CHAIN.map((r) => [
          <SqlValue key="n" value={r.name} />,
          <SqlValue key="i" value={r.id} />,
          ...r.terms.map((t, k) => <TruthWord key={k} value={t} size={22} />),
          <TruthWord key="r" value={r.result} size={22} weight={760} />,
        ])}
        rowAt={CHAIN.map((_, i) => everyFrom - 6 + i * 3)}
        cellAt={(row, col) => (col === notInCol ? (CHAIN[row].result === false ? falseAt : unknownAt) - 2 : undefined)}
        marks={[
          // The comparisons that are false because the customer has an order.
          ...CHAIN.flatMap((r, row) =>
            r.terms.map((t, k) =>
              t === false
                ? {
                    row,
                    col: 2 + k,
                    at: placedAt - 2,
                    ring: true,
                    color: TRUTH.false.lamp,
                  }
                : null,
            ),
          ).filter((m) => m !== null),
        ]}
      />
      {/* The column WHERE reads, framed when the narration gives its verdict. */}
      <div
        style={{
          position: "absolute",
          left: LEFT + NOT_IN_X - 6,
          top: tableTop - 6,
          width: NOT_IN_W + 12,
          height: tableGeometry(CELL).headH + CHAIN.length * tableGeometry(CELL).rowH + 12,
          border: `2.5px solid ${ACCENT}`,
          borderRadius: 8,
          opacity: ease(frame, notOneAt - 6, 12),
          clipPath: `inset(0 0 ${(1 - ease(frame, notOneAt - 6, 16)) * 100}% 0)`,
        }}
      />
      <Ink at={notOneAt} dur={18} style={{ left: LEFT + TABLE_W + 48, top: tableTop + 40, width: 440 }}>
        <div style={{ ...body(32, true), color: INK }}>Not one row is true,</div>
        <div style={{ ...note(21, INK_SOFT), marginTop: 12 }}>
          so <Mono color={INK}>WHERE</Mono> keeps none of them:
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 24,
            color: ACCENT_INK,
            marginTop: 10,
          }}
        >
          ({TRAP_ROWS.length} rows)
        </div>
      </Ink>
    </AbsoluteFill>
  );
};
