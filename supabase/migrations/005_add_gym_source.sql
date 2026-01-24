alter table public.gyms 
add column if not exists source text check (source in ('gps', 'manual', 'import', 'unknown')) default 'manual';
