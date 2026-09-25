/**
 * Rides: a ride-hailing service in three Spanish cities, over four weeks.
 *
 * Trips run from Monday 2024-05-06 to Sunday 2024-06-02, and anything
 * open-ended is measured as of Monday 2024-06-03. A trip belongs to its
 * driver's city. The columns carry meaning in their NULLs: a cancelled
 * request has no `started_at`, `ended_at`, distance or fare, and a completed
 * trip the rider did not rate has no `rating`.
 *
 * The edge cases are there on purpose:
 *
 *  - Six cancelled requests, placed where counting requests instead of trips
 *    changes an answer: one turns Amara Diallo's four-trip week into five
 *    (the payout bonus threshold) and bridges her two-day runs into a fake
 *    streak; one does the same for Lucia Ferraz and makes Daniel Sato look
 *    like her regular; one is Grace Lindqvist's first request, the week
 *    before her first trip; and the only request Jonas Weber ever made is
 *    also Kenji Morita's latest job, which makes Kenji look busier than he
 *    is.
 *  - Unrated trips on most drivers, so `COALESCE(rating, 0)` visibly drags
 *    an average down; Kenji Morita and Rafael Ortiz tie on average rating.
 *  - Pavel Novak last drove on May 14, and Selin Aydin joined on May 20 and
 *    has not driven at all.
 *  - Noor Haddad rides with Tomas Reyna again and again; a few other pairs
 *    reach three only if a cancelled request is counted.
 *  - Tomas Reyna drove five consecutive days, with two trips on one of them;
 *    Rafael Ortiz drove three.
 *  - Bilbao has two drivers tied for most trips, Bilbao and Valencia tie on
 *    cancellation rate, and Seville's trip count is odd where the other two
 *    are even, for the median.
 *  - The May 20 rider cohort has nobody active the following week, which is
 *    the empty cell a retention table must still show.
 *  - Every fare has an even tenths digit, so shares at a 20% or 25%
 *    commission land on whole cents and never on a rounding boundary.
 */

import type { ChallengeDataset } from "./datasets";

