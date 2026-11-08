import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { AUTH } from "./data";
import { Cross, Drift, Flow, Mark, Msg, msgHeight, Node, OK, OK_INK, Pill, pulse, Strike, X0, LISTING_PAPER, VRule } from "./parts";

/** The three panels of Question 7. */
const PANELS = [
  { name: "Session", asks: "Where is the login kept?", x: X0, w: 500 },
  { name: "JWT", asks: "What does it claim, and who signed it?", x: 680, w: 560 },
  { name: "OAuth", asks: "Who may act for you?", x: 1310, w: 490 },
];
/** A JWT's three parts, each in its own ink: header, payload, signature. */
const PART_INK = { header: inkOf.orange, payload: BLUE_INK, signature: inkOf.purple, dot: INK };
const TOKEN_SIZE = 20;
const TOKEN_LINE = 42;
const minutes = AUTH.lifetimeMinutes;

/** The token, broken into lines of TOKEN_LINE characters, each character
 *  inked by the part it belongs to. */
const tokenLines = () => {
  const { header, payload, signature } = AUTH.parts;
  const kinds: (keyof typeof PART_INK)[] = [];
  for (const [part, kind] of [
    [header, "header"],
    [".", "dot"],
    [payload, "payload"],
    [".", "dot"],
    [signature, "signature"],
  ] as const)
    for (let i = 0; i < part.length; i++) kinds.push(kind);
  const text = AUTH.token;
  if (text.length !== kinds.length) throw new Error("the token is its three parts and two dots");
  const lines: { text: string; kind: keyof typeof PART_INK }[][] = [];
  for (let start = 0; start < text.length; start += TOKEN_LINE) {
    const runs: { text: string; kind: keyof typeof PART_INK }[] = [];
    for (let i = start; i < Math.min(text.length, start + TOKEN_LINE); i++) {
      const last = runs[runs.length - 1];
      if (last && last.kind === kinds[i]) last.text += text[i];
      else runs.push({ text: text[i], kind: kinds[i] });
    }
    lines.push(runs);
  }
  return lines;
};

/**
 * A clock: Lucide's `clock` icon (ISC licence) on its 24-unit grid, centred
 * on (x, y) with its circle `r` across, and the second hand sweeping round
 * from `at`. The stroke is held at 3px whatever the size (Lucide's absolute
 * stroke width), so a 58px icon keeps the weight of the ink around it.
 */
const Clock: React.FC<{ x: number; y: number; at: number; r?: number; color?: string }> = ({ x, y, at, r = 24, color = INK }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  const s = r / 10; // Lucide's clock circle is r = 10 on the 24 grid
  const turn = ((frame - at) / 90) * 360;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p }}>
      <g
        transform={`translate(${x - 12 * s} ${y - 12 * s}) scale(${s})`}
        fill="none"
        stroke={color}
        strokeWidth={3 / s}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx={12} cy={12} r={10} fill={PAPER} />
        <path d="M12 6v6" />
        {/* Lucide's second hand (12,12 to 16,14), sweeping round its centre. */}
        <path d="M12 12l4 2" transform={`rotate(${turn - 116.57} 12 12)`} />
      </g>
    </svg>
  );
};

/**
 * Questions 7 and 8. Three panels: a session (the 43-character ID in a
 * cookie, meaningless without the server's store), a JWT (Node's
 * 164-character token in its three parts, the middle decoded, the role
 * changed and the signature failing) and OAuth (an app reaching a service
 * with a token, no password crossing). Then revocation: a shared session
 * store whose deleted session refuses the next request, against a JWT still
 * accepted until its expiry; services verifying a JWT on their own; and the
 * hybrid, whose 15-minute access token is the window a banned user keeps.
 */
