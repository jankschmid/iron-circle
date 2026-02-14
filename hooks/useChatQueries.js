import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';

const supabase = createClient();

export function useConversations(userId) {
    return useQuery({
        queryKey: ['conversations', userId],
        queryFn: async () => {
            if (!userId) return [];

            // 1. Fetch conversations I'm in
            const { data: myConvos, error: partError } = await supabase
                .from('conversation_participants')
                .select('conversation_id, last_read_at')
                .eq('user_id', userId)
                .is('deleted_at', null);

            if (partError) throw partError;
            if (!myConvos || myConvos.length === 0) return [];

            const conversationIds = myConvos.map(c => c.conversation_id);

            // 2. Fetch details
            const { data: conversationsData, error: convError } = await supabase
                .from('conversations')
                .select('id, type, name, gym_id')
                .in('id', conversationIds);

            if (convError) throw convError;

            // 3. Process details (last message, other participant)
            const processed = await Promise.all(conversationsData.map(async (convo) => {
                const participantInfo = myConvos.find(p => p.conversation_id === convo.id);
                // Last message
                const { data: lastMsg } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', convo.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                let displayName = convo.name;
                let avatar = null;
                let otherUserId = null;

                // If private, find the other person
                if (convo.type === 'private') {
                    const { data: other } = await supabase
                        .from('conversation_participants')
                        .select('user_id')
                        .eq('conversation_id', convo.id)
                        .neq('user_id', userId)
                        .maybeSingle();

                    if (other) {
                        otherUserId = other.user_id;
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('name, avatar_url, prestige_level')
                            .eq('id', other.user_id)
                            .maybeSingle();

                        if (profile) {
                            displayName = profile.name;
                            avatar = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${other.user_id}`;
                        }
                    }
                    // Always try to fetch the latest Gym Name for these types
                    if (convo.gym_id) {
                        const { data: gym } = await supabase.from('gyms').select('name').eq('id', convo.gym_id).maybeSingle();
                        if (gym) displayName = gym.name;
                    }
                }

                return {
                    ...convo,
                    name: displayName,
                    avatar,
                    lastMessage: lastMsg,
                    unreadCount: 0, // TODO: Calc unread
                    last_read_at: participantInfo?.last_read_at,
                    otherUserId,
                    prestige_level: profile?.prestige_level || 0
                };
            }));

            // Deduplicate by Gym ID for community/gym types (Keep the oldest to match GymHub)
            const uniqueMap = new Map();
            processed.forEach(c => {
                if (c.type === 'private' || !c.gym_id) {
                    uniqueMap.set(c.id, c); // Always keep private or non-gym chats
                } else {
                    // For gym/community chats, grouping by gym_id
                    const existing = uniqueMap.get('gym_' + c.gym_id);
                    if (!existing) {
                        uniqueMap.set('gym_' + c.gym_id, c);
                    } else {
                        // Keep the OLDER one (smaller created_at timestamp)
                        const t1 = new Date(c.created_at || 0).getTime();
                        const t2 = new Date(existing.created_at || 0).getTime();
                        if (t1 < t2) {
                            uniqueMap.set('gym_' + c.gym_id, c);
                        }
                    }
                }
            });

            const uniqueConversations = Array.from(uniqueMap.values());

            // Sort by last message time
            return uniqueConversations.sort((a, b) => {
                const timeA = new Date(a.lastMessage?.created_at || a.created_at || 0).getTime();
                const timeB = new Date(b.lastMessage?.created_at || b.created_at || 0).getTime();
                return timeB - timeA;
            });
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 min
    });
}
