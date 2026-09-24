/**
 * Flights: one day of a small island-hopping airline.
 *
 * Harbourline flies four small aircraft out of a hub at Bramwick (BRK) to
 * five other airstrips, and this is its whole schedule for Friday 14 June
 * 2024: every flight, what it was scheduled to do and what it actually did,
 * and who was booked on it. Everything is one time zone, so two timestamps
 * can be subtracted directly.
 *
 * What it is for is the gap between the timetable and the day that happened.
 * Each edge case is there on purpose:
 *
 *  - Three flights were cancelled (HL105, HL106, HL307). A cancelled flight
 *    keeps its row and its bookings but has NULL `actual_dep` and
 *    `actual_arr`, so `COUNT(*)` and `COUNT(actual_dep)` disagree, a delay
 *    comes out NULL, and fares on those flights are not revenue.
 *  - Some flights left or landed early, so delays go negative; two arrivals
 *    are exactly 15 and 16 minutes late, either side of the usual on-time
 *    threshold.
 *  - Four routes are flown in both directions and three only one way.
 *  - Greyvale (GRV) is a new airstrip with arrivals but no departures, and
 *    Marrow Heath (MRN) is closed for resurfacing and has no flights at all.
 *  - Arrivals and departures at the hub sit close enough to connect, and
 *    two of the pairs are exactly 40 minutes apart.
 *  - Two flights (HL102, HL203) carried nobody, which is what an inner join
 *    through `bookings` silently loses.
 *  - Two routes tie for the day's top revenue once the cancelled fares are
 *    left out, and several routes tie on on-time rate and load factor.
 */

import type { ChallengeDataset } from "./datasets";

