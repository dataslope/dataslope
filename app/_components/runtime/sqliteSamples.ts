// Declarative catalogue of the sample SQLite databases offered by the
// SQL playground's database-selector. Each entry owns its own schema,
// seed data, and the editor tabs that should be opened the first time
// the user lands on that database — so adding a new sample (or, later,
// loading a binary `.sqlite` file) is a one-entry change.

import type { Database } from "sql.js";

export interface QueryTabSeed {
  /** Human-readable title shown in the tab strip. */
  title: string;
  /** Initial SQL contents of the tab. */
  code: string;
}

export interface SqliteSampleDatabase {
  /** Stable id used in localStorage keys and the selector value. */
  id: string;
  /** Human-readable name shown in the selector trigger and dropdown. */
  label: string;
  /** Display filename (e.g. `chinook.db`) shown next to the selector
   *  trigger so the user sees the same on-disk metaphor used by other
   *  SQLite tools. */
  filename: string;
  /** Short description shown under the label in the selector dropdown. */
  description: string;
  /** Multi-statement DDL string. Run as one batch via `db.run`. */
  schema: string;
  /** Populates the database tables created by `schema`. Receives a fresh
   *  `Database` so the function can use prepared statements for batch
   *  inserts without interfering with later samples. */
  seed: (db: Database) => void;
  /** Default editor tabs opened on the first visit to this database. */
  defaultTabs: QueryTabSeed[];
}

// ────────────────────────────────────────────────────────────────────────
// Sample 1: credit_card_transactions.db
// Ported verbatim from public/SQL Playground.html so existing users see
// the same data they were drafting against.
// ────────────────────────────────────────────────────────────────────────

const CC_SCHEMA = `
  CREATE TABLE users (
    user_id INTEGER PRIMARY KEY,
    name TEXT, current_age INTEGER, birth_year INTEGER,
    gender TEXT, address TEXT, city TEXT, state TEXT,
    zipcode TEXT, annual_income INTEGER, total_debt INTEGER,
    FICO_score INTEGER, num_credit_cards INTEGER
  );
  CREATE TABLE cards (
    card_id INTEGER PRIMARY KEY,
    user_id INTEGER, card_brand TEXT, card_type TEXT,
    credit_limit INTEGER, acct_open_date TEXT,
    expires TEXT, has_chip INTEGER
  );
  CREATE TABLE transactions (
    transaction_id INTEGER PRIMARY KEY,
    user_id INTEGER, card_id INTEGER,
    amount REAL, transaction_date TEXT,
    merchant_name TEXT, merchant_city TEXT, merchant_state TEXT,
    merchant_country TEXT, category TEXT, is_fraud INTEGER
  );
  CREATE TABLE vendors (
    vendor_id INTEGER PRIMARY KEY,
    name TEXT, category TEXT, city TEXT, state TEXT, country TEXT
  );
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
`;

type Row = Array<string | number | null>;

