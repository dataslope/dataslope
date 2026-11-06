import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Cross, Drift, Flow, Mark, METHOD_INK, Msg, msgHeight, Node, OK_INK, Pill, Strike, X0, VRule } from "./parts";

/** The resource and the four methods around it. */
const CARD = { x: 300, w: 340, h: 100 };
const METHODS = [
  { m: "GET", x: X0, row: 0, side: "left" },
  { m: "PATCH", x: X0, row: 1, side: "left" },
  { m: "PUT", x: 724, row: 0, side: "right" },
  { m: "DELETE", x: 724, row: 1, side: "right" },
] as const;
const R_X = 990;
const REQ_W = 560;
const SRV = { x: 1600, w: 200 };

/**
 * Question 1. A resource, /articles/42, and the four methods that act on it;
 * a noun in the path against a verb; a request that carries everything the
 * server needs, to a server that keeps nothing between requests. Then why
 * it pays: the next endpoint guessed, and any server behind a load balancer
 * answering the next request the same.
 */
export const RestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("rest").from;
  const qAt = n.word("rest", "Question one");
  const textAt = n.word("rest", "What makes");
  const resAt = n.word("rest", "as resources");
  const urlAt = n.word("rest", "each with a URL");
  const methodsAt = n.word("rest", "the standard HTTP methods");
  const nounsAt = n.word("rest-nouns", "paths are nouns");
  const fortyTwoAt = n.word("rest-nouns", "like articles slash forty-two");
  const verbAt = n.word("rest-nouns", "never a verb like get article");
  const carriesAt = n.word("rest-nouns", "Each request carries everything");
  const sessionAt = n.word("rest-nouns", "with no session kept");
  const meanAt = n.word("rest-nouns", "And methods and status codes");
  const guessAt = n.word("rest-why", "a developer can guess the next endpoint");
  const dependsAt = n.word("rest-why", "no request depends on the last");
  const lbAt = n.word("rest-why", "any server behind a load balancer");
  const nextAt = n.word("rest-why", "can answer the next one");
  const end = n.beat("rest-why").to;

  const cardTop = y(350);
  const pillTop = (row: number) => cardTop + 4 + row * 54;
  const reqTop = y(350);
  const reqH = msgHeight(2, 22);
  const nounTop = y(530);
  const guessTop = y(690);
  const lbTop = y(690);
  const srvTop = (i: number) => y(620) + i * h(124);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={resAt + 2} level={-30} />
      {METHODS.map((m, i) => (
        <Sfx key={m.m} name="el-tap" at={methodsAt + 4 + i * 4} level={-33} />
      ))}
      <Sfx name="el-scratch" at={verbAt + 10} level={-31} />
      <Sfx name="el-pencil" at={carriesAt} level={-34} />
      <Sfx name="el-tap" at={sessionAt + 6} level={-31} />
      <Sfx name="el-pencil" at={guessAt + 8} level={-34} />
      <Sfx name="el-whoosh" at={nextAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4}>
          What makes an API RESTful?
        </QuestionCard>

        {/* A resource with a URL, and the methods that act on it. */}
        <Note at={resAt} x={CARD.x} y={cardTop + 4} width={CARD.w} style={{ textAlign: "center" }}>
          <div style={{ ...label(23, BLUE_INK), whiteSpace: "nowrap" }}>a resource</div>
          <div style={{ fontFamily: MONO, fontSize: 36, fontWeight: 600, color: INK, whiteSpace: "nowrap", marginTop: 6, opacity: ease(frame, urlAt, 10) }}>/articles/42</div>
        </Note>
        <Note at={urlAt + 6} x={CARD.x} y={cardTop + CARD.h + h(12)} width={CARD.w} style={{ textAlign: "center" }}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>its URL names it</span>
        </Note>
        {METHODS.map((m, i) => {
          const at = methodsAt + 4 + i * 4;
          const py = pillTop(m.row) + 15;
          const pillW = m.m.length * 13.2;
          return (
            <React.Fragment key={m.m}>
              <Pill x={m.x} y={pillTop(m.row)} at={at} tone="plain" mono>
                <span style={{ color: METHOD_INK }}>{m.m}</span>
              </Pill>
              <Flow
                points={m.side === "left" ? [[m.x + pillW + 8, py], [CARD.x - 8, py]] : [[m.x - 8, py], [CARD.x + CARD.w + 8, py]]}
                at={at + 4}
                color={INK_SOFT}
                width={2}
                head={11}
              />
            </React.Fragment>
          );
        })}

        {/* Paths are nouns, never verbs. */}
        <Note at={nounsAt} x={X0} y={nounTop}>
          <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>Paths are nouns</span>
        </Note>
        <div style={{ position: "absolute", left: X0, top: nounTop + h(46), display: "flex", alignItems: "center", gap: 14, fontSize: 30, opacity: ease(frame, fortyTwoAt, 10) }}>
          <Tick at={fortyTwoAt + 4} size={28} />
          <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 600, color: OK_INK }}>/articles/42</span>
        </div>
        <div style={{ position: "absolute", left: X0 + 330, top: nounTop + h(46), display: "flex", alignItems: "center", gap: 14, fontSize: 30, opacity: ease(frame, verbAt, 10) }}>
          <Cross at={verbAt + 8} size={26} />
          <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 600, color: ACCENT_INK }}>
            <Strike at={verbAt + 10}>/getArticle</Strike>
          </span>
        </div>

        {/* A request that carries everything, to a server that keeps nothing. */}
        <Note at={carriesAt} x={R_X} y={reqTop - h(44)}>
          <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>Each request carries everything</span>
        </Note>
        <Msg
          x={R_X}
          y={reqTop}
          w={REQ_W}
          at={carriesAt + 2}
          tone="data"
          lines={[
            { t: "GET /articles/42/comments?limit=20", at: carriesAt + 6, mark: { at: carriesAt + 30, out: sessionAt, color: `color-mix(in srgb, ${BAR} 18%, transparent)` } },
            { t: "Authorization: Bearer eyJhbGciOi…", at: carriesAt + 14, mark: { at: carriesAt + 24, out: sessionAt, color: `color-mix(in srgb, ${BAR} 18%, transparent)` } },
          ]}
        />
        <Flow points={[[R_X + REQ_W + 8, reqTop + reqH / 2], [SRV.x - 8, reqTop + reqH / 2]]} at={carriesAt + 20} color={BAR} head={13} />
        <Node x={SRV.x} y={reqTop} w={SRV.w} h={reqH + h(70)} at={carriesAt + 10} tone="plain" title="server" size={24}>
          <span style={{ ...note(21, INK_SOFT), fontStyle: "italic", whiteSpace: "nowrap", opacity: ease(frame, sessionAt + 4, 12) }}>keeps no session</span>
        </Node>
        <Note at={meanAt} x={R_X} y={reqTop + reqH + h(26)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontWeight: 700, color: METHOD_INK }}>GET</span> means read;{" "}
            <span style={{ fontFamily: MONO, fontWeight: 700 }}>404</span> means not found.
          </span>
        </Note>

        {/* Done well, the next endpoint can be guessed. */}
        {["/articles", "/articles/42", "/articles/42/comments"].map((p, i) => {
          const last = i === 2;
          const at = last ? guessAt + 14 : guessAt + i * 5;
          return (
            <Note key={p} at={at} x={X0} y={guessTop + i * h(50)}>
              <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, color: last ? INK : INK_SOFT, whiteSpace: "nowrap" }}>
                {last ? <Mark at={guessAt + 20}>{p}</Mark> : p}
              </span>
            </Note>
          );
        })}
        <Note at={guessAt + 26} x={X0 + 440} y={guessTop + 2 * h(50) + 4}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>← guessed</span>
        </Note>

        {/* Any server can answer the next request. */}
        <Node x={R_X} y={lbTop} w={230} h={h(76)} at={lbAt} tone="plain" title="load balancer" size={23} />
        {[0, 1].map((i) => {
          const at = i === 0 ? dependsAt : nextAt;
          const lit = i === 1 ? ease(frame, nextAt + 10, 10) : 0;
          return (
            <React.Fragment key={i}>
              <Node x={1320} y={srvTop(i)} w={220} h={h(70)} at={lbAt + 6 + i * 5} tone="data" title={`server ${i + 1}`} size={23} lit={lit} />
              <Flow
                points={[
                  [R_X + 238, lbTop + h(38)],
                  [1280, lbTop + h(38)],
                  [1280, srvTop(i) + h(35)],
                  [1312, srvTop(i) + h(35)],
                ]}
                at={at + 4}
                color={i === 1 ? BAR : INK_SOFT}
                width={2.4}
                head={12}
              />
              <Note at={at + 10} x={1560} y={srvTop(i) + h(18)}>
                <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: BLUE_INK, whiteSpace: "nowrap" }}>200 OK</span>
              </Note>
            </React.Fragment>
          );
        })}
        <Note at={nextAt + 14} x={1320} y={srvTop(1) + h(92)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>the next request, either one</span>
        </Note>

        {/* A hairline between the resource and the request. */}
        <VRule x={897} top={reqTop - h(44)} bottom={srvTop(1) + h(92) + 30} at={carriesAt} />
      </Drift>
    </AbsoluteFill>
  );
};
