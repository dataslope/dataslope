import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Headline, Kicker, PaperPage } from "./parts";

/**
 * Part 1 opens on the bridge from Unit 8: the course's own two tables build
 * themselves (a table, its key, the join between them), the claim that none
 * of it was obvious once, and the 1970 paper it all started with.
 */
export const OpenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const tableAt = n.word("hook", "table");
  const keyAt = n.word("hook", "key");
  const joinAt = n.word("hook", "join");
  const noneAt = n.word("hook", "none");
  const paperAt = n.word("paper", "one paper");
  const seventyAt = n.word("paper", "nineteen seventy");
  const whatAt = n.word("paper", "So what");
  const beforeAt = n.word("paper", "before");

  const customers = useEntityLayout({
    x: 300,
    y: y(390),
    width: 330,
    name: "customers",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "name", type: "text" },
    ],
  });
  const orders = useEntityLayout({
    x: 790,
    y: y(350),
    width: 400,
    name: "orders",
    columns: [
      { name: "id", type: "integer", key: "PK" },
      { name: "customer_id", type: "integer", key: "FK" },
      { name: "total", type: "numeric" },
    ],
  });
  const c = customers.anchor("right", "id");
  const o = orders.anchor("left", "customer_id");
  const midX = (c[0] + o[0]) / 2;

  // The paper arrives on the right and the diagram makes room for it,
  // drifting left and setting back as the talk moves past it.
  const room = ease(frame, paperAt - 8, 26);
  const back = ease(frame, beforeAt - 4, 24);

  return (
    <AbsoluteFill>
      {/* ── Sound: the two tables, the key, the join, the paper and its date ── */}
      <Sfx name="el-pop" at={tableAt - 4} level={-30} />
      <Sfx name="el-pop" at={tableAt + 6} level={-31} />
      <Sfx name="el-tap" at={keyAt - 2} level={-29} />
      <Sfx name="el-pencil" at={joinAt - 4} level={-33} />
      <Sfx name="el-whoosh" at={paperAt - 8} level={-33} />
      <Sfx name="el-tap" at={seventyAt} level={-28} />

      <Kicker at={hookFrom - 10}>The relational revolution</Kicker>

      <Headline at={noneAt - 4} lead="None of it was obvious once." out={whatAt - 6} />
      <Headline at={whatAt - 2} lead="So what came before it?" />

      <AbsoluteFill
        style={{
          transform: `translateX(${-room * 120}px) scale(${1 - room * 0.06})`,
          transformOrigin: `300px ${y(560)}px`,
          opacity: 1 - back * 0.45,
        }}
      >
        <Entity
          layout={customers}
          at={tableAt - 4}
          dim={noneAt + 4}
          marks={{ id: { at: keyAt - 2, tone: "key" } }}
        />
        <Entity
          layout={orders}
          at={tableAt + 6}
          dim={noneAt + 4}
          marks={{ id: { at: keyAt + 2, tone: "key" }, customer_id: { at: joinAt - 2, tone: "key" } }}
        />
        <Relation
          name="customers place orders"
          points={[c, [midX, c[1]], [midX, o[1]], o]}
          from="exactly-one"
          to="zero-or-many"
          at={joinAt - 4}
          dim={noneAt + 4}
          color="var(--ds-blue-ink)"
        />
      </AbsoluteFill>

      {/* ── The paper ── */}
      <PaperPage
        x={1250}
        top={y(310)}
        width={560}
        height={540}
        at={paperAt - 8}
        titleAt={paperAt}
        authorAt={paperAt + 14}
        dateAt={seventyAt}
        textAt={seventyAt + 6}
        dim={beforeAt + 6}
      />
    </AbsoluteFill>
  );
};
