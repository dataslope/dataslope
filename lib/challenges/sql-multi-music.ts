/**
 * Multi-step SQL challenges over the music dataset.
 *
 * Both build a report the way it would be built for real: a per-row
 * measurement first, a grouping or ranking on top of it, and the answer last.
 * Each final step is something a one-shot query tends to get subtly wrong.
 * The recap has to carry a listener with no plays through a `LEFT JOIN`, a
 * ranking and a `CASE` without losing or mislabelling them; the sessions have
 * to be cut by the pauses between plays, not by the calendar, because one
 * session runs past midnight and one morning holds two.
 *
 * Later steps quote the earlier accepted query inside a `WITH`, so each step
 * reads as the previous answer plus one idea. `__tests__/challengeSolutions`
 * runs every step's solution against node:sqlite.
 */

import { indentSql, resultShape, sqlSteps } from "./authoring";
import { MUSIC } from "./dataset-music";
import type { Challenge } from "./types";

// ─── Listening recap ─────────────────────────────────────────────────

const RECAP_TOTALS = `SELECT l.listener_id, l.username,
       COUNT(CASE WHEN p.ms_played >= 30000 THEN 1 END) AS full_plays,
       ROUND(COALESCE(SUM(p.ms_played), 0) / 60000.0, 1) AS minutes,
       COUNT(DISTINCT CASE WHEN p.ms_played >= 30000 THEN al.artist_id END) AS artists
FROM listeners l
LEFT JOIN plays  p  ON p.listener_id = l.listener_id
LEFT JOIN tracks t  ON t.track_id    = p.track_id
LEFT JOIN albums al ON al.album_id   = t.album_id
GROUP BY l.listener_id, l.username
ORDER BY l.username`;

const RECAP_TOP_ARTIST = `WITH totals AS (
${indentSql(RECAP_TOTALS)}
), by_artist AS (
  SELECT p.listener_id, ar.artist_name, SUM(p.ms_played) AS ms
  FROM plays p
  JOIN tracks  t  ON t.track_id   = p.track_id
  JOIN albums  al ON al.album_id  = t.album_id
  JOIN artists ar ON ar.artist_id = al.artist_id
  GROUP BY p.listener_id, ar.artist_id, ar.artist_name
), ranked AS (
  SELECT listener_id, artist_name,
         ROUND(100.0 * ms / SUM(ms) OVER (PARTITION BY listener_id), 1) AS share_pct,
         ROW_NUMBER() OVER (
           PARTITION BY listener_id
           ORDER BY ms DESC, artist_name
         ) AS rn
  FROM by_artist
)
SELECT t.listener_id, t.username, t.full_plays, t.minutes, t.artists,
       r.artist_name AS top_artist,
       r.share_pct   AS top_share_pct
FROM totals t
LEFT JOIN ranked r ON r.listener_id = t.listener_id AND r.rn = 1
ORDER BY t.username`;

const RECAP_PERSONAS = `WITH recap AS (
${indentSql(RECAP_TOP_ARTIST)}
)
SELECT username, minutes, top_artist, top_share_pct,
       CASE
         WHEN top_artist IS NULL  THEN 'Newcomer'
         WHEN top_share_pct >= 60 THEN 'Devotee'
         WHEN minutes < 20        THEN 'Casual'
         ELSE 'Explorer'
       END AS persona
FROM recap
ORDER BY username`;

