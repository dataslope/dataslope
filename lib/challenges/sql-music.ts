/**
 * Single-query SQL challenges over the music dataset.
 *
 * What ties these together is that a row in `plays` is not the same thing as
 * a listen. A play under 30 seconds is a skip, so nearly every question here
 * starts by deciding which plays count, and the answer changes with it: the
 * most-played track in a genre, whether an album was heard to the end, which
 * tracks nobody has finished. The boundary is deliberate too (one play is
 * exactly 30,000 ms), so `>=` and `>` give different answers.
 *
 * The rest is the shapes listening data takes: a first event per group
 * (discovery), a top row per group with a tie-break, relational division
 * (every track of an album), date bucketing by week, a share of a grand total,
 * and consecutive-day streaks.
 *
 * Every solution is executed against node:sqlite by
 * `__tests__/challengeSolutions`, so a wrong expectation fails CI.
 */

import { resultShape, sqlChallenge } from "./authoring";
import { MUSIC } from "./dataset-music";
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

export const SQL_MUSIC: Challenge[] = [
  sqlChallenge(
    {
      slug: "plays-per-track",
      title: "Plays per Track",
      difficulty: "Beginner",
      topic: "Filtering before grouping",
      dataset: MUSIC,
      description: "Count each track's full plays, leaving out the skips.",
      solutionNote:
        "The filter belongs in `WHERE`, so the skips are gone before `GROUP BY` counts anything. The boundary is the trap: `ms_played > 30000` drops the play of exactly 30,000 ms and leaves Paper Kites one play short.",
    },
    {
      prompt: [
        "A play shorter than 30 seconds is a skip, and a skip is not a listen. How many full plays has each track had?",
        "A full play is one with `ms_played >= 30000`, so a play of exactly 30 seconds counts. Show the track title, its artist and the number of full plays, for every track that has at least one.",
        "Most-played first; tracks with the same count in alphabetical order of title.",
      ],
      columns: [
        { name: "track_title", type: "text" },
        { name: "artist_name", type: "text" },
        { name: "plays", type: "integer" },
      ],
      starter: `SELECT t.track_title, ar.artist_name, COUNT(*) AS plays
FROM plays p
JOIN tracks  t  ON t.track_id   = p.track_id
JOIN albums  al ON al.album_id  = t.album_id
JOIN artists ar ON ar.artist_id = al.artist_id
-- Leave the skips out here.
GROUP BY t.track_id, t.track_title, ar.artist_name
ORDER BY plays DESC, t.track_title
`,
      solution: `SELECT t.track_title, ar.artist_name, COUNT(*) AS plays
FROM plays p
JOIN tracks  t  ON t.track_id   = p.track_id
JOIN albums  al ON al.album_id  = t.album_id
JOIN artists ar ON ar.artist_id = al.artist_id
WHERE p.ms_played >= 30000
GROUP BY t.track_id, t.track_title, ar.artist_name
ORDER BY plays DESC, t.track_title`,
      tests: shape(
        ["track_title", "artist_name", "plays"],
        18,
        "Skips excluded, and the play of exactly 30 seconds counted.",
        true,
        "Bloom Again has only ever been skipped, so it has no full plays to show.",
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "album-running-time",
      title: "Album Running Time",
      difficulty: "Beginner",
      topic: "String formatting",
      dataset: MUSIC,
      description:
        "Add up each album's track lengths and show the total as minutes and seconds.",
      solutionNote:
        "Integer division does the work: `SUM(duration_s) / 60` drops the remainder because both sides are integers, and `% 60` is that remainder. The `%02d` is the part that gets missed; with a plain `%d`, Low Tide Radio comes out as `7:5`.",
    },
    {
      prompt: [
        "Each track stores its length in whole seconds (`duration_s`). For every album, show the title, the artist, how many tracks it has and its total running time.",
        "Format the running time as `m:ss`, the way a music player shows it: `7:05`, not `7:5` and not `425`. `printf('%d:%02d', minutes, seconds)` pads the seconds to two digits, and integer division (`/ 60`) and the remainder (`% 60`) give you the two parts.",
        "Longest album first.",
      ],
      columns: [
        { name: "album_title", type: "text" },
        { name: "artist_name", type: "text" },
        { name: "tracks", type: "integer" },
        { name: "running_time", type: "text" },
      ],
      starter: `SELECT al.album_title, ar.artist_name, COUNT(*) AS tracks,
       SUM(t.duration_s) AS running_time  -- format this as m:ss
FROM albums al
JOIN artists ar ON ar.artist_id = al.artist_id
JOIN tracks  t  ON t.album_id   = al.album_id
GROUP BY al.album_id, al.album_title, ar.artist_name
ORDER BY SUM(t.duration_s) DESC
`,
      solution: `SELECT al.album_title, ar.artist_name, COUNT(*) AS tracks,
       printf('%d:%02d', SUM(t.duration_s) / 60, SUM(t.duration_s) % 60) AS running_time
FROM albums al
JOIN artists ar ON ar.artist_id = al.artist_id
JOIN tracks  t  ON t.album_id   = al.album_id
GROUP BY al.album_id, al.album_title, ar.artist_name
ORDER BY SUM(t.duration_s) DESC, al.album_title`,
      tests: shape(
        ["album_title", "artist_name", "tracks", "running_time"],
        7,
        "Running times as m:ss with two-digit seconds, longest album first.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "tracks-never-played-in-full",
      title: "Never Played in Full",
      difficulty: "Beginner",
      topic: "Anti joins",
      dataset: MUSIC,
      description: "Find the tracks nobody has listened to past the 30-second mark.",
      solutionNote:
        "The condition on `ms_played` has to live inside the `NOT EXISTS` (or in the `ON` clause of a `LEFT JOIN`), because it says which plays count. Put it in the outer `WHERE` after a `LEFT JOIN` and it throws away the very NULL rows the anti join was looking for, so nothing comes back at all; leave it out and Bloom Again, skipped once and never finished, goes missing.",
    },
    {
      prompt: [
        "Which tracks has no listener ever played in full? A play under 30 seconds (`ms_played < 30000`) is a skip, so a track that has only ever been skipped belongs on this list as much as one that nobody has started.",
        "Show the track title and its artist, sorted by title.",
      ],
      columns: [
        { name: "track_title", type: "text" },
        { name: "artist_name", type: "text" },
      ],
      starter: `SELECT t.track_title, ar.artist_name
FROM tracks t
JOIN albums  al ON al.album_id  = t.album_id
JOIN artists ar ON ar.artist_id = al.artist_id
-- Keep only the tracks with no full play.
ORDER BY t.track_title
`,
      solution: `SELECT t.track_title, ar.artist_name
FROM tracks t
JOIN albums  al ON al.album_id  = t.album_id
JOIN artists ar ON ar.artist_id = al.artist_id
WHERE NOT EXISTS (
  SELECT 1
  FROM plays p
  WHERE p.track_id = t.track_id
    AND p.ms_played >= 30000
)
ORDER BY t.track_title`,
      tests: shape(
        ["track_title", "artist_name"],
        2,
        "Pollen Count, which nobody has played, and Bloom Again, which has only been skipped.",
        true,
        "A track that was only ever skipped counts as never played in full.",
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "skip-rate-by-track",
      title: "Skip Rate by Track",
      difficulty: "Intermediate",
      topic: "Rates and percentages",
      dataset: MUSIC,
      description: "Work out what share of each track's plays were skips.",
      solutionNote:
        "In SQLite a comparison is an integer, 1 or 0, so `SUM(ms_played < 30000)` counts the skips in the same pass that `COUNT(*)` counts the plays. Multiply by `100.0` before dividing: with integers on both sides, `100 * 1 / 3` is 33 and `1 / 3 * 100` is 0.",
    },
    {
      prompt: [
        "For every track that has been played at least once, show how many times it was played, how many of those plays were skips (under 30 seconds), and the skip rate: skips as a percentage of plays, rounded to 1 decimal place.",
        "Highest skip rate first; tracks with the same rate in alphabetical order of title.",
      ],
      columns: [
        { name: "track_title", type: "text" },
        { name: "plays", type: "integer" },
        { name: "skips", type: "integer" },
        { name: "skip_pct", type: "real" },
      ],
      starter: `SELECT t.track_title, COUNT(*) AS plays
FROM plays p
JOIN tracks t ON t.track_id = p.track_id
GROUP BY t.track_id, t.track_title
ORDER BY t.track_title
`,
      solution: `SELECT t.track_title,
       COUNT(*) AS plays,
       SUM(p.ms_played < 30000) AS skips,
       ROUND(100.0 * SUM(p.ms_played < 30000) / COUNT(*), 1) AS skip_pct
FROM plays p
JOIN tracks t ON t.track_id = p.track_id
GROUP BY t.track_id, t.track_title
ORDER BY skip_pct DESC, t.track_title`,
      tests: shape(
        ["track_title", "plays", "skips", "skip_pct"],
        19,
        "Skips are plays under 30 seconds; rates to 1 decimal place.",
        true,
        "Every track with at least one play; Pollen Count has none.",
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "top-track-per-genre",
      title: "Top Track per Genre",
      difficulty: "Intermediate",
      topic: "Ranking with tie-breaks",
      dataset: MUSIC,
      description: "Pick the most-played track in each genre, breaking ties by title.",
      solutionNote:
        "`ROW_NUMBER()` numbers the tracks inside each genre, and its `ORDER BY` is where the tie-break lives: `plays DESC, track_title`. Folk is the test. Foghorn Waltz and Lamp Oil have two full plays each, so `RANK()` returns both, and counting Lamp Oil's skip hands it the genre outright.",
    },
    {
      prompt: [
        "For each genre, find the track with the most full plays. A full play lasts 30 seconds or more; skips do not count. Show the genre, the track title and its number of full plays.",
        "When two tracks in a genre are level, the one whose title comes first alphabetically wins, so there is exactly one row per genre. Sort by genre.",
      ],
      columns: [
        { name: "genre", type: "text" },
        { name: "track_title", type: "text" },
        { name: "plays", type: "integer" },
      ],
      starter: `WITH counts AS (
  SELECT t.genre, t.track_title, COUNT(*) AS plays
  FROM plays p
  JOIN tracks t ON t.track_id = p.track_id
  WHERE p.ms_played >= 30000
  GROUP BY t.track_id, t.genre, t.track_title
)
SELECT genre, track_title, plays
FROM counts
-- Keep only the top track in each genre.
ORDER BY genre
`,
      solution: `WITH counts AS (
  SELECT t.genre, t.track_title, COUNT(*) AS plays
  FROM plays p
  JOIN tracks t ON t.track_id = p.track_id
  WHERE p.ms_played >= 30000
  GROUP BY t.track_id, t.genre, t.track_title
), ranked AS (
  SELECT genre, track_title, plays,
         ROW_NUMBER() OVER (
           PARTITION BY genre
           ORDER BY plays DESC, track_title
         ) AS rn
  FROM counts
)
SELECT genre, track_title, plays
FROM ranked
WHERE rn = 1
ORDER BY genre`,
      tests: shape(
        ["genre", "track_title", "plays"],
        5,
        "One track per genre, and Folk's tie goes to Foghorn Waltz.",
        true,
        "Exactly one track per genre, even where two are level.",
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "new-listeners-per-week",
      title: "New Listeners per Week",
      difficulty: "Intermediate",
      topic: "Date bucketing",
      dataset: MUSIC,
      description: "Count sign-ups per Monday-to-Sunday week, with a running total.",
      solutionNote:
        "Bucketing by date means mapping every day to one representative day, here its week's Monday, and grouping on that. The running total is a window over the grouped rows, `SUM(COUNT(*)) OVER (ORDER BY week_start)`. `date(d, 'weekday 1')` looks as if it finds the Monday, but it moves forward, so it files every sign-up that is not on a Monday in the following week.",
    },
    {
      prompt: [
        "Group listeners by the week they signed up in, where a week runs Monday to Sunday and is labelled by the date of its Monday. Show that Monday, how many listeners signed up that week, and the running total of listeners up to and including that week.",
        "SQLite's date modifiers can find the Monday: `date(d, 'weekday 0')` moves a date forward to the next Sunday (or leaves it alone if it already is one), and `'-6 days'` then steps back to that week's Monday. Watch the listeners who signed up on a Sunday; they belong to the week that started six days earlier.",
        "Only weeks with at least one sign-up. Oldest week first.",
      ],
      columns: [
        { name: "week_start", type: "text" },
        { name: "new_listeners", type: "integer" },
        { name: "total_listeners", type: "integer" },
      ],
      starter: `SELECT signed_up_on AS week_start, COUNT(*) AS new_listeners
FROM listeners
GROUP BY week_start
ORDER BY week_start
`,
      solution: `WITH signups AS (
  SELECT date(signed_up_on, 'weekday 0', '-6 days') AS week_start
  FROM listeners
)
SELECT week_start,
       COUNT(*) AS new_listeners,
       SUM(COUNT(*)) OVER (ORDER BY week_start) AS total_listeners
FROM signups
GROUP BY week_start
ORDER BY week_start`,
      tests: shape(
        ["week_start", "new_listeners", "total_listeners"],
        6,
        "Weeks labelled by their Monday, with Sunday sign-ups in the week before.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "listening-share-by-genre",
      title: "Listening Share by Genre",
      difficulty: "Intermediate",
      topic: "Window totals",
      dataset: MUSIC,
      description: "Show each genre's minutes listened and its share of all listening.",
      solutionNote:
        "The denominator is a total over every group, which `GROUP BY` has already collapsed. A window over the aggregate brings it back: `SUM(SUM(ms_played)) OVER ()` is the grand total, repeated on every genre's row. Round only at the end; rounding the minutes first and dividing those makes the shares drift.",
    },
    {
      prompt: [
        "How is listening time split across genres? Count every millisecond played, skips included.",
        "For each genre, show the minutes listened (`ms_played` summed and divided by 60,000) rounded to 1 decimal place, and that genre's share of all listening time as a percentage, also rounded to 1 decimal place.",
        "Largest share first.",
      ],
      columns: [
        { name: "genre", type: "text" },
        { name: "minutes", type: "real" },
        { name: "share_pct", type: "real" },
      ],
      starter: `SELECT t.genre, ROUND(SUM(p.ms_played) / 60000.0, 1) AS minutes
FROM plays p
JOIN tracks t ON t.track_id = p.track_id
GROUP BY t.genre
ORDER BY minutes DESC
`,
      solution: `SELECT t.genre,
       ROUND(SUM(p.ms_played) / 60000.0, 1) AS minutes,
       ROUND(100.0 * SUM(p.ms_played) / SUM(SUM(p.ms_played)) OVER (), 1) AS share_pct
FROM plays p
JOIN tracks t ON t.track_id = p.track_id
GROUP BY t.genre
ORDER BY share_pct DESC, t.genre`,
      tests: shape(
        ["genre", "minutes", "share_pct"],
        5,
        "Minutes and shares to 1 decimal place, skips included.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "artist-discovery",
      title: "Artist Discovery",
      difficulty: "Intermediate",
      topic: "First event per group",
      dataset: MUSIC,
      description: "For each listener and artist, find the track they heard first.",
      solutionNote:
        "`MIN(played_at)` finds when, but not what: the track is another column of the same row, and grouping cannot pick it. `ROW_NUMBER()` over each listener and artist, ordered by `played_at`, keeps the whole first row. SQLite will hand back the matching row's other columns beside a lone `MIN()`, but that is a SQLite quirk, and it stops working the moment the query has a second aggregate.",
    },
    {
      prompt: [
        "A listener discovers an artist the first time they play anything by them, even if they skipped it. For every listener and every artist they have played, show the track that introduced them and when they played it.",
        "Sort by username, then by the time of discovery.",
      ],
      columns: [
        { name: "username", type: "text" },
        { name: "artist_name", type: "text" },
        { name: "track_title", type: "text" },
        { name: "discovered_at", type: "text" },
      ],
      starter: `SELECT l.username, ar.artist_name, MIN(p.played_at) AS discovered_at
FROM plays p
JOIN listeners l ON l.listener_id = p.listener_id
JOIN tracks    t ON t.track_id    = p.track_id
JOIN albums   al ON al.album_id   = t.album_id
JOIN artists  ar ON ar.artist_id  = al.artist_id
GROUP BY l.listener_id, ar.artist_id
ORDER BY l.username, discovered_at
`,
      solution: `WITH firsts AS (
  SELECT p.listener_id, al.artist_id, p.track_id, p.played_at,
         ROW_NUMBER() OVER (
           PARTITION BY p.listener_id, al.artist_id
           ORDER BY p.played_at
         ) AS rn
  FROM plays p
  JOIN tracks  t ON t.track_id  = p.track_id
  JOIN albums al ON al.album_id = t.album_id
)
SELECT l.username, ar.artist_name, t.track_title, f.played_at AS discovered_at
FROM firsts f
JOIN listeners l ON l.listener_id = f.listener_id
JOIN artists  ar ON ar.artist_id  = f.artist_id
JOIN tracks    t ON t.track_id    = f.track_id
WHERE f.rn = 1
ORDER BY l.username, f.played_at`,
      tests: shape(
        ["username", "artist_name", "track_title", "discovered_at"],
        21,
        "One row per listener and artist, on the first play of any track by that artist.",
        true,
        "Every listener and artist pair with at least one play, skips included.",
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "completed-albums",
      title: "Completed Albums",
      difficulty: "Advanced",
      topic: "Relational division",
      dataset: MUSIC,
      description: "Find the listeners who have heard every track of an album in full.",
      solutionNote:
        "This is relational division, and double negation reads it straight: keep the pair when there is no track on the album that the listener has no full play of. Counting works too, but only as `COUNT(DISTINCT track_id)` over full plays compared with the album's track count; a plain `COUNT(*)` credits tidepool with Salt and Citrus for playing Citrus twice.",
    },
    {
      prompt: [
        "Which listeners have played every track on an album all the way through? A track counts once the listener has at least one play of 30 seconds or more of it. Skips do not count, and playing one track twice does not make up for a track never played.",
        "Show the username and the album title, one row per listener and album they completed, sorted by username and then album title.",
      ],
      columns: [
        { name: "username", type: "text" },
        { name: "album_title", type: "text" },
      ],
      starter: `SELECT l.username, al.album_title
FROM listeners l
CROSS JOIN albums al
-- Keep a pair only when no track on the album is missing a full play.
ORDER BY l.username, al.album_title
`,
      solution: `SELECT l.username, al.album_title
FROM listeners l
CROSS JOIN albums al
WHERE NOT EXISTS (
  SELECT 1
  FROM tracks t
  WHERE t.album_id = al.album_id
    AND NOT EXISTS (
      SELECT 1
      FROM plays p
      WHERE p.listener_id = l.listener_id
        AND p.track_id    = t.track_id
        AND p.ms_played  >= 30000
    )
)
ORDER BY l.username, al.album_title`,
      tests: shape(
        ["username", "album_title"],
        6,
        "Skips and replays of the same track do not complete an album.",
        true,
        "Six completed albums across four listeners.",
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "longest-listening-streak",
      title: "Longest Listening Streak",
      difficulty: "Advanced",
      topic: "Gaps and islands",
      dataset: MUSIC,
      description:
        "Find each listener's longest run of consecutive days with at least one play.",
      solutionNote:
        "The gaps-and-islands trick: number each listener's days in order and subtract the number from the date. Consecutive days keep the same difference, so each streak becomes one group. The days must be made distinct first; numbering plays rather than days breaks the arithmetic on any day with two plays.",
    },
    {
      prompt: [
        "A listener is on a streak for as long as they play something every calendar day. Any play counts, skips included; use the date part of `played_at`.",
        "For each listener who has played anything, find their longest streak: how many days it lasted and its first and last day. If a listener has two streaks of the same length, report the earlier one.",
        "Longest streak first; ties by username.",
      ],
      columns: [
        { name: "username", type: "text" },
        { name: "streak_days", type: "integer" },
        { name: "started_on", type: "text" },
        { name: "ended_on", type: "text" },
      ],
      starter: `SELECT l.username, COUNT(DISTINCT date(p.played_at)) AS streak_days
FROM plays p
JOIN listeners l ON l.listener_id = p.listener_id
GROUP BY l.listener_id, l.username
ORDER BY streak_days DESC, l.username
`,
      solution: `WITH days AS (
  SELECT DISTINCT listener_id, date(played_at) AS day
  FROM plays
), islands AS (
  SELECT listener_id, day,
         julianday(day)
           - ROW_NUMBER() OVER (PARTITION BY listener_id ORDER BY day) AS grp
  FROM days
), streaks AS (
  SELECT listener_id,
         COUNT(*) AS streak_days,
         MIN(day) AS started_on,
         MAX(day) AS ended_on
  FROM islands
  GROUP BY listener_id, grp
), best AS (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY listener_id
           ORDER BY streak_days DESC, started_on
         ) AS rn
  FROM streaks
)
SELECT l.username, b.streak_days, b.started_on, b.ended_on
FROM best b
JOIN listeners l ON l.listener_id = b.listener_id
WHERE b.rn = 1
ORDER BY b.streak_days DESC, l.username`,
      tests: shape(
        ["username", "streak_days", "started_on", "ended_on"],
        7,
        "Consecutive calendar days; lunapark's late session makes 6 March a listening day.",
        true,
        "Every listener who has played something; nightjar has not.",
      ),
    },
  ),
];