const RIDES_SQL = `
CREATE TABLE tiers (
  tier            TEXT PRIMARY KEY,
  commission_rate REAL NOT NULL
);
INSERT INTO tiers VALUES
  ('standard', 0.25),
  ('pro',      0.20);

CREATE TABLE drivers (
  driver_id   INTEGER PRIMARY KEY,
  driver_name TEXT NOT NULL,
  city        TEXT NOT NULL,
  tier        TEXT NOT NULL REFERENCES tiers(tier),
  joined_on   TEXT NOT NULL
);
INSERT INTO drivers VALUES
  (1, 'Tomas Reyna',   'Seville',  'pro',      '2023-03-14'),
  (2, 'Amara Diallo',  'Seville',  'standard', '2023-08-02'),
  (3, 'Kenji Morita',  'Seville',  'standard', '2024-02-19'),
  (4, 'Lucia Ferraz',  'Valencia', 'pro',      '2022-11-07'),
  (5, 'Pavel Novak',   'Valencia', 'standard', '2023-06-25'),
  (6, 'Ines Castell',  'Bilbao',   'pro',      '2023-01-30'),
  (7, 'Rafael Ortiz',  'Bilbao',   'standard', '2023-10-12'),
  (8, 'Selin Aydin',   'Bilbao',   'standard', '2024-05-20');

CREATE TABLE riders (
  rider_id     INTEGER PRIMARY KEY,
  rider_name   TEXT NOT NULL,
  signed_up_on TEXT NOT NULL
);
INSERT INTO riders VALUES
  (1,  'Noor Haddad',     '2023-11-04'),
  (2,  'Ben Okafor',      '2024-01-15'),
  (3,  'Clara Vidal',     '2024-03-02'),
  (4,  'Hugo Marchetti',  '2024-05-12'),
  (5,  'Iris Kowalski',   '2024-05-19'),
  (6,  'Jonas Weber',     '2024-05-25'),
  (7,  'Daniel Sato',     '2023-09-21'),
  (8,  'Elena Rossi',     '2024-04-28'),
  (9,  'Marta Quiroga',   '2024-02-11'),
  (10, 'Farid Mansour',   '2024-02-10'),
  (11, 'Grace Lindqvist', '2024-05-01'),
  (12, 'Oskar Brandt',    '2024-05-26');

CREATE TABLE trips (
  trip_id      INTEGER PRIMARY KEY,
  driver_id    INTEGER NOT NULL REFERENCES drivers(driver_id),
  rider_id     INTEGER NOT NULL REFERENCES riders(rider_id),
  requested_at TEXT    NOT NULL,
  started_at   TEXT,
  ended_at     TEXT,
  distance_km  REAL,
  fare         REAL,
  rating       INTEGER
);
INSERT INTO trips VALUES
  (1,  4, 7,  '2024-05-06 08:12', '2024-05-06 08:19', '2024-05-06 08:41',  9.4, 14.20, 5),
  (2,  1, 1,  '2024-05-06 18:40', '2024-05-06 18:46', '2024-05-06 19:02',  6.1, 10.40, 5),
  (3,  6, 10, '2024-05-07 07:55', '2024-05-07 08:03', '2024-05-07 08:25',  8.8, 13.40, 4),
  (4,  4, 9,  '2024-05-07 12:30', '2024-05-07 12:36', '2024-05-07 12:50',  4.9,  8.60, NULL),
  (5,  2, 1,  '2024-05-07 22:15', '2024-05-07 22:21', '2024-05-07 22:39',  7.0, 11.40, NULL),
  (6,  5, 7,  '2024-05-08 09:05', '2024-05-08 09:12', '2024-05-08 09:30',  7.2, 11.20, 4),
  (7,  4, 7,  '2024-05-08 17:45', NULL, NULL, NULL, NULL, NULL),
  (8,  1, 1,  '2024-05-09 08:20', '2024-05-09 08:24', '2024-05-09 08:40',  6.0, 10.20, 5),
  (9,  4, 9,  '2024-05-09 19:10', '2024-05-09 19:15', '2024-05-09 19:38', 10.2, 15.60, 5),
  (10, 1, 2,  '2024-05-10 17:05', '2024-05-10 17:11', '2024-05-10 17:34',  8.1, 12.80, 4),
  (11, 7, 10, '2024-05-10 23:40', '2024-05-10 23:48', '2024-05-11 00:10', 11.5, 17.80, NULL),
  (12, 5, 9,  '2024-05-12 10:30', NULL, NULL, NULL, NULL, NULL),
  (13, 5, 8,  '2024-05-13 07:40', '2024-05-13 07:47', '2024-05-13 08:05',  6.8, 10.80, 3),
  (14, 2, 3,  '2024-05-13 08:45', '2024-05-13 08:52', '2024-05-13 09:10',  5.6,  9.40, 5),
  (15, 6, 10, '2024-05-14 07:50', '2024-05-14 07:58', '2024-05-14 08:21',  8.9, 13.60, 5),
  (16, 2, 4,  '2024-05-14 13:20', '2024-05-14 13:25', '2024-05-14 13:39',  4.2,  7.60, 4),
  (17, 5, 7,  '2024-05-14 16:25', '2024-05-14 16:33', '2024-05-14 16:58', 12.6, 18.40, NULL),
  (18, 4, 8,  '2024-05-15 10:20', '2024-05-15 10:26', '2024-05-15 10:44',  7.5, 11.80, 5),
  (19, 2, 2,  '2024-05-15 18:10', NULL, NULL, NULL, NULL, NULL),
  (20, 2, 1,  '2024-05-16 07:50', '2024-05-16 07:55', '2024-05-16 08:12',  6.3, 10.60, 4),
  (21, 7, 11, '2024-05-16 21:05', NULL, NULL, NULL, NULL, NULL),
  (22, 2, 4,  '2024-05-17 23:30', '2024-05-17 23:36', '2024-05-17 23:58',  9.9, 15.20, NULL),
  (23, 3, 2,  '2024-05-18 11:40', '2024-05-18 11:49', '2024-05-18 12:15', 11.2, 16.60, 3),
  (24, 7, 10, '2024-05-19 09:15', NULL, NULL, NULL, NULL, NULL),
  (25, 1, 1,  '2024-05-20 08:10', '2024-05-20 08:15', '2024-05-20 08:31',  6.2, 10.60, 5),
  (26, 6, 10, '2024-05-21 07:52', '2024-05-21 08:00', '2024-05-21 08:22',  8.7, 13.20, NULL),
  (27, 4, 7,  '2024-05-21 08:00', '2024-05-21 08:06', '2024-05-21 08:30',  9.8, 14.60, 4),
  (28, 1, 5,  '2024-05-21 09:30', '2024-05-21 09:34', '2024-05-21 09:49',  5.1,  8.80, 5),
  (29, 1, 4,  '2024-05-22 12:15', '2024-05-22 12:22', '2024-05-22 12:40',  6.9, 11.00, 4),
  (30, 7, 11, '2024-05-22 17:30', '2024-05-22 17:38', '2024-05-22 17:55',  5.8,  9.60, 5),
  (31, 1, 1,  '2024-05-22 19:40', '2024-05-22 19:45', '2024-05-22 20:01',  6.1, 10.40, NULL),
  (32, 1, 5,  '2024-05-23 08:05', '2024-05-23 08:10', '2024-05-23 08:24',  5.0,  8.60, 4),
  (33, 7, 10, '2024-05-23 18:20', '2024-05-23 18:27', '2024-05-23 18:52', 10.8, 16.40, 4),
  (34, 1, 5,  '2024-05-24 21:50', '2024-05-24 21:54', '2024-05-24 22:12',  7.4, 11.60, NULL),
  (35, 7, 11, '2024-05-24 22:40', '2024-05-24 22:49', '2024-05-24 23:08',  7.9, 12.40, 3),
  (36, 3, 5,  '2024-05-25 14:05', '2024-05-25 14:12', '2024-05-25 14:40', 13.1, 19.20, 5),
  (37, 4, 9,  '2024-05-27 08:25', '2024-05-27 08:31', '2024-05-27 08:52',  8.4, 13.00, 5),
  (38, 6, 10, '2024-05-28 07:48', '2024-05-28 07:55', '2024-05-28 08:18',  8.8, 13.40, 5),
  (39, 1, 1,  '2024-05-28 08:30', '2024-05-28 08:34', '2024-05-28 08:50',  6.0, 10.20, 5),
  (40, 3, 6,  '2024-05-28 20:30', NULL, NULL, NULL, NULL, NULL),
  (41, 2, 3,  '2024-05-29 09:15', '2024-05-29 09:21', '2024-05-29 09:37',  5.5,  9.20, 4),
  (42, 6, 12, '2024-05-29 18:05', '2024-05-29 18:12', '2024-05-29 18:36',  9.6, 14.80, 4),
  (43, 4, 9,  '2024-05-30 19:20', '2024-05-30 19:26', '2024-05-30 19:47', 10.0, 15.40, NULL),
  (44, 1, 2,  '2024-05-31 18:20', '2024-05-31 18:26', '2024-05-31 18:44',  7.7, 12.00, 5),
  (45, 7, 12, '2024-06-01 13:10', '2024-06-01 13:17', '2024-06-01 13:35',  6.6, 10.80, 4);
`;

