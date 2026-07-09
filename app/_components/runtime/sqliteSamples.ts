// Declarative catalogue of the sample SQLite databases offered by the
// SQL playground's database-selector. Each entry owns its own seed
// payload, either an embedded schema + seed function, or a `remoteSql`
// reference into the dataslope/datasets GitHub repo, and the editor
// tabs that should be opened the first time the user lands on that
// database, so adding a new sample is a one-entry change.

import type { Database } from "./sqlite-wasm";
import {
  findSqlSampleById,
  type QueryTabSeed,
  type SqlSampleDatabaseBase,
} from "./sqlSamples";

export type { QueryTabSeed } from "./sqlSamples";

export interface SqliteSampleDatabase extends SqlSampleDatabaseBase {
  /** Multi-statement DDL string. Run as one batch via `db.run`.
   *  Ignored when `remoteSql` is set. */
  schema?: string;
  /** Populates the database tables created by `schema`. Receives a fresh
   *  `Database` so the function can use prepared statements for batch
   *  inserts without interfering with later samples. Ignored when
   *  `remoteSql` is set. */
  seed?: (db: Database) => void;
  /** Path (inside the dataslope/datasets GitHub repo) or full URL of a
   *  SQL script that creates *and* populates the database. Fetched from
   *  raw.githubusercontent.com when the sample is loaded, see
   *  remoteDatasets.ts. */
  remoteSql?: string;
  /** Path (inside the dataslope/datasets GitHub repo) or full URL of a
   *  binary SQLite database file (`.sqlite` / `.db`) to clone instead
   *  of running a script. Considered when `remoteSql` is not set. */
  remoteDb?: string;
  /** Default editor tabs opened on the first visit to this database. */
  defaultTabs: QueryTabSeed[];
}

/** Serialisable subset of SqliteSampleDatabase, safe to send through
 *  postMessage (no function properties). */
export type SqliteSampleMetadata = Omit<SqliteSampleDatabase, "seed">;

// ────────────────────────────────────────────────────────────────────────
// Sample 1: credit_card_transactions.db
// Ported from public/SQL Playground.html, then extended with foreign
// keys, indices, and triggers so the playground can showcase the full
// suite of relational features. The engine enables `PRAGMA
// foreign_keys = ON` at init, so the FOREIGN KEY clauses below are
// actually enforced, references must stay consistent on every insert.
// Notable additions:
//   - cards.user_id              REFERENCES users(user_id)
//   - transactions.user_id       REFERENCES users(user_id)
//   - transactions.card_id       REFERENCES cards(card_id)
//   - transactions.vendor_id     REFERENCES vendors(vendor_id)
//   - five indices on the busy join / filter columns
//   - two AFTER INSERT/DELETE triggers keeping users.num_credit_cards
//     in sync with the actual count of rows in the cards table
//   - one BEFORE INSERT trigger that rejects non-fraud transactions
//     with a negative amount
// ────────────────────────────────────────────────────────────────────────

