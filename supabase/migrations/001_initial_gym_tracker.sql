-- Enable PostGIS
create extension if not exists postgis schema extensions;

-- Create Gyms Table
create table if not exists public.gyms (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default now() not null,
    name text not null,
    location geography(POINT, 4326), -- Stores Lat/Lng
    address text,
    created_by uuid references auth.users(id)
);

-- Enable RLS
alter table public.gyms enable row level security;

-- Policies for Gyms
create policy "Gyms are viewable by everyone" 
    on public.gyms for select using (true);

create policy "Users can create gyms" 
    on public.gyms for insert with check (auth.uid() = created_by);

-- Create Workout Sessions Table
create table if not exists public.workout_sessions (
    id uuid default gen_random_uuid() primary key,
    created_at timestamptz default now() not null,
    user_id uuid references auth.users(id) not null,
    gym_id uuid references public.gyms(id),
    start_time timestamptz not null,
    end_time timestamptz,
    duration int, -- in seconds
    status text check (status in ('active', 'completed')) default 'active',
    type text check (type in ('auto', 'manual')) default 'manual'
);

-- Enable RLS
alter table public.workout_sessions enable row level security;

-- Policies for Sessions
create policy "Users can view own sessions" 
    on public.workout_sessions for select using (auth.uid() = user_id);

create policy "Users can insert own sessions" 
    on public.workout_sessions for insert with check (auth.uid() = user_id);

create policy "Users can update own sessions" 
    on public.workout_sessions for update using (auth.uid() = user_id);

-- Update Profiles
alter table public.profiles 
add column if not exists home_gym_id uuid references public.gyms(id),
add column if not exists auto_tracking_enabled boolean default false;

-- Nearby Gyms Function (RPC)
create or replace function get_gyms_nearby(
    lat float,
    lng float,
    radius_meters float
)
returns table (
    id uuid,
    name text,
    dist_meters float
)
language sql
as $$
    select 
        id, 
        name, 
        st_distance(location, st_point(lng, lat)::geography) as dist_meters
    from 
        public.gyms
    where 
        st_dwithin(location, st_point(lng, lat)::geography, radius_meters)
    order by 
        dist_meters asc;
$$;
