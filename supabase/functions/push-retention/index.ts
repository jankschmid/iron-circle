import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import { initializeApp, cert } from "npm:firebase-admin/app";
import { getMessaging } from "npm:firebase-admin/messaging";

let firebaseApp;

function initFirebase() {
    if (!firebaseApp) {
        const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
        if (!serviceAccountStr) {
            throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set.");
        }

        try {
            const serviceAccount = JSON.parse(serviceAccountStr);
            firebaseApp = initializeApp({
                credential: cert(serviceAccount),
            });
        } catch (error) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT or initialize:", error);
            throw error;
        }
    }
    return firebaseApp;
}

serve(async (req) => {
    try {
        // Initialize Firebase
        initFirebase();

        // Initialize Supabase Client (Service Role for Admin Access)
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error("Missing Supabase environment variables.");
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch users who are eligible for the retention push
        // We will execute an RPC function created in our SQL migration
        const { data: inactiveUsers, error } = await supabase.rpc('get_inactive_users_for_retention');

        if (error) {
            console.error("Error fetching inactive users:", error);
            throw error;
        }

        if (!inactiveUsers || inactiveUsers.length === 0) {
            console.log("No inactive users found. Skipping push.");
            return new Response("No users to notify.", { status: 200 });
        }

        console.log(`Sending retention push to ${inactiveUsers.length} users with expiring streaks...`);

        // Send customized push to each user based on hours left
        let successCount = 0;
        let failureCount = 0;

        for (const user of inactiveUsers) {
            if (!user.push_token) continue;

            const hoursRounded = Math.round(user.hours_left);
            const timeText = hoursRounded > 1 ? `${hoursRounded} hours` : `1 hour`;

            const message = {
                notification: {
                    title: "⚠️ Streak at Risk!",
                    body: `You have ${timeText} left in your Grace Period! Log a workout to save your streak.`,
                },
                data: {
                    type: "retention",
                    hours_left: String(user.hours_left)
                },
                token: user.push_token,
            };

            try {
                await getMessaging().send(message);
                successCount++;
            } catch (err) {
                console.error(`Failed sending to ${user.user_id}:`, err);
                failureCount++;
            }
        }

        console.log(`Successfully sent ${successCount} messages. Failed: ${failureCount}`);

        return new Response(
            JSON.stringify({
                success: true,
                sentCount: successCount,
                failedCount: failureCount
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error executing retention cron:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
