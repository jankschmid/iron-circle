-- Create notifications table
create table if not exists notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references profiles(id) on delete cascade not null,
    type text not null,
    title text not null,
    message text not null,
    data jsonb,
    read boolean default false,
    created_at timestamptz default now()
);

-- Add RLS policies
alter table notifications enable row level security;

-- Users can read their own notifications
create policy "Users can read own notifications"
    on notifications for select
    using (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
create policy "Users can update own notifications"
    on notifications for update
    using (auth.uid() = user_id);

-- System can insert notifications
create policy "System can insert notifications"
    on notifications for insert
    with check (true);

-- Add index for performance
create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_created_at_idx on notifications(created_at desc);
