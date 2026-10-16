import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, INK, INK_SOFT, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { GAVEL } from "./NullScene";
import { H0, Head, Label, Mark, pulse, Spot, STAT_INK } from "./parts";

const COURT_X = 540;
const TEST_X = 1130;
const RIGHT = 1790;
const HEAD_Y = 316;
const ROW_Y0 = 380;
const ROW_STEP = 104;

/**
 * The courtroom: each part of a trial and the part of a test it stands for,
 * row by row, and the cell that matters most, "not guilty" is not
 * "innocent".
 */
export const CourtScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const courtFrom = n.beat("court").from;
  const defendantAt = n.word("court", "defendant");
  const presumedAt = n.word("court", "presumed innocent");
  const evidenceAt = n.word("court", "evidence");
  const beyondAt = n.word("bar", "Beyond");
  const clearAt = n.word("bar", "clear");
  const beginsAt = n.word("bar", "begins");
  const clearBarAt = n.word("guilty", "Clear");
  const fallAt = n.word("guilty", "Fall short");
  const failingAt = n.word("innocent", "Failing");
  const alphaAt = n.word("bar", "alpha");
  const fiveAt = n.word("bar", "five percent");
  const beforeAt = n.word("bar", "before");
  const guiltyAt = n.word("guilty", "guilty");
  const rejectAt = n.word("guilty", "reject");
  const notGuiltyAt = n.word("guilty", "not guilty");
  const neverAt = n.word("innocent", "never");
  const proveAt = n.word("innocent", "prove");
  const strongAt = n.word("innocent", "strong enough");
  const procedureAt = n.word("steps-in", "procedure");

  const rowY = (i: number) => y(ROW_Y0 + i * ROW_STEP);
  const dim = 1 - 0.55 * ease(frame, procedureAt - 8, 16);
  const barGlow = pulse(frame, clearBarAt, 26) + pulse(frame, strongAt, 26);
  const failGlow = pulse(frame, failingAt, 26);

  const ROWS: { court: React.ReactNode; test: React.ReactNode; at: number; testAt: number }[] = [
    { court: "Presumed innocent", test: <>Assume <H0 /> is true</>, at: presumedAt - 4, testAt: presumedAt + 8 },
    {
      court: "Beyond reasonable doubt",
      test: (
        <>
          <Mark at={clearAt}>α, the bar</Mark>: usually <Mark at={fiveAt}>5%</Mark>
        </>
      ),
      at: beyondAt - 4,
      testAt: alphaAt - 4,
    },
    { court: "Guilty", test: <>Reject <H0 /></>, at: guiltyAt - 4, testAt: rejectAt - 4 },
    { court: "Not guilty", test: <>Fail to reject <H0 /></>, at: fallAt - 2, testAt: notGuiltyAt - 2 },
  ];

  return (
    <AbsoluteFill>
      {/* ── Sound: one tap per row as it lands, a pencil for the two notes ── */}
      {ROWS.map((r) => (
        <Sfx key={r.at} name="el-tap" at={r.at} level={-30} />
      ))}
      <Sfx name="el-pencil" at={beforeAt - 2} level={-35} />
      <Sfx name="el-scratch" at={neverAt + 4} level={-31} />

      <Head a="The null is on trial." at={courtFrom - 4} />
      <Spot id="testing-hypotheses-gavel" at={courtFrom - 400} left={GAVEL.left} top={y(GAVEL.top)} width={GAVEL.width} height={GAVEL.height} />
      <Ink at={evidenceAt - 2} dur={14} style={{ left: TEST_X, top: rowY(0) + 52, whiteSpace: "nowrap" }}>
        <Label size={22} color={INK_SOFT} weight={520}>
          until the evidence says otherwise
        </Label>
      </Ink>
      <Ink at={defendantAt - 4} dur={16} style={{ left: 140, top: y(380), width: 340 }}>
        <span style={{ ...body(32, true), color: INK_SOFT }}>
          The null is the defendant.
        </span>
      </Ink>

      <div style={{ opacity: dim, position: "absolute", inset: 0 }}>
        {/* ── The table ── */}
        {[
          ["In court", COURT_X],
          ["In a test", TEST_X],
        ].map(([t, x]) => (
          <div
            key={t as string}
            style={{ position: "absolute", left: x as number, top: y(HEAD_Y), opacity: ease(frame, courtFrom, 12), ...label(22, INK_SOFT) }}
          >
            {t}
          </div>
        ))}
        <div
          style={{
            position: "absolute",
            left: COURT_X,
            top: y(HEAD_Y) + 40,
            width: (RIGHT - COURT_X) * ease(frame, courtFrom + 2, 18),
            height: 2,
            background: INK,
          }}
        />
        {ROWS.map((r, i) => (
          <React.Fragment key={i}>
            <Ink at={r.at} dur={14} style={{ left: COURT_X, top: rowY(i) + 6, whiteSpace: "nowrap" }}>
              <span style={{ ...body(38, true), color: INK }}>{r.court}</span>
            </Ink>
            <Ink at={r.testAt} dur={14} style={{ left: TEST_X, top: rowY(i) + 10, whiteSpace: "nowrap" }}>
              <div style={{ transform: `scale(${1 + 0.05 * (i === 1 ? barGlow : i === 3 ? failGlow : 0)})`, transformOrigin: "0 50%" }}>
                <Label size={32} weight={600}>
                  {r.test}
                </Label>
              </div>
            </Ink>
            <div
              style={{
                position: "absolute",
                left: COURT_X,
                top: rowY(i) + 84,
                width: RIGHT - COURT_X,
                height: 1,
                background: HAIRLINE,
                opacity: 0.5 * ease(frame, r.at + 4, 12),
              }}
            />
          </React.Fragment>
        ))}
        {/* Set before the trial: the rule the next scene follows. */}
        <Ink at={beforeAt - 2} dur={14} style={{ left: TEST_X, top: rowY(1) + 52, whiteSpace: "nowrap" }}>
          <Label size={22} color={INK_SOFT} weight={520}>
            <Mark at={beginsAt - 2}>set before the trial begins</Mark>
          </Label>
        </Ink>

        {/* The cell that matters most. */}
        <Ink at={neverAt - 2} dur={16} style={{ left: COURT_X, top: rowY(4) + 6, whiteSpace: "nowrap" }}>
          <span style={{ ...body(38, true), color: STAT_INK }}>is not innocent</span>
        </Ink>
        <Ink at={proveAt - 4} dur={16} style={{ left: TEST_X, top: rowY(4) + 10, whiteSpace: "nowrap" }}>
          <Label size={32} color={STAT_INK}>
            does not prove <H0 />
          </Label>
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
