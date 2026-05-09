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

INSERT INTO users (user_id, name, current_age, birth_year, gender, city, state, annual_income, fico_score, num_credit_cards) VALUES
  (1,'Hazel Robinson',53,1966,'Female','La Verne','CA',59696,787,0),
  (2,'Sasha Sadr',54,1965,'Female','Little Neck','NY',77254,701,0),
  (3,'Saanvi Lee',81,1938,'Female','West Covina','CA',33483,698,0),
  (4,'Everlee Clark',63,1957,'Female','New York','NY',249925,722,0),
  (5,'Kyle Peterson',43,1976,'Male','San Francisco','CA',109687,675,0),
  (6,'Aldo Walker',42,1977,'Male','Davenport','IA',53797,704,0),
  (7,'Mia Torres',35,1990,'Female','Austin','TX',88500,745,0),
  (8,'James Okafor',29,1995,'Male','Chicago','IL',62000,710,0),
  (9,'Priya Sharma',47,1977,'Female','Seattle','WA',135000,790,0),
  (10,'Liam Chen',38,1986,'Male','Boston','MA',94000,762,0),
  (11,'Sofia Reyes',55,1969,'Female','Miami','FL',48000,620,0),
  (12,'Omar Hassan',61,1963,'Male','Los Angeles','CA',72000,680,0),
  (13,'Chloe Martin',27,1997,'Female','Portland','OR',51000,730,0),
  (14,'Ethan Brooks',44,1980,'Male','Denver','CO',115000,775,0),
  (15,'Nina Patel',52,1972,'Female','Houston','TX',83000,715,0),
  (16,'Carlos Gomez',33,1991,'Male','San Diego','CA',59000,698,0),
  (17,'Amanda White',40,1984,'Female','Atlanta','GA',76000,742,0),
  (18,'Benjamin Scott',67,1957,'Male','Phoenix','AZ',41000,801,0),
  (19,'Rachel Kim',31,1993,'Female','Nashville','TN',68000,758,0),
  (20,'David Thompson',58,1966,'Male','Dallas','TX',97000,690,0);
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

CREATE VIEW foreign_transactions AS
  SELECT t.*, u.name AS user_name
  FROM transactions t
  JOIN users u ON u.user_id = t.user_id
  WHERE t.merchant_country <> 'US';
CREATE VIEW vendor_summary AS
  SELECT merchant_name, category, COUNT(*) AS total_transactions, ROUND(SUM(amount), 2) AS total_revenue
  FROM transactions
  GROUP BY merchant_name, category;
CREATE VIEW fraud_summary AS
  SELECT u.name AS user_name, u.state, COUNT(*) AS fraud_count, ROUND(SUM(t.amount), 2) AS total_fraud_amount
  FROM transactions t
  JOIN users u ON t.user_id = u.user_id
  WHERE t.is_fraud = true
  GROUP BY t.user_id, u.name, u.state
  ORDER BY fraud_count DESC;