const CC_SCHEMA = `
  CREATE TABLE users (
    user_id INTEGER PRIMARY KEY,
    name TEXT, current_age INTEGER, birth_year INTEGER,
    gender TEXT, address TEXT, city TEXT, state TEXT,
    zipcode TEXT, annual_income INTEGER, total_debt INTEGER,
    FICO_score INTEGER, num_credit_cards INTEGER,
    debt_to_income_pct REAL GENERATED ALWAYS AS (ROUND(total_debt * 100.0 / NULLIF(annual_income, 0), 2)) STORED
  );
  CREATE TABLE vendors (
    vendor_id INTEGER PRIMARY KEY,
    name TEXT, category TEXT, city TEXT, state TEXT, country TEXT
  );
  CREATE TABLE cards (
    card_id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    card_brand TEXT, card_type TEXT,
    credit_limit INTEGER, acct_open_date TEXT,
    expires TEXT, has_chip INTEGER
  );
  CREATE TABLE transactions (
    transaction_id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    card_id INTEGER REFERENCES cards(card_id),
    vendor_id INTEGER REFERENCES vendors(vendor_id),
    amount REAL, transaction_date TEXT,
    merchant_name TEXT, merchant_city TEXT, merchant_state TEXT,
    merchant_country TEXT, category TEXT, is_fraud INTEGER,
    amount_category TEXT GENERATED ALWAYS AS (CASE WHEN amount < 50 THEN 'small' WHEN amount < 200 THEN 'medium' ELSE 'large' END) STORED
  );
  CREATE INDEX idx_cards_user_id ON cards(user_id);
  CREATE INDEX idx_transactions_user_id ON transactions(user_id);
  CREATE INDEX idx_transactions_card_id ON transactions(card_id);
  CREATE INDEX idx_transactions_vendor_id ON transactions(vendor_id);
  CREATE INDEX idx_transactions_date ON transactions(transaction_date);
  CREATE INDEX idx_transactions_category ON transactions(category);
  CREATE INDEX idx_transactions_is_fraud ON transactions(is_fraud);
  CREATE INDEX idx_users_state ON users(state);
  CREATE INDEX idx_users_fico ON users(FICO_score);
  CREATE INDEX idx_vendors_category ON vendors(category);
  CREATE TRIGGER trg_users_card_count_ai
    AFTER INSERT ON cards
    BEGIN
      UPDATE users
        SET num_credit_cards = (
          SELECT COUNT(*) FROM cards WHERE user_id = NEW.user_id
        )
        WHERE user_id = NEW.user_id;
    END;
  CREATE TRIGGER trg_users_card_count_ad
    AFTER DELETE ON cards
    BEGIN
      UPDATE users
        SET num_credit_cards = (
          SELECT COUNT(*) FROM cards WHERE user_id = OLD.user_id
        )
        WHERE user_id = OLD.user_id;
    END;
  CREATE TRIGGER trg_transactions_block_negative
    BEFORE INSERT ON transactions
    WHEN NEW.amount < 0 AND COALESCE(NEW.is_fraud, 0) = 0
    BEGIN
      SELECT RAISE(ABORT, 'Non-fraud transactions must have amount >= 0');
    END;
  CREATE TRIGGER trg_transactions_block_negative_update
    BEFORE UPDATE OF amount ON transactions
    WHEN NEW.amount < 0 AND COALESCE(NEW.is_fraud, 0) = 0
    BEGIN
      SELECT RAISE(ABORT, 'Non-fraud transactions must have amount >= 0');
    END;
  CREATE VIEW foreign_transactions AS
    SELECT t.*, u.name as user_name
    FROM transactions t
    JOIN users u ON t.user_id = u.user_id
    WHERE merchant_country != 'US';
  CREATE VIEW vendor_summary AS
    SELECT
      merchant_name,
      merchant_city,
      category,
      COUNT(*) as total_transactions,
      ROUND(SUM(amount),2) as total_revenue,
      ROUND(AVG(amount),2) as avg_transaction,
      SUM(is_fraud) as fraud_count
    FROM transactions
    GROUP BY merchant_name, merchant_city, category;
  CREATE VIEW fraud_summary AS
    SELECT
      u.name AS user_name,
      u.state,
      COUNT(*) AS fraud_count,
      ROUND(SUM(t.amount), 2) AS total_fraud_amount
    FROM transactions t
    JOIN users u ON t.user_id = u.user_id
    WHERE t.is_fraud = 1
    GROUP BY t.user_id
    ORDER BY fraud_count DESC;
  CREATE VIEW high_value_customers AS
    SELECT
      u.user_id,
      u.name,
      u.city,
      u.state,
      u.annual_income,
      u.FICO_score,
      COUNT(t.transaction_id) AS total_transactions,
      ROUND(SUM(t.amount), 2) AS total_spent
    FROM users u
    LEFT JOIN transactions t ON u.user_id = t.user_id
    GROUP BY u.user_id
    HAVING total_spent > 500
    ORDER BY total_spent DESC;
  CREATE VIEW monthly_spending AS
    SELECT
      SUBSTR(transaction_date, 1, 7) AS month,
      category,
      COUNT(*) AS num_transactions,
      ROUND(SUM(amount), 2) AS total_amount
    FROM transactions
    GROUP BY month, category
    ORDER BY month DESC, total_amount DESC;
  CREATE VIEW card_utilization AS
    SELECT
      c.card_id,
      c.card_brand,
      c.card_type,
      c.credit_limit,
      u.name AS owner,
      COUNT(t.transaction_id) AS num_transactions,
      ROUND(SUM(t.amount), 2) AS total_charged,
      ROUND(100.0 * SUM(t.amount) / NULLIF(c.credit_limit, 0), 1) AS utilization_pct
    FROM cards c
    JOIN users u ON c.user_id = u.user_id
    LEFT JOIN transactions t ON t.card_id = c.card_id
    GROUP BY c.card_id;
`;

