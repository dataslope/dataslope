/**
 * Warehouse: inventory across three warehouses, kept as a ledger.
 *
 * There is no stock column. What a warehouse holds is the sum of its rows in
 * `stock_movements`, each a signed quantity with a reason (receipt, sale,
 * transfer, adjustment), which is how real inventory systems store it and
 * why every stock question here is an aggregation first.
 *
 * The seed is a single month, June 2024, counted on 2024-06-30. The edge
 * cases are deliberate:
 *
 *  - Ear plugs (`EAR-50`) never moved: no stock, one open order. An inner
 *    join to the ledger drops the SKU most in need of stock.
 *  - Three SKU and warehouse pairs dip below zero, because a sale was booked
 *    before the delivery covering it. One (tape at Eastfield) is invisible at
 *    network level; one (LED bulbs at Riverside) is a sale and a receipt
 *    booked at the same minute, visible only when ties apply in
 *    `movement_id` order; gloves go negative twice.
 *  - Hex nuts sit exactly at their reorder level, and Riverside's bolts have
 *    come back to exactly zero.
 *  - A transfer is two rows sharing a `ref`. Two transfers move the same 24
 *    rolls of tape between the same warehouses, so pairing by SKU and
 *    quantity fans out; one transfer (TR-04) has left and not arrived.
 *  - Purchase orders: two open (`received_qty` NULL), one overdue and one not
 *    due until July; one partially received; one delivered in two drops, so
 *    a receipt join fans out.
 *  - Northgate has no adjustments, so a FILTER aggregate comes back NULL.
 *  - Extension cables and hex nuts sold exactly the same value at cost, so a
 *    cumulative share needs a tie-break.
 */

import type { ChallengeDataset } from "./datasets";

