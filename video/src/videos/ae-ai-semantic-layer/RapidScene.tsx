import React from "react";
import { AbsoluteFill } from "remotion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Box, Chip, Drift, Flow, Headline, Kicker, X0 } from "./parts";

const LIST_TOP = 380;
const ROW = 66;
/** The path's boxes, left to right: the assistant, MCP, the two interfaces
 *  stacked, and the warehouse under them. */
const ASST = { x: 790, w: 180 };
const MCP = { x: 1010, w: 286 };
const IFACE = { x: 1360, w: 330 };

/**
 * The quick round: one question, read aloud, then its answer drawn as a
 * path. The assistant reaches the warehouse through the interfaces dashboard
 * tools use (a semantic layer API, catalog metadata), exposed over MCP; then
 * the four design points, each a badge on the part of the path it governs.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("rapid-in").from;
  const moreAt = n.word("rapid-in", "One more");
  const quickAt = n.word("rapid-in", "quickly");
  const sixAt = n.word("r-connect", "Question six");
  const throughAt = n.word("r-connect", "Through the interfaces");
  const apiAt = n.word("r-connect", "a semantic layer API");
  const catalogAt = n.word("r-connect", "catalog metadata");
  const mcpAt = n.word("r-connect", "The Model Context Protocol");
  const exposeAt = n.word("r-connect", "a common way to expose them");
  const dbtAt = n.word("r-connect", "dbt Labs publishes an MCP server");
  const userAt = n.word("r-connect-design", "Run the assistant as the user");
  const permsAt = n.word("r-connect-design", "row and column permissions");
  const superAt = n.word("r-connect-design", "never as a superuser");
  const readOnlyAt = n.word("r-connect-design", "read-only credentials");
  const limitsAt = n.word("r-connect-design", "limits on cost and time");
  const logAt = n.word("r-connect-design", "log every question");
  const auditAt = n.word("r-connect-design", "for audit");
  const end = n.beat("r-connect-design").to;

  const items: RapidItem[] = [{ n: 6, label: "Connecting to governed metrics", at: sixAt }];

  const boxH = h(84);
  const apiTop = y(360);
  const catTop = y(492);
  const mid = (apiTop + catTop + boxH) / 2;
  const asstH = h(70);
  const mcpTop = mid - boxH / 2;
  const whTop = y(652);
  const whH = h(70);

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={moreAt} level={-33} />
      <Sfx name="el-tap" at={sixAt} level={-32} />
      <Sfx name="el-tap" at={throughAt + 2} level={-32} />
      <Sfx name="el-tap" at={apiAt} level={-32} />
      <Sfx name="el-tap" at={catalogAt} level={-32} />
      <Sfx name="el-tap" at={mcpAt} level={-31} />
      <Sfx name="el-pencil" at={exposeAt} level={-35} />
      {[userAt, readOnlyAt, limitsAt, logAt].map((at, i) => (
        <Sfx key={i} name="el-pop" at={at + 4} level={-33} />
      ))}

      <Drift from={from} to={end + 40}>
        <Kicker at={moreAt}>Quick round</Kicker>
        <Headline lead="One more," turn="quickly." at={moreAt} turnAt={quickAt - 2} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={560} at={moreAt + 6} end={end + 20} />
        <Ink at={sixAt + 8} dur={16} style={{ left: X0 + 40, top: y(LIST_TOP) + h(ROW) + h(24), width: 540 }}>
          <span style={{ ...note(26, INK_SOFT), textWrap: "balance" }}>How do AI assistants connect to the warehouse and to governed metrics?</span>
        </Ink>
        <ColumnRule x={720} top={y(330)} height={y(LIST_TOP) + h(ROW) + h(110) - y(330)} at={sixAt} />

        {/* The path: assistant, MCP, the interfaces, the warehouse. */}
        <Box x={ASST.x} y={mid - asstH / 2} w={ASST.w} h={asstH} at={throughAt} title="Assistant" size={24} />
        <Ink at={throughAt + 4} dur={12} style={{ left: IFACE.x, top: apiTop - h(44) }}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>What dashboard tools use</span>
        </Ink>
        <Box x={IFACE.x} y={apiTop} w={IFACE.w} h={boxH} at={apiAt} title="Semantic layer API" sub="metric and dimension names" size={24} subSize={20} />
        <Box x={IFACE.x} y={catTop} w={IFACE.w} h={boxH} at={catalogAt} title="Catalog" sub="metadata, for discovery" size={24} subSize={20} />
        <Box x={IFACE.x} y={whTop} w={IFACE.w} h={whH} at={apiAt + 10} title="Warehouse" size={24} />
        <Flow
          points={[
            [IFACE.x + IFACE.w + 8, apiTop + boxH / 2],
            [IFACE.x + IFACE.w + 60, apiTop + boxH / 2],
            [IFACE.x + IFACE.w + 60, whTop + whH / 2],
            [IFACE.x + IFACE.w + 8, whTop + whH / 2],
          ]}
          at={apiAt + 14}
          dur={18}
        />
        <Box x={MCP.x} y={mcpTop} w={MCP.w} h={boxH} at={mcpAt} title="MCP" sub="Model Context Protocol" size={24} subSize={20} />
        <Flow points={[[ASST.x + ASST.w + 8, mid], [MCP.x - 8, mid]]} at={mcpAt + 6} />
        <Flow points={[[MCP.x + MCP.w + 8, mid - h(14)], [MCP.x + MCP.w + 34, mid - h(14)], [MCP.x + MCP.w + 34, apiTop + boxH / 2], [IFACE.x - 8, apiTop + boxH / 2]]} at={exposeAt} />
        <Flow points={[[MCP.x + MCP.w + 8, mid + h(14)], [MCP.x + MCP.w + 34, mid + h(14)], [MCP.x + MCP.w + 34, catTop + boxH / 2], [IFACE.x - 8, catTop + boxH / 2]]} at={exposeAt + 6} />
        <Ink at={dbtAt} dur={14} style={{ left: MCP.x, top: mcpTop + boxH + h(18) }}>
          <div style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>dbt Labs publishes</div>
          <div style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>an MCP server</div>
        </Ink>

        {/* The design points, on the parts of the path they govern. */}
        <Ink at={userAt + 4} dur={12} style={{ left: ASST.x, top: mid + asstH / 2 + h(26) }}>
          <Chip tone="green" size={22}>
            as the user
          </Chip>
        </Ink>
        <Ink at={permsAt} dur={12} style={{ left: ASST.x, top: mid + asstH / 2 + h(76) }}>
          <div style={{ ...note(21, INK), whiteSpace: "nowrap" }}>their row and</div>
          <div style={{ ...note(21, INK), whiteSpace: "nowrap" }}>column permissions</div>
        </Ink>
        <Ink at={superAt} dur={12} style={{ left: ASST.x, top: mid + asstH / 2 + h(140) }}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>never a superuser</span>
        </Ink>
        <div style={{ position: "absolute", left: IFACE.x, top: whTop + whH + h(26), display: "flex", gap: 14, fontSize: 22 }}>
          <Ink at={readOnlyAt + 4} dur={12} style={{ position: "relative" }}>
            <Chip tone="green" size={22}>
              read-only
            </Chip>
          </Ink>
          <Ink at={limitsAt + 4} dur={12} style={{ position: "relative" }}>
            <Chip tone="green" size={22}>
              cost and timeout limits
            </Chip>
          </Ink>
        </div>
        <Ink at={logAt + 4} dur={12} style={{ left: MCP.x, top: whTop + whH + h(26) }}>
          <Chip tone="green" size={22}>
            logged
          </Chip>
        </Ink>
        <Ink at={auditAt} dur={12} style={{ left: MCP.x, top: whTop + whH + h(76) }}>
          <span style={{ ...note(21, INK), whiteSpace: "nowrap" }}>For audit, and the golden set</span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};

