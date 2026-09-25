/**
 * Multi-step SQL challenge over the league dataset: the league table.
 *
 * Every figure in a league table is about one team, but every row in
 * `matches` is about two. The build therefore starts by unpivoting each match
 * into one row per team, rolls those up into standings, and only then orders
 * them, because the order is where this season's data bites: two teams finish
 * level on points and on goal difference, and only goals scored separates
 * them, in the opposite order to their names.
 *
 * Later steps quote the earlier accepted query inside a `WITH`, like
 * `sql-multi-library.ts`. `__tests__/challengeSolutions` runs every step's
 * solution against node:sqlite.
 */

import { indentSql, resultShape, sqlSteps } from "./authoring";
import { LEAGUE } from "./dataset-league";
import type { Challenge } from "./types";

const TEAM_RESULTS = `WITH sides AS (
  SELECT match_id, played_on, home_team_id AS team_id, 'home' AS venue,
         home_goals AS goals_for, away_goals AS goals_against
  FROM matches
  UNION ALL
  SELECT match_id, played_on, away_team_id, 'away',
         away_goals, home_goals
  FROM matches
)
SELECT s.match_id, s.played_on, t.team_name, s.venue,
       s.goals_for, s.goals_against,
       CASE
         WHEN s.goals_for > s.goals_against THEN 'W'
         WHEN s.goals_for = s.goals_against THEN 'D'
         ELSE 'L'
       END AS result
FROM sides s
JOIN teams t ON t.team_id = s.team_id
ORDER BY s.match_id, t.team_name`;

const STANDINGS = `WITH results AS (
${indentSql(TEAM_RESULTS)}
)
SELECT team_name,
       COUNT(*)                                 AS played,
       SUM(result = 'W')                        AS won,
       SUM(result = 'D')                        AS drawn,
       SUM(result = 'L')                        AS lost,
       SUM(goals_for)                           AS goals_for,
       SUM(goals_against)                       AS goals_against,
       SUM(goals_for) - SUM(goals_against)      AS goal_diff,
       3 * SUM(result = 'W') + SUM(result = 'D') AS points
FROM results
GROUP BY team_name
ORDER BY team_name`;

const FINAL_TABLE = `WITH standings AS (
${indentSql(STANDINGS)}
)
SELECT ROW_NUMBER() OVER (
         ORDER BY points DESC, goal_diff DESC, goals_for DESC, team_name
       ) AS position,
       team_name, played, won, drawn, lost,
       goals_for, goals_against, goal_diff, points
FROM standings
ORDER BY position`;

const STANDING_COLUMNS = [
  "team_name",
  "played",
  "won",
  "drawn",
  "lost",
  "goals_for",
  "goals_against",
  "goal_diff",
  "points",
];