type Row = Array<string | number | null>;

/** Bulk-insert helper that re-uses a single prepared statement.
 *
 * sqlite-wasm's `PreparedStatement.bind()` does not implicitly clear
 * previous bindings, so we pass `true` to `reset()` to mirror the
 * sql.js `Statement.run()` convenience semantics (rebind cleanly per
 * row, step once per row). */
function bulkInsert(db: Database, sql: string, rows: Row[]): void {
  const stmt = db.prepare(sql);
  try {
    for (const row of rows) {
      stmt.bind(row);
      stmt.step();
      stmt.reset(true);
    }
  } finally {
    stmt.finalize();
  }
}

function seedCreditCard(db: Database): void {
  const users: Row[] = [
    [1, "Hazel Robinson", 53, 1966, "Female", "462 Rose Lane", "La Verne", "CA", "91750", 59696, 127613, 787, 5],
    [2, "Sasha Sadr", 54, 1965, "Female", "3606 Federal Ave", "Little Neck", "NY", "11363", 77254, 191349, 701, 3],
    [3, "Saanvi Lee", 81, 1938, "Female", "766 Third Drive", "West Covina", "CA", "91792", 33483, 196, 698, 5],
    [4, "Everlee Clark", 63, 1957, "Female", "3 Madison Street", "New York", "NY", "10069", 249925, 202328, 722, 4],
    [5, "Kyle Peterson", 43, 1976, "Male", "9620 Valley Street", "San Francisco", "CA", "94117", 109687, 183855, 675, 1],
    [6, "Aldo Walker", 42, 1977, "Male", "58 Birch Lane", "Davenport", "IA", "52803", 53797, 0, 704, 2],
    [7, "Mia Torres", 35, 1990, "Female", "14 Elm Court", "Austin", "TX", "78701", 88500, 42000, 745, 3],
    [8, "James Okafor", 29, 1995, "Male", "220 Pine Road", "Chicago", "IL", "60601", 62000, 18500, 710, 2],
    [9, "Priya Sharma", 47, 1977, "Female", "98 Oak Avenue", "Seattle", "WA", "98101", 135000, 67000, 790, 4],
    [10, "Liam Chen", 38, 1986, "Male", "5 Harbor Blvd", "Boston", "MA", "02101", 94000, 33000, 762, 3],
    [11, "Sofia Reyes", 55, 1969, "Female", "780 Maple Dr", "Miami", "FL", "33101", 48000, 91000, 620, 2],
    [12, "Omar Hassan", 61, 1963, "Male", "12 Sunset Blvd", "Los Angeles", "CA", "90001", 72000, 55000, 680, 3],
    [13, "Chloe Martin", 27, 1997, "Female", "33 River Road", "Portland", "OR", "97201", 51000, 12000, 730, 2],
    [14, "Ethan Brooks", 44, 1980, "Male", "190 Cedar Lane", "Denver", "CO", "80201", 115000, 29000, 775, 4],
    [15, "Nina Patel", 52, 1972, "Female", "66 Willow Way", "Houston", "TX", "77001", 83000, 44000, 715, 3],
    [16, "Carlos Gomez", 33, 1991, "Male", "7 Beach Blvd", "San Diego", "CA", "92101", 59000, 21000, 698, 2],
    [17, "Amanda White", 40, 1984, "Female", "44 Park Ave", "Atlanta", "GA", "30301", 76000, 38000, 742, 3],
    [18, "Benjamin Scott", 67, 1957, "Male", "889 Lake Drive", "Phoenix", "AZ", "85001", 41000, 0, 801, 5],
    [19, "Rachel Kim", 31, 1993, "Female", "21 Spruce St", "Nashville", "TN", "37201", 68000, 15000, 758, 2],
    [20, "David Thompson", 58, 1966, "Male", "105 Bay Road", "Dallas", "TX", "75201", 97000, 62000, 690, 4],
  ];
  bulkInsert(db, "INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", users);

  const vendors: Row[] = [
    [1, "Amazon", "E-Commerce", "Seattle", "WA", "US"],
    [2, "Walmart", "Retail", "Bentonville", "AR", "US"],
    [3, "Target", "Retail", "Minneapolis", "MN", "US"],
    [4, "Starbucks", "Food & Beverage", "Seattle", "WA", "US"],
    [5, "Shell", "Gas Station", "Houston", "TX", "US"],
    [6, "Netflix", "Entertainment", "Los Gatos", "CA", "US"],
    [7, "Apple Store", "Electronics", "Cupertino", "CA", "US"],
    [8, "Airbnb", "Travel", "Paris", "", "FR"],
    [9, "Uber", "Transportation", "San Francisco", "CA", "US"],
    [10, "Whole Foods", "Grocery", "Austin", "TX", "US"],
    [11, "Delta Airlines", "Travel", "Atlanta", "GA", "US"],
    [12, "Booking.com", "Travel", "Amsterdam", "", "NL"],
    [13, "Home Depot", "Hardware", "Atlanta", "GA", "US"],
    [14, "Spotify", "Entertainment", "Stockholm", "", "SE"],
    [15, "McDonald's", "Food & Beverage", "Chicago", "IL", "US"],
  ];
  bulkInsert(db, "INSERT INTO vendors VALUES (?,?,?,?,?,?)", vendors);

  // Vendor lookup keyed by merchant name so the new transactions.vendor_id
  // FK can be backfilled deterministically from the existing curated and
  // generated transaction rows. Names without a vendor row are inserted
  // as NULL so the FK remains satisfied.
  const vendorByName = new Map<string, number>();
  for (const v of vendors) vendorByName.set(String(v[1]), Number(v[0]));

  const cards: Row[] = [
    [1, 1, "Visa", "Credit", 12000, "2010-03-15", "2026-03", 1],
    [2, 1, "Mastercard", "Debit", 5000, "2015-07-01", "2027-07", 1],
    [3, 2, "Amex", "Credit", 18000, "2008-11-20", "2025-11", 1],
    [4, 3, "Visa", "Credit", 8000, "2012-05-10", "2026-05", 0],
    [5, 4, "Mastercard", "Credit", 25000, "2005-01-30", "2027-01", 1],
    [6, 4, "Visa", "Debit", 3000, "2018-09-14", "2028-09", 1],
    [7, 5, "Discover", "Credit", 6500, "2019-04-22", "2029-04", 1],
    [8, 6, "Visa", "Credit", 9000, "2013-08-05", "2025-08", 1],
    [9, 6, "Mastercard", "Debit", 2500, "2020-12-01", "2030-12", 1],
    [10, 7, "Amex", "Credit", 22000, "2016-02-17", "2026-02", 1],
    [11, 8, "Visa", "Credit", 5500, "2021-06-30", "2031-06", 1],
    [12, 9, "Mastercard", "Credit", 30000, "2007-10-12", "2027-10", 1],
    [13, 10, "Visa", "Credit", 14000, "2014-03-28", "2026-03", 1],
    [14, 11, "Discover", "Credit", 7000, "2017-11-09", "2027-11", 0],
    [15, 12, "Visa", "Debit", 4000, "2019-01-15", "2029-01", 1],
    [16, 13, "Mastercard", "Credit", 9500, "2022-05-20", "2032-05", 1],
    [17, 14, "Amex", "Credit", 28000, "2011-08-03", "2025-08", 1],
    [18, 15, "Visa", "Credit", 11000, "2015-12-19", "2027-12", 1],
    [19, 16, "Mastercard", "Debit", 3500, "2020-07-07", "2030-07", 1],
    [20, 17, "Visa", "Credit", 16000, "2013-04-25", "2025-04", 1],
  ];
  bulkInsert(db, "INSERT INTO cards VALUES (?,?,?,?,?,?,?,?)", cards);

  const transactions: Row[] = [
    [1, 1, 1, 127.5, "2024-01-05", "Amazon", "Seattle", "WA", "US", "E-Commerce", 0],
    [2, 1, 2, 43.2, "2024-01-07", "Starbucks", "La Verne", "CA", "US", "Food & Beverage", 0],
    [3, 2, 3, 589.99, "2024-01-08", "Apple Store", "New York", "NY", "US", "Electronics", 0],
    [4, 3, 4, 22.1, "2024-01-09", "McDonald's", "Los Angeles", "CA", "US", "Food & Beverage", 0],
    [5, 4, 5, 1250.0, "2024-01-10", "Delta Airlines", "Atlanta", "GA", "US", "Travel", 0],
    [6, 5, 7, 67.8, "2024-01-11", "Shell", "San Francisco", "CA", "US", "Gas Station", 0],
    [7, 6, 8, 34.99, "2024-01-12", "Netflix", "Los Gatos", "CA", "US", "Entertainment", 0],
    [8, 7, 10, 899.0, "2024-01-13", "Apple Store", "Austin", "TX", "US", "Electronics", 0],
    [9, 8, 11, 15.5, "2024-01-14", "Starbucks", "Chicago", "IL", "US", "Food & Beverage", 0],
    [10, 9, 12, 3200.0, "2024-01-15", "Airbnb", "Paris", "", "FR", "Travel", 0],
    [11, 10, 13, 88.4, "2024-01-16", "Whole Foods", "Boston", "MA", "US", "Grocery", 0],
    [12, 11, 14, 9.99, "2024-01-17", "Spotify", "Stockholm", "", "SE", "Entertainment", 0],
    [13, 12, 15, 210.0, "2024-01-18", "Target", "Los Angeles", "CA", "US", "Retail", 0],
    [14, 13, 16, 55.0, "2024-01-19", "Uber", "Portland", "OR", "US", "Transportation", 0],
    [15, 14, 17, 1800.0, "2024-01-20", "Booking.com", "Amsterdam", "", "NL", "Travel", 0],
    [16, 15, 18, 124.3, "2024-01-21", "Home Depot", "Houston", "TX", "US", "Hardware", 0],
    [17, 16, 19, 29.99, "2024-01-22", "Amazon", "Seattle", "WA", "US", "E-Commerce", 0],
    [18, 17, 20, 76.5, "2024-01-23", "Walmart", "Atlanta", "GA", "US", "Retail", 0],
    [19, 18, 1, 440.0, "2024-01-24", "Delta Airlines", "Phoenix", "AZ", "US", "Travel", 0],
    [20, 19, 11, 13.8, "2024-01-25", "McDonald's", "Nashville", "TN", "US", "Food & Beverage", 0],
    [21, 20, 13, 95.0, "2024-01-26", "Shell", "Dallas", "TX", "US", "Gas Station", 0],
    [22, 1, 1, 2500.0, "2024-02-01", "Amazon", "Seattle", "WA", "US", "E-Commerce", 1],
    [23, 2, 3, 680.0, "2024-02-03", "Apple Store", "New York", "NY", "US", "Electronics", 0],
    [24, 4, 5, 380.0, "2024-02-05", "Airbnb", "Tokyo", "", "JP", "Travel", 0],
    [25, 9, 12, 5200.0, "2024-02-08", "Booking.com", "Dubai", "", "AE", "Travel", 0],
    [26, 3, 4, 18.75, "2024-02-10", "Starbucks", "West Covina", "CA", "US", "Food & Beverage", 0],
    [27, 6, 8, 59.99, "2024-02-12", "Spotify", "Stockholm", "", "SE", "Entertainment", 0],
    [28, 7, 10, 1100.0, "2024-02-14", "Apple Store", "Austin", "TX", "US", "Electronics", 0],
    [29, 5, 7, 82.3, "2024-02-16", "Whole Foods", "San Francisco", "CA", "US", "Grocery", 0],
    [30, 14, 17, 3750.0, "2024-02-20", "Delta Airlines", "Atlanta", "GA", "US", "Travel", 0],
    [31, 10, 13, 245.0, "2024-02-22", "Home Depot", "Boston", "MA", "US", "Hardware", 0],
    [32, 11, 14, 9.99, "2024-02-24", "Netflix", "Los Gatos", "CA", "US", "Entertainment", 0],
    [33, 8, 11, 32.0, "2024-02-26", "Uber", "Chicago", "IL", "US", "Transportation", 0],
    [34, 15, 18, 168.5, "2024-03-01", "Walmart", "Houston", "TX", "US", "Retail", 0],
    [35, 16, 19, 14.25, "2024-03-03", "McDonald's", "San Diego", "CA", "US", "Food & Beverage", 0],
    [36, 17, 20, 310.0, "2024-03-05", "Target", "Atlanta", "GA", "US", "Retail", 0],
    [37, 18, 1, 55.0, "2024-03-07", "Shell", "Phoenix", "AZ", "US", "Gas Station", 0],
    [38, 19, 11, 78.9, "2024-03-09", "Amazon", "Seattle", "WA", "US", "E-Commerce", 0],
    [39, 20, 13, 420.0, "2024-03-11", "Delta Airlines", "Dallas", "TX", "US", "Travel", 0],
    [40, 12, 15, 19.99, "2024-03-13", "Spotify", "Stockholm", "", "SE", "Entertainment", 0],
    [41, 13, 16, 41.6, "2024-03-15", "Uber", "Portland", "OR", "US", "Transportation", 0],
    [42, 1, 2, 105.0, "2024-03-17", "Whole Foods", "La Verne", "CA", "US", "Grocery", 0],
    [43, 2, 3, 4100.0, "2024-03-20", "Airbnb", "London", "", "GB", "Travel", 0],
    [44, 4, 6, 72.4, "2024-03-22", "Starbucks", "New York", "NY", "US", "Food & Beverage", 0],
    [45, 9, 12, 88.0, "2024-03-25", "Home Depot", "Seattle", "WA", "US", "Hardware", 0],
    [46, 5, 7, 999.0, "2024-03-28", "Apple Store", "San Francisco", "CA", "US", "Electronics", 0],
    [47, 14, 17, 150.0, "2024-03-30", "Amazon", "Seattle", "WA", "US", "E-Commerce", 0],
    [48, 6, 8, 29.99, "2024-04-01", "Netflix", "Los Gatos", "CA", "US", "Entertainment", 0],
    [49, 3, 4, 6800.0, "2024-04-03", "Booking.com", "Paris", "", "FR", "Travel", 1],
    [50, 7, 10, 62.1, "2024-04-05", "Shell", "Austin", "TX", "US", "Gas Station", 0],
  ];

  // Append a deterministic batch of synthetic transactions so the
  // `transactions` table has well over 200 rows (currently 50 curated
  // entries above + 210 generated below = 260). Used for exercising
  // result pagination in the playground without bloating the source
  // file with hand-written rows. The generator is intentionally
  // seeded/deterministic so query results stay stable across reloads
  // and across users, matching the spirit of the curated rows above.
  const merchants: Array<[string, string, string, string, string]> = [
    ["Amazon", "Seattle", "WA", "US", "E-Commerce"],
    ["Walmart", "Bentonville", "AR", "US", "Retail"],
    ["Target", "Minneapolis", "MN", "US", "Retail"],
    ["Starbucks", "Seattle", "WA", "US", "Food & Beverage"],
    ["Shell", "Houston", "TX", "US", "Gas Station"],
    ["Netflix", "Los Gatos", "CA", "US", "Entertainment"],
    ["Apple Store", "Cupertino", "CA", "US", "Electronics"],
    ["Airbnb", "Paris", "", "FR", "Travel"],
    ["Uber", "San Francisco", "CA", "US", "Transportation"],
    ["Whole Foods", "Austin", "TX", "US", "Grocery"],
    ["Delta Airlines", "Atlanta", "GA", "US", "Travel"],
    ["Booking.com", "Amsterdam", "", "NL", "Travel"],
    ["Home Depot", "Atlanta", "GA", "US", "Hardware"],
    ["Spotify", "Stockholm", "", "SE", "Entertainment"],
    ["McDonald's", "Chicago", "IL", "US", "Food & Beverage"],
  ];
  // Pseudo-random but fully deterministic, small LCG keyed by row id.
  const rand = (n: number, mod: number) => ((n * 2654435761) >>> 0) % mod;
  const startId = transactions.length + 1;
  const targetTotal = 260;
  for (let id = startId; id <= targetTotal; id += 1) {
    const userId = (rand(id + 1, 20)) + 1;
    const cardId = (rand(id + 7, 20)) + 1;
    const m = merchants[rand(id + 3, merchants.length)];
    // Spread dates across calendar year 2024.
    const dayOffset = rand(id + 11, 365);
    const date = new Date(Date.UTC(2024, 0, 1));
    date.setUTCDate(date.getUTCDate() + dayOffset);
    const isoDate = date.toISOString().slice(0, 10);
    // Amount: a few buckets so the mix of small/medium/large stays
    // realistic (most transactions are < $200, occasional large ones).
    const bucket = rand(id + 17, 20);
    let amount: number;
    if (bucket < 12) amount = +(5 + rand(id, 19500) / 100).toFixed(2);
    else if (bucket < 18) amount = +(50 + rand(id + 5, 95000) / 100).toFixed(2);
    else amount = +(500 + rand(id + 9, 750000) / 100).toFixed(2);
    const isFraud = rand(id + 23, 25) === 0 ? 1 : 0;
    transactions.push([
      id,
      userId,
      cardId,
      amount,
      isoDate,
      m[0],
      m[1],
      m[2],
      m[3],
      m[4],
      isFraud,
    ]);
  }

  // Append the vendor_id column to every row by looking up
  // merchant_name in the vendors map. Falls back to NULL when the
  // merchant has no vendor row, which keeps the FK constraint
  // satisfied (NULL is always permitted by FOREIGN KEY in SQLite).
  const transactionsWithVendor: Row[] = transactions.map((row) => {
    const merchantName = String(row[5] ?? "");
    const vendorId = vendorByName.get(merchantName) ?? null;
    return [...row, vendorId];
  });

  bulkInsert(
    db,
    "INSERT INTO transactions (transaction_id, user_id, card_id, amount, transaction_date, merchant_name, merchant_city, merchant_state, merchant_country, category, is_fraud, vendor_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    transactionsWithVendor,
  );
}

