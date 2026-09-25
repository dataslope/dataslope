/**
 * Support: three weeks of a helpdesk's tickets.
 *
 * This dataset is for time. Every question worth asking a helpdesk (how fast
 * did we answer, did we meet the SLA, how big was the queue on Sunday) is a
 * comparison between timestamps, and most of the interesting rows are the
 * ones where a timestamp is missing: a ticket nobody has answered has no
 * `first_response_at`, and a ticket still open has no `resolved_at`. A query
 * that forgets them does not fail; it quietly reports the helpdesk as better
 * than it is.
 *
 * The edge cases are there on purpose:
 *
 *  - The export was taken at `'2024-03-22 18:00:00'`. Six tickets are still
 *    open then, three of them unassigned and unanswered; two of those are
 *    already past their first-response deadline and one is not.
 *  - Boundaries in both directions: ticket 3 is answered exactly at its
 *    4-hour deadline and ticket 5 one minute after it; ticket 7 is resolved
 *    exactly at 72 hours and ticket 8 one minute late.
 *  - Ticket 6 was resolved, reopened and resolved again; ticket 23 was
 *    resolved and reopened and is still open, so `tickets.resolved_at` shows
 *    only the final state and `ticket_events` holds the history. Tickets 14
 *    and 19 go `pending` (waiting on the customer) and back to `open`, which
 *    is not a reopen.
 *  - Repeat contacts: Everly Bakes files again exactly 168 hours after its
 *    previous ticket, and Brightwell Dental 168 hours and five minutes after.
 *  - A weekend: tickets arrive on Saturday 9 and Sunday 10 March, and nothing
 *    at all happens on 16 and 17 March while seven tickets sit open.
 *  - Zoe Lambert has just joined and holds no tickets; Wren Adeyemi and
 *    Yusuf Karaca have resolved everything they were given.
 *
 * Timestamps are ISO text with whole minutes, so `unixepoch()` differences
 * are exact and the text itself compares in time order.
 */

import type { ChallengeDataset } from "./datasets";

