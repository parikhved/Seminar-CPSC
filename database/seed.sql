-- CPSC Compliance & Analytics Unit — Seed Data
-- Sprint 2: Marketplace Violation Detection System

-- ============================================================
-- Users (10 rows)
-- ============================================================
INSERT INTO "user" ("userID", "firstName", "lastName", "email", "password", "role", "phoneNum") VALUES
(1000, 'Emily',  'Carter',    'emily.carter@cpsc-sim.gov',              'hashed_pw_1',  'Manager',      '202-555-0143'),
(1001, 'James',  'Mitchell',  'james.mitchell@cpsc-sim.gov',            'hashed_pw_2',  'Manager',      '202-555-0178'),
(1002, 'Sofia',  'Reynolds',  'sofia.reynolds@cpsc-sim.gov',            'hashed_pw_3',  'Manager',      '202-555-0192'),
(2000, 'Daniel', 'Kim',       'daniel.kim@cpsc-investigator.gov',       'hashed_pw_4',  'Investigator', '202-555-0136'),
(2001, 'Olivia', 'Bennett',   'olivia.bennett@cpsc-investigator.com',   'hashed_pw_5',  'Investigator', '703-555-0184'),
(2002, 'Marcus', 'Hughes',    'marcus.hughes@cpsc-investigator.com',    'hashed_pw_6',  'Investigator', '703-555-0119'),
(3000, 'Priya',  'Shah',      'priya.shah@gmail.com',                   'hashed_pw_7',  'Seller',       '646-555-0157'),
(3001, 'Ethan',  'Walker',    'ethan.walker@gmail.com',                 'hashed_pw_8',  'Seller',       '646-555-0121'),
(3002, 'Noah',   'Collins',   'noah.collins@gmail.com',                 'hashed_pw_9',  'Seller',       '202-555-0165'),
(3003, 'Alex',   'Jefferson', 'alex.jefferson@gmail.com',               'hashed_pw_10', 'Seller',       '888-888-8888');