const CC_DEFAULT_TABS: QueryTabSeed[] = [
  {
    title: "Query 1",
    code: `-- Explore the users table\nSELECT *\nFROM users\nLIMIT 10;`,
  },
  {
    title: "Query 2",
    code: `-- Find high-income users with low FICO scores\nSELECT name, annual_income, FICO_score, total_debt\nFROM users\nWHERE annual_income > 80000\n  AND FICO_score < 650\nORDER BY FICO_score ASC;`,
  },
  {
    title: "Query 3",
    code: `-- Join transactions with users\nSELECT\n  u.name,\n  t.transaction_id,\n  t.amount,\n  t.merchant_city,\n  t.transaction_date\nFROM transactions t\nJOIN users u ON t.user_id = u.user_id\nORDER BY t.amount DESC\nLIMIT 20;`,
  },
  {
    title: "Query 4",
    code: `-- Vendor spending summary\nSELECT *\nFROM vendor_summary\nORDER BY total_revenue DESC;`,
  },
];

// ────────────────────────────────────────────────────────────────────────
// Sample 2: chinook.db, the complete Chinook music store database
// (v1.4.5), fetched from the dataslope/datasets GitHub repo at load
// time. Table names are PascalCase: Album, Artist, Track, Genre,
// MediaType, Playlist, PlaylistTrack, Customer, Employee, Invoice,
// InvoiceLine.
// ────────────────────────────────────────────────────────────────────────

