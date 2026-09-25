/**
 * The league dataset: one season of a six-team football league.
 *
 * Every team plays every other team twice, once at home and once away: ten
 * Saturdays, thirty matches. `matches` holds the final score; `goals` holds
 * one row per goal with the minute and the player who scored it, and the two
 * always agree. A goal with `is_own_goal = 1` was scored by `player_id`
 * into their own net, so it counts for the *other* team in that match. That
 * one rule is behind most of the traps below.
 *
 * What it is for, and the edge cases put in on purpose:
 *
 * - **Every question about a team needs both sides of a match.** A team
 *   appears as `home_team_id` in five rows and `away_team_id` in five, so a
 *   per-team figure has to read both columns (usually by stacking the two
 *   perspectives with `UNION ALL`).
 * - **Draws**, including **two 0-0s**, and **a team with no wins at all**
 *   (Stonecross Albion) and **no clean sheets**, which must still appear as
 *   zeros in per-team reports.
 * - **Two teams level on points and goal difference** (Millbrook Rovers and
 *   Brackenridge Athletic, 12 points and -2 each), separated only by goals
 *   scored. Alphabetical order would put them the wrong way round, so a table
 *   that skips the goals-for tie-break is visibly wrong.
 * - **Own goals.** Felix Garrow scores into his own net and, in the same
 *   match, at the right end, so counting own goals as the scorer's gives him
 *   a brace he never scored. Gareth Lowe's only goal of the season is an own
 *   goal, so he is not a scorer at all.
 * - **One hat-trick** (Jonah Whitlock, 31 August), and several braces.
 * - **Comebacks.** Five matches are won by a team that was behind at some
 *   point. One of them only counts once the own goal is credited to the right
 *   side; in another the eventual winner scored first, fell behind and came
 *   back, so "the loser scored first" is not the test. Two near misses sit
 *   beside them: a team that trailed and only drew, and a winner that was
 *   pegged back to level but never behind.
 * - **Stoppage time** is recorded as minutes past 90 (92, 93, 94), so any
 *   bucketing by minute needs a place to put them.
 * - **Unbeaten runs** of different lengths: Harlow Mere go nine matches
 *   without defeat and lose only on the final day.
 */

import type { ChallengeDataset } from "./datasets";

