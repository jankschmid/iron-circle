CREATE OR REPLACE FUNCTION join_trainer_with_code(
    p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    found_trainer_id UUID;
    trainer_name TEXT;
    existing_status TEXT;
BEGIN
    p_code := trim(upper(p_code));

    -- 1. Find Trainer
    SELECT id, name INTO found_trainer_id, trainer_name
    FROM profiles 
    WHERE trainer_code = p_code;

    IF found_trainer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Code');
    END IF;

    IF found_trainer_id = auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'You cannot be your own trainer');
    END IF;

    -- 2. Check Existing Relationship
    SELECT status INTO existing_status 
    FROM trainer_relationships 
    WHERE trainer_id = found_trainer_id 
    AND client_id = auth.uid();

    IF existing_status IS NOT NULL THEN
         RETURN jsonb_build_object('success', false, 'message', 'Already connected (Status: ' || existing_status || ')');
    END IF;

    -- 3. Create Relationship (ACTIVE immediately, as code implies invite)
    INSERT INTO trainer_relationships (trainer_id, client_id, status)
    VALUES (found_trainer_id, auth.uid(), 'active');

    -- 4. Notification for Trainer
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        found_trainer_id,
        'client_joined',
        'New Client Joined',
        'A new client has joined using your code.',
        jsonb_build_object('client_id', auth.uid())
    );

    RETURN jsonb_build_object('success', true, 'trainer_name', trainer_name);
END;
$$;
