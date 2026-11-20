import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO, SANS } from "../../theme/fonts";
import { Arrow, Code, Drift, Line, Listing, listingHeight, listingWidth, Mark, MARK_GREEN, MARK_RED, OK_INK, VRule, X0 } from "./parts";

const COL = [X0, 1010];
const SIZE = 21;

/** A schema or table name, set large in mono, in its own color. */
const Name: React.FC<{ at: number; x: number; y: number; color?: string; out?: number; size?: number; children: React.ReactNode }> = ({ at, x, y, color = INK, out, size = 28, children }) => (
  <Line at={at} x={x} y={y} size={size} out={out}>
    <span style={{ fontFamily: MONO, fontWeight: 600, color, fontVariantLigatures: "none", fontSize: size }}>{children}</span>
  </Line>
);

/**
 * Questions 9 and 10, on two targets side by side under a hairline: dev,
 * Alice's own schema, and prod, the production one, each a database, a
 * schema and credentials. One `ref('stg_orders')` resolves to
 * `dbt_alice.stg_orders` under dev and `analytics.stg_orders` under prod
 * (drawn from the page's two names; dbt does not run here). Hardcoded, Alice's
 * model reads prod's table, a red arrow across the gap. Then the schema
 * config: by default the target's schema and the custom one joined
 * (`dbt_alice_staging`, Bob's beside it); in prod the default would be
 * `analytics_staging`, and a customized generate_schema_name gives plain
 * `staging`.
 */
