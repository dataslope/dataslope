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

const ECOMMERCE_SCHEMA = `
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
  amount DOUBLE,
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

INSERT INTO users VALUES
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
  (20,'David Thompson',58,1966,'Male','Dallas','TX','75201',97000,62000,690,4);
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
  (11,10,13,10,88.40,'2024-01-16','Whole Foods','Austin','TX','US','Grocery',false),
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
  (50,7,10,5,62.10,'2024-04-05','Shell','Austin','TX','US','Gas Station',false),
  (51,1,19,7,845.52,'2024-11-25','Apple Store','Cupertino','CA','US','Electronics',false),
  (52,2,4,8,130.17,'2024-08-23','Airbnb','Paris',NULL,'FR','Travel',false),
  (53,7,9,8,163.61,'2024-09-12','Airbnb','Paris',NULL,'FR','Travel',false),
  (54,8,10,8,198.26,'2024-10-02','Airbnb','Paris',NULL,'FR','Travel',false),
  (55,13,15,9,180.87,'2024-06-30','Uber','San Francisco','CA','US','Transportation',true),
  (56,18,16,9,464.69,'2024-07-20','Uber','San Francisco','CA','US','Transportation',false),
  (57,19,1,9,699.34,'2024-08-09','Uber','San Francisco','CA','US','Transportation',false),
  (58,4,6,10,868.51,'2024-05-07','Whole Foods','Austin','TX','US','Grocery',false),
  (59,9,7,10,72.43,'2024-05-27','Whole Foods','Austin','TX','US','Grocery',false),
  (60,10,12,11,107.08,'2024-02-23','Delta Airlines','Atlanta','GA','US','Travel',false),
  (61,15,17,11,89.69,'2024-03-14','Delta Airlines','Atlanta','GA','US','Travel',false),
  (62,16,18,11,124.34,'2024-04-03','Delta Airlines','Atlanta','GA','US','Travel',false),
  (63,1,3,12,553.16,'2024-12-30','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (64,6,4,12,141.60,'2024-01-20','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (65,7,9,12,176.25,'2024-10-17','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (66,12,14,13,158.86,'2024-11-06','Home Depot','Atlanta','GA','US','Hardware',false),
  (67,17,15,13,193.51,'2024-11-26','Home Depot','Atlanta','GA','US','Hardware',false),
  (68,18,20,14,172.33,'2024-08-24','Spotify','Stockholm',NULL,'SE','Entertainment',true),
  (69,3,1,14,3591.50,'2024-09-13','Spotify','Stockholm',NULL,'SE','Entertainment',false),
  (70,4,6,14,5449.11,'2024-10-03','Spotify','Stockholm',NULL,'SE','Entertainment',false),
  (71,9,11,15,33.03,'2024-07-01','McDonald''s','Chicago','IL','US','Food & Beverage',false),
  (72,14,12,15,67.68,'2024-07-21','McDonald''s','Chicago','IL','US','Food & Beverage',false),
  (73,15,17,1,102.33,'2024-04-18','Amazon','Seattle','WA','US','E-Commerce',false),
  (74,20,2,1,199.11,'2024-05-08','Amazon','Seattle','WA','US','E-Commerce',false),
  (75,1,3,1,433.76,'2024-05-28','Amazon','Seattle','WA','US','E-Commerce',false),
  (76,6,8,2,102.20,'2024-02-24','Walmart','Bentonville','AR','US','Retail',false),
  (77,11,9,2,136.85,'2024-03-15','Walmart','Bentonville','AR','US','Retail',false),
  (78,12,14,2,171.50,'2024-04-04','Walmart','Bentonville','AR','US','Retail',false),
  (79,17,19,3,768.28,'2024-01-01','Target','Minneapolis','MN','US','Retail',false),
  (80,2,20,3,52.93,'2024-01-21','Target','Minneapolis','MN','US','Retail',false),
  (81,3,5,4,672.10,'2024-10-18','Starbucks','Seattle','WA','US','Food & Beverage',true),
  (82,8,10,4,11.02,'2024-11-07','Starbucks','Seattle','WA','US','Food & Beverage',false),
  (83,9,11,4,45.67,'2024-11-27','Starbucks','Seattle','WA','US','Food & Beverage',false),
  (84,14,16,5,28.28,'2024-08-25','Shell','Houston','TX','US','Gas Station',false),
  (85,19,17,5,622.10,'2024-09-14','Shell','Houston','TX','US','Gas Station',false),
  (86,20,2,5,856.75,'2024-06-12','Shell','Houston','TX','US','Gas Station',false),
  (87,5,7,6,80.19,'2024-07-02','Netflix','Los Gatos','CA','US','Entertainment',false),
  (88,10,8,6,114.84,'2024-07-22','Netflix','Los Gatos','CA','US','Entertainment',false),
  (89,11,13,7,149.49,'2024-04-19','Apple Store','Cupertino','CA','US','Electronics',false),
  (90,16,14,7,132.10,'2024-05-09','Apple Store','Cupertino','CA','US','Electronics',false),
  (91,17,19,7,475.92,'2024-05-29','Apple Store','Cupertino','CA','US','Electronics',false),
  (92,2,4,8,883.53,'2024-02-25','Airbnb','Paris',NULL,'FR','Travel',false),
  (93,7,5,8,579.74,'2024-03-16','Airbnb','Paris',NULL,'FR','Travel',false),
  (94,8,10,9,23.66,'2024-12-12','Uber','San Francisco','CA','US','Transportation',true),
  (95,13,15,9,6.27,'2024-01-02','Uber','San Francisco','CA','US','Transportation',false),
  (96,14,16,9,40.92,'2024-01-22','Uber','San Francisco','CA','US','Transportation',false),
  (97,19,1,10,329.74,'2024-10-19','Whole Foods','Austin','TX','US','Grocery',false),
  (98,4,2,10,3348.91,'2024-11-08','Whole Foods','Austin','TX','US','Grocery',false),
  (99,5,7,10,92.83,'2024-08-06','Whole Foods','Austin','TX','US','Grocery',false),
  (100,10,12,11,75.44,'2024-08-26','Delta Airlines','Atlanta','GA','US','Travel',false),
  (101,15,13,11,110.09,'2024-09-15','Delta Airlines','Atlanta','GA','US','Travel',false),
  (102,16,18,12,144.74,'2024-06-13','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (103,1,19,12,356.52,'2024-07-03','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (104,2,4,12,591.17,'2024-07-23','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (105,7,9,13,144.61,'2024-04-20','Home Depot','Atlanta','GA','US','Hardware',false),
  (106,12,10,13,179.26,'2024-05-10','Home Depot','Atlanta','GA','US','Hardware',false),
  (107,13,15,14,18.91,'2024-02-06','Spotify','Stockholm',NULL,'SE','Entertainment',true),
  (108,18,20,14,925.69,'2024-02-26','Spotify','Stockholm',NULL,'SE','Entertainment',false),
  (109,19,1,14,210.34,'2024-03-17','Spotify','Stockholm',NULL,'SE','Entertainment',false),
  (110,4,6,15,7929.51,'2024-12-13','McDonald''s','Chicago','IL','US','Food & Beverage',false),
  (111,9,7,15,53.43,'2024-01-03','McDonald''s','Chicago','IL','US','Food & Beverage',false),
  (112,10,12,15,88.08,'2024-01-23','McDonald''s','Chicago','IL','US','Food & Beverage',false),
  (113,15,17,1,70.69,'2024-10-20','Amazon','Seattle','WA','US','E-Commerce',false),
  (114,20,18,1,105.34,'2024-11-09','Amazon','Seattle','WA','US','E-Commerce',false),
  (115,1,3,2,64.16,'2024-08-07','Walmart','Bentonville','AR','US','Retail',false),
  (116,6,8,2,122.60,'2024-08-27','Walmart','Bentonville','AR','US','Retail',false),
  (117,7,9,2,157.25,'2024-09-16','Walmart','Bentonville','AR','US','Retail',false),
  (118,12,14,3,139.86,'2024-06-14','Target','Minneapolis','MN','US','Retail',false),
  (119,17,15,3,398.68,'2024-07-04','Target','Minneapolis','MN','US','Retail',false),
  (120,18,20,3,633.33,'2024-04-01','Target','Minneapolis','MN','US','Retail',true),
  (121,3,5,4,3152.50,'2024-04-21','Starbucks','Seattle','WA','US','Food & Beverage',false),
  (122,8,6,4,5010.11,'2024-05-11','Starbucks','Seattle','WA','US','Food & Beverage',false),
  (123,9,11,5,66.07,'2024-02-07','Shell','Houston','TX','US','Gas Station',false),
  (124,14,12,5,48.68,'2024-02-27','Shell','Houston','TX','US','Gas Station',false),
  (125,15,17,5,83.33,'2024-03-18','Shell','Houston','TX','US','Gas Station',false),
  (126,20,2,6,660.11,'2024-12-14','Netflix','Los Gatos','CA','US','Entertainment',false),
  (127,5,3,6,894.76,'2024-01-04','Netflix','Los Gatos','CA','US','Entertainment',false),
  (128,6,8,7,135.24,'2024-10-01','Apple Store','Cupertino','CA','US','Electronics',false),
  (129,11,13,7,117.85,'2024-10-21','Apple Store','Cupertino','CA','US','Electronics',false),
  (130,12,14,7,152.50,'2024-11-10','Apple Store','Cupertino','CA','US','Electronics',false),
  (131,17,19,8,106.32,'2024-08-08','Airbnb','Paris',NULL,'FR','Travel',false),
  (132,2,20,8,513.93,'2024-08-28','Airbnb','Paris',NULL,'FR','Travel',false),
  (133,3,5,8,7733.10,'2024-05-26','Airbnb','Paris',NULL,'FR','Travel',true),
  (134,8,10,9,187.02,'2024-06-15','Uber','San Francisco','CA','US','Transportation',false),
  (135,13,11,9,26.67,'2024-07-05','Uber','San Francisco','CA','US','Transportation',false),
  (136,14,16,10,61.32,'2024-04-02','Whole Foods','Austin','TX','US','Grocery',false),
  (137,19,17,10,133.10,'2024-04-22','Whole Foods','Austin','TX','US','Grocery',false),
  (138,20,2,10,367.75,'2024-05-12','Whole Foods','Austin','TX','US','Grocery',false),
  (139,5,7,11,61.19,'2024-02-08','Delta Airlines','Atlanta','GA','US','Travel',false),
  (140,10,8,11,95.84,'2024-02-28','Delta Airlines','Atlanta','GA','US','Travel',false),
  (141,11,13,12,130.49,'2024-11-25','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (142,16,18,12,113.10,'2024-12-15','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (143,17,19,12,936.92,'2024-01-05','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (144,2,4,13,221.57,'2024-10-02','Home Depot','Atlanta','GA','US','Hardware',false),
  (145,7,5,13,165.01,'2024-10-22','Home Depot','Atlanta','GA','US','Hardware',false),
  (146,8,10,13,199.66,'2024-11-11','Home Depot','Atlanta','GA','US','Hardware',true),
  (147,13,15,14,182.27,'2024-08-09','Spotify','Stockholm',NULL,'SE','Entertainment',false),
  (148,18,16,14,21.92,'2024-08-29','Spotify','Stockholm',NULL,'SE','Entertainment',false),
  (149,19,1,15,790.74,'2024-05-27','McDonald''s','Chicago','IL','US','Food & Beverage',false),
  (150,4,6,15,2909.91,'2024-06-16','McDonald''s','Chicago','IL','US','Food & Beverage',false),
  (151,5,7,15,73.83,'2024-07-06','McDonald''s','Chicago','IL','US','Food & Beverage',false),
  (152,10,12,1,56.44,'2024-04-03','Amazon','Seattle','WA','US','E-Commerce',false),
  (153,15,13,1,91.09,'2024-04-23','Amazon','Seattle','WA','US','E-Commerce',false),
  (154,16,18,1,125.74,'2024-01-20','Amazon','Seattle','WA','US','E-Commerce',false),
  (155,1,3,2,817.52,'2024-02-09','Walmart','Bentonville','AR','US','Retail',false),
  (156,6,4,2,102.17,'2024-02-29','Walmart','Bentonville','AR','US','Retail',false),
  (157,7,9,3,177.65,'2024-11-26','Target','Minneapolis','MN','US','Retail',false),
  (158,12,10,3,160.26,'2024-12-16','Target','Minneapolis','MN','US','Retail',false),
  (159,13,15,3,194.91,'2024-01-06','Target','Minneapolis','MN','US','Retail',true),
  (160,18,20,4,436.69,'2024-10-03','Starbucks','Seattle','WA','US','Food & Beverage',false),
  (161,3,1,4,5632.90,'2024-10-23','Starbucks','Seattle','WA','US','Food & Beverage',false),
  (162,4,6,5,7490.51,'2024-07-21','Shell','Houston','TX','US','Gas Station',false),
  (163,9,11,5,34.43,'2024-08-10','Shell','Houston','TX','US','Gas Station',false),
  (164,10,12,5,69.08,'2024-08-30','Shell','Houston','TX','US','Gas Station',false),
  (165,15,17,6,51.69,'2024-05-28','Netflix','Los Gatos','CA','US','Entertainment',false),
  (166,20,18,6,290.51,'2024-06-17','Netflix','Los Gatos','CA','US','Entertainment',false),
  (167,1,3,6,525.16,'2024-07-07','Netflix','Los Gatos','CA','US','Entertainment',false),
  (168,6,8,7,103.60,'2024-04-04','Apple Store','Cupertino','CA','US','Electronics',false),
  (169,11,9,7,138.25,'2024-04-24','Apple Store','Cupertino','CA','US','Electronics',false),
  (170,12,14,8,172.90,'2024-01-21','Airbnb','Paris',NULL,'FR','Travel',false),
  (171,17,19,8,859.68,'2024-02-10','Airbnb','Paris',NULL,'FR','Travel',false),
  (172,18,20,8,144.33,'2024-03-01','Airbnb','Paris',NULL,'FR','Travel',true),
  (173,3,5,9,2713.50,'2024-11-27','Uber','San Francisco','CA','US','Transportation',false),
  (174,8,6,9,12.42,'2024-12-17','Uber','San Francisco','CA','US','Transportation',false),
  (175,9,11,9,47.07,'2024-09-14','Uber','San Francisco','CA','US','Transportation',false),
  (176,14,16,10,29.68,'2024-10-04','Whole Foods','Austin','TX','US','Grocery',false),
  (177,19,17,10,64.33,'2024-10-24','Whole Foods','Austin','TX','US','Grocery',false),
  (178,20,2,11,948.15,'2024-07-22','Delta Airlines','Atlanta','GA','US','Travel',false),
  (179,5,3,11,81.59,'2024-08-11','Delta Airlines','Atlanta','GA','US','Travel',false),
  (180,6,8,11,116.24,'2024-08-31','Delta Airlines','Atlanta','GA','US','Travel',false),
  (181,11,13,12,98.85,'2024-05-29','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (182,16,14,12,133.50,'2024-06-18','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (183,17,19,13,567.32,'2024-03-16','Home Depot','Atlanta','GA','US','Hardware',false),
  (184,2,4,13,974.93,'2024-04-05','Home Depot','Atlanta','GA','US','Hardware',false),
  (185,3,5,13,7294.10,'2024-04-25','Home Depot','Atlanta','GA','US','Hardware',true),
  (186,8,10,14,168.02,'2024-01-22','Spotify','Stockholm',NULL,'SE','Entertainment',false),
  (187,13,11,14,7.67,'2024-02-11','Spotify','Stockholm',NULL,'SE','Entertainment',false),
  (188,14,16,14,42.32,'2024-11-08','Spotify','Stockholm',NULL,'SE','Entertainment',false),
  (189,19,1,15,594.10,'2024-11-28','McDonald''s','Chicago','IL','US','Food & Beverage',false),
  (190,4,2,15,828.75,'2024-12-18','McDonald''s','Chicago','IL','US','Food & Beverage',false),
  (191,5,7,1,94.23,'2024-09-15','Amazon','Seattle','WA','US','E-Commerce',false),
  (192,10,8,1,76.84,'2024-10-05','Amazon','Seattle','WA','US','E-Commerce',false),
  (193,11,13,1,111.49,'2024-10-25','Amazon','Seattle','WA','US','E-Commerce',false),
  (194,16,18,2,94.10,'2024-07-23','Walmart','Bentonville','AR','US','Retail',false),
  (195,1,19,2,447.92,'2024-08-12','Walmart','Bentonville','AR','US','Retail',false),
  (196,2,4,3,682.57,'2024-05-10','Target','Minneapolis','MN','US','Retail',false),
  (197,7,9,3,146.01,'2024-05-30','Target','Minneapolis','MN','US','Retail',false),
  (198,8,10,3,180.66,'2024-06-19','Target','Minneapolis','MN','US','Retail',true),
  (199,13,15,4,163.27,'2024-03-17','Starbucks','Seattle','WA','US','Food & Beverage',false),
  (200,18,16,4,67.09,'2024-04-06','Starbucks','Seattle','WA','US','Food & Beverage',false),
  (201,19,1,4,301.74,'2024-04-26','Starbucks','Seattle','WA','US','Food & Beverage',false),
  (202,4,6,5,2470.91,'2024-01-23','Shell','Houston','TX','US','Gas Station',false),
  (203,9,7,5,54.83,'2024-02-12','Shell','Houston','TX','US','Gas Station',false),
  (204,10,12,6,89.48,'2024-11-09','Netflix','Los Gatos','CA','US','Entertainment',false),
  (205,15,17,6,72.09,'2024-11-29','Netflix','Los Gatos','CA','US','Entertainment',false),
  (206,16,18,6,106.74,'2024-12-19','Netflix','Los Gatos','CA','US','Entertainment',false),
  (207,1,3,7,155.56,'2024-09-16','Apple Store','Cupertino','CA','US','Electronics',false),
  (208,6,4,7,124.00,'2024-10-06','Apple Store','Cupertino','CA','US','Electronics',false),
  (209,7,9,7,158.65,'2024-07-04','Apple Store','Cupertino','CA','US','Electronics',false),
  (210,12,14,8,141.26,'2024-07-24','Airbnb','Paris',NULL,'FR','Travel',false),
  (211,17,15,8,175.91,'2024-08-13','Airbnb','Paris',NULL,'FR','Travel',true),
  (212,18,20,9,724.73,'2024-05-11','Uber','San Francisco','CA','US','Transportation',false),
  (213,3,1,9,5193.90,'2024-05-31','Uber','San Francisco','CA','US','Transportation',false),
  (214,4,6,9,7051.51,'2024-06-20','Uber','San Francisco','CA','US','Transportation',false),
  (215,9,11,10,15.43,'2024-03-18','Whole Foods','Austin','TX','US','Grocery',false),
  (216,14,12,10,50.08,'2024-04-07','Whole Foods','Austin','TX','US','Grocery',false),
  (217,15,17,11,84.73,'2024-01-04','Delta Airlines','Atlanta','GA','US','Travel',false),
  (218,20,2,11,751.51,'2024-01-24','Delta Airlines','Atlanta','GA','US','Travel',false),
  (219,1,3,11,986.16,'2024-02-13','Delta Airlines','Atlanta','GA','US','Travel',false),
  (220,6,8,12,84.60,'2024-11-10','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (221,11,9,12,119.25,'2024-11-30','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (222,12,14,12,153.90,'2024-12-20','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (223,17,19,13,370.68,'2024-09-17','Home Depot','Atlanta','GA','US','Hardware',false),
  (224,2,20,13,605.33,'2024-10-07','Home Depot','Atlanta','GA','US','Hardware',true),
  (225,3,5,14,2274.50,'2024-07-05','Spotify','Stockholm',NULL,'SE','Entertainment',false),
  (226,8,10,14,188.42,'2024-07-25','Spotify','Stockholm',NULL,'SE','Entertainment',false),
  (227,9,11,14,28.07,'2024-08-14','Spotify','Stockholm',NULL,'SE','Entertainment',false),
  (228,14,16,15,10.68,'2024-05-12','McDonald''s','Chicago','IL','US','Food & Beverage',false),
  (229,19,17,15,224.50,'2024-06-01','McDonald''s','Chicago','IL','US','Food & Beverage',false),
  (230,20,2,15,459.15,'2024-02-28','McDonald''s','Chicago','IL','US','Food & Beverage',false),
  (231,5,7,1,62.59,'2024-03-19','Amazon','Seattle','WA','US','E-Commerce',false),
  (232,10,8,1,97.24,'2024-04-08','Amazon','Seattle','WA','US','E-Commerce',false),
  (233,11,13,2,131.89,'2024-01-05','Walmart','Bentonville','AR','US','Retail',false),
  (234,16,14,2,114.50,'2024-01-25','Walmart','Bentonville','AR','US','Retail',false),
  (235,17,19,2,78.32,'2024-02-14','Walmart','Bentonville','AR','US','Retail',false),
  (236,2,4,3,485.93,'2024-11-11','Target','Minneapolis','MN','US','Retail',false),
  (237,7,5,3,2182.14,'2024-12-01','Target','Minneapolis','MN','US','Retail',true),
  (238,8,10,4,6.06,'2024-08-29','Starbucks','Seattle','WA','US','Food & Beverage',false),
  (239,13,15,4,183.67,'2024-09-18','Starbucks','Seattle','WA','US','Food & Beverage',false),
  (240,14,16,4,23.32,'2024-10-08','Starbucks','Seattle','WA','US','Food & Beverage',false),
  (241,19,1,5,882.14,'2024-07-06','Shell','Houston','TX','US','Gas Station',false),
  (242,4,2,5,4951.31,'2024-07-26','Shell','Houston','TX','US','Gas Station',false),
  (243,5,7,5,75.23,'2024-04-23','Shell','Houston','TX','US','Gas Station',false),
  (244,10,12,6,57.84,'2024-05-13','Netflix','Los Gatos','CA','US','Entertainment',false),
  (245,15,13,6,92.49,'2024-06-02','Netflix','Los Gatos','CA','US','Entertainment',false),
  (246,16,18,7,127.14,'2024-02-29','Apple Store','Cupertino','CA','US','Electronics',false),
  (247,1,19,7,908.92,'2024-03-20','Apple Store','Cupertino','CA','US','Electronics',false),
  (248,2,4,7,193.57,'2024-04-09','Apple Store','Cupertino','CA','US','Electronics',false),
  (249,7,9,8,127.01,'2024-01-06','Airbnb','Paris',NULL,'FR','Travel',false),
  (250,12,10,8,161.66,'2024-01-26','Airbnb','Paris',NULL,'FR','Travel',true),
  (251,13,15,9,196.31,'2024-10-23','Uber','San Francisco','CA','US','Transportation',false),
  (252,18,20,9,528.09,'2024-11-12','Uber','San Francisco','CA','US','Transportation',false),
  (253,19,1,9,762.74,'2024-12-02','Uber','San Francisco','CA','US','Transportation',false),
  (254,4,6,10,2031.91,'2024-08-30','Whole Foods','Austin','TX','US','Grocery',false),
  (255,9,7,10,35.83,'2024-09-19','Whole Foods','Austin','TX','US','Grocery',false),
  (256,10,12,10,70.48,'2024-10-09','Whole Foods','Austin','TX','US','Grocery',false),
  (257,15,17,11,53.09,'2024-07-07','Delta Airlines','Atlanta','GA','US','Travel',false),
  (258,20,18,11,87.74,'2024-07-27','Delta Airlines','Atlanta','GA','US','Travel',false),
  (259,1,3,12,616.56,'2024-04-24','Booking.com','Amsterdam',NULL,'NL','Travel',false),
  (260,6,8,12,105.00,'2024-05-14','Booking.com','Amsterdam',NULL,'NL','Travel',false);

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

const ECOMMERCE_TABS: QueryTabSeed[] = [
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
CREATE TABLE artists (artist_id INTEGER PRIMARY KEY, name VARCHAR NOT NULL);
CREATE TABLE albums (album_id INTEGER PRIMARY KEY, title VARCHAR NOT NULL, artist_id INTEGER REFERENCES artists(artist_id));
CREATE TABLE tracks (
  track_id INTEGER PRIMARY KEY,
  name VARCHAR NOT NULL,
  album_id INTEGER REFERENCES albums(album_id),
  genre VARCHAR,
  milliseconds INTEGER,
  unit_price DOUBLE,
  duration_seconds DOUBLE GENERATED ALWAYS AS (ROUND(milliseconds / 1000.0, 1)) STORED
);
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  first_name VARCHAR,
  last_name VARCHAR,
  country VARCHAR,
  email VARCHAR,
  full_name VARCHAR GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED
);
CREATE TABLE invoices (
  invoice_id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(customer_id),
  invoice_date DATE,
  billing_country VARCHAR,
  total DOUBLE
);
CREATE TABLE invoice_items (
  invoice_item_id INTEGER PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(invoice_id),
  track_id INTEGER REFERENCES tracks(track_id),
  unit_price DOUBLE,
  quantity INTEGER
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
INSERT INTO tracks (track_id, name, album_id, genre, milliseconds, unit_price) VALUES
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
INSERT INTO customers (customer_id, first_name, last_name, country, email) VALUES
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
CREATE TABLE customers (customer_id VARCHAR PRIMARY KEY, company_name VARCHAR, contact_name VARCHAR, country VARCHAR);
CREATE TABLE employees (employee_id INTEGER PRIMARY KEY, first_name VARCHAR, last_name VARCHAR, title VARCHAR, hire_date DATE);
CREATE TABLE products (product_id INTEGER PRIMARY KEY, product_name VARCHAR, category VARCHAR, unit_price DOUBLE, units_in_stock INTEGER, inventory_value DOUBLE GENERATED ALWAYS AS (unit_price * units_in_stock) STORED);
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id VARCHAR REFERENCES customers(customer_id),
  employee_id INTEGER REFERENCES employees(employee_id),
  order_date DATE,
  ship_country VARCHAR
);
CREATE TABLE order_details (
  order_id INTEGER REFERENCES orders(order_id),
  product_id INTEGER REFERENCES products(product_id),
  quantity INTEGER,
  unit_price DOUBLE,
  line_total DOUBLE GENERATED ALWAYS AS (quantity * unit_price) STORED,
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
INSERT INTO products (product_id, product_name, category, unit_price, units_in_stock) VALUES
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
INSERT INTO order_details (order_id, product_id, quantity, unit_price) VALUES
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

export const DUCKDB_SAMPLE_DATABASES: DuckDbSampleDatabase[] = [
  {
    id: "ecommerce",
    label: "E-Commerce",
    filename: "ecommerce.duckdb",
    description: "Users, cards, vendors, and a small transactions log.",
    sql: ECOMMERCE_SCHEMA,
    defaultTabs: ECOMMERCE_TABS,
  },
  {
    id: "chinook",
    label: "Chinook music store",
    filename: "chinook.duckdb",
    description: "Artists, albums, tracks, customers, and invoices.",
    sql: CHINOOK_SQL,
    defaultTabs: CHINOOK_TABS,
  },
  {
    id: "northwind",
    label: "Northwind",
    filename: "northwind.duckdb",
    description: "Classic Northwind subset: customers, products, and orders.",
    sql: NORTHWIND_SQL,
    defaultTabs: NORTHWIND_TABS,
  },
];

export const DUCKDB_BLANK_DATABASE: DuckDbSampleDatabase = {
  id: "blank",
  label: "New Database",
  filename: "untitled.duckdb",
  description: "Empty database — start from scratch.",
  sql: "",
  defaultTabs: [{ title: "Query 1", code: "" }],
};

export function findDuckDbSampleDatabase(id: string): DuckDbSampleDatabase {
  if (id === DUCKDB_BLANK_DATABASE.id) return DUCKDB_BLANK_DATABASE;
  return (
    DUCKDB_SAMPLE_DATABASES.find((sample) => sample.id === id) ??
    DUCKDB_SAMPLE_DATABASES[0]
  );
}