const LEAGUE_TABLE = sqlSteps(
  {
    slug: "league-table",
    title: "League Table",
    difficulty: "Intermediate",
    topic: "Unpivoting and ranking",
    dataset: LEAGUE,
    description:
      "Build the season's league table from match results, tie-breaks and all.",
    solutionNote:
      "Unpivoting once, in step 1, is what turns a table about matches into one about teams, and after that the standings are a plain `GROUP BY`. The final order needs the whole chain of tie-breaks: points and goal difference alone leave fourth and fifth place to chance, and adding the name as the next key puts them the wrong way round.",
  },
  [
    {
      title: "One row per team per match",
      short: "Results",
      solutionNote:
        "`UNION ALL` stacks the home view of every match on the away view, swapping which column is 'for' and which is 'against'. It is `UNION ALL` rather than `UNION` because there is nothing to remove: `UNION` would sort sixty rows looking for duplicates that cannot exist.",
      prompt: [
        "A match row describes two teams at once, which is awkward for a table with one row per team. Turn each match into two rows, one from each team's point of view: the match id, the date, the team, whether it played `home` or `away`, the goals it scored and conceded, and its result as `W`, `D` or `L`.",
        "Sixty rows for thirty matches. Sort by match id, then team name.",
      ],
      columns: [
        { name: "match_id", type: "integer" },
        { name: "played_on", type: "text" },
        { name: "team_name", type: "text" },
        { name: "venue", type: "text" },
        { name: "goals_for", type: "integer" },
        { name: "goals_against", type: "integer" },
        { name: "result", type: "text" },
      ],
      starter: `SELECT m.match_id, m.played_on, t.team_name, 'home' AS venue,
       m.home_goals AS goals_for, m.away_goals AS goals_against
FROM matches m
JOIN teams t ON t.team_id = m.home_team_id
-- The away side's rows belong here too.
ORDER BY m.match_id, t.team_name
`,
      solution: TEAM_RESULTS,
      tests: resultShape(
        [
          "match_id",
          "played_on",
          "team_name",
          "venue",
          "goals_for",
          "goals_against",
          "result",
        ],
        60,
        "Each match seen from both sides, with the goals swapped for the away team.",
        true,
      ).map((t) =>
        t.id === "rowcount"
          ? { ...t, description: "Two rows per match: one for each team." }
          : t,
      ),
    },
    {
      title: "Standings",
      short: "Standings",
      solutionNote:
        "With one row per team per match, the table is a single `GROUP BY` of sums: each result becomes a 1 or a 0 through a comparison, and points are `3 * won + drawn`. Against `matches` directly, every one of these columns would need a `CASE` for each side of the match.",
      prompt: [
        "Roll the results up into one row per team: matches played, won, drawn and lost, goals for and against, goal difference (for minus against), and points, with 3 for a win and 1 for a draw.",
        "Sort by team name for now; ordering the table is the next step.",
      ],
      columns: STANDING_COLUMNS.map((name) => ({
        name,
        type: name === "team_name" ? "text" : "integer",
      })),
      starter: `WITH results AS (
${indentSql(TEAM_RESULTS)}
)
SELECT team_name, COUNT(*) AS played
FROM results
GROUP BY team_name
ORDER BY team_name
`,
      solution: STANDINGS,
      tests: resultShape(
        STANDING_COLUMNS,
        6,
        "Every team has played ten, and the points add up from wins and draws.",
        true,
      ),
    },
    {
      title: "Final positions",
      short: "Positions",
      solutionNote:
        "The window's `ORDER BY` is the league's rulebook, one tie-break per term. Millbrook Rovers and Brackenridge Athletic both finish on 12 points with a goal difference of -2; Millbrook are fourth only because they scored 10 goals to Brackenridge's 9, and stopping at goal difference lets the name put them the wrong way round.",
      prompt: [
        "Order the table the way the league does: most points first; teams level on points by goal difference, then by goals scored, and only then alphabetically by name. Add a `position` column numbering the teams 1 to 6 in that order.",
        "Return the position followed by the step 2 columns, sorted by position.",
      ],
      columns: [
        { name: "position", type: "integer" },
        ...STANDING_COLUMNS.map((name) => ({
          name,
          type: name === "team_name" ? "text" : "integer",
        })),
      ],
      starter: `WITH standings AS (
${indentSql(STANDINGS)}
)
SELECT *
FROM standings
ORDER BY points DESC
`,
      solution: FINAL_TABLE,
      tests: [
        ...resultShape(
          ["position", ...STANDING_COLUMNS],
          6,
          "Points, then goal difference, then goals scored, then name.",
          true,
        ),
        {
          id: "tiebreak",
          name: "The final table, Millbrook Rovers above Brackenridge Athletic",
          description: "Level on points and goal difference; goals scored decides.",
          expectedRows: {
            values: [
              [1, "Kestrel Bay United", 10, 6, 3, 1, 12, 6, 6, 21],
              [2, "Harlow Mere", 10, 5, 4, 1, 12, 4, 8, 19],
              [3, "Oakhaven City", 10, 4, 3, 3, 11, 8, 3, 15],
              [4, "Millbrook Rovers", 10, 3, 3, 4, 10, 12, -2, 12],
              [5, "Brackenridge Athletic", 10, 3, 3, 4, 9, 11, -2, 12],
              [6, "Stonecross Albion", 10, 0, 2, 8, 3, 16, -13, 2],
            ],
            ordered: true,
          },
        },
      ],
    },
  ],
);

export const SQL_MULTI_LEAGUE: Challenge[] = [LEAGUE_TABLE];
