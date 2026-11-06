import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { NextLine, Note, Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { GZIP, thousands } from "./data";
import { artBox, Cross, Drift, Flow, Headline, Http, Kicker, Mark, METHOD_INK, Msg, msgHeight, OK, OK_INK, Spot, Strike, X0 } from "./parts";

const R_X = 800;
const LIST_TOP = 380;
const ROW = 66;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

// ── 11. Naming ──────────────────────────────────────────────────────────────

const Naming: React.FC<{ c: Ctx }> = ({ c }) => {
  const pluralAt = c.w("r-naming", "plural nouns for collections");
  const membersAt = c.w("r-naming", "IDs for members");
  const beneathAt = c.w("r-naming", "its comments beneath it");
  const noVerbsAt = c.w("r-naming", "No verbs in paths");
  const actionAt = c.w("r-naming", "An action like publish");
  const patchAt = c.w("r-naming", "patch the status to published");
  const top = c.y(340);
  const paths = [
    { p: "/articles", what: "a collection", at: pluralAt },
    { p: "/articles/42", what: "a member", at: membersAt },
    { p: "/articles/42/comments", what: "its comments", at: beneathAt },
  ];
  return (
    <>
      {paths.map((p, i) => (
        <React.Fragment key={p.p}>
          <Note at={p.at} x={R_X} y={top + i * c.h(50)}>
            <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>{p.p}</span>
          </Note>
          <Note at={p.at + 6} x={R_X + 440} y={top + i * c.h(50) + 3}>
            <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>{p.what}</span>
          </Note>
        </React.Fragment>
      ))}
      <Note at={noVerbsAt} x={R_X} y={top + c.h(166)}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28 }}>
          <Cross at={noVerbsAt + 6} size={24} />
          <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, color: ACCENT_INK, whiteSpace: "nowrap" }}>
            <Strike at={noVerbsAt + 8}>/publishArticle/42</Strike>
          </span>
        </div>
      </Note>
      <Note at={noVerbsAt + 12} x={R_X + 38} y={top + c.h(210)}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>no verbs in paths: the method is the verb</span>
      </Note>
      <Note at={actionAt} x={R_X} y={top + c.h(266)}>
        <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>An action becomes a state change</span>
      </Note>
      <Msg x={R_X} y={top + c.h(310)} w={460} at={patchAt} tone="ok" lines={[{ t: "PATCH /articles/42" }, { t: '{"status": "published"}' }]} />
    </>
  );
};

// ── 12. A blog's resource API ───────────────────────────────────────────────

const BLOG: [string, string, string][] = [
  ["GET", "/articles", "list (paginated, filterable)"],
  ["POST", "/articles", "create"],
  ["GET", "/articles/42", "read one"],
  ["PATCH", "/articles/42", "partial update"],
  ["DELETE", "/articles/42", "delete"],
  ["GET", "/articles/42/comments", "sub-collection"],
  ["POST", "/articles/42/comments", "add a comment"],
];
const TABLE_SIZE = 22;

const Blog: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const collAt = c.w("r-blog", "two collections");
  const onArticlesAt = c.w("r-blog", "GET and POST on articles");
  const oneAt = c.w("r-blog", "GET, PATCH and DELETE on one article");
  const commentsAt = c.w("r-blog", "GET and POST on its comments");
  const filtersAt = c.w("r-blog", "Filters go in the query string");
  const createAt = c.w("r-blog", "a create answers two oh one");
  const locationAt = c.w("r-blog", "a Location header");
  const top = c.y(340);
  const rowH = c.h(40);
  const rowAt = (i: number) => (i < 2 ? onArticlesAt + i * 5 : i < 5 ? oneAt + (i - 2) * 5 : commentsAt + (i - 5) * 5);
  const cols = [R_X, R_X + 140, R_X + 480];
  return (
    <>
      <div style={{ position: "absolute", left: R_X, top: top - 4, width: 900, height: 2, background: INK, opacity: ease(frame, collAt, 10) }} />
      {BLOG.map(([m, p, what], i) => (
        <Note key={i} at={rowAt(i)} x={R_X} y={top + 6 + i * rowH}>
          <div style={{ position: "relative", width: 900, height: rowH, fontSize: TABLE_SIZE }}>
            <span style={{ position: "absolute", left: cols[0] - R_X, fontFamily: MONO, fontSize: TABLE_SIZE, fontWeight: 700, color: METHOD_INK }}>{m}</span>
            <span style={{ position: "absolute", left: cols[1] - R_X, fontFamily: MONO, fontSize: TABLE_SIZE, color: INK, whiteSpace: "pre" }}>{p}</span>
            <span style={{ position: "absolute", left: cols[2] - R_X, ...note(TABLE_SIZE, INK_SOFT), whiteSpace: "nowrap" }}>{what}</span>
          </div>
        </Note>
      ))}
      <div style={{ position: "absolute", left: R_X, top: top + 10 + BLOG.length * rowH, width: 900, height: 1, background: HAIRLINE, opacity: ease(frame, commentsAt, 10) }} />
      <Note at={filtersAt} x={R_X} y={top + 30 + BLOG.length * rowH}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
          filters: <span style={{ fontFamily: MONO, fontWeight: 600 }}>/articles?status=published&amp;sort=-created_at</span>
        </span>
      </Note>
      <Msg
        x={R_X}
        y={top + c.h(400)}
        w={420}
        at={createAt}
        tone="ok"
        lines={[{ t: "201 Created" }, { t: "Location: /articles/43", at: locationAt, mark: { at: locationAt + 6 } }]}
      />
    </>
  );
};

