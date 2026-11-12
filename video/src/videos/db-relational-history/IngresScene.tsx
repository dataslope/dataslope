import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Card, Headline, Kicker, Mark, pulse, Spot, Wire } from "./parts";

/**
 * Part 2 opens at Berkeley: Stonebraker and Wong's Ingres, built from Codd's
 * papers; its source code sent out on tape for a nominal fee; and the
 * industry its people seeded, Sybase and from it Microsoft SQL Server, each
 * named as it arrives.
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
  const peopleAt = n.word("industry", "people");
  const industryAt = n.word("industry", "industry");
  const sybaseAt = n.word("industry", "Sybase");
  const microsoftAt = n.word("industry", "Microsoft SQL Server");

  // The tree's blocks are plain text now, so its wires run text to text,
  // 24px clear at each end, rather than box edge to box edge. Codd's and
  // Sybase's blocks sit a little lower than Ingres's so the three names
  // share one centre line (Ingres's name, at 50px, sits 53px into its
  // block; the 34 and 36px names, 37 and 40px into theirs), and the wires
  // between them run along it.
  const INGRES = { x: 500, top: y(380), w: 560, h: h(222) };
  const CODD = { x: 96, top: INGRES.top + h(14), w: 290, h: h(118) };
  const SYB = { x: 1200, top: INGRES.top + h(12), w: 600, h: h(118) };
  const MS = { x: 1200, top: y(580), w: 600, h: h(118) };
  const nameMid = INGRES.top + h(47);
  /** Where each block's text ends, measured off the render: Codd's longer
   *  line, "the relational papers", and Ingres's name. */
  const coddRight = CODD.x + 206;
  const ingresNameRight = INGRES.x + 134;
  /** The foot of Sybase's line, "co-founded by an Ingres alum", and the top
   *  of Microsoft SQL Server's name. */
  const sybFoot = SYB.top + h(88);
  const msHead = MS.top + h(16);

  return (
    <AbsoluteFill>
      {/* ── Sound: the cards, the tape, the branches ── */}
      <Sfx name="el-pop" at={berkeleyAt - 4} level={-30} />
      <Sfx name="el-pencil" at={relationalAt - 2} level={-34} />
      <Sfx name="el-tap" at={ingresAt - 2} level={-28} />
      <Sfx name="el-pop" at={tapeAt - 6} level={-29} />
      <Sfx name="el-pencil" at={sybaseAt - 8} level={-34} />
      <Sfx name="el-pop" at={microsoftAt - 4} level={-30} />

      <Kicker at={ingresFrom - 10}>From Ingres to PostgreSQL</Kicker>
      <Headline at={ingresFrom - 4} lead="Berkeley built its own." out={codeAt - 6} />
      <Headline at={codeAt - 2} lead="Its code went out" turn="on tape." turnAt={tapeAt - 4} out={peopleAt - 6} />
      <Headline at={peopleAt - 2} lead="Its people seeded" turn="an industry." turnAt={industryAt - 4} />

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
        lines={[{ at: relationalAt, children: "The relational papers" }]}
        dim={costAt}
      />
      <Wire
        points={[
          [coddRight + 24, nameMid],
          [INGRES.x - 24, nameMid],
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
          { at: ownAt - 2, children: "Its own query language, QUEL" },
        ]}
      />

      {/* ── The tape ── */}
      <Spot id="db-relational-history-tape" at={tapeAt - 6} left={560} top={y(640)} width={210} height={210} />
      <Ink at={costAt - 2} dur={14} style={{ left: 800, top: y(690), whiteSpace: "nowrap" }}>
        <div style={{ ...note(23, INK) }}>Its source code, on tape</div>
        <div style={{ ...note(21, INK_SOFT), marginTop: 6 }}>
          <Mark at={tapeAt}>for a nominal fee</Mark>
        </div>
      </Ink>

      {/* ── What grew from it ── */}
      <Wire
        points={[
          [ingresNameRight + 24, nameMid],
          [SYB.x - 24, nameMid],
        ]}
        at={sybaseAt - 8}
        dur={14}
      />
      <Card
        x={SYB.x}
        top={SYB.top}
        width={SYB.w}
        height={SYB.h}
        at={sybaseAt - 4}
        title="Sybase, 1984"
        titleSize={36}
        lines={[{ at: sybaseAt + 4, children: "Co-founded by an Ingres alum" }]}
      />
      <Wire
        points={[
          [SYB.x + 120, sybFoot + 24],
          [SYB.x + 120, msHead - 24],
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
        lines={[{ at: microsoftAt + 6, children: "Licensed from Sybase, version 1.0 in 1989" }]}
        swell={pulse(frame, microsoftAt + 14, 20)}
      />
    </AbsoluteFill>
  );
};
