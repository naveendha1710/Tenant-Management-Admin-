create table if not exists public.scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references report_templates(id),
  schedule_type text not null,
  cron_expression text,
  recipients jsonb default '[]'::jsonb,
  is_active boolean default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by text,
  created_at timestamptz default now()
);
