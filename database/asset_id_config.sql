-- ID Configuration Table (for assets and future entities)
CREATE TABLE public.id_configs (
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
    entity_type = ANY (
      ARRAY[
        'asset'::text,
        'tenant'::text,
        'invoice'::text,
        'ticket'::text
      ]
    )
  ),
  CONSTRAINT id_configs_structure_check CHECK (
    structure = ANY (
      ARRAY[
        'cat-type-seq'::text,
        'cat-year-seq'::text,
        'type-seq'::text,
        'cat-seq'::text,
        'year-seq'::text,
        'seq-only'::text
      ]
    )
  ),
  CONSTRAINT id_configs_separator_check CHECK (
    separator = ANY (ARRAY['-'::text, '/'::text, '_'::text])
  ),
  CONSTRAINT id_configs_digits_check CHECK (digits BETWEEN 3 AND 6),
  CONSTRAINT id_configs_dates_check CHECK (valid_till IS NULL OR valid_from <= valid_till)
) TABLESPACE pg_default;

-- Index for active config lookup
CREATE INDEX idx_id_configs_active ON public.id_configs 
USING btree (entity_type, is_active, valid_from, valid_till) 
TABLESPACE pg_default;

-- Add foreign key to assets table
ALTER TABLE public.assets 
ADD COLUMN id_config_id uuid NULL,
ADD CONSTRAINT assets_id_config_id_fkey 
FOREIGN KEY (id_config_id) REFERENCES id_configs(id);

-- Index for config lookup in assets
CREATE INDEX idx_assets_id_config ON public.assets 
USING btree (id_config_id) 
TABLESPACE pg_default;

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_id_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trigger_id_configs_updated_at 
BEFORE UPDATE ON id_configs 
FOR EACH ROW 
EXECUTE FUNCTION update_id_config_updated_at();
