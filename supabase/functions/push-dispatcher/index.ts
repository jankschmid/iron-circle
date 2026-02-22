import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import { initializeApp, cert } from "npm:firebase-admin/app";
import { getMessaging } from "npm:firebase-admin/messaging";

let firebaseApp;

function initFirebase() {
    if (!firebaseApp) {
        const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
        if (!serviceAccountStr) {
            console.warn("FIREBASE_SERVICE_ACCOUNT is not set. Push notifications will fail if attempted.");
            return null;
        }

        try {
            const serviceAccount = JSON.parse(serviceAccountStr);
            firebaseApp = initializeApp({ credential: cert(serviceAccount) });
            console.log("Firebase App initialized successfully.");
        } catch (error) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT or initialize:", error);
            throw error;
        }
    }
    return firebaseApp;
}

serve(async (req) => {
    try {
        initFirebase();

        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const body = await req.json();

        // Is this a direct manual call or a database webhook?
        // Webhooks have 'type', 'table', 'record'
        if (body.table && body.record) {
            await handleDatabaseWebhook(body, supabase);
            return new Response(JSON.stringify({ success: true, message: "Webhook processed" }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        // Manual Dispatch mode
        const { push_token, title, body: messageBody, data } = body;
        if (!push_token) {
            return new Response(JSON.stringify({ error: "Missing push_token or unsupported payload" }), { status: 400 });
        }

        const message = {
            notification: { title: title || "New Notification", body: messageBody || "" },
            data: data || {},
            token: push_token,
        };

        const response = await getMessaging().send(message);
        return new Response(JSON.stringify({ success: true, messageId: response }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (error) {
        console.error("Error sending push notification:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});

async function handleDatabaseWebhook(payload: any, supabase: any) {
    const { table, type, record } = payload;

    let title = "";
    let body = "";
    let targetUserIds: string[] = [];

    // 1. MESSAGES 
    if (table === 'messages' && type === 'INSERT') {
        const { sender_id, conversation_id, content } = record;

        // Get sender profile
        const { data: sender } = await supabase.from('profiles').select('username').eq('id', sender_id).single();
        const senderName = sender?.username || "Someone";

        // Get recipients (everyone in conversation EXCEPT sender)
        const { data: participants } = await supabase.from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversation_id)
            .neq('user_id', sender_id);

        if (participants) targetUserIds = participants.map((p: any) => p.user_id);

        title = `New message from ${senderName}`;
        body = content || "Sent an attachment";
    }

    // 2. FRIENDSHIPS
    else if (table === 'friendships' && (type === 'INSERT' || type === 'UPDATE')) {
        const { user_id, friend_id, status } = record;

        if (status === 'pending' && type === 'INSERT') {
            const { data: sender } = await supabase.from('profiles').select('username').eq('id', user_id).single();
            title = "New Friend Request";
            body = `${sender?.username || 'Someone'} wants to connect.`;
            targetUserIds = [friend_id];
        }
        else if (status === 'accepted' && type === 'UPDATE') {
            const { data: accepter } = await supabase.from('profiles').select('username').eq('id', friend_id).single();
            title = "Friend Request Accepted";
            body = `${accepter?.username || 'Someone'} accepted your request.`;
            targetUserIds = [user_id]; // notify the original requester
        }
    }

    // 3. FEED INTERACTIONS
    else if (table === 'feed_interactions' && type === 'INSERT') {
        const { user_id, target_user_id, interaction_type } = record;
        // Don't notify if interacting with own post
        if (user_id === target_user_id) return;

        const { data: interactor } = await supabase.from('profiles').select('username').eq('id', user_id).single();
        const interactorName = interactor?.username || "Someone";

        title = "New Interaction";
        if (interaction_type === 'fistbump') {
            body = `${interactorName} gave you a fistbump 👊`;
        } else if (interaction_type === 'comment') {
            body = `${interactorName} commented on your activity.`;
        } else {
            body = `${interactorName} interacted with your post.`;
        }
        targetUserIds = [target_user_id];
    }

    // Dispatch
    if (targetUserIds.length > 0 && title && body) {
        // Fetch valid push tokens
        const { data: users } = await supabase.from('profiles')
            .select('push_token')
            .in('id', targetUserIds)
            .not('push_token', 'is', null)
            .neq('push_token', '');

        if (users && users.length > 0) {
            const tokens = users.map((u: any) => u.push_token);
            const message = {
                notification: { title, body },
                tokens: tokens, // Multicast
            };
            const response = await getMessaging().sendEachForMulticast(message);
            console.log(`Webhook Dispatch: Sent ${response.successCount} messages. Failed: ${response.failureCount}`);
        }
    }
}
