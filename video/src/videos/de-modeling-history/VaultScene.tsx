import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, OK_INK, X0 } from "./parts";

const TOP = 330;
const SAT = 600;
const NOTES_X = 1480;

/**
 * Question 9, drawn with the ERD kit (no engine runs a vault's loading
 * pattern here, so this one is a mechanism). Hubs carry the business keys,
 * the link carries the relationship between the two hubs, and each hub's
 * satellite carries its descriptive attributes with the load date and the
 * source on every row. Then why it loads well (inserts only, a satellite per
 * source, every value traceable) and when to choose it over a star, or both.
 */
export const VaultScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("vault").from;
  const qAt = n.word("vault", "Question nine");
  const textAt = n.word("vault", "What is a data vault");
  const threeAt = n.word("vault", "splits the model three ways");
  const hubsAt = n.word("vault", "Hubs hold the business keys");
  const linksAt = n.word("vault", "Links hold the relationships");
  const satsAt = n.word("vault", "Satellites hold the descriptive attributes");
  const changeAt = n.word("vault", "a new row for every change");
  const loadedAt = n.word("vault", "when it loaded");
  const sourceAt = n.word("vault", "which source sent it");
  const insertsAt = n.word("vault-why", "Loading only ever inserts");
  const ownAt = n.word("vault-why", "each source gets its own satellites");
  const parallelAt = n.word("vault-why", "teams add sources in parallel");
  const tracesAt = n.word("vault-why", "every value traces back");
  const vaultWhenAt = n.word("vault-when", "Choose it for many changing sources");
  const starAt = n.word("vault-when", "Choose a star");
  const bothAt = n.word("vault-when", "Often it's both");
  const storesAt = n.word("vault-when", "the vault stores the history");
  const serveAt = n.word("vault-when", "serve the reports");
  const end = n.beat("vault-when").to;

  const hubC = useEntityLayout({
    x: X0,
    y: y(TOP),
    width: 340,
    name: "hub_customer",
    columns: [{ name: "customer_hk", key: "PK" }, { name: "customer_id" }, { name: "load_date" }],
  });
  const link = useEntityLayout({
    x: 580,
    y: y(TOP),
    width: 400,
    name: "link_customer_order",
    columns: [{ name: "link_hk", key: "PK" }, { name: "customer_hk", key: "FK" }, { name: "order_hk", key: "FK" }, { name: "load_date" }],
  });
  const hubO = useEntityLayout({
    x: 1100,
    y: y(TOP),
    width: 320,
    name: "hub_order",
    columns: [{ name: "order_hk", key: "PK" }, { name: "order_id" }, { name: "load_date" }],
  });
  const satC = useEntityLayout({
    x: X0,
    y: y(SAT),
    width: 340,
    name: "sat_customer",
    columns: [{ name: "customer_hk", key: "PK, FK" }, { name: "load_date", key: "PK" }, { name: "city" }, { name: "record_source" }],
  });
  const satO = useEntityLayout({
    x: 1100,
    y: y(SAT),
    width: 320,
    name: "sat_order",
    columns: [{ name: "order_hk", key: "PK, FK" }, { name: "load_date", key: "PK" }, { name: "status" }, { name: "record_source" }],
  });

  const stamp = { load_date: { at: loadedAt + 2, out: insertsAt }, record_source: { at: sourceAt + 2, out: insertsAt } };
  const trace = (at: number) => ({ record_source: { at, out: vaultWhenAt } });
  const midX = 520;
  const midTop = y(SAT) + h(10);

  const whenNotes = [
    { at: vaultWhenAt, head: "Choose a vault", lines: ["many changing sources", "strict audit"], ink: BLUE_INK },
    { at: starAt, head: "Choose a star", lines: ["a stable domain", "analysts query it directly"], ink: BLUE_INK },
    { at: bothAt, head: "Often both", lines: ["the vault stores history", "stars on top serve reports"], ink: OK_INK },
  ];
  const lineAt = [
    [vaultWhenAt + 10, vaultWhenAt + 24],
    [starAt + 10, starAt + 24],
    [storesAt, serveAt - 4],
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={hubsAt + 2} level={-35} />
      <Sfx name="el-pencil" at={linksAt + 8} level={-36} />
      <Sfx name="el-tap" at={satsAt + 2} level={-35} />
      <Sfx name="el-sprinkle" at={loadedAt} level={-37} />
      <Sfx name="el-tap" at={vaultWhenAt + 2} level={-36} />
      <Sfx name="el-tap" at={starAt + 2} level={-36} />
      <Sfx name="el-chime" at={bothAt + 4} level={-37} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={54}>
          What is a data vault, and when would you choose it over a star schema?
        </QuestionCard>

        {/* Hubs: one per business key. */}
        <Entity layout={hubC} at={hubsAt - 2} marks={{ customer_id: { at: hubsAt + 10, out: linksAt } }} />
        <Entity layout={hubO} at={hubsAt + 4} marks={{ order_id: { at: hubsAt + 14, out: linksAt } }} />
        {/* The link: the relationship, and nothing else. */}
        <Entity
          layout={link}
          at={linksAt - 2}
          marks={{ customer_hk: { at: linksAt + 10, tone: "key", out: satsAt }, order_hk: { at: linksAt + 14, tone: "key", out: satsAt } }}
        />
        <Relation name="hub_customer to link" points={[hubC.anchor("right", "customer_hk"), link.anchor("left", "customer_hk")]} from="exactly-one" to="zero-or-many" at={linksAt + 6} />
        <Relation name="hub_order to link" points={[hubO.anchor("left", "order_hk"), link.anchor("right", "order_hk")]} from="exactly-one" to="zero-or-many" at={linksAt + 10} />
        {/* Satellites: the attributes, a row per change, stamped. */}
        <Entity layout={satC} at={satsAt - 2} marks={{ city: { at: satsAt + 10, out: changeAt + 20 }, ...stamp, ...trace(tracesAt + 2) }} />
        <Entity layout={satO} at={satsAt + 4} marks={{ status: { at: satsAt + 14, out: changeAt + 20 }, ...stamp, ...trace(tracesAt + 6) }} />
        <Relation name="hub_customer to satellite" points={[hubC.anchor("bottom"), satC.anchor("top")]} from="exactly-one" to="one-or-many" at={satsAt + 6} dur={12} />
        <Relation name="hub_order to satellite" points={[hubO.anchor("bottom"), satO.anchor("top")]} from="exactly-one" to="one-or-many" at={satsAt + 10} dur={12} />

        {/* The three kinds, named under the diagram's middle. */}
        <Note at={threeAt} x={midX} y={midTop}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b style={{ opacity: ease(frame, hubsAt, 10) }}>hubs</b>: business keys
          </span>
        </Note>
        <Note at={linksAt} x={midX} y={midTop + h(40)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b>links</b>: relationships
          </span>
        </Note>
        <Note at={satsAt} x={midX} y={midTop + h(80)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b>satellites</b>: attributes
            <span style={{ color: INK_SOFT, opacity: ease(frame, changeAt, 10) }}>, a row per change</span>
          </span>
        </Note>

        {/* Why it loads well. */}
        <Note at={insertsAt} x={midX} y={midTop + h(150)}>
          <span style={{ ...note(24, INK), fontWeight: 650, whiteSpace: "nowrap" }}>loading only inserts</span>
        </Note>
        <Note at={ownAt} x={midX} y={midTop + h(190)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>a satellite per source</span>
        </Note>
        <Note at={parallelAt} x={midX} y={midTop + h(230)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>teams add sources in parallel</span>
        </Note>
        <Note at={tracesAt} x={midX} y={midTop + h(270)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>every value traced to its source</span>
        </Note>

        {/* When to choose it. */}
        {whenNotes.map((w, i) => (
          <Note key={w.head} at={w.at - 2} x={NOTES_X} y={y(TOP) + h(10) + i * h(170)}>
            <div style={{ ...note(26, w.ink), fontWeight: 750, whiteSpace: "nowrap" }}>{w.head}</div>
            {w.lines.map((l, j) => (
              <div key={l} style={{ ...label(22, i === 2 ? INK : INK_SOFT), fontWeight: 600, whiteSpace: "nowrap", marginTop: 6, opacity: ease(frame, lineAt[i][j], 10) }}>
                {l}
              </div>
            ))}
          </Note>
        ))}
      </Drift>
    </AbsoluteFill>
  );
};