// ── 13. Versioning ──────────────────────────────────────────────────────────

const Version: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const protectAt = c.w("r-version", "protect clients from breaking changes");
  const removingAt = c.w("r-version", "removing a field");
  const typeAt = c.w("r-version", "changing its type");
  const pathAt = c.w("r-version", "A version in the path");
  const defaultAt = c.w("r-version", "the pragmatic default");
  const addingAt = c.w("r-version", "Adding an optional field");
  const top = c.y(340);
  const body = c.y(470);
  const fields = [
    { t: '"id": 7,', at: protectAt },
    { t: '"total": 4200,', at: protectAt + 4, strike: removingAt + 6 },
    { t: '"currency": "usd",', at: protectAt + 8 },
    { t: '"status": "paid",', at: protectAt + 12, swap: typeAt + 6 },
  ];
  return (
    <>
      <Note at={pathAt} x={R_X} y={top}>
        <span style={{ fontFamily: MONO, fontSize: 40, fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>
          <span style={{ color: METHOD_INK }}>GET</span> /<Mark at={pathAt + 6}>v1</Mark>/orders
        </span>
      </Note>
      <Note at={defaultAt} x={R_X + 480} y={top + 12}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>the most visible, the default</span>
      </Note>
      <Note at={protectAt} x={R_X} y={body - c.h(44)}>
        <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>An order, as v1 clients read it</span>
      </Note>
      <Note at={protectAt} x={R_X} y={body}>
        <div style={{ borderLeft: `4px solid ${BAR}`, paddingLeft: 18, fontFamily: MONO, fontSize: 24, lineHeight: "38px" }}>
          <div style={{ color: INK_SOFT }}>{"{"}</div>
          {fields.map((f) => (
            <div key={f.t} style={{ paddingLeft: 28, whiteSpace: "pre", opacity: ease(frame, f.at, 8), display: "flex", gap: 16, alignItems: "baseline" }}>
              {f.strike !== undefined ? (
                <span style={{ color: ACCENT_INK }}>
                  <Strike at={f.strike}>{f.t}</Strike>
                </span>
              ) : f.swap !== undefined ? (
                <span>
                  <Http line={frame >= f.swap ? '"status": 2,' : f.t} size={24} />
                </span>
              ) : (
                <Http line={f.t} size={24} />
              )}
              {f.strike !== undefined ? <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, opacity: ease(frame, f.strike + 6, 8) }}>removed: breaks clients</span> : null}
              {f.swap !== undefined ? <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, opacity: ease(frame, f.swap + 6, 8) }}>type changed: breaks clients</span> : null}
            </div>
          ))}
          <div style={{ paddingLeft: 28, whiteSpace: "pre", opacity: ease(frame, addingAt, 10), display: "flex", gap: 16, alignItems: "baseline" }}>
            <span style={{ color: OK_INK }}>&quot;note&quot;: null</span>
            <span style={{ ...note(22, OK_INK), fontWeight: 650 }}>optional, added: still v1</span>
          </div>
          <div style={{ color: INK_SOFT }}>{"}"}</div>
        </div>
      </Note>
    </>
  );
};

// ── 14. Errors ──────────────────────────────────────────────────────────────

