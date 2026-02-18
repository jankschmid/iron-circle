-- Cleanup excess daily operations (Keep only latest 3 per user)
WITH RankedOps AS (
    SELECT uo.id,
           ROW_NUMBER() OVER (PARTITION BY uo.user_id ORDER BY uo.created_at DESC) as rn
    FROM user_operations uo
    JOIN operations_templates ot ON uo.template_id = ot.id
    WHERE ot.type = 'daily' AND uo.expires_at > now()
)
DELETE FROM user_operations
WHERE id IN (
    SELECT id FROM RankedOps WHERE rn > 3
);
