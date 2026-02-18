-- Trigger function to notify all community members when a goal is completed
CREATE OR REPLACE FUNCTION notify_mission_complete() RETURNS TRIGGER AS $$
DECLARE
    member_record RECORD;
BEGIN
    -- Loop through all community members to send notification
    FOR member_record IN 
        SELECT user_id FROM community_members WHERE community_id = NEW.community_id
    LOOP
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            member_record.user_id,
            'mission_complete',
            'Mission Completed! 🏆',
            'Your squad completed the mission: ' || NEW.title,
            jsonb_build_object('goal_id', NEW.id, 'community_id', NEW.community_id)
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_mission_complete ON community_goals;

CREATE TRIGGER on_mission_complete
AFTER UPDATE ON community_goals
FOR EACH ROW
WHEN (OLD.status = 'ACTIVE' AND NEW.status = 'COMPLETED')
EXECUTE FUNCTION notify_mission_complete();
