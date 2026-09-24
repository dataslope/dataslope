/**
 * Single-query SQL challenges over the league dataset.
 *
 * The thread through these is that a match is about two teams at once. A
 * row in `matches` names a home side and an away side, so any question about
 * one team has to look at both columns: join `teams` twice, stack the two
 * points of view with `UNION ALL`, or ask which side a player's team was on.
 * The other thread is the own goal, which is credited to one team's player
 * and counts for the other team, and which every goal-level question has to
 * handle on purpose.
 *
 * Ordered roughly from reading one match at a time (margins, scorelines) to
 * reading a season in order (unbeaten runs) and a match minute by minute
 * (comebacks).
 *
 * Every solution is executed against node:sqlite by
 * `__tests__/challengeSolutions`, so a wrong expectation fails CI.
 */

import { resultShape, sqlChallenge } from "./authoring";
import { LEAGUE } from "./dataset-league";
import type { Challenge, SqlChallengeTest } from "./types";

/**
 * `resultShape`, with an optional explanation on the row-count check: when
 * the count is where a trap shows, saying why reads better than a bare number.
 */
function shape(
  columns: string[],
  rowCount: number,
  matchNote: string,
  ordered: boolean,
  rowNote?: string,
): SqlChallengeTest[] {
  return resultShape(columns, rowCount, matchNote, ordered).map((t) =>
    t.id === "rowcount" && rowNote ? { ...t, description: rowNote } : t,
  );
}

/** Each match as two rows, one per team, with that team's goals for and against. */
const SIDES_CTE = `WITH sides AS (
  SELECT match_id, played_on, home_team_id AS team_id, 'home' AS venue,
         home_goals AS goals_for, away_goals AS goals_against
  FROM matches
  UNION ALL
  SELECT match_id, played_on, away_team_id, 'away',
         away_goals, home_goals
  FROM matches
)`;

