"use client";

import type { QueryTabSeed } from "./sqliteSamples";

export interface DuckDbSampleDatabase {
  id: string;
  label: string;
  filename: string;
  description: string;
  sql: string;
  defaultTabs: QueryTabSeed[];
}

// ─── E-Commerce / Credit-Card Transactions sample ────────────────────────────
const CREDIT_CARD_SQL = `
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  name VARCHAR,
  current_age INTEGER,
  birth_year INTEGER,
  gender VARCHAR,
  city VARCHAR,
  state VARCHAR,
  address VARCHAR,
  zipcode VARCHAR,
  annual_income INTEGER,
  total_debt INTEGER,
  fico_score INTEGER,
  num_credit_cards INTEGER DEFAULT 0,
  debt_to_income_pct DOUBLE GENERATED ALWAYS AS (ROUND(total_debt * 100.0 / NULLIF(annual_income, 0), 2)) STORED
);
CREATE TABLE vendors (
  vendor_id INTEGER PRIMARY KEY,
  name VARCHAR,
  category VARCHAR,
  city VARCHAR,
  state VARCHAR,
  country VARCHAR
);
CREATE TABLE cards (
  card_id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  card_brand VARCHAR,
  card_type VARCHAR,
  credit_limit INTEGER,
  acct_open_date DATE,
  expires VARCHAR,
  has_chip BOOLEAN
);
CREATE TABLE transactions (
  transaction_id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  card_id INTEGER REFERENCES cards(card_id),
  vendor_id INTEGER REFERENCES vendors(vendor_id),
  amount DECIMAL(10,2),
  transaction_date DATE,
  merchant_name VARCHAR,
  merchant_city VARCHAR,
  merchant_state VARCHAR,
  merchant_country VARCHAR,
  category VARCHAR,
  is_fraud BOOLEAN DEFAULT false,
  amount_category VARCHAR GENERATED ALWAYS AS (CASE WHEN amount < 50 THEN 'small' WHEN amount < 200 THEN 'medium' ELSE 'large' END) STORED
);
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_card_id ON transactions(card_id);
CREATE INDEX idx_transactions_vendor_id ON transactions(vendor_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_category ON transactions(category);

INSERT INTO users (user_id, name, current_age, birth_year, gender, city, state, address, zipcode, annual_income, total_debt, fico_score, num_credit_cards) VALUES
  (1,'Hazel Robinson',53,1966,'Female','La Verne','CA','462 Rose Lane','91750',59696,127613,787,5),
  (2,'Sasha Sadr',54,1965,'Female','Little Neck','NY','3606 Federal Ave','11363',77254,191349,701,3),
  (3,'Saanvi Lee',81,1938,'Female','West Covina','CA','766 Third Drive','91792',33483,196,698,5),
  (4,'Everlee Clark',63,1957,'Female','New York','NY','3 Madison Street','10069',249925,202328,722,4),
  (5,'Kyle Peterson',43,1976,'Male','San Francisco','CA','9620 Valley Street','94117',109687,183855,675,1),
  (6,'Aldo Walker',42,1977,'Male','Davenport','IA','58 Birch Lane','52803',53797,0,704,2),
  (7,'Mia Torres',35,1990,'Female','Austin','TX','14 Elm Court','78701',88500,42000,745,3),
  (8,'James Okafor',29,1995,'Male','Chicago','IL','220 Pine Road','60601',62000,18500,710,2),
  (9,'Priya Sharma',47,1977,'Female','Seattle','WA','98 Oak Avenue','98101',135000,67000,790,4),
  (10,'Liam Chen',38,1986,'Male','Boston','MA','5 Harbor Blvd','02101',94000,33000,762,3),
  (11,'Sofia Reyes',55,1969,'Female','Miami','FL','780 Maple Dr','33101',48000,91000,620,2),
  (12,'Omar Hassan',61,1963,'Male','Los Angeles','CA','12 Sunset Blvd','90001',72000,55000,680,3),
  (13,'Chloe Martin',27,1997,'Female','Portland','OR','33 River Road','97201',51000,12000,730,2),
  (14,'Ethan Brooks',44,1980,'Male','Denver','CO','190 Cedar Lane','80201',115000,29000,775,4),
  (15,'Nina Patel',52,1972,'Female','Houston','TX','66 Willow Way','77001',83000,44000,715,3),
  (16,'Carlos Gomez',33,1991,'Male','San Diego','CA','7 Beach Blvd','92101',59000,21000,698,2),
  (17,'Amanda White',40,1984,'Female','Atlanta','GA','44 Park Ave','30301',76000,38000,742,3),
  (18,'Benjamin Scott',67,1957,'Male','Phoenix','AZ','889 Lake Drive','85001',41000,0,801,5),
  (19,'Rachel Kim',31,1993,'Female','Nashville','TN','21 Spruce St','37201',68000,15000,758,2),
  (20,'David Thompson',58,1966,'Male','Dallas','TX','105 Bay Road','75201',97000,62000,690,4);
INSERT INTO vendors VALUES
  (1,'Amazon','E-Commerce','Seattle','WA','US'),
  (2,'Walmart','Retail','Bentonville','AR','US'),
  (3,'Target','Retail','Minneapolis','MN','US'),
  (4,'Starbucks','Food & Beverage','Seattle','WA','US'),
  (5,'Shell','Gas Station','Houston','TX','US'),
  (6,'Netflix','Entertainment','Los Gatos','CA','US'),
  (7,'Apple Store','Electronics','Cupertino','CA','US'),
  (8,'Airbnb','Travel','Paris',NULL,'FR'),
  (9,'Uber','Transportation','San Francisco','CA','US'),
  (10,'Whole Foods','Grocery','Austin','TX','US'),
  (11,'Delta Airlines','Travel','Atlanta','GA','US'),
  (12,'Booking.com','Travel','Amsterdam',NULL,'NL'),
  (13,'Home Depot','Hardware','Atlanta','GA','US'),
  (14,'Spotify','Entertainment','Stockholm',NULL,'SE'),
  (15,'McDonald''s','Food & Beverage','Chicago','IL','US');
INSERT INTO cards VALUES
  (1,1,'Visa','Credit',12000,'2010-03-15','2026-03',true),
  (2,1,'Mastercard','Debit',5000,'2015-07-01','2027-07',true),
  (3,2,'Amex','Credit',18000,'2008-11-20','2025-11',true),
  (4,3,'Visa','Credit',8000,'2012-05-10','2026-05',false),
  (5,4,'Mastercard','Credit',25000,'2005-01-30','2027-01',true),
  (6,4,'Visa','Debit',3000,'2018-09-14','2028-09',true),
  (7,5,'Discover','Credit',6500,'2019-04-22','2029-04',true),
  (8,6,'Visa','Credit',9000,'2013-08-05','2025-08',true),
  (9,6,'Mastercard','Debit',2500,'2020-12-01','2030-12',true),
  (10,7,'Amex','Credit',22000,'2016-02-17','2026-02',true),
  (11,8,'Visa','Credit',5500,'2021-06-30','2031-06',true),
  (12,9,'Mastercard','Credit',30000,'2007-10-12','2027-10',true),
  (13,10,'Visa','Credit',14000,'2014-03-28','2026-03',true),
  (14,11,'Discover','Credit',7000,'2017-11-09','2027-11',false),
  (15,12,'Visa','Debit',4000,'2019-01-15','2029-01',true),
  (16,13,'Mastercard','Credit',9500,'2022-05-20','2032-05',true),
  (17,14,'Amex','Credit',28000,'2011-08-03','2025-08',true),
  (18,15,'Visa','Credit',11000,'2015-12-19','2027-12',true),
  (19,16,'Mastercard','Debit',3500,'2020-07-07','2030-07',true),
  (20,17,'Visa','Credit',16000,'2013-04-25','2025-04',true);
INSERT INTO transactions VALUES
  (1,1,1,1,127.50,'2024-01-05','Amazon','Seattle','WA','US','E-Commerce',false),
  (2,1,2,4,43.20,'2024-01-07','Starbucks','La Verne','CA','US','Food & Beverage',false),
  (3,2,3,7,589.99,'2024-01-08','Apple Store','New York','NY','US','Electronics',false),
  (4,3,4,15,22.10,'2024-01-09','McDonald''s','Los Angeles','CA','US','Food & Beverage',false),
  (5,4,5,11,1250.00,'2024-01-10','Delta Airlines','Atlanta','GA','US','Travel',false),
  (6,5,7,5,67.80,'2024-01-11','Shell','San Francisco','CA','US','Gas Station',false),
  (7,6,8,6,34.99,'2024-01-12','Netflix','Los Gatos','CA','US','Entertainment',false),
  (8,7,10,7,899.00,'2024-01-13','Apple Store','Austin','TX','US','Electronics',false),
  (9,8,11,4,15.50,'2024-01-14','Starbucks','Chicago','IL','US','Food & Beverage',false),
  (10,9,12,8,3200.00,'2024-01-15','Airbnb','Paris',NULL,'FR','Travel',false),
  (11,10,13,10,88.40,'2024-01-16','Whole Foods','Boston','MA','US','Grocery',false),
  (12,11,14,14,9.99,'2024-01-17','Spotify','Stockholm',NULL,'SE','Entertainment',false),
  (13,12,15,3,210.00,'2024-01-18','Target','Los Angeles','CA','US','Retail',false),
  (14,13,16,9,55.00,'2024-01-19','Uber','Portland','OR','US','Transportation',false),
  (15,14,17,12,1800.00,'2024-01-20','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (16,15,18,13,124.30,'2024-01-21','Home Depot','Houston','TX','US','Hardware',false),
  (17,16,19,1,29.99,'2024-01-22','Amazon','Seattle','WA','US','E-Commerce',false),
  (18,17,20,2,76.50,'2024-01-23','Walmart','Atlanta','GA','US','Retail',false),
  (19,18,1,11,440.00,'2024-01-24','Delta Airlines','Phoenix','AZ','US','Travel',false),
  (20,19,11,15,13.80,'2024-01-25','McDonald''s','Nashville','TN','US','Food & Beverage',false),
  (21,20,13,5,95.00,'2024-01-26','Shell','Dallas','TX','US','Gas Station',false),
  (22,1,1,1,2500.00,'2024-02-01','Amazon','Seattle','WA','US','E-Commerce',true),
  (23,2,3,7,680.00,'2024-02-03','Apple Store','New York','NY','US','Electronics',false),
  (24,4,5,8,380.00,'2024-02-05','Airbnb','Tokyo',NULL,'JP','Travel',false),
  (25,9,12,12,5200.00,'2024-02-08','Booking.com','Dubai',NULL,'AE','Travel',false),
  (26,3,4,4,18.75,'2024-02-10','Starbucks','West Covina','CA','US','Food & Beverage',false),
  (27,6,8,14,59.99,'2024-02-12','Spotify','Stockholm',NULL,'SE','Entertainment',false),
  (28,7,10,7,1100.00,'2024-02-14','Apple Store','Austin','TX','US','Electronics',false),
  (29,5,7,10,82.30,'2024-02-16','Whole Foods','San Francisco','CA','US','Grocery',false),
  (30,14,17,11,3750.00,'2024-02-20','Delta Airlines','Atlanta','GA','US','Travel',false),
  (31,10,13,13,245.00,'2024-02-22','Home Depot','Boston','MA','US','Hardware',false),
  (32,11,14,6,9.99,'2024-02-24','Netflix','Los Gatos','CA','US','Entertainment',false),
  (33,8,11,9,32.00,'2024-02-26','Uber','Chicago','IL','US','Transportation',false),
  (34,15,18,2,168.50,'2024-03-01','Walmart','Houston','TX','US','Retail',false),
  (35,16,19,15,14.25,'2024-03-03','McDonald''s','San Diego','CA','US','Food & Beverage',false),
  (36,17,20,3,310.00,'2024-03-05','Target','Atlanta','GA','US','Retail',false),
  (37,18,1,5,55.00,'2024-03-07','Shell','Phoenix','AZ','US','Gas Station',false),
  (38,19,11,1,78.90,'2024-03-09','Amazon','Seattle','WA','US','E-Commerce',false),
  (39,20,13,11,420.00,'2024-03-11','Delta Airlines','Dallas','TX','US','Travel',false),
  (40,12,15,14,19.99,'2024-03-13','Spotify','Stockholm',NULL,'SE','Entertainment',false),
  (41,13,16,9,41.60,'2024-03-15','Uber','Portland','OR','US','Transportation',false),
  (42,1,2,10,105.00,'2024-03-17','Whole Foods','La Verne','CA','US','Grocery',false),
  (43,2,3,8,4100.00,'2024-03-20','Airbnb','London',NULL,'GB','Travel',false),
  (44,4,6,4,72.40,'2024-03-22','Starbucks','New York','NY','US','Food & Beverage',false),
  (45,9,12,13,88.00,'2024-03-25','Home Depot','Seattle','WA','US','Hardware',false),
  (46,5,7,7,999.00,'2024-03-28','Apple Store','San Francisco','CA','US','Electronics',false),
  (47,14,17,1,150.00,'2024-03-30','Amazon','Seattle','WA','US','E-Commerce',false),
  (48,6,8,6,29.99,'2024-04-01','Netflix','Los Gatos','CA','US','Entertainment',false),
  (49,3,4,12,6800.00,'2024-04-03','Booking.com','Paris',NULL,'FR','Travel',true),
  (50,7,10,5,62.10,'2024-04-05','Shell','Austin','TX','US','Gas Station',false);
`;