export const EnvScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("env").from;
  const q9At = n.word("env", "Question nine");
  const text9At = n.word("env", "What are environments and targets");
  const targetAt = n.word("env", "A target is a named warehouse connection");
  const databaseAt = n.word("env", "the database");
  const schemaWordAt = n.word("env", "the schema and");
  const credsAt = n.word("env", "the credentials");
  const twoAt = n.word("env", "Teams usually have two environments");
  const devAt = n.word("env", "dev, where each developer");
  const ownAt = n.word("env", "their own schema");
  const prodAt = n.word("env", "and prod");
  const resolvesAt = n.word("env-ref", "Ref resolves to the active target's schema");
  const aliceAt = n.word("env-ref", "reads Alice's schema in development");
  const nightlyAt = n.word("env-ref", "the production schema in the nightly job");
  const noChangeAt = n.word("env-ref", "with no code change");
  const halfAt = n.word("env-hard", "the other half of hardcoding a name");
  const writtenAt = n.word("env-hard", "Written as the production table");
  const readsProdAt = n.word("env-hard", "read production");
  const notAt = n.word("env-hard", "not the model she just changed");
  const q10At = n.word("schema", "Question ten");
  const text10At = n.word("schema", "How do you handle environment-specific schemas");
  const configAt = n.word("schema", "With the schema config");
  const macroAt = n.word("schema", "the macro that turns it into a name");
  const genAt = n.word("schema", "generate schema name");
  const defaultAt = n.word("schema-dev", "By default, dbt adds");
  const landAt = n.word("schema-dev", "Alice's staging models land");
  const aliceStgAt = n.word("schema-dev", "dbt alice staging");
  const neverAt = n.word("schema-dev", "two developers never overwrite each other");
  const plainAt = n.word("schema-prod", "Production usually wants the plain name");
  const customizeAt = n.word("schema-prod", "teams customize the macro");
  const dropAt = n.word("schema-prod", "drop the prefix there");
  const end = n.beat("schema-prod").to;

  const q9Out = q10At - 6;

  // ── The targets ──
  const lineY = y(292);
  const headY = y(368);
  const schemaY = headY + h(50);
  const restY = schemaY + h(44);
  const ruleX = (COL[0] + 780 + COL[1]) / 2;

  // ── Question 9: one ref, two schemas ──
  const refLine = ["FROM {{ ref('stg_orders') }}"];
  const refW = listingWidth(refLine, SIZE);
  const refX = ruleX - refW / 2;
  const refTop = y(572);
  const refH = listingHeight(1, SIZE);
  const nameY = y(690);
  const hardTop = y(796);
  const hardLine = ["FROM analytics.stg_orders"];
  const hardW = listingWidth(hardLine, SIZE);

  // ── Question 10: the schema config, and the names it gives ──
  const cfgLine = ["{{ config(schema='staging') }}"];
  const cfgW = listingWidth(cfgLine, SIZE);
  const cfgX = ruleX - cfgW / 2;
  const row1 = y(702);
  const row2 = row1 + h(62);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={databaseAt} level={-34} />
      <Sfx name="el-tap" at={schemaWordAt} level={-34} />
      <Sfx name="el-tap" at={credsAt} level={-34} />
      <Sfx name="el-pencil" at={devAt} level={-36} />
      <Sfx name="el-pencil" at={prodAt} level={-36} />
      <Sfx name="el-pencil" at={aliceAt} level={-35} />
      <Sfx name="el-pencil" at={nightlyAt} level={-35} />
      <Sfx name="el-scratch" at={writtenAt + 4} level={-34} />
      <Sfx name="el-whoosh" at={readsProdAt} level={-35} />
      <Sfx name="el-pencil" at={configAt} level={-35} />
      <Sfx name="el-tap" at={aliceStgAt} level={-31} />
      <Sfx name="el-tap" at={neverAt} level={-33} />
      <Sfx name="el-chime" at={dropAt + 2} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={q9At - 4} textAt={text9At - 4} out={q9Out} size={58}>
          What are environments and targets in dbt?
        </QuestionCard>
        <QuestionCard n={10} at={q10At} textAt={text10At - 2} size={58}>
          How do you handle environment-specific schemas in dbt?
        </QuestionCard>

        {/* A target: a named connection. */}
        <Line at={targetAt} x={X0} y={lineY} size={26}>
          A target, a named warehouse connection: <Mark at={databaseAt}>database,</Mark> <Mark at={schemaWordAt}>schema,</Mark> <Mark at={credsAt}>credentials</Mark>
        </Line>

        {/* Dev and prod, side by side. */}
        <Line at={twoAt} x={COL[0]} y={headY} size={28} weight={600}>
          <Code>dev</Code> <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, devAt, 10) }}>· each developer&rsquo;s own schema</span>
        </Line>
        <Line at={twoAt + 6} x={COL[1]} y={headY} size={28} weight={600}>
          <Code>prod</Code> <span style={{ color: INK_SOFT, fontWeight: 500, opacity: ease(frame, prodAt, 10) }}>· the production schema</span>
        </Line>
        <Line at={ownAt} x={COL[0]} y={schemaY} size={24}>
          Schema <Code color={BLUE_INK}>dbt_alice</Code>
        </Line>
        <Line at={prodAt + 4} x={COL[1]} y={schemaY} size={24}>
          Schema <Code color={BLUE_INK}>analytics</Code>
        </Line>
        <Line at={ownAt + 4} x={COL[0]} y={restY} color={INK_SOFT}>
          Plus its own database and credentials
        </Line>
        <Line at={prodAt + 8} x={COL[1]} y={restY} color={INK_SOFT}>
          Plus its own database and credentials
        </Line>
        <VRule x={ruleX} top={headY} bottom={restY + h(30)} at={twoAt + 6} />

        {/* ── Question 9: one ref, resolved per target ── */}
        <Line at={resolvesAt} x={refX} y={refTop - h(40)} color={INK_SOFT} out={q9Out}>
          One reference, in the model
        </Line>
        <Listing lines={refLine} x={refX} top={refTop} width={refW} size={SIZE} at={resolvesAt} out={q9Out} marks={[{ line: "ref(", text: "{{ ref('stg_orders') }}", at: resolvesAt + 8 }]} />
        <Arrow points={[[refX + 40, refTop + refH + 6], [refX + 40, refTop + refH + 30], [COL[0] + 140, refTop + refH + 30], [COL[0] + 140, nameY - 10]]} at={aliceAt} out={q9Out} />
        <Arrow points={[[refX + refW - 40, refTop + refH + 6], [refX + refW - 40, refTop + refH + 30], [COL[1] + 140, refTop + refH + 30], [COL[1] + 140, nameY - 10]]} at={nightlyAt} out={q9Out} />
        <Name at={aliceAt + 8} x={COL[0]} y={nameY} out={q9Out}>
          <span style={{ color: BLUE_INK }}>dbt_alice</span>.stg_orders
        </Name>
        <Name at={nightlyAt + 8} x={COL[1]} y={nameY} out={q9Out}>
          <span style={{ color: BLUE_INK }}>analytics</span>.stg_orders
        </Name>
        <Line at={noChangeAt} x={refX + refW + 24} y={refTop + 8} color={OK_INK} weight={600} out={q9Out}>
          No code change
        </Line>

        {/* Hardcoded: Alice's run reads prod. */}
        <Line at={halfAt} x={COL[0]} y={hardTop - h(40)} color={INK_SOFT} out={q9Out}>
          Alice&rsquo;s model, hardcoded
        </Line>
        <Listing
          lines={hardLine}
          x={COL[0]}
          top={hardTop}
          width={hardW}
          size={SIZE}
          at={writtenAt}
          rule={ACCENT}
          ink={{ 0: ACCENT_INK }}
          marks={[{ line: "analytics.stg_orders", text: "analytics.stg_orders", at: writtenAt + 6, color: MARK_RED }]}
          out={q9Out}
        />
        <Arrow
          points={[[COL[0] + hardW + 12, hardTop + refH / 2], [COL[1] + 140, hardTop + refH / 2], [COL[1] + 140, nameY + h(46)]]}
          at={readsProdAt}
          dur={18}
          color={ACCENT}
          out={q9Out}
        />
        <Line at={notAt} x={COL[1] + 170} y={hardTop - h(4)} color={ACCENT_INK} weight={600} out={q9Out}>
          Reads production, not her change
        </Line>

        {/* ── Question 10: the schema config, and the macro ── */}
        <Listing lines={cfgLine} x={cfgX} top={refTop} width={cfgW} size={SIZE} at={configAt} marks={[{ line: "schema=", text: "schema='staging'", at: configAt + 8 }]} />
        <Line at={macroAt} x={cfgX} y={refTop + refH + h(16)} color={INK_SOFT}>
          Named by <span style={{ opacity: ease(frame, genAt, 10) }}><Code color={INK}>generate_schema_name</Code></span>
        </Line>

        {/* Dev: the target's schema and the custom one, joined. */}
        <Name at={defaultAt + 4} x={COL[0]} y={row1} size={26}>
          <span style={{ color: BLUE_INK }}>dbt_alice</span> <span style={{ color: INK_SOFT, fontFamily: "inherit" }}>+</span> staging{" "}
          <span style={{ color: INK_SOFT }}>→</span> <span style={{ opacity: ease(frame, landAt, 10) }}><Mark at={aliceStgAt}>dbt_alice_staging</Mark></span>
        </Name>
        <Name at={neverAt - 4} x={COL[0]} y={row2} size={26}>
          <span style={{ color: INK_SOFT, fontFamily: SANS, fontWeight: 500 }}>Bob&rsquo;s:</span> dbt_bob_staging
        </Name>
        <Line at={neverAt} x={COL[0]} y={row2 + h(50)} color={INK_SOFT}>
          Two developers, two schemas: nobody overwrites anybody
        </Line>

        {/* Prod: the default would prefix it; a customized macro does not. */}
        <Name at={plainAt - 2} x={COL[1]} y={row1} size={26} color={INK_SOFT}>
          analytics + staging → analytics_staging
        </Name>
        <Line at={plainAt + 4} x={COL[1]} y={row1 + h(40)} color={INK_SOFT}>
          The default
        </Line>
        <Name at={customizeAt} x={COL[1]} y={row2 + h(26)} size={26}>
          <Mark at={dropAt} color={MARK_GREEN}>
            <span style={{ color: OK_INK }}>staging</span>
          </Mark>
        </Name>
        <Line at={customizeAt + 6} x={COL[1]} y={row2 + h(26) + h(46)} color={OK_INK} weight={600}>
          A customized macro, in prod
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
