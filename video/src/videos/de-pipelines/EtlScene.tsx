import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Flow, Node, OK, OK_INK, Pill, pulse, X0 } from "./parts";

const ETL_Y = 360;
const ELT_Y = 610;
const SRC_X = 420;
const SRC_W = 220;
const BOX_H = 100;

/** A row's name and its expansion, down the left. */
const RowName: React.FC<{ at: number; expandAt: number; x: number; y: number; name: string; words: string; tag?: { at: number; text: string } }> = ({
  at,
  expandAt,
  x,
  y,
  name,
  words,
  tag,
}) => {
  const frame = useCurrentFrame();
  return (
    <Note at={at} x={x} y={y}>
      <div style={{ ...label(44, INK), fontWeight: 800, whiteSpace: "nowrap" }}>{name}</div>
      <div style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", marginTop: 4, opacity: ease(frame, expandAt, 12) }}>{words}</div>
      {tag ? (
        <div
          style={{
            marginTop: 10,
            display: "inline-block",
            padding: "3px 12px 4px",
            borderRadius: 8,
            background: OK,
            ...label(20, PAPER),
            fontWeight: 750,
            whiteSpace: "nowrap",
            opacity: ease(frame, tag.at, 10),
          }}
        >
          {tag.text}
        </div>
      ) : null}
    </Note>
  );
};

/**
 * Question 3 (with Data warehousing's "why did ELT become the default"). Two
 * rows: ETL transforms on its own servers and loads only the result; ELT
 * loads the raw data into the warehouse and transforms it there, in SQL. Then
 * why ELT won (cheap elastic compute; raw data kept, so new logic means a new
 * transform, not a new extract), and where ETL still fits.
 */