const FLIGHTS_SQL = `
CREATE TABLE airports (
  airport_code TEXT PRIMARY KEY,
  airport_name TEXT NOT NULL,
  island       TEXT NOT NULL
);
INSERT INTO airports VALUES
  ('BRK', 'Bramwick Regional',     'Mainland'),
  ('TLM', 'Tollmere Airfield',     'Tollmere'),
  ('CVH', 'Caverhithe',            'Cavra'),
  ('DSN', 'Dunsands Airstrip',     'Dunsa'),
  ('ELW', 'Elmwater',              'Elm Holm'),
  ('GRV', 'Greyvale',              'Grey Isle'),
  ('MRN', 'Marrow Heath',          'Mainland');

CREATE TABLE aircraft (
  tail_number TEXT    PRIMARY KEY,
  model       TEXT    NOT NULL,
  seats       INTEGER NOT NULL
);
INSERT INTO aircraft VALUES
  ('HL-01', 'Petrel 9',  9),
  ('HL-02', 'Petrel 9',  9),
  ('HL-03', 'Tern 6',    6),
  ('HL-04', 'Gannet 12', 12);

CREATE TABLE flights (
  flight_id     INTEGER PRIMARY KEY,
  flight_no     TEXT    NOT NULL,
  tail_number   TEXT    NOT NULL REFERENCES aircraft(tail_number),
  origin        TEXT    NOT NULL REFERENCES airports(airport_code),
  destination   TEXT    NOT NULL REFERENCES airports(airport_code),
  scheduled_dep TEXT    NOT NULL,
  scheduled_arr TEXT    NOT NULL,
  actual_dep    TEXT,
  actual_arr    TEXT
);
INSERT INTO flights VALUES
  (1,  'HL101', 'HL-01', 'BRK', 'TLM', '2024-06-14 06:30', '2024-06-14 07:20', '2024-06-14 06:28', '2024-06-14 07:14'),
  (2,  'HL401', 'HL-04', 'TLM', 'BRK', '2024-06-14 06:40', '2024-06-14 07:30', '2024-06-14 06:47', '2024-06-14 07:38'),
  (3,  'HL201', 'HL-02', 'ELW', 'BRK', '2024-06-14 06:45', '2024-06-14 07:35', '2024-06-14 06:45', '2024-06-14 07:31'),
  (4,  'HL301', 'HL-03', 'DSN', 'BRK', '2024-06-14 07:00', '2024-06-14 07:50', '2024-06-14 06:58', '2024-06-14 07:46'),
  (5,  'HL102', 'HL-01', 'TLM', 'BRK', '2024-06-14 07:50', '2024-06-14 08:40', '2024-06-14 07:52', '2024-06-14 08:41'),
  (6,  'HL402', 'HL-04', 'BRK', 'TLM', '2024-06-14 08:00', '2024-06-14 08:50', '2024-06-14 08:24', '2024-06-14 09:12'),
  (7,  'HL202', 'HL-02', 'BRK', 'DSN', '2024-06-14 08:15', '2024-06-14 09:05', '2024-06-14 09:10', '2024-06-14 09:58'),
  (8,  'HL302', 'HL-03', 'BRK', 'CVH', '2024-06-14 08:40', '2024-06-14 09:45', '2024-06-14 08:41', '2024-06-14 09:40'),
  (9,  'HL103', 'HL-01', 'BRK', 'CVH', '2024-06-14 09:20', '2024-06-14 10:25', '2024-06-14 09:47', '2024-06-14 10:49'),
  (10, 'HL203', 'HL-02', 'DSN', 'BRK', '2024-06-14 09:40', '2024-06-14 10:30', '2024-06-14 10:25', '2024-06-14 11:12'),
  (11, 'HL303', 'HL-03', 'CVH', 'BRK', '2024-06-14 10:20', '2024-06-14 11:25', '2024-06-14 10:31', '2024-06-14 11:41'),
  (12, 'HL104', 'HL-01', 'CVH', 'BRK', '2024-06-14 11:00', '2024-06-14 12:05', '2024-06-14 11:21', '2024-06-14 12:20'),
  (13, 'HL204', 'HL-02', 'BRK', 'TLM', '2024-06-14 11:15', '2024-06-14 12:05', '2024-06-14 11:50', '2024-06-14 12:37'),
  (14, 'HL304', 'HL-03', 'BRK', 'DSN', '2024-06-14 12:30', '2024-06-14 13:20', '2024-06-14 12:30', '2024-06-14 13:13'),
  (15, 'HL205', 'HL-02', 'TLM', 'CVH', '2024-06-14 12:40', '2024-06-14 13:35', '2024-06-14 13:05', '2024-06-14 13:57'),
  (16, 'HL105', 'HL-01', 'BRK', 'TLM', '2024-06-14 13:00', '2024-06-14 13:50', NULL, NULL),
  (17, 'HL305', 'HL-03', 'DSN', 'ELW', '2024-06-14 14:00', '2024-06-14 14:45', '2024-06-14 14:02', '2024-06-14 14:50'),
  (18, 'HL206', 'HL-02', 'CVH', 'BRK', '2024-06-14 14:10', '2024-06-14 15:15', '2024-06-14 14:22', '2024-06-14 15:20'),
  (19, 'HL106', 'HL-01', 'TLM', 'BRK', '2024-06-14 14:20', '2024-06-14 15:10', NULL, NULL),
  (20, 'HL306', 'HL-03', 'ELW', 'BRK', '2024-06-14 15:20', '2024-06-14 16:10', '2024-06-14 15:20', '2024-06-14 16:06'),
  (21, 'HL403', 'HL-04', 'TLM', 'BRK', '2024-06-14 15:45', '2024-06-14 16:35', '2024-06-14 15:51', '2024-06-14 16:44'),
  (22, 'HL107', 'HL-01', 'BRK', 'GRV', '2024-06-14 16:00', '2024-06-14 17:10', '2024-06-14 16:12', '2024-06-14 17:19'),
  (23, 'HL207', 'HL-02', 'BRK', 'ELW', '2024-06-14 16:30', '2024-06-14 17:20', '2024-06-14 16:29', '2024-06-14 17:12'),
  (24, 'HL307', 'HL-03', 'BRK', 'GRV', '2024-06-14 17:00', '2024-06-14 18:10', NULL, NULL),
  (25, 'HL404', 'HL-04', 'BRK', 'TLM', '2024-06-14 18:00', '2024-06-14 18:50', '2024-06-14 18:03', '2024-06-14 18:47');

CREATE TABLE passengers (
  passenger_id INTEGER PRIMARY KEY,
  full_name    TEXT NOT NULL
);
INSERT INTO passengers VALUES
  (1,  'Ailsa Moray'),
  (2,  'Bram Okafor'),
  (3,  'Cerys Vance'),
  (4,  'Dmitri Halloran'),
  (5,  'Elin Sato'),
  (6,  'Fergus Abara'),
  (7,  'Greta Nakamura'),
  (8,  'Hamid Rostami'),
  (9,  'Isla Penhallow'),
  (10, 'Jonah Castellanos'),
  (11, 'Kirsi Maalouf'),
  (12, 'Lorcan Teague'),
  (13, 'Maren Oduya'),
  (14, 'Niall Brennock'),
  (15, 'Oona Fairley');

CREATE TABLE bookings (
  booking_id   INTEGER PRIMARY KEY,
  flight_id    INTEGER NOT NULL REFERENCES flights(flight_id),
  passenger_id INTEGER NOT NULL REFERENCES passengers(passenger_id),
  cabin        TEXT    NOT NULL,
  fare         REAL    NOT NULL
);
INSERT INTO bookings VALUES
  (1,  1,  1,  'economy',  64.00),
  (2,  1,  7,  'economy',  58.00),
  (3,  2,  4,  'economy',  70.00),
  (4,  2,  8,  'economy',  64.00),
  (5,  3,  2,  'economy',  58.00),
  (6,  3,  9,  'economy',  62.00),
  (7,  4,  3,  'economy',  72.00),
  (8,  6,  10, 'economy',  64.00),
  (9,  6,  14, 'economy',  79.00),
  (10, 7,  2,  'economy',  72.00),
  (11, 8,  4,  'economy',  95.00),
  (12, 8,  9,  'economy',  88.00),
  (13, 8,  15, 'economy',  76.00),
  (14, 9,  3,  'economy',  88.00),
  (15, 9,  8,  'premium', 132.00),
  (16, 11, 12, 'economy',  88.00),
  (17, 11, 15, 'economy',  76.00),
  (18, 12, 4,  'economy',  92.00),
  (19, 12, 9,  'economy',  84.00),
  (20, 13, 6,  'economy',  72.00),
  (21, 14, 11, 'economy',  68.00),
  (22, 15, 6,  'economy',  95.00),
  (23, 15, 7,  'economy',  89.00),
  (24, 16, 5,  'economy',  64.00),
  (25, 17, 11, 'economy',  49.00),
  (26, 18, 3,  'economy',  88.00),
  (27, 18, 7,  'economy',  69.00),
  (28, 18, 8,  'premium', 115.00),
  (29, 19, 5,  'economy',  64.00),
  (30, 19, 14, 'economy',  79.00),
  (31, 20, 13, 'economy',  58.00),
  (32, 21, 1,  'economy',  64.00),
  (33, 21, 10, 'economy',  58.00),
  (34, 22, 12, 'economy', 110.00),
  (35, 23, 4,  'economy',  58.00),
  (36, 24, 8,  'economy', 110.00),
  (37, 25, 7,  'economy',  71.00),
  (38, 25, 9,  'premium',  98.00),
  (39, 25, 13, 'premium', 106.00);
`;

