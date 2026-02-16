-- Master Settings Tables Migration
-- Replaces dropdown_configs JSONB structure with proper relational tables

-- Categories table
CREATE TABLE IF NOT EXISTS public.asset_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT asset_categories_pkey PRIMARY KEY (id),
  CONSTRAINT asset_categories_short_code_unique UNIQUE (short_code)
);

-- Sub-categories table
CREATE TABLE IF NOT EXISTS public.asset_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  category_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT asset_subcategories_pkey PRIMARY KEY (id),
  CONSTRAINT asset_subcategories_category_fkey FOREIGN KEY (category_id) REFERENCES public.asset_categories(id) ON DELETE CASCADE,
  CONSTRAINT asset_subcategories_short_code_unique UNIQUE (short_code)
);

-- Manufacturers table
CREATE TABLE IF NOT EXISTS public.asset_manufacturers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT asset_manufacturers_pkey PRIMARY KEY (id),
  CONSTRAINT asset_manufacturers_category_fkey FOREIGN KEY (category_id) REFERENCES public.asset_categories(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_asset_subcategories_category ON public.asset_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_asset_manufacturers_category ON public.asset_manufacturers(category_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_asset_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_asset_categories_updated_at
  BEFORE UPDATE ON public.asset_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_tables_updated_at();

CREATE TRIGGER trigger_asset_subcategories_updated_at
  BEFORE UPDATE ON public.asset_subcategories
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_tables_updated_at();

CREATE TRIGGER trigger_asset_manufacturers_updated_at
  BEFORE UPDATE ON public.asset_manufacturers
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_tables_updated_at();

-- Migrate existing data from dropdown_configs (if exists)
DO $$
DECLARE
  config_record RECORD;
  category_record JSONB;
  subcategory_record JSONB;
  manufacturer_record TEXT;
  new_category_id UUID;
BEGIN
  FOR config_record IN 
    SELECT config_data FROM dropdown_configs 
    WHERE entity_type = 'asset' AND field_name = 'categories'
  LOOP
    FOR category_record IN SELECT * FROM jsonb_array_elements(config_record.config_data)
    LOOP
      INSERT INTO asset_categories (name, short_code)
      VALUES (
        category_record->>'name',
        COALESCE(category_record->>'shortCode', UPPER(LEFT(category_record->>'name', 3)))
      )
      RETURNING id INTO new_category_id;

      IF category_record->'subTypes' IS NOT NULL THEN
        FOR subcategory_record IN SELECT * FROM jsonb_array_elements(category_record->'subTypes')
        LOOP
          INSERT INTO asset_subcategories (name, short_code, category_id)
          VALUES (
            subcategory_record->>'name',
            COALESCE(subcategory_record->>'shortCode', UPPER(LEFT(subcategory_record->>'name', 3))),
            new_category_id
          );
        END LOOP;
      END IF;

      IF category_record->'manufacturers' IS NOT NULL THEN
        FOR manufacturer_record IN SELECT * FROM jsonb_array_elements_text(category_record->'manufacturers')
        LOOP
          INSERT INTO asset_manufacturers (name, category_id)
          VALUES (manufacturer_record, new_category_id);
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
END $$;
