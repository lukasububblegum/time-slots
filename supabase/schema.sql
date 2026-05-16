create table if not exists public.tasks (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  title text not null,
  description text,
  status text not null check (status in ('todo', 'in-progress', 'done')),
  priority text not null check (priority in ('high', 'medium', 'low')),
  tags text[] not null default '{}',
  estimated_minutes integer not null check (estimated_minutes > 0),
  due_date date,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  device_updated_at timestamptz not null,
  primary key (user_id, id)
);

create table if not exists public.schedule_blocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  task_id uuid not null,
  date date not null,
  start_minutes integer not null check (start_minutes >= 0 and start_minutes < 1440),
  duration_minutes integer not null check (duration_minutes > 0),
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  device_updated_at timestamptz not null,
  primary key (user_id, id)
);

create table if not exists public.settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null check (id = 'local'),
  day_start_minutes integer not null check (day_start_minutes >= 0 and day_start_minutes < 1440),
  day_end_minutes integer not null check (day_end_minutes > 0 and day_end_minutes <= 1440),
  slot_size_minutes integer not null check (slot_size_minutes > 0),
  default_view text not null check (default_view in ('day', 'week')),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (day_start_minutes < day_end_minutes)
);

create index if not exists tasks_user_updated_idx on public.tasks (user_id, updated_at desc);
create index if not exists tasks_user_deleted_idx on public.tasks (user_id, deleted_at) where deleted_at is not null;
create index if not exists schedule_blocks_user_updated_idx on public.schedule_blocks (user_id, updated_at desc);
create index if not exists schedule_blocks_user_date_idx on public.schedule_blocks (user_id, date);
create index if not exists schedule_blocks_user_deleted_idx on public.schedule_blocks (user_id, deleted_at) where deleted_at is not null;

alter table public.tasks enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.settings enable row level security;

drop policy if exists "Users can read own tasks" on public.tasks;
create policy "Users can read own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own tasks" on public.tasks;
create policy "Users can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own schedule blocks" on public.schedule_blocks;
create policy "Users can read own schedule blocks"
  on public.schedule_blocks for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own schedule blocks" on public.schedule_blocks;
create policy "Users can insert own schedule blocks"
  on public.schedule_blocks for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own schedule blocks" on public.schedule_blocks;
create policy "Users can update own schedule blocks"
  on public.schedule_blocks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own schedule blocks" on public.schedule_blocks;
create policy "Users can delete own schedule blocks"
  on public.schedule_blocks for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own settings" on public.settings;
create policy "Users can read own settings"
  on public.settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on public.settings;
create policy "Users can insert own settings"
  on public.settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on public.settings;
create policy "Users can update own settings"
  on public.settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
