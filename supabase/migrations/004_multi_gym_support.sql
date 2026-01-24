-- Create User Gyms Join Table
create table if not exists public.user_gyms (
    user_id uuid references auth.users(id) not null,
    gym_id uuid references public.gyms(id) not null,
    label text,
    is_default boolean default false,
    created_at timestamptz default now(),
    primary key (user_id, gym_id)
);

-- Enable RLS
alter table public.user_gyms enable row level security;

create policy "Users can view own gyms" 
    on public.user_gyms for select using (auth.uid() = user_id);

create policy "Users can manage own gyms" 
    on public.user_gyms for all using (auth.uid() = user_id);

-- Migration: Move existing home_gym_id to user_gyms
insert into public.user_gyms (user_id, gym_id, label, is_default)
select id, home_gym_id, 'Home Gym', true
from public.profiles 
where home_gym_id is not null
on conflict do nothing;

-- Optional: We can drop home_gym_id column later, but keeping it for now as fallback/read-only might be safer until code is fully updated.
