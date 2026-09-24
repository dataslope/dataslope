/**
 * The music dataset: one week of listening on a small streaming service.
 *
 * Five tables: `artists` release `albums`, an album holds `tracks` (each with
 * a genre and a duration in seconds), and `listeners` produce `plays`. A play
 * records when it started (`played_at`) and how much of the track was heard
 * (`ms_played`). A play under 30 seconds is a skip; a play of exactly 30,000
 * ms is not, and one row sits on that boundary so `>=` and `>` disagree.
 *
 * What it is for, and the edge cases put in on purpose:
 *
 * - **A track nobody has played** (Pollen Count) and **a track that has only
 *   ever been skipped** (Bloom Again), so "never played" and "never played in
 *   full" are different questions with different answers.
 * - **Skips worth excluding.** Seven plays are skips, spread so that counting
 *   them changes a track's play count, a listener's completed albums and the
 *   top track of a genre.
 * - **Relational division.** Four listeners heard every track of an album in
 *   full. Two more look as if they did: tidepool has three full plays of
 *   Salt and Citrus but only two distinct tracks (Citrus twice), and skipped
 *   the last track of Paper Kites; saltfox skipped one track of Northern
 *   Hours.
 *   ravenwing has heard every track Tin Lighthouse ever released, across
 *   both of its albums.
 * - **Sessions.** Gaps of 71 and 43 minutes split two listeners' mornings
 *   in two, a gap of exactly 30 minutes does not (the rule is "more than 30"),
 *   and lunapark's late session starts at 23:52 and runs past midnight, so
 *   grouping by calendar day splits it where the gap rule does not.
 * - **Streaks.** Listening days are consecutive for some listeners and broken
 *   for others, for gaps-and-islands questions.
 * - **Ties** in play counts, including at the top of the Folk genre.
 * - **A listener with no plays at all** (nightjar, who signed up last), who
 *   must survive every per-listener report as zeros rather than vanish.
 * - Two sign-ups fall on a Sunday, which belongs to the week that began the
 *   Monday before, not the one that starts the next day.
 *
 * `play_id` follows `played_at`, as an append-only log would.
 */

import type { ChallengeDataset } from "./datasets";