const WAREHOUSE_SQL = `
CREATE TABLE warehouses (
  warehouse_id   INTEGER PRIMARY KEY,
  warehouse_name TEXT NOT NULL,
  city           TEXT NOT NULL
);
INSERT INTO warehouses VALUES
  (1, 'Northgate', 'Leeds'),
  (2, 'Riverside', 'Bristol'),
  (3, 'Eastfield', 'Norwich');

CREATE TABLE suppliers (
  supplier_id   INTEGER PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  country       TEXT NOT NULL
);
INSERT INTO suppliers VALUES
  (1, 'Brightline Fasteners', 'GB'),
  (2, 'Kestrel Packaging',    'NL'),
  (3, 'Voltmere Electrical',  'DE'),
  (4, 'Harrow Safety Supply', 'GB');

CREATE TABLE products (
  sku           TEXT    PRIMARY KEY,
  product_name  TEXT    NOT NULL,
  category      TEXT    NOT NULL,
  unit_cost     REAL    NOT NULL,
  reorder_level INTEGER NOT NULL
);
INSERT INTO products VALUES
  ('BLT-M8',  'Hex Bolt M8, box of 100',      'Fasteners',   6.40,  40),
  ('NUT-M8',  'Hex Nut M8, box of 100',       'Fasteners',   3.10,  40),
  ('SCR-440', 'Wood Screw 4x40, box of 200',  'Fasteners',   5.25,  30),
  ('TPE-48',  'Packing Tape 48mm',            'Packaging',   1.85,  60),
  ('BOX-M',   'Shipping Box, medium',         'Packaging',   0.95, 100),
  ('WRP-500', 'Stretch Wrap 500mm',           'Packaging',  12.50,  10),
  ('CBL-3M',  'Extension Cable 3m',           'Electrical',  7.75,  15),
  ('LED-9W',  'LED Bulb 9W',                  'Electrical',  2.20,  50),
  ('GLV-L',   'Nitrile Gloves L, box of 100', 'Safety',      8.90,  20),
  ('VST-M',   'Hi-Vis Vest M',                'Safety',      4.60,  12),
  ('EAR-50',  'Ear Plugs, pack of 50',        'Safety',      9.75,   8);

CREATE TABLE purchase_orders (
  po_id        TEXT    PRIMARY KEY,
  supplier_id  INTEGER NOT NULL REFERENCES suppliers(supplier_id),
  sku          TEXT    NOT NULL REFERENCES products(sku),
  ordered_on   TEXT    NOT NULL,
  expected_on  TEXT    NOT NULL,
  ordered_qty  INTEGER NOT NULL,
  received_qty INTEGER
);
INSERT INTO purchase_orders VALUES
  ('PO-2401', 1, 'BLT-M8',  '2024-05-27', '2024-06-03',  60,   60),
  ('PO-2402', 1, 'NUT-M8',  '2024-05-27', '2024-06-03',  80,   80),
  ('PO-2403', 1, 'SCR-440', '2024-05-29', '2024-06-05',  50,   50),
  ('PO-2404', 2, 'TPE-48',  '2024-05-28', '2024-06-03', 120,  120),
  ('PO-2405', 2, 'BOX-M',   '2024-05-28', '2024-06-04', 300,  300),
  ('PO-2406', 2, 'WRP-500', '2024-05-30', '2024-06-06',  20,   20),
  ('PO-2407', 3, 'CBL-3M',  '2024-05-27', '2024-06-03',  40,   40),
  ('PO-2408', 3, 'LED-9W',  '2024-05-29', '2024-06-05', 100,  100),
  ('PO-2409', 4, 'GLV-L',   '2024-05-30', '2024-06-06',  50,   30),
  ('PO-2410', 4, 'VST-M',   '2024-05-31', '2024-06-07',  25,   25),
  ('PO-2411', 4, 'EAR-50',  '2024-06-24', '2024-07-05',  40, NULL),
  ('PO-2412', 3, 'LED-9W',  '2024-06-12', '2024-06-18',  60,   60),
  ('PO-2413', 4, 'GLV-L',   '2024-06-20', '2024-06-27',  40,   40),
  ('PO-2414', 2, 'BOX-M',   '2024-06-14', '2024-06-21', 180, NULL);

CREATE TABLE stock_movements (
  movement_id  INTEGER PRIMARY KEY,
  sku          TEXT    NOT NULL REFERENCES products(sku),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(warehouse_id),
  moved_at     TEXT    NOT NULL,
  quantity     INTEGER NOT NULL,
  reason       TEXT    NOT NULL,
  ref          TEXT
);
INSERT INTO stock_movements VALUES
  (1,  'TPE-48',  1, '2024-06-03 09:40',  120, 'receipt',    'PO-2404'),
  (2,  'BLT-M8',  1, '2024-06-03 14:10',   60, 'receipt',    'PO-2401'),
  (3,  'NUT-M8',  1, '2024-06-04 08:55',   80, 'receipt',    'PO-2402'),
  (4,  'BOX-M',   2, '2024-06-04 10:20',  200, 'receipt',    'PO-2405'),
  (5,  'GLV-L',   3, '2024-06-04 13:05',   30, 'receipt',    'PO-2409'),
  (6,  'SCR-440', 2, '2024-06-05 09:15',   50, 'receipt',    'PO-2403'),
  (7,  'CBL-3M',  1, '2024-06-05 11:00',   40, 'receipt',    'PO-2407'),
  (8,  'LED-9W',  2, '2024-06-05 15:30',  100, 'receipt',    'PO-2408'),
  (9,  'TPE-48',  1, '2024-06-06 08:00',  -24, 'transfer',   'TR-01'),
  (10, 'BOX-M',   2, '2024-06-06 09:45',  100, 'receipt',    'PO-2405'),
  (11, 'WRP-500', 3, '2024-06-06 14:20',   20, 'receipt',    'PO-2406'),
  (12, 'TPE-48',  3, '2024-06-07 11:30',   24, 'transfer',   'TR-01'),
  (13, 'VST-M',   1, '2024-06-07 12:00',   25, 'receipt',    'PO-2410'),
  (14, 'BLT-M8',  1, '2024-06-07 16:25',  -12, 'sale',       NULL),
  (15, 'BOX-M',   2, '2024-06-08 10:05',  -80, 'sale',       NULL),
  (16, 'NUT-M8',  1, '2024-06-10 09:30',  -20, 'sale',       NULL),
  (17, 'TPE-48',  1, '2024-06-11 10:40',  -30, 'sale',       NULL),
  (18, 'VST-M',   1, '2024-06-11 14:00',   -6, 'sale',       NULL),
  (19, 'GLV-L',   3, '2024-06-11 15:15',  -12, 'sale',       NULL),
  (20, 'LED-9W',  2, '2024-06-12 11:05',  -60, 'sale',       NULL),
  (21, 'SCR-440', 2, '2024-06-12 14:30',  -10, 'sale',       NULL),
  (22, 'CBL-3M',  1, '2024-06-12 16:45',  -16, 'sale',       NULL),
  (23, 'TPE-48',  1, '2024-06-13 08:00',  -24, 'transfer',   'TR-02'),
  (24, 'TPE-48',  3, '2024-06-13 15:00',  -30, 'sale',       NULL),
  (25, 'TPE-48',  3, '2024-06-13 17:20',   24, 'transfer',   'TR-02'),
  (26, 'BLT-M8',  1, '2024-06-14 15:05',  -15, 'sale',       NULL),
  (27, 'BOX-M',   2, '2024-06-15 10:30',  -60, 'sale',       NULL),
  (28, 'SCR-440', 2, '2024-06-15 16:00',   -2, 'adjustment', NULL),
  (29, 'BLT-M8',  1, '2024-06-18 08:30',  -10, 'transfer',   'TR-03'),
  (30, 'GLV-L',   3, '2024-06-18 09:00',  -14, 'sale',       NULL),
  (31, 'GLV-L',   3, '2024-06-18 16:00',   -8, 'sale',       NULL),
  (32, 'BLT-M8',  2, '2024-06-18 16:50',   10, 'transfer',   'TR-03'),
  (33, 'LED-9W',  2, '2024-06-19 12:00',  -45, 'sale',       NULL),
  (34, 'LED-9W',  2, '2024-06-19 12:00',   60, 'receipt',    'PO-2412'),
  (35, 'SCR-440', 2, '2024-06-19 13:35',   -9, 'sale',       NULL),
  (36, 'NUT-M8',  1, '2024-06-20 14:00',  -20, 'sale',       NULL),
  (37, 'GLV-L',   3, '2024-06-20 17:30',    6, 'adjustment', NULL),
  (38, 'WRP-500', 3, '2024-06-20 17:45',   -1, 'adjustment', NULL),
  (39, 'BLT-M8',  2, '2024-06-21 13:40',  -10, 'sale',       NULL),
  (40, 'BOX-M',   2, '2024-06-22 11:10',  -40, 'sale',       NULL),
  (41, 'BLT-M8',  1, '2024-06-24 10:10',   -8, 'sale',       NULL),
  (42, 'LED-9W',  2, '2024-06-24 11:00',  -25, 'sale',       NULL),
  (43, 'GLV-L',   3, '2024-06-24 15:30',   -5, 'sale',       NULL),
  (44, 'TPE-48',  1, '2024-06-25 10:00',  -20, 'sale',       NULL),
  (45, 'VST-M',   1, '2024-06-26 17:30',   -6, 'transfer',   'TR-04'),
  (46, 'TPE-48',  3, '2024-06-27 14:10',  -15, 'sale',       NULL),
  (47, 'GLV-L',   3, '2024-06-27 16:00',   40, 'receipt',    'PO-2413');
`;