const ERROR_BODY = [
  "422 Unprocessable Entity",
  "{",
  '  "error": {',
  '    "code": "validation_failed",',
  '    "message": "Email is invalid.",',
  '    "fields": { "email": "must be a valid address" }',
  "  }",
  "}",
];

const Errors: React.FC<{ c: Ctx }> = ({ c }) => {
  const statusAt = c.w("r-errors", "the right status code");
  const bodyAt = c.w("r-errors", "a consistent body");
  const codeAt = c.w("r-errors", "a stable code a client can branch on");
  const messageAt = c.w("r-errors", "a message for a person");
  const fieldsAt = c.w("r-errors", "details per field");
  const traceAt = c.w("r-errors", "Never a stack trace");
  const top = c.y(340);
  const markOf = (l: string) => (l.includes('"code"') ? codeAt : l.includes('"message"') ? messageAt : l.includes('"fields"') ? fieldsAt : l.startsWith("422") ? statusAt + 4 : undefined);
  return (
    <>
      <Msg
        x={R_X}
        y={top}
        w={760}
        at={statusAt}
        tone="bad"
        size={22}
        lines={ERROR_BODY.map((t, i) => ({ t, at: i === 0 ? statusAt + 2 : bodyAt + i * 3, mark: markOf(t) === undefined ? undefined : { at: markOf(t)! + 2 } }))}
      />
      <Note at={traceAt} x={R_X} y={top + msgHeight(ERROR_BODY.length, 22) + c.h(30)}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24 }}>
          <Cross at={traceAt + 4} size={24} />
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Strike at={traceAt + 8}>a stack trace</Strike>
          </span>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>never in the body</span>
        </div>
      </Note>
    </>
  );
};

// ── 15. HATEOAS ─────────────────────────────────────────────────────────────

const HATEOAS_BODY = ["{", '  "id": 42,', '  "title": "Designing APIs",', '  "links": {', '    "comments": "/articles/42/comments",', '    "next": "/articles?after=eyJpZCI6NDJ9"', "  }", "}"];

