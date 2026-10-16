import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  BAR,
  BLUE_INK,
  body,
  headline,
  HIGHLIGHT,
  INK,
  INK_SOFT,
  label,
  note,
} from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PARTS, pct, type PartKey, WALD } from "./data";
import { PART_HI, Plane, SKIN, Swatch } from "./parts";
import { swell } from "../sampling/emphasis";

/** Rows of the table, one per part, in the memo's order. */
const ROW_Y = (i: number) => 380 + i * 122;
const NAME_X = 880;
const BX0 = 1170;
/** px per percentage point of share. */
const PX = 9.5;
const VALUE_X = 1572;
const EST_X = 1800;
/** Bars sit this far above and below the row's centre line. */
const GAP = 10;
const THICK = 24;

const PLANE_X = 470;
const PLANE_Y = 565;
const PLANE_SCALE = 2.5;

/**
 * Wald's worked example: the plane's four parts, each part's share of the
 * area against its share of the holes on the planes that came back, and his
 * estimate of how often one hit there brings a plane down.
 */
export const WaldScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  const start = n.beat("example").from;
  const exampleAt = n.word("example", "example");
  const fourAt = n.word("example", "Four hundred");
  const backAt = n.word("example", "three hundred");
  const enginesAt = n.word("engines", "two engines");
  const quarterAt = n.word("engines", "quarter");
  const fewerAt = n.word("engines", "fewer");
  const fuselageAt = n.word("fuselage", "fuselage");
  const missingAt = n.word("missing", "missing");
  const neverAt = n.word("missing", "never came back");
  const numbersAt = n.word("estimate", "numbers");
  const thirtyNineAt = n.word("estimate", "thirty-nine");
  const fuselage2At = n.word("estimate", "fuselage");
  const fiveAt = n.word("estimate", "five");
  const holesAt = n.word("holes", "holes");
  const protectAt = n.word("holes", "protection");
  const arentAt = n.word("holes", "AREN'T");
  // While the table is talked about: the fuselage's holes "more than its
  // share", and every part's holes as "where a plane can be hit".
  const shareAt = n.word("fuselage", "more than its share");
  const hitAt = n.word("holes", "hit");

  // Which part the narration is on: engines, then the fuselage, then the
  // engines again from "missing" on.
  const focus = (key: PartKey) => {
    if (key === "engines") return ease(frame, enginesAt - 4, 10) * (1 - ease(frame, fuselageAt - 6, 10)) + ease(frame, missingAt - 4, 10);
    if (key === "fuselage") return ease(frame, fuselageAt - 4, 10) * (1 - ease(frame, missingAt - 6, 10));
    return 0;
  };
  const guard = ease(frame, arentAt - 6, 14);

  const engines = PARTS[0];
  const missFrom = BX0 + engines.hitShare * 100 * PX;
  const missTo = BX0 + engines.areaShare * 100 * PX;
  const missDraw = ease(frame, missingAt, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound: the plane, the two sets of bars, the missing hits, the estimate ── */}
      <Sfx name="el-pop" at={start} level={-30} />
      <Sfx name="el-pop" at={enginesAt + 4} level={-30} />
      <Sfx name="el-pop" at={fewerAt} level={-30} />
      <Sfx name="el-pencil" at={missingAt} level={-33} />
      <Sfx name="el-tap" at={thirtyNineAt} level={-28} />
      <Sfx name="el-pencil" at={arentAt - 6} level={-34} />

      {/* One line in two inks; the second half follows the first in the flow. */}
      <div style={{ position: "absolute", left: 116, top: y(104), display: "flex", gap: "0.26em", ...headline(56) }}>
        <Ink at={fourAt - 4} dur={18} style={{ position: "relative", whiteSpace: "nowrap" }}>
          {WALD.planes} planes fly a mission.
        </Ink>
        <Ink
          at={backAt - 2}
          dur={18}
          style={{ position: "relative", ...headline(56, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          {WALD.returned} come back.
        </Ink>
      </div>
      <FigLabel n="1" title="The worked example in Wald's 1943 memos" at={start} x={120} y={y(196)} />
      <Note at={enginesAt} x={1800} y={y(196) + 2} align="right" from="right">
        <span style={{ ...note(21, INK_SOFT), display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Swatch kind="area" /> share of the plane
          <span style={{ width: 14 }} />
          <Swatch kind="holes" /> share of the holes on planes that came back
        </span>
      </Note>

      {/* ── The plane ── */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <Plane
          x={PLANE_X}
          y={y(PLANE_Y)}
          scale={PLANE_SCALE * (0.94 + 0.06 * pop(frame, start, fps, 16))}
          opacity={ease(frame, start, 14)}
          style={(key) => ({
            fill: focus(key) > 0 ? `color-mix(in srgb, ${PART_HI} ${Math.round(focus(key) * 100)}%, ${SKIN})` : SKIN,
            stroke: key === "engines" && guard > 0 ? ACCENT : INK,
            // The part the narration is on is drawn heavier, as well as lit.
            width: (key === "engines" ? 1.6 + guard * 3 : 1.6) + 1.8 * focus(key),
          })}
        />
      </svg>
      {/* Kept under the plane, clear of the column the conclusion inks into. */}
      <Note at={exampleAt} x={150} y={y(852)}>
        <div style={note(20, INK_SOFT)}>Wald's illustrative data: each part's area,</div>
        <div style={note(20, INK_SOFT)}>
          and {WALD.totalHits} hits on the {WALD.returned} planes that returned
        </div>
      </Note>

      {/* ── The table ── */}
      {PARTS.map((p, i) => {
        const c = y(ROW_Y(i));
        const nameAt = exampleAt + 4 + i * 5;
        const band = focus(p.key);
        // Room in the engines' band for the "missing" line under its bars.
        const extra = i === 0 ? ease(frame, missingAt, 10) * 34 : 0;
        const areaGrow = ease(frame, enginesAt + 4 + i * 4, 16);
        const holesGrow = ease(frame, fewerAt + i * 4, 16);
        const estAt = i === 0 ? thirtyNineAt : i === 1 ? fuselage2At : fiveAt + 8 + (i - 2) * 5;
        const holesSwell =
          (p.key === "fuselage" ? swell(frame, shareAt - 2, 0.35, 22) : 1) * swell(frame, hitAt - 2 + i * 4, 0.3, 22);
        return (
          <React.Fragment key={p.key}>
            <div
              style={{
                position: "absolute",
                left: 856,
                width: 968,
                top: c - 50,
                height: 100 + extra,
                background: HIGHLIGHT,
                opacity: band * 0.45,
              }}
            />
            <Ink at={nameAt} dur={14} style={{ left: NAME_X, top: c - 22 }}>
              <span style={{ ...headline(38), whiteSpace: "nowrap" }}>{p.name}</span>
            </Ink>
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
              {areaGrow > 0 ? (
                <rect
                  x={BX0}
                  y={c - GAP - THICK}
                  width={p.areaShare * 100 * PX * areaGrow}
                  height={THICK}
                  fill="none"
                  stroke={INK_SOFT}
                  strokeWidth={1.6}
                />
              ) : null}
              {holesGrow > 0 ? (
                <rect
                  x={BX0}
                  y={c + GAP - (THICK * (holesSwell - 1)) / 2}
                  width={p.hitShare * 100 * PX * holesGrow}
                  height={THICK * holesSwell}
                  fill={BAR}
                />
              ) : null}
            </svg>
            <Note at={quarterAt + i * 3} x={VALUE_X} y={c - GAP - THICK / 2 - 13}>
              <span style={note(20, INK_SOFT)}>{pct(p.areaShare)}</span>
            </Note>
            <Note at={fewerAt + 10 + i * 4} x={VALUE_X} y={c + GAP + THICK / 2 - 13}>
              <span style={{ ...note(20, BLUE_INK), fontWeight: 650 }}>{pct(p.hitShare)}</span>
            </Note>
            <Note at={estAt} x={EST_X} y={c - 22} align="right" from="right">
              <span style={{ ...note(34, ACCENT_INK), fontWeight: 700 }}>{pct(p.downedByOneHit)}</span>
            </Note>
          </React.Fragment>
        );
      })}

      {/* The engine hits the returning planes are short of. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {missDraw > 0 ? (
          <rect
            x={missFrom}
            y={y(ROW_Y(0)) + GAP}
            width={(missTo - missFrom) * missDraw}
            height={THICK}
            fill={`color-mix(in srgb, ${ACCENT} 12%, transparent)`}
            stroke={ACCENT}
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        ) : null}
      </svg>
      <Note at={missingAt + 8} x={BX0} y={y(ROW_Y(0)) + GAP + THICK + 10}>
        <span style={{ ...note(21, ACCENT_INK), fontWeight: 650 }}>
          Missing
          <span
            style={{
              fontWeight: 500,
              opacity: ease(frame, neverAt, 12),
            }}
          >
            : on the {WALD.lost} planes that never came back
          </span>
        </span>
      </Note>

      {/* Wald's estimate, a statistic, in the accent. */}
      <Note at={numbersAt} x={EST_X} y={y(262)} align="right" from="right">
        <div style={label(20, ACCENT_INK)}>Wald's estimate:</div>
        <div style={label(20, INK_SOFT)}>chance one hit downs it</div>
      </Note>

      {/* ── What the holes mean ── */}
      <div
        style={{
          position: "absolute",
          left: NAME_X,
          top: y(822),
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <Ink at={holesAt - 4} dur={16} style={{ position: "relative", whiteSpace: "nowrap" }}>
          <span style={{ ...body(30, true), color: INK }}>The holes mark hits a plane can survive.</span>
        </Ink>
        <Ink at={protectAt - 4} dur={16} style={{ position: "relative", whiteSpace: "nowrap" }}>
          <span style={{ ...headline(42, true), color: ACCENT_INK }}>Protect where they aren't.</span>
        </Ink>
      </div>
    </AbsoluteFill>
  );
};