export const AuthScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("auth").from;
  const qAt = n.word("auth", "Question seven");
  const textAt = n.word("auth", "Sessions versus JWT");
  const diffAt = n.word("auth", "They answer different questions");
  const sessAt = n.word("auth-session", "With a session");
  const storesAt = n.word("auth-session", "the server stores the login");
  const idAt = n.word("auth-session", "an opaque ID");
  const cookieAt = n.word("auth-session", "usually in a cookie");
  const charsAt = n.word("auth-session", "forty-three random characters");
  const meanAt = n.word("auth-session", "mean nothing without the server's store");
  const jwtAt = n.word("auth-jwt", "JWT, a JSON Web Token");
  const thisAt = n.word("auth-jwt", "This one is a hundred sixty-four characters");
  const decodeAt = n.word("auth-jwt", "decode the middle part");
  const userAt = n.word("auth-jwt", "there's the user");
  const roleAt = n.word("auth-jwt", "the role", { nth: 1 });
  const expAt = n.word("auth-jwt", "and the expiry");
  const sigAt = n.word("auth-jwt", "The signature proves who issued it");
  const adminAt = n.word("auth-jwt", "change the role to admin");
  const verifiesAt = n.word("auth-jwt", "it no longer verifies");
  const oauthAt = n.word("auth-oauth", "OAuth isn't a token format");
  const delegAt = n.word("auth-oauth", "a framework for delegated authorization");
  const appAt = n.word("auth-oauth", "letting one app reach your data");
  const passAt = n.word("auth-oauth", "without your password");
  const tokensAt = n.word("auth-oauth", "Its access tokens may be JWTs");
  const q8At = n.word("revoke", "Question eight");
  const q8TextAt = n.word("revoke", "When would you choose");
  const instantAt = n.word("revoke-session", "When you need instant revocation");
  const sharesAt = n.word("revoke-session", "a session store every server shares");
  const deleteAt = n.word("revoke-session", "Delete the session");
  const failsAt = n.word("revoke-session", "the next request fails");
  const locallyAt = n.word("revoke-session", "Checked locally");
  const validAt = n.word("revoke-session", "a JWT stays valid until it expires");
  const lookupAt = n.word("revoke-session", "unless every check does a lookup again");
  const fitAt = n.word("revoke-jwt", "JWTs fit many services");
  const withoutAt = n.word("revoke-jwt", "without asking a session store");
  const hybridAt = n.word("revoke-hybrid", "The common hybrid");
  const accessAt = n.word("revoke-hybrid", "a short-lived access token");
  const refreshAt = n.word("revoke-hybrid", "a longer-lived refresh token");
  const revokedAt = n.word("revoke-hybrid", "that can be revoked");
  const bannedAt = n.word("revoke-hybrid", "A banned user");
  const mostAt = n.word("revoke-hybrid", "at most those fifteen minutes");
  const end = n.beat("revoke-hybrid").to;

  // Question 7's panels leave as Question 8 arrives.
  const leave = q8At - 6;
  const headTop = y(300);
  const bodyTop = y(420);

  // ── Session ──
  const S = PANELS[0];
  const sid = AUTH.sessionId;
  const sidLines = [sid.slice(0, 22), sid.slice(22)];
  const cookieTop = bodyTop + h(34);
  const cookieH = 2 * 36 + 24;
  const storeTop = y(660);

  // ── JWT ──
  const J = PANELS[1];
  const lines = tokenLines();
  const tokenTop = bodyTop + h(34);
  const claimsTop = tokenTop + lines.length * 28 + h(80);
  const claimLine = (k: string, v: string | number) => `"${k}": ${typeof v === "string" ? `"${v}"` : v}`;

  // ── OAuth ──
  const O = PANELS[2];
  const oTop = bodyTop + h(20);
  const svcTop = y(640);

  // ── Question 8 ──
  const bTop = y(300);
  const srvTop = y(340);
  const storeB = { x: 200, y: y(470), w: 400, h: h(100) };
  const jx = 980;
  const jReqW = 500;
  const twoH = msgHeight(2, 21);
  const svcRow = y(590);
  const tl = { x0: X0 + 340, x1: 1780, top: y(790) };
  const SEG = 6;
  const segW = (tl.x1 - tl.x0) / SEG;
  const banX = tl.x0 + segW * 3.4;
  const deleted = ease(frame, deleteAt + 4, 12);

  return (
    <AbsoluteFill>
      {PANELS.map((p, i) => (
        <Sfx key={p.name} name="el-tap" at={diffAt + 2 + i * 6} level={-32} />
      ))}
      <Sfx name="el-pencil" at={cookieAt} level={-34} />
      <Sfx name="el-pencil" at={thisAt} level={-34} />
      <Sfx name="el-tap" at={decodeAt + 6} level={-30} />
      <Sfx name="el-scratch" at={adminAt + 10} level={-31} />
      <Sfx name="el-tap" at={verifiesAt + 4} level={-29} />
      <Sfx name="el-scratch" at={passAt + 8} level={-31} />
      <Sfx name="el-whoosh" at={q8At} level={-36} />
      <Sfx name="el-scratch" at={deleteAt + 6} level={-31} />
      <Sfx name="el-tap" at={failsAt + 4} level={-29} />
      <Sfx name="el-tap" at={validAt + 6} level={-30} />
      <Sfx name="el-sprinkle" at={fitAt + 4} level={-32} />
      <Sfx name="el-pencil" at={accessAt} level={-34} />
      <Sfx name="el-tap" at={revokedAt + 4} level={-30} />
      <Sfx name="el-tap" at={bannedAt + 2} level={-29} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} out={leave} size={60}>
          Sessions vs JWT vs OAuth, how do they relate?
        </QuestionCard>
        <QuestionCard n={8} at={q8At - 2} textAt={q8TextAt - 2} size={60}>
          When would you choose stateful sessions over stateless JWTs?
        </QuestionCard>

        {/* Three panels, each with the question it answers. */}
        {PANELS.map((p, i) => (
          <React.Fragment key={p.name}>
            <Note at={diffAt + i * 6} x={p.x} y={headTop} out={leave}>
              <div style={{ ...label(30, INK), fontWeight: 750, whiteSpace: "nowrap" }}>
                <Mark at={[sessAt, jwtAt, oauthAt][i]} out={[jwtAt, oauthAt, leave][i]}>
                  {p.name}
                </Mark>
              </div>
              <div style={{ ...note(22, INK_SOFT), marginTop: 6, whiteSpace: "nowrap" }}>{p.asks}</div>
            </Note>
          </React.Fragment>
        ))}

        {/* Session: an opaque ID in a cookie, and the server's store. */}
        <Note at={cookieAt} x={S.x} y={bodyTop} out={leave}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
            in a cookie:{" "}
            <span style={{ color: INK }}>
              <Mark at={charsAt}>
                <Num>{AUTH.sessionChars}</Num> random characters
              </Mark>
            </span>
          </span>
        </Note>
        <Note at={idAt} x={S.x} y={cookieTop} out={leave}>
          <div style={{ borderTop: `2px solid ${INK}`, borderBottom: `1px solid ${HAIRLINE}`, padding: "10px 16px", background: LISTING_PAPER }}>
            {sidLines.map((l, i) => (
              <div key={i} style={{ fontFamily: MONO, fontSize: 24, lineHeight: "36px", color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>
                {l}
              </div>
            ))}
          </div>
        </Note>
        <Flow points={[[S.x + 60, cookieTop + cookieH + 10], [S.x + 60, storeTop - 10]]} at={meanAt - 4} out={leave} color={BAR} head={13} />
        <Note at={meanAt} x={S.x + 90} y={cookieTop + cookieH + h(26)} out={leave}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>meaningless without the store</span>
        </Note>
        <Node x={S.x} y={storeTop} w={420} h={h(110)} at={storesAt} out={leave} tone="data" title="the server's session store" size={23}>
          <span style={{ fontFamily: MONO, fontSize: 21, color: INK, whiteSpace: "nowrap", opacity: ease(frame, meanAt + 6, 10) }}>
            {sid.slice(0, 6)}… → user 42
          </span>
        </Node>

        {/* JWT: 164 characters anyone can read, signed. */}
        <Note at={thisAt} x={J.x} y={bodyTop} out={leave}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
            <span style={{ color: INK }}><Num>{AUTH.chars}</Num> characters</span>:{" "}
            <span style={{ color: PART_INK.header }}>header</span>.<span style={{ color: PART_INK.payload }}>payload</span>.
            <span style={{ color: PART_INK.signature }}>signature</span>
          </span>
        </Note>
        {lines.map((runs, i) => (
          <Note key={i} at={thisAt + 4 + i * 4} x={J.x} y={tokenTop + i * 28} out={leave}>
            <span style={{ fontFamily: MONO, fontSize: TOKEN_SIZE, lineHeight: "28px", whiteSpace: "pre", fontVariantLigatures: "none" }}>
              {runs.map((r, k) => (
                <span key={k} style={{ color: PART_INK[r.kind], fontWeight: r.kind === "dot" ? 800 : 500, background: r.kind === "payload" ? `color-mix(in srgb, ${BAR} ${18 * ease(frame, decodeAt, 10) * (1 - ease(frame, leave, 4))}%, transparent)` : undefined }}>
                  {r.text}
                </span>
              ))}
            </span>
          </Note>
        ))}
        <Note at={decodeAt + 4} x={J.x} y={claimsTop - h(40)} out={leave}>
          <span style={{ ...label(21, BLUE_INK), whiteSpace: "nowrap" }}>the payload, decoded without the key</span>
        </Note>
        <Note at={decodeAt + 8} x={J.x} y={claimsTop} out={leave}>
          <div style={{ borderTop: `2px solid ${BAR}`, borderBottom: `1px solid ${HAIRLINE}`, padding: "8px 16px", background: LISTING_PAPER, width: 440 }}>
            {[
              { k: "sub", v: AUTH.claims.sub, at: userAt },
              { k: "role", v: AUTH.claims.role, at: roleAt },
              { k: "exp", v: AUTH.claims.exp, at: expAt },
            ].map((c) => (
              <div key={c.k} style={{ fontFamily: MONO, fontSize: 22, lineHeight: "34px", color: INK, whiteSpace: "pre", opacity: ease(frame, c.at - 4, 10) }}>
                {c.k === "role" ? (
                  <>
                    <span style={{ fontWeight: 600 }}>&quot;role&quot;</span>: <Strike at={adminAt + 10}>&quot;{AUTH.claims.role}&quot;</Strike>
                    <span style={{ color: ACCENT_INK, fontWeight: 700, opacity: ease(frame, adminAt + 16, 10) }}> &quot;admin&quot;</span>
                  </>
                ) : (
                  <Mark at={c.at + 2}>{claimLine(c.k, c.v)}</Mark>
                )}
              </div>
            ))}
          </div>
        </Note>
        <Note at={sigAt} x={J.x} y={claimsTop + h(150)} out={leave}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            the <span style={{ color: PART_INK.signature, fontWeight: 650 }}>signature</span> proves who issued it
          </span>
        </Note>
        <Note at={verifiesAt} x={J.x} y={claimsTop + h(194)} out={leave}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 23 }}>
            <Cross at={verifiesAt + 2} size={22} />
            <span style={{ ...note(23, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>role changed: it no longer verifies</span>
          </div>
        </Note>

        {/* OAuth: an app reaches your data on a service, by token. */}
        <Node x={O.x} y={oTop} w={150} h={h(70)} at={appAt} out={leave} tone="plain" title="you" size={24} />
        <Node x={O.x + 290} y={oTop} w={200} h={h(70)} at={appAt + 6} out={leave} tone="plain" title="an app" size={24} />
        <Flow points={[[O.x + 158, oTop + h(35)], [O.x + 282, oTop + h(35)]]} at={appAt + 10} out={leave} color={INK_SOFT} width={2.2} head={11} />
        <Note at={appAt + 12} x={O.x + 170} y={oTop - h(36)} out={leave}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>allow</span>
        </Note>
        <Node x={O.x} y={svcTop} w={O.w} h={h(80)} at={appAt + 10} out={leave} tone="data" title="another service, your data" size={23} />
        <Flow points={[[O.x + 390, oTop + h(78)], [O.x + 390, svcTop - 10]]} at={appAt + 16} out={leave} color={OK} width={2.6} head={13} />
        <Pill x={O.x + 410} y={(oTop + h(78) + svcTop) / 2 - 22} at={appAt + 20} out={leave} tone="ok" size={20}>
          token
        </Pill>
        <Note at={passAt} x={O.x} y={(oTop + h(78) + svcTop) / 2 - 16} out={leave}>
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>
            <Strike at={passAt + 8}>your password</Strike>
          </span>
        </Note>
        <Note at={delegAt} x={O.x} y={svcTop + h(80) + h(28)} out={leave}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <b>delegated</b> authorization, not a token format
          </span>
        </Note>
        <Note at={tokensAt} x={O.x} y={svcTop + h(80) + h(68)} out={leave}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>its tokens: JWTs or opaque strings</span>
        </Note>

        {/* Question 8, sessions: one shared store, and a deleted session. */}
        <Note at={instantAt} x={X0} y={bTop}>
          <span style={{ ...label(22, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>Sessions: revoke at once</span>
        </Note>
        {[0, 1].map((i) => (
          <React.Fragment key={i}>
            <Node x={X0 + 40 + i * 300} y={srvTop} w={220} h={h(66)} at={sharesAt + i * 5} tone="data" title={`server ${i + 1}`} size={23} />
            <Flow points={[[X0 + 150 + i * 300, srvTop + h(66) + 8], [X0 + 150 + i * 300, storeB.y - 10]]} at={sharesAt + 6 + i * 5} color={BAR} width={2.2} head={12} />
          </React.Fragment>
        ))}
        <Node x={storeB.x - 80} y={storeB.y} w={storeB.w + 120} h={storeB.h} at={sharesAt + 2} tone="data" title="one shared session store" size={23}>
          <span style={{ fontFamily: MONO, fontSize: 21, color: INK, whiteSpace: "nowrap", opacity: 1 - deleted * 0.75 }}>
            <Strike at={deleteAt + 4}>{sid.slice(0, 6)}… → user 42</Strike>
          </span>
        </Node>
        <Msg x={X0} y={storeB.y + storeB.h + h(28)} w={300} at={failsAt} lines={[{ t: "GET /articles/42" }, { t: `Cookie: session=${sid.slice(0, 4)}…`, color: INK_SOFT }]} size={21} />
        <Flow points={[[X0 + 308, storeB.y + storeB.h + h(28) + twoH / 2], [X0 + 372, storeB.y + storeB.h + h(28) + twoH / 2]]} at={failsAt + 6} color={INK_SOFT} width={2.2} head={11} />
        <Msg x={X0 + 380} y={storeB.y + storeB.h + h(28)} w={300} at={failsAt + 10} tone="ok" lines={[{ t: "401 Unauthorized" }, { t: "refused at once", color: OK_INK }]} size={21} />

        {/* JWTs: checked locally, valid until they expire. */}
        <Note at={locallyAt} x={jx} y={bTop}>
          <span style={{ ...label(22, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>A JWT, checked locally</span>
        </Note>
        <Msg x={jx} y={srvTop} w={jReqW} at={locallyAt + 2} size={21} lines={[{ t: "GET /articles/42" }, { t: "Authorization: Bearer eyJhbGciOi…" }]} />
        <Flow points={[[jx + jReqW + 8, srvTop + twoH / 2], [1560, srvTop + twoH / 2]]} at={locallyAt + 8} color={INK_SOFT} width={2.2} head={11} />
        <Msg x={1568} y={srvTop} w={220} at={validAt + 4} tone="bad" size={21} lines={[{ t: "200 OK" }, { t: "still let in", color: ACCENT_INK }]} />
        <Clock x={jx + 30} y={srvTop + twoH + h(56)} at={validAt + 8} color={ACCENT} />
        <Note at={validAt + 10} x={jx + 74} y={srvTop + twoH + h(40)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            valid until <span style={{ fontFamily: MONO, fontWeight: 600 }}>exp</span>, deleted session or not
          </span>
        </Note>
        <Note at={lookupAt} x={jx + 74} y={srvTop + twoH + h(80)}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>unless every check looks it up again</span>
        </Note>
        {["orders", "search", "billing"].map((s, i) => (
          <React.Fragment key={s}>
            <Node x={jx + i * 280} y={svcRow} w={240} h={h(70)} at={fitAt + 2 + i * 4} tone="data" title={s} size={23} />
            <div style={{ position: "absolute", left: jx + i * 280 + 200, top: svcRow - 12, opacity: frame >= fitAt + 10 + i * 4 ? 1 : 0 }}>
              <Tick at={fitAt + 10 + i * 4} size={26} />
            </div>
          </React.Fragment>
        ))}
        <Note at={withoutAt} x={jx} y={svcRow + h(80)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            each verifies the signature itself, <b style={{ color: OK_INK }}>no session store</b>
          </span>
        </Note>

        {/* The hybrid: short access tokens, a revocable refresh token. */}
        <Note at={hybridAt} x={X0} y={tl.top - h(46)}>
          <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>The common hybrid</span>
        </Note>
        <Note at={accessAt} x={X0} y={tl.top}>
          <span style={{ ...note(22, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            access token, <Num>{minutes}</Num> min
          </span>
        </Note>
        <Note at={refreshAt} x={X0} y={tl.top + h(50)}>
          <span style={{ ...note(22, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>refresh token</span>
        </Note>
        {Array.from({ length: SEG }, (_, i) => {
          const x = tl.x0 + i * segW;
          const after = x > banX;
          const p = ease(frame, accessAt + 4 + i * 3, 10);
          const goneAfter = after ? ease(frame, bannedAt + 8, 10) : 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x + 3,
                top: tl.top + 4,
                width: segW - 6,
                height: 26,
                borderRadius: 5,
                background: BAR,
                opacity: p * (1 - goneAfter * 0.85),
              }}
            />
          );
        })}
        {/* The window a banned user keeps: the rest of the access token. */}
        <div
          style={{
            position: "absolute",
            left: banX,
            top: tl.top + 4,
            width: (tl.x0 + Math.ceil((banX - tl.x0) / segW) * segW - 3 - banX) * ease(frame, bannedAt + 6, 12),
            height: 26,
            borderRadius: "0 5px 5px 0",
            background: ACCENT,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: tl.x0 + 3,
            top: tl.top + h(50) + 4,
            width: (banX - tl.x0 - 3 + (tl.x1 - banX) * (1 - ease(frame, revokedAt + 8, 1) * ease(frame, bannedAt + 8, 12))) * ease(frame, refreshAt + 4, 22),
            height: 26,
            borderRadius: 5,
            background: OK,
          }}
        />
        <Note at={revokedAt} x={banX + 14} y={tl.top + h(50) + 1}>
          <span style={{ ...note(21, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <span style={{ opacity: 1 - ease(frame, bannedAt + 8, 6) }}>can be revoked</span>
          </span>
        </Note>
        <Note at={bannedAt + 8} x={banX + 14} y={tl.top + h(50) + 1}>
          <span style={{ ...note(21, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>revoked</span>
        </Note>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, bannedAt, 8) }}>
          <line x1={banX} y1={tl.top - 10} x2={banX} y2={tl.top + h(50) + 40} stroke={ACCENT} strokeWidth={2.6} strokeDasharray="6 5" />
        </svg>
        <Note at={bannedAt} x={banX - 14} y={tl.top - h(42)} align="right">
          <span style={{ ...label(21, ACCENT_INK), whiteSpace: "nowrap" }}>banned</span>
        </Note>
        <Note at={mostAt} x={banX + 14} y={tl.top - h(42)}>
          <span style={{ ...label(21, ACCENT_INK), whiteSpace: "nowrap", boxShadow: `0 0 0 ${2 * pulse(frame, mostAt + 8, 20)}px ${PAPER}` }}>
            keeps access at most <Num>{minutes}</Num> min
          </span>
        </Note>
        <div style={{ position: "absolute", left: tl.x0, top: tl.top + h(50) + 40, width: tl.x1 - tl.x0, height: 1, background: HAIRLINE, opacity: ease(frame, refreshAt, 10) }} />

        {/* Hairlines between the panels, and between Question 8's two sides. */}
        {[610, 1247].map((x, i) => (
          <VRule key={x} x={x} top={headTop} bottom={claimsTop + h(194) + 30} at={diffAt + (i + 1) * 6} out={leave} />
        ))}
        <VRule x={890} top={bTop} bottom={Math.max(storeB.y + storeB.h + h(28) + twoH, svcRow + h(80) + 30)} at={locallyAt} />
      </Drift>
    </AbsoluteFill>
  );
};
