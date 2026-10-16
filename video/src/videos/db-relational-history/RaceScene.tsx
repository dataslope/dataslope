import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HAIRLINE, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { FigLabel } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Headline, KEY_INK, Mark, pulse, Svg, Tag, Wire } from "./parts";

const X: XScale = { lo: 1972, hi: 1986, x0: 330, x1: 1740 };
const TICKS = [1972, 1974, 1976, 1978, 1980, 1982, 1984, 1986];

/** A year's dot on a lane, popping in on `at`. */
const Dot: React.FC<{ x: number; y: number; at: number; color: string; r?: number; swell?: number }> = ({ x, y, at, color, r = 11, swell = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(1, pop(frame, at, fps, 12));
  if (p <= 0.001) return null;
  return (
    <Svg>
      <circle cx={x} cy={y} r={r * p * (1 + swell * 0.4)} fill={color} stroke={PAPER} strokeWidth={2} />
    </Svg>
  );
};

/**
 * Part 1, the race IBM lost: System R's work published, a small California
 * company reading it, and Oracle on sale in 1979, two years before IBM's own
 * SQL/DS (1981, the year of Codd's Turing Award) and DB2 (1983). Then a third
 * lane, Berkeley, for the part that follows.
 */
export const RaceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const raceFrom = n.beat("oracle").from;
  const twistAt = n.word("oracle", "twist");
  const publishedAt = n.word("oracle", "published");
  const companyAt = n.word("oracle", "small California company");
  const readAt = n.word("oracle", "read");
  const closelyAt = n.word("oracle", "closely");
  const seventyNineAt = n.word("oracle", "seventy-nine");
  const oracleAt = n.word("oracle", "Oracle");
  const firstAt = n.word("oracle", "first SQL database");
  const buyAt = n.word("oracle", "buy");
  const eightyOneAt = n.word("ibm", "eighty-one");
  const coddAt = n.word("ibm", "Codd");
  const turingAt = n.word("ibm", "Turing Award");
  const butAt = n.word("berkeley-in", "But");
  const onlyAt = n.word("berkeley-in", "only one");
  const readingAt = n.word("berkeley-in", "reading Codd");

  const LANE_IBM = y(440);
  const LANE_CO = y(580);
  const LANE_UCB = y(720);
  const AXIS = y(800);
  const lane = (at: number, from: number) => ease(frame, at, 22) * (sx(X, X.hi) - sx(X, from));
  const dimIbm = ease(frame, onlyAt - 4, 16) * 0.55;

  const paperX = sx(X, 1976);

  return (
    <AbsoluteFill>
      {/* ── Sound: the lanes, the papers crossing, the launches ── */}
      <Sfx name="el-pencil" at={raceFrom} level={-35} />
      <Sfx name="el-pop" at={publishedAt - 2} level={-30} />
      <Sfx name="el-pencil" at={readAt - 2} level={-34} />
      <Sfx name="el-pop" at={seventyNineAt - 2} level={-28} />
      <Sfx name="el-tap" at={eightyOneAt - 2} level={-29} />
      <Sfx name="el-tap" at={eightyOneAt + 10} level={-30} />
      <Sfx name="el-pencil" at={butAt} level={-34} />

      <Headline at={twistAt - 6} lead="IBM published." turn="Oracle shipped first." turnAt={oracleAt - 4} out={butAt - 6} />
      <Headline at={butAt - 2} lead="Codd had other readers." />

      <FigLabel n="5" title="Who sold SQL first" at={raceFrom} x={96} y={y(290)} />

      {/* ── The year axis ── */}
      <Svg opacity={ease(frame, raceFrom + 2, 14)}>
        <line x1={X.x0} x2={X.x1} y1={AXIS} y2={AXIS} stroke={HAIRLINE} strokeWidth={1.4} />
        {TICKS.map((t) => (
          <line key={t} x1={sx(X, t)} x2={sx(X, t)} y1={AXIS} y2={AXIS + 8} stroke={HAIRLINE} strokeWidth={1.4} />
        ))}
      </Svg>
      {TICKS.map((t) => (
        <div
          key={t}
          style={{
            position: "absolute",
            left: sx(X, t),
            top: AXIS + 14,
            transform: "translateX(-50%)",
            opacity: ease(frame, raceFrom + 4, 14),
            ...note(20, INK_SOFT),
          }}
        >
          {t}
        </div>
      ))}

      {/* ── The lanes ── */}
      <Svg>
        <g opacity={1 - dimIbm}>
          <line x1={sx(X, 1974)} x2={sx(X, 1974) + lane(raceFrom, 1974)} y1={LANE_IBM} y2={LANE_IBM} stroke={INK} strokeWidth={2.4} />
          {/* System R, the research system, as a band on IBM's lane. */}
          <rect
            x={sx(X, 1974)}
            y={LANE_IBM - 9}
            width={(sx(X, 1979) - sx(X, 1974)) * ease(frame, raceFrom + 6, 26)}
            height={18}
            rx={3}
            fill={`color-mix(in srgb, ${INK} 16%, transparent)`}
          />
          <line x1={sx(X, 1977)} x2={sx(X, 1977) + lane(companyAt - 4, 1977)} y1={LANE_CO} y2={LANE_CO} stroke={INK} strokeWidth={2.4} />
        </g>
        <line x1={sx(X, 1973)} x2={sx(X, 1973) + lane(onlyAt - 2, 1973)} y1={LANE_UCB} y2={LANE_UCB} stroke={BAR} strokeWidth={2.4} />
      </Svg>
      <Tag x={X.x0} y={LANE_IBM - 58} at={raceFrom + 2} dim={onlyAt - 4} size={23} color={INK} weight={650}>
        IBM
      </Tag>
      <Tag x={sx(X, 1974)} y={LANE_IBM + 18} at={raceFrom + 10} dim={onlyAt - 4} size={20}>
        System R
      </Tag>
      <Tag x={X.x0} y={LANE_CO - 58} at={companyAt - 4} dim={onlyAt - 4} size={23} color={INK} weight={650}>
        <Mark at={closelyAt - 2} out={seventyNineAt}>
          A small California company
        </Mark>
      </Tag>
      <Tag x={X.x0} y={LANE_UCB - 58} at={onlyAt - 2} size={23} color={KEY_INK} weight={650}>
        Berkeley
      </Tag>
      <Dot x={sx(X, 1973)} y={LANE_UCB} at={readingAt - 2} color={BAR} swell={pulse(frame, readingAt + 8, 20)} />

      {/* System R's work, published, and read across the way. */}
      <Svg opacity={1 - dimIbm}>
        <g transform={`translate(${paperX} ${LANE_IBM - 46})`} opacity={ease(frame, publishedAt - 2, 10)}>
          <rect x={-15} y={-20} width={30} height={40} rx={2} fill={PAPER} stroke={INK} strokeWidth={2} />
          {[-10, -3, 4, 11].map((ly) => (
            <line key={ly} x1={-9} x2={9} y1={ly} y2={ly} stroke={INK_SOFT} strokeWidth={1.6} />
          ))}
        </g>
      </Svg>
      <Tag x={paperX + 26} y={LANE_IBM - 74} at={publishedAt} dim={onlyAt - 4} size={21}>
        its papers, published
      </Tag>
      <Wire
        points={[
          [paperX, LANE_IBM + 12],
          [paperX, (LANE_IBM + LANE_CO) / 2],
          [sx(X, 1977.6), (LANE_IBM + LANE_CO) / 2],
          [sx(X, 1977.6), LANE_CO - 14],
        ]}
        at={readAt - 2}
        dur={18}
        dash="6 5"
        color={INK_SOFT}
        dim={onlyAt - 4}
      />

      {/* ── The launches ── */}
      <Dot x={sx(X, 1979)} y={LANE_CO} at={seventyNineAt - 2} color={ACCENT} r={13} swell={pulse(frame, buyAt - 2, 20)} />
      <Tag x={sx(X, 1979) + 24} y={LANE_CO - 52} at={oracleAt - 2} dim={onlyAt - 4} size={26} color={ACCENT_INK} weight={700}>
        Oracle, 1979
      </Tag>
      <Tag x={sx(X, 1979) + 24} y={LANE_CO + 20} at={firstAt - 2} dim={onlyAt - 4} size={21} color={INK}>
        the first SQL database <Mark at={buyAt - 2}>on sale</Mark>
      </Tag>
      <Dot x={sx(X, 1981)} y={LANE_IBM} at={eightyOneAt - 2} color={INK} />
      <Tag x={sx(X, 1981)} y={LANE_IBM + 20} at={eightyOneAt} dim={onlyAt - 4} size={21} color={INK} align="center">
        SQL/DS, 1981
      </Tag>
      <Dot x={sx(X, 1983)} y={LANE_IBM} at={eightyOneAt + 10} color={INK} />
      <Tag x={sx(X, 1983)} y={LANE_IBM + 20} at={eightyOneAt + 12} dim={onlyAt - 4} size={21} color={INK} align="center">
        DB2, 1983
      </Tag>

      {/* The same year: Codd's Turing Award, over IBM's lane. */}
      <Wire
        points={[
          [sx(X, 1981), LANE_IBM - 16],
          [sx(X, 1981), y(350)],
        ]}
        at={coddAt - 2}
        dur={12}
        head={false}
        dash="4 5"
        color={INK_SOFT}
        dim={onlyAt - 4}
      />
      <Tag x={sx(X, 1981) + 16} y={y(330)} at={turingAt - 4} dim={onlyAt - 4} size={22} color={INK} weight={650}>
        Codd wins the Turing Award
      </Tag>
      <Tag x={sx(X, 1973) + 26} y={LANE_UCB + 20} at={readingAt + 2} size={21} color={KEY_INK}>
        1973
      </Tag>
    </AbsoluteFill>
  );
};
