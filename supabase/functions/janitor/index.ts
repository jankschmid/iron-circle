
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Log Start
        console.log("Janitor: Starting Cleanup...")

        const MAX_WORKOUT_DURATION_HOURS = 4
        const thresholdDate = new Date(Date.now() - MAX_WORKOUT_DURATION_HOURS * 60 * 60 * 1000).toISOString()

        // 1. Clean Stale Workouts (Status = Active or End Time Null)
        const { data: staleWorkouts, error: wError } = await supabase
            .from('workouts')
            .select('id, start_time')
            .is('end_time', null)
            .lt('start_time', thresholdDate)

        if (wError) throw wError

        let workoutsFixed = 0
        if (staleWorkouts && staleWorkouts.length > 0) {
            console.log(`Janitor: Found ${staleWorkouts.length} stale workouts.`)

            for (const w of staleWorkouts) {
                const startDate = new Date(w.start_time)
                const endDate = new Date(startDate.getTime() + MAX_WORKOUT_DURATION_HOURS * 60 * 60 * 1000).toISOString()

                const { error: fixError } = await supabase
                    .from('workouts')
                    .update({
                        end_time: endDate,
                        duration: MAX_WORKOUT_DURATION_HOURS * 3600,
                        status: 'completed' // Explicit status if supported, otherwise just end_time
                    })
                    .eq('id', w.id)

                if (!fixError) workoutsFixed++
            }
        }

        // 2. Clean Stale Tracker Sessions
        const { data: staleSessions, error: sError } = await supabase
            .from('workout_sessions')
            .select('id, start_time')
            .eq('status', 'active')
            .lt('start_time', thresholdDate)

        if (sError) throw sError

        let sessionsFixed = 0
        if (staleSessions && staleSessions.length > 0) {
            console.log(`Janitor: Found ${staleSessions.length} stale sessions.`)

            for (const s of staleSessions) {
                const startDate = new Date(s.start_time)
                const endDate = new Date(startDate.getTime() + MAX_WORKOUT_DURATION_HOURS * 60 * 60 * 1000).toISOString()

                const { error: fixError } = await supabase
                    .from('workout_sessions')
                    .update({
                        status: 'timeout',
                        end_time: endDate,
                        duration: MAX_WORKOUT_DURATION_HOURS * 3600,
                        auto_closed: true
                    })
                    .eq('id', s.id)

                if (!fixError) sessionsFixed++
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Janitor Run Complete.`,
                stats: {
                    workouts_fixed: workoutsFixed,
                    sessions_fixed: sessionsFixed
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