function bulkInsert(db: Database, sql: string, rows: Row[]): void {
  const stmt = db.prepare(sql);
  try {
    for (const row of rows) {
      stmt.run(row);
    }
  } finally {
    stmt.free();
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
  bulkInsert(
    db,
    "INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    transactions,
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
// Sample 2: chinook.db (tiny subset of the classic Chinook music store)
// ────────────────────────────────────────────────────────────────────────

const CHINOOK_SCHEMA = `
  CREATE TABLE artists (
    artist_id INTEGER PRIMARY KEY,
    name TEXT
  );
  CREATE TABLE albums (
    album_id INTEGER PRIMARY KEY,
    title TEXT,
    artist_id INTEGER REFERENCES artists(artist_id)
  );
  CREATE TABLE tracks (
    track_id INTEGER PRIMARY KEY,
    name TEXT,
    album_id INTEGER REFERENCES albums(album_id),
    genre TEXT,
    milliseconds INTEGER,
    unit_price REAL
  );
  CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    first_name TEXT, last_name TEXT,
    email TEXT, country TEXT
  );
  CREATE TABLE invoices (
    invoice_id INTEGER PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    invoice_date TEXT,
    total REAL
  );
  CREATE VIEW top_genres AS
    SELECT
      genre,
      COUNT(*) AS track_count,
      ROUND(AVG(milliseconds) / 1000.0, 1) AS avg_seconds,
      ROUND(SUM(unit_price), 2) AS catalog_value
    FROM tracks
    GROUP BY genre;
`;

function seedChinook(db: Database): void {
  const artists: Row[] = [
    [1, "AC/DC"],
    [2, "Accept"],
    [3, "Aerosmith"],
    [4, "Alanis Morissette"],
    [5, "Alice In Chains"],
    [6, "Antônio Carlos Jobim"],
    [7, "Apocalyptica"],
    [8, "Audioslave"],
    [9, "BackBeat"],
    [10, "Billy Cobham"],
  ];
  bulkInsert(db, "INSERT INTO artists VALUES (?, ?)", artists);

  const albums: Row[] = [
    [1, "For Those About To Rock We Salute You", 1],
    [2, "Balls to the Wall", 2],
    [3, "Restless and Wild", 2],
    [4, "Let There Be Rock", 1],
    [5, "Big Ones", 3],
    [6, "Jagged Little Pill", 4],
    [7, "Facelift", 5],
    [8, "Warner 25 Anos", 6],
    [9, "Plays Metallica By Four Cellos", 7],
    [10, "Audioslave", 8],
  ];
  bulkInsert(db, "INSERT INTO albums VALUES (?, ?, ?)", albums);

  const tracks: Row[] = [
    [1, "For Those About To Rock (We Salute You)", 1, "Rock", 343719, 0.99],
    [2, "Put The Finger On You", 1, "Rock", 205662, 0.99],
    [3, "Let's Get It Up", 1, "Rock", 233926, 0.99],
    [4, "Inject The Venom", 1, "Rock", 210834, 0.99],
    [5, "Snowballed", 1, "Rock", 203102, 0.99],
    [6, "Balls to the Wall", 2, "Rock", 342562, 0.99],
    [7, "Fast As a Shark", 3, "Rock", 230619, 0.99],
    [8, "Restless and Wild", 3, "Rock", 252051, 0.99],
    [9, "Princess of the Dawn", 3, "Rock", 375418, 0.99],
    [10, "Go Down", 4, "Rock", 313398, 0.99],
    [11, "Dream On", 5, "Rock", 275866, 0.99],
    [12, "Walk This Way", 5, "Rock", 211098, 0.99],
    [13, "All I Really Want", 6, "Rock", 284891, 0.99],
    [14, "You Oughta Know", 6, "Rock", 249234, 0.99],
    [15, "Ironic", 6, "Rock", 229733, 0.99],
    [16, "Man In The Box", 7, "Alternative", 286641, 0.99],
    [17, "Them Bones", 7, "Alternative", 150221, 0.99],
    [18, "Garota De Ipanema", 8, "Latin", 285673, 0.99],
    [19, "Enter Sandman", 9, "Classical", 214665, 0.99],
    [20, "Cochise", 10, "Alternative", 222380, 0.99],
  ];
  bulkInsert(
    db,
    "INSERT INTO tracks VALUES (?, ?, ?, ?, ?, ?)",
    tracks,
  );

  const customers: Row[] = [
    [1, "Luís", "Gonçalves", "luisg@embraer.com.br", "Brazil"],
    [2, "Leonie", "Köhler", "leonekohler@surfeu.de", "Germany"],
    [3, "François", "Tremblay", "ftremblay@gmail.com", "Canada"],
    [4, "Bjørn", "Hansen", "bjorn.hansen@yahoo.no", "Norway"],
    [5, "František", "Wichterlová", "frantisekw@jetbrains.com", "Czech Republic"],
    [6, "Helena", "Holý", "hholy@gmail.com", "Czech Republic"],
    [7, "Astrid", "Gruber", "astrid.gruber@apple.at", "Austria"],
    [8, "Daan", "Peeters", "daan_peeters@apple.be", "Belgium"],
    [9, "Kara", "Nielsen", "kara.nielsen@jubii.dk", "Denmark"],
    [10, "Eduardo", "Martins", "eduardo@woodstock.com.br", "Brazil"],
  ];
  bulkInsert(db, "INSERT INTO customers VALUES (?, ?, ?, ?, ?)", customers);

  const invoices: Row[] = [
    [1, 1, "2023-01-01", 1.98],
    [2, 2, "2023-01-02", 3.96],
    [3, 3, "2023-01-03", 5.94],
    [4, 4, "2023-01-04", 8.91],
    [5, 5, "2023-01-05", 13.86],
    [6, 6, "2023-02-01", 0.99],
    [7, 7, "2023-02-02", 1.98],
    [8, 8, "2023-02-03", 3.96],
    [9, 9, "2023-02-04", 5.94],
    [10, 10, "2023-02-05", 8.91],
    [11, 1, "2023-03-01", 13.86],
    [12, 2, "2023-03-02", 0.99],
    [13, 3, "2023-03-03", 1.98],
    [14, 4, "2023-03-04", 7.96],
    [15, 5, "2023-03-05", 1.98],
  ];
  bulkInsert(db, "INSERT INTO invoices VALUES (?, ?, ?, ?)", invoices);
}

const CHINOOK_TABS: QueryTabSeed[] = [
  {
    title: "Browse tracks",
    code: `-- Browse the track catalogue\nSELECT t.name, a.title AS album, ar.name AS artist, t.genre\nFROM tracks t\nJOIN albums a ON t.album_id = a.album_id\nJOIN artists ar ON a.artist_id = ar.artist_id\nORDER BY ar.name, a.title\nLIMIT 25;`,
  },
  {
    title: "Top genres",
    code: `-- Catalogue value by genre\nSELECT *\nFROM top_genres\nORDER BY catalog_value DESC;`,
  },
  {
    title: "Customer spend",
    code: `-- Total spend per customer\nSELECT c.first_name || ' ' || c.last_name AS customer,\n       c.country,\n       ROUND(SUM(i.total), 2) AS total_spend\nFROM customers c\nJOIN invoices i ON i.customer_id = c.customer_id\nGROUP BY c.customer_id\nORDER BY total_spend DESC;`,
  },
];

// ────────────────────────────────────────────────────────────────────────
// Sample 3: northwind.db (tiny subset of the classic Northwind store)
// ────────────────────────────────────────────────────────────────────────

const NORTHWIND_SCHEMA = `
  CREATE TABLE customers (
    customer_id TEXT PRIMARY KEY,
    company_name TEXT,
    contact_name TEXT,
    country TEXT
  );
  CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    title TEXT,
    hire_date TEXT
  );
  CREATE TABLE products (
    product_id INTEGER PRIMARY KEY,
    product_name TEXT,
    category TEXT,
    unit_price REAL,
    units_in_stock INTEGER
  );
  CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_id TEXT REFERENCES customers(customer_id),
    employee_id INTEGER REFERENCES employees(employee_id),
    order_date TEXT,
    ship_country TEXT
  );
  CREATE TABLE order_details (
    order_id INTEGER REFERENCES orders(order_id),
    product_id INTEGER REFERENCES products(product_id),
    quantity INTEGER,
    unit_price REAL,
    PRIMARY KEY (order_id, product_id)
  );
  CREATE VIEW order_totals AS
    SELECT
      o.order_id,
      o.order_date,
      c.company_name,
      ROUND(SUM(od.quantity * od.unit_price), 2) AS total
    FROM orders o
    JOIN customers c ON o.customer_id = c.customer_id
    JOIN order_details od ON od.order_id = o.order_id
    GROUP BY o.order_id;
`;

function seedNorthwind(db: Database): void {
  const customers: Row[] = [
    ["ALFKI", "Alfreds Futterkiste", "Maria Anders", "Germany"],
    ["ANATR", "Ana Trujillo Emparedados", "Ana Trujillo", "Mexico"],
    ["ANTON", "Antonio Moreno Taquería", "Antonio Moreno", "Mexico"],
    ["AROUT", "Around the Horn", "Thomas Hardy", "UK"],
    ["BERGS", "Berglunds snabbköp", "Christina Berglund", "Sweden"],
    ["BLAUS", "Blauer See Delikatessen", "Hanna Moos", "Germany"],
    ["BLONP", "Blondesddsl père et fils", "Frédérique Citeaux", "France"],
    ["BOLID", "Bólido Comidas preparadas", "Martín Sommer", "Spain"],
    ["BONAP", "Bon app'", "Laurence Lebihan", "France"],
    ["BOTTM", "Bottom-Dollar Markets", "Elizabeth Lincoln", "Canada"],
  ];
  bulkInsert(db, "INSERT INTO customers VALUES (?, ?, ?, ?)", customers);

  const employees: Row[] = [
    [1, "Nancy", "Davolio", "Sales Representative", "1992-05-01"],
    [2, "Andrew", "Fuller", "Vice President, Sales", "1992-08-14"],
    [3, "Janet", "Leverling", "Sales Representative", "1992-04-01"],
    [4, "Margaret", "Peacock", "Sales Representative", "1993-05-03"],
    [5, "Steven", "Buchanan", "Sales Manager", "1993-10-17"],
  ];
  bulkInsert(db, "INSERT INTO employees VALUES (?, ?, ?, ?, ?)", employees);

  const products: Row[] = [
    [1, "Chai", "Beverages", 18.0, 39],
    [2, "Chang", "Beverages", 19.0, 17],
    [3, "Aniseed Syrup", "Condiments", 10.0, 13],
    [4, "Chef Anton's Cajun Seasoning", "Condiments", 22.0, 53],
    [5, "Grandma's Boysenberry Spread", "Condiments", 25.0, 120],
    [6, "Uncle Bob's Organic Dried Pears", "Produce", 30.0, 15],
    [7, "Northwoods Cranberry Sauce", "Condiments", 40.0, 6],
    [8, "Mishi Kobe Niku", "Meat/Poultry", 97.0, 29],
    [9, "Ikura", "Seafood", 31.0, 31],
    [10, "Queso Cabrales", "Dairy Products", 21.0, 22],
  ];
  bulkInsert(
    db,
    "INSERT INTO products VALUES (?, ?, ?, ?, ?)",
    products,
  );

  const orders: Row[] = [
    [10248, "ALFKI", 1, "2023-07-04", "France"],
    [10249, "ANATR", 2, "2023-07-05", "Germany"],
    [10250, "ANTON", 3, "2023-07-08", "Brazil"],
    [10251, "AROUT", 4, "2023-07-08", "France"],
    [10252, "BERGS", 5, "2023-07-09", "Belgium"],
    [10253, "BLAUS", 1, "2023-07-10", "Germany"],
    [10254, "BLONP", 2, "2023-07-11", "France"],
    [10255, "BOLID", 3, "2023-07-12", "Spain"],
    [10256, "BONAP", 4, "2023-07-15", "France"],
    [10257, "BOTTM", 5, "2023-07-16", "Canada"],
  ];
  bulkInsert(db, "INSERT INTO orders VALUES (?, ?, ?, ?, ?)", orders);

  const orderDetails: Row[] = [
    [10248, 1, 12, 18.0],
    [10248, 2, 10, 19.0],
    [10249, 3, 5, 10.0],
    [10250, 4, 9, 22.0],
    [10250, 5, 35, 25.0],
    [10251, 6, 6, 30.0],
    [10252, 7, 40, 40.0],
    [10253, 8, 20, 97.0],
    [10254, 9, 15, 31.0],
    [10255, 10, 25, 21.0],
    [10256, 1, 5, 18.0],
    [10257, 2, 4, 19.0],
  ];
  bulkInsert(
    db,
    "INSERT INTO order_details VALUES (?, ?, ?, ?)",
    orderDetails,
  );
}

const NORTHWIND_TABS: QueryTabSeed[] = [
  {
    title: "Recent orders",
    code: `-- Recent orders with company + ship country\nSELECT o.order_id, o.order_date, c.company_name, o.ship_country\nFROM orders o\nJOIN customers c ON o.customer_id = c.customer_id\nORDER BY o.order_date DESC\nLIMIT 20;`,
  },
  {
    title: "Top products",
    code: `-- Best-selling products by units shipped\nSELECT p.product_name,\n       p.category,\n       SUM(od.quantity) AS units_sold,\n       ROUND(SUM(od.quantity * od.unit_price), 2) AS revenue\nFROM order_details od\nJOIN products p ON od.product_id = p.product_id\nGROUP BY p.product_id\nORDER BY revenue DESC;`,
  },
  {
    title: "Order totals",
    code: `-- Order totals view\nSELECT *\nFROM order_totals\nORDER BY total DESC\nLIMIT 10;`,
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
    description: "Artists, albums, tracks, customers, and invoices.",
    schema: CHINOOK_SCHEMA,
    seed: seedChinook,
    defaultTabs: CHINOOK_TABS,
  },
  {
    id: "northwind",
    label: "Northwind",
    filename: "northwind.db",
    description: "Classic Northwind subset: customers, products, and orders.",
    schema: NORTHWIND_SCHEMA,
    seed: seedNorthwind,
    defaultTabs: NORTHWIND_TABS,
  },
];

/** Look a sample up by id, falling back to the first registered sample
 *  if `id` is unknown so the SQL playground always boots into a usable
 *  state even after the user deletes a sample we shipped in a previous
 *  release. */
export function findSampleDatabase(id: string): SqliteSampleDatabase {
  return (
    SQLITE_SAMPLE_DATABASES.find((s) => s.id === id) ??
    SQLITE_SAMPLE_DATABASES[0]
  );
}