// ─── Sample database definitions ─────────────────────────────────────────────

export const DUCKDB_BLANK_DATABASE: DuckDbSampleDatabase = {
  id: "duckdb_blank",
  label: "Blank",
  filename: "blank.duckdb",
  description: "An empty DuckDB database.",
  sql: "",
  defaultTabs: [{ title: "Query 1", code: "" }],
};

export const DUCKDB_SAMPLE_DATABASES: DuckDbSampleDatabase[] = [
  {
    id: "duckdb_cc_transactions",
    label: "E-Commerce",
    filename: "ecommerce.duckdb",
    description:
      "Credit-card transactions across users, vendors, and cards. Includes generated columns and indexes.",
    sql: CREDIT_CARD_SQL,
    defaultTabs: [
      {
        title: "Explore",
        code: `-- Total spending per category\nSELECT\n  category,\n  COUNT(*) AS num_transactions,\n  SUM(amount) AS total_amount,\n  AVG(amount) AS avg_amount\nFROM transactions\nGROUP BY category\nORDER BY total_amount DESC;`,
      },
      {
        title: "Fraud analysis",
        code: `-- Fraud rate by user\nSELECT\n  u.name,\n  COUNT(*) AS total_txns,\n  SUM(CASE WHEN t.is_fraud THEN 1 ELSE 0 END) AS fraud_count,\n  ROUND(100.0 * SUM(CASE WHEN t.is_fraud THEN 1 ELSE 0 END) / COUNT(*), 2) AS fraud_pct\nFROM transactions t\nJOIN users u ON t.user_id = u.user_id\nGROUP BY u.user_id, u.name\nHAVING fraud_count > 0\nORDER BY fraud_pct DESC;`,
      },
      {
        title: "DuckDB features",
        code: `-- DuckDB-specific syntax: list aggregation and struct\nSELECT\n  category,\n  list(DISTINCT merchant_name) AS merchants,\n  {'min': MIN(amount), 'max': MAX(amount), 'avg': AVG(amount)} AS amount_stats\nFROM transactions\nGROUP BY category\nORDER BY category;`,
      },
    ],
  },
  DUCKDB_BLANK_DATABASE,
];

export function findDuckDbSampleDatabase(id: string): DuckDbSampleDatabase {
  return (
    DUCKDB_SAMPLE_DATABASES.find((s) => s.id === id) ??
    DUCKDB_SAMPLE_DATABASES[0]
  );
}
