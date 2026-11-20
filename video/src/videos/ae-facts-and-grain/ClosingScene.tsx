import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { KEYS } from "./data";
import { colsOf, DataTable, Drift, geoOf, MARK, MARK_KEY, Mono, Spot, spotH, TableName, X0 } from "./parts";

const HERO_W = 560;

/**
 * The bridge to Part 2, the plan's 1 to 2 join: the star is drawn, every
 * dimension in it held still, except customer 42's, which already has two
 * rows because Acme Corp moved (the same rows Question 4 drew). The rows
 * light, the region that changed is marked, and "Next: dimensions that
 * change" sets under a hairline. The sparrow comes back on the right.
 */
export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("next").from;
  const stillAt = n.word("next", "Every dimension here held still");
  const exceptAt = n.word("next", "except one");
  const twoAt = n.word("next", "already has two rows");
  const movedAt = n.word("next", "because Acme Corp moved");
  const nextAt = n.word("next", "Next:");
  const end = n.beat("next").to;

  const T = KEYS.validity;
  const g = geoOf(T, X0, y(420), h, { headH: 50, rowH: 58, bodySize: 24, headSize: 21 });
  const sk = T.cols.indexOf("customer_sk");
  const region = T.cols.indexOf("region");
  const heroH = spotH("sparrow", HERO_W);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={twoAt + 2} level={-30} />
      <Sfx name="el-pencil" at={movedAt + 6} level={-35} />
      <Sfx name="el-pop" at={nextAt - 6} level={-31} />
      <Sfx name="el-pencil" at={nextAt} level={-35} />

      <Drift from={from} to={end + 90} scale={0.015}>
        <Note at={stillAt} x={X0} y={y(260)}>
          <span style={{ ...note(34, INK), whiteSpace: "nowrap" }}>
            Every dimension here held still,
            <span style={{ color: BLUE_INK, opacity: ease(frame, exceptAt, 10) }}> except one</span>
          </span>
        </Note>
        <TableName g={g} at={exceptAt + 2}>
          <Mono>dim_customer</Mono>, customer 42
        </TableName>
        <DataTable
          g={g}
          cols={colsOf(T)}
          at={exceptAt + 2}
          rows={T.rows.map((cells, i) => ({ cells, at: twoAt + i * 4 }))}
          marks={[
            ...T.rows.map((_, row) => ({ row, col: sk, at: twoAt + 4 + row * 4, color: MARK_KEY })),
            ...T.rows.map((_, row) => ({ row, col: region, at: movedAt + 4 + row * 6, color: MARK })),
          ]}
        />
        <Note at={movedAt + 8} x={g.x} y={g.rowTop(T.rows.length) + h(22)}>
          <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>Acme Corp moved: two versions, two keys</span>
        </Note>
        <NextLine at={nextAt} x={X0} y={y(800)} width={980}>
          dimensions that change
        </NextLine>
        <Spot art="sparrow" at={nextAt - 6} left={1220} top={y(560) - heroH / 2} width={HERO_W} />
      </Drift>
    </AbsoluteFill>
  );
};
