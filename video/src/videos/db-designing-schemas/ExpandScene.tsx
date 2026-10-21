import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { SANS } from "../../theme/fonts";
import { Sfx } from "../../sound/Sfx";
import { ASSIGN, MOVED } from "./data";
import { Head, KEY, Kicker, Mark, Ping, rowBox, RowStrike, RowWash, Spot, Svg } from "./parts";

/**
 * Expand and contract, after evolving-schemas-safely's "Before and after a
 * relationship change": a task's one owner (tasks.owner_id) becomes a team
 * of assignees. Expand adds task_assignees beside the old column, so both
 * shapes work; the data and then the code move across; only then is
 * owner_id removed. check.mjs runs all three shapes, and moves both owners.
 */
export const ExpandScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const expandFrom = n.beat("expand").from;
  const ownerAt = n.word("expand", "one owner");
  const teamAt = n.word("expand", "team");
  const expandAt = n.word("widen", "expand");
  const newTableAt = n.word("widen", "new table");
  const oldColumnAt = n.word("widen", "old column");
  const bothAt = n.word("widen", "both shapes");
  const dataAt = n.word("move", "data");
  const codeAt = n.word("move", "code");
  const nothingAt = n.word("contract", "nothing reads");
  const contractAt = n.word("contract", "contract");
  const removeAt = n.word("contract", "remove");

  // users.id level with tasks.owner_id (one row below tasks' first), so "owns" runs straight.
  const users = useEntityLayout({ x: 120, y: y(376), width: 300, ...ASSIGN.users });
  const tasks = useEntityLayout({ x: 720, y: y(330), width: 330, ...ASSIGN.tasks });
  const tasksAfter = useEntityLayout({ x: 720, y: y(330), width: 330, ...ASSIGN.tasksAfter });
  const assignees = useEntityLayout({ x: 720, y: y(660), width: 330, ...ASSIGN.assignees });

  const uId = users.anchor("right", "id");
  const tOwner = tasks.anchor("left", "owner_id");
  const ownsBend = (users.right + tasks.left) / 2;
  const owns: Pt[] = [uId, [ownsBend, uId[1]], [ownsBend, tOwner[1]], tOwner];
  const has: Pt[] = [tasks.anchor("bottom"), assignees.anchor("top")];
  const hasAfter: Pt[] = [tasksAfter.anchor("bottom"), assignees.anchor("top")];
  const aUser = assignees.anchor("left", "user_id");
  const uBottom = users.anchor("bottom");
  const assigned: Pt[] = [uBottom, [uBottom[0], aUser[1]], aUser];

  // The owners moving across: a dot each, along the right of the boxes.
  const ownerRow = rowBox(tasks, 1).mid;
  const taskRow = rowBox(assignees, 0).mid;
  const lane = tasks.right + 56;
  const path: Pt[] = [
    [tasks.right, ownerRow],
    [lane, ownerRow],
    [lane, taskRow],
    [assignees.right, taskRow],
  ];
  const along = (t: number): Pt => {
    const segs = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
    let d = t * segs.reduce((a, b) => a + b, 0);
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i] || i === segs.length - 1) {
        const f = segs[i] ? Math.min(1, d / segs[i]) : 0;
        return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f];
      }
      d -= segs[i];
    }
    return path[path.length - 1];
  };
  // Once owner_id is struck, tasks closes up over it: the two-row box is
  // already whole underneath and the old one fades off it, rather than a
  // fresh box building itself.
  const swapAt = removeAt + 12;
  /** Frames each owner takes to move across. */
  const TRAVEL = 45;

  const phases = [
    { at: expandAt, title: "Expand", detail: "add the new table beside the old" },
    { at: dataAt - 4, title: "Move", detail: "the data across, then the code" },
    { at: contractAt, title: "Contract", detail: "remove the old column" },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={newTableAt - 2} level={-29} />
      <Sfx name="el-pencil" at={newTableAt + 8} level={-35} />
      {Array.from({ length: MOVED }, (_, i) => (
        <Sfx key={i} name="el-whoosh" at={dataAt + i * 12} level={-34} />
      ))}
      <Sfx name="el-scratch" at={removeAt} level={-30} />
      {phases.map((p, i) => (
        <Sfx key={`p${i}`} name="el-tap" at={p.at - 2} level={-29} />
      ))}

      <Kicker at={expandFrom - 10}>Expand and contract</Kicker>
      <Head at={expandFrom - 6} second={teamAt - 2} italic="a team.">
        One owner becomes
      </Head>

      <FigLabel n="5" title="One owner, then a team of assignees" at={expandFrom + 4} x={120} y={y(262)} />
      <Entity layout={users} at={expandFrom + 2} />
      {/* The contracted tasks and its line, whole from the moment they show, under the old ones. */}
      {frame >= swapAt ? (
        <>
          <Entity layout={tasksAfter} at={swapAt - 24} rowAt={{ id: swapAt - 24, title: swapAt - 24 }} />
          <Relation name="tasks have assignees, after" points={hasAfter} from="exactly-one" to="zero-or-many" at={swapAt - 24} />
        </>
      ) : null}
      <Entity
        layout={tasks}
        at={expandFrom + 6}
        marks={{ owner_id: { at: ownerAt - 2, tone: "key", out: nothingAt - 4 } }}
        out={swapAt}
      />
      <RowWash e={tasks} rows={[1]} at={nothingAt - 2} out={swapAt} color={`color-mix(in srgb, var(--ds-red-400) 40%, ${PAPER})`} />
      <RowStrike e={tasks} index={1} at={removeAt} out={swapAt} />
      <Relation name="users own tasks" points={owns} from="exactly-one" to="zero-or-many" at={expandFrom + 14} label="owns" out={removeAt + 6} />

      {/* ── Expand: the new table beside the old column ── */}
      <Entity layout={assignees} at={newTableAt - 2} rowGap={6} />
      <Relation name="tasks have assignees" points={has} from="exactly-one" to="zero-or-many" at={newTableAt + 8} out={swapAt} />
      <Relation
        name="users assigned"
        points={assigned}
        from="exactly-one"
        to="zero-or-many"
        at={newTableAt + 14}
        label="assigned"
        labelPos={[uBottom[0] + 16, aUser[1] - 40]}
      />
      <Ping x={tOwner[0] + 120} y={tOwner[1]} at={oldColumnAt} color={KEY} r={36} />
      <Ping x={tOwner[0] + 120} y={tOwner[1]} at={bothAt} color={KEY} r={36} />
      <Ping x={assignees.left + 160} y={assignees.top + assignees.height / 2} at={bothAt + 8} color={KEY} r={60} />

      {/* ── Move: each owner becomes that task's first assignee ── */}
      {Array.from({ length: MOVED }, (_, i) => {
        const t = ease(frame, dataAt + i * 12, TRAVEL);
        if (t <= 0 || t >= 1) return null;
        const [px, py] = along(t);
        return (
          <Svg key={i}>
            <circle cx={px} cy={py} r={8} fill={KEY} stroke={PAPER} strokeWidth={2} />
          </Svg>
        );
      })}

      {/* ── The phases, as each is reached ── */}
      {phases.map((p, i) => {
        const done = ease(frame, p.at + 8, 10);
        return (
          <Ink key={p.title} at={p.at - 4} dur={14} style={{ left: 1210, top: y(332) + i * 92, display: "flex", alignItems: "center", gap: 16, whiteSpace: "nowrap" }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                boxSizing: "border-box",
                border: `2px solid ${KEY}`,
                background: `color-mix(in srgb, ${KEY} ${Math.round(done * 100)}%, ${PAPER})`,
                color: done > 0.5 ? PAPER : INK,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 19,
              }}
            >
              {i + 1}
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ ...label(26, INK), fontWeight: 650 }}>{p.title}</span>
              <span style={{ ...body(24, true), color: INK_SOFT }}>
                {i === 1 ? (
                  <>
                    the data across, then <Mark at={codeAt - 2}>the code</Mark>
                  </>
                ) : (
                  p.detail
                )}
              </span>
            </span>
          </Ink>
        );
      })}

      <Spot id="db-designing-schemas-bridge" at={expandAt - 6} left={1240} top={y(650)} width={480} height={280} />
    </AbsoluteFill>
  );
};