const MUSIC_SQL = `
CREATE TABLE artists (
  artist_id   INTEGER PRIMARY KEY,
  artist_name TEXT NOT NULL,
  country     TEXT NOT NULL
);
INSERT INTO artists VALUES
  (1, 'Tin Lighthouse', 'IE'),
  (2, 'Marisol Vey',    'ES'),
  (3, 'Velour Engine',  'US'),
  (4, 'Kitefield',      'SE'),
  (5, 'Oda Brann',      'NO'),
  (6, 'Pinewire',       'CA');

CREATE TABLE albums (
  album_id    INTEGER PRIMARY KEY,
  artist_id   INTEGER NOT NULL REFERENCES artists(artist_id),
  album_title TEXT    NOT NULL,
  released_on TEXT    NOT NULL
);
INSERT INTO albums VALUES
  (1, 1, 'Harbour Lights',  '2021-04-16'),
  (2, 1, 'Low Tide Radio',  '2023-09-08'),
  (3, 2, 'Salt and Citrus', '2022-06-03'),
  (4, 3, 'Chrome Weather',  '2020-11-20'),
  (5, 4, 'Paper Kites',     '2023-03-10'),
  (6, 5, 'Northern Hours',  '2019-10-25'),
  (7, 6, 'Static Bloom',    '2024-02-16');

CREATE TABLE tracks (
  track_id    INTEGER PRIMARY KEY,
  album_id    INTEGER NOT NULL REFERENCES albums(album_id),
  track_title TEXT    NOT NULL,
  genre       TEXT    NOT NULL,
  duration_s  INTEGER NOT NULL
);
INSERT INTO tracks VALUES
  (1,  1, 'Foghorn Waltz',   'Folk',       214),
  (2,  1, 'Lamp Oil',        'Folk',       188),
  (3,  1, 'Breakwater',      'Indie',      243),
  (4,  2, 'Low Tide Radio',  'Indie',      226),
  (5,  2, 'Signal Flags',    'Indie',      199),
  (6,  3, 'Citrus',          'Pop',        181),
  (7,  3, 'Salt on the Rim', 'Pop',        204),
  (8,  3, 'Midnight Ferry',  'Pop',        237),
  (9,  4, 'Chrome Weather',  'Electronic', 312),
  (10, 4, 'Pressure Front',  'Electronic', 285),
  (11, 4, 'Isobar',          'Electronic', 347),
  (12, 5, 'Paper Kites',     'Indie',      205),
  (13, 5, 'Updraft',         'Indie',      192),
  (14, 5, 'String Theory',   'Indie',      228),
  (15, 6, 'Northern Hours',  'Jazz',       296),
  (16, 6, 'Blue Hour',       'Jazz',       318),
  (17, 6, 'Fjord Light',     'Jazz',       274),
  (18, 7, 'Static Bloom',    'Electronic', 241),
  (19, 7, 'Pollen Count',    'Electronic', 219),
  (20, 7, 'Bloom Again',     'Pop',        199);

CREATE TABLE listeners (
  listener_id  INTEGER PRIMARY KEY,
  username     TEXT NOT NULL,
  country      TEXT NOT NULL,
  signed_up_on TEXT NOT NULL
);
INSERT INTO listeners VALUES
  (1, 'ravenwing', 'GB', '2024-01-08'),
  (2, 'mossbyte',  'US', '2024-01-11'),
  (3, 'lunapark',  'DE', '2024-01-21'),
  (4, 'tidepool',  'US', '2024-01-23'),
  (5, 'quillon',   'FR', '2024-01-24'),
  (6, 'saltfox',   'GB', '2024-02-04'),
  (7, 'emberly',   'CA', '2024-02-12'),
  (8, 'nightjar',  'US', '2024-02-29');

CREATE TABLE plays (
  play_id     INTEGER PRIMARY KEY,
  listener_id INTEGER NOT NULL REFERENCES listeners(listener_id),
  track_id    INTEGER NOT NULL REFERENCES tracks(track_id),
  played_at   TEXT    NOT NULL,
  ms_played   INTEGER NOT NULL
);
INSERT INTO plays VALUES
  ( 1, 2,  9, '2024-03-01 07:30:00', 312000),
  ( 2, 2, 10, '2024-03-01 07:35:20', 285000),
  ( 3, 2, 11, '2024-03-01 07:40:10', 347000),
  ( 4, 4, 12, '2024-03-01 12:00:00', 205000),
  ( 5, 4, 13, '2024-03-01 12:03:30', 192000),
  ( 6, 4, 14, '2024-03-01 12:06:45',   8000),
  ( 7, 4,  6, '2024-03-01 12:07:00', 181000),
  ( 8, 4,  6, '2024-03-01 12:10:05', 181000),
  ( 9, 4,  7, '2024-03-01 12:13:10', 204000),
  (10, 1,  1, '2024-03-01 20:00:00', 214000),
  (11, 1,  2, '2024-03-01 20:03:40', 188000),
  (12, 1,  3, '2024-03-01 20:06:50', 243000),
  (13, 2, 18, '2024-03-01 22:10:00', 241000),
  (14, 2,  9, '2024-03-02 07:32:00', 312000),
  (15, 2, 10, '2024-03-02 07:37:20',  21000),
  (16, 2, 20, '2024-03-02 07:37:45',   9000),
  (17, 1,  4, '2024-03-02 08:15:00', 226000),
  (18, 1,  5, '2024-03-02 08:18:50', 199000),
  (19, 5,  6, '2024-03-02 09:00:00', 181000),
  (20, 5,  7, '2024-03-02 09:03:05', 204000),
  (21, 5,  8, '2024-03-02 09:06:35', 237000),
  (22, 1, 12, '2024-03-02 09:30:00', 205000),
  (23, 5,  8, '2024-03-02 09:50:00', 237000),
  (24, 3, 12, '2024-03-02 18:00:00', 205000),
  (25, 3, 13, '2024-03-02 18:03:30', 192000),
  (26, 3, 14, '2024-03-02 18:06:45', 228000),
  (27, 7, 18, '2024-03-03 16:00:00', 241000),
  (28, 7,  9, '2024-03-03 16:04:10', 312000),
  (29, 7,  2, '2024-03-03 16:09:30', 188000),
  (30, 3, 14, '2024-03-03 18:10:00', 228000),
  (31, 3,  6, '2024-03-03 18:14:00', 181000),
  (32, 4,  3, '2024-03-03 19:00:00', 243000),
  (33, 1,  1, '2024-03-03 21:00:00', 214000),
  (34, 1,  9, '2024-03-03 21:03:40',  12000),
  (35, 1, 15, '2024-03-03 21:04:00', 296000),
  (36, 2, 12, '2024-03-04 07:30:00',  30000),
  (37, 2, 13, '2024-03-04 07:30:35', 192000),
  (38, 3, 12, '2024-03-04 18:05:00', 205000),
  (39, 6, 15, '2024-03-04 22:00:00', 296000),
  (40, 6, 17, '2024-03-04 22:05:00', 274000),
  (41, 6, 16, '2024-03-04 22:09:40',  25000),
  (42, 1,  4, '2024-03-05 07:45:00', 226000),
  (43, 6, 11, '2024-03-05 22:30:00', 347000),
  (44, 6,  3, '2024-03-05 23:00:00', 243000),
  (45, 3, 16, '2024-03-05 23:52:00', 318000),
  (46, 3, 17, '2024-03-05 23:57:30', 274000),
  (47, 3, 15, '2024-03-06 00:02:10', 296000),
  (48, 5, 15, '2024-03-06 21:00:00',  15000),
  (49, 5, 16, '2024-03-06 21:00:20', 318000),
  (50, 7,  2, '2024-03-07 10:00:00',  11000);
`;

export const MUSIC: ChallengeDataset = {
  initSql: MUSIC_SQL,
  schema: [
    {
      name: "plays",
      rows: "50",
      columns: [
        { name: "play_id", type: "integer", key: "pk" },
        { name: "listener_id", type: "integer", key: "fk" },
        { name: "track_id", type: "integer", key: "fk" },
        { name: "played_at", type: "text" },
        { name: "ms_played", type: "integer" },
      ],
    },
    {
      name: "tracks",
      rows: "20",
      columns: [
        { name: "track_id", type: "integer", key: "pk" },
        { name: "album_id", type: "integer", key: "fk" },
        { name: "track_title", type: "text" },
        { name: "genre", type: "text" },
        { name: "duration_s", type: "integer" },
      ],
    },
    {
      name: "albums",
      rows: "7",
      columns: [
        { name: "album_id", type: "integer", key: "pk" },
        { name: "artist_id", type: "integer", key: "fk" },
        { name: "album_title", type: "text" },
        { name: "released_on", type: "text" },
      ],
    },
    {
      name: "artists",
      rows: "6",
      columns: [
        { name: "artist_id", type: "integer", key: "pk" },
        { name: "artist_name", type: "text" },
        { name: "country", type: "text" },
      ],
    },
    {
      name: "listeners",
      rows: "8",
      columns: [
        { name: "listener_id", type: "integer", key: "pk" },
        { name: "username", type: "text" },
        { name: "country", type: "text" },
        { name: "signed_up_on", type: "text" },
      ],
    },
  ],
};
