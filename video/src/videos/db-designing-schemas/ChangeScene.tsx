import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { HAIRLINE, INK, INK_SOFT, label } from "../../editorial/style";
import { Ink, Leader } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { TRACKER } from "./data";
import { Chip, Drift, Head, Kicker, PathArrow, Ping } from "./parts";

const CHIP_Y = 292;
const CHIP_X = [120, 360, 600, 840, 1080, 1320];
const CHIP_W = 196;

/**
 * Part 3 opens (why-schemas-change): a task tracker that starts with tasks
 * alone and keeps being asked for more (v1 to v5), drawn as a run of
 * versions over the schema that grows with them; then the five things that
 * lean on a live schema, each named as the narration reaches it.
 */
export const ChangeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const changeFrom = n.beat("change").from;
  const tasksAt = n.word("change", "just tasks");
  const dueAt = n.word("change", "due dates");
  const projectsAt = n.word("change", "projects");
  const labelsAt = n.word("change", "labels");
  const historyAt = n.word("change", "history");
  const kindsFrom = n.beat("kinds").from;
  const learningAt = n.word("kinds", "learning");
  const riskyFrom = n.beat("risky").from;
  const leanAt = [
    n.word("risky", "rows"),
    n.word("risky", "code"),
    n.word("risky", "reports"),
    n.word("risky", "tests"),
    n.word("risky", "habits"),
  ];
  const shapeAt = n.word("risky", "shape");

  const tasks = useEntityLayout({ x: 120, y: y(400), width: 330, ...TRACKER.tasks });
  const projects = useEntityLayout({ x: 640, y: y(400), width: 300, ...TRACKER.projects });
  const pId = projects.anchor("left", "id");
  const tP = tasks.anchor("right", "project_id");
  const bend = (tasks.right + projects.left) / 2;

  const versions = [
    { at: tasksAt, text: "v1 tasks only" },
    { at: dueAt, text: "v2 due date" },
    { at: projectsAt, text: "v3 projects" },
    { at: labelsAt, text: "v4 labels" },
    { at: historyAt, text: "v5 history" },
  ];
  // The dependents of a live schema: the why-schemas-change flowchart's five.
  const dependents = ["Existing data", "Application code", "Reports and queries", "Tests and fixtures", "People's workflows"];
  const depX = 1240;
  const depY = (i: number) => y(432 + i * 92);
  const from: [number, number] = [projects.right + 6, y(520)];

  return (
    <AbsoluteFill>
      {versions.map((v, i) => (
        <Sfx key={i} name="el-tap" at={v.at - 2} level={-29 - (i % 2)} />
      ))}
      <Sfx name="el-pop" at={projectsAt} level={-30} />
      {leanAt.map((t, i) => (
        <Sfx key={`d${i}`} name="el-pencil" at={t - 4} level={-35} />
      ))}

      <Kicker at={changeFrom - 10}>When the design changes</Kicker>
      <Head at={changeFrom - 6} out={kindsFrom - 6}>
        A design is never done.
      </Head>
      <Head at={kindsFrom - 2} second={learningAt - 4} out={riskyFrom - 6} italic="the product is learning.">
        Not a failure:
      </Head>
      <Head at={riskyFrom - 2} second={shapeAt - 6} italic="leans on its shape.">
        Everything live
      </Head>

      {/* ── The versions, one per request ── */}
      {versions.map((v, i) => (
        <Ink key={v.text} at={v.at - 4} dur={14} style={{ left: CHIP_X[i], top: y(CHIP_Y), whiteSpace: "nowrap" }}>
          <Chip tone={i === 0 ? "soft" : "ink"} size={21}>
            {v.text}
          </Chip>
        </Ink>
      ))}
      {versions.slice(1).map((v, i) => (
        <PathArrow
          key={i}
          points={[
            [CHIP_X[i] + CHIP_W - 24, y(CHIP_Y) + 22],
            [CHIP_X[i + 1] - 10, y(CHIP_Y) + 22],
          ]}
          at={v.at - 8}
          dur={8}
          color={INK_SOFT}
          width={2}
        />
      ))}
      {/* "Learning about the world": the run goes on past v5. */}
      <PathArrow
        points={[
          [CHIP_X[4] + CHIP_W - 24, y(CHIP_Y) + 22],
          [CHIP_X[5] - 10, y(CHIP_Y) + 22],
        ]}
        at={learningAt - 6}
        dur={10}
        color={INK_SOFT}
        width={2}
        dash="6 6"
      />
      <Ink at={learningAt} dur={14} style={{ left: CHIP_X[5], top: y(CHIP_Y), whiteSpace: "nowrap" }}>
        <span
          style={{
            display: "inline-flex",
            padding: "6px 14px",
            borderRadius: 8,
            border: `2px dashed ${HAIRLINE}`,
            ...label(21, INK_SOFT),
          }}
        >
          v6 and on
        </span>
      </Ink>

      {/* ── The schema, growing with them ── */}
      <Drift from={historyAt} to={riskyFrom + 120} amount={0.025} origin={`${tasks.left}px ${tasks.top}px`}>
        <Entity layout={tasks} at={tasksAt - 4} rowAt={{ due_on: dueAt, project_id: projectsAt + 10 }} rowGap={4} />
        <Entity layout={projects} at={projectsAt - 2} />
        <Relation
          name="projects contain tasks"
          points={[pId, [bend, pId[1]], [bend, tP[1]], tP]}
          from="exactly-one"
          to="zero-or-many"
          at={projectsAt + 12}
          label="contains"
          labelPos={[bend + 10, (pId[1] + tP[1]) / 2 - 14]}
        />
      </Drift>

      {/* ── What leans on it ── */}
      {dependents.map((d, i) => (
        <React.Fragment key={d}>
          <Leader
            points={[from, [from[0] + 90, from[1]], [depX - 70, depY(i) + 22], [depX - 12, depY(i) + 22]]}
            at={leanAt[i] - 6}
            dur={12}
            color={INK_SOFT}
            width={1.6}
          />
          <Ink at={leanAt[i] - 4} dur={14} style={{ left: depX, top: depY(i), whiteSpace: "nowrap" }}>
            <Chip tone="soft">{d}</Chip>
          </Ink>
          <Ping x={depX + 90} y={depY(i) + 22} at={shapeAt + i * 3} color={INK} r={40} dur={20} />
        </React.Fragment>
      ))}
      <div style={{ position: "absolute", left: from[0] - 4, top: from[1] - 4, width: 8, height: 8, borderRadius: 4, background: INK, opacity: ease(frame, leanAt[0] - 6, 8) }} />
    </AbsoluteFill>
  );
};
