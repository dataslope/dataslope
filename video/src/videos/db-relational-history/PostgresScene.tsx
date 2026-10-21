import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { TWIN_POSTQUEL, TWIN_SQL } from "./data";
import { Card, Headline, KEY, KEY_INK, KEY_WASH, Listing, Mark, pulse, Spot, Tag, Wire } from "./parts";

const SYLLABLES = ["post", "gres", "cue", "ell"];

/** The types a conventional system came with, and two POSTGRES let you add:
 *  both lists from "The Design of POSTGRES" (see script.ts). */
const BUILT_IN = ["integer", "floating point", "character string"];
const YOUR_OWN = ["polygon", "latitude and longitude"];

/** A type, as a chip: ink for the built-ins, the data blue for one added. */
const Chip: React.FC<{ at: number; added?: boolean; children: React.ReactNode }> = ({ at, added = false, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(1, pop(frame, at, fps, 14));
  if (p <= 0.001) return null;
  return (
    <div
      style={{
        border: `2px solid ${added ? KEY : INK}`,
        borderRadius: 8,
        background: added ? KEY_WASH : "transparent",
        padding: "5px 16px",
        opacity: p,
        transform: `translateY(${(1 - p) * 12}px)`,
        whiteSpace: "nowrap",
        ...note(22, added ? KEY_INK : INK),
        fontWeight: added ? 650 : 500,
      }}
    >
      {children}
    </div>
  );
};

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
  const eightySixAt = n.word("postgres", "eighty-six");
  const overAt = n.word("postgres", "started over");
  const databaseAt = n.word("postgres", "database");
  const extendAt = n.word("postgres", "extend");
  const typesAt = n.word("postgres", "your own types");
  const nameAt = n.word("postgres", "Postgres");
  const afterAt = n.word("postgres", "after Ingres");
  const catchAt = n.word("quirk", "One catch");
  const speakAt = n.word("quirk", "didn't speak");
  const sqlAt = n.word("quirk", "SQL", { nth: 1 });
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

  const TOP = y(400);
  const H = h(218);
  const W = 520;
  const XS = [96, 700, 1304];
  const mid = TOP + H / 2;

  // "After Ingres": the name opens, the missing letters show, and it closes
  // again on the catch.
  const open = ease(frame, afterAt - 2, 14) * (1 - ease(frame, catchAt - 4, 14));
  const syllable = (i: number) => sayAt + ((butAt - sayAt) * i) / SYLLABLES.length;

  // While POSTGRES stands alone, the two columns it will hand on to show what
  // it was for: the types a conventional system came with and two it let you
  // add, then the language it spoke beside the one that had won. Both clear
  // before Postgres95 arrives.
  const AX = XS[1];
  const asideOut = ninetyFourAt - 10;
  const SYL_TOP = TOP + H + 22;

  return (
    <AbsoluteFill>
      {/* ── Sound: three cards, the arrows, the name taken apart, the elephant ── */}
      <Sfx name="el-pop" at={eightySixAt - 6} level={-30} />
      <Sfx name="el-tap" at={afterAt - 2} level={-29} />
      <Sfx name="el-tap" at={typesAt + 2} level={-30} />
      <Sfx name="el-pencil" at={speakAt - 6} level={-34} />
      <Sfx name="el-tap" at={wonAt} level={-30} />
      <Sfx name="el-pencil" at={ninetyFourAt - 4} level={-34} />
      <Sfx name="el-pop" at={helloAt - 2} level={-29} />
      <Sfx name="el-pencil" at={volunteersAt - 4} level={-34} />
      {SYLLABLES.map((s, i) => (
        <Sfx key={s} name="el-tap" at={syllable(i)} level={-31} />
      ))}
      <Sfx name="el-pop" at={mostAt - 4} level={-30} />

      <Headline at={overAt - 8} lead="Stonebraker started over." out={studentsAt - 6} />
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
          {
            at: databaseAt - 2,
            children: (
              <>
                built to be <Mark at={extendAt - 2} out={catchAt}>extended</Mark>,
              </>
            ),
          },
          { at: typesAt - 2, children: <Mark at={typesAt + 2} out={catchAt}>with data types of your own</Mark> },
          {
            at: speakAt - 4,
            children: (
              <>
                speaks POSTQUEL, <span style={{ color: ACCENT_INK, fontWeight: 650 }}>not SQL</span>
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

      {/* ── Beside it: the types it was built for, then its language ── */}
      <Ink at={extendAt - 4} dur={14} out={catchAt - 6} style={{ left: AX, top: TOP + 2, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT) }}>Commercial systems: a fixed menu of types</span>
      </Ink>
      <div style={{ position: "absolute", left: AX, top: TOP + 44, display: "flex", gap: 14, opacity: 1 - ease(frame, catchAt - 6, 10) }}>
        {BUILT_IN.map((t, i) => (
          <Chip key={t} at={extendAt + i * 4}>
            {t}
          </Chip>
        ))}
      </div>
      <Ink at={typesAt - 4} dur={14} out={catchAt - 6} style={{ left: AX, top: TOP + 128, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, KEY_INK) }}>POSTGRES: add your own, such as</span>
      </Ink>
      <div style={{ position: "absolute", left: AX, top: TOP + 170, display: "flex", gap: 14, opacity: 1 - ease(frame, catchAt - 6, 10) }}>
        {YOUR_OWN.map((t, i) => (
          <Chip key={t} at={typesAt + 2 + i * 6} added>
            {t}
          </Chip>
        ))}
      </div>

      <Ink at={speakAt - 8} dur={14} out={asideOut} style={{ left: AX, top: TOP + 2, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK) }}>Ada&apos;s orders, in POSTQUEL</span>
      </Ink>
      <Listing lines={[TWIN_POSTQUEL]} x={AX} top={TOP + 40} width={740} at={speakAt - 6} lineAt={[speakAt - 4]} dim={wonAt} out={asideOut} />
      <Ink at={sqlAt - 4} dur={14} out={asideOut} style={{ left: AX, top: TOP + 134, whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, KEY_INK) }}>and in SQL</span>
      </Ink>
      <Listing
        lines={[TWIN_SQL]}
        x={AX}
        top={TOP + 172}
        width={740}
        at={sqlAt - 2}
        lineAt={[sqlAt]}
        marks={[{ line: 0, at: wonAt }]}
        out={asideOut}
      />

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
          { at: officiallyAt - 2, children: "officially said:" },
        ]}
      />
      {/* The official name, said a syllable at a time under the card whose
          last line introduces it, large enough to read. */}
      <div
        style={{
          position: "absolute",
          left: XS[2] + 28,
          top: SYL_TOP,
          display: "flex",
          alignItems: "baseline",
          gap: "0.32em",
          ...headline(58, true),
          color: INK,
          whiteSpace: "nowrap",
        }}
      >
        {SYLLABLES.map((s, i) => {
          const p = Math.min(1, pop(frame, syllable(i) - 2, fps, 12));
          const dim = ease(frame, nickAt, 14) * 0.5;
          return (
            <span
              key={s}
              style={{
                display: "inline-block",
                opacity: p * (1 - dim),
                transform: `translateY(${(1 - p) * 24}px)`,
                color: i === SYLLABLES.length - 1 || i === SYLLABLES.length - 2 ? ACCENT_INK : INK,
              }}
            >
              {i ? <span style={{ color: INK_SOFT, marginRight: "0.32em" }}>·</span> : null}
              {s}
            </span>
          );
        })}
      </div>
      <Tag x={XS[2] + 28} y={SYL_TOP + 92} at={mostAt - 2} size={23} color={INK}>
        or, as most of us say it, <Mark at={nickAt - 2}>Postgres</Mark>
      </Tag>
      <Spot id="db-relational-history-elephant" at={mostAt - 6} left={XS[1] + W - 260} top={TOP + H + 30} width={260} height={230} />
    </AbsoluteFill>
  );
};
