import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, body, HAIRLINE, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Card, Headline, KEY_INK, Mark, pulse, Spot, Svg, Tick } from "./parts";

const LANE_X0 = 520;
const LANE_X1 = 1280;
/** The letters SEQUEL takes from the words, as [word, letters taken]. */
const TAKEN: readonly [string, number][] = [
  ["Structured", 1],
  ["English", 1],
  ["Query", 3],
  ["Language", 1],
];
const SEQUEL = ["S", "E", "Q", "U", "E", "L"];
const VOWEL = [false, true, false, true, true, false];

/**
 * Part 1, IBM's doubt and System R: could matching values ever be as fast
 * as following a pointer? System R said yes. Chamberlin and Boyce's
 * Structured English Query Language, SEQUEL, loses its vowels to a
 * trademark and becomes SQL; and Boyce, who did not live to see it.
 */
export const SqlScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const doubtFrom = n.beat("doubt").from;
  const imsAt = n.word("doubt", "IMS");
  const fortuneAt = n.word("doubt", "fortune");
  const doubtedAt = n.word("doubt", "doubted");
  const matchingAt = n.word("doubt", "matching values");
  const fastAt = n.word("doubt", "fast");
  const builtAt = n.word("systemr", "built");
  const systemRAt = n.word("systemr", "System R");
  const findAt = n.word("systemr", "find out");
  const couldAt = n.word("systemr", "It could");
  const alongAt = n.word("sequel", "Along");
  const namesAt = n.word("sequel", "Donald Chamberlin");
  const boyceNameAt = n.word("sequel", "Raymond Boyce");
  const languageAt = n.word("sequel", "query language");
  const englishAt = n.word("sequel", "English");
  const calledAt = n.word("sequel", "called");
  const sequelAt = n.word("sequel", "Sequel");
  const aircraftAt = n.word("vowels", "aircraft");
  const ownedAt = n.word("vowels", "owned");
  const vowelsAt = n.word("vowels", "vowels");
  const sqlAt = n.word("vowels", "S-Q-L");
  const diedAt = n.word("boyce", "died");
  const twentiesAt = n.word("boyce", "twenties");
  const livesAt = n.word("boyce", "lives on");
  const normalAt = n.word("boyce", "Boyce-Codd");
  // The three letters that stayed swell once more as the scene closes.
  const lastSwell = pulse(frame, n.beat("boyce").to - 6, 24);

  const lanesOut = alongAt - 4;
  const LANE_A = y(410);
  const LANE_B = y(520);
  const pointerBar = ease(frame, imsAt - 2, 12);
  // Matching values creeps along while the critics doubt it, then runs the
  // whole way once System R answers.
  const valueBar = 0.42 * ease(frame, matchingAt - 4, 34) + 0.58 * ease(frame, couldAt - 2, 16);
  const question = ease(frame, fastAt - 2, 10) * (1 - ease(frame, couldAt - 2, 8));

  // ── The letters ──
  const letterSize = 170;
  const drop = (i: number) => (VOWEL[i] ? ease(frame, vowelsAt - 4 + [0, 0, 0, 5, 10][Math.min(4, i)] * 1, 18) : 0);
  const close = ease(frame, sqlAt - 6, 18);
  const sqlInk = ease(frame, sqlAt - 2, 12);

  return (
    <AbsoluteFill>
      {/* ── Sound: the two bars, System R, the letters, the stamp, the drop ── */}
      <Sfx name="el-whoosh" at={imsAt - 2} level={-34} />
      <Sfx name="el-pencil" at={matchingAt - 4} level={-35} />
      <Sfx name="el-pop" at={systemRAt - 4} level={-30} />
      <Sfx name="el-whoosh" at={couldAt - 2} level={-33} />
      <Sfx name="el-sprinkle" at={sequelAt - 2} level={-34} />
      <Sfx name="el-whoosh" at={aircraftAt - 8} level={-33} />
      <Sfx name="el-tap" at={vowelsAt - 4} level={-29} />
      <Sfx name="el-tap" at={vowelsAt + 6} level={-30} />
      <Sfx name="el-pop" at={sqlAt - 4} level={-29} />

      <Headline at={doubtFrom - 4} lead="IBM wasn't sold." out={alongAt - 6} />
      <Headline at={languageAt - 4} lead="A query language" turn="almost like English." turnAt={englishAt - 4} out={diedAt - 6} />
      <Headline at={diedAt - 2} lead="Boyce never saw" turn="what it became." turnAt={twentiesAt - 4} />

      {/* ── Fig. 3: could matching values be fast? ── */}
      <FigLabel n="3" title="Could matching values ever be as fast as following a pointer?" at={doubtedAt - 6} x={96} y={y(290)} out={lanesOut} />
      <Ink at={imsAt - 4} dur={14} out={lanesOut} style={{ left: 96, top: LANE_A - 16, whiteSpace: "nowrap" }}>
        <span style={{ ...label(23, INK) }}>Follow a pointer, as IMS does</span>
      </Ink>
      <Ink at={matchingAt - 6} dur={14} out={lanesOut} style={{ left: 96, top: LANE_B - 16, whiteSpace: "nowrap" }}>
        <span style={{ ...label(23, INK) }}>Match a value</span>
      </Ink>
      <Svg opacity={1 - ease(frame, lanesOut, 12)}>
        {[LANE_A, LANE_B].map((ly, i) => (
          <line key={i} x1={LANE_X0} x2={LANE_X1} y1={ly} y2={ly} stroke={HAIRLINE} strokeWidth={1} strokeDasharray="3 6" opacity={ease(frame, (i ? matchingAt : imsAt) - 6, 10)} />
        ))}
        {pointerBar > 0 ? <rect x={LANE_X0} y={LANE_A - 13} width={(LANE_X1 - LANE_X0) * pointerBar} height={26} rx={3} fill={BAR} /> : null}
        {valueBar > 0 ? <rect x={LANE_X0} y={LANE_B - 13} width={(LANE_X1 - LANE_X0) * valueBar} height={26} rx={3} fill={ACCENT} /> : null}
      </Svg>
      <Ink at={fortuneAt - 2} dur={14} out={lanesOut} style={{ left: LANE_X1 + 24, top: LANE_A - 16, whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, INK_SOFT) }}>IBM&apos;s big earner</span>
      </Ink>
      {question > 0 ? (
        <div
          style={{
            position: "absolute",
            left: LANE_X0 + (LANE_X1 - LANE_X0) * valueBar + 18,
            top: LANE_B - 30,
            opacity: question * (1 - ease(frame, lanesOut, 10)),
            transform: `scale(${0.6 + 0.4 * Math.min(1, pop(frame, fastAt - 2, fps, 12))})`,
            ...headline(54, true),
            color: ACCENT_INK,
          }}
        >
          ?
        </div>
      ) : null}
      <Tick x={LANE_X1 + 40} y={LANE_B} at={couldAt + 8} out={lanesOut} />
      <Ink at={couldAt + 10} dur={12} out={lanesOut} style={{ left: LANE_X1 + 72, top: LANE_B - 16, whiteSpace: "nowrap" }}>
        <span style={{ ...note(23, KEY_INK), fontWeight: 650 }}>It could.</span>
      </Ink>
      <Card
        x={470}
        top={y(600)}
        width={560}
        height={150}
        at={builtAt - 4}
        titleAt={systemRAt - 2}
        title="System R"
        titleSize={40}
        lines={[{ at: findAt - 4, children: "IBM San Jose, mid-1970s: built to find out" }]}
        out={lanesOut}
      />

      {/* ── Fig. 4: the name ── */}
      <Ink at={namesAt - 4} dur={16} out={diedAt - 6} style={{ left: 96, top: y(300), whiteSpace: "nowrap" }}>
        <span style={{ ...label(24, INK) }}>
          <Mark at={namesAt}>Donald Chamberlin</Mark> and <Mark at={boyceNameAt}>Raymond Boyce</Mark>, System R
        </span>
      </Ink>
      <Ink at={languageAt - 2} dur={22} style={{ left: 96, top: y(380), whiteSpace: "nowrap" }}>
        <div style={{ ...headline(52), color: INK_SOFT }}>
          {TAKEN.map(([w, k], i) => (
            <React.Fragment key={w}>
              {i ? " " : ""}
              <span style={{ color: frame >= englishAt + i * 4 ? ACCENT_INK : INK }}>{w.slice(0, k)}</span>
              <span>{w.slice(k)}</span>
            </React.Fragment>
          ))}
        </div>
      </Ink>
      <div
        style={{
          position: "absolute",
          left: 92,
          top: y(470),
          display: "flex",
          alignItems: "baseline",
          ...headline(letterSize),
          lineHeight: 1,
          color: INK,
        }}
      >
        {SEQUEL.map((ch, i) => {
          const p = Math.min(1, pop(frame, calledAt + 4 + i * 3, fps, 13));
          const d = drop(i);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                overflow: "visible",
                // A vowel gives up its room as it falls, and the rest close up.
                maxWidth: VOWEL[i] && close > 0 ? `${0.8 * (1 - close)}em` : undefined,
                whiteSpace: "nowrap",
                marginRight: "0.03em",
                opacity: p * (1 - d),
                transform: `translateY(${(1 - p) * 30 + d * 120}px) rotate(${d * (i % 2 ? 18 : -14)}deg) scale(${VOWEL[i] ? 1 : 1 + lastSwell * 0.07})`,
                transformOrigin: "50% 80%",
                color: VOWEL[i] ? INK : sqlInk > 0.5 ? ACCENT_INK : INK,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <Ink at={ownedAt - 2} dur={14} out={diedAt - 6} style={{ left: 880, top: y(520), whiteSpace: "nowrap" }}>
        <div style={{ transform: "rotate(-5deg)", border: `3px solid ${ACCENT}`, borderRadius: 6, padding: "6px 16px" }}>
          <span style={{ ...label(26, ACCENT_INK) }}>That name is taken</span>
        </div>
      </Ink>
      <Spot
        id="db-relational-history-plane"
        at={aircraftAt - 8}
        out={diedAt - 6}
        left={1330}
        top={y(330)}
        width={460}
        height={300}
        from={[260, -20]}
      />

      {/* ── Boyce ── */}
      <div
        style={{
          position: "absolute",
          left: 96,
          top: y(760),
          width: 900 * ease(frame, diedAt - 4, 16),
          height: 1,
          background: HAIRLINE,
        }}
      />
      <Ink at={diedAt - 2} dur={16} style={{ left: 96, top: y(782), whiteSpace: "nowrap" }}>
        <span style={{ ...body(30, true), color: INK }}>
          Raymond Boyce died in 1974, still in his <Mark at={twentiesAt - 2}>twenties</Mark>.
        </span>
      </Ink>
      <Ink at={livesAt - 2} dur={18} style={{ left: 96, top: y(842), whiteSpace: "nowrap" }}>
        <span style={{ ...note(23, INK_SOFT) }}>
          His name lives on in <Mark at={normalAt}>Boyce–Codd normal form</Mark>, 1974.
        </span>
      </Ink>
    </AbsoluteFill>
  );
};
