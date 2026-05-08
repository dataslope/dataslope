"use client";

import type { QueryTabSeed } from "./sqliteSamples";

export interface PostgresSampleDatabase {
  id: string;
  label: string;
  filename: string;
  description: string;
  sql: string;
  defaultTabs: QueryTabSeed[];
}

const CREDIT_CARD_SQL = `
CREATE TABLE users (
  user_id integer PRIMARY KEY,
  name text,
  current_age integer,
  birth_year integer,
  gender text,
  city text,
  state text,
  annual_income integer,
  fico_score integer,
  num_credit_cards integer DEFAULT 0
);
CREATE TABLE vendors (
  vendor_id integer PRIMARY KEY,
  name text,
  category text,
  city text,
  state text,
  country text
);
CREATE TABLE cards (
  card_id integer PRIMARY KEY,
  user_id integer REFERENCES users(user_id),
  card_brand text,
  card_type text,
  credit_limit integer,
  acct_open_date date,
  expires text,
  has_chip boolean
);
CREATE TABLE transactions (
  transaction_id integer PRIMARY KEY,
  user_id integer REFERENCES users(user_id),
  card_id integer REFERENCES cards(card_id),
  vendor_id integer REFERENCES vendors(vendor_id),
  amount numeric(10,2),
  transaction_date date,
  merchant_name text,
  merchant_city text,
  merchant_state text,
  merchant_country text,
  category text,
  is_fraud boolean DEFAULT false
);
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_card_id ON transactions(card_id);
CREATE INDEX idx_transactions_vendor_id ON transactions(vendor_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_category ON transactions(category);

CREATE OR REPLACE FUNCTION sync_user_card_count() RETURNS trigger AS $$
BEGIN
  UPDATE users
  SET num_credit_cards = (SELECT COUNT(*) FROM cards WHERE user_id = COALESCE(NEW.user_id, OLD.user_id))
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_users_card_count_ai AFTER INSERT ON cards FOR EACH ROW EXECUTE FUNCTION sync_user_card_count();
CREATE TRIGGER trg_users_card_count_ad AFTER DELETE ON cards FOR EACH ROW EXECUTE FUNCTION sync_user_card_count();

INSERT INTO users VALUES
  (1,'Hazel Robinson',53,1966,'Female','La Verne','CA',59696,787,0),
  (2,'Sasha Sadr',54,1965,'Female','Little Neck','NY',77254,701,0),
  (3,'Kyle Peterson',43,1976,'Male','San Francisco','CA',109687,675,0),
  (4,'Priya Sharma',47,1977,'Female','Seattle','WA',135000,790,0),
  (5,'Liam Chen',38,1986,'Male','Boston','MA',94000,762,0);
INSERT INTO vendors VALUES
  (1,'Amazon','E-Commerce','Seattle','WA','US'),
  (2,'Starbucks','Food & Beverage','Seattle','WA','US'),
  (3,'Airbnb','Travel','Paris',NULL,'FR'),
  (4,'Whole Foods','Grocery','Austin','TX','US');
INSERT INTO cards VALUES
  (101,1,'Visa','Credit',12000,'2019-04-01','04/29',true),
  (102,1,'Mastercard','Credit',8500,'2021-08-15','08/27',true),
  (201,2,'Amex','Credit',15000,'2020-02-10','02/28',true),
  (301,3,'Visa','Debit',3000,'2022-06-01','06/27',false),
  (401,4,'Discover','Credit',22000,'2018-11-20','11/28',true);
INSERT INTO transactions VALUES
  (1001,1,101,1,129.99,'2026-04-01','Amazon','Seattle','WA','US','Shopping',false),
  (1002,1,102,2,8.45,'2026-04-02','Starbucks','Seattle','WA','US','Food & Beverage',false),
  (1003,2,201,3,512.20,'2026-04-03','Airbnb','Paris',NULL,'FR','Travel',false),
  (1004,3,301,4,84.32,'2026-04-04','Whole Foods','Austin','TX','US','Grocery',false),
  (1005,4,401,1,1420.10,'2026-04-05','Amazon','Seattle','WA','US','Shopping',true);

CREATE VIEW foreign_transactions AS
  SELECT t.*, u.name AS user_name
  FROM transactions t
  JOIN users u ON u.user_id = t.user_id
  WHERE t.merchant_country <> 'US';
CREATE VIEW vendor_summary AS
  SELECT merchant_name, category, COUNT(*) AS total_transactions, ROUND(SUM(amount), 2) AS total_revenue
  FROM transactions
  GROUP BY merchant_name, category;
`;

