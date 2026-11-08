import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Cross, Drift, Flow, Http, Mark, Msg, msgHeight, OK_INK, Strike, X0, VRule } from "./parts";

const CODE_SIZE = 23;

type Column = { cls: string; name: string; x: number; w: number; codes: string[] };
const COLUMNS: Column[] = [
  { cls: "2xx", name: "success", x: X0, w: 340, codes: ["200 OK", "201 Created", "204 No Content"] },
  { cls: "3xx", name: "redirection", x: 500, w: 340, codes: ["301", "304 Not Modified"] },
  {
    cls: "4xx",
    name: "client error",
    x: 880,
    w: 420,
    codes: ["400 Bad Request", "401 Unauthorized", "403 Forbidden", "404 Not Found", "409 Conflict", "422 Unprocessable Entity", "429 Too Many Requests"],
  },
  { cls: "5xx", name: "server error", x: 1360, w: 420, codes: ["500", "503 Service Unavailable"] },
];

/** The three answers to one request, on the right once Question 4 is up. */
const REQ_X = 640;
const REQ_W = 470;
const RESP_X = 1190;
const RESP_W = 390;

/**
 * Questions 3 and 4. The status classes as four columns, the page's codes in
 * each, the first digit lit; a client branching on the code rather than on a
 * message. Then the 4xx column slides left, 401 and 403 lit, and one request
 * is answered three ways: 401 with its challenge header (no credentials),
 * 403 behind a padlock (credentials, not enough), and 404, on purpose.
 */
