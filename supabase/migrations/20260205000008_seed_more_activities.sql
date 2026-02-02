-- Seed Sport, Mobility, and Walk exercises
INSERT INTO exercises (name, type, muscle, default_duration)
VALUES
    -- Sport
    ('Basketball', 'Sport', 'Full Body', 3600),
    ('Soccer', 'Sport', 'Legs', 5400),
    ('Tennis', 'Sport', 'Full Body', 3600),
    ('Volleyball', 'Sport', 'Full Body', 3600),
    ('Swimming', 'Sport', 'Full Body', 1800),
    ('Cycling (Outdoor)', 'Sport', 'Legs', 3600),
    ('Running (Outdoor)', 'Sport', 'Legs', 1800),
    ('Golf', 'Sport', 'Core', 14400),
    ('Boxing', 'Sport', 'Full Body', 1800),
    ('Martial Arts', 'Sport', 'Full Body', 3600),
    ('Climbing', 'Sport', 'Full Body', 3600),
    
    -- Mobility
    ('Foam Rolling', 'Mobility', 'Full Body', 900),
    ('Dynamic Warmup', 'Mobility', 'Full Body', 600),
    ('Hip Opener Sequence', 'Mobility', 'Legs', 900),
    ('Shoulder Dislocates', 'Mobility', 'Shoulders', 300),
    ('SMR (Self Myofascial Release)', 'Mobility', 'Full Body', 900),
    ('Deep Squat Sit', 'Mobility', 'Legs', 300),
    ('Ankle Mobility', 'Mobility', 'Legs', 300),
    ('Wrist Mobility', 'Mobility', 'Forearms', 300),
    
    -- Walk
    ('Light Walk', 'Walk', 'Legs', 1800),
    ('Brisk Walk', 'Walk', 'Legs', 1800),
    ('Hiking', 'Walk', 'Legs', 7200),
    ('Rucking (Weighted Walk)', 'Walk', 'Full Body', 1800)

ON CONFLICT (name) DO UPDATE SET type = EXCLUDED.type;