const Hateoas: React.FC<{ c: Ctx }> = ({ c }) => {
  const meansAt = c.w("r-hateoas", "means responses carry links");
  const nextAt = c.w("r-hateoas", "what the client can do next");
  const requiresAt = c.w("r-hateoas", "REST as first defined requires it");
  const skipAt = c.w("r-hateoas", "in practice most APIs skip it");
  const commonAt = c.w("r-hateoas", "a link to the next page is common");
  const top = c.y(340);
  const linkAt = (l: string) => (l.includes('"comments"') ? nextAt : l.includes('"next"') ? commonAt : undefined);
  return (
    <>
      <Msg
        x={R_X}
        y={top}
        w={640}
        at={meansAt}
        tone="data"
        size={22}
        lines={HATEOAS_BODY.map((t, i) => ({ t, at: meansAt + 4 + i * 3, mark: linkAt(t) === undefined ? undefined : { at: linkAt(t)! + 4 } }))}
      />
      <Note at={requiresAt} x={R_X} y={top + msgHeight(HATEOAS_BODY.length, 22) + c.h(30)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          REST as Fielding defined it: <b>required</b>
        </span>
      </Note>
      <Note at={skipAt} x={R_X} y={top + msgHeight(HATEOAS_BODY.length, 22) + c.h(72)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          in practice: <b>often skipped</b>; a <span style={{ fontFamily: MONO, fontWeight: 600 }}>next</span> link is common
        </span>
      </Note>
    </>
  );
};

// ── 16. Content negotiation ─────────────────────────────────────────────────

const Content: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const oneUrlAt = c.w("r-content", "lets one URL serve several representations");
  const acceptAt = c.w("r-content", "Accept says what the client can take");
  const typeAt = c.w("r-content", "and Content-Type what it got");
  const encodingAt = c.w("r-content", "Encoding works the same way");
  const gzipAt = c.w("r-content", "ask for gzip");
  const sixthAt = c.w("r-content", "about a sixth of its size");
  const top = c.y(340);
  const twoH = msgHeight(3, 21);
  const respX = R_X + 540;
  const barTop = c.y(620);
  const BAR_W = 760;
  const fullW = BAR_W;
  const zipW = BAR_W * GZIP.fraction;
  return (
    <>
      <Msg
        x={R_X}
        y={top}
        w={480}
        at={oneUrlAt}
        size={21}
        lines={[
          { t: "GET /articles?limit=20" },
          { t: "Accept: application/json", at: acceptAt, mark: { at: acceptAt + 4 } },
          { t: "Accept-Encoding: gzip", at: gzipAt, mark: { at: gzipAt + 4 } },
        ]}
      />
      <Flow points={[[R_X + 488, top + twoH / 2], [respX - 8, top + twoH / 2]]} at={typeAt - 6} color={INK_SOFT} width={2.2} head={11} />
      <Msg
        x={respX}
        y={top}
        w={420}
        at={typeAt}
        tone="data"
        size={21}
        lines={[
          { t: "200 OK" },
          { t: "Content-Type: application/json", at: typeAt + 4, mark: { at: typeAt + 8 } },
          { t: "Content-Encoding: gzip", at: gzipAt + 10, mark: { at: gzipAt + 14 } },
        ]}
      />
      <Note at={encodingAt} x={R_X} y={barTop - c.h(48)}>
        <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>This page of 20 articles, as JSON</span>
      </Note>
      <div style={{ position: "absolute", left: R_X, top: barTop, width: fullW * ease(frame, encodingAt + 4, 18), height: 30, background: BAR, borderRadius: 4 }} />
      <Note at={encodingAt + 14} x={R_X} y={barTop + 40}>
        <span style={{ ...note(23, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          <Num>{thousands(GZIP.bytes)}</Num> bytes
        </span>
      </Note>
      <div style={{ position: "absolute", left: R_X, top: barTop + c.h(100), width: zipW * ease(frame, gzipAt + 16, 14), height: 30, background: OK, borderRadius: 4 }} />
      <Note at={gzipAt + 22} x={R_X + zipW + 16} y={barTop + c.h(100) + 2}>
        <span style={{ ...note(23, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
          <Num>{thousands(GZIP.gzipped)}</Num> bytes gzipped
          <span style={{ opacity: ease(frame, sixthAt, 10) }}>: about a sixth</span>
        </span>
      </Note>
    </>
  );
};

/**
 * The quick round: six questions down the left, each answer on the right
 * while it is read, then the bridge into databases with the puffin back on
 * the page.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const moreAt = n.word("rapid-in", "Six more");
  const eachAt = n.word("rapid-in", "a sentence or two each");
  const end = n.beat("next").from - 4;
  const behindAt = n.word("next", "Behind every one of these endpoints");
  const liveAt = n.word("next", "the data has to live somewhere");
  const nextAt = n.word("next", "Next:");

  const items: RapidItem[] = [
    { n: 11, label: "Naming resources", at: n.word("r-naming", "Name resources"), body: <Naming c={c} /> },
    { n: 12, label: "A blog's resource API", at: n.word("r-blog", "So the blog"), body: <Blog c={c} /> },
    { n: 13, label: "Versioning", at: n.word("r-version", "Version an API"), body: <Version c={c} /> },
    { n: 14, label: "Errors", at: n.word("r-errors", "Errors get the right status code"), body: <Errors c={c} /> },
    { n: 15, label: "HATEOAS", at: n.word("r-hateoas", "HATEOAS, hypermedia"), body: <Hateoas c={c} /> },
    { n: 16, label: "Content negotiation", at: n.word("r-content", "Content negotiation"), body: <Content c={c} /> },
  ];
  const puffin = artBox("puffin", 330);

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={moreAt} level={-32} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-32} />
      ))}
      <Sfx name="el-pop" at={behindAt + 4} level={-30} />
      <Sfx name="el-pencil" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40}>
        <Kicker at={moreAt}>Quick round</Kicker>
        <Headline lead="Six more." turn="A sentence or two each." at={moreAt} turnAt={eachAt - 2} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={560} at={moreAt + 6} end={end} />

        {/* The bridge: every endpoint has data behind it. */}
        <Spot id="puffin" at={behindAt + 4} left={1430} top={y(360)} {...puffin} />
        <Note at={behindAt} x={R_X} y={y(430)}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>Behind every endpoint,</span>
        </Note>
        <Note at={liveAt} x={R_X} y={y(430) + h(46)}>
          <span style={{ ...note(30, INK), whiteSpace: "nowrap" }}>
            the data has to <b style={{ color: BLUE_INK }}>live somewhere</b>.
          </span>
        </Note>
        <NextLine at={nextAt} x={R_X} y={y(640)} width={500}>
          databases
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