export const CodesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("codes").from;
  const qAt = n.word("codes", "Question three");
  const textAt = n.word("codes", "What do the HTTP");
  const digitAt = n.word("codes", "The first digit tells the story");
  const twoAt = n.word("codes", "Two hundreds succeed");
  const c200 = n.word("codes", "two hundred OK");
  const c201 = n.word("codes", "two oh one created");
  const c204 = n.word("codes", "two oh four no content");
  const threeAt = n.word("codes", "Three hundreds redirect");
  const fourAt = n.word("codes", "Four hundreds blame the client");
  const fiveAt = n.word("codes", "five hundreds the server");
  const rightAt = n.word("codes-why", "The right code");
  const inCodeAt = n.word("codes-why", "handle a failure in code");
  const parseAt = n.word("codes-why", "parsing an error message");
  const q4At = n.word("authn", "Question four");
  const q4TextAt = n.word("authn", "Four oh one versus");
  const a401 = n.word("authn-401", "Four oh one, unauthorized");
  const authnAt = n.word("authn-401", "about authentication");
  const noCredAt = n.word("authn-401", "no valid credentials");
  const challengeAt = n.word("authn-401", "a challenge header");
  const a403 = n.word("authn-403", "Four oh three, forbidden");
  const refusesAt = n.word("authn-403", "refuses it");
  const fineAt = n.word("authn-403", "The credentials may be fine");
  const enoughAt = n.word("authn-403", "aren't enough");
  const againAt = n.word("authn-403", "logging in again");
  const a404 = n.word("authn-404", "some APIs answer four oh four");
  const purposeAt = n.word("authn-404", "on purpose");
  const strangerAt = n.word("authn-404", "a stranger can't learn");
  const end = n.beat("authn-404").to;

  const colTop = y(330);
  const codeTop = y(450);
  const codeStep = h(50);
  const classAt = [twoAt, threeAt, fourAt, fiveAt];
  const codeAt = (c: number, i: number) => (c === 0 ? [c200, c201, c204][i] : classAt[c] + 6 + i * 4);
  // Question 4: the other classes go; 4xx slides left and its two codes light.
  const leave = q4At - 6;
  const slide = interpolate(ease(frame, q4At + 2, 22), [0, 1], [0, X0 - COLUMNS[2].x]);
  const pair = ease(frame, q4TextAt, 12);

  const rowTop = (i: number) => y(330) + i * h(172);
  const twoH = msgHeight(2, 22);
  const whyTop = y(690);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={digitAt} level={-34} />
      {classAt.map((at, i) => (
        <Sfx key={i} name="el-tap" at={at + 2} level={-31} />
      ))}
      <Sfx name="el-scratch" at={parseAt + 10} level={-31} />
      <Sfx name="el-whoosh" at={q4At + 2} level={-36} />
      <Sfx name="el-tap" at={challengeAt + 4} level={-31} />
      <Sfx name="el-scratch" at={againAt + 10} level={-31} />
      <Sfx name="el-tap" at={a404 + 10} level={-31} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} out={leave} size={62}>
          What do the HTTP status code classes mean?
        </QuestionCard>
        <QuestionCard n={4} at={q4At - 2} textAt={q4TextAt - 2} size={62}>
          401 vs 403, what is the difference?
        </QuestionCard>

        {/* The four classes, the first digit lit. */}
        {COLUMNS.map((c, ci) => {
          const four = ci === 2;
          const out = four ? undefined : leave;
          const x = c.x + (four ? slide : 0);
          return (
            <React.Fragment key={c.cls}>
              <Note at={classAt[ci] - 2} x={x} y={colTop} out={out}>
                <span style={{ fontFamily: MONO, fontSize: 44, fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>
                  <span style={{ position: "relative", display: "inline-block" }}>
                    <span style={{ position: "absolute", inset: "0.08em -0.04em 0 -0.04em", background: HIGHLIGHT, borderRadius: 4, opacity: ease(frame, Math.max(digitAt, classAt[ci] - 2), 10) * (1 - ease(frame, fourAt + 30, 12)) }} />
                    <span style={{ position: "relative" }}>{c.cls[0]}</span>
                  </span>
                  xx
                </span>
                <div style={{ ...label(24, INK_SOFT), marginTop: 4, whiteSpace: "nowrap" }}>{c.name}</div>
              </Note>
              {c.codes.map((code, i) => {
                const lifted = four && (code.startsWith("401") || code.startsWith("403"));
                const dimmed = four && !lifted ? ease(frame, q4TextAt, 12) * 0.6 : 0;
                return (
                  <Note key={code} at={codeAt(ci, i)} x={x + (lifted ? 18 * pair : 0)} y={codeTop + i * codeStep} out={out} style={{ opacity: 1 - dimmed }}>
                    <span style={{ fontSize: CODE_SIZE, whiteSpace: "nowrap" }}>
                      {/* Every code sits in a highlighter, lit or not, so the
                          two lit ones keep the column's left edge. */}
                      <Mark at={lifted ? q4TextAt + (code.startsWith("403") ? 8 : 0) : 1e9}>
                        <Http line={code} size={CODE_SIZE} statusInk={INK} />
                      </Mark>
                    </span>
                  </Note>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* Why it matters: a client branches on the code. */}
        <Note at={rightAt} x={X0} y={whyTop} out={leave}>
          <span style={{ ...label(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>The client's code</span>
        </Note>
        <Note at={inCodeAt} x={X0} y={whyTop + h(50)} out={leave}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22 }}>
            <Tick at={inCodeAt + 6} size={24} />
            <span style={{ fontFamily: MONO, fontSize: 22, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>
              if status == <b style={{ color: OK_INK }}>404</b>: show_not_found()
            </span>
          </div>
        </Note>
        <Note at={parseAt} x={X0} y={whyTop + h(100)} out={leave}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22 }}>
            <Cross at={parseAt + 8} size={22} />
            <span style={{ fontFamily: MONO, fontSize: 22, color: ACCENT_INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>
              <Strike at={parseAt + 10}>if "not found" in message: …</Strike>
            </span>
          </div>
        </Note>

        {/* Question 4: one request, three answers. */}
        {/* 401: no credentials. */}
        <Msg x={REQ_X} y={rowTop(0)} w={REQ_W} at={a401} lines={[{ t: "DELETE /articles/42" }, { t: "(no credentials)", color: INK_SOFT, at: noCredAt }]} />
        <Flow points={[[REQ_X + REQ_W + 8, rowTop(0) + twoH / 2], [RESP_X - 8, rowTop(0) + twoH / 2]]} at={a401 + 8} color={INK_SOFT} width={2.2} head={11} />
        <Msg
          x={RESP_X}
          y={rowTop(0)}
          w={RESP_W}
          at={a401 + 12}
          tone="bad"
          lines={[{ t: "401 Unauthorized" }, { t: "WWW-Authenticate: Bearer", at: challengeAt, mark: { at: challengeAt + 6 } }]}
        />
        <Note at={authnAt} x={RESP_X} y={rowTop(0) + twoH + h(12)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            really: <b>not authenticated</b>
          </span>
        </Note>

        {/* 403: credentials that are fine, and not enough. */}
        <Msg
          x={REQ_X}
          y={rowTop(1)}
          w={REQ_W}
          at={a403}
          lines={[{ t: "DELETE /articles/42" }, { t: "Authorization: Bearer eyJhbGciOi…", mark: { at: fineAt, color: `color-mix(in srgb, ${OK_INK} 22%, transparent)` } }]}
        />
        <Flow points={[[REQ_X + REQ_W + 8, rowTop(1) + twoH / 2], [RESP_X - 8, rowTop(1) + twoH / 2]]} at={a403 + 8} color={INK_SOFT} width={2.2} head={11} />
        <Msg x={RESP_X} y={rowTop(1)} w={RESP_W} at={refusesAt} tone="bad" lines={[{ t: "403 Forbidden" }, { t: "understood, and refused", color: INK_SOFT }]} />
        <Note at={enoughAt} x={REQ_X} y={rowTop(1) + twoH + h(12)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>valid credentials, not enough permission</span>
        </Note>
        <Note at={againAt} x={RESP_X} y={rowTop(1) + twoH + h(12)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <Strike at={againAt + 10}>log in again</Strike> <span style={{ color: INK_SOFT }}>won't necessarily help</span>
          </span>
        </Note>

        {/* 404, on purpose: the resource drawn faint. */}
        <Msg x={REQ_X} y={rowTop(2)} w={REQ_W} at={a404} lines={[{ t: "DELETE /articles/42" }, { t: "(from a stranger)", color: INK_SOFT }]} />
        <Flow points={[[REQ_X + REQ_W + 8, rowTop(2) + twoH / 2], [RESP_X - 8, rowTop(2) + twoH / 2]]} at={a404 + 8} color={INK_SOFT} width={2.2} head={11} />
        <Msg x={RESP_X} y={rowTop(2)} w={RESP_W} at={a404 + 10} tone="data" lines={[{ t: "404 Not Found" }, { t: "on purpose", at: purposeAt, color: INK_SOFT }]} />
        <Note at={strangerAt} x={1640} y={rowTop(2) + h(26)}>
          <span style={{ fontFamily: MONO, fontSize: 22, color: INK_SOFT, opacity: 0.5, whiteSpace: "nowrap" }}>article 42</span>
        </Note>
        <Note at={strangerAt + 6} x={RESP_X} y={rowTop(2) + twoH + h(12)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>hides that it exists</span>
        </Note>

        {/* Hairlines between the four classes, each with the column to its right. */}
        {[410, 803, 1289].map((x, i) => (
          <VRule key={x} x={x} top={colTop} bottom={codeTop + (Math.max(COLUMNS[i].codes.length, COLUMNS[i + 1].codes.length) - 1) * codeStep + 32} at={classAt[i + 1] - 2} out={leave} />
        ))}
        <VRule x={552} top={colTop} bottom={Math.max(codeTop + 6 * codeStep + 32, rowTop(2) + twoH + h(12) + 30)} at={a401} />
      </Drift>
    </AbsoluteFill>
  );
};
