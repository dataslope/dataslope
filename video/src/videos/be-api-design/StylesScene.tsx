import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, label, note, HAIRLINE } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Flow, Mark, METHOD_INK, Node, Pill, X0, LISTING_PAPER, VRule } from "./parts";

const COLS = [X0, 710, 1300];
const COL_W = 500;
/** GraphQL's one query: the fields the screen wants, named. */
const QUERY = ["query {", "  article(id: 42) {", "    title", "    author { name }", "    comments { text }", "  }", "}"];
const Q_SIZE = 21;
const BITS = "01101001 11000101 00111010 10010110 01011100 ";

/**
 * Question 10. Three columns: REST's screen making three round trips; one
 * GraphQL query naming its fields; two services joined by gRPC's binary
 * stream. Under each, what it buys and what it costs. Then the common split:
 * REST at the edge, gRPC inside.
 */
export const StylesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("styles").from;
  const q10At = n.word("styles", "Question ten");
  const q10TextAt = n.word("styles", "REST versus GraphQL");
  const restAt = n.word("styles-rest", "REST is resources");
  const understoodAt = n.word("styles-rest", "universally understood");
  const defaultAt = n.word("styles-rest", "the safe default");
  const screenAt = n.word("styles-rest", "But a screen that needs");
  const tripsAt = n.word("styles-rest", "three round trips");
  const fieldsAt = n.word("styles-rest", "get fields it never shows");
  const gqlAt = n.word("styles-graphql", "GraphQL lets the client");
  const exactlyAt = n.word("styles-graphql", "exactly the fields it wants");
  const oneAt = n.word("styles-graphql", "in one query");
  const richAt = n.word("styles-graphql", "suits rich, varied front ends");
  const harderAt = n.word("styles-graphql", "caching and rate limiting get harder");
  const weighAt = n.word("styles-graphql", "a limit has to weigh");
  const grpcAt = n.word("styles-grpc", "gRPC sends binary Protocol Buffers");
  const fastAt = n.word("styles-grpc", "fast, strongly typed");
  const streamAt = n.word("styles-grpc", "able to stream");
  const internalAt = n.word("styles-grpc", "ideal between internal services");
  const browserAt = n.word("styles-grpc", "weaker browser support");
  const mixAt = n.word("styles-mix", "So a common design");
  const publicAt = n.word("styles-mix", "REST for the public API");
  const betweenAt = n.word("styles-mix", "gRPC between its own services");
  const end = n.beat("styles-mix").to;

  const headTop = y(300);
  const figTop = y(400);
  const plusTop = y(625);
  const heads = [
    { name: "REST", what: "Resources over HTTP and JSON", at: restAt },
    { name: "GraphQL", what: "The client names its fields", at: gqlAt },
    { name: "gRPC", what: "Protocol Buffers over HTTP/2", at: grpcAt },
  ];
  const lines: { plus: [string, number][]; minus: [string, number][] }[] = [
    {
      plus: [
        ["Understood everywhere, easy to cache", understoodAt],
        ["The safe default for a public API", defaultAt],
      ],
      minus: [["Round trips, fields it never shows", fieldsAt]],
    },
    {
      plus: [
        ["Exactly the fields, in one query", oneAt + 6],
        ["Suits rich, varied front ends", richAt],
      ],
      minus: [
        ["Caching and rate limits get harder", harderAt],
        ["A limit weighs each query's cost", weighAt],
      ],
    },
    {
      plus: [
        ["Fast, strongly typed, streams", fastAt],
        ["Ideal between internal services", internalAt],
      ],
      minus: [["Weak browser support, not human-readable", browserAt]],
    },
  ];
  const trips = ["GET /articles/42", "GET /users/7", "GET /articles/42/comments"];
  const svc = { w: 170, h: h(74) };
  const sTop = figTop + h(40);
  const mixTop = y(835);
  const mixMid = mixTop + h(36);
  /** The internal services, stacked, and the point where gRPC fans out. */
  const svcH = h(38);
  const svcGap = h(7);
  const svcMid = mixMid - h(8);
  const FORK_X = 1000;
  const SVC_X = 1180;
  const bitOffset = Math.max(0, frame - streamAt) * 1.2;

  return (
    <AbsoluteFill>
      {heads.map((hd) => (
        <Sfx key={hd.name} name="el-tap" at={hd.at + 2} level={-31} />
      ))}
      {trips.map((_, i) => (
        <Sfx key={i} name="el-tap" at={screenAt + 8 + i * 8} level={-33} />
      ))}
      <Sfx name="el-pencil" at={exactlyAt} level={-34} />
      <Sfx name="el-whoosh" at={streamAt} level={-36} />
      <Sfx name="el-pencil" at={publicAt} level={-34} />
      <Sfx name="el-pencil" at={betweenAt} level={-34} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={10} at={q10At - 4} textAt={q10TextAt - 4}>
          REST vs GraphQL vs gRPC, when does each fit?
        </QuestionCard>

        {heads.map((hd, i) => (
          <React.Fragment key={hd.name}>
            <Note at={hd.at} x={COLS[i]} y={headTop}>
              <div style={{ ...label(32, INK), fontWeight: 500, whiteSpace: "nowrap" }}>{hd.name}</div>
              <div style={{ ...note(22, INK_SOFT), marginTop: 6, whiteSpace: "nowrap" }}>{hd.what}</div>
            </Note>
            {lines[i].plus.map(([t, at], k) => (
              <Note key={t} at={at} x={COLS[i]} y={plusTop + k * h(36)}>
                <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
                  <b style={{ color: BLUE_INK }}>+</b> {t}
                </span>
              </Note>
            ))}
            {lines[i].minus.map(([t, at], k) => (
              <Note key={t} at={at} x={COLS[i]} y={plusTop + (lines[i].plus.length + k) * h(36)}>
                <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
                  <b>−</b> {t}
                </span>
              </Note>
            ))}
          </React.Fragment>
        ))}

        {/* REST: one screen, three round trips. */}
        <Note at={screenAt} x={COLS[0]} y={figTop}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>One screen: an article, its author, its comments</span>
        </Note>
        {trips.map((t, i) => {
          const at = screenAt + 8 + i * 8;
          return (
            <Note key={t} at={at} x={COLS[0]} y={figTop + h(44) + i * h(46)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 21 }}>
                <span style={{ ...label(23, BLUE_INK), fontWeight: 500, width: 22, textAlign: "right" }}>
                  <Num>{i + 1}</Num>
                </span>
                <span style={{ fontFamily: MONO, fontSize: 21, color: INK, whiteSpace: "pre" }}>
                  <span style={{ color: METHOD_INK, fontWeight: 500 }}>GET</span>
                  {t.slice(3)}
                </span>
                <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, tripsAt + i * 4, 8) }}>↻</span>
              </div>
            </Note>
          );
        })}

        {/* GraphQL: one query, naming its fields. */}
        <Note at={exactlyAt - 2} x={COLS[1]} y={figTop}>
          <div style={{ background: LISTING_PAPER, borderTop: `2px solid ${INK}`, borderBottom: `1px solid ${HAIRLINE}`, padding: "10px 18px 12px", width: 360 }}>
            {QUERY.map((l, i) => {
              const field = /title|name|text/.test(l);
              return (
                <div key={i} style={{ fontFamily: MONO, fontSize: Q_SIZE, lineHeight: "30px", whiteSpace: "pre", color: field ? INK : INK_SOFT, fontWeight: field ? 500 : 500, opacity: ease(frame, exactlyAt + i * 3, 8) }}>
                  {field ? (
                    <>
                      {l.match(/^\s*/)![0]}
                      <Mark at={exactlyAt + 24 + i * 3}>{l.trim()}</Mark>
                    </>
                  ) : (
                    l
                  )}
                </div>
              );
            })}
          </div>
        </Note>
        <Pill x={COLS[1] + 400} y={figTop + h(60)} at={oneAt} tone="data" size={21}>
          1 request
        </Pill>

        {/* gRPC: two services and a binary stream. */}
        <Node x={COLS[2]} y={sTop} w={svc.w} h={svc.h} at={grpcAt + 4} tone="data" title="orders" size={23} />
        <Node x={COLS[2] + COL_W - svc.w} y={sTop} w={svc.w} h={svc.h} at={grpcAt + 8} tone="data" title="search" size={23} />
        <div
          style={{
            position: "absolute",
            left: COLS[2] + svc.w + 14,
            top: sTop + svc.h / 2 - 15,
            width: COL_W - 2 * svc.w - 28,
            height: 30,
            overflow: "hidden",
            borderTop: `2px solid ${BAR}`,
            borderBottom: `2px solid ${BAR}`,
            opacity: ease(frame, grpcAt + 12, 10),
          }}
        >
          <div style={{ position: "absolute", left: -((bitOffset * 4) % 239), top: 1, fontFamily: MONO, fontSize: 21, lineHeight: "26px", color: BLUE_INK, whiteSpace: "pre" }}>
            {BITS.repeat(4)}
          </div>
        </div>
        <Note at={streamAt} x={COLS[2]} y={sTop + svc.h + h(24)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>a binary stream, both ways</span>
        </Note>

        {/* The split: REST at the edge, gRPC inside. The lines are ink and each
            label sits near the middle of its straight run (the owner,
            2026-11-13: "Change the green lines to black lines. The REST and
            gRPC arrow labels need to move slightly to the right"; they were
            green, at X0 + 300 and 880). */}
        <Node x={X0} y={mixTop} w={250} h={h(72)} at={mixAt + 2} tone="plain" title="public clients" size={23} />
        <Flow points={[[X0 + 258, mixMid], [600, mixMid]]} at={publicAt} color={INK} width={3} head={14} />
        <Pill x={X0 + 345} y={mixMid - h(44)} at={publicAt + 4} tone="ok" size={21}>
          REST
        </Pill>
        <Node x={610} y={mixTop} w={240} h={h(72)} at={publicAt + 6} tone="data" title="your API" size={23} />
        {/* gRPC fans out to each of its own services, stacked in a column. */}
        <Flow points={[[858, mixMid], [FORK_X, mixMid]]} at={betweenAt} color={INK} width={3} cut={1} />
        <Pill x={902} y={mixMid - h(44)} at={betweenAt + 4} tone="ok" size={21}>
          gRPC
        </Pill>
        {["orders", "search", "billing"].map((s, i) => {
          const boxTop = svcMid - (3 * svcH + 2 * svcGap) / 2 + i * (svcH + svcGap);
          return (
            <React.Fragment key={s}>
              <Flow points={[[FORK_X, mixMid], [SVC_X - 10, boxTop + svcH / 2]]} at={betweenAt + 8 + i * 4} color={INK} width={3} head={14} />
              <Node x={SVC_X} y={boxTop} w={185} h={svcH} at={betweenAt + 6 + i * 4} tone="data" title={s} size={23} />
            </React.Fragment>
          );
        })}

        {/* Hairlines between the three columns, each with the column to its right. */}
        {[650, 1250].map((x, i) => (
          <VRule key={x} x={x} top={headTop} bottom={plusTop + 3 * h(36) + 30} at={heads[i + 1].at} />
        ))}
      </Drift>
    </AbsoluteFill>
  );
};
