import React from "react";
import { AbsoluteFill } from "remotion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK } from "../../editorial/style";
import type { Pt } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { employee, type Employee, SR } from "./data";
import { Chip, CHIP_H, Drift, Edge, Head, KEY_INK, Kicker, MARK, MARK_KEY, RowBracket, Spot, Tag } from "./parts";

/** How far the self-reference's loop runs out to the left of the box. */
const LOOP = 110;
const CHIP_W = 210;
/** Each level of the org chart, before `y()`. */
const LEVEL_Y = [350, 462, 574, 686, 798];
const TREE_X = 1360;
const SIDE_X = 1080;

/**
 * Part 5: a manager is an employee too, so the foreign key points back into
 * its own table. Its rows, drawn as the org chart they make: Ada at the root
 * with no manager, and the longest chain, five levels down to an intern.
 */
export const SelfScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("self").from;
  const employeeAt = n.word("self", "An employee", { nth: 1 });
  const managerAt = n.word("self", "manager");
  const tooAt = n.word("self", "employee too");
  const pointsAt = n.word("self", "points back");
  const ownTableAt = n.word("self", "own table");
  const ceoAt = n.word("tree", "CEO");
  const noManagerAt = n.word("tree", "no manager");
  const graceAt = n.word("tree", "Grace reports");
  const minaAt = n.word("tree", "Mina reports");
  const storesAt = n.word("deep", "stores");
  const ownAt = n.word("deep", "own manager");
  const chainAt = n.word("deep", "chain");
  const deepAt = n.word("deep", "deep as");
  const needsAt = n.word("deep", "needs");
  const fiveAt = n.word("deep", "five levels");
  const internAt = n.word("deep", "intern");

  const table = useEntityLayout({
    x: 300,
    y: y(380),
    width: 440,
    name: "employees",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "name", type: "text" },
      { name: "title", type: "text" },
      { name: "manager_id", type: "integer", key: "FK" },
    ],
  });
  const a = table.anchor("left", "id");
  const b = table.anchor("left", "manager_id");
  const loop: Pt[] = [a, [a[0] - LOOP, a[1]], [b[0] - LOOP, b[1]], b];

  // ── The org chart: the longest chain, and Mina beside it under Grace ──
  const chain = SR.chain;
  const mina = employee("Mina");
  const grace = employee("Grace");
  type Node = { e: Employee; x: number; level: number; at: number };
  const chainAt0 = [ceoAt - 4, graceAt - 2, chainAt - 2, deepAt - 2, needsAt - 2];
  const nodes: Node[] = chain.map((e, level) => ({ e, x: TREE_X, level, at: chainAt0[level] }));
  nodes.push({ e: mina, x: SIDE_X, level: chain.findIndex((e) => e.id === grace.id) + 1, at: minaAt - 4 });
  const nodeOf = (id: number | null) => nodes.find((nd) => nd.e.id === id);
  const sub = (e: Employee) => `manager_id ${e.managerId ?? "null"}`;
  const top = (nd: Node): Pt => [nd.x + CHIP_W / 2, y(LEVEL_Y[nd.level]) - (CHIP_H + 26) / 2];
  const bottom = (nd: Node): Pt => [nd.x + CHIP_W / 2, y(LEVEL_Y[nd.level]) + (CHIP_H + 26) / 2];
  const last = nodes[chain.length - 1];
  const root = nodes[0];

  return (
    <AbsoluteFill>
      {/* ── Sound: the loop, each chip, the chain, the five levels ── */}
      <Sfx name="el-pencil" at={pointsAt} level={-33} />
      {[nodes[0], nodes[1], last].map((nd, k) => (
        <Sfx key={k} name="el-tap" at={nd.at + 2} level={-30} />
      ))}
      <Sfx name="el-pencil" at={fiveAt} level={-34} />

      <Kicker at={from - 10}>Self-reference</Kicker>
      <Head lead="One table," leadAt={from - 6} turn="pointing at itself." turnAt={pointsAt - 2} />
      <Spot id="db-relationship-patterns-dolls" at={chainAt} left={1590} top={y(70)} width={250} height={170} />

      <Drift from={from} to={internAt + 60} scale={0.016} origin={[960, y(580)]}>
        <Entity
          layout={table}
          at={employeeAt - 4}
          marks={{ manager_id: { at: tooAt, tone: "key" } }}
          rowAt={{ manager_id: managerAt }}
        />
        <Relation
          name="employees manages employees"
          points={loop}
          from="zero-or-one"
          to="zero-or-many"
          at={pointsAt}
          dur={24}
          label="manages"
          labelPos={[a[0] - LOOP - 96, (a[1] + b[1]) / 2 - 16]}
        />
        <Tag at={ownTableAt} x={table.x} y={table.bottom + 24} italic size={22}>
          manager_id holds another row's id
        </Tag>

        {/* ── The rows, as the hierarchy they make ── */}
        {nodes.slice(1).map((nd) => {
          const parent = nodeOf(nd.e.managerId)!;
          return <Edge key={nd.e.id} from={bottom(parent)} to={top(nd)} at={nd.at - 2} />;
        })}
        {nodes.map((nd) => (
          <Chip
            key={nd.e.id}
            x={nd.x}
            y={y(LEVEL_Y[nd.level])}
            width={CHIP_W}
            at={nd.at}
            name={nd.e.name}
            sub={sub(nd.e)}
            tone={
              nd === root
                ? { at: noManagerAt, color: MARK, out: storesAt }
                : { at: ownAt + nd.level * 3, color: MARK_KEY, out: fiveAt }
            }
          />
        ))}
        <Tag at={ceoAt} x={root.x + CHIP_W + 18} y={y(LEVEL_Y[0]) - 14} size={22}>
          {root.e.title}
        </Tag>
        <RowBracket x={TREE_X + CHIP_W + 100} y0={top(root)[1]} y1={bottom(last)[1]} at={fiveAt} color={KEY_INK} />
        <Tag at={fiveAt + 6} x={TREE_X + CHIP_W + 126} y={(top(root)[1] + bottom(last)[1]) / 2 - 14} color={KEY_INK} size={22}>
          {SR.depth} levels
        </Tag>
        <Tag at={internAt - 2} x={last.x - 18} y={y(LEVEL_Y[last.level]) - 14} color={ACCENT_INK} size={22} align="right">
          {last.e.title}
        </Tag>
      </Drift>
    </AbsoluteFill>
  );
};