export const EtlScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("etl").from;
  const qAt = n.word("etl", "Question three");
  const textAt = n.word("etl", "What is ETL versus ELT");
  const etlAt = n.word("etl", "ETL, extract, transform, load, transforms");
  const etlWordsAt = n.word("etl", "extract, transform, load, transforms");
  const ownAt = n.word("etl", "on its own servers");
  const loadingAt = n.word("etl", "before loading it into the warehouse");
  const eltAt = n.word("etl", "ELT, extract, load, transform, loads");
  const eltWordsAt = n.word("etl", "extract, load, transform, loads");
  const rawAt = n.word("etl", "loads the raw data first");
  const insideAt = n.word("etl", "transforms it inside the warehouse");
  const sequelAt = n.word("etl", "in sequel");
  const dbtAt = n.word("etl", "often with dbt");
  const defaultAt = n.word("elt-why", "ELT became the default");
  const computeAt = n.word("elt-why", "cheap, elastic compute");
  const fastAt = n.word("elt-why", "transforming in place is fast");
  const staysAt = n.word("elt-why", "the raw data stays");
  const logicAt = n.word("elt-why", "when the logic changes");
  const againAt = n.word("elt-why", "transform again");
  const noExtractAt = n.word("elt-why", "without extracting again");
  const fitsAt = n.word("etl-when", "ETL still fits");
  const littleAt = n.word("etl-when", "little compute");
  const strictAt = n.word("etl-when", "a strict schema");
  const end = n.beat("etl-when").to;

  const ey = y(ETL_Y);
  const ly = y(ELT_Y);
  const emid = ey + BOX_H / 2;
  // ELT's warehouse holds three stages.
  const WH = { x: 760, w: 1040, top: ly - h(36), hgt: BOX_H + h(84) };
  const raw = { x: 800, w: 240 };
  const tf = { x: 1120, w: 300 };
  const clean = { x: 1490, w: 270 };
  const lmid = ly + BOX_H / 2 + h(8);
  const rawLit = pulse(frame, staysAt + 4, 26);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={ownAt} level={-35} />
      <Sfx name="el-pop" at={loadingAt + 4} level={-35} />
      <Sfx name="el-pop" at={rawAt} level={-35} />
      <Sfx name="el-pop" at={insideAt} level={-35} />
      <Sfx name="el-tap" at={defaultAt} level={-34} />
      <Sfx name="el-pencil" at={againAt} level={-36} />
      <Sfx name="el-tap" at={fitsAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is ETL versus ELT, and why did ELT become the default?
        </QuestionCard>

        {/* ETL: transform on its own servers, then load the result. */}
        <RowName at={etlAt - 2} expandAt={etlWordsAt} x={X0} y={ey - h(6)} name="ETL" words="extract, transform, load" />
        <Node x={SRC_X} y={ey} w={SRC_W} h={BOX_H} at={etlAt + 4} title="sources" />
        <Flow points={[[SRC_X + SRC_W + 6, emid], [760 - 8, emid]]} at={ownAt - 4} color={BAR} />
        <Node x={760} y={ey} w={300} h={BOX_H} at={ownAt} tone="plain" title="transform" sub="on its own servers" />
        <Flow points={[[1066, emid], [1180 - 8, emid]]} at={loadingAt} color={BAR} />
        <Node x={1180} y={ey} w={330} h={BOX_H} at={loadingAt + 4} title="warehouse" sub="the result only" />
        <Note at={fitsAt} x={1180} y={ey + BOX_H + h(20)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            still fits: <b style={{ opacity: ease(frame, littleAt, 10) }}>little compute</b>
            <span style={{ opacity: ease(frame, strictAt, 10) }}>
              , or <b>a strict schema</b>
            </span>
          </span>
        </Note>

        {/* ELT: load raw into the warehouse, transform there. */}
        <RowName at={eltAt - 2} expandAt={eltWordsAt} x={X0} y={ly - h(6)} name="ELT" words="extract, load, transform" tag={{ at: defaultAt, text: "the default" }} />
        <Node x={SRC_X} y={ly + h(8)} w={SRC_W} h={BOX_H} at={eltAt + 4} title="sources" />
        {/* The warehouse, holding all three stages. */}
        <div
          style={{
            position: "absolute",
            left: WH.x,
            top: WH.top,
            width: WH.w * ease(frame, rawAt - 4, 14),
            height: WH.hgt,
            boxSizing: "border-box",
            border: `2.5px solid ${BAR}`,
            borderRadius: 14,
            background: `color-mix(in srgb, ${BAR} 5%, ${PAPER})`,
            opacity: ease(frame, rawAt - 4, 8),
          }}
        />
        <Note at={rawAt} x={WH.x + 18} y={WH.top + 8}>
          <span style={{ ...label(21, BLUE_INK), fontWeight: 700, whiteSpace: "nowrap" }}>warehouse</span>
        </Note>
        <Flow points={[[SRC_X + SRC_W + 6, lmid], [raw.x - 8, lmid]]} at={rawAt} color={BAR} />
        <Node x={raw.x} y={ly + h(8)} w={raw.w} h={BOX_H} at={rawAt + 4} title="raw tables" sub="as loaded" lit={rawLit} />
        <Flow points={[[raw.x + raw.w + 6, lmid], [tf.x - 8, lmid]]} at={insideAt} color={BAR} />
        <Node x={tf.x} y={ly + h(8)} w={tf.w} h={BOX_H} at={insideAt + 4} tone="plain" title="transform in SQL" sub={<span style={{ opacity: ease(frame, dbtAt, 10) }}>often with dbt</span>} />
        <Flow points={[[tf.x + tf.w + 6, lmid], [clean.x - 8, lmid]]} at={sequelAt + 4} color={BAR} />
        <Node x={clean.x} y={ly + h(8)} w={clean.w} h={BOX_H} at={sequelAt + 8} title="clean tables" />

        {/* Why it won. */}
        <Pill x={WH.x + 200} y={WH.top - 52} at={computeAt} tone="ok" size={21} solid>
          cheap, elastic compute
        </Pill>
        <Note at={fastAt} x={WH.x + 470} y={WH.top - 46}>
          <span style={{ ...note(22, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>so transforming in place is fast</span>
        </Note>
        {/* New logic: back from the raw tables into the transform, with no new extract. */}
        <Flow
          points={[
            [raw.x + raw.w / 2, ly + h(8) + BOX_H + 6],
            [raw.x + raw.w / 2, WH.top + WH.hgt + h(34)],
            [tf.x + tf.w / 2, WH.top + WH.hgt + h(34)],
            [tf.x + tf.w / 2, ly + h(8) + BOX_H + 8],
          ]}
          at={againAt}
          dur={18}
          color={OK}
          width={3}
        />
        <Note at={logicAt} x={raw.x} y={WH.top + WH.hgt + h(52)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            logic changed: transform again
            <span style={{ opacity: ease(frame, noExtractAt, 10) }}>, no new extract</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
