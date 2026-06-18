create table if not exists public.report_templates (
  id uuid primary key default gen_random_uuid(),
  template_name text not null,
  report_type text default 'custom',
  created_by text,
  is_public boolean default false,
  global_filters jsonb default '{}'::jsonb,
  sheet_configs jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