const CHINOOK_TABS: QueryTabSeed[] = [
  {
    title: "Browse tracks",
    code: `-- Browse the track catalogue\nSELECT t.Name AS Track, a.Title AS Album, ar.Name AS Artist, g.Name AS Genre\nFROM Track t\nJOIN Album a ON t.AlbumId = a.AlbumId\nJOIN Artist ar ON a.ArtistId = ar.ArtistId\nLEFT JOIN Genre g ON t.GenreId = g.GenreId\nORDER BY ar.Name, a.Title\nLIMIT 25;`,
  },
  {
    title: "Top genres",
    code: `-- Track count and catalogue value by genre\nSELECT g.Name AS Genre,\n       COUNT(*) AS TrackCount,\n       ROUND(SUM(t.UnitPrice), 2) AS CatalogValue\nFROM Track t\nJOIN Genre g ON t.GenreId = g.GenreId\nGROUP BY g.GenreId\nORDER BY CatalogValue DESC;`,
  },
  {
    title: "Customer spend",
    code: `-- Total spend per customer\nSELECT c.FirstName || ' ' || c.LastName AS Customer,\n       c.Country,\n       ROUND(SUM(i.Total), 2) AS TotalSpend\nFROM Customer c\nJOIN Invoice i ON i.CustomerId = c.CustomerId\nGROUP BY c.CustomerId\nORDER BY TotalSpend DESC\nLIMIT 20;`,
  },
];

