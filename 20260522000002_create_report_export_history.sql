create table if not exists public.report_export_history (
  id uuid primary key default gen_random_uuid(),
  generated_by text,
  template_id uuid null references report_templates(id),
  report_name text,
  report_type text,
  total_sheets integer default 0,
  total_rows integer default 0,
  export_format text default 'xlsx',
  generation_time_ms integer,
  status text default 'Success',
  error_message text,
  created_at timestamptz default now()
);