-- ============================================================
-- Recalls (20 rows)
-- ============================================================
INSERT INTO recall ("recallID", "productName", "manufacturerName", "hazard", "recallDate", "recallURL", "remedy", "units", "soldAt") VALUES
(5000, 'Widget1 Portable Heater',            'Company1',  'Composition leads to overheating and fire risk',                                    '2025-10-11', 'https://cpsc.gov/recall/5000', 'Repair',  '50000',  'Amazon, Walmart'),
(5001, 'Widget2 Baby Bottle Lid',            'Company1',  'Lid contains BPA contaminant poses choking hazard',                                 '2025-10-19', 'https://cpsc.gov/recall/5001', 'Refund',  '120000', 'Target, BuyBuyBaby'),
(5002, 'Widget3 Power Strip',                'Company2',  'Left rear wire exposed causes electric shock',                                       '2025-12-31', 'https://cpsc.gov/recall/5002', 'Repair',  '75000',  'Home Depot, Lowes'),
(5003, 'Widget4 Children Swing Set',         'Company3',  'Causes entrapment hazard for children',                                             '2026-01-01', 'https://cpsc.gov/recall/5003', 'Refund',  '30000',  'Walmart, Amazon'),
(5004, 'SlumberSafe Convertible Crib',       'NestWell',  'Side rails detach unexpectedly, posing fall and entrapment risk to infants',         '2025-10-22', 'https://cpsc.gov/recall/5004', 'Replace', '45000',  'Pottery Barn Kids, Target'),
(5005, 'PowerMax Lithium Battery Pack',      'VoltEdge',  'Battery cells overheat under charging load, causing swelling and fire hazard',       '2025-11-03', 'https://cpsc.gov/recall/5005', 'Refund',  '88000',  'Amazon, Best Buy'),
(5006, 'SwiftRide Electric Scooter',         'ZipCo',     'Brake failure at speeds above 10 mph increases crash and injury risk',               '2025-11-14', 'https://cpsc.gov/recall/5006', 'Repair',  '22000',  'Target, Costco'),
(5007, 'CozyFlame Ceramic Space Heater',     'HeatMaster','Defective thermostat causes unit to overheat and ignite nearby materials',           '2025-11-28', 'https://cpsc.gov/recall/5007', 'Replace', '61000',  'Walmart, Home Depot'),
(5008, 'AquaPure Under-Sink Water Filter',   'ClearFlow', 'Filter housing cracks under pressure, causing leaks that may damage cabinetry',      '2025-12-05', 'https://cpsc.gov/recall/5008', 'Replace', '17000',  'Home Depot, Amazon'),
(5009, 'FlexFit Resistance Band Set',        'IronFlex',  'Bands snap during use without warning, posing laceration and eye injury risk',       '2025-12-11', 'https://cpsc.gov/recall/5009', 'Refund',  '95000',  'Amazon, Dick''s Sporting Goods'),
(5010, 'BrightHome Smart LED Light Strip',   'LumoTech',  'Faulty wiring causes short circuit and overheating, posing fire risk',              '2025-12-19', 'https://cpsc.gov/recall/5010', 'Repair',  '43000',  'Amazon, Ikea'),
(5011, 'Little Chef Play Kitchen Set',       'TinyWorld', 'Painted surfaces contain lead levels exceeding federal limits, toxic to children',   '2025-12-27', 'https://cpsc.gov/recall/5011', 'Replace', '58000',  'Walmart, Target, Amazon'),
(5012, 'SpeedCharge USB-C Cable',            'TechLink',  'Insulation tears at connector joint exposing live wires, posing shock hazard',       '2026-01-06', 'https://cpsc.gov/recall/5012', 'Refund',  '210000', 'Amazon, Micro Center'),
(5013, 'EaseBack Power Recliner',            'ComfortCo', 'Motor mechanism catches fingers during reclining, causing crush injuries',           '2026-01-10', 'https://cpsc.gov/recall/5013', 'Repair',  '12000',  'Ashley Furniture, Wayfair'),
(5014, 'ClimbSafe Aluminum Extension Ladder','SteelPro',  'Locking latch fails mid-extension causing ladder to collapse under load',            '2026-01-17', 'https://cpsc.gov/recall/5014', 'Replace', '28000',  'Home Depot, Lowes, Amazon'),
(5015, 'PureAir HEPA Air Purifier',          'BreatheWell','Ozone output exceeds EPA limits, causing respiratory irritation with prolonged use', '2026-01-22', 'https://cpsc.gov/recall/5015', 'Refund',  '34000',  'Costco, Amazon, Best Buy'),
(5016, 'SpeedRacer Die-Cast Toy Car Set',    'FunZone',   'Small detachable parts present choking hazard for children under 3 years',           '2026-01-29', 'https://cpsc.gov/recall/5016', 'Refund',  '76000',  'Walmart, Target, Dollar Tree'),
(5017, 'AromaGlow Candle Warmer Lamp',       'WarmLight', 'Ceramic base cracks when overheated, spilling hot wax and causing burn risk',       '2026-02-05', 'https://cpsc.gov/recall/5017', 'Replace', '41000',  'HomeGoods, Amazon'),
(5018, 'SummitTrek Waterproof Hiking Boots', 'TrailBound','Outsole delaminates on wet surfaces, significantly increasing slip and fall risk',   '2026-02-11', 'https://cpsc.gov/recall/5018', 'Replace', '19000',  'REI, Amazon, Zappos'),
(5019, 'SafeAlert Interconnected Smoke Detector', 'SecureHome', 'Sensor fails to activate during slow-smoldering fires, providing no warning', '2026-02-18', 'https://cpsc.gov/recall/5019', 'Replace', '130000', 'Home Depot, Lowes, Costco');

-- ============================================================
-- ShortList (4 rows)
-- ============================================================
INSERT INTO "shortList" ("shortListID", "priorityLevel", "shortListDate", "notes", "managerUserID", "recallID") VALUES
(4000, 'Low',    '2026-01-15', 'Potentially dangerous product, monitoring',    1000, 5000),
(4001, 'Medium', '2026-01-15', 'Product has caused harm, recalled',            1000, 5001),
(4002, 'High',   '2026-01-16', 'Lethal product, immediate recall needed',      1001, 5002),
(4003, 'Medium', '2026-01-16', 'Product has caused harm, recalled',            1001, 5003);

-- ============================================================
-- Marketplaces (4 rows)
-- ============================================================
INSERT INTO marketplace ("marketplaceID", "name") VALUES
(7000, 'Ebay'),
(7001, 'Craigslist'),
(7002, 'Facebook Marketplace'),
(7003, 'Amazon');

-- ============================================================
-- Reset sequences so new inserts get correct next IDs
-- ============================================================
SELECT setval(pg_get_serial_sequence('"user"',      '"userID"'),      (SELECT MAX("userID")      FROM "user"));
SELECT setval(pg_get_serial_sequence('recall',      '"recallID"'),    (SELECT MAX("recallID")    FROM recall));
SELECT setval(pg_get_serial_sequence('"shortList"', '"shortListID"'), (SELECT MAX("shortListID") FROM "shortList"));
SELECT setval(pg_get_serial_sequence('marketplace', '"marketplaceID"'), (SELECT MAX("marketplaceID") FROM marketplace));