export const RIDES: ChallengeDataset = {
  initSql: RIDES_SQL,
  schema: [
    {
      name: "trips",
      rows: "45",
      columns: [
        { name: "trip_id", type: "integer", key: "pk" },
        { name: "driver_id", type: "integer", key: "fk" },
        { name: "rider_id", type: "integer", key: "fk" },
        { name: "requested_at", type: "text" },
        { name: "started_at", type: "text" },
        { name: "ended_at", type: "text" },
        { name: "distance_km", type: "real" },
        { name: "fare", type: "real" },
        { name: "rating", type: "integer" },
      ],
    },
    {
      name: "drivers",
      rows: "8",
      columns: [
        { name: "driver_id", type: "integer", key: "pk" },
        { name: "driver_name", type: "text" },
        { name: "city", type: "text" },
        { name: "tier", type: "text", key: "fk" },
        { name: "joined_on", type: "text" },
      ],
    },
    {
      name: "riders",
      rows: "12",
      columns: [
        { name: "rider_id", type: "integer", key: "pk" },
        { name: "rider_name", type: "text" },
        { name: "signed_up_on", type: "text" },
      ],
    },
    {
      name: "tiers",
      rows: "2",
      columns: [
        { name: "tier", type: "text", key: "pk" },
        { name: "commission_rate", type: "real" },
      ],
    },
  ],
};