export const FLIGHTS: ChallengeDataset = {
  initSql: FLIGHTS_SQL,
  schema: [
    {
      name: "flights",
      rows: "25",
      columns: [
        { name: "flight_id", type: "integer", key: "pk" },
        { name: "flight_no", type: "text" },
        { name: "tail_number", type: "text", key: "fk" },
        { name: "origin", type: "text", key: "fk" },
        { name: "destination", type: "text", key: "fk" },
        { name: "scheduled_dep", type: "text" },
        { name: "scheduled_arr", type: "text" },
        { name: "actual_dep", type: "text" },
        { name: "actual_arr", type: "text" },
      ],
    },
    {
      name: "bookings",
      rows: "39",
      columns: [
        { name: "booking_id", type: "integer", key: "pk" },
        { name: "flight_id", type: "integer", key: "fk" },
        { name: "passenger_id", type: "integer", key: "fk" },
        { name: "cabin", type: "text" },
        { name: "fare", type: "real" },
      ],
    },
    {
      name: "airports",
      rows: "7",
      columns: [
        { name: "airport_code", type: "text", key: "pk" },
        { name: "airport_name", type: "text" },
        { name: "island", type: "text" },
      ],
    },
    {
      name: "aircraft",
      rows: "4",
      columns: [
        { name: "tail_number", type: "text", key: "pk" },
        { name: "model", type: "text" },
        { name: "seats", type: "integer" },
      ],
    },
    {
      name: "passengers",
      rows: "15",
      columns: [
        { name: "passenger_id", type: "integer", key: "pk" },
        { name: "full_name", type: "text" },
      ],
    },
  ],
};