const SUPPORT_SQL = `
CREATE TABLE agents (
  agent_id  INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  team      TEXT NOT NULL
);
INSERT INTO agents VALUES
  (1, 'Priya Menon',  'Tier 1'),
  (2, 'Tomas Rehak',  'Tier 1'),
  (3, 'Wren Adeyemi', 'Tier 2'),
  (4, 'Yusuf Karaca', 'Tier 2'),
  (5, 'Zoe Lambert',  'Tier 1');

CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  company     TEXT NOT NULL,
  plan        TEXT NOT NULL
);
INSERT INTO customers VALUES
  (1,  'Brightwell Dental', 'pro'),
  (2,  'Copperleaf Studio', 'free'),
  (3,  'Dunmore Logistics', 'enterprise'),
  (4,  'Everly Bakes',      'free'),
  (5,  'Fernhill Schools',  'enterprise'),
  (6,  'Glasswing Travel',  'pro'),
  (7,  'Halcyon Yoga',      'free'),
  (8,  'Ironbark Legal',    'pro'),
  (9,  'Juniper Vets',      'pro'),
  (10, 'Larkspur Florists', 'free'),
  (11, 'Marlowe Print',     'free'),
  (12, 'Northgate Clinics', 'enterprise');

CREATE TABLE sla_targets (
  priority             TEXT    PRIMARY KEY,
  first_response_hours INTEGER NOT NULL,
  resolution_hours     INTEGER NOT NULL
);
INSERT INTO sla_targets VALUES
  ('urgent', 1,  8),
  ('high',   4,  24),
  ('normal', 8,  72),
  ('low',    24, 120);

CREATE TABLE tickets (
  ticket_id         INTEGER PRIMARY KEY,
  customer_id       INTEGER NOT NULL REFERENCES customers(customer_id),
  agent_id          INTEGER REFERENCES agents(agent_id),
  priority          TEXT    NOT NULL REFERENCES sla_targets(priority),
  channel           TEXT    NOT NULL,
  opened_at         TEXT    NOT NULL,
  first_response_at TEXT,
  resolved_at       TEXT
);
INSERT INTO tickets VALUES
  (1,  4,  1,    'normal', 'email', '2024-03-04 09:12:00', '2024-03-04 11:40:00', '2024-03-05 16:30:00'),
  (2,  3,  3,    'urgent', 'phone', '2024-03-04 10:05:00', '2024-03-04 10:35:00', '2024-03-04 15:50:00'),
  (3,  1,  2,    'high',   'chat',  '2024-03-04 14:20:00', '2024-03-04 18:20:00', '2024-03-05 11:00:00'),
  (4,  2,  1,    'low',    'email', '2024-03-05 10:00:00', '2024-03-05 16:45:00', '2024-03-07 12:00:00'),
  (5,  5,  4,    'high',   'email', '2024-03-05 13:30:00', '2024-03-05 17:31:00', '2024-03-06 10:15:00'),
  (6,  6,  2,    'normal', 'chat',  '2024-03-06 09:45:00', '2024-03-06 10:10:00', '2024-03-08 11:20:00'),
  (7,  8,  3,    'normal', 'email', '2024-03-06 15:00:00', '2024-03-07 09:20:00', '2024-03-09 15:00:00'),
  (8,  4,  1,    'normal', 'chat',  '2024-03-08 11:30:00', '2024-03-08 11:52:00', '2024-03-11 11:31:00'),
  (9,  7,  2,    'low',    'email', '2024-03-08 16:10:00', '2024-03-11 10:00:00', '2024-03-13 12:00:00'),
  (10, 3,  4,    'urgent', 'phone', '2024-03-08 17:40:00', '2024-03-08 18:25:00', '2024-03-09 03:10:00'),
  (11, 9,  3,    'high',   'chat',  '2024-03-09 10:15:00', '2024-03-11 08:50:00', '2024-03-12 14:00:00'),
  (12, 10, 1,    'normal', 'email', '2024-03-10 20:40:00', '2024-03-11 09:05:00', '2024-03-12 10:00:00'),
  (13, 12, 4,    'high',   'email', '2024-03-11 09:00:00', '2024-03-11 10:30:00', '2024-03-12 09:00:00'),
  (14, 1,  2,    'normal', 'phone', '2024-03-11 14:25:00', '2024-03-11 14:40:00', '2024-03-13 15:00:00'),
  (15, 11, 3,    'urgent', 'phone', '2024-03-12 09:10:00', '2024-03-12 09:40:00', '2024-03-12 13:25:00'),
  (16, 7,  1,    'low',    'chat',  '2024-03-12 14:05:00', '2024-03-12 15:00:00', '2024-03-18 11:00:00'),
  (17, 2,  2,    'normal', 'email', '2024-03-13 10:40:00', '2024-03-13 13:10:00', '2024-03-18 10:30:00'),
  (18, 5,  4,    'high',   'phone', '2024-03-13 16:00:00', '2024-03-13 16:20:00', '2024-03-18 09:20:00'),
  (19, 6,  3,    'normal', 'chat',  '2024-03-14 10:30:00', '2024-03-14 11:00:00', '2024-03-18 16:00:00'),
  (20, 4,  1,    'low',    'email', '2024-03-15 11:30:00', '2024-03-15 13:00:00', '2024-03-19 09:40:00'),
  (21, 9,  2,    'high',   'chat',  '2024-03-15 15:50:00', '2024-03-15 16:30:00', '2024-03-18 12:00:00'),
  (22, 12, 4,    'normal', 'email', '2024-03-15 17:20:00', '2024-03-18 09:10:00', '2024-03-19 14:00:00'),
  (23, 8,  2,    'high',   'chat',  '2024-03-18 09:30:00', '2024-03-18 10:15:00', NULL),
  (24, 3,  3,    'normal', 'email', '2024-03-19 13:00:00', '2024-03-19 15:30:00', '2024-03-21 10:00:00'),
  (25, 10, 1,    'normal', 'email', '2024-03-20 09:00:00', '2024-03-20 10:20:00', NULL),
  (26, 2,  NULL, 'low',    'email', '2024-03-21 08:40:00', NULL,                  NULL),
  (27, 11, 2,    'normal', 'phone', '2024-03-22 10:05:00', '2024-03-22 10:30:00', NULL),
  (28, 6,  NULL, 'high',   'chat',  '2024-03-22 11:20:00', NULL,                  NULL),
  (29, 5,  NULL, 'normal', 'email', '2024-03-22 16:45:00', NULL,                  NULL);

CREATE TABLE ticket_events (
  event_id   INTEGER PRIMARY KEY,
  ticket_id  INTEGER NOT NULL REFERENCES tickets(ticket_id),
  status     TEXT    NOT NULL,
  changed_at TEXT    NOT NULL
);
INSERT INTO ticket_events VALUES
  (1,  2,  'resolved', '2024-03-04 15:50:00'),
  (2,  3,  'resolved', '2024-03-05 11:00:00'),
  (3,  1,  'resolved', '2024-03-05 16:30:00'),
  (4,  5,  'resolved', '2024-03-06 10:15:00'),
  (5,  6,  'resolved', '2024-03-06 16:00:00'),
  (6,  6,  'open',     '2024-03-07 09:30:00'),
  (7,  4,  'resolved', '2024-03-07 12:00:00'),
  (8,  6,  'resolved', '2024-03-08 11:20:00'),
  (9,  10, 'resolved', '2024-03-09 03:10:00'),
  (10, 7,  'resolved', '2024-03-09 15:00:00'),
  (11, 8,  'resolved', '2024-03-11 11:31:00'),
  (12, 13, 'resolved', '2024-03-12 09:00:00'),
  (13, 12, 'resolved', '2024-03-12 10:00:00'),
  (14, 14, 'pending',  '2024-03-12 10:00:00'),
  (15, 15, 'resolved', '2024-03-12 13:25:00'),
  (16, 11, 'resolved', '2024-03-12 14:00:00'),
  (17, 14, 'open',     '2024-03-13 09:00:00'),
  (18, 9,  'resolved', '2024-03-13 12:00:00'),
  (19, 14, 'resolved', '2024-03-13 15:00:00'),
  (20, 16, 'pending',  '2024-03-14 11:00:00'),
  (21, 19, 'pending',  '2024-03-14 15:00:00'),
  (22, 19, 'open',     '2024-03-15 09:30:00'),
  (23, 19, 'pending',  '2024-03-15 12:00:00'),
  (24, 18, 'resolved', '2024-03-18 09:20:00'),
  (25, 17, 'resolved', '2024-03-18 10:30:00'),
  (26, 16, 'resolved', '2024-03-18 11:00:00'),
  (27, 21, 'resolved', '2024-03-18 12:00:00'),
  (28, 19, 'resolved', '2024-03-18 16:00:00'),
  (29, 20, 'resolved', '2024-03-19 09:40:00'),
  (30, 23, 'resolved', '2024-03-19 11:00:00'),
  (31, 22, 'resolved', '2024-03-19 14:00:00'),
  (32, 25, 'pending',  '2024-03-20 14:00:00'),
  (33, 23, 'open',     '2024-03-21 10:00:00'),
  (34, 24, 'resolved', '2024-03-21 10:00:00');
`;

