-- Fix Invalid target_metrics before constraint is applied

DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'operations_templates') THEN
        UPDATE operations_templates SET target_metric = 'workouts' WHERE target_metric NOT IN ('volume', 'workouts', 'distance', 'duration');
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_goals') THEN
        UPDATE community_goals SET metric = 'WORKOUTS' WHERE metric NOT IN ('VOLUME', 'WORKOUTS', 'DISTANCE', 'DURATION');
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_goal_templates') THEN
        UPDATE community_goal_templates SET metric = 'WORKOUTS' WHERE metric NOT IN ('VOLUME', 'WORKOUTS', 'DISTANCE', 'DURATION');
    END IF;
END $$;
