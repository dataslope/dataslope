import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Pt } from "../../components/arrow";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BADGES, DEVICES, EMPLOYEES, SECOND_BADGE, SECOND_BADGE_ROW, SECOND_BADGE_SQL } from "./data";
import { DbTable, ErrorBox, Fig, KEY_INK, Listing, MARK, MARK_KEY, Mono, tableGeometry } from "./kit";
import { Drift, Glow, Headline, Kicker, Mark, pulse, Spot } from "./parts";

const EMP_X = 130;
const BOX_X = 620;
const RIGHT_X = 1080;
const SQL_Y = 300;
const SQL_SIZE = 26;
const CAPTION_Y = 474;
const TABLE_Y = 508;
const ERROR_Y = 706;
const RULE_Y = 744;

/**
 * The marks change the schema (cardinality.mdx): many devices per employee is
 * a plain foreign key, one badge at most is a foreign key that must be unique,
 * and Postgres refuses Ada's second badge with the lesson's own error. It
 * never sees the picture: someone translates it into keys and constraints.
 */
export const BadgeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const schemaFrom = n.beat("schema").from;
  const changeAt = n.word("schema", "change");
  const devicesAt = n.word("schema", "Many devices");
  const perAt = n.word("schema", "per employee");
  const deviceRowsAt = n.word("schema", "device rows");
  const shareAt = n.word("schema", "share");
  const badgeFrom = n.beat("badge").from;
  const oneBadgeAt = n.word("badge", "one badge");
  const atMostAt = n.word("badge", "at most");
  const noIdAt = n.word("badge", "no employee id");
  const twiceAt = n.word("badge", "twice");
  const rejectFrom = n.beat("reject").from;
  const secondAt = n.word("reject", "second badge");
  const noAt = n.word("reject", "NO");
  const adaAt = n.word("reject", "Ada");
  const neverAt = n.word("translate", "never sees");
  const translateAt = n.word("translate", "translate");
  const keysAt = n.word("translate", "keys");
  const constraintsAt = n.word("translate", "constraints");
  const translateTo = n.beat("translate").to;

  // ── The diagram ──
  const emp = useEntityLayout({
    x: EMP_X,
    y: y(420),
    width: 300,
    name: "employees",
    columns: [{ name: "id", key: "PK" }, { name: "name" }],
  });
  const dev = useEntityLayout({
    x: BOX_X,
    y: y(310),
    width: 340,
    name: "devices",
    columns: [{ name: "id", key: "PK" }, { name: "employee_id", key: "FK" }],
  });
  const bad = useEntityLayout({
    x: BOX_X,
    y: y(560),
    width: 340,
    name: "badges",
    columns: [{ name: "id", key: "PK" }, { name: "employee_id", key: "FK, UK" }],
  });
  // Both lines leave employees on its key side: the header, and the id row
  // (never `name`, which no foreign key points at). Each elbow sits clear of
  // the label above or below the line's first stretch.
  const e1 = emp.anchor("right");
  const d1 = dev.anchor("left");
  const e2 = emp.anchor("right", "id");
  const b1 = bad.anchor("left");
  const devLine: Pt[] = [e1, [572, e1[1]], [572, d1[1]], d1];
  const badLine: Pt[] = [e2, [575, e2[1]], [575, b1[1]], b1];
  const devEnd: Pt = [d1[0] - 22, d1[1]];
  const badEnd: Pt = [b1[0] - 20, b1[1]];

  // ── Ada's second badge ──
  const cols = ["id", "employee_id"];
  const tg = tableGeometry({ x: RIGHT_X, top: y(TABLE_Y), cols, rows: [...BADGES.rows, SECOND_BADGE_ROW], headH: h(52), rowH: h(62) });
  // Ada's devices first, in the same place: two rows, one employee id. They
  // give way to the badges as the narration turns to them.
  const dg = tableGeometry({ x: RIGHT_X, top: y(TABLE_Y), cols: DEVICES.cols, rows: DEVICES.rows, headH: h(52), rowH: h(62) });
  const devicesOut = ease(frame, badgeFrom + 2, 10);
  const [adaId, adaName] = EMPLOYEES.rows[0];
  const errPulse = pulse(frame, constraintsAt, 22);

  return (
    <AbsoluteFill>
      {/* ── Sound: two boxes, two lines, the refused row ── */}
      <Sfx name="el-pop" at={devicesAt - 4} level={-30} />
      <Sfx name="el-pencil" at={devicesAt + 2} level={-34} />
      <Sfx name="el-pop" at={oneBadgeAt - 4} level={-30} />
      <Sfx name="el-tap" at={secondAt} level={-28} />
      <Sfx name="el-scratch" at={noAt} level={-30} />

      <Kicker at={schemaFrom - 40}>Cardinality</Kicker>
      <Headline lead="The marks" at={schemaFrom - 4} turn="change the schema." turnAt={changeAt - 4} out={translateAt - 8} />
      <Headline lead="You translate" at={translateAt - 2} turn="the picture." turnAt={translateAt + 10} />
      <Spot id="db-relationships-badge" at={oneBadgeAt - 2} left={1676} top={y(70)} width={132} height={280} />

      <Drift from={schemaFrom} to={translateTo + 60} scale={0.018} origin={[960, y(560)]}>
        <Fig n="5" at={schemaFrom} x={EMP_X} y={y(268)}>
          One employee: many devices, one badge at most
        </Fig>

        {/* The washes go under the ends they light. */}
        <Glow c={devEnd} r={30} at={deviceRowsAt - 2} out={badgeFrom} />
        <Glow c={badEnd} r={30} at={atMostAt - 2} out={rejectFrom} />

        <Entity layout={emp} at={schemaFrom - 2} rowGap={3} />
        <Entity layout={dev} at={devicesAt - 4} marks={{ employee_id: { at: shareAt, tone: "key" } }} />
        <Entity layout={bad} at={oneBadgeAt - 4} marks={{ employee_id: { at: noIdAt, tone: "note" } }} />
        <Relation
          name="employees assigned devices"
          points={devLine}
          from="exactly-one"
          to="zero-or-many"
          at={perAt - 6}
          label="assigned"
          labelPos={[458, e1[1] - 38]}
        />
        <Relation
          name="employees receive badges"
          points={badLine}
          from="exactly-one"
          to="zero-or-one"
          at={oneBadgeAt + 2}
          label="receives"
          labelPos={[462, e2[1] + 10]}
        />

        {/* ── What each end becomes ── */}
        {/* Each arrives as its end is turned into a rule, and is named again
            on "keys and constraints". */}
        <Ink at={shareAt - 2} dur={14} style={{ left: EMP_X, top: y(RULE_Y), whiteSpace: "nowrap" }}>
          <span style={{ ...body(32, true), color: INK }}>Zero or many:</span>
          <span style={{ ...note(24, INK_SOFT), marginLeft: 14 }}>
            <Mark at={keysAt}>a foreign key</Mark>
          </span>
        </Ink>
        <Ink at={twiceAt - 2} dur={14} style={{ left: EMP_X, top: y(RULE_Y + 50), whiteSpace: "nowrap" }}>
          <span style={{ ...body(32, true), color: INK }}>Zero or one:</span>
          <span style={{ ...note(24, INK_SOFT), marginLeft: 14 }}>
            a foreign key, and <Mark at={constraintsAt + 8}>unique</Mark>
          </span>
        </Ink>

        {/* ── Ada's devices: two rows can share her id ── */}
        <AbsoluteFill style={{ opacity: 1 - devicesOut }}>
          <Ink at={devicesAt + 4} dur={14} style={{ left: RIGHT_X, top: y(CAPTION_Y) }}>
            <span style={label(24, INK)}>
              <Mono>devices</Mono>
            </span>
          </Ink>
          <DbTable
            g={dg}
            cols={DEVICES.cols}
            rows={DEVICES.rows.map((cells, i) => ({ cells, at: perAt + 2 + i * 5 }))}
            at={devicesAt + 4}
            numeric={[0, 1]}
            colInk={{ 1: KEY_INK }}
            marks={DEVICES.rows.map((_, i) => ({ row: i, col: 1, at: shareAt + i * 5, color: MARK }))}
          />
        </AbsoluteFill>

        {/* ── The table, and the badge Postgres refuses ── */}
        <Listing
          lines={SECOND_BADGE_SQL}
          x={RIGHT_X}
          top={y(SQL_Y)}
          width={560}
          size={SQL_SIZE}
          at={rejectFrom - 6}
          lineAt={[rejectFrom - 2, rejectFrom + 6]}
          mark={{ at: secondAt, out: noAt + 20 }}
        />
        <Ink at={oneBadgeAt + 4} dur={14} style={{ left: RIGHT_X, top: y(CAPTION_Y) }}>
          <span style={label(24, INK)}>
            <Mono>badges</Mono>
          </span>
        </Ink>
        <DbTable
          g={tg}
          cols={cols}
          rows={[
            ...BADGES.rows.map((cells) => ({ cells, at: oneBadgeAt + 8 })),
            { cells: SECOND_BADGE_ROW, at: secondAt + 4, ghost: true, grow: true, strikeAt: noAt + 2, dimAt: noAt + 10 },
          ]}
          at={oneBadgeAt + 4}
          numeric={[0, 1]}
          colInk={{ 1: KEY_INK }}
          marks={[
            { row: 0, col: 1, at: twiceAt - 2, color: MARK },
            { row: 1, col: 1, at: secondAt + 10, color: MARK_KEY },
          ]}
        />
        {/* Who employee 1 is: the Ada the narration names. */}
        <Ink at={adaAt - 2} dur={14} style={{ left: tg.x + tg.width + 28, top: tg.rowTop(0), height: tg.rowH, display: "flex", alignItems: "center" }}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            employee {adaId}, {adaName}
          </span>
        </Ink>
        <ErrorBox
          x={RIGHT_X}
          top={y(ERROR_Y)}
          width={740}
          at={noAt + 4}
          message={SECOND_BADGE.message}
          detail={SECOND_BADGE.detail ?? ""}
          pulse={errPulse}
        />
        <Ink at={neverAt} dur={14} style={{ left: RIGHT_X, top: y(ERROR_Y) + 176, whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK_SOFT) }}>
            The <Mono>UNIQUE</Mono> rule on <Mono>employee_id</Mono> did this, not the picture.
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
