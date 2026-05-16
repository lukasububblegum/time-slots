alter table public.schedule_blocks
  add column if not exists completed_at timestamptz;