const LEAGUE_SQL = `
CREATE TABLE teams (
  team_id   INTEGER PRIMARY KEY,
  team_name TEXT    NOT NULL,
  founded   INTEGER NOT NULL
);
INSERT INTO teams VALUES
  (1, 'Brackenridge Athletic', 1894),
  (2, 'Harlow Mere',           1907),
  (3, 'Kestrel Bay United',    1889),
  (4, 'Millbrook Rovers',      1921),
  (5, 'Oakhaven City',         1899),
  (6, 'Stonecross Albion',     1932);

CREATE TABLE players (
  player_id   INTEGER PRIMARY KEY,
  player_name TEXT    NOT NULL,
  team_id     INTEGER NOT NULL REFERENCES teams(team_id),
  position    TEXT    NOT NULL
);
INSERT INTO players VALUES
  (1,  'Tomas Rudd',     1, 'FW'),
  (2,  'Callum Pryce',   1, 'MF'),
  (3,  'Elias Norgaard', 1, 'DF'),
  (4,  'Jonah Whitlock', 2, 'FW'),
  (5,  'Rafe Donnelly',  2, 'MF'),
  (6,  'Samir Oduya',    2, 'DF'),
  (7,  'Luca Brennock',  3, 'FW'),
  (8,  'Owen Tasker',    3, 'MF'),
  (9,  'Dario Vell',     3, 'DF'),
  (10, 'Kieran Holt',    4, 'FW'),
  (11, 'Mateo Sarn',     4, 'MF'),
  (12, 'Felix Garrow',   4, 'DF'),
  (13, 'Idris Callan',   5, 'FW'),
  (14, 'Niko Havel',     5, 'MF'),
  (15, 'Ben Aldous',     5, 'DF'),
  (16, 'Arlo Fenwick',   6, 'FW'),
  (17, 'Yusuf Tamber',   6, 'MF'),
  (18, 'Gareth Lowe',    6, 'DF');

CREATE TABLE matches (
  match_id     INTEGER PRIMARY KEY,
  played_on    TEXT    NOT NULL,
  home_team_id INTEGER NOT NULL REFERENCES teams(team_id),
  away_team_id INTEGER NOT NULL REFERENCES teams(team_id),
  home_goals   INTEGER NOT NULL,
  away_goals   INTEGER NOT NULL
);
INSERT INTO matches VALUES
  ( 1, '2024-08-17', 1, 6, 1, 1),
  ( 2, '2024-08-17', 2, 5, 1, 0),
  ( 3, '2024-08-17', 3, 4, 2, 0),
  ( 4, '2024-08-24', 5, 1, 3, 1),
  ( 5, '2024-08-24', 6, 4, 0, 1),
  ( 6, '2024-08-24', 3, 2, 1, 1),
  ( 7, '2024-08-31', 1, 4, 2, 1),
  ( 8, '2024-08-31', 5, 3, 0, 0),
  ( 9, '2024-08-31', 2, 6, 3, 0),
  (10, '2024-09-07', 3, 1, 2, 1),
  (11, '2024-09-07', 4, 2, 1, 1),
  (12, '2024-09-07', 6, 5, 0, 1),
  (13, '2024-09-14', 1, 2, 0, 1),
  (14, '2024-09-14', 6, 3, 0, 1),
  (15, '2024-09-14', 4, 5, 1, 2),
  (16, '2024-09-21', 6, 1, 1, 1),
  (17, '2024-09-21', 5, 2, 0, 0),
  (18, '2024-09-21', 4, 3, 1, 0),
  (19, '2024-09-28', 1, 5, 1, 0),
  (20, '2024-09-28', 4, 6, 3, 1),
  (21, '2024-09-28', 2, 3, 1, 1),
  (22, '2024-10-05', 4, 1, 1, 1),
  (23, '2024-10-05', 3, 5, 3, 2),
  (24, '2024-10-05', 6, 2, 0, 2),
  (25, '2024-10-12', 1, 3, 0, 1),
  (26, '2024-10-12', 2, 4, 2, 0),
  (27, '2024-10-12', 5, 6, 2, 0),
  (28, '2024-10-19', 2, 1, 0, 1),
  (29, '2024-10-19', 3, 6, 1, 0),
  (30, '2024-10-19', 5, 4, 1, 1);

CREATE TABLE goals (
  goal_id     INTEGER PRIMARY KEY,
  match_id    INTEGER NOT NULL REFERENCES matches(match_id),
  player_id   INTEGER NOT NULL REFERENCES players(player_id),
  minute      INTEGER NOT NULL,
  is_own_goal INTEGER NOT NULL
);
INSERT INTO goals VALUES
  ( 1,  1,  1, 34, 0),
  ( 2,  1, 16, 71, 0),
  ( 3,  2,  5, 58, 0),
  ( 4,  3,  7, 12, 0),
  ( 5,  3,  8, 77, 0),
  ( 6,  4,  2,  9, 0),
  ( 7,  4, 13, 40, 0),
  ( 8,  4, 13, 63, 0),
  ( 9,  4, 14, 92, 0),
  (10,  5, 10, 81, 0),
  (11,  6,  4, 30, 0),
  (12,  6,  9, 67, 0),
  (13,  7,  1, 18, 0),
  (14,  7, 11, 49, 0),
  (15,  7,  3, 88, 0),
  (16,  9,  4,  6, 0),
  (17,  9,  4, 39, 0),
  (18,  9,  4, 72, 0),
  (19, 10,  1, 14, 0),
  (20, 10,  7, 55, 0),
  (21, 10,  7, 83, 0),
  (22, 11, 12, 44, 0),
  (23, 11,  5, 90, 0),
  (24, 12, 14, 27, 0),
  (25, 13,  4, 64, 0),
  (26, 14,  8,  3, 0),
  (27, 15, 10, 21, 0),
  (28, 15, 15, 56, 0),
  (29, 15, 13, 79, 0),
  (30, 16,  2, 31, 0),
  (31, 16, 17, 86, 0),
  (32, 18, 10, 47, 0),
  (33, 19,  1, 93, 0),
  (34, 20, 12, 11, 1),
  (35, 20, 10, 38, 0),
  (36, 20, 12, 60, 0),
  (37, 20, 10, 74, 0),
  (38, 21,  7, 16, 0),
  (39, 21,  4, 52, 0),
  (40, 22,  2, 29, 0),
  (41, 22, 11, 68, 0),
  (42, 23,  7,  8, 0),
  (43, 23, 13, 33, 0),
  (44, 23, 14, 51, 0),
  (45, 23,  8, 67, 0),
  (46, 23,  7, 89, 0),
  (47, 24,  6, 45, 0),
  (48, 24,  5, 78, 0),
  (49, 25,  9, 70, 0),
  (50, 26,  5, 19, 0),
  (51, 26,  4, 61, 0),
  (52, 27, 18, 36, 1),
  (53, 27, 13, 82, 0),
  (54, 28,  3, 57, 0),
  (55, 29,  8, 94, 0),
  (56, 30, 10, 13, 0),
  (57, 30, 13, 76, 0);
`;

export const LEAGUE: ChallengeDataset = {
  initSql: LEAGUE_SQL,
  schema: [
    {
      name: "matches",
      rows: "30",
      columns: [
        { name: "match_id", type: "integer", key: "pk" },
        { name: "played_on", type: "text" },
        { name: "home_team_id", type: "integer", key: "fk" },
        { name: "away_team_id", type: "integer", key: "fk" },
        { name: "home_goals", type: "integer" },
        { name: "away_goals", type: "integer" },
      ],
    },
    {
      name: "goals",
      rows: "57",
      columns: [
        { name: "goal_id", type: "integer", key: "pk" },
        { name: "match_id", type: "integer", key: "fk" },
        { name: "player_id", type: "integer", key: "fk" },
        { name: "minute", type: "integer" },
        { name: "is_own_goal", type: "integer" },
      ],
    },
    {
      name: "players",
      rows: "18",
      columns: [
        { name: "player_id", type: "integer", key: "pk" },
        { name: "player_name", type: "text" },
        { name: "team_id", type: "integer", key: "fk" },
        { name: "position", type: "text" },
      ],
    },
    {
      name: "teams",
      rows: "6",
      columns: [
        { name: "team_id", type: "integer", key: "pk" },
        { name: "team_name", type: "text" },
        { name: "founded", type: "integer" },
      ],
    },
  ],
};
