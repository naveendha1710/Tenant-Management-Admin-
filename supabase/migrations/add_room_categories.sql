-- Insert default room categories into existing form_dropdowns table
-- The table already has a unique constraint on (form_type, short_code)
INSERT INTO public.form_dropdowns (form_type, name, short_code) VALUES
    ('room_categories', 'Office', 'OFF'),
    ('room_categories', 'Meeting Room', 'MTG'),
    ('room_categories', 'Conference Room', 'CONF'),
    ('room_categories', 'Rest Room', 'REST'),
    ('room_categories', 'Library', 'LIB'),
    ('room_categories', 'Laboratory', 'LAB'),
    ('room_categories', 'Storage', 'STOR'),
    ('room_categories', 'Reception', 'REC'),
    ('room_categories', 'Cafeteria', 'CAF'),
    ('room_categories', 'Kitchen', 'KIT'),
    ('room_categories', 'Server Room', 'SRV'),
    ('room_categories', 'Training Room', 'TRN'),
    ('room_categories', 'Break Room', 'BRK'),
    ('room_categories', 'Utility Room', 'UTL'),
    ('room_categories', 'Security Room', 'SEC')
ON CONFLICT (form_type, short_code) DO NOTHING;