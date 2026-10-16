import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK } from "../../editorial/style";
import { FigLabel } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Card, Headline, KEY_INK, Mark, pulse, Spot, Strike, Tag, Wire } from "./parts";

const SYLLABLES = ["post", "gres", "cue", "ell"];

/**
 * Part 2, one codebase under three names: POSTGRES (1986, built to be
 * extended, after Ingres, speaking POSTQUEL), Postgres95 (1994, Yu and Chen
 * give it SQL) and PostgreSQL (1996, kept going by volunteers), with the
 * name said the official way and the way everyone says it.
 */
export const PostgresScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const postgresFrom = n.beat("postgres").from;
  const eightySixAt = n.word("postgres", "eighty-six");
  const extendAt = n.word("postgres", "extend");
  const typesAt = n.word("postgres", "your own types");
  const nameAt = n.word("postgres", "Postgres");
  const afterAt = n.word("postgres", "after Ingres");
  const catchAt = n.word("quirk", "One catch");
  const speakAt = n.word("quirk", "didn't speak");
  const wonAt = n.word("quirk", "had won");
  const ninetyFourAt = n.word("yu", "ninety-four");
  const studentsAt = n.word("yu", "grad students");
  const yuAt = n.word("yu", "Andrew Yu");
  const chenAt = n.word("yu", "Jolly Chen");
  const gaveAt = n.word("yu", "gave it SQL");
  const helloAt = n.word("yu", "Hello");
  const ninetyFiveAt = n.word("yu", "ninety-five");
  const volunteersAt = n.word("rename", "Volunteers");
  const goingAt = n.word("rename", "going");
  const ninetySixAt = n.word("rename", "ninety-six");
  const renamedAt = n.word("rename", "renamed");
  const officiallyAt = n.word("rename", "Officially");
  const sayAt = n.word("rename", "post-gres-cue-ell");
  const butAt = n.word("rename", "but");
  const mostAt = n.word("rename", "most of us");
  const nickAt = n.word("rename", "Postgres");

  const TOP = y(370);
  const H = h(250);
  const W = 520;
  const XS = [96, 700, 1304];
  const mid = TOP + H / 2;

  // "After Ingres": the name opens, the missing letters show, and it closes
  // again on the catch.
  const open = ease(frame, afterAt - 2, 14) * (1 - ease(frame, catchAt - 4, 14));
  const syllable = (i: number) => sayAt + ((butAt - sayAt) * i) / SYLLABLES.length;

  return (
    <AbsoluteFill>
      {/* ── Sound: three cards, the arrows, the name taken apart, the elephant ── */}
      <Sfx name="el-pop" at={eightySixAt - 6} level={-30} />
      <Sfx name="el-tap" at={afterAt - 2} level={-29} />
      <Sfx name="el-scratch" at={speakAt} level={-31} />
      <Sfx name="el-pencil" at={ninetyFourAt - 4} level={-34} />
      <Sfx name="el-pop" at={helloAt - 2} level={-29} />
      <Sfx name="el-pencil" at={volunteersAt - 4} level={-34} />
      {SYLLABLES.map((s, i) => (
        <Sfx key={s} name="el-tap" at={syllable(i)} level={-31} />
      ))}
      <Sfx name="el-pop" at={mostAt - 4} level={-30} />

      <Headline at={postgresFrom - 4} lead="Stonebraker started over." out={studentsAt - 6} />
      <Headline at={studentsAt - 2} lead="Two grad students" turn="gave it SQL." turnAt={gaveAt - 4} out={volunteersAt - 6} />
      <Headline at={volunteersAt - 2} lead="Volunteers kept it going." />

      <FigLabel n="6" title="One codebase, three names" at={eightySixAt - 6} x={96} y={y(290)} />

      {/* ── POSTGRES ── */}
      <Card
        x={XS[0]}
        top={TOP}
        width={W}
        height={H}
        at={eightySixAt - 6}
        titleAt={nameAt - 4}
        titleSize={46}
        dim={volunteersAt + 6}
        swell={pulse(frame, afterAt + 2, 18)}
        title={
          <span style={{ display: "inline-flex", alignItems: "baseline" }}>
            <span>POST</span>
            <span
              style={{
                display: "inline-block",
                maxWidth: `${1.2 * open}em`,
                overflow: "hidden",
                opacity: open,
                color: ACCENT_INK,
                fontStyle: "italic",
              }}
            >
              IN
            </span>
            <span>GRES</span>
          </span>
        }
        lines={[
          { at: eightySixAt, children: "UC Berkeley, 1986" },
          { at: typesAt - 4, children: <Mark at={extendAt - 2} out={catchAt}>built to be extended, with your own types</Mark> },
          {
            at: speakAt - 4,
            children: (
              <>
                speaks POSTQUEL, <span style={{ color: ACCENT_INK, fontWeight: 650 }}>not <Strike at={speakAt + 6}>SQL</Strike></span>
              </>
            ),
          },
        ]}
      />
      <Tag x={XS[0] + 28} y={TOP + H + 18} at={afterAt} out={catchAt} size={23} color={ACCENT_INK} weight={650}>
        post Ingres: after Ingres
      </Tag>
      <Tag x={XS[0] + 28} y={TOP + H + 18} at={wonAt - 4} size={23} color={INK}>
        and by the 1990s, <Mark at={wonAt}>SQL had won</Mark>
      </Tag>

      {/* ── Postgres95 ── */}
      <Wire points={[[XS[0] + W + 8, mid], [XS[1] - 8, mid]]} at={ninetyFourAt - 4} dur={12} />
      <Card
        x={XS[1]}
        top={TOP}
        width={W}
        height={H}
        at={ninetyFourAt}
        titleAt={helloAt - 2}
        titleSize={46}
        dim={volunteersAt + 6}
        swell={pulse(frame, ninetyFiveAt, 20)}
        title="Postgres95"
        lines={[
          { at: ninetyFourAt + 4, children: "1994, two Berkeley grad students:" },
          {
            at: yuAt - 2,
            children: (
              <>
                <Mark at={yuAt}>Andrew Yu</Mark> and <Mark at={chenAt}>Jolly Chen</Mark>
              </>
            ),
          },
          {
            at: gaveAt - 2,
            children: (
              <>
                POSTQUEL swapped for <span style={{ color: KEY_INK, fontWeight: 650 }}>SQL</span>
              </>
            ),
          },
        ]}
      />

      {/* ── PostgreSQL ── */}
      <Wire points={[[XS[1] + W + 8, mid], [XS[2] - 8, mid]]} at={volunteersAt - 4} dur={12} />
      <Card
        x={XS[2]}
        top={TOP}
        width={W}
        height={H}
        at={volunteersAt}
        titleAt={renamedAt - 4}
        titleSize={46}
        accent
        title="PostgreSQL"
        lines={[
          { at: goingAt - 2, children: "kept going by volunteers" },
          { at: ninetySixAt - 2, children: "renamed in 1996" },
          {
            at: officiallyAt - 2,
            children: (
              <span style={{ display: "inline-flex", gap: "0.5em", alignItems: "baseline" }}>
                <span>said</span>
                {SYLLABLES.map((s, i) => {
                  const p = Math.min(1, pop(frame, syllable(i) - 2, fps, 12));
                  return (
                    <span
                      key={s}
                      style={{
                        display: "inline-block",
                        opacity: p,
                        transform: `translateY(${(1 - p) * 10}px)`,
                        color: INK,
                        fontWeight: 650,
                      }}
                    >
                      {s}
                    </span>
                  );
                })}
              </span>
            ),
          },
        ]}
      />
      <Tag x={XS[2] + 28} y={TOP + H + 18} at={mostAt - 2} size={23} color={INK}>
        or, as most of us say it, <Mark at={nickAt - 2}>Postgres</Mark>
      </Tag>
      <Spot id="db-relational-history-elephant" at={mostAt - 6} left={1500} top={y(700)} width={250} height={200} />
    </AbsoluteFill>
  );
};