const LISTENING_RECAP = sqlSteps(
  {
    slug: "listening-recap",
    title: "Listening Recap",
    difficulty: "Intermediate",
    topic: "Top item per group",
    dataset: MUSIC,
    description:
      "Build a per-listener recap with a top artist and a persona, keeping the listener who has played nothing.",
    solutionNote:
      "The recap is only right if the listener with no plays survives every stage: a `LEFT JOIN` in step 1, the `rn = 1` condition in the join rather than the `WHERE` in step 2, and a `CASE` branch of their own, placed first, in step 3. Miss either of the first two and the report quietly covers seven listeners out of eight; miss the third and it calls a listener who has played nothing `Casual`.",
  },
  [
    {
      title: "Totals per listener",
      short: "Totals",
      solutionNote:
        "`LEFT JOIN` keeps nightjar, and each aggregate then has to cope with the one all-NULL row it manufactures. `COUNT(expr)` and `COUNT(DISTINCT expr)` skip NULLs and give 0; `SUM` gives NULL, hence the `COALESCE`. `COUNT(*)` counts the empty row and credits nightjar with a play.",
      prompt: [
        "Start the recap with one row per listener: their `listener_id` and `username`, how many full plays they have (30 seconds or more), how many minutes they have listened in total, and how many different artists they have heard in full.",
        "Minutes count every play, skips included: `ms_played` summed, divided by 60,000 and rounded to 1 decimal place.",
        "Every listener appears, including anyone who has not played anything yet: they get zeros, not a missing row. Sort by username.",
      ],
      columns: [
        { name: "listener_id", type: "integer" },
        { name: "username", type: "text" },
        { name: "full_plays", type: "integer" },
        { name: "minutes", type: "real" },
        { name: "artists", type: "integer" },
      ],
      starter: `SELECT l.listener_id, l.username, COUNT(*) AS full_plays
FROM listeners l
JOIN plays p ON p.listener_id = l.listener_id
GROUP BY l.listener_id, l.username
ORDER BY l.username
`,
      solution: RECAP_TOTALS,
      tests: resultShape(
        ["listener_id", "username", "full_plays", "minutes", "artists"],
        8,
        "Every listener, with nightjar on zeros.",
        true,
      ).map((t) =>
        t.id === "rowcount"
          ? { ...t, description: "nightjar has no plays and must still appear." }
          : t,
      ),
    },
    {
      title: "Each listener's top artist",
      short: "Top artist",
      solutionNote:
        "The top artist is a first-row-per-group problem: `ROW_NUMBER()` per listener, ordered by listening time and then by name. The `rn = 1` condition goes in the `LEFT JOIN`'s `ON` clause. In `WHERE` it would discard nightjar, whose joined row has `rn` NULL.",
      prompt: [
        "Add each listener's top artist: the one they have spent the most listening time on (every play, skips included), with a tie going to the artist whose name comes first alphabetically.",
        "Add `top_share_pct` too: that artist's share of the listener's total listening time, as a percentage rounded to 1 decimal place.",
        "A listener with no plays has no top artist. Leave both new columns NULL for them and keep the row. Sort by username.",
      ],
      columns: [
        { name: "listener_id", type: "integer" },
        { name: "username", type: "text" },
        { name: "full_plays", type: "integer" },
        { name: "minutes", type: "real" },
        { name: "artists", type: "integer" },
        { name: "top_artist", type: "text" },
        { name: "top_share_pct", type: "real" },
      ],
      starter: `WITH totals AS (
${indentSql(RECAP_TOTALS)}
)
SELECT t.*
FROM totals t
ORDER BY t.username
`,
      solution: RECAP_TOP_ARTIST,
      tests: resultShape(
        [
          "listener_id",
          "username",
          "full_plays",
          "minutes",
          "artists",
          "top_artist",
          "top_share_pct",
        ],
        8,
        "One top artist per listener, and NULLs for nightjar.",
        true,
      ),
    },
    {
      title: "Label each listener",
      short: "Label",
      solutionNote:
        "A `CASE` stops at the first `WHEN` that is true, so the order of the branches is the order of the rules. The no-plays branch has to come first for a second reason: nightjar's NULL share makes `top_share_pct >= 60` unknown, the `CASE` moves on, and `minutes < 20` then calls a listener with no plays `Casual`.",
      prompt: [
        "Finish the recap with a `persona` for each listener, taking the first rule that applies:",
        "`Newcomer` if they have not played anything; `Devotee` if their top artist has at least 60% of their listening time; `Casual` if they have listened for under 20 minutes; `Explorer` otherwise.",
        "Return the username, minutes, top artist, top artist share and persona, sorted by username.",
      ],
      columns: [
        { name: "username", type: "text" },
        { name: "minutes", type: "real" },
        { name: "top_artist", type: "text" },
        { name: "top_share_pct", type: "real" },
        { name: "persona", type: "text" },
      ],
      starter: `WITH recap AS (
${indentSql(RECAP_TOP_ARTIST)}
)
SELECT username, minutes, top_artist, top_share_pct
FROM recap
ORDER BY username
`,
      solution: RECAP_PERSONAS,
      tests: resultShape(
        ["username", "minutes", "top_artist", "top_share_pct", "persona"],
        8,
        "The first matching rule wins, and nightjar is a Newcomer.",
        true,
      ),
    },
  ],
);

// ─── Listening sessions ──────────────────────────────────────────────

/** A pause longer than this many minutes starts a new session. */
const SESSION_GAP_MIN = 30;

const SESSION_GAPS = `SELECT p.play_id, l.username, p.played_at,
       ROUND((unixepoch(p.played_at)
              - unixepoch(LAG(p.played_at) OVER (
                  PARTITION BY p.listener_id
                  ORDER BY p.played_at
                ))) / 60.0, 1) AS gap_min
FROM plays p
JOIN listeners l ON l.listener_id = p.listener_id
ORDER BY l.username, p.played_at`;

const SESSION_NUMBERS = `WITH gaps AS (
${indentSql(SESSION_GAPS)}
), flagged AS (
  SELECT *,
         CASE WHEN gap_min IS NULL OR gap_min > ${SESSION_GAP_MIN} THEN 1 ELSE 0 END AS starts_session
  FROM gaps
)
SELECT play_id, username, played_at, gap_min,
       SUM(starts_session) OVER (
         PARTITION BY username
         ORDER BY played_at
         ROWS UNBOUNDED PRECEDING
       ) AS session_no
FROM flagged
ORDER BY username, played_at`;

const SESSION_SUMMARY = `WITH numbered AS (
${indentSql(SESSION_NUMBERS)}
)
SELECT n.username, n.session_no,
       MIN(n.played_at) AS started_at,
       datetime(MAX(unixepoch(n.played_at) + p.ms_played / 1000), 'unixepoch') AS ended_at,
       COUNT(*) AS plays,
       ROUND(SUM(p.ms_played) / 60000.0, 1) AS minutes
FROM numbered n
JOIN plays p ON p.play_id = n.play_id
GROUP BY n.username, n.session_no
ORDER BY n.username, n.session_no`;