// ────────────────────────────────────────────────────────────────────────
// Sample 3: northwind.db, the classic Northwind store, fetched from
// the dataslope/datasets GitHub repo at load time. Table names are
// PascalCase: Categories, Customers, Employees, OrderDetails, Orders,
// Products, Shippers, Suppliers.
// ────────────────────────────────────────────────────────────────────────

const NORTHWIND_TABS: QueryTabSeed[] = [
  {
    title: "Recent orders",
    code: `-- Recent orders with customer and shipper\nSELECT o.OrderID, o.OrderDate, c.CustomerName, s.ShipperName\nFROM Orders o\nJOIN Customers c ON o.CustomerID = c.CustomerID\nJOIN Shippers s ON o.ShipperID = s.ShipperID\nORDER BY o.OrderDate DESC\nLIMIT 20;`,
  },
  {
    title: "Top products",
    code: `-- Best-selling products by revenue\nSELECT p.ProductName,\n       cat.CategoryName,\n       SUM(od.Quantity) AS UnitsSold,\n       ROUND(SUM(od.Quantity * p.Price), 2) AS Revenue\nFROM OrderDetails od\nJOIN Products p ON od.ProductID = p.ProductID\nJOIN Categories cat ON p.CategoryID = cat.CategoryID\nGROUP BY p.ProductID\nORDER BY Revenue DESC\nLIMIT 15;`,
  },
  {
    title: "Order totals",
    code: `-- Largest orders by total value\nSELECT o.OrderID,\n       o.OrderDate,\n       c.CustomerName,\n       ROUND(SUM(od.Quantity * p.Price), 2) AS Total\nFROM Orders o\nJOIN Customers c ON o.CustomerID = c.CustomerID\nJOIN OrderDetails od ON od.OrderID = o.OrderID\nJOIN Products p ON p.ProductID = od.ProductID\nGROUP BY o.OrderID\nORDER BY Total DESC\nLIMIT 10;`,
  },
];

