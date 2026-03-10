-- inventory_resources
ALTER TABLE public.inventory_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to view resources" ON public.inventory_resources;
DROP POLICY IF EXISTS "Allow authenticated users to insert resources" ON public.inventory_resources;
DROP POLICY IF EXISTS "Allow authenticated users to update resources" ON public.inventory_resources;
DROP POLICY IF EXISTS "Allow authenticated users to delete resources" ON public.inventory_resources;
CREATE POLICY "Allow authenticated users to view resources" ON public.inventory_resources FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to insert resources" ON public.inventory_resources FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update resources" ON public.inventory_resources FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete resources" ON public.inventory_resources FOR DELETE USING (auth.role() = 'authenticated');

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (user_id::uuid = auth.uid());
CREATE POLICY "System insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (user_id::uuid = auth.uid());
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE USING (user_id::uuid = auth.uid());

-- ticket_completion_images
ALTER TABLE public.ticket_completion_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage completion images" ON public.ticket_completion_images;
CREATE POLICY "Allow authenticated users to manage completion images" ON public.ticket_completion_images FOR ALL USING (auth.role() = 'authenticated');

-- ticket_estimations
ALTER TABLE public.ticket_estimations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage estimations" ON public.ticket_estimations;
CREATE POLICY "Allow authenticated users to manage estimations" ON public.ticket_estimations FOR ALL USING (auth.role() = 'authenticated');

-- form_options
ALTER TABLE public.form_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all to read form options" ON public.form_options;
DROP POLICY IF EXISTS "Allow authenticated to manage form options" ON public.form_options;
CREATE POLICY "Allow all to read form options" ON public.form_options FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to manage form options" ON public.form_options FOR ALL USING (auth.role() = 'authenticated');

-- physical_audits
ALTER TABLE public.physical_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated to manage audits" ON public.physical_audits;
CREATE POLICY "Allow authenticated to manage audits" ON public.physical_audits FOR ALL USING (auth.role() = 'authenticated');

-- preventive_maintenance
ALTER TABLE public.preventive_maintenance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated to manage PM" ON public.preventive_maintenance;
CREATE POLICY "Allow authenticated to manage PM" ON public.preventive_maintenance FOR ALL USING (auth.role() = 'authenticated');

-- maintenance_tickets
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated to view tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Allow authenticated to create tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Allow authenticated to update tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Allow authenticated to delete tickets" ON public.maintenance_tickets;
CREATE POLICY "Allow authenticated to view tickets" ON public.maintenance_tickets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated to create tickets" ON public.maintenance_tickets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated to update tickets" ON public.maintenance_tickets FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated to delete tickets" ON public.maintenance_tickets FOR DELETE USING (auth.role() = 'authenticated');

-- id_configs
ALTER TABLE public.id_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all to read id configs" ON public.id_configs;
DROP POLICY IF EXISTS "Allow authenticated to manage id configs" ON public.id_configs;
CREATE POLICY "Allow all to read id configs" ON public.id_configs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to manage id configs" ON public.id_configs FOR ALL USING (auth.role() = 'authenticated');

-- ticket_assets
ALTER TABLE public.ticket_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated to manage ticket assets" ON public.ticket_assets;
CREATE POLICY "Allow authenticated to manage ticket assets" ON public.ticket_assets FOR ALL USING (auth.role() = 'authenticated');

-- form_dropdowns
ALTER TABLE public.form_dropdowns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all to read form dropdowns" ON public.form_dropdowns;
DROP POLICY IF EXISTS "Allow authenticated to manage form dropdowns" ON public.form_dropdowns;
CREATE POLICY "Allow all to read form dropdowns" ON public.form_dropdowns FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to manage form dropdowns" ON public.form_dropdowns FOR ALL USING (auth.role() = 'authenticated');

-- form_subcategories
ALTER TABLE public.form_subcategories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all to read form subcategories" ON public.form_subcategories;
DROP POLICY IF EXISTS "Allow authenticated to manage form subcategories" ON public.form_subcategories;
CREATE POLICY "Allow all to read form subcategories" ON public.form_subcategories FOR SELECT USING (true);
CREATE POLICY "Allow authenticated to manage form subcategories" ON public.form_subcategories FOR ALL USING (auth.role() = 'authenticated');
