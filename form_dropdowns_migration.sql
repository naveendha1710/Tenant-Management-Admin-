-- Generic Settings Tables for all forms

CREATE TABLE IF NOT EXISTS public.form_dropdowns (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL,
  name TEXT NOT NULL,
  short_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT form_dropdowns_pkey PRIMARY KEY (id),
  CONSTRAINT form_dropdowns_unique UNIQUE (form_type, short_code)
);

CREATE TABLE IF NOT EXISTS public.form_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL,
  name TEXT NOT NULL,
  short_code TEXT,
  category_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT form_subcategories_pkey PRIMARY KEY (id),
  CONSTRAINT form_subcategories_category_fkey FOREIGN KEY (category_id) REFERENCES public.form_dropdowns(id) ON DELETE CASCADE,
  CONSTRAINT form_subcategories_unique UNIQUE (form_type, short_code)
);

CREATE TABLE IF NOT EXISTS public.form_options (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL,
  option_type TEXT NOT NULL,
  name TEXT NOT NULL,
  category_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT form_options_pkey PRIMARY KEY (id),
  CONSTRAINT form_options_category_fkey FOREIGN KEY (category_id) REFERENCES public.form_dropdowns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_form_dropdowns_type ON public.form_dropdowns(form_type);
CREATE INDEX IF NOT EXISTS idx_form_subcategories_type ON public.form_subcategories(form_type);
CREATE INDEX IF NOT EXISTS idx_form_subcategories_category ON public.form_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_form_options_type ON public.form_options(form_type);
CREATE INDEX IF NOT EXISTS idx_form_options_category ON public.form_options(category_id);

CREATE OR REPLACE FUNCTION update_form_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_form_dropdowns_updated_at
  BEFORE UPDATE ON public.form_dropdowns
  FOR EACH ROW
  EXECUTE FUNCTION update_form_tables_updated_at();

CREATE TRIGGER trigger_form_subcategories_updated_at
  BEFORE UPDATE ON public.form_subcategories
  FOR EACH ROW
  EXECUTE FUNCTION update_form_tables_updated_at();

CREATE TRIGGER trigger_form_options_updated_at
  BEFORE UPDATE ON public.form_options
  FOR EACH ROW
  EXECUTE FUNCTION update_form_tables_updated_at();

-- Migrate data
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
      INSERT INTO form_dropdowns (form_type, name, short_code)
      VALUES (
        'asset',
        category_record->>'name',
        COALESCE(category_record->>'shortCode', UPPER(LEFT(category_record->>'name', 3)))
      )
      RETURNING id INTO new_category_id;

      IF category_record->'subTypes' IS NOT NULL THEN
        FOR subcategory_record IN SELECT * FROM jsonb_array_elements(category_record->'subTypes')
        LOOP
          INSERT INTO form_subcategories (form_type, name, short_code, category_id)
          VALUES (
            'asset',
            subcategory_record->>'name',
            COALESCE(subcategory_record->>'shortCode', UPPER(LEFT(subcategory_record->>'name', 3))),
            new_category_id
          );
        END LOOP;
      END IF;

      IF category_record->'manufacturers' IS NOT NULL THEN
        FOR manufacturer_record IN SELECT * FROM jsonb_array_elements_text(category_record->'manufacturers')
        LOOP
          INSERT INTO form_options (form_type, option_type, name, category_id)
          VALUES ('asset', 'manufacturer', manufacturer_record, new_category_id);
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
END $$;
