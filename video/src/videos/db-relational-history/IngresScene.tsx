import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Card, Headline, Kicker, KEY_INK, Mark, pulse, Spot, Tag, Wire } from "./parts";

/**
 * Part 2 opens at Berkeley: Stonebraker and Wong's Ingres, built from Codd's
 * papers; its source code sent out on tape for a nominal fee; and the
 * industry its people seeded, Sybase and from it Microsoft SQL Server.
 */
export const IngresScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const ingresFrom = n.beat("ingres").from;
  const berkeleyAt = n.word("ingres", "Berkeley");
  const stonebrakerAt = n.word("ingres", "Michael Stonebraker");
  const wongAt = n.word("ingres", "Eugene Wong");
  const relationalAt = n.word("ingres", "relational system");
  const ownAt = n.word("ingres", "own");
  const ingresAt = n.word("ingres", "Ingres");
  const codeAt = n.word("tape", "code");
  const costAt = n.word("tape", "cost");
  const tapeAt = n.word("tape", "tape");
  const peopleAt = n.word("tape", "people");
  const seededAt = n.word("tape", "seeded");
  const industryAt = n.word("tape", "industry");
  const microsoftAt = n.word("tape", "Microsoft SQL Server");

  const CODD = { x: 96, top: y(420), w: 290, h: h(118) };
  const INGRES = { x: 500, top: y(380), w: 560, h: h(222) };
  const SYB = { x: 1200, top: y(380), w: 600, h: h(118) };
  const MS = { x: 1200, top: y(580), w: 600, h: h(118) };
  const coddMid = CODD.top + CODD.h / 2;
  const sybMid = SYB.top + SYB.h / 2;

  return (
    <AbsoluteFill>
      {/* ── Sound: the cards, the tape, the branches ── */}
      <Sfx name="el-pop" at={berkeleyAt - 4} level={-30} />
      <Sfx name="el-pencil" at={relationalAt - 2} level={-34} />
      <Sfx name="el-tap" at={ingresAt - 2} level={-28} />
      <Sfx name="el-pop" at={tapeAt - 6} level={-29} />
      <Sfx name="el-pencil" at={seededAt - 4} level={-34} />
      <Sfx name="el-pop" at={microsoftAt - 4} level={-30} />

      <Kicker at={ingresFrom - 10}>From Ingres to PostgreSQL</Kicker>
      <Headline at={ingresFrom - 4} lead="Berkeley built its own." out={codeAt - 6} />
      <Headline at={codeAt - 2} lead="Its code went out" turn="on tape." turnAt={tapeAt - 4} out={seededAt - 6} />
      <Headline at={seededAt - 2} lead="Its people seeded" turn="an industry." turnAt={industryAt - 4} />

      <FigLabel n="5" title="Ingres, and some of what grew from it" at={berkeleyAt - 6} x={96} y={y(290)} />

      {/* ── Codd's papers, read at Berkeley ── */}
      <Card
        x={CODD.x}
        top={CODD.top}
        width={CODD.w}
        height={CODD.h}
        at={relationalAt - 6}
        title="Codd, 1970"
        titleSize={34}
        lines={[{ at: relationalAt, children: "the relational papers" }]}
        dim={costAt}
      />
      <Wire
        points={[
          [CODD.x + CODD.w + 6, coddMid],
          [INGRES.x - 6, coddMid],
        ]}
        at={relationalAt + 2}
        dur={14}
        dim={costAt}
      />

      {/* ── Ingres ── */}
      <Card
        x={INGRES.x}
        top={INGRES.top}
        width={INGRES.w}
        height={INGRES.h}
        at={berkeleyAt - 4}
        title="Ingres"
        titleAt={ingresAt - 4}
        titleSize={50}
        swell={pulse(frame, ingresAt, 20)}
        lines={[
          { at: berkeleyAt, children: "UC Berkeley, from 1973" },
          {
            at: stonebrakerAt - 2,
            children: (
              <>
                <Mark at={stonebrakerAt}>Michael Stonebraker</Mark> and <Mark at={wongAt}>Eugene Wong</Mark>
              </>
            ),
          },
          { at: ownAt - 2, children: "its own query language, QUEL" },
        ]}
      />

      {/* ── The tape ── */}
      <Spot id="db-relational-history-tape" at={tapeAt - 6} left={560} top={y(640)} width={210} height={210} />
      <Ink at={costAt - 2} dur={14} style={{ left: 800, top: y(690), whiteSpace: "nowrap" }}>
        <div style={{ ...note(23, INK) }}>its source code, on tape</div>
        <div style={{ ...note(21, INK_SOFT), marginTop: 6 }}>
          <Mark at={tapeAt}>for a nominal fee</Mark>
        </div>
      </Ink>

      {/* ── What grew from it ── */}
      <Wire
        points={[
          [INGRES.x + INGRES.w + 6, sybMid],
          [SYB.x - 6, sybMid],
        ]}
        at={peopleAt - 2}
        dur={14}
      />
      <Card
        x={SYB.x}
        top={SYB.top}
        width={SYB.w}
        height={SYB.h}
        at={seededAt - 4}
        title="Sybase, 1984"
        titleSize={36}
        lines={[{ at: seededAt + 4, children: "co-founded by an Ingres alum" }]}
      />
      <Wire
        points={[
          [SYB.x + 120, SYB.top + SYB.h + 6],
          [SYB.x + 120, MS.top - 6],
        ]}
        at={microsoftAt - 10}
        dur={12}
      />
      <Card
        x={MS.x}
        top={MS.top}
        width={MS.w}
        height={MS.h}
        at={microsoftAt - 4}
        title="Microsoft SQL Server"
        titleSize={36}
        lines={[{ at: microsoftAt + 6, children: "licensed from Sybase, version 1.0 in 1989" }]}
        swell={pulse(frame, microsoftAt + 14, 20)}
      />
      <Wire
        points={[
          [INGRES.x + INGRES.w + 6, INGRES.top + INGRES.h - 30],
          [INGRES.x + INGRES.w + 60, INGRES.top + INGRES.h - 30],
          [INGRES.x + INGRES.w + 60, y(800)],
          [SYB.x - 6, y(800)],
        ]}
        at={industryAt - 2}
        dur={16}
        dash="5 5"
        color={INK_SOFT}
      />
      <Tag x={SYB.x + 4} y={y(800) - 15} at={industryAt + 8} size={22} color={INK}>
        and more: <span style={{ color: KEY_INK }}>Britton Lee, NonStop SQL</span>
      </Tag>
    </AbsoluteFill>
  );
};