export const SQL_LEAGUE: Challenge[] = [
  sqlChallenge(
    {
      slug: "top-scorers",
      title: "Top Scorers",
      difficulty: "Beginner",
      topic: "Filtering on a flag",
      dataset: LEAGUE,
      description: "Rank the season's goalscorers, not counting own goals.",
      solutionNote:
        "An own goal still has a scorer in the data, which is why it has to be filtered out rather than overlooked. Leave it in and Gareth Lowe, whose only goal went into his own net, appears as a scorer, and Felix Garrow is credited with three goals instead of two.",
    },
    {
      prompt: [
        "Who scored the most goals this season? Each row in `goals` names a `player_id`, but when `is_own_goal` is 1 the player put the ball into their own net, and it is not a goal to their name.",
        "Show the player, their team and their goal count, for every player with at least one goal. Most goals first; players level on goals in alphabetical order of name.",
      ],
      columns: [
        { name: "player_name", type: "text" },
        { name: "team_name", type: "text" },
        { name: "goals", type: "integer" },
      ],
      starter: `SELECT p.player_name, t.team_name, COUNT(*) AS goals
FROM goals g
JOIN players p ON p.player_id = g.player_id
JOIN teams   t ON t.team_id   = p.team_id
GROUP BY p.player_id, p.player_name, t.team_name
ORDER BY goals DESC, p.player_name
`,
      solution: `SELECT p.player_name, t.team_name, COUNT(*) AS goals
FROM goals g
JOIN players p ON p.player_id = g.player_id
JOIN teams   t ON t.team_id   = p.team_id
WHERE g.is_own_goal = 0
GROUP BY p.player_id, p.player_name, t.team_name
ORDER BY goals DESC, p.player_name`,
      tests: shape(
        ["player_name", "team_name", "goals"],
        17,
        "Own goals excluded, so Felix Garrow has two.",
        true,
        "Gareth Lowe's only goal was an own goal, so he is not on the list.",
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "comfortable-wins",
      title: "Comfortable Wins",
      difficulty: "Beginner",
      topic: "Joining a table twice",
      dataset: LEAGUE,
      description: "List the matches won by two goals or more, with both team names.",
      solutionNote:
        "Joining the same table twice under two aliases gives each foreign key its own copy of `teams` to look up. The margin needs `ABS()`: an away win makes `home_goals - away_goals` negative, so testing the raw difference misses Harlow Mere's 2-0 win at Stonecross.",
    },
    {
      prompt: [
        "List every match won by a margin of two goals or more. A match row holds two team ids, so `teams` has to be joined twice: once for the home side and once for the away side.",
        "Show the date, the home team, the away team, the score as home goals and away goals joined by a hyphen (like `3-1`), and the margin. Biggest margin first, then by date, then by home team.",
      ],
      columns: [
        { name: "played_on", type: "text" },
        { name: "home_team", type: "text" },
        { name: "away_team", type: "text" },
        { name: "score", type: "text" },
        { name: "margin", type: "integer" },
      ],
      starter: `SELECT m.played_on, h.team_name AS home_team, m.home_goals, m.away_goals
FROM matches m
JOIN teams h ON h.team_id = m.home_team_id
-- Join teams again for the away side.
ORDER BY m.played_on
`,
      solution: `SELECT m.played_on,
       h.team_name AS home_team,
       a.team_name AS away_team,
       m.home_goals || '-' || m.away_goals AS score,
       ABS(m.home_goals - m.away_goals) AS margin
FROM matches m
JOIN teams h ON h.team_id = m.home_team_id
JOIN teams a ON a.team_id = m.away_team_id
WHERE ABS(m.home_goals - m.away_goals) >= 2
ORDER BY margin DESC, m.played_on, home_team`,
      tests: shape(
        ["played_on", "home_team", "away_team", "score", "margin"],
        7,
        "Home and away wins alike, biggest margin first.",
        true,
        "Six home wins and one away win by two or more.",
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "common-scorelines",
      title: "Most Common Scorelines",
      difficulty: "Beginner",
      topic: "Normalising before grouping",
      dataset: LEAGUE,
      description: "Count how often each scoreline came up, whichever side won.",
      solutionNote:
        "Normalising before grouping is the whole trick: `MAX(home_goals, away_goals) || '-' || MIN(home_goals, away_goals)` turns 1-2 and 2-1 into the same string. With one argument, `MAX` is an aggregate over rows; with two or more, it compares values within a row.",
    },
    {
      prompt: [
        "How often did each scoreline come up this season? Count a 2-1 home win and a 1-2 away win as the same scoreline, written with the higher score first (`2-1`), so a draw is simply `1-1`.",
        "In SQLite, `MAX` and `MIN` with two arguments are ordinary functions that compare values within one row, not aggregates.",
        "Show the scoreline and the number of matches, most common first; scorelines with the same count in text order.",
      ],
      columns: [
        { name: "scoreline", type: "text" },
        { name: "matches", type: "integer" },
      ],
      starter: `SELECT home_goals || '-' || away_goals AS scoreline, COUNT(*) AS matches
FROM matches
GROUP BY scoreline
ORDER BY matches DESC, scoreline
`,
      solution: `SELECT MAX(home_goals, away_goals) || '-' || MIN(home_goals, away_goals) AS scoreline,
       COUNT(*) AS matches
FROM matches
GROUP BY scoreline
ORDER BY matches DESC, scoreline`,
      tests: shape(
        ["scoreline", "matches"],
        8,
        "Home and away versions of a scoreline counted together.",
        true,
        "1-0 and 0-1 are one scoreline, not two.",
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "clean-sheets",
      title: "Clean Sheets",
      difficulty: "Intermediate",
      topic: "Unpivoting with UNION ALL",
      dataset: LEAGUE,
      description: "Count the matches in which each team conceded nothing.",
      solutionNote:
        "Stacking the two points of view with `UNION ALL` turns each match into two rows, one per team, each with the goals that team conceded; every per-team question in this dataset gets easier from that shape. Counting with a `FILTER` (or a `CASE`), rather than filtering with `WHERE`, is what keeps Stonecross Albion on the list with 0.",
    },
    {
      prompt: [
        "A clean sheet is a match in which a team concedes no goals. A team can keep one at home, where it conceded the `away_goals`, or away, where it conceded the `home_goals`.",
        "Show every team with its number of clean sheets, including any team that never kept one. Most clean sheets first; teams level in alphabetical order.",
      ],
      columns: [
        { name: "team_name", type: "text" },
        { name: "clean_sheets", type: "integer" },
      ],
      starter: `SELECT t.team_name, COUNT(*) AS clean_sheets
FROM matches m
JOIN teams t ON t.team_id = m.home_team_id
WHERE m.away_goals = 0
GROUP BY t.team_id, t.team_name
ORDER BY clean_sheets DESC, t.team_name
`,
      solution: `${SIDES_CTE}
SELECT t.team_name,
       COUNT(*) FILTER (WHERE s.goals_against = 0) AS clean_sheets
FROM teams t
JOIN sides s ON s.team_id = t.team_id
GROUP BY t.team_id, t.team_name
ORDER BY clean_sheets DESC, t.team_name`,
      tests: shape(
        ["team_name", "clean_sheets"],
        6,
        "Home and away clean sheets together, and a 0 for Stonecross Albion.",
        true,
        "All six teams, including one that never kept a clean sheet.",
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "braces-and-hat-tricks",
      title: "Braces and Hat-Tricks",
      difficulty: "Intermediate",
      topic: "Grouping by two keys",
      dataset: LEAGUE,
      description: "Find every time a player scored two or more goals in a single match.",
      solutionNote:
        "The group is a player in a match, so both keys go in the `GROUP BY`; grouping by player alone counts the whole season, where nearly every forward reaches two. The own-goal filter matters here too: Felix Garrow scored at both ends on 28 September, and counting the own goal gives him a brace.",
    },
    {
      prompt: [
        "A brace is two goals by one player in one match; a hat-trick is three. List every brace or better this season: the player, their team, the date, the opponent and how many they scored. Own goals do not count towards anyone's tally.",
        "The opponent is whichever side of the match the player's team was not. Most goals first, then by date, then by player name.",
      ],
      columns: [
        { name: "player_name", type: "text" },
        { name: "team_name", type: "text" },
        { name: "played_on", type: "text" },
        { name: "opponent", type: "text" },
        { name: "goals", type: "integer" },
      ],
      starter: `SELECT p.player_name, COUNT(*) AS goals
FROM goals g
JOIN players p ON p.player_id = g.player_id
WHERE g.is_own_goal = 0
GROUP BY p.player_id, p.player_name
HAVING COUNT(*) >= 2
ORDER BY goals DESC, p.player_name
`,
      solution: `SELECT p.player_name, t.team_name, m.played_on,
       opp.team_name AS opponent,
       COUNT(*) AS goals
FROM goals g
JOIN players p ON p.player_id = g.player_id
JOIN teams   t ON t.team_id   = p.team_id
JOIN matches m ON m.match_id  = g.match_id
JOIN teams opp ON opp.team_id = CASE
                                  WHEN m.home_team_id = p.team_id THEN m.away_team_id
                                  ELSE m.home_team_id
                                END
WHERE g.is_own_goal = 0
GROUP BY g.match_id, p.player_id, p.player_name, t.team_name, m.played_on, opp.team_name
HAVING COUNT(*) >= 2
ORDER BY goals DESC, m.played_on, p.player_name`,
      tests: shape(
        ["player_name", "team_name", "played_on", "opponent", "goals"],
        5,
        "One hat-trick and four braces, own goals excluded.",
        true,
        "Counted per match, not per season.",
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "goals-by-time-band",
      title: "Goals by Time Band",
      difficulty: "Intermediate",
      topic: "Integer bucketing",
      dataset: LEAGUE,
      description: "Count the goals in each 15-minute band of a match, stoppage time included.",
      solutionNote:
        "Integer division buckets numbers, but only after shifting them to start at zero: `(minute - 1) / 15` puts minutes 1 to 15 in band 0 and 76 to 90 in band 5, where `minute / 15` pushes minutes 30, 45, 60 and 90 into the next band up. The two-argument `MIN(…, 5)` then folds stoppage time into the last band.",
    },
    {
      prompt: [
        "When do goals get scored? Split the 90 minutes into six bands of 15 (`1-15`, `16-30`, and so on up to `76-90`) and count the goals in each, own goals included.",
        "Stoppage time is recorded as minutes past 90: a goal in the second minute of added time is minute 92. Count those in the `76-90` band, not in a band of their own. Minute 15 belongs to `1-15` and minute 16 to `16-30`.",
        "Show the band's label and its number of goals, in match order.",
      ],
      columns: [
        { name: "band", type: "text" },
        { name: "goals", type: "integer" },
      ],
      starter: `SELECT minute / 15 AS band, COUNT(*) AS goals
FROM goals
GROUP BY band
ORDER BY band
`,
      solution: `SELECT printf('%d-%d', b * 15 + 1, b * 15 + 15) AS band,
       COUNT(*) AS goals
FROM (
  SELECT MIN((minute - 1) / 15, 5) AS b
  FROM goals
)
GROUP BY b
ORDER BY b`,
      tests: shape(
        ["band", "goals"],
        6,
        "Boundary minutes in the right band, stoppage time in 76-90.",
        true,
        "Six bands; stoppage time does not get a seventh.",
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "head-to-head",
      title: "Head to Head",
      difficulty: "Intermediate",
      topic: "Symmetric filters",
      dataset: LEAGUE,
      description:
        "Summarise the two meetings between the teams that finished level on points.",
      solutionNote:
        "Each condition has to allow either team: the home side is one of the two, and so is the away side. `home = 'Millbrook Rovers' AND away = 'Brackenridge Athletic'` finds only the fixture at Millbrook, while `OR` across the two columns finds every match either team played. Brackenridge win the head-to-head even though Millbrook scored more goals over the season.",
    },
    {
      prompt: [
        "Millbrook Rovers and Brackenridge Athletic finished the season level on points. Some leagues separate teams like that by their head-to-head record, so build it from the matches between the two of them, whichever was at home.",
        "Return one row per team with its wins, draws and losses in those meetings, and the goals it scored and conceded in them. Sort by team name.",
      ],
      columns: [
        { name: "team_name", type: "text" },
        { name: "won", type: "integer" },
        { name: "drawn", type: "integer" },
        { name: "lost", type: "integer" },
        { name: "goals_for", type: "integer" },
        { name: "goals_against", type: "integer" },
      ],
      starter: `SELECT h.team_name, m.home_goals, m.away_goals
FROM matches m
JOIN teams h ON h.team_id = m.home_team_id
JOIN teams a ON a.team_id = m.away_team_id
WHERE h.team_name = 'Millbrook Rovers'
  AND a.team_name = 'Brackenridge Athletic'
`,
      solution: `WITH meetings AS (
  SELECT m.home_team_id, m.away_team_id, m.home_goals, m.away_goals
  FROM matches m
  JOIN teams h ON h.team_id = m.home_team_id
  JOIN teams a ON a.team_id = m.away_team_id
  WHERE h.team_name IN ('Millbrook Rovers', 'Brackenridge Athletic')
    AND a.team_name IN ('Millbrook Rovers', 'Brackenridge Athletic')
), sides AS (
  SELECT home_team_id AS team_id, home_goals AS gf, away_goals AS ga FROM meetings
  UNION ALL
  SELECT away_team_id, away_goals, home_goals FROM meetings
)
SELECT t.team_name,
       SUM(s.gf > s.ga) AS won,
       SUM(s.gf = s.ga) AS drawn,
       SUM(s.gf < s.ga) AS lost,
       SUM(s.gf)        AS goals_for,
       SUM(s.ga)        AS goals_against
FROM sides s
JOIN teams t ON t.team_id = s.team_id
GROUP BY t.team_id, t.team_name
ORDER BY t.team_name`,
      tests: [
        ...shape(
          ["team_name", "won", "drawn", "lost", "goals_for", "goals_against"],
          2,
          "Both meetings, seen from each side.",
          true,
        ),
        {
          id: "record",
          name: "The record covers both fixtures",
          description: "A win and a draw for Brackenridge Athletic, 3 goals to 2.",
          expectedRows: {
            values: [
              ["Brackenridge Athletic", 1, 1, 0, 3, 2],
              ["Millbrook Rovers", 0, 1, 1, 2, 3],
            ],
            ordered: true,
          },
        },
      ],
    },
  ),

  sqlChallenge(
    {
      slug: "home-and-away-points",
      title: "Home and Away Points",
      difficulty: "Intermediate",
      topic: "Conditional aggregation",
      dataset: LEAGUE,
      description: "Split each team's points into those earned at home and those earned away.",
      solutionNote:
        "Once each match is two rows tagged `home` and `away`, the points rule is written once and the split is two filtered sums, `SUM(points) FILTER (WHERE venue = 'home')` and its twin. Written against `matches` directly, the rule has to be spelled out twice with the comparison flipped in the second copy, which is exactly where a sign slips.",
    },
    {
      prompt: [
        "A win is worth 3 points, a draw 1 and a defeat 0. For every team, show the points it earned in its home matches and in its away matches.",
        "Sort by team name.",
      ],
      columns: [
        { name: "team_name", type: "text" },
        { name: "home_points", type: "integer" },
        { name: "away_points", type: "integer" },
      ],
      starter: `SELECT t.team_name,
       SUM(CASE WHEN m.home_goals > m.away_goals THEN 3
                WHEN m.home_goals = m.away_goals THEN 1
                ELSE 0 END) AS home_points
FROM teams t
JOIN matches m ON m.home_team_id = t.team_id
GROUP BY t.team_id, t.team_name
ORDER BY t.team_name
`,
      solution: `${SIDES_CTE}, points AS (
  SELECT team_id, venue,
         CASE WHEN goals_for > goals_against THEN 3
              WHEN goals_for = goals_against THEN 1
              ELSE 0 END AS points
  FROM sides
)
SELECT t.team_name,
       SUM(p.points) FILTER (WHERE p.venue = 'home') AS home_points,
       SUM(p.points) FILTER (WHERE p.venue = 'away') AS away_points
FROM teams t
JOIN points p ON p.team_id = t.team_id
GROUP BY t.team_id, t.team_name
ORDER BY t.team_name`,
      tests: shape(
        ["team_name", "home_points", "away_points"],
        6,
        "Points split by venue; each pair adds up to the team's season total.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "longest-unbeaten-run",
      title: "Longest Unbeaten Run",
      difficulty: "Advanced",
      topic: "Gaps and islands",
      dataset: LEAGUE,
      description: "Find each team's longest run of league matches without a defeat.",
      solutionNote:
        "Every defeat starts a new island, so a running count of defeats labels the runs: all the matches between a team's second and third defeat share `defeats_so_far = 2`. Drop the defeats themselves, group by that label, and keep the biggest group. Counting all of a team's wins and draws instead gives Kestrel Bay United 9, although a defeat in September split their season into runs of 5 and 4.",
    },
    {
      prompt: [
        "An unbeaten run is a sequence of a team's consecutive matches, in date order, that it won or drew; the next defeat ends it. For each team, find its longest unbeaten run: how many matches it lasted, and the dates of its first and last match.",
        "If a team has two runs of the same length, report the earlier one. Longest run first; ties by team name.",
      ],
      columns: [
        { name: "team_name", type: "text" },
        { name: "unbeaten", type: "integer" },
        { name: "run_start", type: "text" },
        { name: "run_end", type: "text" },
      ],
      starter: `${SIDES_CTE}
SELECT t.team_name, COUNT(*) AS unbeaten
FROM sides s
JOIN teams t ON t.team_id = s.team_id
WHERE s.goals_for >= s.goals_against
GROUP BY t.team_id, t.team_name
ORDER BY unbeaten DESC, t.team_name
`,
      solution: `${SIDES_CTE}, marked AS (
  SELECT team_id, played_on,
         goals_for < goals_against AS lost,
         SUM(CASE WHEN goals_for < goals_against THEN 1 ELSE 0 END) OVER (
           PARTITION BY team_id
           ORDER BY played_on
           ROWS UNBOUNDED PRECEDING
         ) AS defeats_so_far
  FROM sides
), runs AS (
  SELECT team_id,
         COUNT(*) AS unbeaten,
         MIN(played_on) AS run_start,
         MAX(played_on) AS run_end
  FROM marked
  WHERE NOT lost
  GROUP BY team_id, defeats_so_far
), best AS (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY team_id
           ORDER BY unbeaten DESC, run_start
         ) AS rn
  FROM runs
)
SELECT t.team_name, b.unbeaten, b.run_start, b.run_end
FROM best b
JOIN teams t ON t.team_id = b.team_id
WHERE b.rn = 1
ORDER BY b.unbeaten DESC, t.team_name`,
      tests: shape(
        ["team_name", "unbeaten", "run_start", "run_end"],
        6,
        "Runs end at a defeat; Harlow Mere's lasts until the last-but-one match day.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "comeback-wins",
      title: "Comeback Wins",
      difficulty: "Advanced",
      topic: "Running totals",
      dataset: LEAGUE,
      description: "Find the matches won by a team that was behind at some point.",
      solutionNote:
        "Once each goal is credited to the right team, a running `SUM` over the match's goals, ordered by minute, gives the score after every goal, and a comeback is a win whose running goal difference dipped below zero. Two shortcuts fail on this data. Checking that the loser scored first misses Kestrel Bay United's 3-2, where they led, fell behind and won; crediting own goals to the scorer's team hides Millbrook Rovers' recovery from Felix Garrow's own goal.",
    },
    {
      prompt: [
        "A comeback is a win for a team that was losing at some point during the match. Replay each match goal by goal, in order of `minute`, keeping the running score.",
        "An own goal (`is_own_goal = 1`) counts for the team the scorer was playing against, not for the scorer's own team. No match has two goals in the same minute.",
        "Show the date, the home team, the away team, the final score as home and away goals joined by a hyphen (like `2-1`), and the winner. Sort by date, then home team.",
      ],
      columns: [
        { name: "played_on", type: "text" },
        { name: "home_team", type: "text" },
        { name: "away_team", type: "text" },
        { name: "score", type: "text" },
        { name: "winner", type: "text" },
      ],
      starter: `SELECT m.played_on,
       h.team_name AS home_team,
       a.team_name AS away_team,
       m.home_goals || '-' || m.away_goals AS score
FROM matches m
JOIN teams h ON h.team_id = m.home_team_id
JOIN teams a ON a.team_id = m.away_team_id
WHERE m.home_goals <> m.away_goals
ORDER BY m.played_on, home_team
`,
      solution: `WITH credited AS (
  SELECT g.match_id, g.minute,
         CASE
           WHEN g.is_own_goal = 0            THEN p.team_id
           WHEN p.team_id = m.home_team_id THEN m.away_team_id
           ELSE m.home_team_id
         END AS team_id,
         m.home_team_id
  FROM goals g
  JOIN players p ON p.player_id = g.player_id
  JOIN matches m ON m.match_id  = g.match_id
), running AS (
  SELECT match_id,
         SUM(CASE WHEN team_id = home_team_id THEN 1 ELSE -1 END) OVER (
           PARTITION BY match_id
           ORDER BY minute
           ROWS UNBOUNDED PRECEDING
         ) AS home_lead
  FROM credited
), extremes AS (
  SELECT match_id, MIN(home_lead) AS worst_home_lead, MAX(home_lead) AS best_home_lead
  FROM running
  GROUP BY match_id
)
SELECT m.played_on,
       h.team_name AS home_team,
       a.team_name AS away_team,
       m.home_goals || '-' || m.away_goals AS score,
       CASE WHEN m.home_goals > m.away_goals THEN h.team_name ELSE a.team_name END AS winner
FROM matches m
JOIN extremes e ON e.match_id = m.match_id
JOIN teams h ON h.team_id = m.home_team_id
JOIN teams a ON a.team_id = m.away_team_id
WHERE (m.home_goals > m.away_goals AND e.worst_home_lead < 0)
   OR (m.away_goals > m.home_goals AND e.best_home_lead  > 0)
ORDER BY m.played_on, home_team`,
      tests: shape(
        ["played_on", "home_team", "away_team", "score", "winner"],
        5,
        "Own goals credited to the other side; a draw from behind is not a comeback win.",
        true,
        "Five wins from behind this season.",
      ),
    },
  ),
];
