import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note, Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Flow, Mark, METHOD_INK, Msg, msgHeight, OK_INK, pulse, X0, VRule } from "./parts";

/** The grid's columns: the method, what it does, then the two properties. */
const COL = { what: 250, safe: 610, idem: 770 };
const PROP_W = 150;
const R_X = 1080;

type Cell = "yes" | "no" | "maybe";

/**
 * Question 2. Two properties, safe and idempotent, head a grid; one row per
 * method fills as it is named. Then the two follow-ups: a second DELETE
 * answers 404 where the first answered 204, and the article is gone either
 * way; a PATCH that sets a status is idempotent, one that adds to a count is
 * not.
 */
export const MethodsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("methods").from;
  const qAt = n.word("methods", "Question two");
  const textAt = n.word("methods", "Walk through");
  const sortAt = n.word("methods", "Two properties sort them");
  const safeAt = n.word("methods", "Safe:");
  const idemAt = n.word("methods", "Idempotent:");
  const getAt = n.word("methods-list", "GET reads");
  const bothAt = n.word("methods-list", "and is both");
  const putAt = n.word("methods-list", "PUT replaces");
  const deleteAt = n.word("methods-list", "DELETE removes one");
  const bothIdemAt = n.word("methods-list", "both idempotent");
  const postAt = n.word("methods-list", "POST submits");
  const neitherAt = n.word("methods-list", "is neither");
  const patchAt = n.word("methods-list", "PATCH changes part");
  const maybeAt = n.word("methods-list", "isn't necessarily idempotent");
  const secondAt = n.word("methods-delete", "A second delete");
  const notFoundAt = n.word("methods-delete", "may answer not found");
  const differentAt = n.word("methods-delete", "a different response");
  const goneAt = n.word("methods-delete", "the article is gone either way");
  const stillAt = n.word("methods-delete", "so delete is still idempotent");
  const stateAt = n.word("methods-delete", "about state, not the reply");
  const pubAt = n.word("methods-patch", "sets the status to published");
  const isIdemAt = n.word("methods-patch", "is idempotent");
  const viewAt = n.word("methods-patch", "adds one to a view count");
  const notAt = n.word("methods-patch", "is not");
  const end = n.beat("methods-patch").to;

  const head = y(330);
  const rowY = (i: number) => y(430) + i * h(66);
  const ROWS: { m: string; what: string; at: number; safe: [Cell, number]; idem: [Cell, number] }[] = [
    { m: "GET", what: "reads", at: getAt, safe: ["yes", bothAt], idem: ["yes", bothAt + 4] },
    { m: "PUT", what: "replaces a whole resource", at: putAt, safe: ["no", bothIdemAt], idem: ["yes", bothIdemAt] },
    { m: "DELETE", what: "removes one", at: deleteAt, safe: ["no", bothIdemAt + 4], idem: ["yes", bothIdemAt + 4] },
    { m: "POST", what: "submits data to be processed", at: postAt, safe: ["no", neitherAt], idem: ["no", neitherAt + 4] },
    { m: "PATCH", what: "changes part of a resource", at: patchAt, safe: ["no", maybeAt], idem: ["maybe", maybeAt] },
  ];
  const cell = ([c, at]: [Cell, number], x: number, top: number, key: string) =>
    c === "yes" ? (
      <div key={key} style={{ position: "absolute", left: x + PROP_W / 2 - 14, top: top + 4, opacity: frame >= at ? 1 : 0 }}>
        <Tick at={at} size={28} />
      </div>
    ) : (
      <Note key={key} at={at} x={x} y={top + 2} width={PROP_W} style={{ textAlign: "center" }}>
        {c === "no" ? (
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>no</span>
        ) : (
          <span style={{ ...note(21, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={at + 6}>not necessarily</Mark>
          </span>
        )}
      </Note>
    );

  // The follow-ups, on the right.
  const delTop = (i: number) => y(340) + i * h(76);
  const oneH = msgHeight(1, 22);
  const respX = R_X + 360;
  const patchTop = (i: number) => y(640) + i * h(122);
  // The view count climbs once a second while it is on screen.
  const views = 101 + Math.max(0, Math.min(2, Math.floor((frame - viewAt - 24) / 16)));

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={sortAt} level={-34} />
      {ROWS.map((r) => (
        <Sfx key={r.m} name="el-tap" at={r.at + 2} level={-32} />
      ))}
      <Sfx name="el-tap" at={secondAt + 8} level={-31} />
      <Sfx name="el-tap" at={notFoundAt + 6} level={-31} />
      <Sfx name="el-chime" at={stateAt} level={-33} />
      <Sfx name="el-tap" at={pubAt} level={-31} />
      <Sfx name="el-tap" at={viewAt} level={-31} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={60}>
          Walk through the main HTTP methods and their semantics.
        </QuestionCard>

        {/* The grid's head: the two properties, each with what it means. */}
        <Note at={safeAt} x={COL.safe} y={head} width={PROP_W} style={{ textAlign: "center" }}>
          <div style={{ ...label(24, INK), fontWeight: 750 }}>safe</div>
          <div style={{ ...note(19, INK_SOFT), marginTop: 4, whiteSpace: "nowrap" }}>state unchanged</div>
        </Note>
        <Note at={idemAt} x={COL.idem} y={head} width={PROP_W + 30} style={{ textAlign: "center" }}>
          <div style={{ ...label(24, INK), fontWeight: 750 }}>idempotent</div>
          <div style={{ ...note(19, INK_SOFT), marginTop: 4, whiteSpace: "nowrap" }}>twice = once</div>
        </Note>
        <div style={{ position: "absolute", left: X0, top: head + h(70), width: COL.idem + PROP_W + 30 - X0, height: 1, background: HAIRLINE, opacity: ease(frame, sortAt, 12) }} />

        {ROWS.map((r, i) => (
          <React.Fragment key={r.m}>
            <Ink at={r.at} dur={12} style={{ left: X0, top: rowY(i), whiteSpace: "nowrap" }}>
              <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: METHOD_INK }}>{r.m}</span>
            </Ink>
            <Ink at={r.at + 4} dur={14} style={{ left: COL.what, top: rowY(i) + 1, whiteSpace: "nowrap" }}>
              <span style={{ ...note(24, INK) }}>{r.what}</span>
            </Ink>
            {cell(r.safe, COL.safe, rowY(i), `${r.m}s`)}
            {cell(r.idem, COL.idem + 15, rowY(i), `${r.m}i`)}
          </React.Fragment>
        ))}

        {/* Follow-up one: DELETE twice. */}
        <Note at={secondAt} x={R_X} y={delTop(0) - h(46)}>
          <span style={{ ...label(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>The same DELETE, twice</span>
        </Note>
        {[0, 1].map((i) => {
          const at = secondAt + 4 + i * 10;
          const respAt = i === 0 ? secondAt + 14 : notFoundAt;
          return (
            <React.Fragment key={i}>
              <Msg x={R_X} y={delTop(i)} w={300} at={at} lines={[{ t: "DELETE /articles/42" }]} />
              <Flow points={[[R_X + 308, delTop(i) + oneH / 2], [respX - 8, delTop(i) + oneH / 2]]} at={respAt - 6} color={INK_SOFT} width={2.2} head={11} />
              <Msg
                x={respX}
                y={delTop(i)}
                w={250}
                at={respAt}
                tone="data"
                statusInk={INK}
                lines={[{ t: i === 0 ? "204 No Content" : "404 Not Found", mark: { at: differentAt + i * 6 } }]}
              />
            </React.Fragment>
          );
        })}
        <Note at={goneAt} x={R_X} y={delTop(2) + h(4)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            article 42 gone after either: <b style={{ color: OK_INK }}>same state</b>
          </span>
        </Note>
        <Note at={stillAt} x={R_X} y={delTop(2) + h(46)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
            <Mark at={stateAt}>about state, not the reply</Mark>
          </span>
        </Note>

        {/* Follow-up two: two PATCHes, one idempotent and one not. */}
        <Note at={pubAt - 6} x={R_X} y={patchTop(0) - h(46)}>
          <span style={{ ...label(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>Two PATCH requests, each sent three times</span>
        </Note>
        <Msg
          x={R_X}
          y={patchTop(0)}
          w={400}
          at={pubAt - 2}
          tone="ok"
          lit={pulse(frame, isIdemAt, 20)}
          lines={[{ t: "PATCH /articles/42" }, { t: '{"status": "published"}' }]}
        />
        <Note at={isIdemAt} x={R_X + 430} y={patchTop(0) + h(10)}>
          <span style={{ ...note(24, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>still published</span>
          <div style={{ ...note(21, INK_SOFT), marginTop: 2, whiteSpace: "nowrap" }}>nothing changes</div>
        </Note>
        <Msg
          x={R_X}
          y={patchTop(1)}
          w={400}
          at={viewAt}
          tone="bad"
          lit={pulse(frame, notAt, 20)}
          lines={[{ t: "PATCH /articles/42" }, { t: "views = views + 1" }]}
        />
        <Note at={viewAt + 12} x={R_X + 430} y={patchTop(1) + h(10)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            views: <Num>{views}</Num>
          </span>
          <div style={{ ...note(21, INK_SOFT), marginTop: 2, whiteSpace: "nowrap" }}>climbs every time</div>
        </Note>

        {/* A hairline between the grid and the follow-ups. */}
        <VRule x={1015} top={delTop(0) - h(46)} bottom={patchTop(1) + msgHeight(2, 22)} at={secondAt} />
      </Drift>
    </AbsoluteFill>
  );
};
