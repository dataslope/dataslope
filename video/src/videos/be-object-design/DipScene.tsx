import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, BLUE_INK, INK, INK_SOFT, label } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FAKE_SENT } from "./data";
import { ArtSpot, Box, Drift, Flow, lerp, Line, Mark2, OK, OK_INK, pulse, X0 } from "./parts";

const CONF = { x: X0, w: 400, top: 420, h: 110 };
const SOCKET = { w: 116, h: 76 };
const PLUG = { w: 260, h: 68 };
const HOME_X = 930;
const SWING = 110;

/** "['Order 1042 confirmed']" → "Order 1042 confirmed". */
const sent = FAKE_SENT.replace(/^\['|'\]$/g, "");
if (sent === FAKE_SENT) throw new Error(`unexpected fake record ${FAKE_SENT}`);

/**
 * Question 5. The order confirmation with a socket on its side: something
 * that can send a message. The email sender plugs in for production; a fake
 * that only records plugs in for the test and holds the one message the run
 * recorded. The lamp and its plug; then the arrows, before and after: the
 * confirmation stops pointing at the emailer, and the emailer fits the shape
 * the confirmation owns.
 */
export const DipScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("dip").from;
  const qAt = n.word("dip", "Question five");
  const textAt = n.word("dip", "What is the dependency inversion principle");
  const highAt = n.word("dip", "High-level code depends on an abstraction");
  const abstractionAt = n.word("dip", "an abstraction");
  const passedAt = n.word("dip", "the concrete implementation is passed in");
  const confAt = n.word("dip-ex", "The order confirmation needs");
  const sendAt = n.word("dip-ex", "something that can send a message");
  const allAt = n.word("dip-ex", "that's all it knows");
  const prodAt = n.word("dip-ex", "In production");
  const emailAt = n.word("dip-ex", "the email sender");
  const testAt = n.word("dip-ex", "A test hands it a fake");
  const recordsAt = n.word("dip-ex", "only records what it was asked to send");
  const checksAt = n.word("dip-ex", "checks the message with no mail server");
  const lampAt = n.word("dip-plug", "a lamp with a plug");
  const socketAt = n.word("dip-plug", "The socket is the abstraction");
  const fitsAt = n.word("dip-plug", "anything that fits it works");
  const inversionAt = n.word("dip-arrows", "The inversion is in the arrows");
  const noLongerAt = n.word("dip-arrows", "The confirmation no longer points at the emailer");
  const shapeAt = n.word("dip-arrows", "the emailer fits the shape");
  const askedAt = n.word("dip-arrows", "the confirmation asked for");
  const policyAt = n.word("dip-arrows", "Policy stops depending on detail");
  const end = n.beat("dip-arrows").to;

  const top = y(CONF.top);
  const mid = top + CONF.h / 2;
  const socketX = CONF.x + CONF.w + 8;
  const dockX = socketX + SOCKET.w + 8;
  // The email sender docks, then leaves; the fake docks after it.
  const emailIn = ease(frame, emailAt + 2, 14) * (1 - ease(frame, testAt + 4, 14));
  const fakeIn = ease(frame, testAt + 10, 14);
  const emailY = lerp(mid - SWING - PLUG.h / 2, mid - PLUG.h / 2, emailIn);
  const fakeY = lerp(mid + SWING - PLUG.h / 2, mid - PLUG.h / 2, fakeIn);
  const socketLit = pulse(frame, socketAt + 4, 30) + pulse(frame, fitsAt, 24);

  // Before and after.
  const rowTop = y(744);
  const rowH = 60;
  const rowMid = rowTop + rowH / 2;
  const B = { conf: { x: X0, w: 250 }, email: { x: 520, w: 200 } };
  const A = { conf: { x: 930, w: 250 }, shape: { x: 1250, w: 230 }, email: { x: 1600, w: 200 } };

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={confAt} level={-32} />
      <Sfx name="el-tap" at={emailAt + 14} level={-30} />
      <Sfx name="el-whoosh" at={testAt + 4} level={-36} />
      <Sfx name="el-tap" at={testAt + 22} level={-30} />
      <Sfx name="el-pencil" at={recordsAt + 6} level={-35} />
      <Sfx name="el-pop" at={lampAt} level={-30} />
      <Sfx name="el-pencil" at={noLongerAt} level={-35} />
      <Sfx name="el-scratch" at={noLongerAt + 12} level={-32} />
      <Sfx name="el-chime" at={policyAt + 8} level={-33} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={56}>
          What is the Dependency Inversion Principle, with an example?
        </QuestionCard>
        <Line x={X0} y={y(270)} at={highAt} size={26}>
          High-level code depends on an abstraction
          <span style={{ opacity: ease(frame, passedAt, 10) }}>, and the concrete implementation is passed in.</span>
        </Line>

        {/* The confirmation and its socket. */}
        <Box
          x={CONF.x}
          y={top}
          w={CONF.w}
          h={CONF.h}
          at={highAt + 4}
          title="Order confirmation"
          sub={frame < allAt ? "the high-level code" : "knows only what it plugs into"}
          lit={pulse(frame, confAt, 20)}
        />
        <Box
          x={socketX}
          y={mid - SOCKET.h / 2}
          w={SOCKET.w}
          h={SOCKET.h}
          at={abstractionAt + 4}
          tone="ok"
          dashed
          lit={socketLit + pulse(frame, sendAt, 20)}
          radius={8}
        >
          <span style={{ ...label(20, OK_INK), fontWeight: 700, textAlign: "center", lineHeight: 1.15 }}>
            sends a
            <br />
            message
          </span>
        </Box>
        <Line x={dockX} y={mid - PLUG.h / 2 - 40} at={prodAt} size={21} color={INK_SOFT} weight={650} out={testAt + 2}>
          in production
        </Line>
        <Line x={dockX} y={mid - PLUG.h / 2 - 40} at={testAt + 8} size={21} color={INK_SOFT} weight={650}>
          in a test
        </Line>
        <Box x={lerp(HOME_X, dockX, emailIn)} y={emailY} w={PLUG.w} h={PLUG.h} at={passedAt + 4} title="Email sender" sub={frame < emailAt ? "the concrete piece" : undefined} subSize={20} tone="data" dim={testAt + 6} />
        <Box x={lerp(HOME_X, dockX, fakeIn)} y={fakeY} w={PLUG.w} h={PLUG.h} at={testAt + 2} title="Recording fake" tone="data" />

        {/* What the fake recorded. */}
        <Line x={CONF.x} y={top + CONF.h + 36} at={recordsAt + 4} size={21} color={INK_SOFT} weight={650}>
          the fake recorded one message
        </Line>
        <Line x={CONF.x} y={top + CONF.h + 70} at={recordsAt + 10} size={26} color={BLUE_INK} weight={700}>
          “{sent}”
        </Line>
        <div style={{ position: "absolute", left: CONF.x + 590, top: top + CONF.h + 66, width: 32, height: 32 }}>
          <Mark2 at={checksAt} kind="tick" size={32} />
        </div>
        <Line x={CONF.x + 636} y={top + CONF.h + 68} at={checksAt + 2} size={23} color={OK_INK} weight={650}>
          checked, no mail server
        </Line>

        <ArtSpot id="plug" at={lampAt} left={1360} top={y(380)} h={190} />

        {/* The arrows, before and after. */}
        <Line x={B.conf.x} y={rowTop - 48} at={inversionAt} size={21} color={INK_SOFT} weight={700}>
          before
        </Line>
        <Box x={B.conf.x} y={rowTop} w={B.conf.w} h={rowH} at={inversionAt} title="Confirmation" size={23} tones={[[noLongerAt + 10, "bad"]]} />
        <Box x={B.email.x} y={rowTop} w={B.email.w} h={rowH} at={inversionAt + 4} title="Emailer" size={23} />
        <Flow points={[[B.conf.x + B.conf.w + 6, rowMid], [B.email.x - 8, rowMid]]} at={inversionAt + 8} color={frame >= noLongerAt + 10 ? ACCENT : INK} />
        <Mark2 at={noLongerAt + 12} kind="cross" size={30} style={{ left: (B.conf.x + B.conf.w + B.email.x) / 2 - 15, top: rowMid - 50 }} />

        <Line x={A.conf.x} y={rowTop - 48} at={noLongerAt} size={21} color={OK_INK} weight={700}>
          after
        </Line>
        <Box x={A.conf.x} y={rowTop} w={A.conf.w} h={rowH} at={noLongerAt + 4} title="Confirmation" size={23} tone="ok" />
        <Box x={A.shape.x} y={rowTop} w={A.shape.w} h={rowH} at={askedAt - 4} title="sends a message" size={22} tone="ok" dashed lit={pulse(frame, askedAt + 4, 20)} />
        <Flow points={[[A.conf.x + A.conf.w + 4, rowMid], [A.shape.x - 6, rowMid]]} at={askedAt} head={0} color={OK} width={3} />
        <Box x={A.email.x} y={rowTop} w={A.email.w} h={rowH} at={shapeAt - 4} title="Emailer" size={23} />
        <Flow points={[[A.email.x - 6, rowMid], [A.shape.x + A.shape.w + 8, rowMid]]} at={shapeAt + 4} color={OK} />
        <div
          style={{
            position: "absolute",
            left: A.conf.x - 14,
            top: rowTop - 12,
            width: A.shape.x + A.shape.w - A.conf.x + 28,
            height: rowH + 24,
            boxSizing: "border-box",
            border: `2px dashed color-mix(in srgb, ${OK} 70%, transparent)`,
            borderRadius: 16,
            opacity: ease(frame, askedAt + 8, 12),
          }}
        />
        {[
          { x: B.conf.x + B.conf.w / 2, t: "policy" },
          { x: B.email.x + B.email.w / 2, t: "detail" },
          { x: A.conf.x + A.conf.w / 2, t: "policy" },
          { x: A.email.x + A.email.w / 2, t: "detail" },
        ].map((l, i) => (
          <Line key={i} x={l.x} y={rowTop + rowH + 22} at={policyAt + (i % 2) * 6} size={21} color={INK_SOFT} weight={650} align="center" width={200}>
            {l.t}
          </Line>
        ))}
      </Drift>
    </AbsoluteFill>
  );
};
