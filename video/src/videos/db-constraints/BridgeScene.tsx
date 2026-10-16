import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, INK, note } from "../../editorial/style";
import { Ink, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FLAT } from "./data";
import {
  CARD_Y,
  DbTable,
  Head,
  HEAD_H,
  Kicker,
  MARK,
  MARK_BAD,
  ROW_H,
  RuleTags,
  Spot,
  Svg,
  Tag,
  TABLE_Y,
  tableGeometry,
  Tick,
  X0,
} from "./parts";

const TABLE_AT = 760;
const EMAIL = 3;

/**
 * The bridge to Unit 7: why-normalization's flat table, under every rule it
 * has. The rushed update passes all of them, and Ada's two rows now hold two
 * emails: constraints stop bad values, not bad structure.
 */
export const BridgeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const open = n.beat("limits").from;
  const ruleAt = n.word("limits", "every rule");
  const copyAt = n.word("twice", "Copy");
  const emailAt = n.word("twice", "email");
  const everyOneAt = n.word("twice", "every one");
  const updateAt = n.word("twice", "update");
  const justAt = n.word("twice", "just one");
  const everyValueAt = n.word("valid", "Every value");
  const validAt = n.word("valid", "valid");
  const twoAt = n.word("valid", "TWO");
  const emailsAt = n.word("valid", "emails");
  const badValuesAt = n.word("next", "bad values");
  const structureAt = n.word("next", "structure");
  const factAt = n.word("next", "One fact");
  const disagreeAt = n.word("next", "disagree");

  const card = useEntityLayout({
    x: X0,
    y: y(CARD_Y),
    width: 430,
    name: "orders_flat",
    columns: [
      { name: "order_id", type: "integer", key: "PK" },
      { name: "product_name", type: "text" },
      { name: "customer_name", type: "text" },
      { name: "customer_email", type: "text" },
    ],
  });
  const g = tableGeometry({
    x: TABLE_AT,
    top: y(TABLE_Y),
    cols: FLAT.cols,
    rows: [...FLAT.before, ...FLAT.after],
    headH: h(HEAD_H),
    rowH: h(ROW_H),
  });
  // Ada's rows: every row whose name is hers.
  const ada = FLAT.before.map((r, i) => (r[2] === FLAT.before[0][2] ? i : -1)).filter((i) => i >= 0);
  const changed = FLAT.before.findIndex((r, i) => r[EMAIL] !== FLAT.after[i][EMAIL]);
  const checks = ["product_name", "customer_name", "customer_email"] as const;
  const bx = g.x + g.width + 14;
  const by0 = g.rowTop(ada[0]) + 8;
  const by1 = g.rowTop(ada[ada.length - 1] + 1) - 8;
  const bp = ease(frame, emailsAt - 2, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={open - 4} level={-30} />
      <Sfx name="el-tap" at={updateAt} level={-28} />
      {checks.map((c, i) => (
        <Sfx key={c} name="el-tap" at={everyValueAt + i * 5} level={-31} />
      ))}
      <Sfx name="el-pencil" at={emailsAt - 2} level={-33} />
      <Sfx name="el-pop" at={twoAt - 4} level={-30} />
      <Sfx name="el-chime" at={n.beat("valid").to + 8} level={-33} />

      <Kicker at={open - 10}>Where constraints stop</Kicker>
      <Head lead="Some mistakes pass every rule." at={open - 6} />
      <Ink at={badValuesAt - 4} dur={16} style={{ left: 96, top: y(252), whiteSpace: "nowrap" }}>
        <span style={{ ...body(34, true), color: INK }}>Constraints stop bad values, not bad structure.</span>
      </Ink>

      <Entity
        layout={card}
        at={open - 2}
        marks={{
          customer_name: { at: structureAt, tone: "warn" },
          customer_email: { at: structureAt + 5, tone: "warn" },
        }}
      />
      {checks.map((c, i) => (
        <RuleTags key={c} layout={card} row={c} chips={[{ code: "NOT NULL", at: ruleAt + i * 4, pulses: [everyValueAt + i * 5, badValuesAt] }]} />
      ))}
      {/* Every rule holds, the key included. */}
      <Tick x={card.right + 150} y={card.rows[0].mid} at={everyValueAt - 4} />
      {checks.map((c, i) => (
        <Tick key={c} x={card.right + 150} y={card.rows[i + 1].mid} at={everyValueAt + i * 5} />
      ))}

      <DbTable
        g={g}
        cols={FLAT.cols}
        at={copyAt - 6}
        numeric={[0]}
        rows={FLAT.before.map((cells, i) => ({ cells, at: copyAt + i * 4 }))}
        swaps={[{ row: changed, col: EMAIL, at: updateAt + 4, value: FLAT.after[changed][EMAIL] as string }]}
        marks={[
          ...ada.map((row, k) => ({ row, col: EMAIL, at: (k ? everyOneAt : emailAt) + 2, out: updateAt })),
          { row: changed, col: EMAIL, at: updateAt + 8, out: validAt },
          ...ada.map((row, k) => ({ row, col: EMAIL, at: twoAt + k * 4, color: MARK_BAD })),
        ]}
        bands={ada.map((row, k) => ({ row, at: factAt + k * 4, color: MARK }))}
      />
      <Tag x={g.x + g.width + 18} top={g.rowMid(changed) - 16} at={justAt} out={emailsAt - 4}>
        {FLAT.tag}
      </Tag>
      {bp > 0 ? (
        <Svg>
          <path
            d={`M${bx},${by0} H${bx + 14} V${by1} H${bx}`}
            fill="none"
            stroke={ACCENT}
            strokeWidth={2.5}
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={`${bp} 1`}
          />
        </Svg>
      ) : null}
      <Note at={emailsAt + 4} x={bx + 30} y={(by0 + by1) / 2 - 16}>
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          {FLAT.before[0][2]}: {FLAT.emails} emails
        </span>
      </Note>

      <Spot id="db-constraints-watches" at={twoAt - 4} left={1380} top={y(700)} width={400} height={270} />
      <NextLine at={disagreeAt} x={X0} y={y(820)} width={760}>
        normalization.
      </NextLine>
    </AbsoluteFill>
  );
};