const CREDIT_CARD_TABS: QueryTabSeed[] = [
  {
    title: "Fraud review",
    code: `-- Flagged transactions with customer context\nSELECT t.transaction_id, u.name, t.amount, t.merchant_name, t.transaction_date\nFROM transactions t\nJOIN users u ON u.user_id = t.user_id\nWHERE t.is_fraud = true\nORDER BY t.transaction_date DESC;`,
  },
  {
    title: "Vendor summary",
    code: `-- Revenue by merchant and category\nSELECT *\nFROM vendor_summary\nORDER BY total_revenue DESC;`,
  },
  {
    title: "Foreign transactions",
    code: `-- Non-US card activity\nSELECT transaction_id, user_name, merchant_country, amount\nFROM foreign_transactions\nORDER BY amount DESC;`,
  },
];

const CHINOOK_SQL = `
CREATE TABLE artists (artist_id integer PRIMARY KEY, name text NOT NULL);
CREATE TABLE albums (album_id integer PRIMARY KEY, title text NOT NULL, artist_id integer REFERENCES artists(artist_id));
CREATE TABLE tracks (
  track_id integer PRIMARY KEY,
  name text NOT NULL,
  album_id integer REFERENCES albums(album_id),
  genre text,
  milliseconds integer,
  unit_price numeric(10,2)
);
CREATE TABLE customers (
  customer_id integer PRIMARY KEY,
  first_name text,
  last_name text,
  country text,
  email text
);
CREATE TABLE invoices (
  invoice_id integer PRIMARY KEY,
  customer_id integer REFERENCES customers(customer_id),
  invoice_date date,
  billing_country text,
  total numeric(10,2)
);
CREATE TABLE invoice_items (
  invoice_item_id integer PRIMARY KEY,
  invoice_id integer REFERENCES invoices(invoice_id),
  track_id integer REFERENCES tracks(track_id),
  unit_price numeric(10,2),
  quantity integer
);
CREATE INDEX idx_albums_artist_id ON albums(artist_id);
CREATE INDEX idx_tracks_album_id ON tracks(album_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

INSERT INTO artists VALUES (1,'AC/DC'),(2,'Miles Davis'),(3,'Nina Simone'),(4,'Daft Punk');
INSERT INTO albums VALUES (1,'Back in Black',1),(2,'Kind of Blue',2),(3,'I Put a Spell on You',3),(4,'Discovery',4);
INSERT INTO tracks VALUES
  (1,'Hells Bells',1,'Rock',312000,0.99),
  (2,'Back in Black',1,'Rock',255000,0.99),
  (3,'So What',2,'Jazz',545000,0.99),
  (4,'Freddie Freeloader',2,'Jazz',589000,0.99),
  (5,'Feeling Good',3,'Soul',174000,0.99),
  (6,'One More Time',4,'Electronic',320000,1.29);
INSERT INTO customers VALUES
  (1,'Ana','Trujillo','Mexico','ana@example.com'),
  (2,'Leonie','Köhler','Germany','leonie@example.com'),
  (3,'Daan','Peeters','Belgium','daan@example.com');
INSERT INTO invoices VALUES
  (1,1,'2026-03-01','Mexico',1.98),
  (2,2,'2026-03-05','Germany',2.97),
  (3,3,'2026-03-12','Belgium',2.28);
INSERT INTO invoice_items VALUES
  (1,1,1,0.99,1),(2,1,2,0.99,1),(3,2,3,0.99,1),(4,2,4,0.99,1),(5,2,5,0.99,1),(6,3,6,1.29,1),(7,3,5,0.99,1);

CREATE VIEW top_genres AS
  SELECT t.genre, COUNT(*) AS tracks_sold, ROUND(SUM(ii.unit_price * ii.quantity), 2) AS catalog_value
  FROM tracks t
  JOIN invoice_items ii ON ii.track_id = t.track_id
  GROUP BY t.genre;
`;

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

