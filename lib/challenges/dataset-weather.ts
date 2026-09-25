/**
 * Weather: two weeks of daily readings from a small network of stations.
 *
 * Five stations in two regions, a coast and an upland, report one row per
 * day for 2 to 15 September 2024: the overnight low, the daytime high and
 * the rainfall. The fortnight has a shape a learner can see in the numbers:
 * a warm spell in the first week, a wet breakdown, then clear cold nights
 * with frost on the hills.
 *
 * It exists for the questions that are about *time* rather than about
 * categories, and every edge case in it is deliberate:
 *
 *  - Gaps in the date series. Harbour Mill has no row for 6 September and
 *    Brackenridge none for 11 and 12 September. A window function that
 *    steps by rows treats the day either side of a gap as neighbours; only
 *    date arithmetic sees the hole.
 *  - A failed sensor. Two days carry a reading with `precip_mm` NULL, which
 *    means "not measured", not "no rain". `AVG` skips it, `COALESCE(…, 0)`
 *    would invent a dry day, and a dry streak must not run through it.
 *  - Hollin Moss was commissioned on 14 September and has not reported yet,
 *    so it has no rows at all: an inner join drops it, and a coverage report
 *    should expect only two days from it, not fourteen.
 *  - Frost at the upland stations, including a low of exactly 0.0, so "at or
 *    below freezing" and "below freezing" give different answers.
 *  - Ties: Saltmarsh Point reached its high of 27.5 on two days, and a
 *    high of exactly 25.0 sits on the usual "hot day" threshold.
 *  - Runs: consecutive hot days, consecutive rainy days and dry spells, one
 *    of which is interrupted by a missing day and one by the failed sensor.
 */

import type { ChallengeDataset } from "./datasets";

const WEATHER_SQL = `
CREATE TABLE stations (
  station_id      INTEGER PRIMARY KEY,
  station_name    TEXT    NOT NULL,
  region          TEXT    NOT NULL,
  elevation_m     INTEGER NOT NULL,
  commissioned_on TEXT    NOT NULL
);
INSERT INTO stations VALUES
  (1, 'Saltmarsh Point', 'Coast',   4,   '2016-03-01'),
  (2, 'Harbour Mill',    'Coast',   18,  '2018-05-15'),
  (3, 'Kestrel Fell',    'Uplands', 412, '2015-10-01'),
  (4, 'Brackenridge',    'Uplands', 288, '2020-06-01'),
  (5, 'Hollin Moss',     'Uplands', 356, '2024-09-14');

CREATE TABLE readings (
  station_id   INTEGER NOT NULL REFERENCES stations(station_id),
  reading_date TEXT    NOT NULL,
  min_temp_c   REAL    NOT NULL,
  max_temp_c   REAL    NOT NULL,
  precip_mm    REAL,
  PRIMARY KEY (station_id, reading_date)
);
INSERT INTO readings VALUES
  (1, '2024-09-02', 13.8, 21.4, 0.0),
  (1, '2024-09-03', 14.6, 24.2, 0.2),
  (1, '2024-09-04', 16.1, 26.3, 0.0),
  (1, '2024-09-05', 17.0, 27.5, 0.0),
  (1, '2024-09-06', 17.4, 27.5, 0.0),
  (1, '2024-09-07', 16.8, 25.9, 0.4),
  (1, '2024-09-08', 15.2, 21.0, 12.6),
  (1, '2024-09-09', 13.9, 18.7, 8.2),
  (1, '2024-09-10', 12.5, 17.9, 3.1),
  (1, '2024-09-11', 12.1, 18.4, 0.0),
  (1, '2024-09-12', 10.4, 19.2, 0.0),
  (1, '2024-09-13',  9.1, 18.6, NULL),
  (1, '2024-09-14',  9.6, 19.0, 0.0),
  (1, '2024-09-15', 11.2, 19.8, 0.0),

  (2, '2024-09-02', 14.2, 22.0, 0.0),
  (2, '2024-09-03', 15.0, 24.6, 0.0),
  (2, '2024-09-04', 16.4, 25.8, 0.0),
  (2, '2024-09-05', 17.1, 26.4, 0.0),
  (2, '2024-09-07', 16.5, 25.2, 0.0),
  (2, '2024-09-08', 14.8, 20.3, 15.4),
  (2, '2024-09-09', 13.6, 18.1, 10.8),
  (2, '2024-09-10', 12.9, 17.6, 4.0),
  (2, '2024-09-11', 12.4, 18.9, 0.6),
  (2, '2024-09-12', 10.9, 19.5, 0.0),
  (2, '2024-09-13',  9.8, 19.1, 0.0),
  (2, '2024-09-14', 10.1, 19.4, 0.0),
  (2, '2024-09-15', 11.6, 20.2, 2.4),

  (3, '2024-09-02',  9.8, 17.2, 0.0),
  (3, '2024-09-03', 10.6, 20.1, 0.0),
  (3, '2024-09-04', 12.2, 23.4, 0.0),
  (3, '2024-09-05', 13.5, 25.0, 0.0),
  (3, '2024-09-06', 13.9, 24.8, 0.0),
  (3, '2024-09-07', 12.8, 22.6, 2.8),
  (3, '2024-09-08', 10.4, 16.2, 18.2),
  (3, '2024-09-09',  8.9, 13.8, 14.6),
  (3, '2024-09-10',  7.6, 12.9, NULL),
  (3, '2024-09-11',  6.2, 13.5, 6.0),
  (3, '2024-09-12', -0.3, 14.2, 0.0),
  (3, '2024-09-13', -1.4, 13.6, 0.0),
  (3, '2024-09-14', -0.6, 14.8, 0.0),
  (3, '2024-09-15',  4.3, 15.1, 3.2),

  (4, '2024-09-02', 11.0, 19.0, 0.0),
  (4, '2024-09-03', 11.9, 22.3, 0.0),
  (4, '2024-09-04', 13.1, 24.6, 0.0),
  (4, '2024-09-05', 14.4, 26.1, 0.0),
  (4, '2024-09-06', 14.9, 26.8, 0.0),
  (4, '2024-09-07', 14.0, 25.3, 0.8),
  (4, '2024-09-08', 11.8, 18.0, 16.0),
  (4, '2024-09-09', 10.1, 15.2, 11.4),
  (4, '2024-09-10',  8.8, 14.1, 7.9),
  (4, '2024-09-13',  0.0, 15.0, 0.0),
  (4, '2024-09-14',  1.2, 16.3, 0.0),
  (4, '2024-09-15',  5.1, 16.8, 1.9);
`;

export const WEATHER: ChallengeDataset = {
  initSql: WEATHER_SQL,
  schema: [
    {
      name: "readings",
      rows: "53",
      columns: [
        { name: "station_id", type: "integer", key: "fk" },
        { name: "reading_date", type: "text" },
        { name: "min_temp_c", type: "real" },
        { name: "max_temp_c", type: "real" },
        { name: "precip_mm", type: "real" },
      ],
    },
    {
      name: "stations",
      rows: "5",
      columns: [
        { name: "station_id", type: "integer", key: "pk" },
        { name: "station_name", type: "text" },
        { name: "region", type: "text" },
        { name: "elevation_m", type: "integer" },
        { name: "commissioned_on", type: "text" },
      ],
    },
  ],
};
