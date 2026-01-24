-- Function to extract gym coordinates as lat/lng
create or replace function get_gym_coordinates(gym_ids uuid[])
returns table (
    id uuid,
    latitude double precision,
    longitude double precision
)
language sql
stable
as $$
    select 
        id,
        st_y(location::geometry) as latitude,
        st_x(location::geometry) as longitude
    from gyms
    where id = any(gym_ids)
    and location is not null;
$$;
