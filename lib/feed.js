import { createClient } from '@/lib/supabase';

/**
 * Global helper to log feed events (visible to squad/gym/world based on scope)
 * @param {string} type - Event type (e.g., 'workout', 'pr', 'rank_up', 'challenge_joined', 'challenge_submit')
 * @param {object} data - Event payload 
 */
export async function createFeedEvent(type, data = {}) {
    const supabase = createClient();
    try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return null;

        const payload = {
            user_id: userData.user.id,
            type,
            data
        };

        const { data: inserted, error } = await supabase
            .from('feed_events')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error('[IronCircle] Failed to create feed event:', error);
            return null;
        }

        return inserted;
    } catch (e) {
        console.error('[IronCircle] createFeedEvent error:', e);
        return null;
    }
}