const NORTHWIND_SQL = `
CREATE TABLE customers (customer_id text PRIMARY KEY, company_name text, contact_name text, country text);
CREATE TABLE employees (employee_id integer PRIMARY KEY, first_name text, last_name text, title text, hire_date date);
CREATE TABLE products (product_id integer PRIMARY KEY, product_name text, category text, unit_price numeric(10,2), units_in_stock integer);
CREATE TABLE orders (
  order_id integer PRIMARY KEY,
  customer_id text REFERENCES customers(customer_id),
  employee_id integer REFERENCES employees(employee_id),
  order_date date,
  ship_country text
);
CREATE TABLE order_details (
  order_id integer REFERENCES orders(order_id),
  product_id integer REFERENCES products(product_id),
  quantity integer,
  unit_price numeric(10,2),
  PRIMARY KEY (order_id, product_id)
);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_employee_id ON orders(employee_id);
CREATE INDEX idx_order_details_product_id ON order_details(product_id);

INSERT INTO customers VALUES
  ('ALFKI','Alfreds Futterkiste','Maria Anders','Germany'),
  ('ANATR','Ana Trujillo Emparedados','Ana Trujillo','Mexico'),
  ('AROUT','Around the Horn','Thomas Hardy','UK'),
  ('BERGS','Berglunds snabbköp','Christina Berglund','Sweden');
INSERT INTO employees VALUES
  (1,'Nancy','Davolio','Sales Representative','1992-05-01'),
  (2,'Andrew','Fuller','Vice President, Sales','1992-08-14'),
  (3,'Janet','Leverling','Sales Representative','1992-04-01');
INSERT INTO products VALUES
  (1,'Chai','Beverages',18.00,39),
  (2,'Chang','Beverages',19.00,17),
  (3,'Aniseed Syrup','Condiments',10.00,13),
  (4,'Chef Anton''s Cajun Seasoning','Condiments',22.00,53),
  (5,'Ikura','Seafood',31.00,31);
INSERT INTO orders VALUES
  (10248,'ALFKI',1,'2026-04-04','France'),
  (10249,'ANATR',2,'2026-04-05','Germany'),
  (10250,'AROUT',3,'2026-04-08','Brazil'),
  (10251,'BERGS',1,'2026-04-09','Sweden');
INSERT INTO order_details VALUES
  (10248,1,12,18.00),
  (10248,2,10,19.00),
  (10249,3,5,10.00),
  (10250,4,9,22.00),
  (10251,5,15,31.00);

CREATE VIEW order_totals AS
  SELECT o.order_id, o.order_date, c.company_name, ROUND(SUM(od.quantity * od.unit_price), 2) AS total
  FROM orders o
  JOIN customers c ON o.customer_id = c.customer_id
  JOIN order_details od ON od.order_id = o.order_id
  GROUP BY o.order_id, o.order_date, c.company_name;
CREATE VIEW product_revenue AS
  SELECT p.product_id, p.product_name, p.category, COALESCE(SUM(od.quantity), 0) AS units_sold,
         ROUND(COALESCE(SUM(od.quantity * od.unit_price), 0), 2) AS revenue
  FROM products p
  LEFT JOIN order_details od ON od.product_id = p.product_id
  GROUP BY p.product_id, p.product_name, p.category;
`;

const NORTHWIND_TABS: QueryTabSeed[] = [
  {
    title: "Recent orders",
    code: `-- Recent orders with company + ship country\nSELECT o.order_id, o.order_date, c.company_name, o.ship_country\nFROM orders o\nJOIN customers c ON o.customer_id = c.customer_id\nORDER BY o.order_date DESC\nLIMIT 20;`,
  },
  {
    title: "Top products",
    code: `-- Best-selling products by units shipped\nSELECT p.product_name,\n       p.category,\n       SUM(od.quantity) AS units_sold,\n       ROUND(SUM(od.quantity * od.unit_price), 2) AS revenue\nFROM order_details od\nJOIN products p ON od.product_id = p.product_id\nGROUP BY p.product_id, p.product_name, p.category\nORDER BY revenue DESC;`,
  },
  {
    title: "Order totals",
    code: `-- Order totals view\nSELECT *\nFROM order_totals\nORDER BY total DESC\nLIMIT 10;`,
  },
];

export const POSTGRES_SAMPLE_DATABASES: PostgresSampleDatabase[] = [
  {
    id: "credit_card_transactions",
    label: "Credit card transactions",
    filename: "credit_card_transactions.pg",
    description: "Users, cards, vendors, and a small transactions log.",
    sql: CREDIT_CARD_SQL,
    defaultTabs: CREDIT_CARD_TABS,
  },
  {
    id: "chinook",
    label: "Chinook music store",
    filename: "chinook.pg",
    description: "Artists, albums, tracks, customers, and invoices.",
    sql: CHINOOK_SQL,
    defaultTabs: CHINOOK_TABS,
  },
  {
    id: "northwind",
    label: "Northwind",
    filename: "northwind.pg",
    description: "Classic Northwind subset: customers, products, and orders.",
    sql: NORTHWIND_SQL,
    defaultTabs: NORTHWIND_TABS,
  },
];

export const POSTGRES_BLANK_DATABASE: PostgresSampleDatabase = {
  id: "blank",
  label: "New Database",
  filename: "untitled.pg",
  description: "Empty database — start from scratch.",
  sql: "",
  defaultTabs: [{ title: "Query 1", code: "" }],
};

export function findPostgresSampleDatabase(id: string): PostgresSampleDatabase {
  if (id === POSTGRES_BLANK_DATABASE.id) return POSTGRES_BLANK_DATABASE;
  return (
    POSTGRES_SAMPLE_DATABASES.find((sample) => sample.id === id) ??
    POSTGRES_SAMPLE_DATABASES[0]
  );
}
