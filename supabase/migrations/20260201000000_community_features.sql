-- Community Features Migration

-- 1. Event Participants (RSVPs)
create table if not exists event_participants (
    id uuid default gen_random_uuid() primary key,
    event_id uuid references gym_events(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    status text check (status in ('going', 'maybe', 'not_going')) default 'going',
    created_at timestamptz default now(),
    unique(event_id, user_id)
);

-- RLS for event_participants
alter table event_participants enable row level security;

create policy "Users can view event participants"
    on event_participants for select
    using (true);

create policy "Users can manage their own RSVPs"
    on event_participants for all
    using (auth.uid() = user_id);

-- 2. Challenge Participants (Joined Challenges)
create table if not exists challenge_participants (
    id uuid default gen_random_uuid() primary key,
    challenge_id uuid references gym_challenges(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    joined_at timestamptz default now(),
    progress numeric default 0, -- e.g. 5/10 workouts
    status text check (status in ('active', 'completed', 'dropped')) default 'active',
    unique(challenge_id, user_id)
);

-- RLS for challenge_participants
alter table challenge_participants enable row level security;

create policy "Users can view challenge participants"
    on challenge_participants for select
    using (true);

create policy "Users can join challenges"
    on challenge_participants for insert
    with check (auth.uid() = user_id);

create policy "Users can update their challenge status"
    on challenge_participants for update
    using (auth.uid() = user_id);

-- 3. Challenge Entries (Submissions)
create table if not exists challenge_entries (
    id uuid default gen_random_uuid() primary key,
    challenge_id uuid references gym_challenges(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    value numeric not null, -- e.g. weight lifted, time, reps
    proof_url text, -- link to video/image
    notes text,
    status text check (status in ('pending', 'verified', 'rejected')) default 'pending',
    created_at timestamptz default now()
);

-- RLS for challenge_entries
alter table challenge_entries enable row level security;

create policy "Users can view entries"
    on challenge_entries for select
    using (true);

create policy "Users can submit entries"
    on challenge_entries for insert
    with check (auth.uid() = user_id);

-- Admins/Owners need access to verify (handled by checking gym ownership in app logic usually, or added policy)
-- For simplicity, allowing users to update their own pending entries
create policy "Users can update own pending entries"
    on challenge_entries for update
    using (auth.uid() = user_id and status = 'pending');
