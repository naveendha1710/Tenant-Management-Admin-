-- Add Asset Status options
INSERT INTO form_dropdowns (form_type, name, short_code) VALUES
('asset_status', 'Active', 'ACT'),
('asset_status', 'Idle', 'IDL'),
('asset_status', 'Under Repair', 'REP'),
('asset_status', 'Scrap', 'SCR'),
('asset_status', 'Disposed', 'DIS');

-- Add SEZ Status options
INSERT INTO form_dropdowns (form_type, name, short_code) VALUES
('sez_status', 'SEZ', 'SEZ'),
('sez_status', 'DTA', 'DTA'),
('sez_status', 'FTWZ', 'FTZ'),
('sez_status', 'EOU', 'EOU');

-- Add Customs Category options
INSERT INTO form_dropdowns (form_type, name, short_code) VALUES
('customs_category', 'Capital Goods', 'CAP'),
('customs_category', 'Consumables', 'CON'),
('customs_category', 'Spares', 'SPR'),
('customs_category', 'Raw Materials', 'RAW'),
('customs_category', 'Finished Goods', 'FIN');