export const WAREHOUSE: ChallengeDataset = {
  initSql: WAREHOUSE_SQL,
  schema: [
    {
      name: "stock_movements",
      rows: "47",
      columns: [
        { name: "movement_id", type: "integer", key: "pk" },
        { name: "sku", type: "text", key: "fk" },
        { name: "warehouse_id", type: "integer", key: "fk" },
        { name: "moved_at", type: "text" },
        { name: "quantity", type: "integer" },
        { name: "reason", type: "text" },
        { name: "ref", type: "text" },
      ],
    },
    {
      name: "products",
      rows: "11",
      columns: [
        { name: "sku", type: "text", key: "pk" },
        { name: "product_name", type: "text" },
        { name: "category", type: "text" },
        { name: "unit_cost", type: "real" },
        { name: "reorder_level", type: "integer" },
      ],
    },
    {
      name: "purchase_orders",
      rows: "14",
      columns: [
        { name: "po_id", type: "text", key: "pk" },
        { name: "supplier_id", type: "integer", key: "fk" },
        { name: "sku", type: "text", key: "fk" },
        { name: "ordered_on", type: "text" },
        { name: "expected_on", type: "text" },
        { name: "ordered_qty", type: "integer" },
        { name: "received_qty", type: "integer" },
      ],
    },
    {
      name: "warehouses",
      rows: "3",
      columns: [
        { name: "warehouse_id", type: "integer", key: "pk" },
        { name: "warehouse_name", type: "text" },
        { name: "city", type: "text" },
      ],
    },
    {
      name: "suppliers",
      rows: "4",
      columns: [
        { name: "supplier_id", type: "integer", key: "pk" },
        { name: "supplier_name", type: "text" },
        { name: "country", type: "text" },
      ],
    },
  ],
};