export const SUPPORT: ChallengeDataset = {
  initSql: SUPPORT_SQL,
  schema: [
    {
      name: "tickets",
      rows: "29",
      columns: [
        { name: "ticket_id", type: "integer", key: "pk" },
        { name: "customer_id", type: "integer", key: "fk" },
        { name: "agent_id", type: "integer", key: "fk" },
        { name: "priority", type: "text", key: "fk" },
        { name: "channel", type: "text" },
        { name: "opened_at", type: "text" },
        { name: "first_response_at", type: "text" },
        { name: "resolved_at", type: "text" },
      ],
    },
    {
      name: "ticket_events",
      rows: "34",
      columns: [
        { name: "event_id", type: "integer", key: "pk" },
        { name: "ticket_id", type: "integer", key: "fk" },
        { name: "status", type: "text" },
        { name: "changed_at", type: "text" },
      ],
    },
    {
      name: "sla_targets",
      rows: "4",
      columns: [
        { name: "priority", type: "text", key: "pk" },
        { name: "first_response_hours", type: "integer" },
        { name: "resolution_hours", type: "integer" },
      ],
    },
    {
      name: "customers",
      rows: "12",
      columns: [
        { name: "customer_id", type: "integer", key: "pk" },
        { name: "company", type: "text" },
        { name: "plan", type: "text" },
      ],
    },
    {
      name: "agents",
      rows: "5",
      columns: [
        { name: "agent_id", type: "integer", key: "pk" },
        { name: "full_name", type: "text" },
        { name: "team", type: "text" },
      ],
    },
  ],
};
