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

        // Extract push tokens
        const tokens = inactiveUsers.map((u: any) => u.push_token).filter(Boolean);

        if (tokens.length === 0) {
            return new Response("No valid tokens found.", { status: 200 });
        }

        console.log(`Sending retention push to ${tokens.length} users...`);

        const message = {
            notification: {
                title: "Iron Circle Awaits 🚀",
                body: "It's been 2 days! Time to hit the gym, lift some iron, and secure your XP.",
            },
            data: {
                type: "retention",
            },
            tokens: tokens,
        };

        // Firebase multicast can handle up to 500 tokens at once
        const response = await getMessaging().sendEachForMulticast(message);
        console.log(`Successfully sent ${response.successCount} messages. Failed: ${response.failureCount}`);

        return new Response(
            JSON.stringify({
                success: true,
                sentCount: response.successCount,
                failedCount: response.failureCount
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