const LISTENING_SESSIONS = sqlSteps(
  {
    slug: "listening-sessions",
    title: "Listening Sessions",
    difficulty: "Advanced",
    topic: "Sessionization",
    dataset: MUSIC,
    description:
      "Split each listener's plays into sessions wherever they paused for more than half an hour.",
    solutionNote:
      "A session is defined by the pauses between events, not by the calendar, which is why the build goes through `LAG` and a running sum instead of `date(played_at)`. Grouping by day merges two of ravenwing's sessions on 2 March and cuts lunapark's late session in half at midnight.",
  },
  [
    {
      title: "Gap since the previous play",
      short: "Gaps",
      solutionNote:
        "`LAG(played_at)` reads the previous row of the window, and `PARTITION BY listener_id` is what stops it reaching into another listener's history. Without it, each listener's first play gets a gap measured from somebody else's last one instead of NULL.",
      prompt: [
        "A listening session is a run of plays with no long pause between them. Start by measuring the pauses: for every play, the minutes since the same listener's previous play started, rounded to 1 decimal place.",
        "A listener's first play has no previous play, so its gap is NULL. `unixepoch()` turns a timestamp into seconds, which makes the difference easy to take.",
        "Return all fifty plays, sorted by username and then `played_at`.",
      ],
      columns: [
        { name: "play_id", type: "integer" },
        { name: "username", type: "text" },
        { name: "played_at", type: "text" },
        { name: "gap_min", type: "real" },
      ],
      starter: `SELECT p.play_id, l.username, p.played_at
FROM plays p
JOIN listeners l ON l.listener_id = p.listener_id
ORDER BY l.username, p.played_at
`,
      solution: SESSION_GAPS,
      tests: resultShape(
        ["play_id", "username", "played_at", "gap_min"],
        50,
        "Gaps in minutes to 1 decimal place, NULL on each listener's first play.",
        true,
      ),
    },
    {
      title: "Number the sessions",
      short: "Sessions",
      solutionNote:
        "This is the running-sum trick: a flag that is 1 where something new starts, summed in order, gives every row the number of starts so far, which is its session number. The boundary is exact on purpose: saltfox's pause of 30.0 minutes is not more than 30, so those two plays stay in one session.",
      prompt: [
        `A pause of more than ${SESSION_GAP_MIN} minutes starts a new session, and so does a listener's first play. A pause of exactly ${SESSION_GAP_MIN} minutes does not.`,
        "Number each listener's sessions 1, 2, 3 in order and add the number to every play as `session_no`. One way: flag the plays that start a session with a 1, then keep a running total of the flags.",
        "Same fifty rows, same order.",
      ],
      columns: [
        { name: "play_id", type: "integer" },
        { name: "username", type: "text" },
        { name: "played_at", type: "text" },
        { name: "gap_min", type: "real" },
        { name: "session_no", type: "integer" },
      ],
      starter: `${SESSION_GAPS}
`,
      solution: SESSION_NUMBERS,
      tests: resultShape(
        ["play_id", "username", "played_at", "gap_min", "session_no"],
        50,
        "A new session only after a pause of more than 30 minutes.",
        true,
      ),
    },
    {
      title: "Summarise each session",
      short: "Summary",
      solutionNote:
        "With a session number on every play, the summary is an ordinary `GROUP BY username, session_no`, and the end time is the latest `played_at` plus `ms_played` in the group. lunapark's fourth session shows why the numbering was worth it: it starts on 5 March and ends on 6 March, and it is still one row.",
      prompt: [
        "Collapse the plays into one row per session: the username, the session number, when it started, when it ended, how many plays it holds, and the minutes listened (`ms_played` summed, divided by 60,000 and rounded to 1 decimal place).",
        "A session ends when its last play stops: that play's `played_at` plus its `ms_played / 1000` seconds. Format both times like `played_at` (`YYYY-MM-DD HH:MM:SS`); `datetime(seconds, 'unixepoch')` turns a count of seconds back into that format.",
        "Sort by username and session number.",
      ],
      columns: [
        { name: "username", type: "text" },
        { name: "session_no", type: "integer" },
        { name: "started_at", type: "text" },
        { name: "ended_at", type: "text" },
        { name: "plays", type: "integer" },
        { name: "minutes", type: "real" },
      ],
      starter: `WITH numbered AS (
${indentSql(SESSION_NUMBERS)}
)
SELECT username, session_no, COUNT(*) AS plays
FROM numbered
GROUP BY username, session_no
ORDER BY username, session_no
`,
      solution: SESSION_SUMMARY,
      tests: resultShape(
        ["username", "session_no", "started_at", "ended_at", "plays", "minutes"],
        22,
        "One row per session, including the one that runs past midnight.",
        true,
      ),
    },
  ],
);

export const SQL_MULTI_MUSIC: Challenge[] = [LISTENING_RECAP, LISTENING_SESSIONS];
