import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, OK, OK_INK, TextPanel, X0 } from "./parts";

const TOP = 340;
const PITCH = 66;
const INSTEAD_X = 1000;
const COL_W = 540;

/** A cross, drawn on `at`, in the trap's red. */
const Cross: React.FC<{ at: number; size?: number }> = ({ at, size = 24 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible" }}>
      <path d="M5 5 L19 19 M19 5 L5 19" fill="none" stroke={ACCENT} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
    </svg>
  );
};

/** One line of a list, with its mark before it. */
const Item: React.FC<{ x: number; y: number; at: number; mark: React.ReactNode; out?: number; children: React.ReactNode }> = ({ x, y, at, mark, out, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at - 2, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 14, opacity: p * (1 - o), transform: `translateX(${(1 - p) * -12}px)` }}>
      {mark}
      <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>{children}</span>
    </div>
  );
};

/**
 * Questions 5 and 6. What never goes into an AI tool, each kind crossed out
 * as it is named, and what to share instead: the schema and a few made-up
 * rows (the video's own example, after the page's customers table of names,
 * emails and addresses). Then the take-home walkthrough: what it was used
 * for, what it wasn't, how it was checked.
 */
export const PrivacyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("privacy").from;
  const qAt = n.word("privacy", "Question");
  const textAt = n.word("privacy", "What data should never");
  const approvedAt = n.word("privacy-never", "hasn't approved");
  // Each question's first line arrives as the question ends, so neither sits alone.
  const asked5 = n.beat("privacy").to;
  const asked6 = n.beat("takehome").to;
  const never = [
    { at: n.word("privacy-never", "customer personal data"), text: "customer personal data" },
    { at: n.word("privacy-never", "credentials"), text: "credentials" },
    { at: n.word("privacy-never", "confidential financials"), text: "confidential financials" },
    { at: n.word("privacy-never", "under a contract or a regulation"), text: "anything under a contract or a regulation" },
  ];
  const healthAt = n.word("privacy-never", "health or payments");
  const rowsAt0 = n.word("privacy-instead", "don't need real rows");
  const schemaAt = n.word("privacy-instead", "Share the schema");
  const madeUpAt = n.word("privacy-instead", "a few made-up ones");
  const breachAt = n.word("privacy-instead", "a reportable data breach");
  const q6At = n.word("takehome", "Question six");
  const q6TextAt = n.word("takehome", "Walk me through");
  const ownAt = n.word("takehome-answer", "own the result");
  const used = [
    n.word("takehome-answer", "boilerplate SQL"),
    n.word("takehome-answer", "a regular expression"),
    n.word("takehome-answer", "chart code"),
  ];
  const didntAt = n.word("takehome-answer", "Say what you didn't");
  const defsAt = n.word("takehome-answer", "the metric definitions");
  const conclusionsAt = n.word("takehome-answer", "the conclusions");
  const checkedAt = n.word("takehome-answer", "how you checked it");
  const hidingAt = n.word("takehome-hide", "Hiding it");
  const openlyAt = n.word("takehome-hide", "using it openly");
  const end = n.beat("takehome-hide").to;
  const out5 = q6At - 4;

  const top = y(TOP);
  const pitch = h(PITCH);
  const schema = [
    "customers(customer_id, name, email, address)",
    "(1, 'Test User', 'test@example.com', '1 Example St')",
    "(2, 'Sample Two', 'two@example.com', '2 Example St')",
  ];
  const cols = [
    { x: X0, at: used[0] - 6, head: "used it for", items: [{ at: used[0], text: "boilerplate SQL" }, { at: used[1], text: "a regular expression" }, { at: used[2], text: "chart code" }], ok: true },
    { x: X0 + COL_W + 50, at: didntAt - 2, head: "didn't", items: [{ at: defsAt, text: "the metric definitions" }, { at: conclusionsAt, text: "the conclusions" }], ok: false },
    { x: X0 + 2 * (COL_W + 50), at: checkedAt - 2, head: "how you checked it", items: [{ at: checkedAt + 6, text: "the checks from question 2" }], ok: true },
  ];

  return (
    <AbsoluteFill>
      {never.map((v) => (
        <Sfx key={v.text} name="el-scratch" at={v.at + 4} level={-36} />
      ))}
      <Sfx name="el-pop" at={schemaAt + 4} level={-32} />
      <Sfx name="el-pencil" at={ownAt} level={-34} />
      <Sfx name="el-pop" at={openlyAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} out={out5} size={60}>
          What data should never go into an AI tool?
        </QuestionCard>
        <QuestionCard n={6} at={q6At} textAt={q6TextAt - 2} size={60}>
          &ldquo;Walk me through how you used AI on this take-home.&rdquo;
        </QuestionCard>

        {/* ── Question 5: never, and instead ── */}
        <Note at={Math.min(approvedAt, asked5) - 6} x={X0} y={top - h(54)} out={out5}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>anything your company hasn&apos;t approved for that tool:</span>
        </Note>
        {never.map((v, i) => (
          <Item key={v.text} x={X0} y={top + i * pitch} at={v.at} out={out5} mark={<Cross at={v.at + 4} />}>
            {v.text}
            {i === never.length - 1 ? <span style={{ color: INK_SOFT, opacity: ease(frame, healthAt - 2, 10) }}> (health, payments)</span> : null}
          </Item>
        ))}
        <Note at={rowsAt0 - 2} x={INSTEAD_X} y={top - h(54)} out={out5}>
          <span style={{ ...label(22, OK_INK), whiteSpace: "nowrap" }}>Instead: the schema, and a few made-up rows</span>
        </Note>
        <TextPanel lines={schema} x={INSTEAD_X} top={top} width={820} size={20} mono at={schemaAt - 4} lineAt={[schemaAt, madeUpAt, madeUpAt + 6]} out={out5} />
        <Note at={madeUpAt + 8} x={INSTEAD_X} y={top + h(160)} out={out5}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>made up for this video: no real customer in it</span>
        </Note>
        <Note at={breachAt - 2} x={X0} y={top + 4 * pitch + h(40)} out={out5}>
          <span style={{ ...note(28, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>one careless paste can be a reportable data breach</span>
        </Note>

        {/* ── Question 6: what for, what not, how checked ── */}
        <Note at={Math.min(ownAt, asked6) - 6} x={X0} y={top - h(54)}>
          <span style={{ ...note(26, INK), fontWeight: 650, whiteSpace: "nowrap" }}>Be specific, and own the result:</span>
        </Note>
        {cols.map((c) => (
          <React.Fragment key={c.head}>
            <div style={{ position: "absolute", left: c.x, top, ...label(22, c.ok ? BLUE_INK : ACCENT_INK), opacity: ease(frame, c.at, 12), whiteSpace: "nowrap" }}>{c.head}</div>
            {c.items.map((it, k) => (
              <Item key={it.text} x={c.x} y={top + h(46) + k * pitch} at={it.at} mark={c.ok ? <Tick at={it.at + 4} size={24} /> : <Cross at={it.at + 4} />}>
                {it.text}
              </Item>
            ))}
          </React.Fragment>
        ))}
        <div
          style={{
            position: "absolute",
            left: X0,
            top: top + h(300),
            display: "flex",
            gap: 40,
            opacity: ease(frame, hidingAt - 2, 12),
          }}
        >
          <div style={{ padding: "14px 22px", borderLeft: `4px solid ${ACCENT}`, background: `color-mix(in srgb, ${ACCENT} 8%, ${PAPER})`, ...note(26, INK), whiteSpace: "nowrap" }}>
            hid it, then couldn&apos;t explain a line
          </div>
          <div
            style={{
              padding: "14px 22px",
              borderLeft: `4px solid ${OK}`,
              background: `color-mix(in srgb, ${OK} 10%, ${PAPER})`,
              ...note(26, INK),
              whiteSpace: "nowrap",
              opacity: ease(frame, openlyAt - 2, 12),
            }}
          >
            used it openly, and checked it
          </div>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
