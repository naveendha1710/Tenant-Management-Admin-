-- Sample data for form_dropdowns (5 categories)

INSERT INTO form_dropdowns (form_type, name, short_code) VALUES
('asset', 'IT Equipment', 'ITE'),
('asset', 'Furniture', 'FUR'),
('asset', 'Machinery', 'MCH'),
('asset', 'Vehicles', 'VEH'),
('asset', 'Office Equipment', 'OFC');

-- Sample subcategories
INSERT INTO form_subcategories (form_type, name, short_code, category_id) VALUES
('asset', 'Laptops', 'LAP', (SELECT id FROM form_dropdowns WHERE short_code = 'ITE')),
('asset', 'Desktops', 'DSK', (SELECT id FROM form_dropdowns WHERE short_code = 'ITE')),
('asset', 'Servers', 'SRV', (SELECT id FROM form_dropdowns WHERE short_code = 'ITE')),
('asset', 'Printers', 'PRT', (SELECT id FROM form_dropdowns WHERE short_code = 'ITE')),
('asset', 'Chairs', 'CHR', (SELECT id FROM form_dropdowns WHERE short_code = 'FUR')),
('asset', 'Desks', 'DES', (SELECT id FROM form_dropdowns WHERE short_code = 'FUR')),
('asset', 'Tables', 'TBL', (SELECT id FROM form_dropdowns WHERE short_code = 'FUR')),
('asset', 'CNC Machine', 'CNC', (SELECT id FROM form_dropdowns WHERE short_code = 'MCH')),
('asset', 'Lathe', 'LTH', (SELECT id FROM form_dropdowns WHERE short_code = 'MCH')),
('asset', 'Cars', 'CAR', (SELECT id FROM form_dropdowns WHERE short_code = 'VEH')),
('asset', 'Bikes', 'BIK', (SELECT id FROM form_dropdowns WHERE short_code = 'VEH')),
('asset', 'Projectors', 'PRJ', (SELECT id FROM form_dropdowns WHERE short_code = 'OFC')),
('asset', 'Scanners', 'SCN', (SELECT id FROM form_dropdowns WHERE short_code = 'OFC'));

-- Sample manufacturers
INSERT INTO form_options (form_type, option_type, name, category_id) VALUES
('asset', 'manufacturer', 'Dell', (SELECT id FROM form_dropdowns WHERE short_code = 'ITE')),
('asset', 'manufacturer', 'HP', (SELECT id FROM form_dropdowns WHERE short_code = 'ITE')),
('asset', 'manufacturer', 'Lenovo', (SELECT id FROM form_dropdowns WHERE short_code = 'ITE')),
('asset', 'manufacturer', 'IKEA', (SELECT id FROM form_dropdowns WHERE short_code = 'FUR')),
('asset', 'manufacturer', 'Godrej', (SELECT id FROM form_dropdowns WHERE short_code = 'FUR')),
('asset', 'manufacturer', 'Haas', (SELECT id FROM form_dropdowns WHERE short_code = 'MCH')),
('asset', 'manufacturer', 'DMG Mori', (SELECT id FROM form_dropdowns WHERE short_code = 'MCH')),
('asset', 'manufacturer', 'Toyota', (SELECT id FROM form_dropdowns WHERE short_code = 'VEH')),
('asset', 'manufacturer', 'Honda', (SELECT id FROM form_dropdowns WHERE short_code = 'VEH')),
('asset', 'manufacturer', 'Epson', (SELECT id FROM form_dropdowns WHERE short_code = 'OFC')),
('asset', 'manufacturer', 'Canon', (SELECT id FROM form_dropdowns WHERE short_code = 'OFC'));