`;

const CREDIT_CARD_TABS: QueryTabSeed[] = [
  {
    title: "Query 1",
    code: `-- Explore the users table\nSELECT *\nFROM users\nLIMIT 10;`,
  },
  {
    title: "Query 2",
    code: `-- Flagged transactions with customer context\nSELECT t.transaction_id, u.name, t.amount, t.merchant_name, t.transaction_date\nFROM transactions t\nJOIN users u ON u.user_id = t.user_id\nWHERE t.is_fraud = true\nORDER BY t.transaction_date DESC;`,
  },
  {
    title: "Query 3",
    code: `-- Revenue by merchant and category\nSELECT *\nFROM vendor_summary\nORDER BY total_revenue DESC;`,
  },
  {
    title: "Query 4",
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

INSERT INTO artists VALUES
  (1,'AC/DC'),(2,'Accept'),(3,'Aerosmith'),(4,'Alanis Morissette'),
  (5,'Alice In Chains'),(6,'Antônio Carlos Jobim'),(7,'Apocalyptica'),
  (8,'Audioslave'),(9,'BackBeat'),(10,'Billy Cobham');
INSERT INTO albums VALUES
  (1,'For Those About To Rock We Salute You',1),
  (2,'Balls to the Wall',2),
  (3,'Restless and Wild',2),
  (4,'Let There Be Rock',1),
  (5,'Big Ones',3),
  (6,'Jagged Little Pill',4),
  (7,'Facelift',5),
  (8,'Warner 25 Anos',6),
  (9,'Plays Metallica By Four Cellos',7),
  (10,'Audioslave',8);
INSERT INTO tracks VALUES
  (1,'For Those About To Rock (We Salute You)',1,'Rock',343719,0.99),
  (2,'Put The Finger On You',1,'Rock',205662,0.99),
  (3,'Let''s Get It Up',1,'Rock',233926,0.99),
  (4,'Inject The Venom',1,'Rock',210834,0.99),
  (5,'Snowballed',1,'Rock',203102,0.99),
  (6,'Balls to the Wall',2,'Rock',342562,0.99),
  (7,'Fast As a Shark',3,'Rock',230619,0.99),
  (8,'Restless and Wild',3,'Rock',252051,0.99),
  (9,'Princess of the Dawn',3,'Rock',375418,0.99),
  (10,'Go Down',4,'Rock',313398,0.99),
  (11,'Dream On',5,'Rock',275866,0.99),
  (12,'Walk This Way',5,'Rock',211098,0.99),
  (13,'All I Really Want',6,'Rock',284891,0.99),
  (14,'You Oughta Know',6,'Rock',249234,0.99),
  (15,'Ironic',6,'Rock',229733,0.99),
  (16,'Man In The Box',7,'Alternative',286641,0.99),
  (17,'Them Bones',7,'Alternative',150221,0.99),
  (18,'Garota De Ipanema',8,'Latin',285673,0.99),
  (19,'Enter Sandman',9,'Classical',214665,0.99),
  (20,'Cochise',10,'Alternative',222380,0.99);
INSERT INTO customers VALUES
  (1,'Luís','Gonçalves','Brazil','luisg@embraer.com.br'),
  (2,'Leonie','Köhler','Germany','leonekohler@surfeu.de'),
  (3,'François','Tremblay','Canada','ftremblay@gmail.com'),
  (4,'Bjørn','Hansen','Norway','bjorn.hansen@yahoo.no'),
  (5,'František','Wichterlová','Czech Republic','frantisekw@jetbrains.com'),
  (6,'Helena','Holý','Czech Republic','hholy@gmail.com'),
  (7,'Astrid','Gruber','Austria','astrid.gruber@apple.at'),
  (8,'Daan','Peeters','Belgium','daan_peeters@apple.be'),
  (9,'Kara','Nielsen','Denmark','kara.nielsen@jubii.dk'),
  (10,'Eduardo','Martins','Brazil','eduardo@woodstock.com.br');
INSERT INTO invoices VALUES
  (1,1,'2023-01-01','Brazil',1.98),
  (2,2,'2023-01-02','Germany',3.96),
  (3,3,'2023-01-03','Canada',5.94),
  (4,4,'2023-01-04','Norway',8.91),
  (5,5,'2023-01-05','Czech Republic',13.86),
  (6,6,'2023-02-01','Czech Republic',0.99),
  (7,7,'2023-02-02','Austria',1.98),
  (8,8,'2023-02-03','Belgium',3.96),
  (9,9,'2023-02-04','Denmark',5.94),
  (10,10,'2023-02-05','Brazil',8.91),
  (11,1,'2023-03-01','Brazil',13.86),
  (12,2,'2023-03-02','Germany',0.99),
  (13,3,'2023-03-03','Canada',1.98),
  (14,4,'2023-03-04','Norway',7.92),
  (15,5,'2023-03-05','Czech Republic',1.98);
INSERT INTO invoice_items VALUES
  (1,1,1,0.99,1),(2,1,2,0.99,1),
  (3,2,3,0.99,1),(4,2,4,0.99,1),(5,2,5,0.99,1),(6,2,6,0.99,1),
  (7,3,7,0.99,1),(8,3,8,0.99,1),(9,3,9,0.99,1),(10,3,10,0.99,1),(11,3,11,0.99,1),(12,3,12,0.99,1),
  (13,4,13,0.99,1),(14,4,14,0.99,1),(15,4,15,0.99,1),(16,4,16,0.99,1),(17,4,17,0.99,1),(18,4,18,0.99,1),(19,4,19,0.99,1),(20,4,20,0.99,1),(21,4,1,0.99,1),
  (22,5,2,0.99,1),(23,5,3,0.99,1),(24,5,4,0.99,1),(25,5,5,0.99,1),(26,5,6,0.99,1),(27,5,7,0.99,1),(28,5,8,0.99,1),(29,5,9,0.99,1),(30,5,10,0.99,1),(31,5,11,0.99,1),(32,5,12,0.99,1),(33,5,13,0.99,1),(34,5,14,0.99,1),(35,5,15,0.99,1),
  (36,6,16,0.99,1),
  (37,7,17,0.99,1),(38,7,18,0.99,1),
  (39,8,19,0.99,1),(40,8,20,0.99,1),(41,8,1,0.99,1),(42,8,2,0.99,1),
  (43,9,3,0.99,1),(44,9,4,0.99,1),(45,9,5,0.99,1),(46,9,6,0.99,1),(47,9,7,0.99,1),(48,9,8,0.99,1),
  (49,10,9,0.99,1),(50,10,10,0.99,1),(51,10,11,0.99,1),(52,10,12,0.99,1),(53,10,13,0.99,1),(54,10,14,0.99,1),(55,10,15,0.99,1),(56,10,16,0.99,1),(57,10,17,0.99,1),
  (58,11,18,0.99,1),(59,11,19,0.99,1),(60,11,20,0.99,1),(61,11,1,0.99,1),(62,11,2,0.99,1),(63,11,3,0.99,1),(64,11,4,0.99,1),(65,11,5,0.99,1),(66,11,6,0.99,1),(67,11,7,0.99,1),(68,11,8,0.99,1),(69,11,9,0.99,1),(70,11,10,0.99,1),(71,11,11,0.99,1),
  (72,12,12,0.99,1),
  (73,13,13,0.99,1),(74,13,14,0.99,1),
  (75,14,15,0.99,1),(76,14,16,0.99,1),(77,14,17,0.99,1),(78,14,18,0.99,1),(79,14,19,0.99,1),(80,14,20,0.99,1),(81,14,1,0.99,1),(82,14,2,0.99,1),
  (83,15,3,0.99,1),(84,15,4,0.99,1);

CREATE VIEW top_genres AS
  SELECT t.genre, COUNT(*) AS tracks_sold, ROUND(SUM(ii.unit_price * ii.quantity), 2) AS catalog_value
  FROM tracks t
  JOIN invoice_items ii ON ii.track_id = t.track_id
  GROUP BY t.genre;
CREATE VIEW artist_catalog AS
  SELECT ar.name AS artist, COUNT(DISTINCT al.album_id) AS album_count,
         COUNT(t.track_id) AS track_count, ROUND(SUM(t.unit_price), 2) AS catalog_value
  FROM artists ar
  LEFT JOIN albums al ON al.artist_id = ar.artist_id
  LEFT JOIN tracks t ON t.album_id = al.album_id
  GROUP BY ar.artist_id, ar.name
  ORDER BY catalog_value DESC;
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
  ('ANTON','Antonio Moreno Taquería','Antonio Moreno','Mexico'),
  ('AROUT','Around the Horn','Thomas Hardy','UK'),
  ('BERGS','Berglunds snabbköp','Christina Berglund','Sweden'),
  ('BLAUS','Blauer See Delikatessen','Hanna Moos','Germany'),
  ('BLONP','Blondesddsl père et fils','Frédérique Citeaux','France'),
  ('BOLID','Bólido Comidas preparadas','Martín Sommer','Spain'),
  ('BONAP','Bon app''','Laurence Lebihan','France'),
  ('BOTTM','Bottom-Dollar Markets','Elizabeth Lincoln','Canada');
INSERT INTO employees VALUES
  (1,'Nancy','Davolio','Sales Representative','1992-05-01'),
  (2,'Andrew','Fuller','Vice President, Sales','1992-08-14'),
  (3,'Janet','Leverling','Sales Representative','1992-04-01'),
  (4,'Margaret','Peacock','Sales Representative','1993-05-03'),
  (5,'Steven','Buchanan','Sales Manager','1993-10-17');
INSERT INTO products VALUES
  (1,'Chai','Beverages',18.00,39),
  (2,'Chang','Beverages',19.00,17),
  (3,'Aniseed Syrup','Condiments',10.00,13),
  (4,'Chef Anton''s Cajun Seasoning','Condiments',22.00,53),
  (5,'Grandma''s Boysenberry Spread','Condiments',25.00,120),
  (6,'Uncle Bob''s Organic Dried Pears','Produce',30.00,15),
  (7,'Northwoods Cranberry Sauce','Condiments',40.00,50),
  (8,'Mishi Kobe Niku','Meat/Poultry',97.00,29),
  (9,'Ikura','Seafood',31.00,31),
  (10,'Queso Cabrales','Dairy Products',21.00,30);
INSERT INTO orders VALUES
  (10248,'ALFKI',1,'2023-07-04','France'),
  (10249,'ANATR',2,'2023-07-05','Germany'),
  (10250,'ANTON',3,'2023-07-08','Brazil'),
  (10251,'AROUT',4,'2023-07-08','France'),
  (10252,'BERGS',5,'2023-07-09','Belgium'),
  (10253,'BLAUS',1,'2023-07-10','Germany'),
  (10254,'BLONP',2,'2023-07-11','France'),
  (10255,'BOLID',3,'2023-07-12','Spain'),
  (10256,'BONAP',4,'2023-07-15','France'),
  (10257,'BOTTM',5,'2023-07-16','Canada');
INSERT INTO order_details VALUES
  (10248,1,12,18.00),
  (10248,2,10,19.00),
  (10249,3,5,10.00),
  (10250,4,9,22.00),
  (10250,5,35,25.00),
  (10251,6,6,30.00),
  (10252,7,40,40.00),
  (10253,8,20,97.00),
  (10254,9,15,31.00),
  (10255,10,25,21.00),
  (10256,1,5,18.00),
  (10257,2,4,19.00);

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
CREATE VIEW sales_by_employee AS
  SELECT e.employee_id, e.first_name || ' ' || e.last_name AS employee, e.title,
         COUNT(DISTINCT o.order_id) AS order_count,
         ROUND(SUM(od.quantity * od.unit_price), 2) AS total_sales
  FROM employees e
  LEFT JOIN orders o ON o.employee_id = e.employee_id
  LEFT JOIN order_details od ON od.order_id = o.order_id
  GROUP BY e.employee_id, e.first_name, e.last_name, e.title
  ORDER BY total_sales DESC;
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
