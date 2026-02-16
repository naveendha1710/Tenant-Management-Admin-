-- Dropdown Configurations Table (for all entities and fields)
CREATE TABLE IF NOT EXISTS public.dropdown_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  field_name text NOT NULL,
  config_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dropdown_configs_pkey PRIMARY KEY (id),
  CONSTRAINT dropdown_configs_unique UNIQUE (entity_type, field_name)
) TABLESPACE pg_default;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_dropdown_configs_entity ON public.dropdown_configs 
USING btree (entity_type, field_name) TABLESPACE pg_default;

-- ID Configuration Table
CREATE TABLE IF NOT EXISTS public.id_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  structure text NOT NULL,
  separator text NOT NULL DEFAULT '-',
  start_value integer NOT NULL DEFAULT 1,
  digits integer NOT NULL DEFAULT 4,
  valid_from date NOT NULL,
  valid_till date NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by text NULL,
  CONSTRAINT id_configs_pkey PRIMARY KEY (id),
  CONSTRAINT id_configs_entity_type_check CHECK (
    entity_type = ANY (ARRAY['asset'::text, 'tenant'::text, 'invoice'::text, 'ticket'::text])
  ),
  CONSTRAINT id_configs_structure_check CHECK (
    structure = ANY (ARRAY['cat-type-seq'::text, 'cat-year-seq'::text, 'type-seq'::text, 'cat-seq'::text, 'year-seq'::text, 'seq-only'::text])
  ),
  CONSTRAINT id_configs_separator_check CHECK (separator = ANY (ARRAY['-'::text, '/'::text, '_'::text])),
  CONSTRAINT id_configs_digits_check CHECK (digits BETWEEN 3 AND 6),
  CONSTRAINT id_configs_dates_check CHECK (valid_till IS NULL OR valid_from <= valid_till)
) TABLESPACE pg_default;

-- Index for active config lookup
CREATE INDEX IF NOT EXISTS idx_id_configs_active ON public.id_configs 
USING btree (entity_type, is_active, valid_from, valid_till) TABLESPACE pg_default;

-- Add foreign key to assets table (if column doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='id_config_id') THEN
    ALTER TABLE public.assets ADD COLUMN id_config_id uuid NULL;
    ALTER TABLE public.assets ADD CONSTRAINT assets_id_config_id_fkey FOREIGN KEY (id_config_id) REFERENCES id_configs(id);
    CREATE INDEX idx_assets_id_config ON public.assets USING btree (id_config_id) TABLESPACE pg_default;
  END IF;
END $$;

-- Trigger functions
CREATE OR REPLACE FUNCTION update_dropdown_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_id_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_dropdown_configs_updated_at ON dropdown_configs;
CREATE TRIGGER trigger_dropdown_configs_updated_at 
BEFORE UPDATE ON dropdown_configs 
FOR EACH ROW 
EXECUTE FUNCTION update_dropdown_configs_updated_at();

DROP TRIGGER IF EXISTS trigger_id_configs_updated_at ON id_configs;
CREATE TRIGGER trigger_id_configs_updated_at 
BEFORE UPDATE ON id_configs 
FOR EACH ROW 
EXECUTE FUNCTION update_id_config_updated_at();

-- Example data structure for asset categories:
-- entity_type: 'asset'
-- field_name: 'categories'
-- config_data: [{"id": "uuid", "name": "IT Electronics", "code": "ITE", "subTypes": [{"id": 1, "name": "Laptop", "code": "LPT"}], "manufacturers": ["Dell", "HP"]}]