// ────────────────────────────────────────────────────────────────────────
// Public registry
// ────────────────────────────────────────────────────────────────────────

export const SQLITE_SAMPLE_DATABASES: SqliteSampleDatabase[] = [
  {
    id: "credit_card_transactions",
    label: "Credit card transactions",
    filename: "credit_card_transactions.db",
    description: "Users, cards, vendors, and a small transactions log.",
    schema: CC_SCHEMA,
    seed: seedCreditCard,
    defaultTabs: CC_DEFAULT_TABS,
  },
  {
    id: "chinook",
    label: "Chinook music store",
    filename: "chinook.db",
    description: "The complete Chinook music store: artists, albums, tracks, playlists, customers, and invoices.",
    remoteSql: "sqlite/chinook_sqlite.sql",
    defaultTabs: CHINOOK_TABS,
  },
  {
    id: "northwind",
    label: "Northwind",
    filename: "northwind.db",
    description: "The classic Northwind store: customers, products, orders, and shippers.",
    remoteSql: "sqlite/northwind_sqlite.sql",
    defaultTabs: NORTHWIND_TABS,
  },
];

/** Look a sample up by id, falling back to the first registered sample
 *  if `id` is unknown so the SQL playground always boots into a usable
 *  state even after the user deletes a sample we shipped in a previous
 *  release. */
export function findSampleDatabase(id: string): SqliteSampleDatabase {
  return findSqlSampleById(id, SQLITE_SAMPLE_DATABASES);
}
